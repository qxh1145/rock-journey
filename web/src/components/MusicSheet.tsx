import { useEffect, useRef, type CSSProperties } from 'react'
import { trackTitle, type useMusic, type Track } from '../audio'

export function MusicSheet({ music, tracks, onClose }: { music: ReturnType<typeof useMusic>; tracks: Track[]; onClose: () => void }) {
  const idx = tracks.findIndex((t) => t.asset_url === music.track)
  const ref = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  // CAP-6: giữ focus trong sheet, Esc để đóng, trả focus về nút Đổi nhạc khi đóng
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const items = () => [...ref.current!.querySelectorAll<HTMLElement>('button, input')].filter((el) => !el.hasAttribute('disabled'))
    items()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close.current()
      if (e.key !== 'Tab') return
      const list = items(), first = list[0], last = list[list.length - 1]
      if (!ref.current!.contains(document.activeElement)) { e.preventDefault(); first?.focus() }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); opener?.focus() }
  }, [])
  const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00')
  return <div className="sheet-backdrop" onClick={onClose}>
    <section ref={ref} className="sheet" role="dialog" aria-modal="true" aria-label="Nhạc nền" onClick={(e) => e.stopPropagation()}>
      <div className="grabber" aria-hidden="true" />
      <div className="sheet-head"><h2>Nhạc nền</h2><button className="ghost-btn" onClick={onClose}>Xong</button></div>
      {tracks.length === 0 ? <p className="muted">Chưa có bài nhạc nào.</p> : <>
        <h3>{trackTitle(music.track, tracks)}</h3>
        <p className="muted">Nghệ nhân tạc đá{idx >= 0 && ` · Bài ${idx + 1} / ${tracks.length}`}</p>
        <div className="transport">
          <button aria-label="Bài trước" onClick={() => music.select(tracks[(idx > 0 ? idx : tracks.length) - 1].asset_url)}>⏮</button>
          <button className="play" aria-label={music.playing ? 'Tạm dừng' : 'Phát'} onClick={music.toggle}>{music.playing ? '⏸' : '▶'}</button>
          <button aria-label="Bài sau" onClick={() => music.select(tracks[(idx + 1) % tracks.length].asset_url)}>⏭</button>
        </div>
        <input type="range" style={{ '--p': `${music.duration ? (music.time / music.duration) * 100 : 0}%` } as CSSProperties} aria-label="Vị trí bài hát" min={0} max={music.duration || 0} step={1} value={music.time} onChange={(e) => music.seek(+e.target.value)} />
        <div className="times"><span>{fmt(music.time)}</span><span>-{fmt(music.duration - music.time)}</span></div>
        <p className="label">DANH SÁCH PHÁT</p>
        <div role="radiogroup" aria-label="Danh sách phát">
          {tracks.map((t) => <button key={t.asset_url} role="radio" aria-checked={t.asset_url === music.track} className="track-item" onClick={() => music.select(t.asset_url)}>
            {t.title}<span className="dot" aria-hidden="true" />
          </button>)}
        </div>
        {music.error && <p className="error small">Không phát được bài này.</p>}
      </>}
      <div className="sfx-row"><span>Hiệu ứng âm thanh</span>
        <button className="ghost-btn" aria-pressed={music.sfxOn} onClick={music.toggleSfx}>{music.sfxOn ? 'Bật' : 'Tắt'}</button></div>
    </section>
  </div>
}
