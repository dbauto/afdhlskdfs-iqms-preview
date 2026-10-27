import { Link } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { TENANTS } from "@/data/admin"
import { KPIS, MONTHS, OVERDUE_INVOICE, PERFORMANCE, PERFORMANCE_TARGET_MS, REQUIRED_REPORTS, loadFor, type Kpi } from "@/data/platform"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PlatformHeader } from "./shell"

const TONE_TEXT: Record<Kpi["tone"], string> = { done: "text-done", soon: "text-soon", overdue: "text-overdue", draft: "text-draft" }

function Spark({ values, tone }: { values: number[]; tone: Kpi["tone"] }) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 80 + 2},${26 - ((v - min) / (max - min || 1)) * 22}`).join(" ")
  return (
    <svg width="84" height="28" viewBox="0 0 84 28" aria-hidden="true" className={cn("shrink-0", TONE_TEXT[tone])}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function KpiCard({ k }: { k: Kpi }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-lg border bg-card px-5 py-4">
      <span className="flex flex-col">
        <span className="text-[0.9375rem] font-semibold">{k.title}</span>
        <span className="text-xs text-muted-foreground">{k.sub}</span>
      </span>
      <span className="text-[1.75rem] font-semibold tracking-[-0.02em]">{k.value}</span>
      <span className="flex items-end justify-between gap-2">
        <span className="flex min-w-0 flex-col items-start gap-1">
          <Badge tone={k.tone}>{k.delta}</Badge>
          <span className="text-[0.8125rem] text-muted-foreground">{k.note}</span>
        </span>
        <Spark values={k.trend} tone={k.tone} />
      </span>
    </div>
  )
}

function Legend({ items }: { items: { label: string; className: string; line?: boolean }[] }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={cn(i.line ? "h-0.5 w-3" : "size-2.5 rounded-full", i.className)} />
          {i.label}
        </span>
      ))}
    </span>
  )
}

function RevenueChart() {
  const max = Math.max(...MONTHS.map((m) => m.revenue))
  return (
    <Card>
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Revenue and costs</CardTitle>
          <span className="text-xs text-muted-foreground">Invoiced vs hosting, AI and email costs, ₱ thousands</span>
        </span>
        <Legend items={[{ label: "Revenue", className: "bg-primary" }, { label: "Costs", className: "bg-info-border" }]} />
      </CardHeader>
      <div className="flex flex-col gap-2 px-5 pb-4 pt-2">
        <div className="flex h-48 items-end gap-3 border-b px-1" role="img" aria-label={MONTHS.map((m) => `${m.label}: revenue ₱${m.revenue}K, costs ₱${m.costs}K`).join("; ")}>
          {MONTHS.map((m) => (
            <div key={m.label} className="flex h-full flex-1 items-end justify-center gap-1">
              <div className="w-1/3 max-w-6 rounded-t-[3px] bg-primary" style={{ height: `${(m.revenue / max) * 100}%` }} title={`₱${m.revenue}K`} />
              <div className="w-1/3 max-w-6 rounded-t-[3px] bg-info-border" style={{ height: `${(m.costs / max) * 100}%` }} title={`₱${m.costs}K`} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-1 text-xs text-muted-foreground">
          {MONTHS.map((m) => (
            <span key={m.label} className="flex-1 text-center">
              {m.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}

function PerformanceChart() {
  const W = 520
  const H = 180
  const yMs = (v: number) => H - (v / 1100) * H
  const yFail = (v: number) => H - (v / 1) * H * 0.4
  const x = (i: number) => (i / (PERFORMANCE.length - 1)) * W
  const line = (f: (p: (typeof PERFORMANCE)[number]) => number) => PERFORMANCE.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${f(p).toFixed(1)}`).join(" ")
  const speed = line((p) => yMs(p.p95))
  const avg = Math.round(PERFORMANCE.reduce((s, p) => s + p.p95, 0) / PERFORMANCE.length)
  const failAvg = (PERFORMANCE.reduce((s, p) => s + p.failed, 0) / PERFORMANCE.length).toFixed(2)
  return (
    <Card>
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>System performance</CardTitle>
          <span className="text-xs text-muted-foreground">Slowest 5% of pages and failed requests, last 30 days</span>
        </span>
        <Badge tone="done">Within target</Badge>
      </CardHeader>
      <div className="flex flex-col gap-2 px-5 pb-4 pt-2">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-48 w-full" role="img" aria-label={`Slowest pages average ${avg} ms against a ${PERFORMANCE_TARGET_MS} ms target; failed requests average ${failAvg}%`}>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="stroke-rule-soft" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={yMs(PERFORMANCE_TARGET_MS)} y2={yMs(PERFORMANCE_TARGET_MS)} className="stroke-soon-bar" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={`${speed} L${W} ${H} L0 ${H} Z`} className="fill-progress-tint" />
          <path d={speed} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d={line((p) => yFail(p.failed))} fill="none" className="stroke-done" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>28 Sep</span>
          <span>5 Oct</span>
          <span>12 Oct</span>
          <span>19 Oct</span>
          <span>27 Oct</span>
        </div>
        <Legend items={[{ label: `Page speed, average ${avg} ms`, className: "bg-primary", line: true }, { label: `Failed requests, ${failAvg}%`, className: "bg-done", line: true }, { label: `Target ${PERFORMANCE_TARGET_MS.toLocaleString()} ms`, className: "bg-soon-bar", line: true }]} />
      </div>
    </Card>
  )
}

