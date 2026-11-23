import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../data/DataContext'
import { now, uid } from '../data/store'
import { EVENTS, EVENT_BY_TYPE, isOpp } from '../events'
import { boxScore, fmtTime, scoreAt, score } from '../stats'
import type { EventType, Game, GameEvent, Player } from '../types'
import { buildReel, download, mergeSegments, type Segment } from '../video/ffmpeg'
import { BoxScoreTable } from './BoxScore'

type Tab = 'log' | 'box' | 'reel'

export function GameView({ gameId }: { gameId: string }) {
  const { games, players, events, saveGame, saveEvent, deleteEvent } = useData()
  const game = games.find((g) => g.id === gameId)
  const roster = useMemo(() => [...players].sort((a, b) => a.created_at.localeCompare(b.created_at)), [players])
  const gameEvents = useMemo(() => events.filter((e) => e.game_id === gameId).sort((a, b) => a.t - b.t), [events, gameId])

  const videoRef = useRef<HTMLVideoElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videoError, setVideoError] = useState<string | null>(null)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('log')
  const undoStack = useRef<string[]>([])
  const preview = useRef<Segment[] | null>(null)

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  const flashTimer = useRef<number | undefined>(undefined)
  const say = (msg: string) => {
    setFlash(msg)
    window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 1600)
  }

  const seek = useCallback((t: number) => {
    const v = videoRef.current
    if (v) v.currentTime = Math.max(0, Math.min(t, v.duration || t))
  }, [])

  const tag = useCallback((type: EventType) => {
    const v = videoRef.current
    if (!v || !game) return say('Load the game video first')
    const def = EVENT_BY_TYPE[type]
    if (def.needsPlayer && !selected) return say('Pick a player first')
    const e: GameEvent = {
      id: uid(), game_id: game.id, type, t: Math.round(v.currentTime * 100) / 100, created_at: now(),
      player_id: isOpp(type) ? null : selected,
    }
    saveEvent(e)
    undoStack.current.push(e.id)
    const who = e.player_id ? players.find((p) => p.id === e.player_id)?.name : null
    say(`${def.label}${who ? ` — ${who}` : ''} @ ${fmtTime(e.t)}`)
  }, [game, selected, saveEvent, players])

  const undo = useCallback(() => {
    const id = undoStack.current.pop()
    if (id) { deleteEvent(id); say('Undid last tag') }
  }, [deleteEvent])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || ev.metaKey || ev.ctrlKey || ev.altKey) return
      const v = videoRef.current
      const k = ev.key.toLowerCase()
      if (k === ' ') { ev.preventDefault(); if (v) (v.paused ? v.play() : v.pause()) }
      else if (k === 'arrowleft') { ev.preventDefault(); if (v) seek(v.currentTime - (ev.shiftKey ? 1 : 5)) }
      else if (k === 'arrowright') { ev.preventDefault(); if (v) seek(v.currentTime + (ev.shiftKey ? 1 : 5)) }
      else if (k === 'backspace') { ev.preventDefault(); undo() }
      else if (/^[1-9]$/.test(k)) { const p = roster[Number(k) - 1]; if (p) setSelected(p.id) }
      else if (k === '0' || k === 'escape') setSelected(null)
      else { const def = EVENTS.find((d) => d.key === k); if (def) { ev.preventDefault(); tag(def.type) } }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [roster, seek, tag, undo])

  if (!game) return <section><p>Game not found. <a href="#/games">Back to games</a></p></section>

  const chooseFile = (f: File | undefined) => {
    if (!f) return
    if (game.video_name && (game.video_name !== f.name || (game.video_size && game.video_size !== f.size))) {
      if (!confirm(`This game was tagged on "${game.video_name}". You picked "${f.name}". Tags are tied to video times, so a different file will be out of sync. Use it anyway?`)) return
    }
    setVideoError(null)
    setFile(f)
    setVideoUrl(URL.createObjectURL(f))
    if (!game.video_name || game.video_name !== f.name) saveGame({ ...game, video_name: f.name, video_size: f.size })
  }

  const { us, them } = videoUrl ? scoreAt(gameEvents, time) : score(gameEvents)
  const final = score(gameEvents)
  const nameOf = (id: string | null) => (id ? players.find((p) => p.id === id)?.name ?? '?' : game.opponent)

  return (
    <section className="game">
      <div className="row between wrap">
        <div>
          <a href="#/games" className="small">← Games</a>
          <h1>vs {game.opponent} <span className="muted small">{game.date}</span></h1>
        </div>
        <div className="scoreboard" title="Score at the current video time">
          <span>Us <b>{us}</b></span><span className="muted">–</span><span><b>{them}</b> {game.opponent}</span>
        </div>
      </div>

      <div className="game-grid">
        <div className="video-col">
          {!videoUrl ? (
            <label className="dropzone">
              <input type="file" accept="video/*,.mov,.mp4" hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
              <b>Choose the game video</b>
              <span className="muted small">
                {game.video_name ? <>Pick <b>{game.video_name}</b> again to keep tagging.</> : 'The MP4/MOV exported from the XbotGo app.'}
                <br />The video stays on this device; only tags are saved.
              </span>
            </label>
          ) : (
            <>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                playsInline
                onTimeUpdate={(e) => {
                  const t = e.currentTarget.currentTime
                  setTime(t)
                  const q = preview.current
                  if (q?.length && t >= q[0].end) {
                    q.shift()
                    if (q.length) e.currentTarget.currentTime = q[0].start
                    else { e.currentTarget.pause(); preview.current = null; say('Preview finished') }
                  }
                }}
                onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration); e.currentTarget.playbackRate = rate }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onError={() => setVideoError('This browser cannot play this video. iPhone/XbotGo recordings in HEVC (H.265) play in Safari and in Chrome/Edge on recent Macs and Windows with HEVC support; otherwise export from XbotGo as H.264.')}
              />
              {videoError && <p className="notice">{videoError}</p>}
              <div className="row wrap controls">
                <button onClick={() => seek(time - 10)}>-10s</button>
                <button onClick={() => seek(time - 5)}>-5s</button>
                <button onClick={() => seek(time - 1)}>-1s</button>
                <button className="primary" onClick={() => { const v = videoRef.current; if (v) (v.paused ? v.play() : v.pause()) }}>{playing ? 'Pause' : 'Play'}</button>
                <button onClick={() => seek(time + 1)}>+1s</button>
                <button onClick={() => seek(time + 5)}>+5s</button>
                <button onClick={() => seek(time + 10)}>+10s</button>
                <select value={rate} onChange={(e) => { const r = Number(e.target.value); setRate(r); if (videoRef.current) videoRef.current.playbackRate = r }}>
                  {[0.5, 1, 1.5, 2, 3].map((r) => <option key={r} value={r}>{r}×</option>)}
                </select>
                <span className="muted small">{fmtTime(time)} / {fmtTime(duration)}</span>
                <label className="small linkish">
                  <input type="file" accept="video/*,.mov,.mp4" hidden onChange={(e) => chooseFile(e.target.files?.[0])} />Change video
                </label>
              </div>
              <Timeline events={gameEvents} duration={duration} time={time} onSeek={seek} />
            </>
          )}
        </div>

        <div className="tag-col">
          <h3>1. Player</h3>
          <div className="players">
            {roster.map((p, i) => (
              <button key={p.id} className={`player ${selected === p.id ? 'on' : ''}`} onClick={() => setSelected(selected === p.id ? null : p.id)}>
                {i < 9 && <span className="kbd">{i + 1}</span>} {p.name}{p.number && <span className="muted"> #{p.number}</span>}
              </button>
            ))}
            {!roster.length && <p className="muted small">Add players on the <a href="#/roster">Roster</a> page.</p>}
          </div>
          <h3>2. What happened</h3>
          <div className="events">
            {EVENTS.map((d) => (
              <button key={d.type} className={`ev ${d.tone}`} disabled={!videoUrl || (d.needsPlayer && !selected)} onClick={() => tag(d.type)} title={`${d.label} (${d.key.toUpperCase()})`}>
                {d.short}<span className="kbd">{d.key.toUpperCase()}</span>
              </button>
            ))}
          </div>
          <div className="row between">
            <button onClick={undo} disabled={!undoStack.current.length}>Undo last (⌫)</button>
            <details className="small">
              <summary>Shortcuts</summary>
              Space play/pause · ←/→ 5s (Shift = 1s) · 1–9 pick player · 0 clear · letters on buttons tag · ⌫ undo
            </details>
          </div>
          {flash && <div className="flash">{flash}</div>}
        </div>
      </div>

      <div className="tabs">
        {(['log', 'box', 'reel'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t === 'log' ? `Play log (${gameEvents.length})` : t === 'box' ? `Box score ${final.us}–${final.them}` : 'Highlight reel'}
          </button>
        ))}
      </div>

      {tab === 'log' && (
        <ul className="log">
          {gameEvents.map((e) => (
            <li key={e.id} className={Math.abs(e.t - time) < 2 ? 'near' : ''}>
              <button className="linkish" onClick={() => seek(e.t - game.clip_pre)}>{fmtTime(e.t)}</button>
              <span className={`pill ${EVENT_BY_TYPE[e.type].tone}`}>{EVENT_BY_TYPE[e.type].short}</span>
              <span>{e.player_id ? nameOf(e.player_id) : e.type === 'HIGHLIGHT' ? '' : game.opponent}</span>
              <button className="x" title="Delete" onClick={() => deleteEvent(e.id)}>✕</button>
            </li>
          ))}
          {!gameEvents.length && <li className="muted">No plays tagged yet. Play the video, pick a player, tap what happened.</li>}
        </ul>
      )}

      {tab === 'box' && (
        <BoxScoreTable rows={roster.filter((p) => boxScore(gameEvents).has(p.id)).map((p) => ({ name: p.name, line: boxScore(gameEvents).get(p.id)! }))} />
      )}

      {tab === 'reel' && (
        <ReelPanel
          game={game}
          roster={roster}
          selected={selected}
          nameOf={nameOf}
          file={file}
          duration={duration}
          events={gameEvents}
          onPreview={(segs) => { preview.current = [...segs]; seek(segs[0].start); videoRef.current?.play() }}
        />
      )}
    </section>
  )
}

