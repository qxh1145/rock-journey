import { useEffect, useRef } from 'react'

export function MedalOverlay({ onClose }: { onClose: () => void }) {
  const continueButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    continueButton.current?.focus()
    return () => previousFocus?.focus()
  }, [])

  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="medal-caption"
    onKeyDown={(event) => {
      if (event.key === 'Tab') { event.preventDefault(); continueButton.current?.focus() }
      if (event.key === 'Escape') onClose()
    }}>
    <img className="badge-img" src="/assets/medal-mam-nghe.png" width="250" height="289" alt="Huy chương danh hiệu Mầm Nghề" />
    <p id="medal-caption">Bạn đã đạt danh hiệu Mầm Nghề</p>
    <button ref={continueButton} className="primary light" onClick={onClose}>Tiếp tục</button>
  </div>
}
