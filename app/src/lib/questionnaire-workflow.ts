import type { State } from './store'
import type { ChecklistQuestion, Person, Role } from '@/data/types'
import type { AuditeeResponse, AuditReference } from '@/data/audit-types'
import { auditRights, latestChecklist, questionsOf } from './audit-workflow'
import { addDays, isIsoDate, nowIso, todayIso } from './periods'
import { nextId } from './ids'
import { validatedReferences } from './audit-evidence'
export type ResponseDraft = Pick<AuditeeResponse, 'questionId' | 'value' | 'explanation' | 'naReason' | 'evidence'>
export type QuestionnaireCommand =
  | { kind: 'assignQuestionnaire'; auditId: string; id: string; checklistId: string; respondent: string; questionIds: string[]; dueDate: string }
  | { kind: 'saveResponses'; auditId: string; assignmentId: string; responses: ResponseDraft[]; submit: boolean }
  | { kind: 'requestClarification'; auditId: string; assignmentId: string; questionId: string; text: string; requestKind: 'Clarification' | 'More evidence' }
  | { kind: 'replyClarification'; auditId: string; requestId: string; reply: string }
  | { kind: 'resolveClarification'; auditId: string; requestId: string }
  | { kind: 'questionnaireReminders'; auditId: string }
export const QUESTIONNAIRE_COMMANDS = new Set(['assignQuestionnaire', 'saveResponses', 'requestClarification', 'replyClarification', 'resolveClarification', 'questionnaireReminders'])
export function notifyAudit(state: State, key: string, actor: string, to: string[], title: string, href: string, body?: string): State {
  let notifications = [...state.notifications]
  for (const name of new Set(to)) {
    if (!name || name === actor || notifications.some(n => n.eventKey === key && n.to === name)) continue
    notifications.unshift({ id: nextId(notifications.map(n => n.id), 'AN-', 5), eventKey: key, to: name, from: actor, title, body, href, kind: 'Audit', when: 'Just now', age: 0, read: false })
  }
  return { ...state, notifications }
}
export function questionVisible(q: ChecklistQuestion, questions: ChecklistQuestion[], values: Record<string, string>, seen = new Set<string>()): boolean {
  if (!q.showWhen) return true
  if (seen.has(q.id)) return false
  seen.add(q.id)
  const parent = questions.find(x => x.id === q.showWhen!.questionId)
  return !!parent && questionVisible(parent, questions, values, seen) && values[parent.id] === q.showWhen.equals
}
export function responseProblems(q: ChecklistQuestion, r?: ResponseDraft): string[] {
  if (q.type === 'Instruction') return []
  const value = r?.value.trim() ?? '', errors: string[] = []
  if (q.required && !value) errors.push('Answer this required question.')
  if (value && q.type === 'Yes / No / N/A' && !['Yes', 'No', 'N/A'].includes(value)) errors.push('Choose Yes, No or N/A.')
  if (value && q.type === 'Multiple choice' && !q.choices?.map(c => c.trim()).includes(value)) errors.push('Choose one of the configured choices.')
  if (value && q.type === 'Number' && !Number.isFinite(Number(value))) errors.push('Enter a finite number.')
  if (value && q.type === 'Date' && (!isIsoDate(value) || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value)) errors.push('Enter a valid date.')
  if (['N/A', 'Not applicable'].includes(value) && q.naJustification !== false && !r?.naReason.trim()) errors.push('Explain why this question is not applicable.')
  if (q.evidenceRule === 'When No' && value === 'No' && !r?.explanation.trim()) errors.push('Explain the No answer.')
  if ((q.evidenceRule === 'Required' || q.evidenceRule === 'When No' && value === 'No' || ['Evidence review', 'Document reference'].includes(q.type)) && !r?.evidence.length) errors.push('Link the required supporting evidence.')
  return errors
}
export function applyQuestionnaireCommand(state: State, person: Person, role: Role, c: QuestionnaireCommand): State {
  const audit = state.audits.find(a => a.id === c.auditId)
  if (!audit || person.status === 'Deactivated' || person.accessEndsOn && person.accessEndsOn < todayIso()) throw Error('This audit is not available.')
  const rights = auditRights(audit, person, role), now = nowIso()
  if (c.kind === 'assignQuestionnaire') {
    if (!rights.lead) throw Error('Only the lead auditor can assign a questionnaire.')
    const checklist = latestChecklist(state, audit.id, true)
    if (!checklist || checklist.id !== c.checklistId || !checklist.usesQuestionnaire) throw Error('Release a questionnaire checklist first.')
    const respondent = state.people.find(p => p.name === c.respondent && p.status !== 'Deactivated' && (!p.accessEndsOn || p.accessEndsOn >= todayIso()))
    if (!respondent || !isIsoDate(c.dueDate)) throw Error('Choose an active respondent and a response deadline.')
    const questions = questionsOf(checklist).filter(q => q.type !== 'Instruction' && q.respondBy !== 'Auditor')
    if (!c.questionIds.length || c.questionIds.some(id => !questions.some(q => q.id === id))) throw Error('Choose questions that accept auditee answers.')
    const existing = state.questionnaireAssignments.find(a => a.id === c.id)
    if (existing && (existing.respondent !== c.respondent || existing.checklistId !== c.checklistId)) throw Error('This assignment number is already in use. Reload before assigning.')
    const overlap = state.questionnaireAssignments.find(a => a.checklistId === checklist.id && a.respondent === c.respondent && a.questionIds.some(q => c.questionIds.includes(q)))
    if (overlap) {
      if (overlap.questionIds.length === c.questionIds.length && overlap.questionIds.every(q => c.questionIds.includes(q))) return state
      throw Error('Some questions are already assigned to this respondent. Choose only unassigned questions.')
    }
    const assignment = { id: c.id, auditId: audit.id, checklistId: checklist.id, version: checklist.version, respondent: c.respondent, questionIds: [...new Set(c.questionIds)], dueDate: c.dueDate, status: 'Not started' as const, assignedBy: person.name, assignedAt: now }
    const next = { ...state, questionnaireAssignments: [...state.questionnaireAssignments, assignment] }
    return notifyAudit(next, `assignment:${c.id}`, person.name, [c.respondent], `Audit questionnaire ${c.id} assigned`, `/audits/${audit.id}/questionnaires/${c.id}`, `Due ${c.dueDate}.`)
  }
  if (c.kind === 'questionnaireReminders') {
    if (!rights.lead && !rights.manage) return state
    let next = state
    for (const a of state.questionnaireAssignments.filter(a => a.auditId === audit.id && !['Submitted', 'Resubmitted'].includes(a.status))) {
      const event = a.dueDate < todayIso() ? 'overdue' : a.dueDate <= addDays(todayIso(), 7) ? 'soon' : ''
      if (event) next = notifyAudit(next, `questionnaire:${a.id}:${event}`, 'ThryveMS', [a.respondent], `Audit questionnaire ${a.id} is ${event === 'soon' ? 'due soon' : 'overdue'}`, `/audits/${audit.id}/questionnaires/${a.id}`)
    }
    return next
  }
  if (c.kind === 'replyClarification' || c.kind === 'resolveClarification') {
    const request = state.clarificationRequests.find(r => r.id === c.requestId && r.auditId === audit.id)
    if (!request) throw Error('This clarification is not available.')
    if (c.kind === 'replyClarification') {
      if (request.to !== person.name || !c.reply.trim()) throw Error('Only the assigned respondent can reply. Add a reply first.')
      if (state.questionnaireAssignments.some(a => a.id === request.assignmentId && ['Submitted','Resubmitted'].includes(a.status))) throw Error('Submitted replies are read-only until another clarification is requested.')
      if (request.status === 'Resolved') throw Error('This clarification has already been resolved.')
      const next = { ...state, clarificationRequests: state.clarificationRequests.map(r => r.id === request.id ? { ...r, reply: c.reply.trim(), replyHistory: r.reply ? [...(r.replyHistory ?? []), { reply: r.reply, by: person.name, at: r.repliedAt ?? r.at }] : r.replyHistory, status: 'Answered' as const, repliedAt: now } : r) }
      return notifyAudit(next, `clarification:${request.id}:answered`, person.name, [request.from], `Clarification answered for ${request.questionId}`, `/audits/${audit.id}/conduct`)
    }
    const checklist = state.auditChecklists.find(x => x.id === request.checklistId), q = questionsOf(checklist).find(q => q.id === request.questionId)
    if (!rights.lead && !(rights.assigned && q?.askedBy === person.name)) throw Error('Only the responsible auditor can resolve this clarification.')
    if (request.status !== 'Answered' && request.status !== 'Resolved') throw Error('Wait for the respondent to answer before resolving this request.')
    return { ...state, clarificationRequests: state.clarificationRequests.map(r => r.id === request.id ? { ...r, status: 'Resolved', resolvedAt: now } : r) }
  }
  const assignment = state.questionnaireAssignments.find(a => a.id === c.assignmentId && a.auditId === audit.id)
  if (!assignment) throw Error('This questionnaire is not available.')
  const checklist = state.auditChecklists.find(x => x.id === assignment.checklistId)
  const questions = questionsOf(checklist).filter(q => assignment.questionIds.includes(q.id))
  if (c.kind === 'requestClarification') {
    const q = questions.find(q => q.id === c.questionId)
    if (!q || !c.text.trim() || !(rights.lead || rights.assigned && q.askedBy === person.name)) throw Error('Only the responsible auditor can request clarification on this question.')
    if (state.clarificationRequests.some(r => r.assignmentId === assignment.id && r.questionId === q.id && r.status !== 'Resolved' && r.kind === c.requestKind)) return state
    const id = nextId(state.clarificationRequests.map(r => r.id), 'ACR-', 4)
    const request = { id, auditId: audit.id, checklistId: assignment.checklistId, version: assignment.version, questionId: q.id, assignmentId: assignment.id, from: person.name, to: assignment.respondent, kind: c.requestKind, text: c.text.trim(), status: 'Open' as const, at: now }
    const next = { ...state, clarificationRequests: [...state.clarificationRequests, request], questionnaireAssignments: state.questionnaireAssignments.map(a => a.id === assignment.id ? { ...a, status: 'Clarification requested' as const } : a) }
    return notifyAudit(next, `clarification:${id}`, person.name, [assignment.respondent], `${c.requestKind} requested for ${q.id}`, `/audits/${audit.id}/questionnaires/${assignment.id}`, c.text.trim())
  }
  if (assignment.respondent !== person.name) throw Error('Only the assigned respondent can save or submit these answers.')
  if (['Submitted', 'Resubmitted'].includes(assignment.status)) {
    if (c.submit) return state
    throw Error('Submitted answers are read-only until clarification is requested.')
  }
  let responses = [...state.auditeeResponses]
  for (const draft of c.responses) {
    const q = questions.find(q => q.id === draft.questionId)
    if (!q) throw Error('This question is not assigned to you.')
    const old = responses.find(r => r.assignmentId === assignment.id && r.questionId === q.id)
    const evidence = validatedReferences(state, person, role, draft.evidence)
    const fields = { value: draft.value, explanation: draft.explanation, naReason: draft.naReason, evidence }
    const changed = !old || JSON.stringify(fields) !== JSON.stringify({ value: old.value, explanation: old.explanation, naReason: old.naReason, evidence: old.evidence })
    if (!changed) continue
    if (assignment.status === 'Clarification requested' && !state.clarificationRequests.some(r => r.assignmentId === assignment.id && r.questionId === q.id && r.status !== 'Resolved')) throw Error('Only questions with a clarification request can be changed after submission.')
    const r: AuditeeResponse = { id: old?.id ?? nextId(responses.map(r => r.id), 'ARS-', 5), auditId: audit.id, assignmentId: assignment.id, checklistId: assignment.checklistId, version: assignment.version, questionId: q.id, respondent: person.name, ...fields, status: 'Draft', updatedAt: now, history: old ? [...old.history, { value: old.value, explanation: old.explanation, naReason: old.naReason, evidence: old.evidence, by: person.name, at: old.updatedAt }] : [] }
    responses = [...responses.filter(x => x.id !== r.id), r]
  }
  if (c.submit) {
    const own = responses.filter(r => r.assignmentId === assignment.id), values = Object.fromEntries(own.map(r => [r.questionId, r.value]))
    const issues = questions.filter(q => questionVisible(q, questions, values)).flatMap(q => responseProblems(q, own.find(r => r.questionId === q.id)).map(message => `${q.text}: ${message}`))
    if (issues.length) throw Error(issues.join('\n'))
    if (state.clarificationRequests.some(r => r.assignmentId === assignment.id && r.status === 'Open')) throw Error('Reply to each clarification before resubmitting.')
    responses = responses.map(r => r.assignmentId === assignment.id ? { ...r, status: 'Submitted' } : r)
  }
  const status = c.submit ? assignment.submittedAt ? 'Resubmitted' as const : 'Submitted' as const : assignment.status === 'Clarification requested' ? assignment.status : 'In progress' as const
  let next = { ...state, auditeeResponses: responses, questionnaireAssignments: state.questionnaireAssignments.map(a => a.id === assignment.id ? { ...a, status, ...(c.submit ? { submittedAt: now } : {}) } : a) }
  if (c.submit) next = notifyAudit(next, `submission:${assignment.id}:${assignment.submittedAt ? now : 'first'}`, person.name, [audit.lead, ...questions.map(q => q.askedBy)], `Audit questionnaire ${assignment.id} ${status.toLowerCase()}`, `/audits/${audit.id}/conduct`)
  return next
}
