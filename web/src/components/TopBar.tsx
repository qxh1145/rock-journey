import type { Session } from '@supabase/supabase-js'

export type TopBarProps = {
  title: string
  user: Session['user'] | null
  menuOpen: boolean
  onToggleMenu: () => void
  onOpenMusic: () => void
  musicTitle: string
}

export function TopBar({ title, user, menuOpen, onToggleMenu, onOpenMusic, musicTitle }: TopBarProps) {
  return (
    <header className="top">
      <button className="avatar" aria-label="Tài khoản" aria-expanded={menuOpen} onClick={onToggleMenu}>
        {user?.user_metadata?.avatar_url ? <img src={user.user_metadata.avatar_url} alt="" /> : <img className="avatar-default" src="/assets/avatar.svg" alt="" />}
      </button>
      <strong className="top-title">{title}</strong>
      <button className="ghost" aria-label={`Đổi nhạc: ${musicTitle}`} onClick={(e) => { e.currentTarget.focus(); onOpenMusic() }}>
        <span className="name">{musicTitle || 'Đổi nhạc'}</span> <span aria-hidden="true">♪</span></button>
    </header>
  )
}

export function AvatarMenu({ onSignOut }: { onSignOut: () => void }) {
  return <div className="menu" role="menu">
    <button role="menuitem" className="link" onClick={onSignOut}>Đăng xuất</button>
  </div>
}
