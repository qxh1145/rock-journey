import { useState } from 'react'
import { callRpc, message } from '../game'
import { downloadCsv, downloadXlsx, parseCsv } from './fileExport'
import { emptyFilter, toRpcParams, type AdminFilter } from './filters'
import { FilterBar } from './FilterBar'

type Report = { csv: string; row_count: number }
const filters = [
  { id: 'qualified', label: 'Tất cả đủ điều kiện', rewards: ['QUALIFIED_UNCLAIMED', 'CLAIMED'] },
  { id: 'qualified-unclaimed', label: 'Chưa nhận quà', rewards: ['QUALIFIED_UNCLAIMED'] },
  { id: 'claimed', label: 'Đã nhận quà', rewards: ['CLAIMED'] },
]
const fields = [
  ['email', 'Email'], ['session_id', 'Mã lượt'], ['status', 'Trạng thái'], ['started_at', 'Bắt đầu'],
  ['completed_at', 'Hoàn thành'], ['answered_count', 'Số câu đã trả lời'], ['correct_count', 'Số câu đúng'],
  ['title', 'Danh hiệu'], ['qualified', 'Đủ điều kiện'], ['reward_claimed', 'Đã nhận quà'],
  ['reward_claimed_at', 'Thời điểm nhận quà'], ['reward_claimed_by', 'Người trao quà'],
]
const today = () => new Date().toLocaleDateString('sv-SE').replace(/-/g, '')
const save = async (kind: 'csv' | 'xlsx', name: string, csv: string) =>
  kind === 'csv' ? downloadCsv(name + '.csv', csv) : downloadXlsx(name + '.xlsx', parseCsv(csv))

export function ExportSection({ onForbidden }: { onForbidden: () => void }) {
  const [filter, setFilter] = useState(filters[1].id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [adminFilter, setAdminFilter] = useState<AdminFilter>(emptyFilter)
  const [picked, setPicked] = useState(['email', 'status', 'correct_count'])
  const [answers, setAnswers] = useState(false)

  async function runFiltered(kind: 'csv' | 'xlsx') {
    setBusy(true)
    setError('')
    setStatus('')
    try {
      const r = await callRpc<Report>('admin_export_report', {
        ...toRpcParams(adminFilter), p_fields: fields.map((f) => f[0]).filter((f) => picked.includes(f)),
        p_include_answers: answers, p_request_id: crypto.randomUUID(),
      })
      if (r.code === 'FORBIDDEN') return onForbidden()
      if (!r.ok || !r.data) return setError(r.message ?? 'Không xuất được danh sách.')
      await save(kind, `players-${today()}`, r.data.csv.replace(/\n+$/, ''))
      setStatus(`${r.data.row_count} dòng`)
    } catch (err) {
      setError(message(err, 'Không xuất được danh sách.'))
    } finally {
      setBusy(false)
    }
  }

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
      await save(kind, `prize-list-${f.id}-${today()}`, csv)
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
      <h2>Xuất người chơi theo bộ lọc</h2>
      <FilterBar value={adminFilter} onChange={setAdminFilter} />
      <fieldset className="admin-fields"><legend>Cột</legend>
        {fields.map(([id, label]) => <label key={id}><input type="checkbox" checked={picked.includes(id)}
          onChange={(e) => setPicked(e.target.checked ? [...picked, id] : picked.filter((x) => x !== id))} />{label}</label>)}
        <label><input type="checkbox" checked={answers} onChange={(e) => setAnswers(e.target.checked)} />Kèm câu trả lời (q1–q12)</label>
      </fieldset>
      <div className="admin-search">
        <button className="primary" disabled={busy || picked.length === 0} onClick={() => void runFiltered('csv')}>Tải CSV người chơi</button>
        <button className="primary" disabled={busy || picked.length === 0} onClick={() => void runFiltered('xlsx')}>Tải XLSX người chơi</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  )
}
