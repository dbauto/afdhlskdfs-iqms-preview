import type { State } from '@/lib/store'
import type { Area, Process } from '@/data/types'
import type { BadgeTone } from '@/components/ui/badge'
import { ISO_CLAUSES } from '@/data/iso'
import { onTarget } from '@/data/records'
import { addDays, addMonths, daysBetween, formatDate, parseDisplayDate, todayIso } from '@/lib/periods'
import { RULES } from '@/lib/rules'
import { latestIn } from '@/lib/objective-results'

export type Visibility = (classification: string, viewers?: string[]) => boolean
export function visibleRecords(state: State, see: Visibility) {
  return { ...state, documents: state.documents.filter(d => see(d.classification, d.viewers)), evidence: state.evidence.filter(e => see(e.classification)) }
}
const leaves = ISO_CLAUSES.filter(c => !ISO_CLAUSES.some(other => other.no.startsWith(c.no + '.')))
const covers = (links: string[], no: string) => links.some(link => no === link || no.startsWith(link + '.'))
export const dueOn = (display?: string) => parseDisplayDate(display, { year: Number(todayIso().slice(0, 4)) })

/** Coverage is a count of linked references, not an ISO conformity decision. */
export function clauseCoverage(state: State, see: Visibility, today = todayIso()) {
  const s = visibleRecords(state, see)
  const cutoff = addMonths(today, -12)
  const rows = leaves.map(c => {
    const evidence = s.evidence.filter(e => covers(e.clauses, c.no))
    const documents = s.documents.filter(d => d.stage !== 'Archived' && covers(d.clauses, c.no))
    const fresh = evidence.some(e => !!e.addedDate && e.addedDate >= cutoff && e.addedDate <= today) || documents.some(d => d.stage === 'Published' && (!dueOn(d.nextReview) || dueOn(d.nextReview)! >= today))
    const items = evidence.length + documents.length
    return { no: c.no, name: c.title, items, process: [...new Set([...evidence.flatMap(e => e.processes), ...documents.map(d => d.process)])].join(', ') || 'Company-wide', latest: evidence.map(e => e.addedDate).filter(Boolean).sort().pop() ?? '', state: fresh ? 'Evidence current' : items ? 'Partial' : 'No evidence' }
  })
  const groups = ISO_CLAUSES.filter(c => !c.no.includes('.')).map(c => {
    const children = rows.filter(r => r.no.startsWith(c.no + '.'))
    const current = children.filter(r => r.state === 'Evidence current').length
    const partial = children.filter(r => r.state === 'Partial').length
    const total = children.length
    const hasData = children.some(r => r.items > 0)
    return { no: c.no, name: c.title, rows: children, ok: total ? Math.round(100 * current / total) : 0, part: total ? Math.round(100 * partial / total) : 0, gap: total ? 100 - Math.round(100 * (current + partial) / total) : 0, frac: hasData ? `${current}/${total}` : 'No data', hasData }
  })
  return { groups, rows, current: rows.filter(r => r.state === 'Evidence current').length, missing: rows.filter(r => !r.items).length, total: rows.length, hasData: rows.some(r => r.items > 0), old: s.evidence.filter(e => !!e.addedDate && e.addedDate < cutoff), addedThisMonth: s.evidence.filter(e => e.addedDate?.slice(0, 7) === today.slice(0, 7)).length, evidence: s.evidence, documents: s.documents }
}

/** Reconstruct each week from dated records; no invented green history before records exist. */
export function processHealth(state: State, process: Process, asOf = todayIso()) {
  const ncs = state.ncs.filter(n => n.process === process.name && !!n.raisedDate && n.raisedDate <= asOf && (n.closedDate ? n.closedDate > asOf : n.stage < 6))
  const measured = state.objectives.filter(o => o.process === process.name).map(o => ({ o, r: latestIn(o, { start: addMonths(asOf, -12), end: asOf }) })).filter(x => !!x.r)
  const audits = state.audits.filter(a => a.process === process.name && !!a.heldDate && a.heldDate <= asOf)
  const overdue = ncs.some(n => !!n.dueDate && n.dueDate < asOf) || audits.some(a => !a.reportDate && addDays(a.heldDate!, RULES.reportDays) < asOf)
  const below = measured.some(({ o, r }) => r && !onTarget(o, r.value))
  const code = overdue ? 'o' : ncs.length || below ? 's' : measured.length || audits.length ? 'g' : 'n'
  return { code, label: overdue ? 'Overdue work' : below ? 'KPI below target' : ncs.length ? 'Open nonconformity' : code === 'g' ? 'On track' : 'No data', tone: (code === 'o' ? 'overdue' : code === 's' ? 'soon' : code === 'g' ? 'done' : 'draft') as BadgeTone }
}
export const processWeeks = (s: State, p: Process) => Array.from({ length: 12 }, (_, i) => processHealth(s, p, addDays(todayIso(), (i - 11) * 7)).code).join('')

