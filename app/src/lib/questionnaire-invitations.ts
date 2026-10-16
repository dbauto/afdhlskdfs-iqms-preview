import { formKey, formRights, formWorkLocked } from "./audit-form-policy"
import type { State } from "./store"
import type { Person, Role } from "@/data/types"
import type { AuditReference, QuestionnaireAssignment, QuestionnaireInvitation } from "@/data/audit-types"
import { auditRights, latestChecklist, questionsOf } from "./audit-workflow"
import { notifyAudit, saveAssignmentResponses, type ResponseDraft } from "./questionnaire-workflow"
import { nowIso, todayIso, isIsoDate } from "./periods"
import { isSafeUrl } from "./record-links"

export type InvitationCommand =
  | {
      kind: "prepareRespondentInvitation"
      auditId: string
      id: string
      assignmentId: string
      checklistId: string
      name: string
      email: string
      department: string
      questionIds: string[]
      dueDate: string
      interview: boolean
    }
  | { kind: "revokeRespondentInvitation"; auditId: string; invitationId: string }
export const INVITATION_COMMANDS = new Set(["prepareRespondentInvitation", "revokeRespondentInvitation"])

export function applyInvitationCommand(state: State, person: Person, role: Role, command: InvitationCommand): State {
  const audit = state.audits.find((a) => a.id === command.auditId)
  if (!audit || !auditRights(audit, person, role).lead)
    throw Error("Only the lead auditor can prepare or revoke respondent invitations.")
  if (command.kind === "revokeRespondentInvitation") {
    const invitation = state.questionnaireInvitations.find((i) => i.id === command.invitationId && i.auditId === audit.id)
    if (!invitation) throw Error("This respondent invitation is not available.")
    return {
      ...state,
      questionnaireInvitations: state.questionnaireInvitations.map((i) =>
        i.id === invitation.id ? { ...i, status: "Revoked", revokedAt: nowIso() } : i,
      ),
    }
  }
  const c = command,
    requested = state.auditChecklists.find(x => x.auditId === audit.id && x.id === c.checklistId),
    checklist = requested && latestChecklist(state, audit.id, true, formKey(requested))
  if (!checklist || checklist.id !== c.checklistId || !checklist.usesQuestionnaire)
    throw Error("Release a questionnaire checklist before preparing invitations.")
  if (formWorkLocked(checklist)) throw Error("This form is completed or awaiting approval.")
  if (!c.name.trim() || (!c.interview && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())))
    throw Error("Enter the respondent’s name and a valid email address.")
  if (!isIsoDate(c.dueDate) || c.dueDate < todayIso()) throw Error("Choose a response deadline on or after today.")
  const questions = questionsOf(checklist).filter((q) => q.type !== "Instruction" && q.respondBy !== "Auditor")
  if (!c.questionIds.length || c.questionIds.some((id) => !questions.some((q) => q.id === id)))
    throw Error("Choose questions that accept auditee answers.")
  if (
    state.questionnaireInvitations.some((i) => i.id === c.id) ||
    state.questionnaireAssignments.some((a) => a.id === c.assignmentId)
  )
    throw Error("This invitation number is already used. Refresh before trying again.")
  if (
    !c.interview &&
    state.questionnaireInvitations.some(
      (i) =>
        i.auditId === audit.id &&
        i.status === "Active" &&
        i.email.toLowerCase() === c.email.trim().toLowerCase() &&
        state.questionnaireAssignments.some(
          (a) =>
            a.id === i.assignmentId && a.checklistId === checklist.id && a.questionIds.some((id) => c.questionIds.includes(id)),
        ),
    )
  )
    throw Error("These questions already have an active invitation for this email address.")
  const invitation: QuestionnaireInvitation = {
    id: c.id,
    auditId: audit.id,
    assignmentId: c.assignmentId,
    name: c.name.trim(),
    email: c.email.trim(),
    department: c.department.trim(),
    status: "Active",
    expiresOn: c.dueDate,
    createdBy: person.name,
    createdAt: nowIso(),
    identity: c.interview ? "Interview recorded by auditor" : "Unverified preview",
  }
  const assignment: QuestionnaireAssignment = {
    id: c.assignmentId,
    auditId: audit.id,
    checklistId: checklist.id,
    version: checklist.version,
    respondent: invitation.name,
    respondentId: invitation.id,
    invitationId: invitation.id,
    recordedBy: c.interview ? person.name : undefined,
    questionIds: [...new Set(c.questionIds)],
    dueDate: c.dueDate,
    status: "Not started",
    assignedBy: person.name,
    assignedAt: nowIso(),
  }
  return {
    ...state,
    questionnaireInvitations: [...state.questionnaireInvitations, invitation],
    questionnaireAssignments: [...state.questionnaireAssignments, assignment],
  }
}

