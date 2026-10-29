import { allows } from "@/lib/permissions"
import * as React from "react"

import { useStore, type State } from "@/lib/store"
import type { Area, ManagementReviewRecord, Remark } from "@/data/types"
import { auditForms, formKey } from "@/lib/audit-form-policy"
import { questionsOf } from "@/lib/audit-workflow"
import { latestAssessment } from "@/lib/audit-execution"
import { dueOn, visibleRecords } from "@/lib/record-figures"
import { addDays, daysBetween, formatDate, todayIso } from "@/lib/periods"
import { RULES } from "@/lib/rules"

export type TaskType = "nc" | "doc" | "audit" | "review" | "risk" | "remark" | "cert"

/** Something waiting on this person now. It leaves the list as soon as they have done their part. */
export interface MyTask {
  id: string
  type: TaskType
  /** what kind of record, in words: "Nonconformity", "Document approval" */
  kind: string
  ref: string
  title: string
  process: string
  /** "Your step: …" */
  step: string
  /** the button: Open, Approve, Answer, Reply… */
  action: string
  /** ISO date, when there is one */
  due?: string
  to: string
  area: Area
}

/** One of this person's records where someone else has the next step. */
export interface WaitingTask {
  id: string
  kind: string
  ref: string
  title: string
  process: string
  /** "Maria Santos to verify the action" */
  next: string
  to: string
  area: Area
}

export const TASK_TYPES: { id: TaskType; label: string }[] = [
  { id: "nc", label: "Corrective action" },
  { id: "doc", label: "Documents" },
  { id: "audit", label: "Audits" },
  { id: "review", label: "Management review" },
  { id: "risk", label: "Risks" },
  { id: "remark", label: "Remarks" },
  { id: "cert", label: "Certification" },
]

export type TaskGroup = "overdue" | "week" | "later"
export const TASK_GROUPS: { id: TaskGroup; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "week", label: "Due this week" },
  { id: "later", label: "Later or no date" },
]

export function taskGroup(t: Pick<MyTask, "due">, today = todayIso()): TaskGroup {
  if (t.due && t.due < today) return "overdue"
  if (t.due && t.due <= addDays(today, 7)) return "week"
  return "later"
}

export function dueLabel(t: Pick<MyTask, "due">, today = todayIso()) {
  if (!t.due) return "No due date"
  if (t.due < today) {
    const n = daysBetween(t.due, today)
    return `${n} day${n === 1 ? "" : "s"} late`
  }
  return t.due === today ? "Due today" : `Due ${formatDate(t.due, { year: false })}`
}

const NC_STEP: Record<number, string> = {
  0: "contain the problem",
  1: "find the root cause and plan the action",
  2: "carry out the action",
  3: "ask for verification",
  5: "check the action worked",
}

/** Who answers a consultant remark: the owner of the record it is on. */
function remarkOwner(state: State, r: Remark) {
  const id = r.targetId
  switch (r.kind) {
    case "Process":
      return state.processes.find((p) => p.id === id || p.name === id)?.owner
    case "Document":
      return state.documents.find((d) => d.id === id)?.owner
    case "Risk":
      return state.risks.find((x) => x.id === id)?.owner
    case "Nonconformity":
      return state.ncs.find((n) => n.id === id)?.owner
    case "Audit":
      return state.audits.find((a) => a.id === id)?.lead
    case "Management review":
      return state.reviews.find((x) => x.id === id)?.preparedBy
    default:
      return undefined
  }
}

function signedBy(r: ManagementReviewRecord) {
  const valid = (r.signOffs ?? (r.signOff ? [r.signOff] : [])).filter((s) => !r.conclusionChangedAt || (!!s.at && s.at > r.conclusionChangedAt))
  return r.reviewers.filter((n) => valid.some((s) => s.by === n))
}

/**
 * Everything waiting on `who`, by the rule "the record is waiting on you": the person whose turn it is,
 * not everyone who owns or manages the record. `state` must already be limited to what they can see.
 */
