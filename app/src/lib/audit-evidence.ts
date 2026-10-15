import type { State } from './store'
import type { Person, Role } from '@/data/types'
import type { AuditReference } from '@/data/audit-types'
import { isSafeUrl } from './record-links'
export const referenceKey = (r: AuditReference) => `${r.kind}:${r.id ?? r.url}`
export function mayReadReference(state: State, person: Person, role: Role, ref: AuditReference) {
  if (ref.kind === 'link') return isSafeUrl(ref.url)
  const record = ref.kind === 'document' ? state.documents.find(d => d.id === ref.id) : state.evidence.find(e => e.id === ref.id)
  if (!record || person.status === 'Deactivated') return false
  const area = ref.kind === 'document' ? 'Documents' : 'Evidence'
  if (role.access[area] === 'None') return false
  const classification = record.classification
  const named = ('viewers' in record && (record.viewers as string[]).includes(person.name)) || ('owner' in record && record.owner === person.name) || ('addedBy' in record && record.addedBy === person.name)
  if (classification === 'Highly confidential' && (role.id === 'consultant' || !named)) return false
  if (classification === 'Confidential' && !named && !['admin', 'quality'].includes(role.id)) return false
  const processes = 'processes' in record ? record.processes : [record.process]
  const wide = ['All processes', 'Not their own process'].includes(role.scope)
  return processes.length === 0 || wide || processes.some(name => { const p = state.processes.find(p => p.name === name); return !!p && (p.owner === person.name || p.members?.includes(person.name)) })
}
export function validatedReferences(state: State, person: Person, role: Role, refs: AuditReference[]) {
  return [...new Map(refs.map(r => {
    if (!mayReadReference(state, person, role, r)) throw Error('An evidence reference is unavailable or not permitted. Choose an accessible record or a full https:// link.')
    const record = r.kind === 'document' ? state.documents.find(d => d.id === r.id) : r.kind === 'evidence' ? state.evidence.find(e => e.id === r.id) : undefined
    return [referenceKey(r), { ...r, title: record?.title ?? r.title.trim(), url: r.kind === 'link' ? r.url!.trim() : undefined }] as const
  })).values()]
}
