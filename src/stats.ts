import type { GameEvent } from './types'
import { EVENT_BY_TYPE, isOpp } from './events'

export interface Line {
  pts: number
  fg2m: number; fg2a: number
  fg3m: number; fg3a: number
  ftm: number; fta: number
  oreb: number; dreb: number
  ast: number; stl: number; blk: number; tov: number; pf: number
}

export const emptyLine = (): Line => ({
  pts: 0, fg2m: 0, fg2a: 0, fg3m: 0, fg3a: 0, ftm: 0, fta: 0,
  oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0,
})

export function addEvent(l: Line, e: GameEvent) {
  switch (e.type) {
    case 'FG2_MADE': l.fg2m++; l.fg2a++; break
    case 'FG2_MISS': l.fg2a++; break
    case 'FG3_MADE': l.fg3m++; l.fg3a++; break
    case 'FG3_MISS': l.fg3a++; break
    case 'FT_MADE': l.ftm++; l.fta++; break
    case 'FT_MISS': l.fta++; break
    case 'OREB': l.oreb++; break
    case 'DREB': l.dreb++; break
    case 'AST': l.ast++; break
    case 'STL': l.stl++; break
    case 'BLK': l.blk++; break
    case 'TOV': l.tov++; break
    case 'FOUL': l.pf++; break
  }
  if (!isOpp(e.type)) l.pts += EVENT_BY_TYPE[e.type].points
}

export const sumLines = (a: Line, b: Line): Line =>
  Object.fromEntries(Object.keys(a).map((k) => [k, a[k as keyof Line] + b[k as keyof Line]])) as unknown as Line

/** Per-player lines for one set of events. */
export function boxScore(events: GameEvent[]) {
  const byPlayer = new Map<string, Line>()
  for (const e of events) {
    if (!e.player_id) continue
    if (!byPlayer.has(e.player_id)) byPlayer.set(e.player_id, emptyLine())
    addEvent(byPlayer.get(e.player_id)!, e)
  }
  return byPlayer
}

export function score(events: GameEvent[]) {
  let us = 0, them = 0
  for (const e of events) {
    const pts = EVENT_BY_TYPE[e.type].points
    if (isOpp(e.type)) them += pts
    else us += pts
  }
  return { us, them }
}

/** Running score at video time t (for showing the scoreboard while tagging). */
export const scoreAt = (events: GameEvent[], t: number) => score(events.filter((e) => e.t <= t))

export const pct = (m: number, a: number) => (a ? `${Math.round((m / a) * 100)}%` : '–')
export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  const h = Math.floor(m / 60)
  return h ? `${h}:${String(m % 60).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}
