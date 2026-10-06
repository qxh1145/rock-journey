import { useEffect, useRef, useState } from 'react'
import { callRpc, message } from '../game'
import { readXlsx } from './fileExport'

type QSet = { version: string; active: boolean; count: number }
type Row = Record<(typeof cols)[number], string>
const cols = ['idx', 'prompt', 'a', 'b', 'c', 'd', 'correct', 'explanation'] as const

// kiểm tra giống server để báo lỗi trước khi gửi; số dòng theo Excel (dòng 1 là tiêu đề)
export function parseQuestions(sheet: string[][]): { rows: Row[]; errors: string[] } {
  // giữ số dòng gốc của Excel, bỏ dòng trống; chỉ xét 8 cột đầu (ô trống thừa ở cuối bị bỏ qua)
  const [head, ...body] = sheet.map((r, i) => ({ n: i + 1, r: r.slice(0, cols.length) })).filter(({ r }) => r.some((v) => v !== ''))
  if (head?.r.join(',').toLowerCase() !== cols.join(',')) return { rows: [], errors: [`Dòng ${head?.n ?? 1}: tiêu đề phải là ${cols.join(',')}`] }
  const rows = body.map(({ r }) => Object.fromEntries(cols.map((c, i) => [c, r[i] ?? ''])) as Row)
  const errors: string[] = []
  if (rows.length !== 12) errors.push(`Cần đúng 12 câu, file có ${rows.length}`)
  rows.forEach((r, i) => {
    const n = body[i].n
    if (r.idx !== String(i + 1)) errors.push(`Dòng ${n}: idx phải là ${i + 1}`)
    if (cols.some((c) => c !== 'idx' && c !== 'correct' && !r[c])) errors.push(`Dòng ${n}: thiếu nội dung`)
    r.correct = r.correct.toLowerCase()
    if (!['a', 'b', 'c', 'd'].includes(r.correct)) errors.push(`Dòng ${n}: correct phải là a, b, c hoặc d`)
  })
  return { rows, errors }
}

export function QuestionsSection({ onForbidden }: { onForbidden: () => void }) {
  const [sets, setSets] = useState<QSet[]>([])
  const [version, setVersion] = useState('')
  const [parsed, setParsed] = useState<{ rows: Row[]; errors: string[] } | null>(null)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const forbidden = useRef(onForbidden)
  forbidden.current = onForbidden

  async function call<T>(name: string, args?: Record<string, unknown>) {
    const r = await callRpc<T>(name, args)
    if (r.code === 'FORBIDDEN') { forbidden.current(); return null }
    if (!r.ok) { setError(r.message ?? 'Có lỗi xảy ra.'); return null }
    return r
  }
  const load = () => call<QSet[]>('admin_list_question_sets').then((r) => r && setSets(r.data ?? []))
    .catch((e) => setError(message(e, 'Không tải được danh sách bộ câu hỏi.')))
  useEffect(() => { void load() }, [])

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(''); setStatus('')
    try { await fn() } catch (e) { setError(message(e)) } finally { setBusy(false) }
  }

  const pick = (file: File | undefined) => file && run(async () => { setParsed(parseQuestions(await readXlsx(file))) })
  const doImport = () => run(async () => {
    const r = await call('admin_import_question_set', { p_version: version.trim(), p_questions: parsed!.rows })
    if (!r) return
    setStatus(`Đã nhập bộ ${version.trim()} (chưa kích hoạt)`); setParsed(null); setVersion(''); await load()
  })
  const activate = (v: string) => run(async () => {
    setConfirm('')
    if (await call('admin_activate_question_set', { p_version: v })) { setStatus(`Đã kích hoạt bộ ${v}`); await load() }
  })

  return (
    <section className="admin-section">
      <table>
        <thead><tr><th>Phiên bản</th><th>Số câu</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>{sets.map((s) => (
          <tr key={s.version}><td>{s.version}</td><td>{s.count}</td><td>{s.active ? 'Đang dùng' : 'Nháp'}</td>
            <td>{!s.active && (confirm === s.version
              ? <><button className="primary" disabled={busy} onClick={() => void activate(s.version)}>Xác nhận kích hoạt {s.version}</button>
                  <button className="link" onClick={() => setConfirm('')}>Hủy</button></>
              : <button disabled={busy} onClick={() => setConfirm(s.version)}>Kích hoạt</button>)}</td></tr>
        ))}</tbody>
      </table>
      <p className="muted">File .xlsx: dòng 1 là {cols.join(',')}, đúng 12 câu, correct là a–d. Người đang chơi giữ bộ cũ.</p>
      <div className="admin-search">
        <input aria-label="File câu hỏi" type="file" accept=".xlsx" onChange={(e) => void pick(e.target.files?.[0])} />
        <input aria-label="Phiên bản mới" placeholder="Phiên bản mới, vd. v2" value={version} onChange={(e) => setVersion(e.target.value)} />
        <button className="primary" disabled={busy || !parsed || parsed.errors.length > 0 || !version.trim()} onClick={() => void doImport()}>Nhập bộ câu hỏi</button>
      </div>
      {parsed?.errors.length ? <ul className="error" role="alert">{parsed.errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
      {parsed && parsed.rows.length > 0 && (
        <table>
          <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>{parsed.rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{r[c]}</td>)}</tr>)}</tbody>
        </table>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p role="status">{status}</p>}
    </section>
  )
}
