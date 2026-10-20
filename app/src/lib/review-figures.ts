/**
 * Figures for each management review input (ISO 9001 clause 9.3.2), worked out from the records
 * the person may see, for the review's reporting period. Each figure says how it was calculated,
 * which records it came from and whether data was missing, so a number is never shown without
 * its evidence. Figures stay live while the review is prepared, are kept as sent in the pack,
 * and are frozen at Finish and lock (plan v3 §22).
 *
 * Preview only: the real service works these out on the server from authorised data. Here they
 * are worked out in the browser from the store, which already leaves out processes the person
 * can't see (plan v3 §9, D22), and classification is checked for each record.
 */
import { latestIn } from "@/lib/objective-results"
export { latestIn } from "@/lib/objective-results"
import type { State } from "@/lib/store"
import { fmtKpi, fmtTarget, onTarget, resultsOf } from "@/data/records"
import { NC_STAGES, type Audit, type ContextIssue, type DocRecord, type EvidenceItem, type FigureSource, type FigureStatus, type FrozenFigure, type InterestedParty, type ManagementReviewRecord, type Nonconformity, type Objective, type ObjectiveResult, type Process, type ReviewAction, type Risk } from "@/data/types"
import type { BadgeTone } from "@/components/ui/badge"
import { riskLevel } from "@/components/app/status"
import { formatDate, formatPeriod, inPeriod, nowIso, previousPeriod, resultInPeriod, resultPeriodLabel, todayIso, type Period } from "@/lib/periods"
import { RECORD_MODULE, type RecordKind } from "@/lib/record-links"

/** One record behind a figure, as Supporting records shows it. */
export interface SupportingRecord {
  kind: RecordKind
  id: string
  title: string
  /** the menu area it lives in */
  module: string
  /** ISO date that places it in the period, and what that date is */
  date?: string
  dateLabel?: string
  status: string
  tone: BadgeTone
  description?: string
  evidenceType: string
  /** needs management's attention: overdue, below target, major */
  attention?: boolean
  /** its revision, stage or last change, kept when the figure is frozen */
  version: string
}

export interface InputFigure {
  ref: string
  status: FigureStatus
  /** the headline, for example "5 / 7" */
  value: string
  /** what it means, for example "objectives on target" */
  detail: string
  target?: string
  /** the same figure for the period before */
  previous?: { value: string; detail: string; status: FigureStatus }
  /** plain sentence comparing with the previous period, when both have data */
  trend?: string
  warn?: boolean
  /** one plain sentence saying how it was worked out */
  method: string
  /** where the data comes from */
  dataSource: string
  sources: SupportingRecord[]
  /** sources the app has no module for yet; shown as "no source" with room for manual references */
  missing: string[]
  /** short notes on what needs management's attention, from the records (never a conclusion) */
  attention: string[]
  period: Period
  /** ISO date and time it was worked out */
  computedAt: string
}

export interface FigureContext {
  /** the review being prepared, so its own actions aren't counted in input a */
  review?: ManagementReviewRecord
  /** classification check for the person viewing */
  canSee: (classification: string, viewers?: string[], owner?: string, route?: string[]) => boolean
  today?: string
}

export const FIGURE_STATUS_LABEL: Record<FigureStatus, string> = {
  valid: "Calculated from records",
  zero: "Checked: no matching records",
  "not-collected": "Not collected for this period",
  "no-source": "No source in ThryveMS",
}

/* ---------------- Records as supporting records ---------------- */

const ncClosed = (n: Nonconformity) => n.stage >= 6
const ncOverdue = (n: Nonconformity, today: string) => !ncClosed(n) && (!!n.late || (!!n.dueDate && n.dueDate < today))

function ncRecord(n: Nonconformity, today: string): SupportingRecord {
  const overdue = ncOverdue(n, today)
  const closed = ncClosed(n)
  return {
    kind: "nonconformity",
    id: n.id,
    title: n.title,
    module: RECORD_MODULE.nonconformity,
    date: closed ? n.closedDate : n.raisedDate,
    dateLabel: closed ? "Closed" : "Raised",
    status: closed ? "Closed" : overdue ? `${NC_STAGES[n.stage]}, overdue` : NC_STAGES[n.stage],
    tone: closed ? "done" : overdue ? "overdue" : "progress",
    description: `${n.severity}, ${n.process}, clause ${n.clause}. Source: ${n.source}.${!closed && n.dueDate ? ` Due ${formatDate(n.dueDate)}.` : ""}`,
    evidenceType: "Nonconformity and corrective action",
    attention: overdue || (!closed && n.severity === "Major"),
    version: NC_STAGES[n.stage],
  }
}

