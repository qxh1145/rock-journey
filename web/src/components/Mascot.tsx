import { useEffect, useState } from 'react'
import { sfx } from '../audio'
import { STAGES, type GameState, type Stage } from '../game'

// Figma 64:873–64:1363: trong lúc đục vẫn hiện % của hình cũ
export function carveCaption(g: GameState, carvingFrom: Stage | null) {
  const pct = Math.round((STAGES.indexOf(carvingFrom ?? g.mascot_stage) / 6) * 100)
  if (carvingFrom) return `Tạc ${pct}% · Đang đục…`
  if (g.status === 'COMPLETED') return 'Tạc 100% · Tác phẩm hoàn thiện'
  const odd = g.answered_count % 2 === 1
  if (!g.answer && odd) return `Tạc ${pct}% · Xong câu này là đục tiếp`
  return `Tạc ${pct}% · Còn ${odd ? 1 : 2} câu nữa là đục tiếp`
}

// ảnh FX chỉ gắn vào DOM lúc đục → nếu không tải + giải mã trước, mạng di động lỡ mất máy xẻ/búa trong chuỗi 2,8s
const FX = ['saw', 'chisel', 'hammer', 'debris-1', 'debris-2', 'debris-3', 'dust-1', 'dust-2', 'dust-3', 'dust-4', 'sparkle', 'sparkle-2']
const warm = new Map<string, HTMLImageElement>()
function preload(src: string) {
  if (warm.has(src)) return
  const img = new Image()
  img.src = src
  img.decode().catch(() => {})
  warm.set(src, img)
}

export function Mascot({ stage, carving, onCarved, small }: {
  stage: Stage; carving?: { from: Stage; key: string } | null; onCarved?: () => void; small?: boolean
}) {
  const [swapped, setSwapped] = useState(false)
  useEffect(() => {
    if (small) return
    FX.forEach((n) => preload(`/assets/${n}.webp`))
    const next = STAGES.indexOf(stage) + 2
    if (next <= 7) preload(`/assets/stage-${next}.webp`)
  }, [stage, small])
  useEffect(() => {
    if (!carving) return
    setSwapped(false)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // Figma 64:873–64:1363: phát upgrade-sfx lúc bắt đầu đục, đổi hình 1.9s; reduced motion → fade ngắn
    const hits = reduce ? [] : [window.setTimeout(() => sfx.play('saw'), 0)]
    const finish = stage === 'FINISHED' ? window.setTimeout(() => sfx.play('finish'), 1800) : 0
    const swap = window.setTimeout(() => setSwapped(true), reduce ? 0 : 1900)
    const done = window.setTimeout(() => onCarved?.(), reduce ? 250 : stage === 'FINISHED' ? 3200 : 2800)
    return () => [...hits, finish, swap, done].forEach(clearTimeout)
  }, [carving?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = carving && !swapped ? carving.from : stage
  const i = STAGES.indexOf(shown)
  return <div className={`mascot ${small ? 'small' : ''} ${carving ? 'carving' : ''}`} role="img" aria-label={`Tác phẩm: hình thái ${i + 1}/7`}>
    {carving && <img className="fx pile" src="/assets/debris-1.webp" alt="" />}
    <img className={carving && !swapped ? 'stone shake' : 'stone'} key={shown} src={`/assets/stage-${i + 1}.webp`} alt="" />
    {carving && <>
      <img className="fx debris-a" src="/assets/debris-3.webp" alt="" />
      <img className="fx debris-b" src="/assets/debris-2.webp" alt="" />
      <img className="fx debris-c" src="/assets/debris-3.webp" alt="" />
      <img className="fx chisel" src="/assets/chisel.webp" alt="" />
      <img className="fx hammer" src="/assets/hammer.webp" alt="" />
      <img className="fx saw" src="/assets/saw.webp" alt="" />
      <img className="fx spark" src="/assets/dust-1.webp" alt="" />
      <img className="fx small-dust" src="/assets/dust-2.webp" alt="" />
      <img className="fx large-dust" src="/assets/dust-4.webp" alt="" />
      <img className="fx ground-dust" src="/assets/dust-3.webp" alt="" />
      <img className="fx sparkle" src="/assets/sparkle.webp" alt="" />
      <img className="fx sparkle-2" src="/assets/sparkle-2.webp" alt="" />
    </>}
  </div>
}
