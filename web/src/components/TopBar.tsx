import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import type { Session } from '@supabase/supabase-js'

export type TopBarProps = {
  title: string
  user: Session['user'] | null
  menuOpen: boolean
  onToggleMenu: () => void
  onOpenMusic: () => void
  musicTitle: string
}

export function TopBar({ title, menuOpen, onToggleMenu, onOpenMusic, musicTitle }: TopBarProps) {
  const name = musicTitle || 'Đổi nhạc'
  const box = useRef<HTMLSpanElement>(null)
  // tên dài hơn khung → chạy chữ phải sang trái như biển hiệu, ~30px/s
  const [dur, setDur] = useState(0)
  useLayoutEffect(() => {
    const measure = () => { const b = box.current; if (b) { const w = (b.firstElementChild as HTMLElement).offsetWidth; setDur(w > b.clientWidth ? w / 30 : 0) } }
    measure()
    void document.fonts?.ready.then(measure)
  }, [name])
  return (
    <header className="top">
      <button className="avatar" aria-label="Tài khoản" aria-expanded={menuOpen} onClick={onToggleMenu}>
        <img className="avatar-default" src="/assets/avatar-default-photo.jpg" alt="" />
      </button>
      <strong className="top-title">{title}</strong>
      <button className="ghost" aria-label={`Đổi nhạc: ${musicTitle}`} onClick={(e) => { e.currentTarget.focus(); onOpenMusic() }}>
        <span ref={box} className={dur ? 'name run' : 'name'} style={{ '--d': `${dur}s` } as CSSProperties}>
          <span>{name}</span>{dur > 0 && <span aria-hidden="true">{name}</span>}</span> <span aria-hidden="true">♪</span></button>
    </header>
  )
}

export function AvatarMenu({ onSignOut }: { onSignOut: () => void }) {
  return <div className="menu" role="menu">
    <button role="menuitem" className="link" onClick={onSignOut}>Đăng xuất</button>
  </div>
}
