"""Pass 2: find the rim with OWLv2 every STRIDE frames. Saves best rim box (or None) per sampled frame."""
import sys, time, pickle, torch, cv2
from PIL import Image
from transformers import Owlv2Processor, Owlv2ForObjectDetection
torch.set_num_threads(2)
src, out, stride = sys.argv[1], sys.argv[2], int(sys.argv[3])
mid = 'google/owlv2-base-patch16-ensemble'
proc = Owlv2Processor.from_pretrained(mid); model = Owlv2ForObjectDetection.from_pretrained(mid).eval()
q = [['basketball hoop']]
cap = cv2.VideoCapture(src); n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
res, i, t0 = {}, 0, time.time()
while cap.grab():
    if i % stride == 0:
        _, frame = cap.retrieve()
        img = Image.fromarray(frame[:, :, ::-1]); s = max(img.size)
        with torch.no_grad(): o = model(**proc(text=q, images=img, return_tensors='pt'))
        r = proc.post_process_grounded_object_detection(o, threshold=0.25, target_sizes=[(s, s)])[0]
        best = None
        for b, c in zip(r['boxes'].tolist(), r['scores'].tolist()):
            w, h = b[2] - b[0], b[3] - b[1]
            # rim+net: smallish, roughly square, not at the very top edge
            if 20 < w < 260 and 0.5 < w / max(h, 1) < 2.2 and b[1] > 5 and (best is None or c > best[1]):
                best = (b, c)
        res[i] = best
        print(i, n, round(time.time() - t0), best and round(best[1], 2), flush=True)
    i += 1
pickle.dump(res, open(out, 'wb'))
print('done', len(res), 'rim found in', sum(v is not None for v in res.values()))