export interface AttentionItem { id: string; title: string; kind: string; process: string; due: string; late: boolean; state: string; tone: BadgeTone; area: Area; to: string }
export function attentionItems(state: State, who: string, can: (area: Area, level?: 'Manage') => boolean): AttentionItem[] {
  const today = todayIso()
  const items: AttentionItem[] = []
  function add(id: string, title: string, kind: string, process: string, due: string | undefined, area: Area, to: string, label: string) {
    const late = !!due && due < today
    items.push({ id, title, kind, process, due: due ? late ? `${daysBetween(due, today)} days late` : `Due ${formatDate(due)}` : 'No due date', late, state: late ? 'Overdue' : label, tone: late ? 'overdue' : 'progress', area, to })
  }
  if (can('Corrective Action')) for (const n of state.ncs.filter(n => n.stage < 6 && (n.owner === who || n.verifier === who || can('Corrective Action', 'Manage')))) add(n.id, n.title, 'Nonconformity', n.process, n.dueDate, 'Corrective Action', `/corrective-action/${n.id}`, n.verifier === who && n.stage >= 4 ? 'Your verification' : 'Action needed')
  if (can('Documents')) for (const d of state.documents.filter(d => (d.stage === 'Approval' && d.approvers.includes(who)) || (d.stage === 'Technical review' && d.reviewers.includes(who)) || ((d.stage === 'Changes requested' || (!!dueOn(d.nextReview) && dueOn(d.nextReview)! < today)) && (d.owner === who || can('Documents', 'Manage'))))) add(d.id, d.title, 'Document', d.process, dueOn(d.nextReview), 'Documents', `/documents/${d.id}`, d.stage === 'Approval' ? 'Your approval' : 'Your review')
  if (can('Risks & Opportunities')) for (const r of state.risks.filter(r => r.review !== 'Archived' && r.owner === who && r.nextReviewDate && r.nextReviewDate <= addDays(today, 7))) add(r.id, r.title, 'Risk review', r.process, r.nextReviewDate, 'Risks & Opportunities', `/risks/${r.id}`, 'Your review')
  if (can('Management Review')) for (const r of state.reviews.filter(r => r.stage !== 'Closed' && (r.preparedBy === who || r.reviewers.includes(who) || r.inputs.some(i => i.handedTo === who)))) add(r.id, r.title, 'Management review', 'Company-wide', dueOn(r.date), 'Management Review', `/management-review/${r.id}`, 'Your review')
  return items.sort((a, b) => Number(b.late) - Number(a.late) || a.due.localeCompare(b.due))
}

export function upcomingItems(state: State, can: (area: Area) => boolean) {
  const today = todayIso()
  const records = [
    ...state.audits.filter(a => !a.heldDate && a.state !== 'Report issued').map(a => ({ id: a.id, date: dueOn(a.date), title: `${a.process} audit`, meta: `${a.id}, lead ${a.lead}`, area: 'Audits' as Area, to: `/audits/${a.id}` })),
    ...state.reviews.filter(r => r.stage !== 'Closed' && r.stage !== 'Reviewed').map(r => ({ id: r.id, date: dueOn(r.date), title: r.title, meta: r.id, area: 'Management Review' as Area, to: `/management-review/${r.id}` })),
    ...state.documents.filter(d => d.stage === 'Published').map(d => ({ id: d.id, date: dueOn(d.nextReview), title: `Review ${d.title}`, meta: d.process, area: 'Documents' as Area, to: `/documents/${d.id}` })),
  ]
  return records.filter(r => r.date && r.date >= today && r.date <= addDays(today, 30) && can(r.area)).sort((a, b) => a.date!.localeCompare(b.date!)).slice(0, 8).map(r => ({ ...r, day: r.date!.slice(-2), mon: formatDate(r.date).split(' ')[1] }))
}