function ReelPanel({ game, roster, selected, file, duration, events, onPreview, nameOf }: {
  game: Game; roster: Player[]; selected: string | null; file: File | null; duration: number
  events: GameEvent[]; onPreview: (s: Segment[]) => void; nameOf: (id: string | null) => string
}) {
  const { saveGame } = useData()
  const [who, setWho] = useState<string>(selected ?? roster[0]?.id ?? 'all')
  const [types, setTypes] = useState<Set<EventType>>(new Set(EVENTS.filter((d) => d.highlight).map((d) => d.type)))
  const [progress, setProgress] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const g = game

  const picked = events.filter((e) => types.has(e.type) && (who === 'all' ? !isOpp(e.type) : e.player_id === who))
  const segs = mergeSegments(picked.map((e) => ({ start: e.t - g.clip_pre, end: e.t + g.clip_post })), duration || undefined)
  const total = segs.reduce((a, s) => a + s.end - s.start, 0)
  const label = who === 'all' ? 'Team' : nameOf(who)

  const exportReel = async () => {
    if (!file || !segs.length) return
    setErr(null)
    try {
      const blob = await buildReel(file, segs, (d, t, msg) => setProgress(`${msg} (${Math.round((d / t) * 100)}%)`))
      const ext = file.name.toLowerCase().endsWith('.mov') ? 'mov' : 'mp4'
      download(blob, `${label} vs ${g.opponent} ${g.date} highlights.${ext}`.replace(/[^\w.\- ]+/g, ''))
      setProgress(null)
    } catch (e) {
      setProgress(null)
      setErr(String((e as Error).message ?? e))
    }
  }

  return (
    <div className="card reel">
      <div className="row wrap">
        <label>Player{' '}
          <select value={who} onChange={(e) => setWho(e.target.value)}>
            {roster.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="all">Whole team</option>
          </select>
        </label>
        <label>Seconds before{' '}
          <input type="number" className="narrow" min={0} max={30} value={g.clip_pre} onChange={(e) => saveGame({ ...g, clip_pre: Number(e.target.value) })} />
        </label>
        <label>after{' '}
          <input type="number" className="narrow" min={0} max={30} value={g.clip_post} onChange={(e) => saveGame({ ...g, clip_post: Number(e.target.value) })} />
        </label>
      </div>
      <div className="chips">
        {EVENTS.filter((d) => !isOpp(d.type)).map((d) => (
          <label key={d.type} className={`chip ${types.has(d.type) ? 'on' : ''}`}>
            <input type="checkbox" hidden checked={types.has(d.type)} onChange={() => {
              const n = new Set(types); if (n.has(d.type)) n.delete(d.type); else n.add(d.type); setTypes(n)
            }} />{d.label}
          </label>
        ))}
      </div>
      <p>{picked.length} plays → <b>{segs.length} clips</b>, about <b>{fmtTime(total)}</b> long.</p>
      <div className="row wrap">
        <button disabled={!file || !segs.length} onClick={() => onPreview(segs)}>▶ Preview in player</button>
        <button className="primary" disabled={!file || !segs.length || !!progress} onClick={exportReel}>⬇ Download highlight reel</button>
        {!file && <span className="muted small">Load the game video first.</span>}
      </div>
      {progress && <p className="muted">{progress}</p>}
      {err && <p className="notice">{err}</p>}
      <p className="muted small">The reel is cut without re-encoding: full quality and fast, but each clip may start a second or two early. That's why "seconds before" pads each clip.</p>
    </div>
  )
}

function Timeline({ events, duration, time, onSeek }: { events: GameEvent[]; duration: number; time: number; onSeek: (t: number) => void }) {
  if (!duration) return null
  return (
    <div className="timeline" onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect()
      onSeek(((e.clientX - r.left) / r.width) * duration)
    }}>
      {events.map((e) => (
        <span key={e.id} className={`tick ${EVENT_BY_TYPE[e.type].tone}`} style={{ left: `${(e.t / duration) * 100}%` }} title={`${EVENT_BY_TYPE[e.type].label} ${fmtTime(e.t)}`} />
      ))}
      <span className="playhead" style={{ left: `${(time / duration) * 100}%` }} />
    </div>
  )
}
