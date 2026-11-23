import type { Row, Store, Table } from './store'

const KEY = (t: Table) => `hoopstats.${t}`

function read<T>(t: Table): T[] {
  try { return JSON.parse(localStorage.getItem(KEY(t)) || '[]') } catch { return [] }
}
function write(t: Table, rows: unknown[]) {
  localStorage.setItem(KEY(t), JSON.stringify(rows))
}

export const localStore: Store = {
  kind: 'local',
  async list<T extends Table>(t: T) { return read<Row[T]>(t) },
  async upsert<T extends Table>(t: T, row: Row[T]) {
    const rows = read<Row[T]>(t).filter((r) => r.id !== row.id)
    write(t, [...rows, row])
  },
  async remove(t, id) {
    write(t, read<{ id: string }>(t).filter((r) => r.id !== id))
    if (t === 'games') write('events', read<{ game_id: string }>('events').filter((e) => e.game_id !== id))
  },
}