function ClientLoad() {
  const busy = TENANTS.filter((t) => loadFor(t) >= 80 && !OVERDUE_INVOICE.has(t.id)).length
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Client workspaces</CardTitle>
          <span className="text-xs text-muted-foreground">Database load per organisation this week</span>
        </span>
        <span className="flex flex-wrap gap-1.5">
          <Badge tone="draft">{TENANTS.length} workspaces</Badge>
          <Badge tone="soon">{busy} busy</Badge>
          <Badge tone="overdue">{OVERDUE_INVOICE.size} unpaid</Badge>
        </span>
      </CardHeader>
      <div className="flex flex-col gap-3 px-5 pb-4 pt-2">
        <div className="flex h-52 items-end gap-1.5 border-b">
          {TENANTS.map((t) => {
            const v = loadFor(t)
            const tone = OVERDUE_INVOICE.has(t.id) ? "bg-overdue" : v >= 80 ? "bg-soon-bar" : "bg-faint/50"
            return <div key={t.id} className={cn("min-w-0 flex-1 rounded-t-[3px]", tone)} style={{ height: `${v}%` }} title={`${t.name}: load ${v}%${OVERDUE_INVOICE.has(t.id) ? ", invoice overdue" : ""}`} />
          })}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{TENANTS[0].name}</span>
          <span>{TENANTS[TENANTS.length - 1].name}</span>
        </div>
        <Legend items={[{ label: "Normal", className: "rounded-[2px] bg-faint/50" }, { label: "Busy", className: "rounded-[2px] bg-soon-bar" }, { label: "Invoice overdue", className: "rounded-[2px] bg-overdue" }]} />
      </div>
    </Card>
  )
}

const REPORT_BAR = { progress: "bg-primary", soon: "bg-soon-bar", done: "bg-done", draft: "bg-faint" } as const

function RequiredReports() {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Required reports</CardTitle>
          <span className="text-xs text-muted-foreground">Philippine and contract obligations. Confirm dates with your lawyer and accountant.</span>
        </span>
        <Link to="/platform/government-reports" className="text-[0.8125rem] font-medium text-primary hover:underline">
          Open Government reports
        </Link>
      </CardHeader>
      <ul className="flex flex-col">
        {REQUIRED_REPORTS.map((r, i) => (
          <li key={r.name} className={cn("flex flex-col gap-1.5 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
            <span className="flex items-start justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", REPORT_BAR[r.tone])} />
                {r.name}
              </span>
              <span className="whitespace-nowrap text-[0.8125rem] font-semibold">{r.due}</span>
            </span>
            <span className="text-xs text-muted-foreground">{r.who}</span>
            <span className="h-1.5 rounded-full bg-secondary" role="progressbar" aria-label={`${r.name} progress`} aria-valuenow={r.progress} aria-valuemin={0} aria-valuemax={100}>
              <span className={cn("block h-1.5 rounded-full", REPORT_BAR[r.tone])} style={{ width: `${r.progress}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export default function PlatformOverview() {
  return (
    <>
      <PlatformHeader
        title="Overview"
        description="October 2026 so far, all organisations. Sample figures in the preview; production reads billing, provider usage and monitoring, never client records."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/platform/finance">See finance</Link>
            </Button>
            <Button variant="outline" onClick={() => toast("Monthly report created", { description: "Revenue, costs, uptime, incidents and SLA credits for October 2026." })}>
              Create monthly report
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard key={k.title} k={k} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RevenueChart />
        <PerformanceChart />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <ClientLoad />
        <RequiredReports />
      </div>
    </>
  )
}
