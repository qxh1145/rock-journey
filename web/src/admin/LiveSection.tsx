import { useEffect, useRef, useState } from 'react'
import { callRpc, message } from '../game'
import { emptyFilter, toRpcParams, type AdminFilter } from './filters'
import { FilterBar } from './FilterBar'

type LiveRow = { session_id: string; email: string; answered: number; correct: number; current_idx: number; last_activity: string }
const time = (t: string) => new Date(t).toLocaleTimeString('vi-VN', { hour12: false })

// poll 5 s, không dùng realtime; dừng khi tab ẩn
export function LiveSection({ onForbidden }: { onForbidden: () => void }) {
  const [filter, setFilter] = useState<AdminFilter>(emptyFilter)
  const [rows, setRows] = useState<LiveRow[]>([])
  const [at, setAt] = useState('')
  const [error, setError] = useState('')
  const forbidden = useRef(onForbidden)
  forbidden.current = onForbidden

  useEffect(() => {
    let live = true
    const tick = () => {
      if (document.hidden) return
      callRpc<LiveRow[]>('admin_live_progress', toRpcParams(filter)).then((r) => {
        if (!live) return
        if (r.code === 'FORBIDDEN') return forbidden.current()
        if (!r.ok) return setError(r.message ?? 'Không tải được tiến độ.')
        setError(''); setRows(r.data ?? []); setAt(new Date().toLocaleTimeString('vi-VN', { hour12: false }))
      }).catch((e) => { if (live) setError(message(e, 'Không tải được tiến độ.')) })
    }
    tick()
    const id = setInterval(tick, 5000)
    document.addEventListener('visibilitychange', tick) // quay lại tab: tải ngay
    return () => { live = false; clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [filter])

  return (
    <section className="admin-section">
      <FilterBar value={filter} onChange={setFilter} />
      {at && <p className="muted" role="status">cập nhật lúc {at}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <table>
        <thead><tr><th>Email</th><th>Đã trả lời</th><th>Đúng</th><th>Câu hiện tại</th><th>Hoạt động gần nhất</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.session_id}><td>{r.email}</td><td>{r.answered}</td><td>{r.correct}</td><td>{r.current_idx}</td><td>{time(r.last_activity)}</td></tr>
        ))}</tbody>
      </table>
      {rows.length === 0 && at && <p className="muted">Không có ai đang chơi</p>}
    </section>
  )
}
