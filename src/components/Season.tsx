import { useState } from 'react'
import { useData } from '../data/DataContext'
import { boxScore, emptyLine, pct, sumLines, type Line } from '../stats'
import { BoxScoreTable } from './BoxScore'

export function Season() {
  const { players, games, events } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const gamesById = new Map(games.map((g) => [g.id, g]))

  // per player: totals + per-game lines
  const rows = players.map((p) => {
    const perGame = new Map<string, Line>()
    for (const g of games) {
      const line = boxScore(events.filter((e) => e.game_id === g.id && e.player_id === p.id)).get(p.id)
      if (line) perGame.set(g.id, line)
    }
    const total = [...perGame.values()].reduce(sumLines, emptyLine())
    return { p, perGame, total, gp: perGame.size }
  })
  const avg = (n: number, gp: number) => (gp ? (n / gp).toFixed(1) : '–')

  return (
    <section>
      <h1>Season</h1>
      <div className="table-wrap">
        <table className="box">
          <thead>
            <tr><th className="left">Player</th><th>GP</th><th>PPG</th><th>RPG</th><th>APG</th><th>SPG</th><th>BPG</th><th>FG%</th><th>3P%</th><th>FT%</th><th>PTS</th></tr>
          </thead>
          <tbody>
            {rows.map(({ p, total: t, gp }) => (
              <tr key={p.id} className="clickable" onClick={() => setOpen(open === p.id ? null : p.id)}>
                <td className="left"><b>{p.name}</b></td>
                <td>{gp}</td>
                <td><b>{avg(t.pts, gp)}</b></td>
                <td>{avg(t.oreb + t.dreb, gp)}</td>
                <td>{avg(t.ast, gp)}</td>
                <td>{avg(t.stl, gp)}</td>
                <td>{avg(t.blk, gp)}</td>
                <td>{pct(t.fg2m + t.fg3m, t.fg2a + t.fg3a)}</td>
                <td>{pct(t.fg3m, t.fg3a)}</td>
                <td>{pct(t.ftm, t.fta)}</td>
                <td>{t.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted small">GP counts games where the player has at least one tagged play. Click a player for their game log.</p>
      {rows.filter((r) => r.p.id === open).map(({ p, perGame }) => (
        <div key={p.id}>
          <h2>{p.name} — game log</h2>
          <BoxScoreTable
            showTotal={false}
            rows={[...perGame.entries()]
              .sort(([a], [b]) => (gamesById.get(b)?.date ?? '').localeCompare(gamesById.get(a)?.date ?? ''))
              .map(([gid, line]) => ({ name: `${gamesById.get(gid)?.date} vs ${gamesById.get(gid)?.opponent}`, line }))}
          />
        </div>
      ))}
    </section>
  )
}