/** Explicit synthetic preview. No code, token or verified identity is fabricated. */
export function invitedPreview(state: State, invitationId: string) {
  const invitation = state.questionnaireInvitations.find(
    (i) => i.id === invitationId && i.status === "Active" && i.expiresOn >= todayIso() && i.identity === "Unverified preview",
  )
  const assignment = state.questionnaireAssignments.find(
    (a) => a.id === invitation?.assignmentId && a.invitationId === invitationId,
  )
  const audit = state.audits.find((a) => a.id === assignment?.auditId)
  const checklist = state.auditChecklists.find((c) => c.id === assignment?.checklistId && c.status === "Released")
  if (!invitation || !assignment || !audit || !checklist) return undefined
  // Do not project the audit team, other recipients, record IDs, evidence library, findings or reports.
  return {
    invitation: { id: invitation.id, name: invitation.name, email: invitation.email, department: invitation.department },
    assignment,
    audit: { id: audit.id, process: audit.process, date: audit.date },
    questions: questionsOf(checklist)
      .filter((q) => assignment.questionIds.includes(q.id))
      .map((q) => ({ ...q, evidence: [], guidance: "", askedBy: "", respondent: undefined })),
    responses: state.auditeeResponses.filter((r) => r.assignmentId === assignment.id),
    clarifications: state.clarificationRequests.filter((r) => r.assignmentId === assignment.id),
  }
}

export function saveInvitedPreview(state: State, invitationId: string, responses: ResponseDraft[], submit: boolean): State {
  const preview = invitedPreview(state, invitationId)
  if (!preview) throw Error("This respondent preview is unavailable or has expired.")
  const validate = (refs: AuditReference[]) =>
    refs.map((ref) => {
      if (ref.kind !== "link" || !isSafeUrl(ref.url)) throw Error("Respondents can add full https:// evidence links only.")
      return { ...ref, title: ref.title.trim() || "Supporting evidence", addedBy: preview.invitation.name, addedAt: nowIso() }
    })
  return saveAssignmentResponses(
    state,
    preview.assignment.id,
    { name: preview.invitation.name, identity: "Unverified preview" },
    responses,
    submit,
    validate,
  )
}

export type InvitedPreview = NonNullable<ReturnType<typeof invitedPreview>>

export function replyInvitedPreview(state: State, invitationId: string, requestId: string, reply: string): State {
  const preview = invitedPreview(state, invitationId)
  const request = preview?.clarifications.find((r) => r.id === requestId)
  if (
    !preview ||
    !request ||
    request.status === "Resolved" ||
    ["Submitted", "Resubmitted"].includes(preview.assignment.status) ||
    !reply.trim()
  )
    throw Error("Add a reply to an open request on your assigned questionnaire.")
  const next: State = {
    ...state,
    clarificationRequests: state.clarificationRequests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            reply: reply.trim(),
            replyHistory: r.reply
              ? [...(r.replyHistory ?? []), { reply: r.reply, by: preview.invitation.name, at: r.repliedAt ?? r.at }]
              : r.replyHistory,
            status: "Answered",
            repliedAt: nowIso(),
          }
        : r,
    ),
  }
  return notifyAudit(
    next,
    `clarification:${request.id}:answered`,
    preview.invitation.name,
    [request.from],
    `Clarification answered for ${request.questionId}`,
    `/audits/${request.auditId}/conduct`,
  )
}
