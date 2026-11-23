import { useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { DataProvider, useData } from './data/DataContext'
import { localStore } from './data/local'
import { cloudStore, supabase } from './data/supabase'
import { Games } from './components/Games'
import { GameView } from './components/GameView'
import { Roster } from './components/Roster'
import { Season } from './components/Season'
import { Login } from './components/Login'

function useHash() {
  const [hash, setHash] = useState(window.location.hash || '#/games')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/games')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

function Shell({ session }: { session: Session | null }) {
  const hash = useHash()
  const { store, loading, error, reload } = useData()
  const [, page, id] = hash.split('/')

  return (
    <>
      <header>
        <a href="#/games" className="brand">🏀 HoopStats</a>
        <nav>
          <a href="#/games" className={page === 'games' || page === 'game' ? 'on' : ''}>Games</a>
          <a href="#/roster" className={page === 'roster' ? 'on' : ''}>Roster</a>
          <a href="#/season" className={page === 'season' ? 'on' : ''}>Season</a>
        </nav>
        <span className="who small muted">
          {store.kind === 'local' ? 'Saved on this device' : <>{session?.user.email} · <button className="linkish" onClick={() => supabase!.auth.signOut()}>Sign out</button></>}
        </span>
      </header>
      <main>
        {error && <p className="notice">{error} <button onClick={reload}>Retry</button></p>}
        {loading ? <p className="muted">Loading…</p>
          : page === 'game' && id ? <GameView key={id} gameId={id} />
          : page === 'roster' ? <Roster />
          : page === 'season' ? <Season />
          : <Games open={(gid) => { window.location.hash = `#/game/${gid}` }} />}
      </main>
    </>
  )
}

function Cloud() {
  const sb = supabase!
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const store = useMemo(() => cloudStore(sb), [sb])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [sb])

  useEffect(() => {
    if (!session) { setAllowed(null); return }
    sb.rpc('is_family').then(({ data, error }) => setAllowed(error ? true : Boolean(data)))
  }, [sb, session])

  if (session === undefined) return <p className="muted center">Loading…</p>
  if (!session) return <Login sb={sb} />
  if (allowed === null) return <p className="muted center">Checking access…</p>
  if (!allowed) return (
    <section className="login card">
      <h1>Not on the family list</h1>
      <p><b>{session.user.email}</b> is signed in but hasn't been added yet. Ask the account owner to add it to <code>allowed_users</code> in Supabase.</p>
      <button onClick={() => sb.auth.signOut()}>Sign out</button>
    </section>
  )
  return <DataProvider store={store}><Shell session={session} /></DataProvider>
}

export default function App() {
  if (supabase) return <Cloud />
  return <DataProvider store={localStore}><Shell session={null} /></DataProvider>
}
