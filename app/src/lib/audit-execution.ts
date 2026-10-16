import { formKey, formRights, formWorkLocked, findingReviewLocked } from "./audit-form-policy"
import type { State } from "./store"
import { ACCESS_LEVELS, type Person, type Role } from "@/data/types"
import type { AuditFinding, AuditorAssessment, AuditReference, EvidenceVerification } from "@/data/audit-types"
import { auditRights, latestChecklist, questionsOf, assessmentBlockReason } from "./audit-workflow"
import { nextId } from "./ids"
import { addDays, nowIso, todayIso, isIsoDate } from "./periods"
import { notifyAudit, responseProblems } from "./questionnaire-workflow"
import { referenceKey, validatedReferences } from "./audit-evidence"
import { involvement } from "./auditors"
import { questionVisible } from "./questionnaire-workflow"
import { RULES } from "./rules"
export type AssessmentDraft = Pick<
  AuditorAssessment,
  "result" | "answer" | "selectedValues" | "objectiveEvidence" | "sampling" | "interviewee" | "notes" | "evidence" | "status"
>
export type ExecutionCommand =
  | { kind: "saveAssessment"; auditId: string; checklistId: string; questionId: string; draft: AssessmentDraft }
  | {
      kind: "verifyAuditEvidence"
      auditId: string
      checklistId: string
      questionId: string
      reference: AuditReference
      status: EvidenceVerification["status"]
      notes: string
      unavailable?: boolean
    }
  | {
      kind: "raiseAuditFinding"
      auditId: string
      assessmentId: string
      title: string
      facts: string
      requirement: string
      clause: string
      owner: string
      classification: AuditFinding["classification"]
    }
  | {
      kind: "createFindingNc"
      auditId: string
      findingId: string
      id: string
      title: string
      details: string
      owner: string
      containment: string
      dueDate: string
    }
  | { kind: "linkFindingNc"; auditId: string; findingId: string; ncId: string }
