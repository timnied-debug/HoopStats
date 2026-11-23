import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Game, GameEvent, Player } from '../types'
import type { Store } from './store'

interface Data {
  store: Store
  loading: boolean
  error: string | null
  players: Player[]
  games: Game[]
  events: GameEvent[]
  savePlayer(p: Player): void
  deletePlayer(id: string): void
  saveGame(g: Game): void
  deleteGame(id: string): void
  saveEvent(e: GameEvent): void
  deleteEvent(id: string): void
  reload(): void
}

const Ctx = createContext<Data | null>(null)
export const useData = () => useContext(Ctx)!

const byId = <T extends { id: string }>(rows: T[], row: T) => [...rows.filter((r) => r.id !== row.id), row]

export function DataProvider({ store, children }: { store: Store; children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [p, g, e] = await Promise.all([store.list('players'), store.list('games'), store.list('events')])
      setPlayers(p); setGames(g); setEvents(e); setError(null)
    } catch (err) {
      setError(String((err as Error).message ?? err))
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => { reload() }, [reload])

  // Update the screen immediately, save in the background, surface failures.
  const persist = useCallback((p: Promise<void>) => {
    p.catch((err) => setError(`Save failed: ${err.message ?? err}`))
  }, [])

  const value = useMemo<Data>(() => ({
    store, loading, error, players, games, events, reload,
    savePlayer: (p) => { setPlayers((r) => byId(r, p)); persist(store.upsert('players', p)) },
    deletePlayer: (id) => { setPlayers((r) => r.filter((x) => x.id !== id)); persist(store.remove('players', id)) },
    saveGame: (g) => { setGames((r) => byId(r, g)); persist(store.upsert('games', g)) },
    deleteGame: (id) => {
      setGames((r) => r.filter((x) => x.id !== id))
      setEvents((r) => r.filter((x) => x.game_id !== id))
      persist(store.remove('games', id))
    },
    saveEvent: (e) => { setEvents((r) => byId(r, e)); persist(store.upsert('events', e)) },
    deleteEvent: (id) => { setEvents((r) => r.filter((x) => x.id !== id)); persist(store.remove('events', id)) },
  }), [store, loading, error, players, games, events, reload, persist])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
