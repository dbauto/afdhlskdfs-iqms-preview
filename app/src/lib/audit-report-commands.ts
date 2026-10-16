import type { State } from "./store"
import type { Person, Role } from "@/data/types"
import type { AuditReport, AuditFinding } from "@/data/audit-types"
import {
  activePerson,
  auditForms,
  formRights,
  findingReviewLocked,
} from "./audit-form-policy"
import {
  auditAuditee,
  auditLocked,
  auditFindingsForReport,
  latestAuditReport,
  reportProblems,
} from "./audit-report-policy"
import { notifyAudit } from "./questionnaire-workflow"
import { nowIso, todayIso } from "./periods"
import { nextId } from "./ids"
import { blockedReason } from "./auditors"

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
      kind: "decideReportFinding"
      auditId: string
      findingId: string
      action: "Include" | "Merge" | "Exclude"
      targetId?: string
      reason: string
    }
  | { kind: "issueAuditReport"; auditId: string; reportId: string }
  | {
      kind: "amendAuditReport"
      auditId: string
      reportId: string
      reason: string
    }
  | { kind: "requestFindingReview"; auditId: string; findingId: string }
  | {
      kind: "respondToFinding"
      auditId: string
      findingId: string
      decision: "Agreed" | "Disputed"
      comment: string
    }
  | {
      kind: "finalizeAuditFinding"
      auditId: string
      findingId: string
      reason: string
      outcome?: "Confirmed" | "Withdrawn"
    }
  | {
      kind: "updateAuditFinding"
      auditId: string
      findingId: string
      title: string
      facts: string
      requirement: string
      clause: string
      owner: string
    }
  | {
      kind: "reopenAuditFinding"
      auditId: string
      findingId: string
      reason: string
    }