export function myTasks(state: State, who: string, can: (area: Area, level?: "Manage") => boolean, roleId?: string): MyTask[] {
  const myRole = state.roles.find((r) => r.id === roleId)
  const confirms = !!myRole && allows(myRole, "readiness.confirm")
  const today = todayIso()
  const soon = addDays(today, 30)
  const tasks: MyTask[] = []
  const add = (t: MyTask) => can(t.area) && tasks.push(t)

  // Corrective action: the owner at every step except verification, which is the verifier's
  for (const n of state.ncs) {
    if (n.stage >= 6) continue
    const mine = n.stage === 4 ? n.verifier === who : n.owner === who
    if (!mine) continue
    add({
      id: `nc:${n.id}`, type: "nc", kind: "Nonconformity", ref: n.id, title: n.title, process: n.process,
      step: n.stage === 4 ? "check the action was carried out" : NC_STEP[n.stage],
      action: n.stage === 4 ? "Verify" : "Open",
      // containment is due within the QMS rules' days of raising; effectiveness from the rules' wait after verification
      due: n.stage === 5 ? (n.verifiedDate ? addDays(n.verifiedDate, RULES.effectiveAfter) : undefined) : n.stage === 0 && n.raisedDate ? addDays(n.raisedDate, n.severity === "Major" ? RULES.majorContain : RULES.minorContain) : n.dueDate,
      to: `/corrective-action/${n.id}`, area: "Corrective Action",
    })
  }

  // Documents: reviewers and approvers whose decision is still missing; the author when changes are requested;
  // the owner when a scheduled review is due; publishers when a revision is ready
  for (const d of state.documents) {
    if (d.withdrawn) continue
    const base = { ref: d.id, title: d.title, process: d.process, to: `/documents/${d.id}`, area: "Documents" as Area }
    const author = d.startedBy ?? d.owner
    if (d.stage === "Technical review" && d.reviewers.includes(who) && !d.reviewedBy?.includes(who))
      add({ ...base, id: `doc-review:${d.id}`, type: "doc", kind: "Document review", step: `review revision ${d.rev}`, action: "Review" })
    else if (d.stage === "Approval" && d.approvers.includes(who) && !d.approvedBy?.includes(who) && who !== d.startedBy) {
      const next = d.approvalMode === "One after another" ? d.approvers.find((n) => !d.approvedBy?.includes(n)) : who
      if (next === who) add({ ...base, id: `doc-approve:${d.id}`, type: "doc", kind: "Document approval", step: `approve revision ${d.rev} or request changes`, action: "Approve" })
    } else if (d.stage === "Changes requested" && author === who)
      add({ ...base, id: `doc-changes:${d.id}`, type: "doc", kind: "Document", step: "make the requested changes and resubmit", action: "Revise" })
    else if (d.stage === "Draft" && author === who)
      add({ ...base, id: `doc-draft:${d.id}`, type: "doc", kind: "Document", step: "finish the draft and send it for review", action: "Open" })
    else if (d.stage === "Ready to publish" && can("Documents", "Manage") && who !== d.startedBy)
      add({ ...base, id: `doc-publish:${d.id}`, type: "doc", kind: "Document", step: `publish approved revision ${d.rev}`, action: "Publish" })
    else if (d.stage === "Published" && d.owner === who) {
      const due = dueOn(d.nextReview)
      if (due && due <= soon) add({ ...base, id: `doc-scheduled:${d.id}`, type: "doc", kind: "Document", step: "review it: record no change, or start a new revision", action: "Review", due })
    }
  }

  // Improvements and customer complaints: their owner, until done or closed
  for (const i of state.improvements) {
    if (i.owner !== who || i.state === "Done" || i.state === "Not going ahead") continue
    const step = i.state === "Proposed" ? "plan it, or say why it isn’t going ahead" : i.state === "Planned" ? "start it" : "finish it and record what it achieved"
    add({ id: `imp:${i.id}`, type: "nc", kind: "Improvement", ref: i.id, title: i.title, process: i.process, step, action: "Open", due: i.state === "Proposed" ? undefined : i.due, to: `/corrective-action/improvements/${i.id}`, area: "Corrective Action" })
  }
  for (const c of state.complaints) {
    if (c.owner !== who || c.state === "Closed") continue
    const responded = c.state === "Responded"
    add({ id: `cc:${c.id}`, type: "nc", kind: "Customer complaint", ref: c.id, title: `${c.customer}: ${c.title}`, process: c.process, step: responded ? "close it once the customer has accepted the response" : "investigate and respond to the customer", action: responded ? "Close" : "Respond", due: responded ? undefined : c.respondBy, to: `/corrective-action/complaints/${c.id}`, area: "Corrective Action" })
  }

  // Risks and opportunities: the owner, when the review date is near
  for (const r of state.risks) {
    if (r.review === "Archived" || r.owner !== who || !r.nextReviewDate || r.nextReviewDate > soon) continue
    add({ id: `risk:${r.id}`, type: "risk", kind: r.kind === "Opportunity" ? "Opportunity review" : "Risk review", ref: r.id, title: r.title, process: r.process, step: "review the rating and controls", action: "Review", due: r.nextReviewDate, to: `/risks/${r.id}`, area: "Risks & Opportunities" })
  }

  // Audits: the auditee answers the questionnaire, the auditor records results, the lead issues the report
  for (const q of state.questionnaireAssignments) {
    if (q.respondent !== who || q.status === "Submitted" || q.status === "Resubmitted") continue
    const audit = state.audits.find((a) => a.id === q.auditId)
    add({
      id: `questionnaire:${q.id}`, type: "audit", kind: "Audit questionnaire", ref: q.auditId, title: q.status === "Clarification requested" ? "Answer the auditor’s clarification" : "Answer your audit questionnaire",
      process: audit?.process ?? "", step: q.status === "Clarification requested" ? "clarify your answers and resubmit" : `answer and submit ${q.questionIds.length} question${q.questionIds.length === 1 ? "" : "s"}`,
      action: "Answer", due: q.dueDate, to: `/audits/${q.auditId}/questionnaires/${q.id}`, area: "Audits",
    })
  }
  for (const a of state.audits) {
    if (a.state === "Report issued") continue
    const open = auditForms(state, a.id, true).flatMap((c) =>
      questionsOf(c)
        .filter((q) => q.type !== "Instruction" && (q.assessmentRequired !== false || (q.respondBy === "Auditor" && q.required)) && q.askedBy === who && latestAssessment(state, c.id, q.id)?.status !== "Completed")
        .map((q) => ({ form: formKey(c), q: q.id })),
    )
    if (open.length)
      add({
        id: `results:${a.id}`, type: "audit", kind: "Audit checklist", ref: a.id, title: `${a.process} audit`, process: a.process,
        step: `record results for ${open.length} question${open.length === 1 ? "" : "s"}`, action: "Record results", due: dueOn(a.date),
        to: `/audits/${a.id}/conduct?form=${open[0].form}&question=${open[0].q}`, area: "Audits",
      })
    if (a.lead === who && (a.state === "Findings agreed" || a.state === "Report late"))
      add({ id: `report:${a.id}`, type: "audit", kind: "Audit report", ref: a.id, title: `${a.process} audit report`, process: a.process, step: "link the findings paper and issue the report", action: "Open report", due: a.reportDueDate, to: `/audits/${a.id}/report`, area: "Audits" })
  }

  // Management review: the preparer until the pack is sent and the review recorded; contributors for inputs
  // handed to them; each reviewer until they sign; action owners until the action is done
  for (const r of state.reviews) {
    if (r.stage === "Closed") continue
    const base = { ref: r.id, title: r.title, process: "Company-wide", to: `/management-review/${r.id}`, area: "Management Review" as Area, type: "review" as const }
    const date = dueOn(r.date)
    if (r.preparedBy === who && (r.stage === "Planned" || (r.stage === "Preparing" && !r.packSentOn)))
      add({ ...base, id: `review-prepare:${r.id}`, kind: "Management review", step: "prepare the inputs and send the pack", action: "Prepare", due: date })
    else if (r.preparedBy === who && r.stage === "Preparing")
      add({ ...base, id: `review-record:${r.id}`, kind: "Management review", step: "record the conclusion and decisions after the review", action: "Record", due: date })
    if (r.stage === "Planned" || (r.stage === "Preparing" && !r.packSentOn))
      for (const i of r.inputs)
        if (i.handedTo === who && i.handedTo !== r.preparedBy && !i.notApplicable && (!i.analysis || i.draft))
          add({ ...base, id: `review-input:${r.id}:${i.ref}`, kind: "Management review input", step: `prepare input ${i.ref}, ${i.name.toLowerCase()}`, action: "Prepare", due: date })
    if (r.stage === "Reviewed") {
      const requests = (r.changeRequests ?? []).filter((c) => !c.resolvedAt)
      if (r.preparedBy === who && requests.length)
        add({ ...base, id: `review-amend:${r.id}`, kind: "Management review", step: `answer ${requests.map((c) => c.by).join(" and ")} with an amendment`, action: "Amend" })
      const asked = requests.some((c) => c.by === who)
      if (r.reviewers.includes(who) && !signedBy(r).includes(who) && !asked)
        add({ ...base, id: `review-sign:${r.id}`, kind: "Management review sign-off", step: "read the locked record and sign off, or request changes", action: "Sign off" })
    }
  }
  for (const a of state.reviewActions) {
    if (a.state !== "Open" || a.owner !== who) continue
    add({ id: `review-action:${a.id}`, type: "review", kind: "Management review action", ref: a.reviewId, title: a.text, process: "Company-wide", step: "complete the action, or say why not", action: "Open", due: a.dueDate, to: `/management-review/actions/${a.id}`, area: "Management Review" })
  }

  // Consultant remarks: the record's owner replies; the consultant answers or resolves once they have replied
  for (const r of state.remarks) {
    if (r.status !== "Open") continue
    const last = r.replies.at(-1)?.author ?? r.author
    const owner = remarkOwner(state, r)
    if (owner === who && last !== who)
      add({ id: `remark:${r.id}`, type: "remark", kind: "Consultant remark", ref: r.kind, title: r.text, process: r.targetLabel, step: "reply to the remark", action: "Reply", to: r.to, area: r.area })
    else if (r.author === who && last !== who)
      add({ id: `remark:${r.id}`, type: "remark", kind: "Consultant remark", ref: r.kind, title: r.text, process: r.targetLabel, step: "answer the reply, or resolve the remark", action: "Open", to: r.to, area: r.area })
  }

  // Certification tasks from the consultant
  for (const q of state.requirements) {
    if (q.owner === who && (q.status === "To do" || q.status === "In progress"))
      add({ id: `cert:${q.id}`, type: "cert", kind: "Certification task", ref: `Clause ${q.clause}`, title: q.title, process: "Company-wide", step: "do it and link the evidence", action: "Open", due: dueOn(q.due), to: `/readiness?item=${q.id}`, area: "Overview" })
    else if (q.status === "Ready to confirm" && confirms && q.owner !== who)
      add({ id: `cert:${q.id}`, type: "cert", kind: "Certification task", ref: `Clause ${q.clause}`, title: q.title, process: "Company-wide", step: "check the evidence and confirm it’s done", action: "Confirm", due: dueOn(q.due), to: `/readiness?item=${q.id}`, area: "Overview" })
  }

  // Access requests sent to this person as record owner or process owner
  for (const q of state.accessRequests ?? []) {
    if (q.decider !== who || q.status !== "Waiting") continue
    add({
      id: `access:${q.id}`, type: "doc", kind: "Access request", ref: q.scope === "Process" ? q.process : q.targetId,
      title: q.scope === "Process" ? `${q.person} asks for the shared records of ${q.process}` : `${q.person} asks to view ${q.targetId}`,
      process: q.process, step: q.scope === "Process" ? "tick what to share, or decline" : "share it or decline", action: "Decide",
      to: `/access-requests/${q.id}`, area: q.kind === "Evidence" ? "Evidence" : "Documents",
    })
  }

  return tasks.sort((a, b) => (a.due ?? "9999") .localeCompare(b.due ?? "9999") || a.title.localeCompare(b.title))
}

