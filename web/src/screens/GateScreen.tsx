import { Mascot } from '../components/Mascot'
import type { Stage } from '../game'

// Figma 142:1053 "00 · Cổng vào làng nghề"; leaving = nửa đầu flow mở màn (142:1053 → 148:1081)
export function GateScreen({ stage, cta, error, leaving, onCta }: {
  stage: Stage; cta: string; error?: string; leaving?: boolean; onCta?: () => void
}) {
  return <main className={leaving ? 'screen gate leaving' : 'screen gate'} aria-hidden={leaving || undefined}>
    <img className="gate-atmosphere" src="/assets/gate-atmosphere.svg" alt="" />
    <div className="gate-stall"><img src="/assets/gate-stall.webp" alt="" /></div>
    <div className="gate-sparkles" aria-hidden="true">
      <img src="/assets/gate-sparkle-16.svg" alt="" style={{ left: 35, top: 90 }} />
      <img src="/assets/gate-sparkle-14.svg" alt="" style={{ left: 335, top: 120 }} />
      <img src="/assets/gate-sparkle-12.svg" alt="" style={{ left: 348, top: 498 }} />
    </div>
    <div className="gate-greet">
      <p>Một khối đá. Một đôi tay. Một hành trình.</p>
      <p>Bạn đã sẵn sàng thử sức làm nghệ nhân?</p>
    </div>
    {/* khi rời đi, khối đá do PlayScreen vẽ (bay từ đây vào khung quiz) */}
    {!leaving && <Mascot stage={stage} />}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="bottom"><button className="primary" onClick={onCta} tabIndex={leaving ? -1 : undefined}>{cta}</button></div>
  </main>
}
