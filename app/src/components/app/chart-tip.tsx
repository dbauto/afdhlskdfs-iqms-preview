import * as React from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * A value tooltip for one bar, bar part or gauge segment. Opens on hover, on keyboard focus and on tap,
 * so phones can read it too. The child element becomes focusable and announces `label` to screen readers.
 */
export function ChartTip({ tip, label, children }: { tip: React.ReactNode; label: string; children: React.ReactElement<Record<string, unknown>> }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        {React.cloneElement(children, { role: "img", tabIndex: 0, "aria-label": label, onClick: () => setOpen((o) => !o) })}
      </TooltipTrigger>
      <TooltipContent className="max-w-60 px-3 py-2 font-normal leading-normal">{tip}</TooltipContent>
    </Tooltip>
  )
}

/** Focus ring for chart parts that open a ChartTip. */
export const TIP_FOCUS = "cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"

/** A round top value for a y-axis, so the ticks read as whole numbers. */
export function niceMax(v: number, steps = 4) {
  if (v <= 0) return steps
  const raw = v / steps
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  return step * steps
}

/** Y-axis labels beside a chart of the same height: 0 at the bottom, `max` at the top. */
export function YAxis({ max, steps = 4, fmt, className }: { max: number; steps?: number; fmt: (v: number) => string; className?: string }) {
  return (
    <span className={`relative w-10 shrink-0 text-right text-[0.6875rem] leading-none tabular-nums text-muted-foreground ${className ?? ""}`} aria-hidden="true">
      {Array.from({ length: steps + 1 }, (_, i) => (
        <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (i / steps) * 100}%` }}>{fmt((max / steps) * i)}</span>
      ))}
    </span>
  )
}

/** Light horizontal gridlines at each y-axis tick, drawn behind the bars. */
export function GridLines({ steps = 4 }: { steps?: number }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden="true">
      {Array.from({ length: steps }, (_, i) => (
        <span key={i} className="absolute inset-x-0 border-t border-rule-soft" style={{ top: `${(i / steps) * 100}%` }} />
      ))}
    </span>
  )
}
