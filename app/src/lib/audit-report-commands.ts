import type { State } from "./store"
import type { Person, Role } from "@/data/types"
import type { AuditReport, AuditReference } from "@/data/audit-types"
import {
  activePerson,
  auditForms,
  formRights,
} from "./audit-form-policy"
import {
  auditAuditee,
  auditLocked,
  latestAuditReport,
  reportProblems,
} from "./audit-report-policy"
import { notifyAudit } from "./questionnaire-workflow"
import { nowIso, todayIso } from "./periods"
import { nextId } from "./ids"
import { blockedReason } from "./auditors"
import { validatedReferences } from "./audit-evidence"
import { allows } from "@/lib/permissions"

export type ReportDraft = Pick<
  AuditReport,
  | "objectives"
  | "scope"
  | "criteria"
  | "evidenceSummary"
  | "summary"
  | "conclusion"
  | "followUp"
>
export type AuditReportCommand =
  | {
      kind: "saveAuditReport"
      auditId: string
      reportId?: string
      draft: ReportDraft
    }
  | {
      kind: "saveAuditContribution"
      auditId: string
      summary: string
      conclusion: string
      followUp: string
    }
  | {
      kind: "saveFindingsPaper"
      auditId: string
      references: AuditReference[]
    }
  | { kind: "issueAuditReport"; auditId: string; reportId: string }
  | {
      kind: "amendAuditReport"
      auditId: string
      reportId: string
      reason: string
    }
export const AUDIT_REPORT_COMMANDS = new Set([
  "saveAuditReport",
  "saveAuditContribution",
  "saveFindingsPaper",
  "issueAuditReport",
  "amendAuditReport",
])

