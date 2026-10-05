import type { Session } from '@supabase/supabase-js'

export type TopBarProps = {
  title: string
  user: Session['user'] | null
  menuOpen: boolean
  onToggleMenu: () => void
  onOpenMusic: () => void
}

export function TopBar({ title, user, menuOpen, onToggleMenu, onOpenMusic }: TopBarProps) {
  return (
    <header className="top">
      <button className="avatar" aria-label="Tài khoản" aria-expanded={menuOpen} onClick={onToggleMenu}>
        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <span aria-hidden="true">👤</span>}
      </button>
      <strong className="top-title">{title}</strong>
      <button className="ghost" onClick={(e) => { e.currentTarget.focus(); onOpenMusic() }}>Đổi nhạc <span aria-hidden="true">♪</span></button>
    </header>
  )
}

export function AvatarMenu({ onSignOut }: { onSignOut: () => void }) {
  return <div className="menu" role="menu">
    <button role="menuitem" className="link" onClick={onSignOut}>Đăng xuất</button>
  </div>
}