function objectiveRecord(o: Objective, p: Period): SupportingRecord {
  const r = latestIn(o, p)
  const below = !!r && !onTarget(o, r.value)
  const count = resultsOf(o).filter((x) => resultInPeriod(x.period, p)).length
  return {
    kind: "objective",
    id: o.id,
    title: o.name,
    module: RECORD_MODULE.objective,
    date: r?.enteredOn,
    dateLabel: "Result entered",
    status: !r ? "No result in the period" : below ? "Below target" : "On target",
    tone: !r ? "draft" : below ? "overdue" : "done",
    description: r ? `${resultPeriodLabel(r.period)}: ${fmtKpi(o, r.value)}, target ${fmtTarget(o)}. ${count} result${count === 1 ? "" : "s"} in the period. Owner ${o.owner}, ${o.process}.` : `Target ${fmtTarget(o)}, measured ${o.frequency}. No result entered for the period. Owner ${o.owner}.`,
    evidenceType: r?.evidence?.length ? `KPI result, evidence ${r.evidence.join(", ")}` : "KPI result",
    attention: below,
    version: r ? `${r.period}: ${r.value}` : "no result",
  }
}

function auditRecord(a: Audit, p: Period): SupportingRecord {
  const held = !!a.heldDate
  const issued = !!a.reportDate
  const pending = held && !issued
  return {
    kind: "audit",
    id: a.id,
    title: `${a.process} audit`,
    module: RECORD_MODULE.audit,
    date: issued && inPeriod(a.reportDate, p) ? a.reportDate : a.heldDate,
    dateLabel: issued && inPeriod(a.reportDate, p) ? "Report issued" : "Held",
    status: a.state,
    tone: a.state === "Report late" ? "overdue" : issued ? "done" : pending ? "soon" : "draft",
    description: `${a.kind} audit, lead ${a.lead}. Clauses ${a.clauses.join(", ")}.${pending ? " Report not issued yet." : ""}`,
    evidenceType: issued ? "Audit report" : "Audit record",
    attention: a.state === "Report late",
    version: a.state,
  }
}

function riskRecord(r: Risk, today: string, ncs: Nonconformity[]): SupportingRecord {
  const overdue = r.review !== "Archived" && (!!r.late || (!!r.nextReviewDate && r.nextReviewDate < today))
  const linked = ncs.filter((n) => n.risks?.includes(r.id))
  const lvl = riskLevel(r).label
  return {
    kind: "risk",
    id: r.id,
    title: r.title,
    module: RECORD_MODULE.risk,
    date: r.nextReviewDate,
    dateLabel: "Next review",
    status: overdue ? "Review overdue" : r.treatment === "Accept it" ? "Accepted" : "Action exists",
    tone: overdue ? "overdue" : "progress",
    description: `${r.kind}, ${lvl.toLowerCase()}, ${r.process}. ${r.treatment}: ${r.action}. Effectiveness check not recorded.${linked.length ? ` Happened: ${linked.map((n) => n.id).join(", ")}.` : ""}`,
    evidenceType: "Risk register entry",
    attention: overdue || (r.kind === "Risk" && lvl === "High") || linked.some((n) => !ncClosed(n)),
    version: `${r.likelihood}×${r.impact}, ${r.treatment}`,
  }
}

