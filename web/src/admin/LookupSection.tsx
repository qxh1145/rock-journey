import { useState } from 'react'
import { callRpc, message } from '../game'

export type PlayerRow = {
  player_id: string; email: string; session_id: string | null; status: string
  correct_count: number | null; answered_count: number | null; completed_at: string | null
  qualified_for_reward: boolean; reward_claimed: boolean; reward_claimed_at: string | null
}

// cùng luật với _session_json: đủ điều kiện nhận quà ⇔ Mầm Nghề
export const titleOf = (r: PlayerRow) => (r.qualified_for_reward ? 'Mầm Nghề' : null)

export function prizeStatus(r: PlayerRow) {
  if (r.status === 'NONE') return 'Chưa chơi'
  if (r.reward_claimed) return `Đã trao${r.reward_claimed_at ? ' · ' + new Date(r.reward_claimed_at).toLocaleString('vi-VN') : ''}`
  return r.qualified_for_reward ? 'Chưa trao' : 'Không đủ điều kiện'
}

export function LookupSection({ onForbidden }: { onForbidden: () => void }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<PlayerRow[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function search(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setRows(null)
    try {
      const r = await callRpc<PlayerRow[]>('admin_search_players', { p_email: query.trim() })
      if (r.code === 'FORBIDDEN') return onForbidden()
      if (!r.ok) return setError(r.message ?? 'Không tra cứu được.')
      setRows(r.data ?? [])
    } catch (err) {
      setError(message(err, 'Không tra cứu được.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-section">
      <form className="admin-search" onSubmit={(e) => void search(e)}>
        <input type="search" inputMode="email" placeholder="Email người chơi" aria-label="Email người chơi"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <button className="primary" disabled={!query.trim() || busy}>Tìm</button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
      {rows?.length === 0 && <p className="muted">Không tìm thấy người chơi</p>}
      <ul className="admin-list">
        {rows?.map((r) => (
          <li key={r.session_id ?? r.player_id}>
            <strong>{r.email}</strong>
            {r.status !== 'NONE' && <span>{r.correct_count ?? 0}/12{titleOf(r) && ` · ${titleOf(r)}`}</span>}
            <span className="muted">{prizeStatus(r)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
