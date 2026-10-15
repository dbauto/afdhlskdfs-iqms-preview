import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, FileTextIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { docIdOf, involvement } from "@/lib/auditors"
import { Alert } from "@/components/ui/alert"
import { auditRights, latestChecklist, normalizeQuestion } from "@/lib/audit-workflow"
import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { ANSWER_PREVIEW, ANSWER_TYPES, CHECKLIST } from "@/data/records"
import type { ChecklistQuestion, ChecklistSection } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/app/page"
import { Field } from "@/components/app/form"
import NotFound from "@/pages/not-found"

export default function ChecklistBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, add, auditCommand, user, role, takenIds } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const [versionId, setVersionId] = React.useState<string>()
  const storedChecklist = state.auditChecklists.find(c => c.id === versionId) ?? latestChecklist(state, id ?? "")
  const draftId = React.useRef(storedChecklist?.id ?? nextId(takenIds("auditChecklists"), "ACL-", 4))
  const rights = audit ? auditRights(audit, user, role) : { lead: false, edit: false }
  const editable = rights.edit && storedChecklist?.status !== "Released"
  const [sections, setLocalSections] = React.useState<ChecklistSection[]>(() => structuredClone(storedChecklist?.sections ?? audit?.templateSnapshot?.sections ?? [{ id: "s0", clause: "Start", title: "Opening meeting", items: [{ id: "q0", type: "Instruction", text: "Confirm the scope and timetable with the process owner.", askedBy: audit?.lead ?? "", required: false, evidence: [], guidance: "" }] }]))
  const [usesQuestionnaire, setUsesQuestionnaire] = React.useState(storedChecklist?.usesQuestionnaire ?? audit?.usesQuestionnaire ?? false)
  const [revision, setRevision] = React.useState(false)
  const [reason, setReason] = React.useState("")
  function persist(next: ChecklistSection[], uses = usesQuestionnaire) {
    if (!id || !editable) return
    try { auditCommand({ kind: "saveChecklist", auditId: id, id: draftId.current, sections: next, usesQuestionnaire: uses }) }
    catch (e) { toast.error((e as Error).message) }
  }
  const setSections: React.Dispatch<React.SetStateAction<ChecklistSection[]>> = next => {
    const value = typeof next === "function" ? next(sections) : next
    setLocalSections(value)
    persist(value)
  }
  const newQuestion = (clause: string): ChecklistQuestion => normalizeQuestion({ id: nextId(sections.flatMap(s => s.items).map(q => q.id), `AQ-${draftId.current}-`, 3), type: "Audit assessment", clause: audit?.clauses.includes(clause) ? clause : audit?.clauses[0], text: "New question", askedBy: audit?.lead ?? "", required: true, evidence: [], guidance: "" })
  const [sel, setSel] = React.useState<string>(id === "IA-2026-05" ? "q6" : "")
  const [evidenceDraft, setEvidenceDraft] = React.useState("")
  const [template, setTemplate] = React.useState(false)
  const [tplName, setTplName] = React.useState("")

  if (!audit) return <NotFound />

  const all = sections.flatMap((s) => s.items)
  // Record-level independence: the person judging an item mustn't own, review or approve the documents it looks at.
  const conflicts = (q: ChecklistQuestion, who = q.askedBy) =>
    q.evidence
      .map((ev) => {
        const doc = state.documents.find((d) => d.id === docIdOf(ev))
        const how = involvement(who, doc)
        return how && doc ? { doc: doc.id, how } : undefined
      })
      .filter((x): x is { doc: string; how: string } => !!x)
  const current = all.find((q) => q.id === sel) ?? all[0]
  const count = all.filter((q) => q.type !== "Instruction").length
  const instructions = all.length - count

  function patchQ(qid: string, patch: Partial<ChecklistQuestion>) {
    setSections((ss) => ss.map((s) => ({ ...s, items: s.items.map((q) => (q.id === qid ? { ...q, ...patch } : q)) })))
  }
  function move(qid: string, dir: -1 | 1) {
    setSections((ss) =>
      ss.map((s) => {
        const i = s.items.findIndex((q) => q.id === qid)
        if (i < 0) return s
        const j = i + dir
        if (j < 0 || j >= s.items.length) return s
        const items = [...s.items]
        ;[items[i], items[j]] = [items[j], items[i]]
        return { ...s, items }
      })
    )
  }
  function removeQ(qid: string) {
    setSections((ss) => ss.map((s) => ({ ...s, items: s.items.filter((q) => q.id !== qid) })))
    setSel("")
  }
  function addQ(sid: string) {
    const s = sections.find((x) => x.id === sid)!
    const q = newQuestion(s.clause)
    setSections((ss) => ss.map((x) => (x.id === sid ? { ...x, items: [...x.items, q] } : x)))
    setSel(q.id)
  }
  function addSection() {
    const clause = audit!.clauses.find((c) => !sections.some((s) => s.clause === c)) ?? "New"
    const s: ChecklistSection = { id: nextId(sections.map(s => s.id), `AS-${draftId.current}-`, 3), clause, title: "New section", items: [] }
    setSections((ss) => [...ss, s])
  }

  let no = 0
  const numbering = new Map(all.map((q) => [q.id, ++no]))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: `${audit.id} ${audit.process}`, to: `/audits/${audit.id}` }, { label: "Checklist" }]}
        title={`Checklist for the ${audit.process} audit`}
        description={`${count} questions and ${instructions} instruction${instructions === 1 ? "" : "s"} in ${sections.length} sections. Audit on ${audit.date}, lead ${audit.lead}. Changes save automatically.`}
        actions={
          <>
            {editable && <Button variant="outline" onClick={() => { setTplName(`${audit.process}, ${new Date().getFullYear()}`); setTemplate(true) }}>
              <CopyIcon /> Save as template
            </Button>}
            {editable && <Button
              disabled={!rights.lead}
              onClick={() => {
                try { auditCommand({ kind: "releaseChecklist", auditId: audit.id, id: draftId.current, sections, usesQuestionnaire }) }
                catch (e) { return toast.error((e as Error).message) }
                toast("Checklist marked ready", { description: `${audit.lead} and the team can use it on the day.` })
                navigate(`/audits/${audit.id}`)
              }}
            >
              Mark checklist ready
            </Button>}
            {storedChecklist?.status === "Released" && rights.lead && <Button onClick={() => setRevision(true)}>Start checklist revision</Button>}
          </>
        }
      />

      <Card><CardContent className="flex flex-wrap items-center gap-3 py-4">
        <span className="text-sm">Version {storedChecklist?.version ?? 1} · {storedChecklist?.status ?? "Unsaved draft"}</span>
        {storedChecklist?.releasedBy && <span className="text-xs text-muted-foreground">Released by {storedChecklist.releasedBy} at {storedChecklist.releasedAt}</span>}
        <NativeSelect aria-label="Checklist version" value={storedChecklist?.id ?? ""} onChange={e => { const c = state.auditChecklists.find(c => c.id === e.target.value); if (!c) return; setVersionId(c.id); draftId.current = c.id; setLocalSections(structuredClone(c.sections)); setUsesQuestionnaire(c.usesQuestionnaire) }}>
          {!storedChecklist && <option value="">Unsaved draft</option>}
          {state.auditChecklists.filter(c => c.auditId === audit.id).sort((a,b) => b.version-a.version).map(c => <option key={c.id} value={c.id}>Version {c.version} · {c.status}</option>)}
        </NativeSelect>
        <label className="flex items-center gap-2 text-sm"><Switch aria-label="Use pre-audit questionnaire" disabled={!editable} checked={usesQuestionnaire} onCheckedChange={v => { setUsesQuestionnaire(v); persist(sections, v) }} />Use pre-audit questionnaire</label>
      </CardContent></Card>
      <fieldset disabled={!editable} className="contents">
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-4">
          {sections.map((s) => (
            <Card key={s.id}>
              <CardHeader className="gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="rounded-[4px] bg-background px-2 py-0.5 text-xs font-semibold">{s.clause}</span>
                  <input
                    aria-label="Section title"
                    value={s.title}
                    onChange={(e) => setSections((ss) => ss.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                    className="min-w-0 flex-1 rounded-sm bg-transparent px-1 text-base font-semibold outline-none focus:bg-background"
                  />
                </div>
                <Button variant="quiet" size="sm" onClick={() => addQ(s.id)}>
                  <PlusIcon /> Add question
                </Button>
              </CardHeader>
              <ul>
                {s.items.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No questions yet.</li>}
                {s.items.map((q, i) => {
                  const on = q.id === current?.id
                  return (
                    <li key={q.id} className={cn(i > 0 && "border-t border-rule-soft")}>
                      <button
                        type="button"
                        onClick={() => setSel(q.id)}
                        aria-pressed={on}
                        className={cn("grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3 text-left", on ? "bg-highlight shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-hover")}
                      >
                        <span className="text-[0.8125rem] font-semibold text-muted-foreground">{numbering.get(q.id)}</span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-sm font-medium">{q.text}</span>
                          <span className="text-xs text-muted-foreground">
                            {q.type}
                            {q.evidence.length ? `, ${q.evidence.length} linked` : ""}, {q.askedBy}
                          </span>
                          {conflicts(q).length > 0 && <span className="text-xs font-semibold text-soon">Not independent: {q.askedBy} {conflicts(q)[0].how} {conflicts(q)[0].doc}</span>}
                        </span>
                        {q.required && <span className="text-xs text-muted-foreground">Required</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
          <Button variant="outline" className="self-start" onClick={addSection}>
            <PlusIcon /> Add section
          </Button>
        </div>

        {current && (
          <Card className="xl:sticky xl:top-20">
            <CardHeader>
              <CardTitle>Question {numbering.get(current.id)}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-sm" aria-label="Move up" onClick={() => move(current.id, -1)}>
                  <ArrowUpIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Move down" onClick={() => move(current.id, 1)}>
                  <ArrowDownIcon />
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Delete question" onClick={() => removeQ(current.id)} className="text-destructive">
                  <Trash2Icon />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Field label="Question" htmlFor="q-text">
                <Textarea id="q-text" value={current.text} onChange={(e) => patchQ(current.id, { text: e.target.value })} className="min-h-20" />
              </Field>
              <Field label="Answer type" htmlFor="q-type">
                <NativeSelect id="q-type" value={current.type} onChange={(e) => patchQ(current.id, { type: e.target.value })}>
                  {ANSWER_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </NativeSelect>
              </Field>

              <Field label="Who should respond?" htmlFor="q-respond">
                <NativeSelect id="q-respond" value={current.respondBy ?? "Auditor"} onChange={e => patchQ(current.id, { respondBy: e.target.value as ChecklistQuestion["respondBy"], auditeeRequired: e.target.value !== "Auditor" })}>
                  {["Auditee", "Auditor", "Both"].map(v => <option key={v}>{v}</option>)}
                </NativeSelect>
              </Field>
              {current.respondBy !== "Auditor" && <Field label="Assigned respondent" htmlFor="q-respondent" optional><NativeSelect id="q-respondent" value={current.respondent ?? ""} onChange={e => patchQ(current.id, { respondent: e.target.value })}><option value="">Choose when assigning</option>{state.people.filter(p => p.status !== "Deactivated").map(p => <option key={p.id}>{p.name}</option>)}</NativeSelect></Field>}
              <Field label="Evidence requirement" htmlFor="q-evidence-rule"><NativeSelect id="q-evidence-rule" value={current.evidenceRule ?? "Optional"} onChange={e => patchQ(current.id, { evidenceRule: e.target.value as ChecklistQuestion["evidenceRule"] })}>{["Not required", "Optional", "Required", "When No"].map(v => <option key={v}>{v}</option>)}</NativeSelect></Field>
              {current.type === "Multiple choice" && <Field label="Choices, one per line" htmlFor="q-choices"><Textarea id="q-choices" value={(current.choices ?? []).join("\n")} onChange={e => patchQ(current.id, { choices: e.target.value.split("\n") })} /></Field>}
              <label className="flex items-center justify-between gap-3 text-sm">N/A needs a justification<Switch aria-label="N/A needs a justification" checked={current.naJustification ?? true} onCheckedChange={v => patchQ(current.id, { naJustification: v })} /></label>
              <label className="flex items-center justify-between gap-3 text-sm">Auditor assessment required<Switch aria-label="Auditor assessment required" checked={current.assessmentRequired ?? true} onCheckedChange={v => patchQ(current.id, { assessmentRequired: v })} /></label>
              <Field label="Show after question" optional><NativeSelect aria-label="Show after question" value={current.showWhen?.questionId ?? ""} onChange={e => patchQ(current.id, { showWhen: e.target.value ? { questionId: e.target.value, equals: "No" } : undefined })}><option value="">Always show</option>{all.slice(0, all.indexOf(current)).filter(q => q.type !== "Instruction").map(q => <option key={q.id} value={q.id}>{q.text}</option>)}</NativeSelect>{current.showWhen && <Input aria-label="Show when answer equals" value={current.showWhen.equals} onChange={e => patchQ(current.id, { showWhen: { ...current.showWhen!, equals: e.target.value } })} />}</Field>
              <div className="flex flex-col gap-2 rounded-md bg-background p-3">
                <span className="text-xs text-muted-foreground">What the auditor will see</span>
                <div className="flex flex-wrap gap-1.5">
                  {(current.type === "Multiple choice" ? current.choices ?? [] : ANSWER_PREVIEW[current.type] ?? []).map((o) => (
                    <span key={o} className="inline-flex h-7 items-center rounded-full border bg-card px-3 text-xs">
                      {o}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Clause" htmlFor="q-clause">
                  <NativeSelect id="q-clause" value={current.clause ?? ""} onChange={(e) => patchQ(current.id, { clause: e.target.value })}>
                    <option value="">None</option>
                    {audit.clauses.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Asked by" htmlFor="q-by">
                  <NativeSelect id="q-by" value={current.askedBy} onChange={(e) => patchQ(current.id, { askedBy: e.target.value })}>
                    {[audit.lead, ...audit.auditors].map((p) => (
                      <option key={p}>{p}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              {(() => {
                const c = conflicts(current)
                if (!c.length) return null
                const swap = [audit.lead, ...audit.auditors].find((p) => p !== current.askedBy && conflicts(current, p).length === 0)
                return (
                  <Alert tone="warning" title="Someone else should judge this item">
                    <span className="flex flex-col items-start gap-2.5">
                      <span>
                        {current.askedBy} {c.map((x) => `${x.how} ${x.doc}`).join(" and ")}, so judging it would mean auditing their own work. ISO 9001 clause 9.2.2.
                      </span>
                      {swap && (
                        <Button variant="outline" size="sm" onClick={() => patchQ(current.id, { askedBy: swap })}>
                          Give to {swap}
                        </Button>
                      )}
                    </span>
                  </Alert>
                )
              })()}
              <Field label="Evidence to look at">
                <ul className="flex flex-col gap-1.5">
                  {current.evidence.length === 0 && <li className="text-[0.8125rem] text-muted-foreground">Nothing linked yet. Link the documents or records the auditor should look at.</li>}
                  {current.evidence.map((ev) => (
                    <li key={ev} className="flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[0.8125rem]">
                      <FileTextIcon className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{ev}</span>
                      <button type="button" aria-label={`Remove ${ev}`} onClick={() => patchQ(current.id, { evidence: current.evidence.filter((x) => x !== ev) })} className="cursor-pointer text-muted-foreground">
                        <XIcon className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!evidenceDraft.trim()) return
                    patchQ(current.id, { evidence: [...current.evidence, evidenceDraft.trim()] })
                    setEvidenceDraft("")
                  }}
                >
                  <Input aria-label="Link a document or record" list="doc-ids" value={evidenceDraft} onChange={(e) => setEvidenceDraft(e.target.value)} placeholder="Link a document or record" className="h-9" />
                  <datalist id="doc-ids">
                    {state.documents.slice(0, 40).map((d) => (
                      <option key={d.id} value={`${d.id} ${d.title}`} />
                    ))}
                  </datalist>
                  <Button type="submit" variant="outline" size="sm" className="h-9">
                    Link
                  </Button>
                </form>
              </Field>
              <Field label="Guidance for the auditor" htmlFor="q-guide" optional>
                <Textarea id="q-guide" value={current.guidance} onChange={(e) => patchQ(current.id, { guidance: e.target.value })} className="min-h-20" />
              </Field>
              <label className="flex items-start justify-between gap-4">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Answer required</span>
                  <span className="text-[0.8125rem] text-muted-foreground">The audit can’t be closed until it is answered.</span>
                </span>
                <Switch checked={current.required} onCheckedChange={(v) => patchQ(current.id, { required: v })} aria-label="Answer required" />
              </label>
            </CardContent>
          </Card>
        )}
      </div>

      </fieldset>
      <Dialog open={template} onOpenChange={setTemplate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>Next time you plan an audit of this process, you can start from this checklist.</DialogDescription>
          </DialogHeader>
          <Field label="Template name" htmlFor="tpl-name">
            <Input id="tpl-name" value={tplName} onChange={(e) => setTplName(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTemplate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                add("templates", { id: nextId(takenIds("templates"), "CT-", 4), name: tplName || audit.process, process: audit.process, questions: count, sections: structuredClone(sections), version: 1, owner: audit.lead, updated: "Today", used: 0 })
                toast(`Saved “${tplName}” to checklist templates`)
                setTemplate(false)
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={revision} onOpenChange={setRevision}><DialogContent><DialogHeader><DialogTitle>Start checklist revision</DialogTitle><DialogDescription>Released versions and their responses stay unchanged. The new version starts as a revision draft.</DialogDescription></DialogHeader><Field label="Reason" htmlFor="revision-reason"><Textarea id="revision-reason" value={reason} onChange={e => setReason(e.target.value)} /></Field><DialogFooter><Button disabled={!reason.trim()} onClick={() => { const newId = nextId(takenIds("auditChecklists"), "ACL-", 4); try { auditCommand({ kind: "reviseChecklist", auditId: audit.id, id: newId, reason }); draftId.current = newId; setVersionId(newId); setLocalSections(structuredClone(storedChecklist!.sections)); setRevision(false); toast("Revision draft created") } catch(e) { toast.error((e as Error).message) } }}>Create revision draft</Button></DialogFooter></DialogContent></Dialog>
    </>
  )
}
