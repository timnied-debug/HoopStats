import type { Game, GameEvent, Player } from '../types'

export type Table = 'players' | 'games' | 'events'
export interface Row { players: Player; games: Game; events: GameEvent }

/** Storage backend. Local (this browser only) or Supabase (shared with family). */
export interface Store {
  kind: 'local' | 'cloud'
  list<T extends Table>(table: T): Promise<Row[T][]>
  upsert<T extends Table>(table: T, row: Row[T]): Promise<void>
  remove(table: Table, id: string): Promise<void>
}

export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
