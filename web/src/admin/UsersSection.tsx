import { useEffect, useRef, useState } from 'react'
import { callRpc, message } from '../game'
import { emptyFilter, toRpcParams, type AdminFilter } from './filters'
import { FilterBar } from './FilterBar'

type Row = {
  player_id: string; email: string; display_name: string | null; locked: boolean; status: string
  correct_count: number | null; answered_count: number | null; prize: string | null
  started_at: string | null; completed_at: string | null
}
type Page = { total: number; page: number; page_size: number; rows: Row[] }
type Detail = {
  profile: { email: string; display_name: string | null; locked: boolean; first_seen_at: string; last_seen_at: string }
  session: null | {
    status: string; answered_count: number; correct_count: number; started_at: string; completed_at: string | null
    resume_count: number; qualified_for_reward: boolean; reward_claimed: boolean; reward_claimed_at: string | null
  }
  answers: { question_index: number; prompt: string; selected_text: string | null; is_correct: boolean; answered_at: string }[]
}

const statusLabel: Record<string, string> = { NONE: 'Chưa chơi', IN_PROGRESS: 'Đang chơi', COMPLETED: 'Hoàn thành' }
const prizeLabel: Record<string, string> = { NOT_ELIGIBLE: 'Không đủ điều kiện', UNCLAIMED: 'Chưa nhận', CLAIMED: 'Đã nhận' }
const time = (t: string | null) => (t ? new Date(t).toLocaleString('vi-VN') : '—')

export function UsersSection({ onForbidden }: { onForbidden: () => void }) {
  const [filter, setFilter] = useState<AdminFilter>(emptyFilter)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Page | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [error, setError] = useState('')
  const forbidden = useRef(onForbidden) // AdminApp truyền hàm mới mỗi lần render; không để nó kích hoạt gọi lại
  forbidden.current = onForbidden

  useEffect(() => {
    let live = true
    setError('')
    callRpc<Page>('admin_search_users', { ...toRpcParams(filter), p_q: q.trim() || null, p_page: page })
      .then((r) => {
        if (!live) return
        if (r.code === 'FORBIDDEN') return forbidden.current()
        if (!r.ok || !r.data) { setData(null); return setError(r.message ?? 'Không tải được danh sách.') }
        setData(r.data)
      })
      .catch((err) => { if (live) { setData(null); setError(message(err, 'Không tải được danh sách.')) } })
    return () => { live = false }
  }, [filter, q, page])

  async function open(id: string) {
    setError('')
    try {
      const r = await callRpc<Detail>('admin_get_user_detail', { p_user_id: id })
      if (r.code === 'FORBIDDEN') return forbidden.current()
      if (!r.ok || !r.data) return setError(r.message ?? 'Không tải được chi tiết.')
      setDetail(r.data)
    } catch (err) {
      setError(message(err, 'Không tải được chi tiết.'))
    }
  }

  if (detail) {
    const { profile: p, session: s } = detail
    return (
      <section className="admin-section">
        <button className="link" onClick={() => setDetail(null)}>← Danh sách</button>
        <h2>{p.email}</h2>
        <p className="muted">{p.display_name ?? '—'}{p.locked && ' · Đã khóa'} · Lần đầu {time(p.first_seen_at)} · Gần nhất {time(p.last_seen_at)}</p>
        {s ? (
          <p>{statusLabel[s.status] ?? s.status} · {s.correct_count}/{s.answered_count} đúng · Bắt đầu {time(s.started_at)}{s.completed_at && ` · Hoàn thành ${time(s.completed_at)}`}
            {' '}· Mở lại {s.resume_count} lần · Quà: {s.reward_claimed ? `Đã nhận ${time(s.reward_claimed_at)}` : s.qualified_for_reward ? 'Chưa nhận' : 'Không đủ điều kiện'}</p>
        ) : <p className="muted">Chưa chơi</p>}
        {detail.answers.length > 0 && (
          <table>
            <thead><tr><th>Câu</th><th>Nội dung</th><th>Đã chọn</th><th>Đúng/sai</th><th>Thời gian</th></tr></thead>
            <tbody>{detail.answers.map((a) => (
              <tr key={a.question_index}><td>{a.question_index}</td><td>{a.prompt}</td><td>{a.selected_text ?? '—'}</td>
                <td>{a.is_correct ? 'Đúng' : 'Sai'}</td><td>{time(a.answered_at)}</td></tr>
            ))}</tbody>
          </table>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    )
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1
  return (
    <section className="admin-section">
      <input type="search" inputMode="email" placeholder="Email người chơi" aria-label="Email người chơi"
        value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
      <FilterBar value={filter} onChange={(f) => { setFilter(f); setPage(1) }} />
      {error && <p className="error" role="alert">{error}</p>}
      {data?.rows.length === 0 && <p className="muted">Không có người dùng</p>}
      <table>
        <thead><tr><th>Email</th><th>Tên</th><th>Trạng thái</th><th>Quà</th><th>Bắt đầu</th><th>Hoàn thành</th></tr></thead>
        <tbody>{data?.rows.map((r) => (
          <tr key={r.player_id}>
            <td><button className="link" onClick={() => void open(r.player_id)}>{r.email}</button></td>
            <td>{r.display_name ?? '—'}</td>
            <td>{statusLabel[r.status] ?? r.status}{r.status !== 'NONE' && ` · ${r.correct_count ?? 0}/${r.answered_count ?? 0}`}</td>
            <td>{r.prize ? prizeLabel[r.prize] : '—'}{r.locked && ' · Đã khóa'}</td>
            <td>{time(r.started_at)}</td><td>{time(r.completed_at)}</td>
          </tr>
        ))}</tbody>
      </table>
      {data && (
        <div className="admin-pager">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button>
          <span>Trang {data.page}/{pages} · {data.total} người</span>
          <button disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</button>
        </div>
      )}
    </section>
  )
}