export const EXECUTION_COMMANDS = new Set([
  "saveAssessment",
  "verifyAuditEvidence",
  "raiseAuditFinding",
  "createFindingNc",
  "linkFindingNc",
])
export function executionQuestionVisible(state: State, checklistId: string, questionId: string) {
  const checklist = state.auditChecklists.find((c) => c.id === checklistId),
    qs = questionsOf(checklist),
    q = qs.find((q) => q.id === questionId)
  if (!q) return false
  if (!q.showWhen) return true
  const auditorValues = Object.fromEntries(
    qs.map((q) => {
      const a = latestAssessment(state, checklistId, q.id)
      return [q.id, a?.selectedValues ?? a?.answer ?? ""]
    }),
  )
  if (questionVisible(q, qs, auditorValues)) return true
  return state.questionnaireAssignments
    .filter((a) => a.checklistId === checklistId)
    .some((a) => {
      const answers = state.auditeeResponses.filter((r) => r.assignmentId === a.id && r.status === "Submitted")
      return questionVisible(q, qs, Object.fromEntries(answers.map((r) => [r.questionId, r.selectedValues ?? r.value])))
    })
}
export function latestAssessment(state: State, checklistId: string, questionId: string) {
  return state.auditorAssessments.filter((a) => a.checklistId === checklistId && a.questionId === questionId).at(-1)
}
export function questionReferences(state: State, checklistId: string, questionId: string): AuditReference[] {
  const c = state.auditChecklists.find((c) => c.id === checklistId),
    q = questionsOf(c).find((q) => q.id === questionId)
  const linked: AuditReference[] = (q?.evidence ?? []).flatMap((text) => {
    const id = text.split(" ")[0],
      d = state.documents.find((d) => d.id === id),
      e = state.evidence.find((e) => e.id === id)
    return d || e
      ? [
          {
            kind: d ? ("document" as const) : ("evidence" as const),
            id,
            title: d?.title ?? e!.title,
            addedBy: c?.releasedBy ?? "",
            addedAt: c?.releasedAt ?? "",
          },
        ]
      : []
  })
  return [
    ...new Map(
      [
        ...linked,
        ...state.auditeeResponses
          .filter((r) => r.checklistId === checklistId && r.questionId === questionId)
          .flatMap((r) => r.evidence),
        ...(latestAssessment(state, checklistId, questionId)?.evidence ?? []),
      ].map((r) => [referenceKey(r), r]),
    ).values(),
  ]
}
export function applyExecutionCommand(state: State, person: Person, role: Role, c: ExecutionCommand): State {
  const audit = state.audits.find((a) => a.id === c.auditId)
  if (!audit) throw Error("This audit is not available.")
  const rights = auditRights(audit, person, role),
    now = nowIso()
  const report = state.auditReports.filter((r) => r.auditId === audit.id).sort((a, b) => b.version - a.version)[0]
  if (report?.status === "Issued")
    throw Error("The issued report is locked. Start a report amendment before changing audit work.")
  if (c.kind === "createFindingNc" || c.kind === "linkFindingNc") {
    if (role.access["Corrective Action"] === "None") throw Error("Corrective Action access is required to link a nonconformity.")
    if (
      c.kind === "createFindingNc" &&
      ACCESS_LEVELS.indexOf(role.access["Corrective Action"]) < ACCESS_LEVELS.indexOf("Add and edit")
    )
      throw Error("Add and edit access to Corrective Action is required to raise a nonconformity.")
    const finding = state.auditFindings.find((f) => f.id === c.findingId && f.auditId === audit.id)
    if (!finding || !["Minor NC", "Major NC"].includes(finding.classification))
      throw Error("Only a nonconformity finding can link to Corrective Action.")
    const form = state.auditChecklists.find(c => c.id === finding.checklistId)
    if (!form || !formRights(state, form, person, role).edit || findingReviewLocked(form)) throw Error("This form is read-only, completed or awaiting approval.")
    if (finding.disposition?.outcome === "Withdrawn" && !finding.ncId) throw Error("This finding was withdrawn; its disposition remains in the report.")
    if (!(rights.lead || (rights.assigned && finding.auditor === person.name)))
      throw Error("Only the responsible audit team can link this nonconformity.")
    if (finding.ncId) return state
    if (c.kind === "linkFindingNc") {
      const nc = state.ncs.find((n) => n.id === c.ncId && n.process === finding.process)
      if (!nc) throw Error("Choose an existing nonconformity for this process.")
      return { ...state, auditFindings: state.auditFindings.map((f) => (f.id === finding.id ? { ...f, ncId: nc.id } : f)) }
    }
    if (!c.title.trim() || !c.details.trim() || !state.people.some((p) => p.name === c.owner && p.status === "Active"))
      throw Error("Add a title, facts and active owner for the nonconformity.")
    if (state.ncs.some((n) => n.id === c.id))
      throw Error("This record number is already used. Reload before creating the nonconformity.")
    if (c.dueDate && !isIsoDate(c.dueDate)) throw Error("Enter a valid due date.")
    const severity = finding.classification === "Major NC" ? ("Major" as const) : ("Minor" as const),
      due = c.dueDate || addDays(todayIso(), severity === "Major" ? RULES.majorAction : RULES.minorAction)
    const nc = {
      id: c.id,
      title: c.title.trim(),
      details: c.details.trim(),
      process: finding.process,
      clause: finding.clause,
      source: `Audit ${audit.id}, question ${finding.questionId}, finding ${finding.id}`,
      severity,
      stage: c.containment.trim() ? 1 : 0,
      owner: c.owner,
      verifier: person.name,
      due,
      dueDate: due,
      containment: c.containment.trim(),
      rootCause: "",
      tasks: [],
      raised: "Today",
      raisedDate: todayIso(),
    }
    const next = {
      ...state,
      ncs: [...state.ncs, nc],
      auditFindings: state.auditFindings.map((f) => (f.id === finding.id ? { ...f, ncId: nc.id } : f)),
    }
    return notifyAudit(
      next,
      `finding-nc:${finding.id}`,
      person.name,
      [c.owner],
      `You own ${nc.id} ${nc.title}`,
      `/corrective-action/${nc.id}`,
    )
  }
  if (c.kind === "raiseAuditFinding") {
    const assessment = state.auditorAssessments.find((a) => a.id === c.assessmentId && a.auditId === audit.id)
    if (!assessment || assessment.status !== "Completed" || !["Observation", "Minor NC", "Major NC"].includes(assessment.result))
      throw Error("Complete an observation or nonconformity assessment first.")
    if (!rights.assigned || assessment.auditor !== person.name)
      throw Error("Only the auditor who made this assessment can raise its finding.")
    if (state.auditFindings.some((f) => f.assessmentId === assessment.id)) return state
    if (!c.title.trim() || !c.facts.trim() || !c.requirement.trim() || !c.clause || !c.owner)
      throw Error("Add a title, requirement, clause, facts and responsible owner.")
    if ((assessment.result === "Minor NC" || assessment.result === "Major NC") && c.classification !== assessment.result)
      throw Error("The finding classification must match the assessment.")
    if (assessment.result === "Observation" && !["Observation", "Opportunity"].includes(c.classification))
      throw Error("Reassess the question before raising a nonconformity.")
    const form = state.auditChecklists.find(c => c.id === assessment.checklistId)!
    if (!formRights(state, form, person, role).edit || formWorkLocked(form)) throw Error("This form is read-only, completed or awaiting approval.")
    const q = questionsOf(form).find(
      (q) => q.id === assessment.questionId,
    )
    if (!q) throw Error("This question is not available.")
    const blocked = assessmentBlockReason(state, audit, q, person, role)
    if (blocked) throw Error(blocked)
    if (!audit.clauses.includes(c.clause) || !state.people.some((p) => p.name === c.owner && p.status === "Active"))
      throw Error("Choose an applicable clause and active finding owner.")
    const finding: AuditFinding = {
      id: nextId(
        state.auditFindings.map((f) => f.id),
        "AF-",
        5,
      ),
      auditId: audit.id,
      checklistId: assessment.checklistId,
      version: assessment.version,
      questionId: assessment.questionId,
      assessmentId: assessment.id,
      title: c.title.trim(),
      classification: c.classification,
      requirement: c.requirement.trim(),
      clause: c.clause,
      process: audit.process,
      facts: c.facts.trim(),
      evidence: questionReferences(state, assessment.checklistId, assessment.questionId),
      owner: c.owner,
      auditor: person.name,
      status: "Draft",
      at: now,
    }
    return notifyAudit(
      { ...state, auditFindings: [...state.auditFindings, finding] },
      `finding:${finding.id}`,
      person.name,
      [audit.lead],
      `Finding ${finding.id} needs lead review`,
      `/audits/${audit.id}/conduct?question=${finding.questionId}`,
    )
  }
  const requested = state.auditChecklists.find(x => x.auditId === audit.id && x.id === c.checklistId)
    const checklist = requested && latestChecklist(state, audit.id, true, formKey(requested))
  if (!checklist || checklist.id !== c.checklistId)
    throw Error("Use the current released checklist. Earlier versions remain read-only.")
  if (!formRights(state, checklist, person, role).edit) throw Error("You have read-only access; only that auditor assigned to the question can change its assessment.")
  if (formWorkLocked(checklist)) throw Error("This form is completed or awaiting approval.")
  const question = questionsOf(checklist).find((q) => q.id === c.questionId)
  if (!executionQuestionVisible(state, checklist.id, c.questionId))
    throw Error("This conditional question does not apply to the current answers.")
  if (!question || question.type === "Instruction") throw Error("Choose an assessment question.")
  const blocked = assessmentBlockReason(state, audit, question, person, role)
  if (blocked) throw Error(blocked)
  if (c.kind === "verifyAuditEvidence") {
    if (!["Pending review", "Verified", "Insufficient", "Not applicable"].includes(c.status))
      throw Error("Choose a valid evidence decision.")
    if (c.unavailable) {
      if (c.status !== "Not applicable" || !c.notes.trim()) throw Error("Document why required evidence is unavailable.")
    } else if (!questionReferences(state, checklist.id, question.id).some((r) => referenceKey(r) === referenceKey(c.reference)))
      throw Error("Verify a reference linked to this question.")
    if (!c.unavailable) validatedReferences(state, person, role, [c.reference], audit.process)
    if (["Insufficient", "Not applicable"].includes(c.status) && !c.notes.trim())
      throw Error("Add notes explaining this evidence decision.")
    const prior = state.evidenceVerifications
      .filter(
        (v) =>
          v.checklistId === checklist.id &&
          v.questionId === question.id &&
          referenceKey(v.reference) === referenceKey(c.reference),
      )
      .at(-1)
    if (prior?.status === c.status && prior.notes === c.notes.trim() && prior.by === person.name) return state
    const verification: EvidenceVerification = {
      id: nextId(
        state.evidenceVerifications.map((v) => v.id),
        "AEV-",
        5,
      ),
      auditId: audit.id,
      checklistId: checklist.id,
      version: checklist.version,
      questionId: question.id,
      reference: c.reference,
      status: c.status,
      notes: c.notes.trim(),
      by: person.name,
      at: now,
      unavailable: c.unavailable,
    }
    return { ...state, evidenceVerifications: [...state.evidenceVerifications, verification] }
  }
  const draft = c.draft
  if (draft.status !== "Draft" && draft.status !== "Completed") throw Error("Choose a valid assessment status.")
  const evidence = validatedReferences(state, person, role, draft.evidence, audit.process)
  for (const ref of evidence.filter((r) => r.kind === "document")) {
    const how = involvement(
      person.name,
      state.documents.find((d) => d.id === ref.id),
    )
    if (how) throw Error(`Not independent: you ${how} document ${ref.id}.`)
  }
  if (draft.status === "Completed") {
    if (question.assessmentRequired !== false && !["Conforms", "Observation", "Minor NC", "Major NC", "Not applicable"].includes(draft.result))
      throw Error("Choose the auditor assessment result.")
    if (question.assessmentRequired !== false && !draft.objectiveEvidence.trim() && draft.result !== "Not applicable")
      throw Error("Record the objective evidence you observed.")
    if (draft.result === "Not applicable" && !draft.notes.trim()) throw Error("Explain why an assessment is not applicable.")
    if (question.respondBy === "Auditor") {
      const typed = !["Audit assessment", "Evidence review", "Document reference"].includes(question.type)
      if (typed) {
        const issues = responseProblems(
          { ...question, evidenceRule: "Optional" },
          {
            questionId: question.id,
            value: draft.answer ?? "",
            selectedValues: draft.selectedValues,
            explanation: draft.notes,
            naReason: draft.notes,
            evidence,
          },
        )
        if (issues.length) throw Error(issues.join("\n"))
      }
    }
  }
  const previous = latestAssessment(state, checklist.id, question.id)
  const comparable = (a: AssessmentDraft) =>
    JSON.stringify([
      a.result,
      a.answer ?? "",
      a.selectedValues ?? [],
      a.objectiveEvidence,
      a.sampling,
      a.interviewee,
      a.notes,
      a.status,
      a.evidence,
    ])
  const same = previous && comparable(previous) === comparable({ ...draft, evidence })
  if (same) return state
  const assessment: AuditorAssessment = {
    ...draft,
    evidence,
    id: nextId(
      state.auditorAssessments.map((a) => a.id),
      "AAS-",
      5,
    ),
    auditId: audit.id,
    checklistId: checklist.id,
    version: checklist.version,
    questionId: question.id,
    auditor: person.name,
    at: now,
    supersedes: previous?.id,
  }
  let next = {
    ...state,
    auditorAssessments: [...state.auditorAssessments, assessment],
    audits: state.audits.map((a) =>
      a.id === audit.id && draft.status === "Completed"
        ? { ...a, state: "Held" as const, heldDate: a.heldDate ?? todayIso() }
        : a,
    ),
  }
  if (draft.status === "Completed")
    next = notifyAudit(
      next,
      `assessment:${assessment.id}`,
      person.name,
      [audit.lead],
      `Assessment completed for ${question.id}`,
      `/audits/${audit.id}/conduct?question=${question.id}`,
    )
  return next
}
