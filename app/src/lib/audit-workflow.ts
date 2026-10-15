/** Browser preview domain commands. Production repeats these checks transactionally on the server. */
import type { State } from "./store"
import type { Audit, ChecklistQuestion, ChecklistSection, Person, Role } from "@/data/types"
import type { AuditChecklist, AuditReference } from "@/data/audit-types"
import { blockedReason, involvement, docIdOf } from "./auditors"
import { mayReadReference } from "./audit-evidence"
import { nowIso, todayIso, parseDisplayDate } from "./periods"
export function auditRights(a: Audit, person: Person, role: Role) {
  const active = person.status !== "Deactivated" && (!person.accessEndsOn || person.accessEndsOn >= todayIso())
  const view = active && role.access.Audits !== "None"
  const lead = view && role.id !== "consultant" && a.lead === person.name
  const assigned = view && role.id !== "consultant" && (lead || a.auditors.includes(person.name))
  const manage = view && ["admin", "quality"].includes(role.id)
  return { lead, assigned, manage, edit: role.id !== "consultant" && (assigned || manage) }
}
export function latestChecklist(state: State, auditId: string, released = false) {
  return state.auditChecklists
    .filter((c) => c.auditId === auditId && (!released || c.status === "Released"))
    .sort((a, b) => b.version - a.version)[0]
}
export const questionsOf = (c?: AuditChecklist) => c?.sections.flatMap((s) => s.items) ?? []
export function normalizeQuestion(q: ChecklistQuestion): ChecklistQuestion {
  return {
    ...q,
    respondBy: q.respondBy ?? "Auditor",
    auditeeRequired: q.auditeeRequired ?? false,
    assessmentRequired: q.assessmentRequired ?? q.type !== "Instruction",
    evidenceRule: q.evidenceRule ?? "Optional",
    evidenceEnabled: q.evidenceEnabled ?? q.evidenceRule !== "Not required",
    choices: (q.choices ?? ["Option 1", "Option 2"]).map((c) => c.trim()).filter(Boolean),
    naJustification: q.naJustification ?? true,
  }
}
export function migrateAudits(state: State): State {
  return {
    ...state,
    auditeeResponses: state.auditeeResponses.map((r) =>
      r.status === "Submitted" && !r.submissions?.length
        ? {
            ...r,
            identity: r.identity ?? "Workspace account",
            submissionRevision: 1,
            submittedAt: r.updatedAt,
            submissions: [
              {
                revision: 1,
                value: r.value,
                selectedValues: r.selectedValues,
                explanation: r.explanation,
                naReason: r.naReason,
                evidence: r.evidence,
                submittedAt: r.updatedAt,
                recordedBy: r.recordedBy,
              },
            ],
          }
        : r,
    ),
    audits: state.audits.map((a) => ({
      ...a,
      state:
        a.state === "Checklist ready" &&
        !state.auditChecklists.some((c) => (c.auditId ?? c.id) === a.id && c.status === "Released")
          ? ("Planned" as const)
          : a.state,
      auditee: a.auditee ?? state.processes.find((p) => p.name === a.process)?.owner,
    })),
    people: state.people.map((p) => ({
      ...p,
      accessEndsOn: p.accessEndsOn ?? (p.status === "Guest" ? parseDisplayDate(p.scope.replace(/^Ends /, "")) : undefined),
    })),
    auditChecklists: state.auditChecklists.map((c) => ({
      ...c,
      auditId: c.auditId ?? c.id,
      version: c.version ?? 1,
      usesQuestionnaire: c.usesQuestionnaire ?? false,
      sections: c.sections.map((s) => ({ ...s, items: s.items.map(q => ({ ...normalizeQuestion(q), ...(c.status !== "Released" && q.choices ? { choices: q.choices } : {}) })) })),
    })),
  }
}
export function scopeAuditRecords(scoped: State, all: State, person: Person, role: Role): State {
  const live = person.status !== "Deactivated" && (!person.accessEndsOn || person.accessEndsOn >= todayIso())
  const own =
    live && role.access.Audits !== "None"
      ? all.questionnaireAssignments.filter(
          (a) => !a.invitationId && (a.respondentId ? a.respondentId === person.id : a.respondent === person.name),
        )
      : []
  const rights = (a: Audit) => auditRights(a, person, role)
  const visible = all.audits.filter(
    (a) =>
      live &&
      role.access.Audits !== "None" &&
      (rights(a).assigned ||
        rights(a).manage ||
        (role.id !== "guest-auditor" && role.id !== "auditor" && scoped.audits.some((x) => x.id === a.id))),
  )
  const full = new Set(visible.filter((a) => rights(a).assigned || rights(a).manage).map((a) => a.id))
  const headers = all.audits.filter((a) => own.some((x) => x.auditId === a.id))
  const checklistAccess = all.auditChecklists.flatMap((c) => {
    if (full.has(c.auditId)) return [c]
    const assigned = own.filter((a) => a.checklistId === c.id)
    if (!assigned.length) return []
    const ids = new Set(assigned.flatMap((a) => a.questionIds))
    return [
      {
        ...c,
        sections: c.sections.map((s) => ({ ...s, items: s.items.filter((q) => ids.has(q.id)) })).filter((s) => s.items.length),
      },
    ]
  })
  const questionAccess = (auditId: string, questionId: string) => {
    const a = all.audits.find((a) => a.id === auditId)
    return (
      !!a &&
      (rights(a).lead ||
        rights(a).manage ||
        (rights(a).assigned &&
          all.auditChecklists.some(
            (c) => c.auditId === auditId && questionsOf(c).some((q) => q.id === questionId && q.askedBy === person.name),
          )))
    )
  }
  const related = new Set<string>()
  for (const c of checklistAccess)
    for (const q of questionsOf(c)) if (questionAccess(c.auditId, q.id)) for (const text of q.evidence) related.add(docIdOf(text))
  for (const r of all.auditeeResponses)
    if (
      questionAccess(r.auditId, r.questionId) ||
      all.questionnaireAssignments.some(
        (a) =>
          a.id === r.assignmentId &&
          !a.invitationId &&
          (a.respondentId ? a.respondentId === person.id : a.respondent === person.name),
      )
    )
      for (const ref of r.evidence) if (ref.id) related.add(ref.id)
  for (const r of all.auditorAssessments)
    if (questionAccess(r.auditId, r.questionId)) for (const ref of r.evidence) if (ref.id) related.add(ref.id)
  const processGrant = (processes: string[]) => all.audits.find((a) => full.has(a.id) && processes.includes(a.process))?.process
  const extraDocs = all.documents.filter(
    (d) =>
      related.has(d.id) &&
      mayReadReference(
        all,
        person,
        role,
        { kind: "document", id: d.id, title: d.title, addedBy: "", addedAt: "" },
        processGrant([d.process]),
      ),
  )
  const extraEvidence = all.evidence.filter(
    (e) =>
      related.has(e.id) &&
      mayReadReference(
        all,
        person,
        role,
        { kind: "evidence", id: e.id, title: e.title, addedBy: "", addedAt: "" },
        processGrant(e.processes),
      ),
  )
  const linkedNc =
    role.access["Corrective Action"] === "None"
      ? []
      : all.ncs.filter((n) => all.auditFindings.some((f) => questionAccess(f.auditId, f.questionId) && f.ncId === n.id))
  scoped = {
    ...scoped,
    documents: [...new Map([...scoped.documents, ...extraDocs].map((d) => [d.id, d])).values()],
    evidence: [...new Map([...scoped.evidence, ...extraEvidence].map((e) => [e.id, e])).values()],
    ncs: [...new Map([...scoped.ncs, ...linkedNc].map((n) => [n.id, n])).values()],
  }
  const linked = related
  const guestScope =
    role.id === "guest-auditor"
      ? {
          ...scoped,
          processes: scoped.processes.filter((p) => visible.some((a) => a.process === p.name)),
          documents: scoped.documents.filter((d) => linked.has(d.id)),
          evidence: scoped.evidence.filter((e) => linked.has(e.id)),
          objectives: [],
          risks: [],
          ncs:
            role.access["Corrective Action"] === "None"
              ? []
              : scoped.ncs.filter((n) =>
                  all.auditFindings.some((f) => questionAccess(f.auditId, f.questionId) && f.ncId === n.id),
                ),
          reviews: [],
          reviewActions: [],
          reviewRecordChecks: [],
          reviewEvaluations: [],
          issues: [],
          parties: [],
          policies: [],
          requirements: [],
          remarks: [],
        }
      : scoped
  const scrubRef = (ref: AuditReference, process?: string): AuditReference =>
    mayReadReference(all, person, role, ref, process)
      ? ref
      : { kind: ref.kind, id: ref.id, title: "Not available", addedBy: "", addedAt: "", responseRevision: ref.responseRevision }
  const scrubResponse = (r: State["auditeeResponses"][number]) => {
    const process = full.has(r.auditId) ? all.audits.find((a) => a.id === r.auditId)?.process : undefined
    return {
      ...r,
      evidence: r.evidence.map((ref) => scrubRef(ref, process)),
      history: r.history.map((h) => ({ ...h, evidence: h.evidence.map((ref) => scrubRef(ref, process)) })),
      submissions: r.submissions?.map((sub) => ({ ...sub, evidence: sub.evidence.map((ref) => scrubRef(ref, process)) })),
    }
  }
  return {
    ...guestScope,
    audits: [...visible, ...headers.filter((a) => !visible.some((x) => x.id === a.id))],
    auditChecklists: checklistAccess,
    templates: !live || role.access.Audits === "None" || role.id === "guest-auditor" ? [] : scoped.templates,
    questionnaireInvitations: all.questionnaireInvitations.filter((i) => {
      const a = all.audits.find((a) => a.id === i.auditId)
      return !!a && (rights(a).lead || rights(a).manage)
    }),
    questionnaireAssignments: all.questionnaireAssignments.filter(
      (a) => (full.has(a.auditId) && a.questionIds.some((q) => questionAccess(a.auditId, q))) || own.some((x) => x.id === a.id),
    ),
    auditeeResponses: all.auditeeResponses
      .filter((r) => (own.some((a) => a.id === r.assignmentId) && live) || questionAccess(r.auditId, r.questionId))
      .map(scrubResponse),
    auditorAssessments: all.auditorAssessments
      .filter((r) => questionAccess(r.auditId, r.questionId))
      .map((r) => ({
        ...r,
        evidence: r.evidence.map((ref) => scrubRef(ref, all.audits.find((a) => a.id === r.auditId)?.process)),
      })),
    evidenceVerifications: all.evidenceVerifications
      .filter((r) => questionAccess(r.auditId, r.questionId))
      .map((r) => ({ ...r, reference: scrubRef(r.reference, all.audits.find((a) => a.id === r.auditId)?.process) })),
    clarificationRequests: all.clarificationRequests.filter(
      (r) => own.some((a) => a.id === r.assignmentId) || questionAccess(r.auditId, r.questionId),
    ),
    auditFindings: all.auditFindings
      .filter((r) => questionAccess(r.auditId, r.questionId))
      .map((r) => ({
        ...r,
        evidence: r.evidence.map((ref) => scrubRef(ref, all.audits.find((a) => a.id === r.auditId)?.process)),
      })),
    auditReports: all.auditReports.filter((r) => {
      const a = all.audits.find((a) => a.id === r.auditId)
      return !!a && full.has(r.auditId) && (r.status === "Issued" || rights(a).lead || rights(a).manage)
    }),
  }
}
import { applyQuestionnaireCommand, QUESTIONNAIRE_COMMANDS, type QuestionnaireCommand } from "./questionnaire-workflow"
import { applyExecutionCommand, EXECUTION_COMMANDS, type ExecutionCommand } from "./audit-execution"
import { applyInvitationCommand, INVITATION_COMMANDS, type InvitationCommand } from "./questionnaire-invitations"
export type AuditCommand =
  | QuestionnaireCommand
  | ExecutionCommand
  | InvitationCommand
  | { kind: "saveChecklist"; auditId: string; id: string; sections: ChecklistSection[]; usesQuestionnaire: boolean }
  | { kind: "releaseChecklist"; auditId: string; id: string; sections: ChecklistSection[]; usesQuestionnaire: boolean }
  | { kind: "reviseChecklist"; auditId: string; id: string; reason: string }
