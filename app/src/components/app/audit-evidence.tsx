import * as React from 'react'
import type { AuditReference } from '@/data/audit-types'
import { useStore } from '@/lib/store'
import { nowIso } from '@/lib/periods'
import { isSafeUrl } from '@/lib/record-links'
import { referenceKey } from '@/lib/audit-evidence'
import { RecordLink, OutsideLink } from './record-link'
import { Field, RecordPicker } from './form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EvidenceSheet } from '@/pages/evidence/evidence-sheet'
export function AuditReferenceLink({ reference: r }: { reference: AuditReference }) {
  const { state, canSee } = useStore()
  if (r.kind === 'link') return <OutsideLink url={r.url} label={r.title} />
  const record = r.kind === 'document' ? state.documents.find(d => d.id === r.id) : state.evidence.find(e => e.id === r.id)
  const viewers = record && 'viewers' in record ? record.viewers as string[] : undefined
  return record && canSee(record.classification, viewers) ? <RecordLink kind={r.kind} id={r.id!} label={record.title}>{record.title}</RecordLink> : <span className="text-muted-foreground">Not available ({r.id})</span>
}
export function AuditEvidenceEditor({ value, onChange, readOnly = false }: { value: AuditReference[]; onChange: (refs: AuditReference[]) => void; readOnly?: boolean }) {
  const { state, user, canSee, can } = useStore()
  const [url, setUrl] = React.useState(''), [title, setTitle] = React.useState(''), [error, setError] = React.useState(''), [create, setCreate] = React.useState(false)
  const documents = state.documents.filter(d => canSee(d.classification, d.viewers)), evidence = state.evidence.filter(e => canSee(e.classification))
  const options = [...documents.map(d => ({ id: d.id, title: d.title, meta: 'Document' })), ...evidence.map(e => ({ id: e.id, title: e.title, meta: 'Evidence' }))]
  function fromId(id: string): AuditReference { const d = documents.find(d => d.id === id), e = evidence.find(e => e.id === id); return { kind: d ? 'document' : 'evidence', id, title: d?.title ?? e?.title ?? id, addedBy: user.name, addedAt: nowIso() } }
  return <div className="flex min-w-0 flex-col gap-3">
    {value.length ? <ul className="flex flex-col gap-2">{value.map(r => <li key={referenceKey(r)} className="flex flex-wrap items-center gap-2 break-all text-sm"><AuditReferenceLink reference={r} />{!readOnly && <Button size="sm" variant="quiet" aria-label={`Remove evidence ${r.title}`} onClick={() => onChange(value.filter(x => referenceKey(x) !== referenceKey(r)))}>Remove</Button>}</li>)}</ul> : <p className="text-sm text-muted-foreground">No evidence linked.</p>}
    {!readOnly && <>
      <RecordPicker label="Link existing document or evidence" options={options} value={value.filter(r => r.kind !== 'link').map(r => r.id!)} onChange={ids => onChange([...value.filter(r => r.kind === 'link'), ...ids.map(id => value.find(r => r.id === id) ?? fromId(id))])} />
      <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Evidence title" placeholder="Evidence title" value={title} onChange={e => setTitle(e.target.value)} /><Input aria-label="Evidence URL" placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} /></div>
      {error && <p role="alert" className="text-sm text-overdue">{error}</p>}
      <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!url.trim()} onClick={() => { if (!isSafeUrl(url)) return setError('Use a full https:// link to a public document host.'); const r: AuditReference = { kind: 'link', url: url.trim(), title: title.trim() || 'Supporting evidence', addedBy: user.name, addedAt: nowIso() }; onChange([...value.filter(x => referenceKey(x) !== referenceKey(r)), r]); setUrl(''); setTitle(''); setError('') }}>Add evidence link</Button>{can('Evidence', 'Add and edit') && <Button variant="quiet" size="sm" onClick={() => setCreate(true)}>Add to evidence library</Button>}</div>
      <p className="text-xs text-muted-foreground">Links open in a new tab. SharePoint and OneDrive are identified by source; other links are external and not checked. Adding a link does not verify it.</p>
      <EvidenceSheet open={create} onOpenChange={setCreate} onCreated={id => onChange([...value, { kind: 'evidence', id, title: id, addedBy: user.name, addedAt: nowIso() }])} />
    </>}
  </div>
}
