"""Pass 3: combine player/ball detections with rim positions.

Outputs:
  - suggestions.json : candidate shot attempts / made shots with video timestamps (HoopStats import format)
  - annotated.mp4    : review video (sampled frames) with team-colored players, ball, rim, and event banners
"""
import sys, json, pickle, cv2, numpy as np, supervision as sv
from trackers import ByteTrackTracker

src, dets_p, hoops_p, outdir = sys.argv[1:5]
D = pickle.load(open(dets_p, 'rb'))
H = pickle.load(open(hoops_p, 'rb'))
fps, stride, BALL = D['fps'], D['stride'], D['ball_id']
frames = sorted(D['frames'])
hoop_idx = sorted(H)


def rim_at(i):
    """Rim box at frame i: interpolate between the surrounding rim samples when both exist and agree."""
    j = np.searchsorted(hoop_idx, i)
    a = hoop_idx[j - 1] if j > 0 else None
    b = hoop_idx[j] if j < len(hoop_idx) else None
    ba, bb = (H[a] if a is not None else None), (H[b] if b is not None else None)
    if ba and bb:
        A, B = np.array(ba[0]), np.array(bb[0])
        if np.abs(A - B).max() < 120:
            w = (i - a) / max(b - a, 1)
            return A * (1 - w) + B * w
    near = [(abs(i - k), H[k]) for k in (a, b) if k is not None and H[k] and abs(i - k) <= 15]
    return np.array(min(near, key=lambda x: x[0])[1][0]) if near else None


def ball_at(i):
    xyxy, conf, cls = D['frames'][i]
    m = (cls == BALL) & (conf >= 0.25)
    if not m.any():
        return None
    k = np.argmax(np.where(m, conf, -1))
    x0, y0, x1, y1 = xyxy[k]
    return np.array([(x0 + x1) / 2, (y0 + y1) / 2]), float(conf[k]), xyxy[k]


# ---- per-frame state
state = []
for i in frames:
    state.append({'i': i, 't': i / fps, 'rim': rim_at(i), 'ball': ball_at(i)})

# ---- shot logic
# attempt: ball above the rim and horizontally near it.
# made: within ~1.3s of being above the rim, the ball appears just below the rim center, horizontally inside it.
events = []
win = int(round(1.3 * fps / stride))
for k, s in enumerate(state):
    r, b = s['rim'], s['ball']
    if r is None or b is None:
        continue
    rx0, ry0, rx1, ry1 = r
    rw, rh, rcx = rx1 - rx0, ry1 - ry0, (rx0 + rx1) / 2
    (bx, by), bc, _ = b
    above = by < ry0 and ry0 - by < 4 * rh and abs(bx - rcx) < 1.5 * rw
    if not above:
        continue
    made_at = None
    for s2 in state[k + 1:k + 1 + win]:
        r2, b2 = s2['rim'], s2['ball']
        if r2 is None or b2 is None:
            continue
        qx0, qy0, qx1, qy1 = r2
        (x2, y2), _, _ = b2
        if (qy0 + qy1) / 2 < y2 < qy1 + 1.5 * (qy1 - qy0) and qx0 - 0.15 * (qx1 - qx0) < x2 < qx1 + 0.15 * (qx1 - qx0):
            made_at = s2['t']
            break
    events.append({'t': round(made_at or s['t'], 2), 'kind': 'made' if made_at else 'attempt', 'conf': round(bc, 2)})

# de-duplicate: one event per 3s window, "made" wins over "attempt"
events.sort(key=lambda e: e['t'])
merged = []
for e in events:
    if merged and e['t'] - merged[-1]['t'] < 3:
        if e['kind'] == 'made' and merged[-1]['kind'] != 'made':
            merged[-1] = e
        continue
    merged.append(e)

json.dump({'video': src.split('/')[-1], 'fps': fps, 'suggestions': merged}, open(f'{outdir}/suggestions.json', 'w'), indent=1)

