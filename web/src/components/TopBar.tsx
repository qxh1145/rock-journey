import type { Session } from '@supabase/supabase-js'

export type TopBarProps = {
  title: string
  showAvatar?: boolean
  user: Session['user'] | null
  menuOpen: boolean
  onToggleMenu: () => void
  onOpenMusic: () => void
}

export function TopBar({ title, showAvatar = true, user, menuOpen, onToggleMenu, onOpenMusic }: TopBarProps) {
  return (
    <header className="top">
      {showAvatar && <button className="avatar" aria-label="Tài khoản" aria-expanded={menuOpen} onClick={onToggleMenu}>
        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <span aria-hidden="true">👤</span>}
      </button>}
      <strong className="top-title">{title}</strong>
      <button className="ghost" onClick={(e) => { e.currentTarget.focus(); onOpenMusic() }}>Đổi nhạc <span aria-hidden="true">♪</span></button>
    </header>
  )
}

export function AvatarMenu({ user, onSignOut }: { user: Session['user'] | null; onSignOut: () => void }) {
  return <div className="menu" role="menu">
    <p className="small">{user?.email}</p>
    <button role="menuitem" className="link" onClick={onSignOut}>Đăng xuất</button>
  </div>
}