export const AUDIT_REPORT_COMMANDS = new Set([
  "saveAuditReport",
  "saveAuditContribution",
  "decideReportFinding",
  "issueAuditReport",
  "amendAuditReport",
  "requestFindingReview",
  "respondToFinding",
  "finalizeAuditFinding",
  "reopenAuditFinding",
  "updateAuditFinding",
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
    decisions: [],
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
    role.id === "consultant"
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
  if ("findingId" in c && c.kind !== "decideReportFinding") {
    const finding = auditFindingsForReport(state, audit.id).find(
      (f) => f.id === c.findingId,
    )
    if (!finding) throw Error("Choose a finding from this audit.")
    const form = state.auditChecklists.find(
      (f) => f.id === finding.checklistId,
    )!
    if (findingReviewLocked(form))
      throw Error("Reopen the form’s completion before changing its findings.")
    const updateFinding = (
      patch: Partial<AuditFinding>,
      action: string,
      comment = "",
    ) => ({
      ...state,
      auditFindings: state.auditFindings.map((f) =>
        f.id === finding.id
          ? {
              ...f,
              ...patch,
              history: [
                ...(f.history ?? []),
                { action, comment, by: person.name, at: now },
              ],
            }
          : f,
      ),
    })
    if (c.kind === "updateAuditFinding") {
      if (
        form.withdrawnAt ||
        state.auditChecklists.some(
          (c) =>
            c.auditId === audit.id &&
            c.formId === form.formId &&
            c.version > form.version,
        )
      )
        throw Error(
          "Earlier and withdrawn form content stays unchanged; use its finding review to record disposition.",
        )
      if (
        (!lead && (!assigned || finding.auditor !== person.name)) ||
        !formRights(state, form, person, role).edit ||
        finding.status !== "Draft" ||
        finding.reviewRequestedAt
      )
        throw Error(
          "Only the responsible auditor or lead can edit a draft finding; reopen a reviewed finding first.",
        )
      if (
        !c.title.trim() ||
        !c.facts.trim() ||
        !c.requirement.trim() ||
        !audit.clauses.includes(c.clause) ||
        !activePerson(state.people.find((p) => p.name === c.owner))
      )
        throw Error(
          "Complete the title, requirement, facts, applicable clause and active owner.",
        )
      const patch = {
        title: c.title.trim(),
        facts: c.facts.trim(),
        requirement: c.requirement.trim(),
        clause: c.clause,
        owner: c.owner,
      }
      if (
        Object.entries(patch).every(
          ([k, value]) => finding[k as keyof typeof patch] === value,
        )
      )
        return state
      return updateFinding(
        {
          ...patch,
          revisions: [
            ...(finding.revisions ?? []),
            {
              title: finding.title,
              facts: finding.facts,
              requirement: finding.requirement,
              clause: finding.clause,
              owner: finding.owner,
              by: person.name,
              at: now,
            },
          ],
        },
        "Finding edited",
        "Earlier facts retained in finding history.",
      )
    }
    if (c.kind === "respondToFinding") {
      if (
        person.name !== auditAuditee(state, audit) ||
        !finding.reviewRequestedAt
      )
        throw Error(
          "Only the designated auditee can respond to a finding sent for review.",
        )
      if (finding.status === "Final")
        throw Error(
          "This finding is final. Ask the lead to reopen it before changing your response.",
        )
      if (
        !["Agreed", "Disputed"].includes(c.decision) ||
        (c.decision === "Disputed" && !c.comment.trim())
      )
        throw Error("Explain a disputed finding.")
      if (
        finding.discussion?.personId === person.id &&
        finding.discussion.decision === c.decision &&
        finding.discussion.comment === c.comment.trim()
      )
        return state
      const next = updateFinding(
        {
          status: c.decision === "Agreed" ? "Agreed" : "Draft",
          discussion: {
            decision: c.decision,
            comment: c.comment.trim(),
            by: person.name,
            personId: person.id,
            at: now,
          },
        },
        c.decision,
        c.comment.trim(),
      )
      return notifyAudit(
        next,
        `finding-response:${finding.id}:${now}`,
        person.name,
        [audit.lead, finding.auditor],
        "Auditee responded to a finding",
        `/audits/findings/${finding.id}`,
      )
    }
    if (!lead || !formRights(state, form, person, role).view)
      throw Error(
        "Only the lead auditor coordinates finding review and final disposition.",
      )
    if (c.kind === "requestFindingReview") {
      if (finding.status === "Final")
        throw Error("Reopen the finding before requesting another review.")
      const auditee = state.people.find(
        (p) => p.name === auditAuditee(state, audit),
      )
      if (
        !activePerson(auditee) ||
        state.roles.find((r) => r.id === auditee!.roleId)?.access.Audits ===
          "None"
      )
        throw Error(
          "Choose an active auditee with audit access in the audit plan first.",
        )
      if (finding.reviewRequestedAt) return state
      return notifyAudit(
        updateFinding({ reviewRequestedAt: now }, "Review requested"),
        `finding-review:${finding.id}:${now}`,
        person.name,
        [auditee!.name],
        "An audit finding needs your response",
        `/audits/findings/${finding.id}`,
      )
    }
    if (c.kind === "reopenAuditFinding") {
      if (!c.reason.trim())
        throw Error("Explain why this finding is being reopened.")
      return updateFinding(
        {
          status: "Draft",
          reviewRequestedAt: undefined,
          discussion: undefined,
          disposition: undefined,
        },
        "Reopened",
        c.reason.trim(),
      )
    }
    if (finding.status === "Final") return state
    if (!finding.discussion)
      throw Error(
        "Ask the auditee to agree or dispute the finding before finalizing it.",
      )
    if (finding.discussion.decision === "Disputed" && !c.reason.trim())
      throw Error("Record the lead’s resolution of the auditee’s disagreement.")
    const outcome = c.outcome ?? "Confirmed"
    if (
      !["Confirmed", "Withdrawn"].includes(outcome) ||
      (outcome === "Withdrawn" && !c.reason.trim())
    )
      throw Error("Record a reason to withdraw a finding.")
    if (
      ["Minor NC", "Major NC"].includes(finding.classification) &&
      !finding.ncId &&
      outcome !== "Withdrawn"
    )
      throw Error("Link this nonconformity to Corrective Action first.")
    return updateFinding(
      {
        status: "Final",
        disposition: {
          outcome,
          reason: c.reason.trim(),
          by: person.name,
          at: now,
        },
      },
      "Finalized",
      c.reason.trim(),
    )
  }
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
  if (c.kind === "saveAuditContribution") {
    if (
      !lead &&
      (!["Add and edit", "Manage"].includes(role.access.Audits) ||
        !state.auditChecklists.some(
          (f) =>
            f.auditId === audit.id && formRights(state, f, person, role).edit,
        ))
    )
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
  if (c.kind === "decideReportFinding") {
    const findings = auditFindingsForReport(state, audit.id),
      source = findings.find((f) => f.id === c.findingId)
    if (!source || source.status !== "Final")
      throw Error("Finalize this finding before making the editorial decision.")
    if (!["Include", "Merge", "Exclude"].includes(c.action))
      throw Error("Choose a valid editorial decision.")
    if (
      c.action === "Exclude" &&
      (source.disposition?.outcome !== "Withdrawn" || !c.reason.trim())
    )
      throw Error(
        "Only a withdrawn finding can be excluded, with a recorded reason.",
      )
    if (c.action !== "Exclude" && source.disposition?.outcome === "Withdrawn")
      throw Error("Record this withdrawn finding as excluded, with its reason.")
    const priorDecision = working.decisions?.find(
      (d) => d.findingId === source.id,
    )
    if (
      priorDecision?.action === c.action &&
      (priorDecision.targetId ?? "") ===
        (c.action === "Merge" ? (c.targetId ?? "") : "") &&
      priorDecision.reason === c.reason.trim() &&
      priorDecision.findingRevision === (source.history?.length ?? 0)
    )
      return state
    if (c.action === "Merge") {
      const target = findings.find((f) => f.id === c.targetId)
      if (
        !target ||
        target.id === source.id ||
        target.classification !== source.classification ||
        target.disposition?.outcome === "Withdrawn" ||
        target.clause !== source.clause ||
        !c.reason.trim()
      )
        throw Error(
          "Choose a different finding of the same clause and classification, and explain the duplicate.",
        )
      if (
        working.decisions?.some(
          (d) => d.action === "Merge" && d.targetId === source.id,
        )
      )
        throw Error(
          "This finding already contains duplicates; keep it included or review those decisions first.",
        )
    }
    const decisions = [
      ...(working.decisions ?? []).filter((d) => d.findingId !== source.id),
      {
        findingId: source.id,
        findingRevision: source.history?.length ?? 0,
        action: c.action,
        targetId: c.action === "Merge" ? c.targetId : undefined,
        reason: c.reason.trim(),
        by: person.name,
        at: now,
      },
    ]
    return save({
      ...working,
      decisions,
      decisionHistory: [
        ...(working.decisionHistory ?? []),
        ...(working.decisions ?? []).filter((d) => d.findingId === source.id),
      ],
    })
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
    findings: auditFindingsForReport(state, audit.id),
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
