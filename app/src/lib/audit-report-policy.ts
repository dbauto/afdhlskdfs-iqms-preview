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
export function auditFindingsForReport(state: State, auditId: string) {
  return state.auditFindings.filter((f) => f.auditId === auditId)
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
    role.id !== "consultant" &&
    (audit.lead === person.name ||
      ["admin", "quality"].includes(role.id) ||
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
  const findings = auditFindingsForReport(state, audit.id)
  const problems: string[] = []
  if (!forms.length) problems.push("Add and complete at least one audit form.")
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
  if (findings.some((f) => f.status !== "Final"))
    problems.push("Record the auditee’s response and finalize every finding.")
  if (
    findings.some(
      (f) =>
        ["Minor NC", "Major NC"].includes(f.classification) &&
        f.disposition?.outcome !== "Withdrawn" &&
        !f.ncId,
    )
  )
    problems.push("Link each nonconformity to Corrective Action.")
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
  if (
    findings.some((f) => !report?.decisions?.some((d) => d.findingId === f.id))
  )
    problems.push(
      "Review each finding and record whether to include it or merge it with a duplicate.",
    )
  for (const decision of report?.decisions ?? []) {
    if (!findings.some((f) => f.id === decision.findingId)) {
      problems.push("Refresh editorial decisions for this audit’s findings.")
      continue
    }
    const finding = findings.find((f) => f.id === decision.findingId)!
    if (decision.findingRevision !== (finding.history?.length ?? 0))
      problems.push("Review editorial decisions again after a finding changes.")
    if (
      finding.disposition?.outcome === "Withdrawn"
        ? decision.action !== "Exclude" || !decision.reason.trim()
        : decision.action === "Exclude"
    )
      problems.push(
        "Exclude withdrawn findings with a reason; keep confirmed findings in the report.",
      )
    if (decision.action === "Merge") {
      const target = findings.find((f) => f.id === decision.targetId)
      const source = findings.find((f) => f.id === decision.findingId)!
      if (
        !target ||
        target.id === source.id ||
        target.classification !== source.classification ||
        target.clause !== source.clause ||
        !report?.decisions?.some(
          (d) => d.findingId === target.id && d.action === "Include",
        ) ||
        !decision.reason.trim()
      )
        problems.push(
          "Each duplicate must point directly to an included finding of the same clause and classification, with a reason.",
        )
    }
  }
  return [...new Set(problems)]
}
export function auditStage(state: State, audit: Audit): Audit["state"] {
  if (auditLocked(state, audit.id)) return "Report issued"
  const forms = auditForms(state, audit.id)
  const started =
    !!audit.heldDate ||
    state.auditorAssessments.some(
      (a) => a.auditId === audit.id && a.status === "Completed",
    ) ||
    state.questionnaireAssignments.some(
      (a) =>
        a.auditId === audit.id &&
        ["Submitted", "Resubmitted"].includes(a.status),
    )
  if (!forms.length) return started ? "Held" : "Planned"
  if (
    forms.every((c) => c.status === "Released" && !!c.completedAt) &&
    auditFindingsForReport(state, audit.id).every((f) => f.status === "Final")
  )
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
