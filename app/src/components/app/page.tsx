import * as React from "react"
import { Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge, type BadgeTone } from "@/components/ui/badge"

/* ---------------- Page header ---------------- */

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden="true">/</span>}
          {it.to ? (
            <Link to={it.to} className="text-primary hover:text-primary-hover">
              {it.label}
            </Link>
          ) : (
            <span aria-current="page">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}

export function PageHeader({
  title,
  description,
  meta,
  badge,
  actions,
  breadcrumbs,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  meta?: React.ReactNode
  badge?: React.ReactNode
  actions?: React.ReactNode
  breadcrumbs?: { label: string; to?: string }[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 max-w-[760px] flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.015em] short:text-[1.5rem]">{title}</h1>
            {badge}
          </div>
          {meta && <div className="flex flex-wrap items-center gap-2 text-[0.8125rem] text-muted-foreground">{meta}</div>}
          {description && <p className="text-sm leading-normal text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}

/** "OPS-WI-014 / Work instruction / Revision 03" style meta line */
export function MetaLine({ parts }: { parts: React.ReactNode[] }) {
  return (
    <>
      {parts.filter(Boolean).map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span aria-hidden="true">/</span>}
          <span>{p}</span>
        </React.Fragment>
      ))}
    </>
  )
}

/* ---------------- Figure cards (style B: icon tile + status badge) ---------------- */

export interface Figure {
  value: React.ReactNode
  label: string
  badge?: string
  tone?: BadgeTone
  icon: LucideIcon
  to?: string
}

export function FigureCard({ value, label, badge, tone = "draft", icon: Icon, to }: Figure) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-background text-foreground short:size-8">
          <Icon className="size-[18px]" />
        </span>
        {badge && <Badge tone={tone}>{badge}</Badge>}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] short:text-[1.5rem]">{value}</span>
        <span className="text-[0.8125rem] text-muted-foreground">{label}</span>
      </div>
    </>
  )
  const cls = "flex min-w-0 flex-col gap-5 rounded-md border bg-card p-5 short:gap-3 short:p-4"
  return to ? (
    <Link to={to} className={cn(cls, "transition-colors hover:border-input")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export function FigureGrid({ figures }: { figures: Figure[] }) {
  return (
    // Responds to its own width, not the screen: 4 across when there is room, then 2, then 1.
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @[30rem]:grid-cols-2 @[52rem]:grid-cols-4 short:gap-3">
        {figures.map((f) => (
          <FigureCard key={f.label} {...f} />
        ))}
      </div>
    </div>
  )
}

/* ---------------- Lifecycle track: the signature component ---------------- */

export interface TrackStep {
  label: string
  when?: string
}

/**
 * Shows where a record is in its lifecycle. Done steps are ink,
 * the current step is accent (or red when late), later steps are grey.
 */
export function LifecycleTrack({ steps, current, late, compact }: { steps: TrackStep[]; current: number; late?: boolean; compact?: boolean }) {
  const now = late ? "bg-overdue" : "bg-primary"
  const cur = steps[Math.min(current, steps.length - 1)]
  return (
    <div className="flex flex-col gap-2">
    {!compact && current < steps.length && (
      <p className="text-[0.8125rem] sm:hidden">
        Step {current + 1} of {steps.length}: <span className={cn("font-semibold", late ? "text-overdue" : "text-primary")}>{cur.label}</span>
        {cur.when && <span className="text-muted-foreground">, {cur.when}</span>}
      </p>
    )}
    <ol className={cn("grid gap-1", compact ? "" : "gap-1.5")} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Progress">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo"
        return (
          <li key={s.label} className="flex min-w-0 flex-col gap-2" aria-current={state === "current" ? "step" : undefined}>
            <span className={cn("h-1.5 rounded-full", state === "done" && "bg-foreground", state === "current" && now, state === "todo" && "bg-border")} />
            {!compact && (
              <span className="hidden min-w-0 flex-col gap-0.5 pr-2 sm:flex">
                <span className={cn("truncate text-[0.8125rem]", state === "current" ? cn("font-semibold", late ? "text-overdue" : "text-primary") : state === "done" ? "text-foreground" : "text-muted-foreground")}>
                  {s.label}
                </span>
                {s.when && <span className={cn("text-xs", state === "current" && late ? "text-overdue" : "text-muted-foreground")}>{s.when}</span>}
              </span>
            )}
          </li>
        )
      })}
    </ol>
    </div>
  )
}

/** Tiny segmented track for table rows */
export function MiniTrack({ total, done, tone = "progress" }: { total: number; done: number; tone?: "progress" | "done" | "overdue" | "soon" | "draft" }) {
  const color = { progress: "bg-primary", done: "bg-done", overdue: "bg-overdue", soon: "bg-soon", draft: "bg-faint" }[tone]
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={cn("h-1 w-4 rounded-full", i < done ? color : "bg-border")} />
      ))}
    </span>
  )
}

/* ---------------- View chips (saved filters above a table) ---------------- */

export function ViewChips<T extends string>({
  views,
  value,
  onChange,
}: {
  views: { id: T; label: string; count?: number; warn?: boolean }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div role="group" aria-label="Views" className="flex flex-wrap gap-2">
      {views.map((v) => {
        const on = v.id === value
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(v.id)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-[0.8125rem] font-medium transition-colors",
              on ? "border-foreground bg-foreground text-background" : "border-input bg-card text-foreground hover:bg-background"
            )}
          >
            {v.label}
            {v.count !== undefined && <span className={cn("text-xs", on ? "text-background/70" : v.warn ? "text-overdue" : "text-muted-foreground")}>{v.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------------- Key facts list ---------------- */

export function KeyFacts({ facts, className }: { facts: { k: string; v: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col", className)}>
      {facts.map((f, i) => (
        <div key={f.k} className={cn("grid grid-cols-[120px_minmax(0,1fr)] gap-3 py-2.5 text-sm", i > 0 && "border-t border-rule-soft")}>
          <dt className="text-muted-foreground">{f.k}</dt>
          <dd className="min-w-0">{f.v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* ---------------- Empty state ---------------- */

export function EmptyState({ icon: Icon, title, body, action }: { icon: LucideIcon; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-11 items-center justify-center rounded-md bg-background text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      {body && <p className="max-w-sm text-sm leading-normal text-muted-foreground">{body}</p>}
      {action}
    </div>
  )
}

/** A quiet empty message inside a card or list, for when there's nothing to show. */
export function EmptyLine({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1 px-5 py-6">
      <p className="text-sm font-semibold">{title}</p>
      {body && <p className="text-[0.8125rem] leading-normal text-muted-foreground">{body}</p>}
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

/* ---------------- Two-column record layout ---------------- */

export function RecordLayout({ main, side }: { main: React.ReactNode; side: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <aside className="flex min-w-0 flex-col gap-6">{side}</aside>
    </div>
  )
}

/** A "your step" callout at the top of a record */
export function YourStep({ title, children, due, tone = "progress", actions }: { title: string; children: React.ReactNode; due?: string; tone?: "progress" | "overdue" | "soon"; actions?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-start gap-4 rounded-md border p-5", tone === "progress" && "border-info-border bg-highlight", tone === "overdue" && "border-overdue-border bg-overdue-tint", tone === "soon" && "border-soon-border bg-soon-tint")}>
      <div className="flex min-w-[260px] flex-1 flex-col gap-1.5">
        <p className="text-[0.9375rem] font-semibold">{title}</p>
        <div className="text-sm leading-normal">{children}</div>
        {due && <p className={cn("text-[0.8125rem] font-semibold", tone === "overdue" ? "text-overdue" : "text-soon")}>{due}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
