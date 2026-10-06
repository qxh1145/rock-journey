import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { callRpc } from '../game'
import { LookupSection } from './LookupSection'
import { ExportSection } from './ExportSection'
import { DashboardSection } from './DashboardSection'
import { UsersSection } from './UsersSection'

type Ctx = { onForbidden: () => void }
// slot đăng ký: epic sau chỉ cần thêm phần tử vào đây
export const adminSections: { id: string; label: string; render: (ctx: Ctx) => ReactNode }[] = [
  { id: 'dashboard', label: 'Tổng quan', render: (ctx) => <DashboardSection {...ctx} /> },
  { id: 'users', label: 'Người dùng', render: (ctx) => <UsersSection {...ctx} /> },
  { id: 'lookup', label: 'Tra cứu', render: (ctx) => <LookupSection {...ctx} /> },
  { id: 'export', label: 'Xuất danh sách', render: (ctx) => <ExportSection {...ctx} /> },
]

export function AdminApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [forbidden, setForbidden] = useState(false)
  const [active, setActive] = useState(adminSections[0].id)

  useEffect(() => {
    if (!supabase) return setSession(null)
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // dò quyền ngay khi có phiên: '@@' không khớp email nào, chỉ để lấy FORBIDDEN từ server
  useEffect(() => {
    if (!session) return
    void callRpc('admin_search_players', { p_email: '@@' })
      .then((r) => { if (r.code === 'FORBIDDEN') setForbidden(true) }).catch(() => {})
  }, [session])

  const signIn = () => void supabase?.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/admin' } })
  const section = adminSections.find((s) => s.id === active) ?? adminSections[0]

  if (session === undefined) return <main className="admin"><p className="muted" role="status">Đang tải…</p></main>
  if (!session) return <main className="admin"><h1>Quản trị</h1><button className="primary" onClick={signIn}>Đăng nhập bằng Google</button></main>
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
      {section.render({ onForbidden: () => setForbidden(true) })}
    </main>
  )
}
