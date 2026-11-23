"""Pass 1: run RF-DETR over the video every STRIDE frames, save person + ball detections."""
import sys, time, pickle, cv2, numpy as np
from PIL import Image
from rfdetr import RFDETRMedium
from rfdetr.assets.coco_classes import COCO_CLASSES

src, out, stride = sys.argv[1], sys.argv[2], int(sys.argv[3])
keep = {k for k, v in COCO_CLASSES.items() if v in ('person', 'sports ball')}
ball_id = next(k for k, v in COCO_CLASSES.items() if v == 'sports ball')
m = RFDETRMedium()
cap = cv2.VideoCapture(src)
fps = cap.get(cv2.CAP_PROP_FPS); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
res = {'fps': fps, 'stride': stride, 'ball_id': ball_id, 'frames': {}}
i, t0 = 0, time.time()
while True:
    ok = cap.grab()
    if not ok: break
    if i % stride == 0:
        ok, frame = cap.retrieve()
        d = m.predict(Image.fromarray(frame[:, :, ::-1]), threshold=0.2)
        d = d[np.isin(d.class_id, list(keep))]
        res['frames'][i] = (d.xyxy.astype(np.float32), d.confidence.astype(np.float32), d.class_id)
        if (i // stride) % 100 == 0:
            print(f'{i}/{n} frames, {time.time()-t0:.0f}s, balls so far: {sum((v[2]==ball_id).any() for v in res["frames"].values())}', flush=True)
    i += 1
pickle.dump(res, open(out, 'wb'))
print('done', len(res['frames']), 'sampled frames in', round(time.time() - t0), 's')
