import * as React from "react"

import { cn } from "@/lib/utils"
import { ChartTip, GridLines, TIP_FOCUS, YAxis } from "@/components/app/chart-tip"
import { Card } from "@/components/ui/card"
import { NativeSelect } from "@/components/ui/input"
import type { Tone } from "@/data/observability"

const TONE_TEXT: Record<Tone, string> = { done: "text-muted-foreground", progress: "text-progress", soon: "text-soon", overdue: "text-overdue", draft: "text-muted-foreground" }

/** five figures across the top of an Operations page */
export function KpiRow({ items }: { items: { label: string; value: string; note: string; tone?: Tone }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {items.map((k) => (
        <Card key={k.label} className="flex flex-col gap-1 px-4 py-3.5">
          <span className="text-[0.8125rem] text-muted-foreground">{k.label}</span>
          <span className="text-[1.5rem] font-semibold leading-tight tracking-[-0.01em]">{k.value}</span>
          <span className={cn("text-xs", TONE_TEXT[k.tone ?? "draft"])}>{k.note}</span>
        </Card>
      ))}
    </div>
  )
}

/** organisation and time range shown on every Operations page */
export function OpsFilters({ orgs, org, setOrg }: { orgs: string[]; org: string; setOrg: (o: string) => void }) {
  return (
    <>
      <NativeSelect aria-label="Organisation" value={org} onChange={(e) => setOrg(e.target.value)} className="h-9 w-auto min-w-48 text-[0.8125rem]">
        <option value="">All organisations</option>
        {orgs.map((o) => <option key={o}>{o}</option>)}
      </NativeSelect>
      <NativeSelect aria-label="Time range" defaultValue="24h" className="h-9 w-auto min-w-36 text-[0.8125rem]">
        <option value="1h">Last hour</option>
        <option value="24h">Last 24 hours</option>
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </NativeSelect>
    </>
  )
}

export function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex gap-0.5 rounded-sm bg-secondary p-[3px]">
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(o)} className={cn("inline-flex h-[30px] cursor-pointer items-center rounded-[4px] px-3 text-[0.8125rem] font-medium", value === o ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          {o}
        </button>
      ))}
    </div>
  )
}

export function TableTitle({ title, note }: { title: string; note?: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </span>
  )
}

export function Legend({ items }: { items: { label: string; className: string; line?: boolean; dashed?: boolean }[] }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(i.dashed ? "h-0 w-3 border-t-2 border-dashed bg-transparent" : i.line ? "h-0.5 w-3" : "size-2.5 rounded-[2px]", i.className)} />
          {i.label}
        </span>
      ))}
    </span>
  )
}

