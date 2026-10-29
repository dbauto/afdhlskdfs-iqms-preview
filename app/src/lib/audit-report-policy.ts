import type { Audit, Person, Role } from "@/data/types"
import type { AuditReport } from "@/data/audit-types"
import type { State } from "./store"
import {
  activePerson,
  auditForms,
  formCompletionProblems,
  formRights,
} from "./audit-form-policy"
import { todayIso } from "./periods"
import { allows } from "@/lib/permissions"

export const latestAuditReport = (state: State, auditId: string) =>
  state.auditReports
    .filter((r) => r.auditId === auditId)
    .sort((a, b) => b.version - a.version)[0]
export function auditLocked(state: State, auditId: string) {
  const report = latestAuditReport(state, auditId)
  return report
    ? report.status === "Issued"
    : state.audits.find((a) => a.id === auditId)?.state === "Report issued"
}
/**
 * Observations and nonconformities on the audit's checklists: the latest completed result per question.
 * Current forms show both; withdrawn and earlier form versions keep their nonconformities, which still need corrective action.
 */
export function auditResultIssues(
  state: Pick<State, "auditChecklists" | "auditorAssessments">,
  auditId: string,
) {
  const current = new Set(auditForms(state, auditId).map((c) => c.id))
  return state.auditChecklists
    .filter(
      (c) =>
        c.auditId === auditId &&
        c.kind !== "Questionnaire" &&
        c.status === "Released",
    )
    .sort((a, b) => Number(current.has(b.id)) - Number(current.has(a.id)))
    .flatMap((form) =>
      form.sections
        .flatMap((s) => s.items)
        .flatMap((question) => {
          const assessment = state.auditorAssessments
            .filter((a) => a.checklistId === form.id && a.questionId === question.id)
            .at(-1)
          const isCurrent = current.has(form.id)
          return assessment?.status === "Completed" &&
            (["Minor NC", "Major NC"].includes(assessment.result) ||
              (isCurrent && assessment.result === "Observation"))
            ? [{ form, question, assessment, current: isCurrent }]
            : []
        }),
    )
}
export function auditAuditee(state: State, audit: Audit) {
  return (
    audit.auditee ??
    state.processes.find((p) => p.name === audit.process)?.owner
  )
}
export function mayReadFullReport(
  state: State,
  audit: Audit,
  person: Person,
  role: Role,
  report?: AuditReport,
) {
  const forms =
    report?.snapshot?.checklists ??
    (report?.snapshot
      ? [report.snapshot.checklist]
      : state.auditChecklists.filter((c) => c.auditId === audit.id))
  return (
    activePerson(person) &&
    role.access.Audits !== "None" &&
    allows(role, "audits.plan") &&
    (audit.lead === person.name ||
      allows(role, "audits.release") ||
      (audit.auditors.includes(person.name) &&
        forms.length > 0 &&
        forms.every((c) => formRights(state, c, person, role).view)))
  )
}
export function reportProblems(
  state: State,
  audit: Audit,
  report?: AuditReport,
): string[] {
  const forms = auditForms(state, audit.id)
  const problems: string[] = []
  if (!forms.some((c) => c.kind !== "Questionnaire"))
    problems.push("Add a checklist and record its results.")
  for (const c of forms) {
    if (c.status !== "Released")
      problems.push(`Mark “${c.title ?? c.id}” ready.`)
    else if (!c.completedAt)
      problems.push(
        `Complete “${c.title ?? c.id}” and its configured approval route.`,
      )
    for (const issue of formCompletionProblems(state, c))
      problems.push(`${c.title ?? c.id}: ${issue}`)
  }
  for (const { form, question, assessment, current } of auditResultIssues(state, audit.id))
    if (!current && !assessment.ncId)
      problems.push(
        `Raise or link corrective action for the nonconformity on “${question.text}” in the ${form.withdrawnAt ? "withdrawn" : "earlier version of"} form “${form.title ?? form.id}”.`,
      )
  if (!report?.findingsPaper?.length)
    problems.push("Attach the findings paper as a link.")
  if (!report?.summary.trim() || !report.conclusion.trim())
    problems.push("Write the report summary and conclusion.")
  if (
    !report?.objectives.trim() ||
    !report.scope.trim() ||
    !report.criteria.trim() ||
    !report.evidenceSummary.trim()
  )
    problems.push(
      "Complete the report objectives, scope, criteria and evidence summary.",
    )
  const contributors = new Set(
    state.auditorAssessments
      .filter((x) => x.auditId === audit.id)
      .map((x) => x.auditor),
  )
  for (const auditor of contributors)
    if (
      !report?.contributions?.some(
        (c) => c.auditor === auditor && c.summary.trim() && c.conclusion.trim(),
      )
    )
      problems.push(`Ask ${auditor} to save their audit contribution.`)
  return [...new Set(problems)]
}
export function auditStage(state: State, audit: Audit): Audit["state"] {
  if (auditLocked(state, audit.id)) return "Report issued"
  const forms = auditForms(state, audit.id)
  // Questionnaire responses are collected before the audit and never mark it held.
  const started =
    !!audit.heldDate ||
    state.auditorAssessments.some(
      (a) => a.auditId === audit.id && a.status === "Completed",
    )
  if (!forms.length) return started ? "Held" : "Planned"
  // Stored as "Findings agreed" for compatibility; shown as "Results complete".
  if (forms.every((c) => c.status === "Released" && !!c.completedAt))
    return "Findings agreed"
  if (started) return "Held"
  return forms.some((c) => c.status !== "Released")
    ? "Planned"
    : "Checklist ready"
}

export const reportLate = (state: State, audit: Audit) =>
  !auditLocked(state, audit.id) &&
  !!audit.reportDueDate &&
  audit.reportDueDate < todayIso()