export function applyAuditCommand(state: State, person: Person, role: Role, command: AuditCommand): State {
  if (INVITATION_COMMANDS.has(command.kind)) return applyInvitationCommand(state, person, role, command as InvitationCommand)
  if (EXECUTION_COMMANDS.has(command.kind)) return applyExecutionCommand(state, person, role, command as ExecutionCommand)
  if (QUESTIONNAIRE_COMMANDS.has(command.kind))
    return applyQuestionnaireCommand(state, person, role, command as QuestionnaireCommand)
  const c = command as Exclude<AuditCommand, QuestionnaireCommand | ExecutionCommand | InvitationCommand>
  return applyChecklistCommand(state, person, role, c)
}
function applyChecklistCommand(
  state: State,
  person: Person,
  role: Role,
  command: Exclude<AuditCommand, QuestionnaireCommand | ExecutionCommand | InvitationCommand>,
): State {
  const a = state.audits.find((a) => a.id === command.auditId)
  if (!a) throw Error("This audit is not available.")
  const rights = auditRights(a, person, role)
  if (state.auditReports.some((r) => r.auditId === a.id && r.status === "Issued"))
    throw Error("The issued audit is read-only. Start an amendment before changing its checklist.")
  if (!rights.edit) throw Error("Only the assigned audit team can change this checklist.")
  const latest = latestChecklist(state, a.id)
  if (command.kind === "reviseChecklist") {
    if (!rights.lead) throw Error("Only the lead auditor can start a revision.")
    if (!command.reason.trim()) throw Error("Explain why the checklist needs a revision.")
    if (!latest || latest.status !== "Released") throw Error("Finish the current draft first.")
    return {
      ...state,
      auditChecklists: [
        ...state.auditChecklists,
        {
          ...structuredClone(latest),
          id: command.id,
          version: latest.version + 1,
          status: "Revised",
          releasedAt: undefined,
          releasedBy: undefined,
          revisionReason: command.reason.trim(),
          basedOn: latest.id,
        },
      ],
    }
  }
  if (latest?.status === "Released") throw Error("Released checklists cannot be edited. Start a revision.")
  if (latest && latest.id !== command.id) throw Error("The checklist changed. Reload before saving.")
  const sections = structuredClone(command.sections).map((s) => ({ ...s, items: s.items.map(q => ({ ...normalizeQuestion(q), ...(command.kind === "saveChecklist" && q.choices ? { choices: q.choices } : {}) })) }))
  if (command.kind === "releaseChecklist") {
    if (!rights.lead) throw Error("Only the lead auditor can release the checklist.")
    const ids = sections.flatMap((s) => s.items.map((q) => q.id))
    if (new Set(ids).size !== ids.length) throw Error("Each checklist question needs a unique identifier.")
    const questions = sections.flatMap((s) => s.items).filter((q) => q.type !== "Instruction")
    if (!questions.length || questions.some((q) => !q.text.trim() || !q.askedBy || ![a.lead, ...a.auditors].includes(q.askedBy)))
      throw Error("Add a question and assign each question to an audit team member.")
    if (
      questions.some(
        (q) =>
          ["Multiple choice", "Multiple select"].includes(q.type) &&
          new Set(q.choices?.map((c) => c.trim()).filter(Boolean)).size < 2,
      )
    )
      throw Error("Give each multiple choice question at least two choices.")
    if (
      questions.some(
        (q) => ["Multiple choice", "Multiple select"].includes(q.type) && new Set(q.choices).size !== q.choices?.length,
      )
    )
      throw Error("Each choice must be different.")
    if (questions.some((q, i) => q.showWhen && !questions.slice(0, i).some((parent) => parent.id === q.showWhen!.questionId)))
      throw Error("Choose an earlier question for conditional visibility.")
    if (questions.some((q) => q.showWhen && !questions.some((other) => other.id === q.showWhen!.questionId && other.id !== q.id)))
      throw Error("Choose an earlier valid question for conditional visibility.")
  }
  const checklist: AuditChecklist = {
    ...latest,
    id: command.id,
    auditId: a.id,
    version: latest?.version ?? 1,
    sections,
    usesQuestionnaire: command.usesQuestionnaire,
    status: command.kind === "releaseChecklist" ? "Released" : (latest?.status ?? "Draft"),
    ...(command.kind === "releaseChecklist" ? { releasedAt: nowIso(), releasedBy: person.name } : {}),
  }
  return {
    ...state,
    auditChecklists: [...state.auditChecklists.filter((c) => c.id !== checklist.id), checklist],
    audits: state.audits.map((x) =>
      x.id === a.id && command.kind === "releaseChecklist" ? { ...x, state: "Checklist ready" } : x,
    ),
  }
}

export function assessmentBlockReason(
  state: State,
  audit: Audit,
  question: ChecklistQuestion,
  person: Person,
  role: Role,
): string | undefined {
  const rights = auditRights(audit, person, role)
  if (!rights.assigned || question.askedBy !== person.name)
    return `Assigned to ${question.askedBy}; only that auditor can assess this question.`
  const auditor = state.auditors.find((a) => a.name === person.name && a.status === "Active")
  if (!auditor) return "An active auditor qualification is required."
  const why = blockedReason(auditor, audit.process, state.processes, state.people)
  if (why) return `Not independent: ${why.toLowerCase()}.`
  const docIds = [
    ...question.evidence.map(docIdOf),
    ...state.auditeeResponses
      .filter((r) => r.auditId === audit.id && r.questionId === question.id)
      .flatMap((r) => r.evidence.filter((e) => e.kind === "document").map((e) => e.id!)),
  ]
  for (const id of docIds) {
    const doc = state.documents.find((d) => d.id === id)
    const how = involvement(person.name, doc)
    if (how) return `Not independent: you ${how} document ${id}.`
  }
  return undefined
}