/** bars standing on the x axis, with y-axis labels, gridlines and an optional limit line and marker */
export function BarChart({
  values,
  labels,
  max,
  steps = 4,
  height = "h-56",
  label,
  tip,
  barClass,
  limit,
  marker,
  overlay,
  everyNth = 3,
}: {
  values: number[]
  labels: string[]
  max: number
  steps?: number
  height?: string
  label: string
  tip: (i: number) => React.ReactNode
  barClass?: (i: number, v: number) => string
  limit?: { value: number; label: string }
  marker?: { index: number; label: string }
  overlay?: number[]
  everyNth?: number
}) {
  const n = labels.length
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <YAxis max={max} steps={steps} fmt={(v) => `${Math.round(v)}`} className={height} />
        <div className={cn("relative flex-1 border-b border-l", height)}>
          <GridLines steps={steps} />
          <div className="absolute inset-0 flex items-end gap-1 px-1" role="group" aria-label={label}>
            {labels.map((l, i) => {
              const v = values[i]
              return (
                <ChartTip key={l} label={`${l}: ${v ?? "no data yet"}`} tip={tip(i)}>
                  <span className="flex h-full min-w-0 flex-1 items-end hover:bg-primary/5">
                    {v !== undefined && <span className={cn(TIP_FOCUS, "w-full rounded-t-[3px]", barClass?.(i, v) ?? "bg-primary")} style={{ height: `${(v / max) * 100}%` }} />}
                  </span>
                </ChartTip>
              )
            })}
          </div>
          {overlay && (
            <svg viewBox={`0 0 ${n} 100`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              <polyline points={overlay.map((v, i) => `${i + 0.5},${100 - (v / max) * 100}`).join(" ")} fill="none" className="stroke-soon-bar" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
          {limit && (
            <span className="pointer-events-none absolute inset-x-0 border-t-[1.5px] border-dashed border-overdue" style={{ bottom: `${(limit.value / max) * 100}%` }} aria-hidden="true">
              <span className="absolute -top-4 right-1 bg-card px-1 text-[0.6875rem] text-overdue">{limit.label}</span>
            </span>
          )}
          {marker && (
            <span className="pointer-events-none absolute inset-y-0 border-l-[1.5px] border-dashed border-soon" style={{ left: `${(marker.index / n) * 100}%` }} aria-hidden="true">
              <span className="absolute left-1 top-0.5 whitespace-nowrap bg-card px-1 text-[0.6875rem] text-soon">{marker.label}</span>
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-1 pl-12 pr-1 text-[0.6875rem] text-muted-foreground" aria-hidden="true">
        {labels.map((l, i) => <span key={l} className="min-w-0 flex-1 text-center">{i % everyNth === 0 ? l : ""}</span>)}
      </div>
    </div>
  )
}

/** one or more lines over the same x labels, with y-axis labels and gridlines */
export function LineChart({ series, labels, max, steps = 4, height = "h-48", label, tip }: { series: { values: number[]; className: string }[]; labels: string[]; max: number; steps?: number; height?: string; label: string; tip: (i: number) => React.ReactNode }) {
  const n = labels.length
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <YAxis max={max} steps={steps} fmt={(v) => `${Math.round(v)}`} className={height} />
        <div className={cn("relative flex-1 border-b border-l", height)}>
          <GridLines steps={steps} />
          <svg viewBox={`0 0 ${n - 1} 100`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {series.map((s, k) => (
              <polyline key={k} points={s.values.map((v, i) => `${i},${100 - (v / max) * 100}`).join(" ")} fill="none" className={s.className} strokeWidth="2" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          <div className="absolute inset-0 flex" role="group" aria-label={label}>
            {labels.map((l, i) => (
              <ChartTip key={l} label={l} tip={tip(i)}>
                <span className={cn(TIP_FOCUS, "h-full flex-1 hover:bg-primary/5")} />
              </ChartTip>
            ))}
          </div>
        </div>
      </div>
      <div className="flex pl-12 text-[0.6875rem] text-muted-foreground" aria-hidden="true">
        {labels.map((l, i) => <span key={l} className="min-w-0 flex-1 text-center">{i % 3 === 0 ? l : ""}</span>)}
      </div>
    </div>
  )
}

export function Meter({ value, tone }: { value: number; tone: Tone }) {
  const bar = tone === "overdue" ? "bg-overdue" : tone === "soon" ? "bg-soon-bar" : "bg-primary"
  return (
    <span className="block h-1.5 w-full min-w-24 overflow-hidden rounded-full bg-secondary" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${value}% of limit`}>
      <span className={cn("block h-full rounded-full", bar)} style={{ width: `${Math.max(value, 2)}%` }} />
    </span>
  )
}

export function Spark({ values, className = "stroke-primary" }: { values: number[]; className?: string }) {
  const m = Math.max(...values, 1)
  return (
    <svg viewBox="0 0 90 24" className="h-6 w-[90px]" aria-hidden="true">
      <polyline points={values.map((v, i) => `${(i / (values.length - 1)) * 88 + 1},${22 - (v / m) * 20}`).join(" ")} fill="none" className={className} strokeWidth="1.6" />
    </svg>
  )
}

export function StatusDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={cn("size-2 rounded-full", className)} />
      {label}
    </span>
  )
}
