import { useState } from 'react'
import { callRpc, message } from '../game'
import { downloadCsv, downloadXlsx, parseCsv } from './fileExport'

type Report = { csv: string; row_count: number }
const filters = [
  { id: 'qualified', label: 'Tất cả đủ điều kiện', rewards: ['QUALIFIED_UNCLAIMED', 'CLAIMED'] },
  { id: 'qualified-unclaimed', label: 'Chưa nhận quà', rewards: ['QUALIFIED_UNCLAIMED'] },
  { id: 'claimed', label: 'Đã nhận quà', rewards: ['CLAIMED'] },
]

export function ExportSection({ onForbidden }: { onForbidden: () => void }) {
  const [filter, setFilter] = useState(filters[1].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  async function run(kind: 'csv' | 'xlsx') {
    const f = filters.find((x) => x.id === filter)!
    setBusy(true)
    setError('')
    setStatus('')
    try {
      let csv = '', count = 0
      for (const reward of f.rewards) {
        const r = await callRpc<Report>('admin_export_report', { p_status: null, p_reward: reward, p_request_id: crypto.randomUUID() })
        if (r.code === 'FORBIDDEN') return onForbidden()
        if (!r.ok || !r.data) return setError(r.message ?? 'Không xuất được danh sách.')
        // nhiều lần gọi: giữ một dòng tiêu đề
        const part = r.data.csv.replace(/\n+$/, '') // RPC trả 'header\n' khi 0 dòng
        const nl = part.indexOf('\n')
        if (!csv) csv = part
        else if (nl >= 0) csv += part.slice(nl) // bỏ dòng tiêu đề lặp
        count += r.data.row_count
      }
      const name = `prize-list-${f.id}-${new Date().toLocaleDateString('sv-SE').replace(/-/g, '')}`
      if (kind === 'csv') downloadCsv(name + '.csv', csv)
      else await downloadXlsx(name + '.xlsx', parseCsv(csv))
      setStatus(`${count} dòng`)
    } catch (err) {
      setError(message(err, 'Không xuất được danh sách.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-section">
      <div className="admin-search">
        <select aria-label="Bộ lọc quà" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {filters.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button className="primary" disabled={busy} onClick={() => void run('csv')}>Tải CSV</button>
        <button className="primary" disabled={busy} onClick={() => void run('xlsx')}>Tải XLSX</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  )
}
