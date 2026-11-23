import sys, pickle, numpy as np, subprocess
H = pickle.load(open('out/hoops.pkl', 'rb')); idx = sorted(H); fps = 59.94
for t in map(float, sys.argv[1:]):
    i = int(t * fps)
    near = [k for k in idx if H[k] and abs(k - i) < 90]
    k = min(near, key=lambda k: abs(k - i))
    x0, y0, x1, y1 = H[k][0]; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    W, Hh = 480, 360
    X, Y = int(min(max(cx - W / 2, 0), 1920 - W)), int(min(max(cy - Hh * 0.6, 0), 1080 - Hh))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(max(0, t - 2.5)), '-i', 'input/Sample_bball.mp4', '-map', '0:v:0', '-t', '4',
                    '-vf', f'fps=4,crop={W}:{Hh}:{X}:{Y},scale=320:-1,drawtext=text=%{{pts\\:hms}}:x=4:y=4:fontcolor=yellow:fontsize=16,tile=8x2',
                    '-frames:v', '1', f'out/review/rim_{t}.jpg'], check=True)
