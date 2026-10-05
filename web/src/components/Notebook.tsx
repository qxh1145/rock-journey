import type { ReactNode } from 'react'

export function Notebook({ children }: { children: ReactNode }) {
  return <section className="notebook"><img className="nb-bg" src="/assets/notebook-paper.svg" alt="" /><div className="paper">{children}</div></section>
}
