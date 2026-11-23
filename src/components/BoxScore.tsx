import type { Line } from '../stats'
import { emptyLine, pct, sumLines } from '../stats'

export function BoxScoreTable({ rows, showTotal = true }: { rows: { name: string; line: Line }[]; showTotal?: boolean }) {
  const total = rows.reduce((a, r) => sumLines(a, r.line), emptyLine())
  const all = showTotal && rows.length > 1 ? [...rows, { name: 'Team', line: total }] : rows
  return (
    <div className="table-wrap">
      <table className="box">
        <thead>
          <tr>
            <th className="left">Player</th><th>PTS</th><th>FG</th><th>3PT</th><th>FT</th>
            <th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>PF</th>
          </tr>
        </thead>
        <tbody>
          {all.map(({ name, line: l }) => {
            const fgm = l.fg2m + l.fg3m, fga = l.fg2a + l.fg3a
            return (
              <tr key={name} className={name === 'Team' ? 'total' : ''}>
                <td className="left">{name}</td>
                <td><b>{l.pts}</b></td>
                <td title={pct(fgm, fga)}>{fgm}-{fga}</td>
                <td title={pct(l.fg3m, l.fg3a)}>{l.fg3m}-{l.fg3a}</td>
                <td title={pct(l.ftm, l.fta)}>{l.ftm}-{l.fta}</td>
                <td title={`${l.oreb} off / ${l.dreb} def`}>{l.oreb + l.dreb}</td>
                <td>{l.ast}</td><td>{l.stl}</td><td>{l.blk}</td><td>{l.tov}</td><td>{l.pf}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
