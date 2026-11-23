# Video analysis (experimental)

Finds shot attempts in XbotGo game video so HoopStats can suggest tags. Uses
[Supervision](https://github.com/roboflow/supervision) + RF-DETR (players, ball) + OWLv2 (rim).

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python detect_all.py game.mp4 out/dets.pkl 10     # players + ball, every 10th frame
python hoop_all.py game.mp4 out/hoops.pkl 30      # rim position, every 30th frame
python analyze.py game.mp4 out/dets.pkl out/hoops.pkl out   # → out/suggestions.json + annotated_raw.mp4
python rimcrops.py 82.4 130.9                     # zoomed rim strips around given times, for checking
```

Model weights download on first run from repo.roboflow.com and huggingface.co.

## Results on a 4-minute sample clip (CPU only, ~50 min)

- Rim found 88% of the time, ball 66%.
- Shot attempts: 11 candidates; every one checked by eye was a real shot.
- Made vs missed: weak — sampling 6 frames/s usually misses the ball passing through the net.
- Team colors: orange works; white jerseys get lumped with refs (threshold needs tuning).

## Next steps

1. Re-run ball detection at full frame rate in a ~3s window around each attempt to catch makes.
2. Read the scoreboard as a second signal for made baskets.
3. Import `suggestions.json` into the app as "suggested plays" to confirm with one tap.
4. Run on a GPU for full games.
