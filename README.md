# 🏀 HoopStats

Tag your kids' basketball games from XbotGo video, get box scores and season stats, and export highlight reels per player.

## How it works

1. **Roster**: add your players (number keys 1–9 select them while tagging).
2. **Games → New game**, then pick the game video exported from the XbotGo app.
3. **Tag**: play the video, pick a player, then tap what happened (made 2, rebound, steal…). Each tag is saved with its time in the video.
4. **Box score / Season**: stats are computed from the tags.
5. **Highlight reel**: pick a player and which plays to include, preview, then download one MP4 with all the clips.

The video never leaves your device. Only the tags are saved, so each person who tags a game needs a copy of the video file.
Reels are cut in the browser with ffmpeg.wasm without re-encoding, so even multi-GB games export quickly at full quality.

### Keyboard shortcuts (on a computer)

| Key | Action |
|---|---|
| Space | Play / pause |
| ← / → | Back / forward 5s (hold Shift for 1s) |
| 1–9, 0 | Select player, clear selection |
| Q / W | Made / missed 2 |
| E / R | Made / missed 3 |
| F / G | Made / missed free throw |
| O / D | Offensive / defensive rebound |
| A S B T P | Assist, steal, block, turnover, foul |
| H | Highlight (no stat) |
| Z X C | Opponent +2 / +3 / +1 |
| Backspace | Undo last tag |

## Run it

```bash
npm install
npm run dev
```

Without any configuration, data is saved in this browser only and no login is needed.

## Share with family (Supabase, free tier)

1. Create a project at supabase.com.
2. In **SQL Editor**, paste and run `supabase/schema.sql`. Then add the family's emails:
   ```sql
   insert into allowed_users (email) values ('you@example.com'), ('spouse@example.com');
   ```
3. Copy `.env.example` to `.env` and fill in the URL and anon key from **Project Settings → API**.
4. In **Authentication → URL Configuration**, set the Site URL to where the app is hosted (e.g. your Vercel URL).

Everyone signs in with a one-time email link. Only emails in `allowed_users` can see or change data.

## Deploy (Vercel)

Import the GitHub repo in Vercel (framework: Vite), add the two `VITE_SUPABASE_*` environment variables, and deploy.

## XbotGo video tips

- Export the full game from the XbotGo app to your phone or computer, then choose that file in HoopStats.
- iPhone recordings are often HEVC (H.265). Safari plays them, and so do Chrome and Edge on most recent Macs and Windows PCs. If the video won't play, export or convert it to H.264.
