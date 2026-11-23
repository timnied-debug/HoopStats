import { useState } from 'react'
import { useData } from '../data/DataContext'
import { now, uid } from '../data/store'
import { score } from '../stats'

const today = () => new Date().toLocaleDateString('en-CA')

export function Games({ open }: { open: (id: string) => void }) {
  const { games, events, saveGame, deleteGame, players } = useData()
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState(today())
  const [location, setLocation] = useState('')
  const sorted = [...games].sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at))

  return (
    <section>
      <h1>Games</h1>
      {!players.length && <p className="notice">Start by adding your players on the <a href="#/roster">Roster</a> page.</p>}
      <form className="row card wrap" onSubmit={(e) => {
        e.preventDefault()
        if (!opponent.trim()) return
        const id = uid()
        saveGame({ id, opponent: opponent.trim(), date, location: location.trim(), video_name: null, video_size: null, clip_pre: 7, clip_post: 3, created_at: now() })
        setOpponent(''); setLocation('')
        open(id)
      }}>
        <input placeholder="Opponent" value={opponent} onChange={(e) => setOpponent(e.target.value)} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
        <button className="primary">New game</button>
      </form>
      <ul className="list">
        {sorted.map((g) => {
          const ev = events.filter((e) => e.game_id === g.id)
          const s = score(ev)
          const result = ev.length ? (s.us > s.them ? 'W' : s.us < s.them ? 'L' : 'T') : ''
          return (
            <li key={g.id} className="card row between clickable" onClick={() => open(g.id)}>
              <span>
                <b>vs {g.opponent}</b> <span className="muted">· {g.date}{g.location && ` · ${g.location}`}</span>
                <br /><span className="muted small">{ev.length} plays tagged{g.video_name ? ` · ${g.video_name}` : ''}</span>
              </span>
              <span className="row">
                {ev.length > 0 && <span className={`result ${result}`}>{result} {s.us}–{s.them}</span>}
                <button className="danger" onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`Delete the game vs ${g.opponent} and its ${ev.length} tagged plays?`)) deleteGame(g.id)
                }}>Delete</button>
              </span>
            </li>
          )
        })}
        {!games.length && <li className="muted">No games yet.</li>}
      </ul>
    </section>
  )
}
