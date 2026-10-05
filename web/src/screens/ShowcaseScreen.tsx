import { useEffect, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { TopBar, type TopBarProps } from '../components/TopBar'

// CAP-9 — copy tạm (placeholder) cho tới khi có nội dung chính thức
const STEPS = [
  { eyebrow: 'Mở đầu', headline: 'Tác phẩm của bạn đã hoàn thành', subline: 'Từ một khối đá thô, qua 12 câu hỏi.' },
  { eyebrow: 'Giới thiệu', headline: 'Nghề tạc đá Việt Nam', subline: 'Bàn tay nghệ nhân biến đá thành hình.' },
  { eyebrow: 'Kệ tác phẩm', headline: 'Bốn dòng sản phẩm của nghề', subline: 'Đá mỹ nghệ, non bộ, điêu khắc và tượng.' },
  { eyebrow: 'Từ đá thô đến tác phẩm', headline: 'Từ đá thô đến tác phẩm', subline: 'Mỗi nhát đục là một bước học nghề.' },
]
const SHELVES = [
  ['my-nghe', 'Đá mỹ nghệ'], ['non-bo', 'Non bộ & đá cảnh'], ['dieu-khac', 'Điêu khắc'], ['tuong', 'Tượng'],
]
const STEP_MS = 1200

export function ShowcaseScreen({ topBar, onDone }: { topBar: Omit<TopBarProps, 'title' | 'showAvatar'>; onDone: () => void }) {
  const [step, setStep] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches ? 3 : 0)
  useEffect(() => {
    if (step >= 3) return
    const t = window.setTimeout(() => setStep(step + 1), STEP_MS)
    return () => window.clearTimeout(t)
  }, [step])
  const s = STEPS[step]
  return <main className="screen showcase" data-step={step}>
    <TopBar title="Tác phẩm" showAvatar={false} {...topBar} />
    <div aria-live="polite">
      <div key={step} className="showcase-copy">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>{s.headline}</h1>
      </div>
    </div>
    <div className="showcase-mascot"><Mascot stage="FINISHED" small /></div>
    <p key={`sub-${step}`} className="muted showcase-copy">{s.subline}</p>
    <ul className="shelves" aria-hidden={step < 2}>
      {SHELVES.map(([id, name]) => <li key={id} className={`shelf shelf-${id}`}>
        <img src={`/assets/shelf-${id}.webp`} alt={name} /><span>{name}</span>
      </li>)}
    </ul>
    <div className="bottom"><button className="primary" onClick={onDone}>Xem kết quả &amp; nhận quà</button></div>
  </main>
}
