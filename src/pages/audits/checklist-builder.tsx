import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowDownIcon, ArrowUpIcon, CopyIcon, FileTextIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
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

let uid = 100
const newQuestion = (clause: string): ChecklistQuestion => ({ id: `q${++uid}`, type: "Audit assessment", clause, text: "New question", askedBy: "Daniel Reyes", required: true, evidence: [], guidance: "" })

export default function ChecklistBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, update, add } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const [sections, setSections] = React.useState<ChecklistSection[]>(() => (id === "IA-2026-05" ? structuredClone(CHECKLIST) : [{ id: "s0", clause: "Start", title: "Opening meeting", items: [{ ...newQuestion("Start"), type: "Instruction", text: "Confirm the scope and timetable with the process owner.", required: false }] }]))
  const [sel, setSel] = React.useState<string>(id === "IA-2026-05" ? "q6" : "")
  const [evidenceDraft, setEvidenceDraft] = React.useState("")
  const [template, setTemplate] = React.useState(false)
  const [tplName, setTplName] = React.useState("")

  if (!audit) return <NotFound />

  const all = sections.flatMap((s) => s.items)
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
    const s: ChecklistSection = { id: `s${++uid}`, clause, title: "New section", items: [] }
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
            <Button variant="outline" onClick={() => { setTplName(`${audit.process}, ${new Date().getFullYear()}`); setTemplate(true) }}>
              <CopyIcon /> Save as template
            </Button>
            <Button
              onClick={() => {
                update("audits", audit.id, { state: "Checklist ready" })
                toast("Checklist marked ready", { description: `${audit.lead} and the team can use it on the day.` })
                navigate(`/audits/${audit.id}`)
              }}
            >
              Mark checklist ready
            </Button>
          </>
        }
      />

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
                        className={cn("grid w-full cursor-pointer grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 px-5 py-3 text-left", on ? "bg-[#f6f7fd] shadow-[inset_3px_0_0_var(--primary)]" : "hover:bg-[#fafafb]")}
                      >
                        <span className="text-[13px] font-semibold text-muted-foreground">{numbering.get(q.id)}</span>
                        <span className="flex min-w-0 flex-col gap-1">
                          <span className="text-sm font-medium">{q.text}</span>
                          <span className="text-xs text-muted-foreground">
                            {q.type}
                            {q.evidence.length ? `, ${q.evidence.length} linked` : ""}, {q.askedBy}
                          </span>
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
              <div className="flex flex-col gap-2 rounded-md bg-background p-3">
                <span className="text-xs text-muted-foreground">What the auditor will see</span>
                <div className="flex flex-wrap gap-1.5">
                  {(ANSWER_PREVIEW[current.type] ?? []).map((o) => (
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
              <Field label="Evidence to look at">
                <ul className="flex flex-col gap-1.5">
                  {current.evidence.map((ev) => (
                    <li key={ev} className="flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[13px]">
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
                  <span className="text-[13px] text-muted-foreground">The audit can’t be closed until it is answered.</span>
                </span>
                <Switch checked={current.required} onCheckedChange={(v) => patchQ(current.id, { required: v })} aria-label="Answer required" />
              </label>
            </CardContent>
          </Card>
        )}
      </div>

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
                add("templates", { id: `CT-${Date.now()}`, name: tplName || audit.process, process: audit.process, questions: count, owner: audit.lead, updated: "Today", used: 0 })
                toast(`Saved “${tplName}” to checklist templates`)
                setTemplate(false)
              }}
            >
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
