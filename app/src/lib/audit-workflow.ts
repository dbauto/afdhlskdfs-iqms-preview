/** Browser preview domain commands. Production repeats these checks transactionally on the server. */
import type { State } from './store'
import type { Audit, ChecklistQuestion, ChecklistSection, Person, Role } from '@/data/types'
import type { AuditChecklist } from '@/data/audit-types'
import { nowIso, todayIso, parseDisplayDate } from './periods'
export function auditRights(a: Audit, person: Person, role: Role) {
  const active = person.status !== 'Deactivated' && (!person.accessEndsOn || person.accessEndsOn >= todayIso())
  const view = active && role.access.Audits !== 'None'
  const lead = view && role.id !== 'consultant' && a.lead === person.name
  const assigned = view && (lead || a.auditors.includes(person.name))
  const manage = view && ['admin', 'quality'].includes(role.id)
  return { lead, assigned, manage, edit: role.id !== 'consultant' && (assigned || manage) }
}
export function latestChecklist(state: State, auditId: string, released = false) {
  return state.auditChecklists.filter(c => c.auditId === auditId && (!released || c.status === 'Released')).sort((a, b) => b.version - a.version)[0]
}
export const questionsOf = (c?: AuditChecklist) => c?.sections.flatMap(s => s.items) ?? []
export function normalizeQuestion(q: ChecklistQuestion): ChecklistQuestion {
  return { ...q, respondBy: q.respondBy ?? 'Auditor', auditeeRequired: q.auditeeRequired ?? false, assessmentRequired: q.assessmentRequired ?? q.type !== 'Instruction', evidenceRule: q.evidenceRule ?? 'Optional', choices: q.choices ?? ['Option 1', 'Option 2'], naJustification: q.naJustification ?? true }
}
export function migrateAudits(state: State): State {
  return { ...state, people: state.people.map(p => ({ ...p, accessEndsOn: p.accessEndsOn ?? (p.status === "Guest" ? parseDisplayDate(p.scope.replace(/^Ends /, "")) : undefined) })), auditChecklists: state.auditChecklists.map(c => ({ ...c, auditId: c.auditId ?? c.id, version: c.version ?? 1, usesQuestionnaire: c.usesQuestionnaire ?? false, sections: c.sections.map(s => ({ ...s, items: s.items.map(normalizeQuestion) })) })) }
}
export function scopeAuditRecords(scoped: State, all: State, person: Person, role: Role): State {
  const live = person.status !== 'Deactivated' && (!person.accessEndsOn || person.accessEndsOn >= todayIso())
  const own = live ? all.questionnaireAssignments.filter(a => a.respondent === person.name) : []
  const rights = (a: Audit) => auditRights(a, person, role)
  const visible = all.audits.filter(a => live && (rights(a).assigned || rights(a).manage || (role.id !== 'guest-auditor' && role.id !== 'auditor' && scoped.audits.some(x => x.id === a.id))))
  const full = new Set(visible.filter(a => rights(a).assigned || rights(a).manage).map(a => a.id))
  const headers = all.audits.filter(a => own.some(x => x.auditId === a.id))
  const checklistAccess = all.auditChecklists.flatMap(c => {
    if (full.has(c.auditId)) return [c]
    const assigned = own.filter(a => a.checklistId === c.id)
    if (!assigned.length) return []
    const ids = new Set(assigned.flatMap(a => a.questionIds))
    return [{ ...c, sections: c.sections.map(s => ({ ...s, items: s.items.filter(q => ids.has(q.id)) })).filter(s => s.items.length) }]
  })
  const questionAccess = (auditId: string, questionId: string) => {
    const a = all.audits.find(a => a.id === auditId)
    return !!a && (rights(a).lead || rights(a).manage || (rights(a).assigned && all.auditChecklists.some(c => c.auditId === auditId && questionsOf(c).some(q => q.id === questionId && q.askedBy === person.name))))
  }
  const linked = new Set(checklistAccess.flatMap(c => questionsOf(c).flatMap(q => q.evidence.map(x => x.split(" ")[0]))))
  const guestScope = role.id === 'guest-auditor' ? { ...scoped,
    processes: scoped.processes.filter(p => visible.some(a => a.process === p.name)),
    documents: scoped.documents.filter(d => linked.has(d.id)), evidence: scoped.evidence.filter(e => linked.has(e.id)),
    objectives: [], risks: [], ncs: scoped.ncs.filter(n => all.auditFindings.some(f => full.has(f.auditId) && f.ncId === n.id)),
    reviews: [], reviewActions: [], reviewRecordChecks: [], reviewEvaluations: [], issues: [], parties: [], policies: [], requirements: [], remarks: [],
  } : scoped
  return { ...guestScope, audits: [...visible, ...headers.filter(a => !visible.some(x => x.id === a.id))], auditChecklists: checklistAccess,
    questionnaireAssignments: all.questionnaireAssignments.filter(a => full.has(a.auditId) && a.questionIds.some(q => questionAccess(a.auditId, q)) || own.some(x => x.id === a.id)),
    auditeeResponses: all.auditeeResponses.filter(r => r.respondent === person.name && live || questionAccess(r.auditId, r.questionId)),
    auditorAssessments: all.auditorAssessments.filter(r => questionAccess(r.auditId, r.questionId)),
    evidenceVerifications: all.evidenceVerifications.filter(r => questionAccess(r.auditId, r.questionId)),
    clarificationRequests: all.clarificationRequests.filter(r => live && r.to === person.name || questionAccess(r.auditId, r.questionId)),
    auditFindings: all.auditFindings.filter(r => questionAccess(r.auditId, r.questionId)),
    auditReports: all.auditReports.filter(r => { const a = all.audits.find(a => a.id === r.auditId); return !!a && full.has(r.auditId) && (r.status === 'Issued' || rights(a).lead || rights(a).manage) }),
  }
}
export type AuditCommand =
  | { kind: 'saveChecklist'; auditId: string; id: string; sections: ChecklistSection[]; usesQuestionnaire: boolean }
  | { kind: 'releaseChecklist'; auditId: string; id: string; sections: ChecklistSection[]; usesQuestionnaire: boolean }
  | { kind: 'reviseChecklist'; auditId: string; id: string; reason: string }
