import { useState } from 'react'
import { useData } from '../data/DataContext'
import { now, uid } from '../data/store'

export function Roster() {
  const { players, savePlayer, deletePlayer, events } = useData()
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const sorted = [...players].sort((a, b) => a.created_at.localeCompare(b.created_at))

  return (
    <section>
      <h1>Roster</h1>
      <p className="muted">Add the players you want stats and highlights for. Players 1–9 get number-key shortcuts while tagging.</p>
      <form className="row card" onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        savePlayer({ id: uid(), name: name.trim(), number: number.trim(), created_at: now() })
        setName(''); setNumber('')
      }}>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="#" className="narrow" value={number} onChange={(e) => setNumber(e.target.value)} />
        <button className="primary">Add player</button>
      </form>
      <ul className="list">
        {sorted.map((p, i) => (
          <li key={p.id} className="card row between">
            <span><span className="kbd">{i < 9 ? i + 1 : ''}</span> <b>{p.name}</b> {p.number && <span className="muted">#{p.number}</span>}</span>
            <span className="row">
              <button onClick={() => {
                const n = prompt('Name', p.name); if (n === null) return
                const num = prompt('Jersey number', p.number) ?? p.number
                savePlayer({ ...p, name: n.trim() || p.name, number: num.trim() })
              }}>Edit</button>
              <button className="danger" onClick={() => {
                const count = events.filter((e) => e.player_id === p.id).length
                if (confirm(`Delete ${p.name}?${count ? ` This also deletes their ${count} tagged plays.` : ''}`)) deletePlayer(p.id)
              }}>Delete</button>
            </span>
          </li>
        ))}
        {!players.length && <li className="muted">No players yet.</li>}
      </ul>
    </section>
  )
}