# ---- team colour per person box (torso crop): orange vs white
def team_of(frame, box):
    x0, y0, x1, y1 = box.astype(int)
    h, w = y1 - y0, x1 - x0
    crop = frame[max(y0 + int(0.2 * h), 0):y0 + int(0.5 * h), max(x0 + int(0.25 * w), 0):x1 - int(0.25 * w)]
    if crop.size == 0:
        return 2
    hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
    orange = ((hsv[..., 0] >= 5) & (hsv[..., 0] <= 22) & (hsv[..., 1] > 120) & (hsv[..., 2] > 120)).mean()
    white = ((hsv[..., 1] < 45) & (hsv[..., 2] > 175)).mean()
    if orange > 0.25: return 0
    if white > 0.35: return 1
    return 2  # other (refs, coaches, crowd)


# ---- annotated review video
OUT_W, OUT_H = 1280, 720
pal = sv.ColorPalette.from_hex(['#ff7a1a', '#f1f3f5', '#868e96'])
ell = sv.EllipseAnnotator(color=pal, thickness=3, color_lookup=sv.ColorLookup.CLASS)
lab = sv.LabelAnnotator(color=pal, text_color=sv.Color.BLACK, text_scale=0.6, color_lookup=sv.ColorLookup.CLASS, text_position=sv.Position.BOTTOM_CENTER)
tri = sv.TriangleAnnotator(color=sv.Color.from_hex('#ffd43b'), base=24, height=20, color_lookup=sv.ColorLookup.INDEX)
tracker = ByteTrackTracker(frame_rate=fps / stride, track_activation_threshold=0.5)

cap = cv2.VideoCapture(src)
vw = cv2.VideoWriter(f'{outdir}/annotated_raw.mp4', cv2.VideoWriter_fourcc(*'mp4v'), fps / stride, (OUT_W, OUT_H))
st_by_i = {s['i']: s for s in state}
i = 0
while cap.grab():
    if i in st_by_i:
        _, frame = cap.retrieve()
        s = st_by_i[i]
        xyxy, conf, cls = D['frames'][i]
        pm = (cls != BALL) & (conf >= 0.4)
        people = sv.Detections(xyxy=xyxy[pm], confidence=conf[pm], class_id=np.zeros(pm.sum(), int))
        # keep people standing on the court-ish region (feet in lower 70% of frame) and not tiny
        if len(people):
            hgt = people.xyxy[:, 3] - people.xyxy[:, 1]
            people = people[(people.xyxy[:, 3] > 0.3 * frame.shape[0]) & (hgt > 0.08 * frame.shape[0])]
        people = tracker.update(people)
        if len(people):
            people.class_id = np.array([team_of(frame, b) for b in people.xyxy])
            players = people[people.class_id < 2]
            others = people[people.class_id == 2]
            frame = ell.annotate(frame, players)
            frame = lab.annotate(frame, players, [f'#{t}' for t in players.tracker_id])
            frame = ell.annotate(frame, others)
        if s['ball']:
            _, _, bb = s['ball']
            frame = tri.annotate(frame, sv.Detections(xyxy=bb[None].astype(float)))
        if s['rim'] is not None:
            x0, y0, x1, y1 = s['rim'].astype(int)
            cv2.rectangle(frame, (x0, y0), (x1, y1), (59, 212, 255), 3)
        for e in merged:
            if 0 <= s['t'] - e['t'] < 1.5:
                txt = 'MADE SHOT?' if e['kind'] == 'made' else 'SHOT ATTEMPT?'
                col = (62, 138, 43) if e['kind'] == 'made' else (12, 89, 232)
                cv2.rectangle(frame, (40, 40), (40 + 34 * len(txt), 130), col, -1)
                cv2.putText(frame, txt, (60, 108), cv2.FONT_HERSHEY_DUPLEX, 2, (255, 255, 255), 3)
        m, sec = divmod(s['t'], 60)
        cv2.putText(frame, f'{int(m)}:{sec:05.2f}', (40, frame.shape[0] - 40), cv2.FONT_HERSHEY_DUPLEX, 1.6, (255, 255, 255), 3)
        vw.write(cv2.resize(frame, (OUT_W, OUT_H)))
    i += 1
vw.release()

n = len(state)
print(json.dumps({
    'sampled_frames': n,
    'ball_found_pct': round(100 * sum(s['ball'] is not None for s in state) / n),
    'rim_found_pct': round(100 * sum(s['rim'] is not None for s in state) / n),
    'events': merged,
}, indent=1))