function actionRecord(a: ReviewAction, today: string): SupportingRecord {
  const overdue = a.state === "Open" && !!a.dueDate && a.dueDate < today
  return {
    kind: "review-action",
    id: a.id,
    title: a.text,
    module: RECORD_MODULE["review-action"],
    date: a.state === "Done" ? a.doneDate : a.dueDate,
    dateLabel: a.state === "Done" ? "Done" : "Due",
    status: a.state === "Done" ? "Done" : overdue ? "Overdue" : "Open",
    tone: a.state === "Done" ? "done" : overdue ? "overdue" : "progress",
    description: `${a.type} from ${a.reviewId}. Owner ${a.owner}.${a.linked ? ` Linked to ${a.linked}.` : ""}${a.state === "Done" ? (a.completionEvidence?.length ? ` Completion evidence ${a.completionEvidence.join(", ")}.` : " No completion evidence linked.") : ""}`,
    evidenceType: a.completionEvidence?.length ? "Action with completion evidence" : "Review action",
    attention: overdue,
    version: a.state,
  }
}

function evidenceRecord(e: EvidenceItem): SupportingRecord {
  return {
    kind: "evidence",
    id: e.id,
    title: e.title,
    module: RECORD_MODULE.evidence,
    date: e.addedDate,
    dateLabel: "Added",
    status: e.classification,
    tone: "draft",
    description: `Clauses ${e.clauses.join(", ")}. ${e.processes.join(", ") || "Company-wide"}. Added by ${e.addedBy}.`,
    evidenceType: e.kind === "Link" ? "Link" : e.kind === "Record" ? "Record" : "File",
    version: e.addedDate ?? e.added,
  }
}

function documentRecord(d: DocRecord): SupportingRecord {
  return {
    kind: "document",
    id: d.id,
    title: d.title,
    module: RECORD_MODULE.document,
    status: d.reviewOverdue ? "Review overdue" : d.stage,
    tone: d.reviewOverdue ? "overdue" : d.stage === "Published" ? "done" : "progress",
    description: `${d.type}, revision ${d.rev}, ${d.process}. Owner ${d.owner}.`,
    evidenceType: "Controlled document",
    attention: !!d.reviewOverdue,
    version: `revision ${d.rev}, ${d.stage}`,
  }
}

function contextRecord(x: ContextIssue | InterestedParty, kind: "issue" | "party"): SupportingRecord {
  const title = kind === "issue" ? (x as ContextIssue).issue : (x as InterestedParty).name
  const desc = kind === "issue" ? `${(x as ContextIssue).kind} issue. Effect: ${(x as ContextIssue).effect}.` : `Needs: ${(x as InterestedParty).needs}.`
  return {
    kind,
    id: x.id,
    title,
    module: RECORD_MODULE[kind],
    date: x.changedDate,
    dateLabel: "Last changed",
    status: "Changed in the period",
    tone: "progress",
    description: desc,
    evidenceType: kind === "issue" ? "Context register entry" : "Interested party register entry",
    version: x.changedDate ?? "",
  }
}

function processRecord(p: Process, objs: Objective[], ncs: Nonconformity[], period: Period): SupportingRecord {
  const below = objs.filter((o) => {
    const r = latestIn(o, period)
    return r && !onTarget(o, r.value)
  })
  const measured = objs.filter((o) => latestIn(o, period))
  const issues = below.length > 0 || ncs.length > 0
  return {
    kind: "process",
    id: p.id,
    title: p.name,
    module: RECORD_MODULE.process,
    status: !objs.length && !ncs.length ? "No objectives or nonconformities" : issues ? "Needs attention" : "No issues recorded",
    tone: issues ? "soon" : "done",
    description: `${measured.length} of ${objs.length} objective${objs.length === 1 ? "" : "s"} measured in the period${below.length ? `, ${below.length} below target` : ""}. ${ncs.length} nonconformit${ncs.length === 1 ? "y" : "ies"} raised in the period. Owner ${p.owner}.`,
    evidenceType: "Process record",
    attention: issues,
    version: `${below.length} below, ${ncs.length} raised`,
  }
}

function reviewRecord(r: ManagementReviewRecord): SupportingRecord {
  return {
    kind: "review",
    id: r.id,
    title: r.title,
    module: RECORD_MODULE.review,
    status: r.stage,
    tone: r.stage === "Closed" ? "done" : "progress",
    description: `${r.format}, ${r.date}.${r.signOff ? ` Signed off by ${r.signOff.by}.` : ""}`,
    evidenceType: "Management review record",
    version: r.stage,
  }
}

/* ---------------- The figure for each input ---------------- */

