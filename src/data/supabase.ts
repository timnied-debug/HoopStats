import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Row, Store, Table } from './store'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export function cloudStore(sb: SupabaseClient): Store {
  return {
    kind: 'cloud',
    async list<T extends Table>(t: T) {
      // Supabase returns at most 1000 rows per request; page through.
      const out: Row[T][] = []
      for (let from = 0; ; from += 1000) {
        const { data, error } = await sb.from(t).select('*').range(from, from + 999)
        if (error) throw error
        out.push(...(data as Row[T][]))
        if (data.length < 1000) return out
      }
    },
    async upsert(t, row) {
      const { error } = await sb.from(t).upsert(row)
      if (error) throw error
    },
    async remove(t, id) {
      const { error } = await sb.from(t).delete().eq('id', id)
      if (error) throw error
    },
  }
}