function emptyReport(state: State, auditId: string): AuditReport {
  const a = state.audits.find((a) => a.id === auditId)!
  return {
    id: nextId(
      state.auditReports.map((r) => r.id),
      "AR-",
      5,
    ),
    auditId,
    version: 1,
    status: "Draft",
    objectives: "",
    scope: a.process,
    criteria: a.clauses.map((c) => `Clause ${c}`).join(", "),
    auditors: [a.lead, ...a.auditors],
    auditees: [auditAuditee(state, a)].filter((s): s is string => !!s),
    dates: a.heldDate ?? a.date,
    processes: [a.process],
    evidenceSummary: "",
    conclusion: "",
    followUp: "",
    summary: "",
    contributions: [],
    findingsPaper: [],
  }
}
export function applyAuditReportCommand(
  state: State,
  person: Person,
  role: Role,
  c: AuditReportCommand,
): State {
  const audit = state.audits.find((a) => a.id === c.auditId)
  if (
    !audit ||
    !activePerson(person) ||
    role.access.Audits === "None" ||
    !allows(role, "audits.plan")
  )
    throw Error("This audit is not available.")
  const lead = audit.lead === person.name
  const assigned = lead || audit.auditors.includes(person.name)
  const report = latestAuditReport(state, audit.id)
  const now = nowIso()
  if (
    c.kind === "issueAuditReport" &&
    lead &&
    report?.id === c.reportId &&
    report.status === "Issued"
  )
    return state
  if (c.kind === "amendAuditReport") {
    if (!lead || report?.status !== "Issued" || report.id !== c.reportId)
      throw Error("Only the lead can amend the latest issued report.")
    if (!c.reason.trim())
      throw Error("Explain why the issued report needs an amendment.")
    const draft: AuditReport = {
      ...structuredClone(report),
      id: nextId(
        state.auditReports.map((r) => r.id),
        "AR-",
        5,
      ),
      version: report.version + 1,
      status: "Draft",
      amendmentReason: c.reason.trim(),
      basedOn: report.id,
      issuedAt: undefined,
      issuedBy: undefined,
      snapshot: undefined,
      preparedBy: person.id,
      updatedAt: now,
    }
    return notifyAudit(
      {
        ...state,
        auditReports: [...state.auditReports, draft],
        audits: state.audits.map((a) =>
          a.id === audit.id
            ? { ...a, state: "Findings agreed", reportDate: undefined }
            : a,
        ),
      },
      `report-amendment:${draft.id}`,
      person.name,
      [audit.lead, ...audit.auditors],
      "Audit report amendment started",
      `/audits/${audit.id}/report`,
      c.reason.trim(),
    )
  }
  if (auditLocked(state, audit.id))
    throw Error(
      "This audit is issued and read-only. The lead must start a report amendment first.",
    )
  if (!assigned)
    throw Error(
      "Only the assigned audit team can prepare report contributions.",
    )
  let working = report ?? emptyReport(state, audit.id)
  const save = (next: AuditReport) => ({
    ...state,
    auditReports: [
      ...state.auditReports.filter((r) => r.id !== next.id),
      { ...next, updatedAt: now },
    ],
  })
  const formEditor =
    lead ||
    (["Add and edit", "Manage"].includes(role.access.Audits) &&
      state.auditChecklists.some(
        (f) =>
          f.auditId === audit.id && formRights(state, f, person, role).edit,
      ))
  if (c.kind === "saveFindingsPaper") {
    if (!formEditor)
      throw Error(
        "You need editing access to an audit form to attach the findings paper.",
      )
    const references = validatedReferences(
      state,
      person,
      role,
      c.references,
      audit.process,
    )
    if (
      JSON.stringify(references) === JSON.stringify(working.findingsPaper ?? [])
    )
      return state
    return notifyAudit(
      save({
        ...working,
        findingsPaper: references,
        findingsPaperBy: person.name,
        findingsPaperAt: now,
      }),
      `findings-paper:${working.id}:${now}`,
      person.name,
      [audit.lead],
      "Findings paper updated",
      `/audits/${audit.id}/report`,
    )
  }
  if (c.kind === "saveAuditContribution") {
    if (!formEditor)
      throw Error(
        "You need editing access to an audit form to contribute to its report.",
      )
    if (!c.summary.trim() || !c.conclusion.trim())
      throw Error("Write your contribution summary and conclusion.")
    const previous = working.contributions?.find(
      (x) => x.auditorId === person.id,
    )
    if (
      previous &&
      previous.summary === c.summary.trim() &&
      previous.conclusion === c.conclusion.trim() &&
      previous.followUp === c.followUp.trim()
    )
      return state
    const contribution = {
      auditorId: person.id,
      auditor: person.name,
      summary: c.summary.trim(),
      conclusion: c.conclusion.trim(),
      followUp: c.followUp.trim(),
      at: now,
      history: [
        ...(previous?.history ?? []),
        ...(previous
          ? [
              {
                summary: previous.summary,
                conclusion: previous.conclusion,
                followUp: previous.followUp,
                at: previous.at,
              },
            ]
          : []),
      ],
    }
    return notifyAudit(
      save({
        ...working,
        contributions: [
          ...(working.contributions ?? []).filter(
            (x) => x.auditorId !== person.id,
          ),
          contribution,
        ],
      }),
      `contribution:${working.id}:${person.id}:${now}`,
      person.name,
      [audit.lead],
      "Audit contribution saved",
      `/audits/${audit.id}/report`,
    )
  }
  if (!lead)
    throw Error(
      "Only the lead auditor can edit, consolidate or issue the report.",
    )
  if (c.kind === "saveAuditReport") {
    if (c.reportId && c.reportId !== working.id)
      throw Error("The report changed. Reload before saving.")
    const keys: (keyof ReportDraft)[] = [
      "objectives",
      "scope",
      "criteria",
      "evidenceSummary",
      "summary",
      "conclusion",
      "followUp",
    ]
    if (keys.some((key) => typeof c.draft[key] !== "string"))
      throw Error("Use text for every report field.")
    const draft = Object.fromEntries(
      keys.map((key) => [key, c.draft[key]]),
    ) as ReportDraft
    return save({ ...working, ...draft, preparedBy: person.id })
  }
  if (c.kind !== "issueAuditReport" || c.reportId !== report?.id)
    throw Error("Save the current report draft before issuing.")
  const qualification = state.auditors.find(
    (a) =>
      a.name === person.name &&
      a.status === "Active" &&
      a.level === "Lead auditor",
  )
  if (
    !qualification ||
    blockedReason(qualification, audit.process, state.processes, state.people)
  )
    throw Error("An active, independent lead auditor must issue this report.")
  const problems = reportProblems(state, audit, report)
  if (problems.length) throw Error(problems.join("\n"))
  const forms = state.auditChecklists.filter((c) => c.auditId === audit.id),
    ids = new Set(forms.map((f) => f.id))
  const snapshot: NonNullable<AuditReport["snapshot"]> = structuredClone({
    audit,
    checklist: auditForms(state, audit.id)[0],
    checklists: forms,
    assignments: state.questionnaireAssignments.filter((x) =>
      ids.has(x.checklistId),
    ),
    responses: state.auditeeResponses.filter((x) => ids.has(x.checklistId)),
    assessments: state.auditorAssessments.filter((x) => ids.has(x.checklistId)),
    verifications: state.evidenceVerifications.filter((x) =>
      ids.has(x.checklistId),
    ),
    clarifications: state.clarificationRequests.filter((x) =>
      ids.has(x.checklistId),
    ),
  })
  const issued = {
    ...working,
    auditors: [audit.lead, ...audit.auditors],
    auditees: [auditAuditee(state, audit)].filter((s): s is string => !!s),
    dates: audit.heldDate ?? audit.date,
    processes: [audit.process],
    status: "Issued" as const,
    snapshot,
    issuedBy: person.name,
    issuedAt: now,
  }
  return notifyAudit(
    {
      ...save(issued),
      audits: state.audits.map((a) =>
        a.id === audit.id
          ? {
              ...a,
              state: "Report issued",
              reportDate: todayIso(),
              heldDate: a.heldDate ?? todayIso(),
            }
          : a,
      ),
    },
    `report-issued:${issued.id}`,
    person.name,
    [audit.lead, ...audit.auditors],
    "Audit report issued",
    `/audits/${audit.id}/report?version=${issued.id}`,
  )
}
