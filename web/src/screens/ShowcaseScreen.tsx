import { useEffect, useState, type CSSProperties } from 'react'

// Figma 74:1062 → 74:1074 → 74:1086 → 74:1049: smart animate, ease-out.
// HOLD_MS[i] = thời gian từ lúc vào bước i tới lúc sang bước i+1 (delay của bước trước khi chuyển + thời lượng animate).
const HOLD_MS = [800, 550 + 250, 400 + 50]
const ANIM_MS = [0, 550, 400, 450]
const SHELVES = [
  ['my-nghe', 'Đá mỹ nghệ', 2], ['non-bo', 'Non bộ & đá cảnh', 2], ['dieu-khac', 'Điêu khắc', 3], ['tuong', 'Tượng', 3],
] as const

export function ShowcaseScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 0)
  useEffect(() => {
    if (step >= 3) return
    const t = window.setTimeout(() => setStep(step + 1), HOLD_MS[step])
    return () => window.clearTimeout(t)
  }, [step])
  return <main className="screen showcase" data-step={step} style={{ '--dur': `${ANIM_MS[step]}ms` } as CSSProperties}>
    <div className="showcase-copy" aria-live="polite">
      <p className="showcase-eyebrow">Từ đá thô đến tác phẩm</p>
      <h1>Từ một khối đá, có thể tạo nên bao nhiêu điều?</h1>
    </div>
    <div className="showcase-hero" aria-hidden="true">
      <img className="showcase-halo" src="/assets/mascot-halo.svg" alt="" />
      <img className="showcase-mascot" src="/assets/showcase-mascot.webp" alt="" />
    </div>
    <p className="showcase-copy showcase-body">Từ mascot đá thô, bạn có thể tạo nên những tác phẩm như thế này.</p>
    <ul className="shelves">
      {SHELVES.map(([id, name, at]) => <li key={id} className={`shelf shelf-${id}`} data-on={step >= at} aria-hidden={step < at}>
        <img src={`/assets/shelf-${id}.webp`} alt={name} />
      </li>)}
    </ul>
    <button className="primary light showcase-cta" onClick={onDone}>Xem kết quả và nhận quà</button>
  </main>
}
