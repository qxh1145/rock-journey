import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { callRpc, message } from '../game'
import { LookupSection } from './LookupSection'
import { ExportSection } from './ExportSection'
import { DashboardSection } from './DashboardSection'
import { UsersSection, type ResetRequests } from './UsersSection'
import { QuestionsSection } from './QuestionsSection'
import { LiveSection } from './LiveSection'

type Ctx = { onForbidden: () => void; resetRequests: ResetRequests }
// slot đăng ký: epic sau chỉ cần thêm phần tử vào đây
export const adminSections: { id: string; label: string; render: (ctx: Ctx) => ReactNode }[] = [
  { id: 'dashboard', label: 'Tổng quan', render: (ctx) => <DashboardSection {...ctx} /> },
  { id: 'live', label: 'Trực tiếp', render: (ctx) => <LiveSection {...ctx} /> },
  { id: 'users', label: 'Người dùng', render: (ctx) => <UsersSection {...ctx} /> },
  { id: 'lookup', label: 'Tra cứu', render: (ctx) => <LookupSection {...ctx} /> },
  { id: 'export', label: 'Xuất danh sách', render: (ctx) => <ExportSection {...ctx} /> },
  { id: 'questions', label: 'Bộ câu hỏi', render: (ctx) => <QuestionsSection {...ctx} /> },
]

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [forbidden, setForbidden] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const resetOwner = useRef<{ userId: string | undefined; requests: ResetRequests }>({ userId: undefined, requests: new Map() })
  const userId = session?.user.id
  if (resetOwner.current.userId !== userId) {
    resetOwner.current = { userId, requests: new Map() }
  }
  const [active, setActive] = useState(adminSections[0].id)

  useEffect(() => {
    if (!supabase) return setSession(null)
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { setForbidden(false); setSession(s) })
    return () => subscription.unsubscribe()
  }, [])

  // dò quyền ngay khi có phiên: '@@' không khớp email nào, chỉ để lấy FORBIDDEN từ server
  useEffect(() => {
    let live = true
    setForbidden(false)
    if (!session) return
    void callRpc('admin_search_players', { p_email: '@@' })
      .then((r) => { if (live && r.code === 'FORBIDDEN') setForbidden(true) }).catch(() => {})
    return () => { live = false }
  }, [session])

  async function passwordSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      if (!supabase) throw new Error('Chưa cấu hình kết nối Supabase.')
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      setPassword('')
      setForbidden(false)
      setSession(data.session)
    } catch (err) {
      setError(message(err, 'Đăng nhập thất bại.'))
    } finally {
      setBusy(false)
    }
  }

  const signIn = () => void supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin' } })
  const section = adminSections.find((s) => s.id === active) ?? adminSections[0]

  if (session === undefined) return <main className="admin"><p className="muted" role="status">Đang tải…</p></main>
  if (!session) return <main className="admin"><h1>Quản trị</h1>
    <form className="admin-login" onSubmit={(e) => void passwordSignIn(e)}>
      <label>Email<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label>Mật khẩu<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
      <button className="primary" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}
    <button className="primary" disabled={busy} onClick={signIn}>Đăng nhập bằng Google</button></main>
  // quyền thật do RPC kiểm tra; đây chỉ là màn hình khi server trả FORBIDDEN
  if (forbidden) return <main className="admin"><h1>Không có quyền truy cập</h1>
    <button className="link" onClick={() => void supabase?.auth.signOut()}>Đăng xuất</button></main>

  return (
    <main className="admin">
      <header className="admin-head"><h1>Quản trị</h1>
        <button className="link" onClick={() => void supabase?.auth.signOut()}>Đăng xuất</button></header>
      <nav className="admin-nav">
        {adminSections.map((s) => <button key={s.id} aria-current={s.id === active} onClick={() => setActive(s.id)}>{s.label}</button>)}
      </nav>
      {section.render({ onForbidden: () => setForbidden(true), resetRequests: resetOwner.current.requests })}
    </main>
  )
}
