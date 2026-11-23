import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export function Login({ sb }: { sb: SupabaseClient }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <section className="login card">
      <h1>🏀 HoopStats</h1>
      {sent ? (
        <p>Check <b>{email}</b> for a sign-in link. Open it on this device.</p>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault()
          const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } })
          if (error) setErr(error.message); else setSent(true)
        }}>
          <p className="muted">Sign in with the email address on the family list.</p>
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="primary">Email me a sign-in link</button>
          {err && <p className="notice">{err}</p>}
        </form>
      )}
    </section>
  )
}