const ratio = (a: number, b: number) => (b ? a / b : 0)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Reviews held before this one, newest first. */
function earlierReviews(state: State, review?: ManagementReviewRecord) {
  if (!review) return state.reviews
  const i = state.reviews.findIndex((r) => r.id === review.id)
  return i < 0 ? state.reviews : state.reviews.slice(i + 1)
}

type Partial_ = Omit<InputFigure, "ref" | "period" | "computedAt" | "previous" | "trend"> & { num?: number; higherIsBetter?: boolean }

function compute(ref: string, state: State, p: Period, ctx: FigureContext): Partial_ {
  const today = ctx.today ?? todayIso()
  const docs = state.documents.filter((d) => ctx.canSee(d.classification, d.viewers, d.owner, [...d.reviewers, ...d.approvers]))
  const evidence = state.evidence.filter((e) => ctx.canSee(e.classification, [], e.addedBy))
  const raisedIn = state.ncs.filter((n) => inPeriod(n.raisedDate, p))
  const objectiveFig = (objs: Objective[], label: string) => {
    const measured = objs.filter((o) => latestIn(o, p))
    const on = measured.filter((o) => onTarget(o, latestIn(o, p)!.value))
    return { measured, on, value: `${on.length} / ${measured.length}`, detail: `${label} on target${measured.length < objs.length ? `, ${objs.length - measured.length} with no result` : ""}` }
  }

  switch (ref) {
    case "a": {
      const earlier = earlierReviews(state, ctx.review)
      const ids = new Set(earlier.map((r) => r.id))
      const acts = state.reviewActions.filter((a) => ids.has(a.reviewId) && (a.state === "Open" || inPeriod(a.doneDate, p)))
      const open = acts.filter((a) => a.state === "Open")
      const late = open.filter((a) => !!a.dueDate && a.dueDate < today)
      const noEvidence = acts.filter((a) => a.state === "Done" && !a.completionEvidence?.length)
      const fromReviews = [...new Set(acts.map((a) => a.reviewId))].map((id) => earlier.find((r) => r.id === id)!).filter(Boolean)
      return {
        status: !earlier.length ? "zero" : acts.length ? "valid" : "zero",
        value: !earlier.length ? "None" : `${acts.length - open.length} / ${acts.length}`,
        detail: !earlier.length ? "first review" : `done${late.length ? `, ${late.length} overdue` : ""}`,
        warn: late.length > 0,
        num: acts.length - open.length,
        higherIsBetter: true,
        method: "Actions from every earlier review that are still open, plus those finished in the reporting period. Done out of all of them.",
        dataSource: "Management Review: actions from earlier reviews",
        sources: [...fromReviews.map(reviewRecord), ...acts.map((a) => actionRecord(a, today))],
        missing: [],
        attention: [
          ...(late.length ? [`${plural(late.length, "action")} overdue: ${late.map((a) => a.id).join(", ")}`] : []),
          ...(noEvidence.length ? [`${plural(noEvidence.length, "finished action")} with no completion evidence linked`] : []),
        ],
      }
    }
    case "b": {
      const issues = state.issues.filter((i) => inPeriod(i.changedDate, p))
      const parties = state.parties.filter((x) => inPeriod(x.changedDate, p))
      const n = issues.length + parties.length
      return {
        status: n ? "valid" : "zero",
        value: String(n),
        detail: `changed: ${plural(issues.length, "issue")}, ${plural(parties.length, "interested party", "interested parties")}`,
        num: n,
        method: "Context issues and interested parties whose last change falls in the reporting period. Records that weren’t changed aren’t counted.",
        dataSource: "Organization & Scope: context issues and interested parties",
        sources: [...issues.map((i) => contextRecord(i, "issue")), ...parties.map((x) => contextRecord(x, "party"))],
        missing: ["Change history: ThryveMS keeps only the date of the last change, not what changed or earlier changes. Describe the changes in the analysis, or link the minutes where they were agreed."],
        attention: parties.filter((x) => x.reviewDue).map((x) => `${x.name}: review due`),
      }
    }
    case "c1": {
      const objs = state.objectives.filter((o) => o.reviewInputs?.includes("c1"))
      const complaints = state.ncs.filter((n) => /customer complaint/i.test(n.source) && (inPeriod(n.raisedDate, p) || !ncClosed(n)))
      const f = objectiveFig(objs, "customer objectives")
      const raised = complaints.filter((n) => inPeriod(n.raisedDate, p))
      return {
        status: objs.length && !f.measured.length ? "not-collected" : objs.length || complaints.length ? "valid" : "zero",
        value: objs.length ? f.value : String(raised.length),
        detail: objs.length ? `${f.detail}; ${plural(raised.length, "complaint")} raised` : "customer complaints raised",
        warn: f.on.length < f.measured.length,
        num: ratio(f.on.length, f.measured.length),
        higherIsBetter: true,
        target: objs.length === 1 ? fmtTarget(objs[0]) : undefined,
        method: "Objectives tagged for customer satisfaction: latest result in the period against target. Nonconformities whose source is a customer complaint, raised in the period or still open.",
        dataSource: "Objectives & KPIs (tagged c1), Corrective Action (customer complaints)",
        sources: [...objs.map((o) => objectiveRecord(o, p)), ...complaints.map((n) => ncRecord(n, today))],
        missing: ["Customer survey results and a complaint register: ThryveMS has no module for these yet. Link the survey report or complaint log as a reference."],
        attention: [...objs.filter((o) => objectiveRecord(o, p).attention).map((o) => `${o.name} below target`), ...(raised.length ? [`${plural(raised.length, "customer complaint")} raised in the period`] : [])],
      }
    }
    case "c2": {
      const f = objectiveFig(state.objectives, "objectives")
      const below = f.measured.filter((o) => !f.on.includes(o))
      return {
        status: !state.objectives.length ? "zero" : f.measured.length ? "valid" : "not-collected",
        value: state.objectives.length ? f.value : "0",
        detail: state.objectives.length ? f.detail : "objectives set",
        warn: below.length > 0,
        num: ratio(f.on.length, f.measured.length),
        higherIsBetter: true,
        method: "For each quality objective, the latest result whose month or quarter ends in the reporting period, against its target. Objectives with no result there are counted as no data, not as zero.",
        dataSource: "Objectives & KPIs: results by period",
        sources: state.objectives.map((o) => objectiveRecord(o, p)),
        missing: [],
        attention: [...below.map((o) => `${o.name}: ${fmtKpi(o, latestIn(o, p)!.value)} against ${fmtTarget(o)}`), ...state.objectives.filter((o) => !latestIn(o, p)).map((o) => `${o.name}: no result for the period`)],
      }
    }
    case "c3": {
      const rows = state.processes.map((pr) => processRecord(pr, state.objectives.filter((o) => o.process === pr.name), raisedIn.filter((n) => n.process === pr.name), p))
      const attention = rows.filter((r) => r.attention)
      return {
        status: rows.length ? "valid" : "zero",
        value: `${attention.length} / ${rows.length}`,
        detail: "processes with an objective below target or a nonconformity raised",
        warn: attention.length > 0,
        num: attention.length,
        higherIsBetter: false,
        method: "For each process: its objectives’ latest results in the period against target, and the nonconformities raised in the period. A process needs attention when either shows a problem.",
        dataSource: "Processes, Objectives & KPIs, Corrective Action",
        sources: rows,
        missing: ["Product and service conformity records, such as inspection and test results: ThryveMS has no module for these yet. Link the inspection summary as a reference."],
        attention: attention.map((r) => `${r.title}: ${r.description?.split(". ")[0]}`),
      }
    }
    case "c4": {
      const open = state.ncs.filter((n) => !ncClosed(n))
      const closedIn = state.ncs.filter((n) => inPeriod(n.closedDate, p))
      const list = [...new Map([...open, ...raisedIn, ...closedIn].map((n) => [n.id, n])).values()]
      const overdue = open.filter((n) => ncOverdue(n, today))
      const major = open.filter((n) => n.severity === "Major")
      const groups = new Map<string, Nonconformity[]>()
      for (const n of state.ncs.filter((x) => x.raisedDate && x.raisedDate >= previousPeriod(p).start && x.raisedDate <= p.end)) {
        const k = `${n.process}|${n.clause.split(".").slice(0, 2).join(".")}`
        groups.set(k, [...(groups.get(k) ?? []), n])
      }
      const recurring = [...groups.values()].filter((g) => g.length > 1)
      const effectiveness = state.ncs.filter((n) => n.stage === 5)
      return {
        status: list.length ? "valid" : "zero",
        value: String(open.length),
        detail: `open, ${major.length} major${overdue.length ? `, ${overdue.length} overdue` : ""}; ${raisedIn.length} raised and ${closedIn.length} closed in the period`,
        warn: overdue.length > 0,
        num: raisedIn.length,
        higherIsBetter: false,
        method: "Nonconformities open today, plus those raised or closed in the reporting period. Overdue means open past the due date. Recurring means two or more in the same process and clause over this period and the one before.",
        dataSource: "Corrective Action",
        sources: list.map((n) => ncRecord(n, today)),
        missing: [],
        attention: [
          ...overdue.map((n) => `${n.id} overdue: ${n.title}`),
          ...major.filter((n) => !overdue.includes(n)).map((n) => `${n.id} major and open`),
          ...recurring.map((g) => `Recurring in ${g[0].process}, clause ${g[0].clause.split(".").slice(0, 2).join(".")}: ${g.map((n) => n.id).join(", ")}`),
          ...(effectiveness.length ? [`${plural(effectiveness.length, "nonconformity", "nonconformities")} waiting for the effectiveness check`] : []),
        ],
      }
    }
    case "c5": {
      const withResults = state.objectives.filter((o) => resultsOf(o).some((r) => resultInPeriod(r.period, p)))
      const count = state.objectives.reduce((s, o) => s + resultsOf(o).filter((r) => resultInPeriod(r.period, p)).length, 0)
      const withEvidence = state.objectives.reduce((s, o) => s + resultsOf(o).filter((r) => resultInPeriod(r.period, p) && r.evidence?.length).length, 0)
      return {
        status: !state.objectives.length ? "zero" : count ? "valid" : "not-collected",
        value: String(count),
        detail: `results entered for ${plural(withResults.length, "objective")}, ${withEvidence} with evidence`,
        num: count,
        higherIsBetter: true,
        method: "Results entered for months or quarters that end in the reporting period. It counts measurements, not the number of objectives.",
        dataSource: "Objectives & KPIs: results by period",
        sources: state.objectives.map((o) => objectiveRecord(o, p)),
        missing: ["Inspection and measurement data beyond the objectives: ThryveMS has no module for this yet. Link the reports as references."],
        attention: state.objectives.filter((o) => !withResults.includes(o)).map((o) => `${o.name}: nothing measured in the period`),
      }
    }
    case "c6": {
      const audits = state.audits.filter((a) => inPeriod(a.heldDate, p) || inPeriod(a.reportDate, p) || (a.heldDate && !a.reportDate && a.heldDate <= p.end))
      const held = audits.filter((a) => inPeriod(a.heldDate, p))
      const issued = held.filter((a) => a.reportDate)
      const pending = audits.filter((a) => a.heldDate && !a.reportDate)
      // Latest completed checklist results that are observations or nonconformities.
      const results = state.auditorAssessments.filter((x, i, all) =>
        x.status === "Completed" && ["Observation", "Minor NC", "Major NC"].includes(x.result) &&
        !all.slice(i + 1).some((later) => later.checklistId === x.checklistId && later.questionId === x.questionId) &&
        (inPeriod(x.at.slice(0, 10), p) || (x.ncId && state.ncs.some((n) => n.id === x.ncId && !ncClosed(n)))))
      const auditNcs = state.ncs.filter(n => /audit\s+IA-/i.test(n.source) && (inPeriod(n.raisedDate,p) || !ncClosed(n)))
      const unlinked = results.filter((x) => ["Minor NC", "Major NC"].includes(x.result) && !x.ncId)

      return {
        status: audits.length || results.length ? "valid" : "zero",
        value: `${issued.length} / ${held.length}`,
        detail: `reports issued for audits held; ${plural(results.length, "observation or nonconformity", "observations or nonconformities")} recorded`,
        warn: pending.length > 0,
        num: issued.length,
        higherIsBetter: true,
        method: "Internal audits held in the reporting period and whether their report is issued, audits with a report still pending, and checklist results recorded as observations or nonconformities. Audit nonconformities are included as supporting Corrective Action records.",
        dataSource: "Audits: checklist results; linked Corrective Action",
        sources: [...audits.map((a) => auditRecord(a, p)), ...auditNcs.map((n) => ncRecord(n, today))],
        missing: [],
        attention: [...pending.map((a) => `${a.id} ${a.process}: report not issued`), ...unlinked.map((x) => `${x.auditId}, question ${x.questionId}: nonconformity has no corrective action`)],
      }
    }
    case "c7": {
      const objs = state.objectives.filter((o) => o.reviewInputs?.includes("c7"))
      const ncs = state.ncs.filter((n) => (n.process === "Purchasing & suppliers" || /supplier/i.test(n.source)) && (inPeriod(n.raisedDate, p) || !ncClosed(n)))
      const ev = evidence.filter((e) => e.processes.includes("Purchasing & suppliers") && e.clauses.some((c) => c.startsWith("8.4")))
      const f = objectiveFig(objs, "supplier objectives")
      return {
        status: objs.length && !f.measured.length ? "not-collected" : objs.length || ncs.length ? "valid" : "zero",
        value: objs.length ? f.value : String(ncs.length),
        detail: objs.length ? `${f.detail}; ${plural(ncs.length, "supplier nonconformity", "supplier nonconformities")}` : "supplier nonconformities",
        warn: f.on.length < f.measured.length,
        num: ratio(f.on.length, f.measured.length),
        higherIsBetter: true,
        target: objs.length === 1 ? fmtTarget(objs[0]) : undefined,
        method: "Objectives tagged for external providers: latest result in the period against target. Nonconformities in Purchasing & suppliers or from a supplier, raised in the period or still open. Supplier evidence under clause 8.4.",
        dataSource: "Objectives & KPIs (tagged c7), Corrective Action, Evidence (clause 8.4)",
        sources: [...objs.map((o) => objectiveRecord(o, p)), ...ncs.map((n) => ncRecord(n, today)), ...ev.map(evidenceRecord)],
        missing: ["Supplier register and supplier-by-supplier evaluations: ThryveMS has no module for these yet. Link the approved supplier list and scorecards as references."],
        attention: [...objs.filter((o) => objectiveRecord(o, p).attention).map((o) => `${o.name} below target`), ...ncs.filter((n) => ncOverdue(n, today)).map((n) => `${n.id} overdue`)],
      }
    }
    case "d": {
      const procs = ["People & competence", "Infrastructure & equipment"]
      const ncs = state.ncs.filter((n) => procs.includes(n.process) && (inPeriod(n.raisedDate, p) || !ncClosed(n)))
      const risks = state.risks.filter((r) => procs.includes(r.process) && r.review !== "Archived")
      const ds = docs.filter((d) => procs.includes(d.process) && (d.reviewOverdue || d.stage !== "Published"))
      const ev = evidence.filter((e) => e.processes.some((x) => procs.includes(x)))
      const objs = state.objectives.filter((o) => o.reviewInputs?.includes("d"))
      return {
        status: "no-source",
        value: "Prepared by hand",
        detail: `${plural(ncs.length, "nonconformity", "nonconformities")} and ${plural(risks.length, "risk")} in people and equipment`,
        method: "No figure is worked out: ThryveMS doesn’t hold staffing, capacity or resource requests. Listed here are records from People & competence and Infrastructure & equipment that may show a resource need.",
        dataSource: "Documents, Evidence, Corrective Action and Risks & Opportunities for People & competence and Infrastructure & equipment",
        sources: [...objs.map((o) => objectiveRecord(o, p)), ...ncs.map((n) => ncRecord(n, today)), ...risks.map((r) => riskRecord(r, today, state.ncs)), ...ds.map(documentRecord), ...ev.map(evidenceRecord)],
        missing: ["Resource planning: staffing levels, competence gaps, infrastructure and equipment needs, and resource requests have no module yet. Prepare this input by hand and link the records you used."],
        attention: [...ncs.filter((n) => !ncClosed(n)).map((n) => `${n.id} open: ${n.title}`), ...risks.filter((r) => riskRecord(r, today, state.ncs).attention).map((r) => `${r.id}: ${r.title}`)],
      }
    }
    case "e": {
      const live = state.risks.filter((r) => r.review !== "Archived" && r.treatment !== "Closed")
      const withAction = live.filter((r) => !["Accept it", "Not now"].includes(r.treatment))
      const recs = live.map((r) => riskRecord(r, today, state.ncs))
      const overdue = recs.filter((r) => r.status === "Review overdue")
      const dueIn = live.filter((r) => inPeriod(r.nextReviewDate, p))
      const happened = live.filter((r) => state.ncs.some((n) => n.risks?.includes(r.id) && inPeriod(n.raisedDate, p)))
      return {
        status: live.length ? "valid" : "zero",
        value: String(withAction.length),
        detail: `with an action; ${overdue.length} review${overdue.length === 1 ? "" : "s"} overdue; effectiveness checked: not recorded`,
        warn: overdue.length > 0,
        num: overdue.length,
        higherIsBetter: false,
        method: "Risks and opportunities in the register with an action, reviews due in the period or overdue, and nonconformities raised in the period that show a risk happened. Whether an action worked is not recorded in ThryveMS, so it isn’t counted.",
        dataSource: "Risks & Opportunities, Corrective Action (linked risks)",
        sources: recs,
        missing: ["Effectiveness assessment: ThryveMS records that an action exists, not whether it worked. Say in the analysis how effectiveness was checked, and link the evidence."],
        attention: [...overdue.map((r) => `${r.id} review overdue`), ...happened.map((r) => `${r.id} happened in the period`), ...(dueIn.length ? [`${plural(dueIn.length, "review")} due in the period`] : [])],
      }
    }
    default:
      return { status: "no-source", value: "", detail: "", method: "", dataSource: "", sources: [], missing: [], attention: [] }
  }
}

