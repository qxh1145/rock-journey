import { useEffect, useRef, useState } from 'react'
import { callRpc, message } from '../game'
import { emptyFilter, toRpcParams, type AdminFilter } from './filters'

type Kpis = Record<'total' | 'in_progress' | 'completed' | 'eligible' | 'unclaimed' | 'claimed', number>
  & { resume_rate: number | null; avg_score: number | null }

const tiles: { key: keyof Kpis; label: string; fmt?: (v: number) => string }[] = [
  { key: 'total', label: 'Tổng lượt chơi' },
  { key: 'in_progress', label: 'Đang chơi' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'resume_rate', label: 'Tỉ lệ quay lại', fmt: (v) => `${Math.round(v * 100)}%` },
  { key: 'avg_score', label: 'Điểm TB' },
  { key: 'eligible', label: 'Đủ điều kiện quà' },
  { key: 'unclaimed', label: 'Chưa nhận quà' },
  { key: 'claimed', label: 'Đã nhận quà' },
]

export function DashboardSection({ onForbidden }: { onForbidden: () => void }) {
  const [filter, setFilter] = useState<AdminFilter>(emptyFilter)
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [error, setError] = useState('')
  const forbidden = useRef(onForbidden) // AdminApp truyền hàm mới mỗi lần render; không để nó kích hoạt gọi lại
  forbidden.current = onForbidden
  const set = (patch: Partial<AdminFilter>) => setFilter((f) => ({ ...f, ...patch }))

  useEffect(() => {
    let live = true
    setError('')
    callRpc<Kpis>('admin_get_dashboard', toRpcParams(filter))
      .then((r) => {
        if (!live) return
        if (r.code === 'FORBIDDEN') return forbidden.current()
        if (!r.ok || !r.data) { setKpis(null); return setError(r.message ?? 'Không tải được số liệu.') }
        setKpis(r.data)
      })
      .catch((err) => { if (live) { setKpis(null); setError(message(err, 'Không tải được số liệu.')) } })
    return () => { live = false }
  }, [filter])

  return (
    <section className="admin-section">
      <div className="admin-filter">
        <label>Từ ngày<input type="date" value={filter.from} onChange={(e) => set({ from: e.target.value })} /></label>
        <label>Đến ngày<input type="date" value={filter.to} onChange={(e) => set({ to: e.target.value })} /></label>
        <label>Trạng thái<select value={filter.status} onChange={(e) => set({ status: e.target.value as AdminFilter['status'] })}>
          <option value="">Tất cả</option><option value="IN_PROGRESS">Đang chơi</option><option value="COMPLETED">Hoàn thành</option>
        </select></label>
        <label>Điểm từ<input type="number" min={0} max={12} step={1} value={filter.scoreMin} onChange={(e) => set({ scoreMin: e.target.value })} /></label>
        <label>Điểm đến<input type="number" min={0} max={12} step={1} value={filter.scoreMax} onChange={(e) => set({ scoreMax: e.target.value })} /></label>
        <label>Quà<select value={filter.prize} onChange={(e) => set({ prize: e.target.value as AdminFilter['prize'] })}>
          <option value="">Tất cả</option><option value="NOT_ELIGIBLE">Không đủ điều kiện</option>
          <option value="UNCLAIMED">Chưa nhận</option><option value="CLAIMED">Đã nhận</option>
        </select></label>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <ul className="admin-kpis">
        {tiles.map((t) => {
          const v = kpis?.[t.key]
          return <li key={t.key}><span className="muted">{t.label}</span>
            <strong>{v == null ? '—' : t.fmt ? t.fmt(v) : v}</strong></li>
        })}
      </ul>
    </section>
  )
}
