// Field names are snake_case so they map 1:1 to the Supabase tables.

export interface Player {
  id: string
  name: string
  number: string
  created_at: string
}

export interface Game {
  id: string
  opponent: string
  date: string // YYYY-MM-DD
  location: string
  video_name: string | null
  video_size: number | null
  clip_pre: number // seconds of video before a tag included in a clip
  clip_post: number // seconds after
  created_at: string
}

export type EventType =
  | 'FG2_MADE' | 'FG2_MISS'
  | 'FG3_MADE' | 'FG3_MISS'
  | 'FT_MADE' | 'FT_MISS'
  | 'OREB' | 'DREB'
  | 'AST' | 'STL' | 'BLK' | 'TOV' | 'FOUL'
  | 'HIGHLIGHT'
  | 'OPP1' | 'OPP2' | 'OPP3'

export interface GameEvent {
  id: string
  game_id: string
  player_id: string | null // null for opponent scoring
  type: EventType
  t: number // seconds into the video
  created_at: string
}