/** The figure for one input over the reporting period, with the previous period for comparison. */
export function computeInput(ref: string, state: State, period: Period, ctx: FigureContext): InputFigure {
  const now = compute(ref, state, period, ctx)
  const prevPeriod = previousPeriod(period)
  const prev = compute(ref, state, prevPeriod, ctx)
  const comparable = now.num !== undefined && prev.num !== undefined && (now.status === "valid" || now.status === "zero") && (prev.status === "valid" || prev.status === "zero") && ref !== "a" && ref !== "d"
  let trend: string | undefined
  if (comparable) {
    const diff = now.num! - prev.num!
    const word = Math.abs(diff) < 1e-9 ? "The same as" : diff > 0 ? "Up on" : "Down on"
    const better = Math.abs(diff) < 1e-9 ? "" : (diff > 0) === !!now.higherIsBetter ? ", better" : ", worse"
    trend = `${word} the previous period (${formatPeriod(prevPeriod)})${better}`
  }
  const { num: _n, higherIsBetter: _h, ...rest } = now
  return {
    ...rest,
    ref,
    period,
    previous: ref === "d" || ref === "a" ? undefined : { value: prev.value, detail: prev.detail, status: prev.status },
    trend,
    computedAt: nowIso(),
  }
}

/** Kept with the pack or the locked record. */
export function freezeFigure(f: InputFigure, checks: (s: SupportingRecord) => FigureSource["check"]): FrozenFigure {
  return {
    value: f.value,
    detail: f.detail,
    status: f.status,
    period: f.period,
    method: f.method,
    computedAt: f.computedAt,
    sources: f.sources.map((s) => ({ kind: s.kind, id: s.id, version: s.version, title: s.title, status: s.status, date: s.date, check: checks(s) })),
  }
}

/** The review's reporting period. Old reviews without one use the twelve months up to their date. */
export function reviewPeriod(r: ManagementReviewRecord, parse: (s: string) => string | undefined): Period {
  if (r.period) return r.period
  const end = parse(r.date) ?? todayIso()
  const d = new Date(Number(end.slice(0, 4)) - 1, Number(end.slice(5, 7)) - 1, Number(end.slice(8, 10)) + 1, 12)
  return { start: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, end }
}
