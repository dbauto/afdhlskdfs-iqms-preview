import { ContentLink as Link } from "@/components/app/content-link"
import { ClockIcon, FileTextIcon, SearchCheckIcon, TriangleAlertIcon, FilePenLineIcon } from "lucide-react"

import { useAgreementsStatus } from "@/pages/settings/legal"
import { clauseCoverage, visibleRecords, upcomingItems, dueOn } from "@/lib/record-figures"
import { daysBetween, formatDate, todayIso } from "@/lib/periods"
import * as React from "react"
import { useStore } from "@/lib/store"
import { TASK_GROUPS, taskGroup, useMyTasks } from "@/lib/my-tasks"
import { DueBadge, TASK_ICON } from "@/pages/my-tasks"
import { RemarkRow } from "@/components/app/remarks"
import { EmptyLine, ScrollList } from "@/components/app/page"
import { CERTIFICATION, kpiTone } from "@/data/records"
import { cn } from "@/lib/utils"
import { fmtKpi, fmtTarget, onTarget } from "@/data/records"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FigureGrid, PageHeader } from "@/components/app/page"

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
}

export default function Overview() {
  const { state: scoped, user, can, canSee } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const { pending: agreementsPending } = useAgreementsStatus()
  const openRemarks = state.remarks.filter((r) => r.status === "Open" && can(r.area))
  const { tasks, overdue } = useMyTasks()
  const upcoming = upcomingItems(state, can)
  const hasConsultant = state.people.some((p) => p.roleId === "consultant" && p.status !== "Deactivated") || openRemarks.length > 0
  const { role } = useStore()
  const seesReadiness = ["consultant", "quality", "admin"].includes(role.id)
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

function EvidenceByClause({ coverage, bare }: { coverage: Coverage; bare?: boolean }) {
  const grid = (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2">
      {coverage.groups.map((c) => (
        <div key={c.no} className="flex flex-col gap-1.5 rounded-md border p-2.5">
          <span className="truncate text-xs text-muted-foreground">
            {c.no} {c.name}
          </span>
          <span className="flex h-1.5 overflow-hidden rounded-full bg-border" role="img" aria-label={`${c.name}: ${c.ok}% current, ${c.part}% partial, ${c.gap}% missing`}>
            <span className="bg-done" style={{ width: `${c.ok}%` }} />
            <span className="bg-soon-bar" style={{ width: `${c.part}%` }} />
            <span className="bg-overdue" style={{ width: `${c.gap}%` }} />
          </span>
          <span className="text-[0.8125rem] font-semibold">{c.frac.replace("/", " of ")}</span>
        </div>
      ))}
    </div>
  )
  if (bare) return grid
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
  const { state } = useStore()
  const today = todayIso()
  const reqs = state.requirements.filter((r) => r.status !== "Not applicable")
  const late = (r: (typeof reqs)[number]) => r.status !== "Done" && !!dueOn(r.due) && dueOn(r.due)! < today
  const done = reqs.filter((r) => r.status === "Done").length
  const overdue = reqs.filter(late).length
  const attention = reqs.length - done - overdue
  const pct = (n: number) => (reqs.length ? Math.round((n / reqs.length) * 100) : 0)
  const s1 = dueOn(CERTIFICATION.stage1)
  const s2 = dueOn(CERTIFICATION.stage2)
  const days = (d?: string) => (d ? daysBetween(today, d) : undefined)
  const next = reqs
    .filter((r) => r.status !== "Done")
    .sort((a, b) => Number(late(b)) - Number(late(a)) || (dueOn(a.due) ?? "9999").localeCompare(dueOn(b.due) ?? "9999"))
    .slice(0, 3)
  const tiles = [
    { n: done, label: "Done", cls: "bg-done-tint text-done" },
    { n: attention, label: "Need attention", cls: "bg-soon-tint text-soon" },
    { n: overdue, label: "Overdue", cls: "bg-overdue-tint text-overdue" },
  ]
  const dates = [
    { label: "Today", date: today, sub: undefined as string | undefined, dot: "bg-primary" },
    { label: `Stage 1 audit · ${CERTIFICATION.body}`, date: s1, sub: s1 ? `In ${days(s1)} days` : undefined, dot: "border-2 border-soon-bar bg-card" },
    { label: "Stage 2 audit", date: s2, sub: s2 ? `In ${days(s2)} days` : undefined, dot: "border-2 border-input bg-card" },
  ]
  return (
    <Card aria-labelledby="readiness-title" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="readiness-title" className="text-lg font-semibold">Certification readiness</h2>
          {s1 && <Badge tone="soon">Stage 1 in {days(s1)} days</Badge>}
        </div>
        <Link to="/readiness" className="text-sm font-medium text-primary">Open certification readiness</Link>
      </div>
      <div className="flex flex-wrap">
        <div className="flex min-w-0 flex-[999_1_34rem] flex-col gap-6 p-6">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <span className="text-[3.5rem] font-bold leading-none tracking-tight">{pct(done)}%</span>
            <span className="flex flex-col gap-0.5 pb-1">
              <span className="text-[0.9375rem] font-semibold">of requirements done</span>
              <span className="text-[0.8125rem] text-muted-foreground">{done} of {reqs.length} for {CERTIFICATION.body}</span>
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            <div role="img" aria-label={`${done} done, ${attention} need attention, ${overdue} overdue, of ${reqs.length} requirements`} className="flex h-3.5 gap-[3px] overflow-hidden rounded-[4px]">
              {done > 0 && <span className="bg-done" style={{ flex: done }} />}
              {attention > 0 && <span className="bg-soon-bar" style={{ flex: attention }} />}
              {overdue > 0 && <span className="bg-overdue" style={{ flex: overdue }} />}
              {reqs.length === 0 && <span className="flex-1 bg-border" />}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {tiles.map((t) => (
                <div key={t.label} className={cn("flex flex-col gap-0.5 rounded-md px-3 py-2.5", t.cls)}>
                  <span className="text-[1.375rem] font-bold">{t.n}</span>
                  <span className="text-[0.8125rem]">{t.label} · {pct(t.n)}%</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {reqs.length === 0 ? "Your consultant hasn’t listed any requirements yet." : done === reqs.length ? "Every requirement is done." : `Complete the outstanding items before the Stage 1 audit.${overdue ? ` The overdue ${overdue === 1 ? "one comes" : "ones come"} first.` : ""}`}
            </p>
          </div>
          {showEvidence && (
            <div className="flex flex-col gap-2.5">
              <h3 className="text-sm font-semibold">Evidence by ISO 9001 clause</h3>
              <EvidenceByClause coverage={coverage} bare />
            </div>
          )}
        </div>
        <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-6 border-l bg-background/50 p-6 max-[54rem]:border-l-0 max-[54rem]:border-t">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Audit dates</h3>
            <ol className="flex flex-col">
              {dates.map((d, i) => (
                <li key={d.label} className={cn("relative ml-[5px] flex flex-col pl-4", i < dates.length - 1 && "border-l-2 pb-3.5")}>
                  <span className={cn("absolute -left-[7px] top-[3px] size-3 rounded-full", i === dates.length - 1 && "-left-[5px]", d.dot)} aria-hidden="true" />
                  <span className="text-[0.8125rem] text-muted-foreground">{d.label}</span>
                  <span className="text-[0.9375rem] font-semibold">{d.date ? formatDate(d.date) : "Not booked"}</span>
                  {d.sub && <span className={cn("text-[0.8125rem]", i === 1 ? "text-soon" : "text-muted-foreground")}>{d.sub}</span>}
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
  )
}
