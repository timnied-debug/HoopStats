import type { EventType } from './types'

export interface EventDef {
  type: EventType
  label: string
  short: string
  key: string // keyboard shortcut
  points: number
  needsPlayer: boolean
  highlight: boolean // included in highlight reels by default
  tone: 'good' | 'bad' | 'neutral' | 'opp'
}

export const EVENTS: EventDef[] = [
  { type: 'FG2_MADE', label: 'Made 2', short: '2PT ✓', key: 'q', points: 2, needsPlayer: true, highlight: true, tone: 'good' },
  { type: 'FG2_MISS', label: 'Missed 2', short: '2PT ✗', key: 'w', points: 0, needsPlayer: true, highlight: false, tone: 'bad' },
  { type: 'FG3_MADE', label: 'Made 3', short: '3PT ✓', key: 'e', points: 3, needsPlayer: true, highlight: true, tone: 'good' },
  { type: 'FG3_MISS', label: 'Missed 3', short: '3PT ✗', key: 'r', points: 0, needsPlayer: true, highlight: false, tone: 'bad' },
  { type: 'FT_MADE', label: 'Made FT', short: 'FT ✓', key: 'f', points: 1, needsPlayer: true, highlight: false, tone: 'good' },
  { type: 'FT_MISS', label: 'Missed FT', short: 'FT ✗', key: 'g', points: 0, needsPlayer: true, highlight: false, tone: 'bad' },
  { type: 'OREB', label: 'Off. rebound', short: 'OREB', key: 'o', points: 0, needsPlayer: true, highlight: false, tone: 'neutral' },
  { type: 'DREB', label: 'Def. rebound', short: 'DREB', key: 'd', points: 0, needsPlayer: true, highlight: false, tone: 'neutral' },
  { type: 'AST', label: 'Assist', short: 'AST', key: 'a', points: 0, needsPlayer: true, highlight: true, tone: 'good' },
  { type: 'STL', label: 'Steal', short: 'STL', key: 's', points: 0, needsPlayer: true, highlight: true, tone: 'good' },
  { type: 'BLK', label: 'Block', short: 'BLK', key: 'b', points: 0, needsPlayer: true, highlight: true, tone: 'good' },
  { type: 'TOV', label: 'Turnover', short: 'TOV', key: 't', points: 0, needsPlayer: true, highlight: false, tone: 'bad' },
  { type: 'FOUL', label: 'Foul', short: 'FOUL', key: 'p', points: 0, needsPlayer: true, highlight: false, tone: 'bad' },
  { type: 'HIGHLIGHT', label: 'Highlight', short: '★ HL', key: 'h', points: 0, needsPlayer: false, highlight: true, tone: 'neutral' },
  { type: 'OPP1', label: 'Opponent +1', short: 'OPP +1', key: 'c', points: 1, needsPlayer: false, highlight: false, tone: 'opp' },
  { type: 'OPP2', label: 'Opponent +2', short: 'OPP +2', key: 'z', points: 2, needsPlayer: false, highlight: false, tone: 'opp' },
  { type: 'OPP3', label: 'Opponent +3', short: 'OPP +3', key: 'x', points: 3, needsPlayer: false, highlight: false, tone: 'opp' },
]

export const EVENT_BY_TYPE = Object.fromEntries(EVENTS.map((e) => [e.type, e])) as Record<EventType, EventDef>
export const isOpp = (t: EventType) => t === 'OPP1' || t === 'OPP2' || t === 'OPP3'