export function applyAuditCommand(state: State, person: Person, role: Role, command: AuditCommand): State {
  const a = state.audits.find(a => a.id === command.auditId)
  if (!a) throw Error('This audit is not available.')
  const rights = auditRights(a, person, role)
  if (!rights.edit) throw Error('Only the assigned audit team can change this checklist.')
  const latest = latestChecklist(state, a.id)
  if (command.kind === 'reviseChecklist') {
    if (!rights.lead) throw Error('Only the lead auditor can start a revision.')
    if (!command.reason.trim()) throw Error('Explain why the checklist needs a revision.')
    if (!latest || latest.status !== 'Released') throw Error('Finish the current draft first.')
    return { ...state, auditChecklists: [...state.auditChecklists, { ...structuredClone(latest), id: command.id, version: latest.version + 1, status: 'Revised', releasedAt: undefined, releasedBy: undefined, revisionReason: command.reason.trim(), basedOn: latest.id }] }
  }
  if (latest?.status === 'Released') throw Error('Released checklists cannot be edited. Start a revision.')
  if (latest && latest.id !== command.id) throw Error('The checklist changed. Reload before saving.')
  const sections = structuredClone(command.sections).map(s => ({ ...s, items: s.items.map(normalizeQuestion) }))
  if (command.kind === 'releaseChecklist') {
    if (!rights.lead) throw Error('Only the lead auditor can release the checklist.')
    const questions = sections.flatMap(s => s.items).filter(q => q.type !== 'Instruction')
    if (!questions.length || questions.some(q => !q.text.trim() || !q.askedBy || ![a.lead, ...a.auditors].includes(q.askedBy))) throw Error('Add a question and assign each question to an audit team member.')
    if (questions.some(q => q.type === 'Multiple choice' && new Set(q.choices?.map(c => c.trim()).filter(Boolean)).size < 2)) throw Error('Give each multiple choice question at least two choices.')
    if (questions.some(q => q.showWhen && !questions.some(other => other.id === q.showWhen!.questionId && other.id !== q.id))) throw Error('Choose an earlier valid question for conditional visibility.')
  }
  const checklist: AuditChecklist = { ...latest, id: command.id, auditId: a.id, version: latest?.version ?? 1, sections, usesQuestionnaire: command.usesQuestionnaire, status: command.kind === 'releaseChecklist' ? 'Released' : latest?.status ?? 'Draft', ...(command.kind === 'releaseChecklist' ? { releasedAt: nowIso(), releasedBy: person.name } : {}) }
  return { ...state, auditChecklists: [...state.auditChecklists.filter(c => c.id !== checklist.id), checklist], audits: state.audits.map(x => x.id === a.id && command.kind === 'releaseChecklist' ? { ...x, state: 'Checklist ready' } : x) }
}
