import { useLayoutEffect, useRef, type ReactNode } from 'react'

// Figma vẽ trang sổ cố định 350×326 cho 3 đáp án; câu 4 đáp án / dòng dài thì thu khoảng trống rồi thu nhỏ cho vừa trang
export function Notebook({ children }: { children: ReactNode }) {
  const paper = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const fit = () => {
      const p = paper.current, b = body.current
      if (!p || !b) return
      b.classList.remove('tight')
      b.style.zoom = ''
      const room = p.clientHeight - parseFloat(getComputedStyle(p).paddingTop) - parseFloat(getComputedStyle(p).paddingBottom)
      if (b.offsetHeight <= room) return
      b.classList.add('tight')
      if (b.offsetHeight > room) b.style.zoom = String(room / b.offsetHeight)
    }
    fit()
    document.fonts?.ready.then(fit)
  })
  return <section className="notebook">
    <img className="nb-bg" src="/assets/notebook-paper.svg" alt="" />
    <div className="paper" ref={paper}><div ref={body}>{children}</div></div>
  </section>
}
