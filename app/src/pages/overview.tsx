import { auditForms, formKey } from "@/lib/audit-form-policy"
import { ContentLink as Link } from "@/components/app/content-link"
import { ClockIcon, FileTextIcon, SearchCheckIcon, TriangleAlertIcon, FilePenLineIcon } from "lucide-react"

import { useAgreementsStatus } from "@/pages/settings/legal"
import { latestChecklist, questionsOf } from "@/lib/audit-workflow"
import { latestAssessment } from "@/lib/audit-execution"
import { clauseCoverage, visibleRecords, attentionItems, upcomingItems, dueOn } from "@/lib/record-figures"
import { daysBetween, todayIso } from "@/lib/periods"
import { useStore } from "@/lib/store"
import { RemarkRow } from "@/components/app/remarks"
import { EmptyLine, ScrollList } from "@/components/app/page"
import { CERTIFICATION, kpiTone } from "@/data/records"
import type { Area } from "@/data/types"
import { cn } from "@/lib/utils"
import { fmtKpi, fmtTarget, onTarget } from "@/data/records"
import { Badge, type BadgeTone } from "@/components/ui/badge"
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
  const myAssessments = state.audits.flatMap((a) => {
    return auditForms(state, a.id, true).flatMap(c => questionsOf(c).map(q => ({ ...q, checklistId: c.id, formId: formKey(c) })))
      .filter(
        (q) =>
          q.type !== "Instruction" && (q.assessmentRequired !== false || q.respondBy === "Auditor" && q.required) && q.askedBy === user.name && latestAssessment(state, q.checklistId, q.id)?.status !== "Completed",
      )
      .map((q) => ({
        id: `${a.id}:${q.checklistId}:${q.id}`,
        title: q.text,
        kind: "Auditor assessment",
        process: a.process,
        due: a.date,
        late: false,
        state: "Assigned assessment",
        tone: "progress" as const,
        area: "Audits" as Area,
        to: `/audits/${a.id}/conduct?form=${q.formId}&question=${q.id}`,
      }))
  })
  const attention = [
    ...myAssessments,
    ...state.questionnaireAssignments
      .filter((a) => a.respondent === user.name && !["Submitted", "Resubmitted"].includes(a.status))
      .map((a) => ({
        id: a.id,
        title: "Answer your audit questionnaire",
        kind: "Audit questionnaire",
        process: state.audits.find((x) => x.id === a.auditId)?.process ?? "",
        due: `Due ${a.dueDate}`,
        late: a.dueDate < todayIso(),
        state: a.status,
        tone: "progress" as const,
        area: "Audits" as Area,
        to: `/audits/${a.auditId}/questionnaires/${a.id}`,
      })),
    ...attentionItems(state, user.name, can),
  ]
  const upcoming = upcomingItems(state, can)
  const hasConsultant = state.people.some((p) => p.roleId === "consultant" && p.status !== "Deactivated") || openRemarks.length > 0
  const { role } = useStore()
  const seesReadiness = ["consultant", "quality", "admin"].includes(role.id)
  const reqs = state.requirements.filter((r) => r.status !== "Not applicable")
  const myReqs = state.requirements.filter((r) => r.owner === user.name && (r.status === "To do" || r.status === "In progress"))
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

      <FigureGrid
        figures={[
          { value: attention.filter(a => a.late).length || "No data", label: "Overdue items", badge: "Act now", tone: "overdue", icon: ClockIcon },
          ...(can("Corrective Action") ? [{ value: openNcs.length, label: "Open nonconformities", badge: `${major} major`, tone: "overdue" as const, icon: TriangleAlertIcon, to: "/corrective-action" }] : []),
          ...(can("Documents") ? [{ value: inReview, label: "Documents in review", badge: `${attention.filter(a => a.kind === "Document").length} for you`, tone: "progress" as const, icon: FileTextIcon, to: "/documents/reviews" }] : []),
          ...(can("Audits") ? [{ value: upcoming.find(u => u.area === "Audits")?.date ?? "No data", label: "Next internal audit", badge: "Planned", tone: "draft" as const, icon: SearchCheckIcon, to: "/audits" }] : []),
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Overdue first</span>
          </CardHeader>
          <ScrollList label="Needs your attention" count={attention.length + myReqs.length} footer={myReqs.length > 0 && <Link to="/readiness" className="font-medium text-primary">Certification tasks</Link>}>
            {attention.map((a, i) => (
              <li key={a.id} className={cn(i > 0 && "border-t border-rule-soft")}>
                <Link to={a.to} className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 hover:bg-hover max-sm:grid-cols-1 max-sm:gap-2">
                  <Badge tone={a.tone} className="justify-self-start">
                    {a.state}
                  </Badge>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{a.title}</span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">
                      {a.id}, {a.kind.toLowerCase()}, {a.process}
                    </span>
                  </span>
                  <span className={cn("text-[0.8125rem] whitespace-nowrap", a.late ? "font-semibold text-overdue" : "text-muted-foreground")}>{a.due}</span>
                </Link>
              </li>
            ))}
            {myReqs.map((r) => (
              <li key={r.id} className="border-t border-rule-soft">
                <Link to="/readiness" className="grid grid-cols-[130px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-3.5 hover:bg-hover max-sm:grid-cols-1 max-sm:gap-2">
                  <Badge tone="soon" className="justify-self-start">
                    From consultant
                  </Badge>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">Clause {r.clause}, certification requirement</span>
                  </span>
                  <span className="whitespace-nowrap text-[0.8125rem] text-muted-foreground">{r.due ? `Due ${r.due}` : ""}</span>
                </Link>
              </li>
            ))}
          </ScrollList>
          {attention.length + myReqs.length === 0 && <EmptyLine title="You’re all caught up" body="Nothing is waiting on you. Overdue items, approvals and tasks show here." />}
        </Card>
          {hasConsultant && (
            <Card>
              <CardHeader>
                <CardTitle>Consultant remarks</CardTitle>
                {openRemarks.length > 0 && <Badge tone="soon">{openRemarks.length} open</Badge>}
              </CardHeader>
              {openRemarks.length === 0 ? (
                <EmptyLine title="No open remarks" body="When your consultant leaves a remark on a record, it shows here." />
              ) : (
                <ScrollList label="Consultant remarks" count={openRemarks.length} footer={<Link to="/remarks" className="font-medium text-primary">Open remarks inbox</Link>}>
                  {openRemarks.map((r, i) => <li key={r.id}><RemarkRow r={r} first={i === 0} /></li>)}
                </ScrollList>
              )}
            </Card>
          )}
        {can("Evidence") && <Card>
          <CardHeader>
            <CardTitle>Evidence by ISO 9001 clause</CardTitle>
            <Link to="/evidence" className="text-[0.8125rem] font-medium text-primary">
              Open evidence
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {coverage.groups.map((c) => (
              <div key={c.no} className="grid grid-cols-[28px_minmax(0,200px)_minmax(0,1fr)_40px] items-center gap-3 text-sm max-sm:grid-cols-[28px_minmax(0,1fr)_40px]">
                <span className="font-semibold">{c.no}</span>
                <span className="truncate max-sm:hidden">{c.name}</span>
                <span className="flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${c.name}: ${c.ok}% current, ${c.part}% partial, ${c.gap}% missing`}>
                  <span className="bg-done" style={{ width: `${c.ok}%` }} />
                  <span className="bg-soon-bar" style={{ width: `${c.part}%` }} />
                  <span className="bg-overdue" style={{ width: `${c.gap}%` }} />
                </span>
                <span className="text-right text-[0.8125rem] text-muted-foreground">{c.frac}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-done" />Evidence current</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-soon-bar" />Partial or old</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-overdue" />No evidence</span>
            </div>
          </CardContent>
        </Card>}

        </div>

        <div className="flex flex-col gap-6">
        {seesReadiness && (
          <Link to="/readiness" className="flex flex-col gap-3 rounded-md border bg-card p-5 transition-colors hover:border-input">
            <span className="flex items-center justify-between gap-3">
              <span className="text-[0.9375rem] font-semibold">Certification readiness</span>
              <span className="text-[0.8125rem] font-medium text-soon">Stage 1: {dueOn(CERTIFICATION.stage1) ? `${daysBetween(todayIso(), dueOn(CERTIFICATION.stage1)!)} days` : "No date"}</span>
            </span>
            <span className="h-2 overflow-hidden rounded-full bg-border">
              <span className="block h-2 rounded-full bg-done" style={{ width: `${(reqs.filter((r) => r.status === "Done").length / Math.max(1, reqs.length)) * 100}%` }} />
            </span>
            <span className="text-[0.8125rem] text-muted-foreground">
              {reqs.filter((r) => r.status === "Done").length} of {reqs.length} requirements done, {CERTIFICATION.body} on {CERTIFICATION.stage1}
            </span>
          </Link>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Coming up</CardTitle>
          </CardHeader>
          {upcoming.length === 0 && <EmptyLine title="Nothing coming up" body="Audits, reviews and due dates in the next 30 days show here." />}
          <ScrollList label="Coming up" count={upcoming.length} footer={<span>Next 30 days</span>}>
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
          </ScrollList>
        </Card>
          {can("Objectives & KPIs") && <Card>
            <CardHeader>
              <CardTitle>Key results</CardTitle>
              <Link to="/qms/objectives" className="text-[0.8125rem] font-medium text-primary">
                All objectives
              </Link>
            </CardHeader>
            <ul>
              {state.objectives.length === 0 && <EmptyLine title="No objectives yet" body="Set quality objectives to see their latest results here." />}
              {state.objectives.slice(0, 4).map((o, i) => (
                <li key={o.id} className={cn("flex items-center justify-between gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <span className="min-w-0 text-sm leading-snug">{o.name}</span>
                  <span className="flex items-baseline gap-2 whitespace-nowrap">
                    <span className={cn("text-[0.9375rem] font-semibold", kpiTone(o))}>{fmtKpi(o)}</span>
                    <span className="text-xs text-muted-foreground">target {fmtTarget(o)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>}

          {can("Corrective Action") && <Card>
            <CardHeader>
              <CardTitle>Where open nonconformities came from</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {openNcs.length === 0 && <p className="py-2 text-sm text-muted-foreground">No open nonconformities.</p>}
              {openNcs.length > 0 && sources.map((s) => (
                <div key={s.name} className="grid grid-cols-[9.5rem_minmax(0,1fr)_20px] items-center gap-3 text-sm">
                  <span className="truncate">{s.name}</span>
                  <span className="h-2 rounded-full bg-background">
                    <span className="block h-2 rounded-full bg-foreground" style={{ width: `${(s.n / maxSource) * 100}%` }} />
                  </span>
                  <span className="text-right font-semibold">{s.n}</span>
                </div>
              ))}
            </CardContent>
          </Card>}
        </div>
      </div>
    </>
  )
}
