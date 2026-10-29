import { ContentLink as Link } from "@/components/app/content-link"
import { ClockIcon, FileTextIcon, SearchCheckIcon, TriangleAlertIcon, FilePenLineIcon } from "lucide-react"

import { Settings2Icon } from "lucide-react"
import CertificationSettingsPage from "@/pages/settings/certification"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetBody } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { useAgreementsStatus } from "@/pages/settings/legal"
import { clauseCoverage, visibleRecords, upcomingItems, dueOn } from "@/lib/record-figures"
import { daysBetween, formatDate, todayIso } from "@/lib/periods"
import * as React from "react"
import { ChartTip, TIP_FOCUS } from "@/components/app/chart-tip"
import { MilestoneStrip } from "@/components/app/milestones"
import { useStore } from "@/lib/store"
import { TASK_GROUPS, taskGroup, useMyTasks } from "@/lib/my-tasks"
import { DueBadge, TASK_ICON } from "@/pages/my-tasks"
import { RemarkRow } from "@/components/app/remarks"
import { EmptyLine, ScrollList } from "@/components/app/page"
import { kpiTone } from "@/data/records"
import { milestones, nextAudit, whenText } from "@/lib/certification"
import { cn } from "@/lib/utils"
import { fmtKpi, fmtTarget, onTarget } from "@/data/records"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FigureGrid, PageHeader } from "@/components/app/page"
import { allows, peopleAllowed, personAllowed } from "@/lib/permissions"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export default function Overview() {
  const { state: scoped, user, can, canSee, settings } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const { pending: agreementsPending } = useAgreementsStatus()
  const openRemarks = state.remarks.filter((r) => r.status === "Open" && can(r.area))
  const { tasks, overdue } = useMyTasks()
  const upcoming = upcomingItems(state, can, settings.legal)
  const hasConsultant = peopleAllowed(state.people, state.roles, "remarks.consultant").length > 0 || openRemarks.length > 0
  const { role, allowed } = useStore()
  // a role grant in Settings › Roles, not a fixed list of roles: top management sees what the administrator sees
  const seesReadiness = allowed("readiness.see")
  const reqs = state.requirements.filter((r) => r.status !== "Not applicable")
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
      {can("Settings", "Manage") && agreementsPending.length > 0 && (
        <Link to="/settings/legal" className="flex flex-wrap items-center gap-3 rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm hover:border-soon">
          <FilePenLineIcon className="size-[1.125rem] shrink-0 text-soon" />
          <span className="flex-1">
            <span className="font-semibold">Accept the {agreementsPending.map((d) => d.title).join(" and the ")}</span>
            <span className="text-muted-foreground"> for your company before go-live. Review them with your legal adviser first.</span>
          </span>
          <span className="font-medium text-primary">Review</span>
        </Link>
      )}

      {seesReadiness && <ReadinessHero coverage={coverage} showEvidence={can("Evidence")} />}

      <FigureGrid
        figures={[
          { value: overdue, label: "Overdue items", badge: overdue ? "Act now" : "None", tone: overdue ? "overdue" : "done", icon: ClockIcon, to: "/my-tasks" },
          ...(can("Corrective Action") ? [{ value: openNcs.length, label: "Open nonconformities", badge: `${major} major`, tone: "overdue" as const, icon: TriangleAlertIcon, to: "/corrective-action" }] : []),
          ...(can("Documents") ? [{ value: inReview, label: "Documents in review", badge: `${tasks.filter((t) => t.type === "doc").length} for you`, tone: "progress" as const, icon: FileTextIcon, to: "/documents/reviews" }] : []),
          ...(can("Audits") ? [{ value: upcoming.find(u => u.area === "Audits") ? formatDate(upcoming.find(u => u.area === "Audits")!.date) : "No data", label: "Next internal audit", badge: "Planned", tone: "draft" as const, icon: SearchCheckIcon, to: "/audits" }] : []),
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="My tasks"
          meta={tasks.length ? TASK_GROUPS.map((g) => `${tasks.filter((t) => taskGroup(t) === g.id).length} ${g.label.toLowerCase()}`).join(" · ") : undefined}
          note={tasks.length ? `${tasks.length} waiting on you, overdue first` : undefined}
          link={<Link to="/my-tasks" className="font-medium text-primary">{tasks.length ? `See all ${tasks.length}` : "Open My tasks"}</Link>}
          empty={tasks.length === 0 && <EmptyLine title="You’re all caught up" body="Nothing is waiting on you. Approvals, actions, reviews and questionnaires show here when it’s your turn." />}
        >
          {tasks.map((t, i) => {
            const Icon = TASK_ICON[t.type]
            return (
              <li key={t.id} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={t.to} className="flex items-center gap-3 px-5 py-3.5 hover:bg-hover">
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{t.title}</span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">
                      {t.kind} · {t.ref} · your step: {t.step}
                    </span>
                  </span>
                  <DueBadge task={t} />
                </Link>
              </li>
            )
          })}
        </Panel>
        <Panel
          title="Coming up"
          note={`${upcoming.length} item${upcoming.length === 1 ? "" : "s"} · next 30 days`}
          link={can("Audits") ? <Link to="/audits" className="font-medium text-primary">Audit programme</Link> : undefined}
          empty={upcoming.length === 0 && <EmptyLine title="Nothing coming up" body="Audits, reviews and due dates in the next 30 days show here." />}
        >
          {upcoming.map((u, i) => (
            <li key={u.title} className={cn(i > 0 && "border-t border-rule-soft")}>
              <Link to={u.to} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
                <span className="flex w-11 flex-col items-center rounded-sm border py-1 leading-none">
                  <span className="text-base font-semibold">{u.day}</span>
                  <span className="text-[0.6875rem] text-muted-foreground">{u.mon}</span>
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium">{u.title}</span>
                  <span className="truncate text-[0.8125rem] text-muted-foreground">{u.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </Panel>
        {hasConsultant && (
          <Panel
            title="Consultant remarks"
            badge={openRemarks.length > 0 && <Badge tone="soon">{openRemarks.length} open</Badge>}
            note={openRemarks.length ? `${openRemarks.length} open, newest first` : undefined}
            link={<Link to="/remarks" className="font-medium text-primary">Open remarks inbox</Link>}
            empty={openRemarks.length === 0 && <EmptyLine title="No open remarks" body="When your consultant leaves a remark on a record, it shows here." />}
          >
            {openRemarks.map((r, i) => <li key={r.id}><RemarkRow r={r} first={i === 0} /></li>)}
          </Panel>
        )}
        {can("Objectives & KPIs") && (
          <Panel
            title="Key results"
            note={state.objectives.length ? `${state.objectives.filter((o) => kpiTone(o) === "text-overdue").length} of ${state.objectives.length} below target` : undefined}
            link={<Link to="/qms/objectives" className="font-medium text-primary">All objectives</Link>}
            empty={state.objectives.length === 0 && <EmptyLine title="No objectives yet" body="Set quality objectives to see their latest results here." />}
          >
            {[...state.objectives].sort((a, b) => Number(kpiTone(b) === "text-overdue") - Number(kpiTone(a) === "text-overdue")).map((o, i) => (
              <li key={o.id} className={cn("flex items-center justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                <span className="min-w-0 text-sm leading-snug">{o.name}</span>
                <span className="flex items-baseline gap-2 whitespace-nowrap">
                  <span className={cn("text-[0.9375rem] font-semibold", kpiTone(o))}>{fmtKpi(o)}</span>
                  <span className="text-xs text-muted-foreground">target {fmtTarget(o)}</span>
                </span>
              </li>
            ))}
          </Panel>
        )}
      </div>

      {!seesReadiness && can("Evidence") && <EvidenceByClause coverage={coverage} />}
      {can("Corrective Action") && openNcs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Where open nonconformities came from</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {sources.map((s) => (
              <div key={s.name} className="grid grid-cols-[9.5rem_minmax(0,1fr)_20px] items-center gap-3 text-sm">
                <span className="truncate">{s.name}</span>
                <span className="h-2 rounded-full bg-background">
                  <span className="block h-2 rounded-full bg-foreground" style={{ width: `${(s.n / maxSource) * 100}%` }} />
                </span>
                <span className="text-right font-semibold">{s.n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  )
}

/** A card of fixed height whose list scrolls inside it, with a footer that stays at the bottom. */
function Panel({ title, meta, badge, note, link, empty, children }: { title: string; meta?: string; badge?: React.ReactNode; note?: string; link?: React.ReactNode; empty?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="flex h-[27.5rem] flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {badge || (meta && <span className="text-[0.8125rem] text-muted-foreground">{meta}</span>)}
      </CardHeader>
      {empty || (
        <ul aria-label={title} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </ul>
      )}
      {(note || link) && (
        <div className="mt-auto flex items-center justify-between gap-3 border-t px-5 py-2.5 text-[0.8125rem] text-muted-foreground">
          <span>{note}</span>
          {link}
        </div>
      )}
    </Card>
  )
}

type Coverage = ReturnType<typeof clauseCoverage>

/** One clause's bar: current, partial and missing parts, each with its value on hover, focus or tap. */
function ClauseBar({ c, i, className }: { c: Coverage["groups"][number]; i: number; className: string }) {
  const parts = [
    { key: "ok", label: "Current evidence", pct: c.ok, cls: "bg-done" },
    { key: "part", label: "Partial or out of date", pct: c.part, cls: "bg-soon-bar" },
    { key: "gap", label: "Missing", pct: c.gap, cls: "bg-overdue" },
  ]
  return (
    <span className={cn("flex rounded-full bg-border", className)} role="group" aria-label={`${c.name}: ${c.ok}% current, ${c.part}% partial, ${c.gap}% missing`}>
      <span className="grow-x-stagger flex w-full overflow-hidden rounded-full" style={{ "--i": i } as React.CSSProperties}>
        {parts.map((p) =>
          p.pct > 0 ? (
            <ChartTip key={p.key} label={`Clause ${c.no}, ${p.label.toLowerCase()}: ${p.pct}%`} tip={<><span className="font-semibold">Clause {c.no} · {p.label}</span><br />{p.pct}% of its requirements · {c.frac.replace("/", " of ")} current</>}>
              <span className={cn(p.cls, TIP_FOCUS)} style={{ width: `${p.pct}%` }} />
            </ChartTip>
          ) : null
        )}
      </span>
    </span>
  )
}

function EvidenceByClause({ coverage, bare }: { coverage: Coverage; bare?: boolean }) {
  const grid = (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
      {coverage.groups.map((c, i) => (
        <div key={c.no} className="flex flex-col gap-1.5 rounded-md border p-2.5">
          <span className="truncate text-xs text-muted-foreground">
            {c.no} {c.name}
          </span>
          <ClauseBar c={c} i={i} className="h-1.5" />
          <span className="text-[0.8125rem] font-semibold">{c.frac.replace("/", " of ")}</span>
        </div>
      ))}
    </div>
  )
  // inside the readiness card: one row per clause, full names, spread to fill the height beside Audit dates
  if (bare)
    return (
      <ul className="flex flex-1 flex-col justify-between gap-2">
        {coverage.groups.map((c, i) => (
          <li key={c.no} className="rise-in grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem] items-center gap-4 text-sm" style={{ "--i": i } as React.CSSProperties}>
            <span className="truncate">
              <span className="text-muted-foreground">{c.no}</span> {c.name}
            </span>
            <ClauseBar c={c} i={i} className="h-2" />
            <span className="text-right text-[0.8125rem] font-semibold">{c.frac.replace("/", " of ")}</span>
          </li>
        ))}
        <li aria-hidden="true" className="grid grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.5rem] gap-4 text-[0.6875rem] text-muted-foreground">
          <span />
          <span className="flex justify-between border-t border-border pt-1"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></span>
          <span />
        </li>
      </ul>
    )
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidence by ISO 9001 clause</CardTitle>
        <Link to="/evidence" className="text-[0.8125rem] font-medium text-primary">Open evidence</Link>
      </CardHeader>
      <CardContent>{grid}</CardContent>
    </Card>
  )
}

/** The highlight of the Overview: how ready the QMS is for the certification audit. */
function ReadinessHero({ coverage, showEvidence }: { coverage: Coverage; showEvidence: boolean }) {
  const { state, can } = useStore()
  const [certSettingsOpen, setCertSettingsOpen] = React.useState(false)
  const today = todayIso()
  const reqs = state.requirements.filter((r) => r.status !== "Not applicable")
  const late = (r: (typeof reqs)[number]) => r.status !== "Done" && !!dueOn(r.due) && dueOn(r.due)! < today
  const done = reqs.filter((r) => r.status === "Done").length
  const overdue = reqs.filter(late).length
  const pct = (n: number) => (reqs.length ? Math.round((n / reqs.length) * 100) : 0)
  const cert = useStore().settings.certification
  const body = cert.body.trim()
  const upcoming = nextAudit(cert)
  const next = reqs
    .filter((r) => r.status !== "Done")
    .sort((a, b) => Number(late(b)) - Number(late(a)) || (dueOn(a.due) ?? "9999").localeCompare(dueOn(b.due) ?? "9999"))
    .slice(0, 3)
  // today, then the cycle's dates (mock audit, stages or surveillance or recertification, expiry)
  const dates = [
    { key: "today", label: "Today", date: today as string | undefined, sub: undefined as string | undefined, dot: "bg-primary", soon: false },
    ...milestones(cert).map((m) => ({
      key: m.key,
      label: m.key === upcoming?.key && body ? `${m.label} · ${body}` : m.label,
      date: m.date as string | undefined,
      sub: whenText(m.date),
      dot: m.key === upcoming?.key ? "border-2 border-soon-bar bg-card" : m.date < today ? "bg-done" : "border-2 border-input bg-card",
      soon: m.key === upcoming?.key,
    })),
  ]
  return (
    <>
    <Sheet open={certSettingsOpen} onOpenChange={setCertSettingsOpen}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader><SheetTitle>Certification settings</SheetTitle></SheetHeader>
        <SheetBody><CertificationSettingsPage embedded onSaved={() => setCertSettingsOpen(false)} /></SheetBody>
      </SheetContent>
    </Sheet>
    <Card aria-labelledby="readiness-title" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="readiness-title" className="text-lg font-semibold">Certification readiness</h2>
          {upcoming && <Badge tone="soon">{upcoming.days === 0 ? `${upcoming.short} today` : `${upcoming.short} in ${upcoming.days} days`}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {(can("QMS", "Manage") || can("Settings", "Manage")) && <Button variant="ghost" size="icon" onClick={() => setCertSettingsOpen(true)} aria-label="Certification settings" title="Certification settings"><Settings2Icon /></Button>}
          <Link to="/readiness" className="text-sm font-medium text-primary">Open certification readiness</Link>
        </div>
      </div>
      <div className="flex flex-wrap">
        <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-6 p-6">
          <div className="flex flex-col gap-4">
            <ReadinessGauge reqs={reqs} late={late} pct={pct(done)} behind={overdue > 0 || pct(done) < 50} body={body} />
            <p className="text-sm text-muted-foreground">
              {reqs.length === 0 ? "Your consultant hasn’t listed any requirements yet." : done === reqs.length ? "Every requirement is done." : `Complete the outstanding items before the ${upcoming ? upcoming.label.replace(/ \(.*\)$/, "").replace(/^Mock audit$/, "mock audit") : "next audit"}.${overdue ? ` The overdue ${overdue === 1 ? "one comes" : "ones come"} first.` : ""}`}
            </p>
          </div>
          {showEvidence && (
            <details className="group flex flex-col gap-3" open>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                Evidence by ISO 9001 clause
                <span aria-hidden="true" className="text-xs text-muted-foreground group-open:rotate-180">⌄</span>
              </summary>
              <div className="pt-3"><EvidenceByClause coverage={coverage} bare /></div>
            </details>
          )}
          <div className="mt-auto"><MilestoneStrip /></div>
        </div>
        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-6 border-l bg-background/50 p-6 max-[54rem]:border-l-0 max-[54rem]:border-t">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Audit dates</h3>
            <ol className="flex flex-col">
              {dates.map((d, i) => (
                <li key={d.key} className={cn("relative ml-[5px] flex flex-col pl-4", i < dates.length - 1 && "border-l-2 pb-3.5")}>
                  <span className={cn("absolute -left-[7px] top-[3px] size-3 rounded-full", i === dates.length - 1 && "-left-[5px]", d.dot)} aria-hidden="true" />
                  <span className="text-[0.8125rem] text-muted-foreground">{d.label}</span>
                  <span className="text-[0.9375rem] font-semibold">{d.date ? formatDate(d.date) : "Not booked"}</span>
                  {d.sub && <span className={cn("text-[0.8125rem]", d.soon ? "text-soon" : "text-muted-foreground")}>{d.sub}</span>}
                </li>
              ))}
            </ol>
          </div>
          {next.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-sm font-semibold">Do these next</h3>
              <ul className="flex flex-col gap-2">
                {next.map((r) => (
                  <li key={r.id} className="flex flex-col gap-1 rounded-md border bg-card px-3 py-2.5">
                    <Link to={`/readiness?item=${r.id}`} className="text-sm font-medium hover:text-primary hover:underline">{r.title}</Link>
                    <span className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span>Clause {r.clause} · {r.owner}</span>
                      <span className={cn(late(r) && "font-semibold text-overdue")}>{late(r) ? "Overdue" : r.due ? `Due ${r.due}` : "No date"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Card>
    </>
  )
}

const GAUGE_ARC = "M 22 100 A 78 78 0 0 1 178 100"
const HATCH = "repeating-linear-gradient(135deg, var(--card) 0 3px, var(--muted-foreground) 3px 4px)"

/** A semicircle split by requirement status: done, ready to confirm, in progress, overdue, then to do (hatched). */
function ReadinessGauge<R extends { status: string }>({ reqs, late, pct, behind, body }: { reqs: R[]; late: (r: R) => boolean; pct: number; behind: boolean; body: string }) {
  const n = (f: (r: R) => boolean) => reqs.filter(f).length
  const overdue = n(late)
  const segs = [
    { label: "Done", n: n((r) => r.status === "Done"), color: "var(--color-done)" },
    { label: "Ready to confirm", n: n((r) => r.status === "Ready to confirm" && !late(r)), color: "color-mix(in oklab, var(--color-done) 65%, var(--card))" },
    { label: "In progress", n: n((r) => r.status === "In progress" && !late(r)), color: "color-mix(in oklab, var(--color-done) 35%, var(--card))" },
    { label: "Overdue", n: overdue, color: "var(--color-soon-bar)" },
    { label: "To do", n: n((r) => r.status === "To do" && !late(r)), color: "url(#readiness-hatch)" },
  ]
  const total = reqs.length || 1
  const shown = useCountUp(pct)
  let at = 0
  const legend = [
    ...segs.slice(0, 3),
    { ...segs[4], n: segs[4].n + n((r) => r.status === "To do" && late(r)), label: "To do" },
    { ...segs[3], label: "Overdue, part of to do" },
  ]
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
      <figure className="m-0 flex flex-col items-center gap-1.5">
        <div className="relative h-[157px] w-[280px]">
          <svg width="280" height="157" viewBox="0 0 200 112" role="group" aria-label={`${pct}% of requirements done: ${segs.map((s) => `${s.n} ${s.label.toLowerCase()}`).join(", ")}`}>
            <defs>
              <pattern id="readiness-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="5" height="5" fill="var(--card)" />
                <rect width="1.2" height="5" fill="var(--muted-foreground)" opacity="0.5" />
              </pattern>
              <mask id="readiness-sweep" maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="112">
                <path className="sweep" d={GAUGE_ARC} fill="none" stroke="#fff" strokeWidth="22" pathLength={100} />
              </mask>
            </defs>
            <g mask="url(#readiness-sweep)">
            {reqs.length === 0 && <path d={GAUGE_ARC} fill="none" stroke="var(--border)" strokeWidth="18" />}
            {segs.map((s) => {
              const len = (s.n / total) * 100
              const start = at
              at += len
              if (s.n <= 0) return null
              const pt = (f: number) => [100 + 78 * Math.cos(Math.PI * (1 - f / 100)), 100 - 78 * Math.sin(Math.PI * (1 - f / 100))].map((v) => v.toFixed(2)).join(" ")
              const a = start + Math.min(0.6, len / 4)
              const b = start + len - Math.min(0.6, len / 4)
              const pc = Math.round((s.n / total) * 100)
              return (
                <ChartTip key={s.label} label={`${s.label}: ${s.n} of ${reqs.length} requirements, ${pc}%`} tip={<><span className="font-semibold">{s.label}</span><br />{s.n} of {reqs.length} requirements ({pc}%)</>}>
                  <path d={`M ${pt(a)} A 78 78 0 0 1 ${pt(b)}`} fill="none" stroke={s.color} strokeWidth="18" className="cursor-default outline-none focus-visible:stroke-[22px]" />
                </ChartTip>
              )
            })}
            </g>
          </svg>
          <span className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center gap-0.5">
            <span className="text-[2.75rem] font-medium leading-none tabular-nums">{shown}%</span>
            {reqs.length > 0 && <span className={cn("text-sm font-semibold", behind ? "text-soon" : "text-done")}>{pct === 100 ? "Ready" : behind ? "Behind" : "On track"}</span>}
          </span>
        </div>
        <figcaption className="text-[0.8125rem] text-muted-foreground">
          {segs[0].n} of {reqs.length} requirements done{body ? ` for ${body}` : ""}
        </figcaption>
      </figure>
      <ul className="m-0 grid min-w-0 flex-[1_1_16rem] list-none grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-x-5 gap-y-2.5 p-0">
        {legend.map((s, i) => (
          <li key={s.label} style={{ "--i": i } as React.CSSProperties} className="rise-in flex items-center gap-2 text-[0.8125rem] text-muted-foreground">
            <span className="size-3 shrink-0 rounded-[3px] border border-transparent" style={s.color.startsWith("url") ? { background: HATCH, borderColor: "var(--border)", opacity: 0.8 } : { background: s.color }} aria-hidden="true" />
            <span className="flex-1">{s.label}</span>
            <span className="font-medium text-foreground">{s.n}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Counts from 0 up to the value on first show, eased; shows the value at once when motion is reduced. */
function useCountUp(value: number, ms = 1100) {
  const [n, setN] = React.useState(() => (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? value : 0))
  React.useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setN(value)
    let raf = 0
    const t0 = performance.now() + 150
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / ms))
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return n
}