/** This person's records where the next step is someone else's, so they can follow along without it counting as theirs. */
export function waitingOnOthers(state: State, who: string, can: (area: Area) => boolean): WaitingTask[] {
  const out: WaitingTask[] = []
  const add = (t: WaitingTask) => can(t.area) && out.push(t)
  for (const n of state.ncs)
    if (n.stage === 4 && n.owner === who && n.verifier !== who)
      add({ id: `nc:${n.id}`, kind: "Nonconformity", ref: n.id, title: n.title, process: n.process, next: `${n.verifier} to verify the action`, to: `/corrective-action/${n.id}`, area: "Corrective Action" })
  for (const d of state.documents) {
    if (d.withdrawn || (d.owner !== who && d.startedBy !== who)) continue
    const base = { id: `doc:${d.id}`, kind: "Document", ref: d.id, title: d.title, process: d.process, to: `/documents/${d.id}`, area: "Documents" as Area }
    if (d.stage === "Technical review") {
      const left = d.reviewers.filter((n) => n !== who && !d.reviewedBy?.includes(n))
      if (left.length) add({ ...base, next: `${left.join(" and ")} to review revision ${d.rev}` })
    } else if (d.stage === "Approval") {
      const left = d.approvers.filter((n) => n !== who && !d.approvedBy?.includes(n))
      const next = d.approvalMode === "One after another" ? left.slice(0, 1) : left
      if (next.length) add({ ...base, next: `${next.join(d.approvalMode === "Any one of them" ? " or " : " and ")} to approve revision ${d.rev}` })
    } else if (d.stage === "Ready to publish") add({ ...base, next: `A quality manager to publish revision ${d.rev}` })
  }
  for (const r of state.reviews)
    if (r.preparedBy === who && r.stage === "Reviewed" && !(r.changeRequests ?? []).some((c) => !c.resolvedAt)) {
      const missing = r.reviewers.filter((n) => n !== who && !signedBy(r).includes(n))
      if (missing.length) add({ id: `review:${r.id}`, kind: "Management review", ref: r.id, title: r.title, process: "Company-wide", next: `${missing.join(" and ")} to sign off`, to: `/management-review/${r.id}`, area: "Management Review" })
    }
  for (const q of state.questionnaireAssignments)
    if (q.assignedBy === who && q.respondent !== who && (q.status === "Not started" || q.status === "In progress")) {
      const audit = state.audits.find((a) => a.id === q.auditId)
      add({ id: `questionnaire:${q.id}`, kind: "Audit questionnaire", ref: q.auditId, title: `${audit?.process ?? ""} audit questionnaire`.trim(), process: audit?.process ?? "", next: `${q.respondent} to answer by ${formatDate(q.dueDate, { year: false })}`, to: `/audits/${q.auditId}/questionnaires/${q.id}`, area: "Audits" })
    }
  for (const q of state.accessRequests ?? [])
    if (q.person === who && q.status === "Waiting")
      add({ id: `access:${q.id}`, kind: "Access request", ref: q.scope === "Process" ? q.process : q.targetId, title: q.scope === "Process" ? `Shared records in ${q.process}` : `Access to ${q.targetId}`, process: q.process, next: `${q.decider} to decide`, to: `/access-requests/${q.id}`, area: "Overview" })
  return out
}

/** The signed-in person's tasks and waiting records, limited to what they can see. */
export function useMyTasks() {
  const { state: scoped, user, role, can, canSee } = useStore()
  return React.useMemo(() => {
    const state = visibleRecords(scoped, canSee)
    const tasks = myTasks(state, user.name, can, role.id)
    return { tasks, waiting: waitingOnOthers(state, user.name, can), overdue: tasks.filter((t) => taskGroup(t) === "overdue").length }
  }, [scoped, user.name, role.id, can, canSee])
}
