import { Link } from "react-router-dom"
import { ClockIcon, FileTextIcon, SearchCheckIcon, TriangleAlertIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { EVIDENCE_GROUPS, fmtKpi, fmtTarget, onTarget } from "@/data/records"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FigureGrid, PageHeader } from "@/components/app/page"

const ATTENTION: { state: string; tone: BadgeTone; id: string; kind: string; process: string; title: string; due: string; late?: boolean; to: string }[] = [
  { state: "Overdue", tone: "overdue", id: "NC-2026-007", kind: "Nonconformity", process: "Purchasing & suppliers", title: "Approved supplier list not re-evaluated for 2026", due: "9 days late", late: true, to: "/corrective-action/NC-2026-007" },
  { state: "Overdue", tone: "overdue", id: "PUR-PRO-002", kind: "Document review", process: "Purchasing & suppliers", title: "Supplier selection and evaluation, periodic review", due: "4 days late", late: true, to: "/documents/PUR-PRO-002" },
  { state: "Your approval", tone: "soon", id: "OPS-WI-014", kind: "Document revision", process: "Operations", title: "Line clearance work instruction, rev 03", due: "Due 15 Oct", to: "/documents/OPS-WI-014" },
  { state: "Your verification", tone: "soon", id: "NC-2026-005", kind: "Nonconformity", process: "Infrastructure & equipment", title: "Torque wrenches used past their calibration date", due: "Due 17 Oct", to: "/corrective-action/NC-2026-005" },
  { state: "In progress", tone: "progress", id: "R-031", kind: "Risk treatment", process: "Purchasing & suppliers", title: "Single source for packaging material", due: "Due 31 Oct", to: "/risks" },
  { state: "Your review", tone: "progress", id: "MR-2026-02", kind: "Management review", process: "Leadership & planning", title: "Prepare inputs for the November review", due: "Due 28 Oct", to: "/management-review" },
]

const UPCOMING = [
  { day: "21", mon: "Oct", title: "Internal audit, Operations", meta: "IA-2026-05, lead Daniel Reyes", to: "/audits/IA-2026-05" },
  { day: "28", mon: "Oct", title: "KPI results due", meta: "7 objectives, Q3 figures", to: "/qms/objectives" },
  { day: "04", mon: "Nov", title: "Management review", meta: "MR-2026-02, chaired by Eric Navarro", to: "/management-review" },
  { day: "15", mon: "Nov", title: "5 documents due for review", meta: "Operations and Purchasing", to: "/documents/reviews" },
]

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export default function Overview() {
  const { state, user } = useStore()
  const openNcs = state.ncs.filter((n) => n.stage < 6)
  const major = openNcs.filter((n) => n.severity === "Major").length
  const inReview = state.documents.filter((d) => ["Technical review", "Approval", "Ready to publish", "Changes requested"].includes(d.stage)).length
  const sources = ["Internal audit", "Customer complaint", "Supplier", "Process check"].map((s) => ({
    name: s,
    n: openNcs.filter((n) => (s === "Internal audit" ? n.source.startsWith("Audit") : n.source === s)).length,
  }))
  const maxSource = Math.max(1, ...sources.map((s) => s.n))

  return (
    <>
      <PageHeader title={`${greeting()}, ${user.name.split(" ")[0]}`} description="What needs you today, and how the QMS is doing against ISO 9001." />

      <FigureGrid
        figures={[
          { value: 7, label: "Overdue items", badge: "Act now", tone: "overdue", icon: ClockIcon },
          { value: openNcs.length, label: "Open nonconformities", badge: `${major} major`, tone: "overdue", icon: TriangleAlertIcon, to: "/corrective-action" },
          { value: inReview, label: "Documents in review", badge: "3 for you", tone: "progress", icon: FileTextIcon, to: "/documents/reviews" },
          { value: "21 Oct", label: "Next internal audit", badge: "In 8 days", tone: "draft", icon: SearchCheckIcon, to: "/audits" },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <span className="text-[13px] text-muted-foreground">Overdue first</span>
          </CardHeader>
          <ul>
            {ATTENTION.map((a, i) => (
              <li key={a.id} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={a.to} className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 hover:bg-[#fafafb] max-sm:grid-cols-1 max-sm:gap-2">
                  <Badge tone={a.tone} className="justify-self-start">
                    {a.state}
                  </Badge>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{a.title}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {a.id}, {a.kind.toLowerCase()}, {a.process}
                    </span>
                  </span>
                  <span className={cn("text-[13px] whitespace-nowrap", a.late ? "font-semibold text-overdue" : "text-muted-foreground")}>{a.due}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Coming up</CardTitle>
          </CardHeader>
          <ul>
            {UPCOMING.map((u, i) => (
              <li key={u.title} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={u.to} className="flex items-center gap-4 px-5 py-3 hover:bg-[#fafafb]">
                  <span className="flex w-11 flex-col items-center rounded-sm border py-1 leading-none">
                    <span className="text-base font-semibold">{u.day}</span>
                    <span className="text-[11px] text-muted-foreground">{u.mon}</span>
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{u.title}</span>
                    <span className="truncate text-[13px] text-muted-foreground">{u.meta}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evidence by ISO 9001 clause</CardTitle>
            <Link to="/evidence" className="text-[13px] font-medium text-primary">
              Open evidence
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {EVIDENCE_GROUPS.map((c) => (
              <div key={c.no} className="grid grid-cols-[28px_minmax(0,200px)_minmax(0,1fr)_40px] items-center gap-3 text-sm max-sm:grid-cols-[28px_minmax(0,1fr)_40px]">
                <span className="font-semibold">{c.no}</span>
                <span className="truncate max-sm:hidden">{c.name}</span>
                <span className="flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${c.name}: ${c.ok}% current, ${c.part}% partial, ${c.gap}% missing`}>
                  <span className="bg-done" style={{ width: `${c.ok}%` }} />
                  <span className="bg-[#d99a2b]" style={{ width: `${c.part}%` }} />
                  <span className="bg-overdue" style={{ width: `${c.gap}%` }} />
                </span>
                <span className="text-right text-[13px] text-muted-foreground">{c.frac}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-done" />Evidence current</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d99a2b]" />Partial or old</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-overdue" />No evidence</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Key results</CardTitle>
              <Link to="/qms/objectives" className="text-[13px] font-medium text-primary">
                All objectives
              </Link>
            </CardHeader>
            <ul>
              {state.objectives.slice(0, 4).map((o, i) => (
                <li key={o.id} className={cn("flex items-baseline justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <span className="min-w-0 truncate text-sm">{o.name}</span>
                  <span className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className={cn("text-[15px] font-semibold", onTarget(o) ? "text-done" : "text-overdue")}>{fmtKpi(o)}</span>
                    <span className="text-xs text-muted-foreground">target {fmtTarget(o)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Where open nonconformities came from</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {sources.map((s) => (
                <div key={s.name} className="grid grid-cols-[130px_minmax(0,1fr)_20px] items-center gap-3 text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="h-2 rounded-full bg-background">
                    <span className="block h-2 rounded-full bg-foreground" style={{ width: `${(s.n / maxSource) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold">{s.n}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
