import type { ReactNode } from 'react'

export function Notebook({ children }: { children: ReactNode }) {
  return <section className="notebook"><div className="spiral" aria-hidden="true" /><div className="paper">{children}</div></section>
}
