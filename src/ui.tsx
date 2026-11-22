import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Info } from 'lucide-react'

/** A small "i" button that explains where a number comes from. Works with tap and keyboard. */
export function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const pop = useRef<HTMLSpanElement>(null)
  const [shift, setShift] = useState(0)
  // Keep the bubble inside the screen when the button sits near an edge.
  useLayoutEffect(() => {
    if (!open || !pop.current) return setShift(0)
    const box = pop.current.getBoundingClientRect()
    const margin = 8
    if (box.left < margin) setShift(margin - box.left)
    else if (box.right > window.innerWidth - margin) setShift(window.innerWidth - margin - box.right)
  }, [open])
  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <span className="infotip" ref={ref}>
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen(value => !value)}><Info size={15} /></button>
      {open && <span ref={pop} className="infotip-pop" role="tooltip" style={{ marginLeft: shift }}>{children}</span>}
    </span>
  )
}

export function Pill({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'grey' | 'blue' | 'violet'; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

export function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
      {action}
    </div>
  )
}
