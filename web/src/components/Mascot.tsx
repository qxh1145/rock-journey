import { useEffect, useState } from 'react'
import { sfx } from '../audio'
import { STAGES, type GameState, type Stage } from '../game'

export function carveCaption(g: GameState, carving: boolean) {
  const pct = Math.round((STAGES.indexOf(g.mascot_stage) / 6) * 100)
  if (carving) return `Tạc ${pct}% · Đang đục…`
  if (g.status === 'COMPLETED') return 'Tạc 100% · Tác phẩm hoàn thiện'
  const odd = g.answered_count % 2 === 1
  if (!g.answer && odd) return `Tạc ${pct}% · Xong câu này là đục tiếp`
  return `Tạc ${pct}% · Còn ${odd ? 1 : 2} câu nữa là đục tiếp`
}

export function Mascot({ stage, carving, onCarved, small }: {
  stage: Stage; carving?: { from: Stage; key: string } | null; onCarved?: () => void; small?: boolean
}) {
  const [swapped, setSwapped] = useState(false)
  useEffect(() => {
    if (!carving) return
    setSwapped(false)
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    // 2 nhát búa (≈0.25s & 0.55s), đổi hình ở 0.7s, kết thúc 1.2s (PRD §12); reduced motion → fade ngắn
    // máy xẻ 0–0.45s → đổi sang đục, búa gõ 2 nhát
    const hits = reduce ? [] : [window.setTimeout(() => sfx.play('saw'), 0),
      ...[600, 850].map((t) => window.setTimeout(() => sfx.play('chisel'), t))]
    const finish = stage === 'FINISHED' ? window.setTimeout(() => sfx.play('finish'), 900) : 0
    const swap = window.setTimeout(() => setSwapped(true), reduce ? 0 : 950)
    const done = window.setTimeout(() => onCarved?.(), reduce ? 250 : stage === 'FINISHED' ? 1600 : 1400)
    return () => [...hits, finish, swap, done].forEach(clearTimeout)
  }, [carving?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = carving && !swapped ? carving.from : stage
  const i = STAGES.indexOf(shown)
  return <div className={`mascot ${small ? 'small' : ''} ${carving ? 'carving' : ''}`} role="img" aria-label={`Tác phẩm: hình thái ${i + 1}/7`}>
    {carving && <img className="fx pile" src="/assets/debris-1.webp" alt="" />}
    <img className="stone" key={shown} src={`/assets/stage-${i + 1}.webp`} alt="" />
    {carving && <>
      <img className="fx saw" src="/assets/saw.webp" alt="" />
      <img className="fx chisel" src="/assets/chisel.webp" alt="" />
      <img className="fx hammer" src="/assets/hammer.webp" alt="" />
      <img className="fx spark" src="/assets/rock-spark.webp" alt="" />
      <img className="fx dust small-dust" src="/assets/dust-1.webp" alt="" />
      <img className="fx dust large-dust" src="/assets/dust-2.webp" alt="" />
      <img className="fx dust ground-dust" src="/assets/dust-3.webp" alt="" />
      {[1, 2, 3].map((n) => <img key={n} className={`fx debris debris-${n}`} src={`/assets/debris-${n}.webp`} alt="" />)}
      <img className="fx sparkle" src="/assets/sparkle.webp" alt="" />
      <img className="fx sparkle sparkle-2" src="/assets/sparkle-2.webp" alt="" />
    </>}
  </div>
}
