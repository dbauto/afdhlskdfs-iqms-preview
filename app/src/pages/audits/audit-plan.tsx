import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { MailIcon, PencilIcon, PlusIcon, PrinterIcon, Trash2Icon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { daysBetween, formatDate, nowIso, todayIso } from "@/lib/periods"
import { nextId } from "@/lib/ids"
import { ISO_CLAUSES, ISO_EDITION } from "@/data/iso"
import { INITIAL_SCOPE } from "@/lib/document-control"
import {
  PLAN_KINDS,
  PLAN_KIND_HINT,
  PRINT_PARTS,
  QUESTION_BANK,
  RESULTS,
  isExternal,
  planFromTemplate,
  type AuditPlan,
  type FindingGrade,
  type PlanFinding,
  type PlanKind,
  type PlanSlot,
  type QResult,
} from "@/data/audit-plans"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { Field, PeopleOptions } from "@/components/app/form"
import { EmptyLine, PageHeader } from "@/components/app/page"
import NotFound from "@/pages/not-found"
import { RowActions } from "@/components/app/record-actions"

const RESULT_TONE: Record<QResult, BadgeTone> = { Conforms: "done", Opportunity: "progress", Minor: "soon", Major: "overdue", "Not checked": "draft" }
const GRADE_TONE: Record<FindingGrade, BadgeTone> = { Major: "overdue", Minor: "soon", Opportunity: "progress" }
const STATUS_TONE: Record<AuditPlan["status"], BadgeTone> = { Draft: "draft", Planned: "progress", "In progress": "soon", "Report released": "done" }

/** Who may change a plan: audit editors, and the consultant on their own mock audit. Releasing needs Manage. */
export function usePlanRights(plan?: AuditPlan) {
  const { can, role } = useStore()
  const consultantMock = role.id === "consultant" && plan?.kind === "Mock audit"
  const edit = consultantMock || (role.id !== "consultant" && can("Audits", "Add and edit"))
  return { edit: edit && plan?.status !== "Report released", release: consultantMock || can("Audits", "Manage"), view: can("Audits") }
}

const timeKey = (t: string) => t.padStart(5, "0")
export const sortedSlots = (p: AuditPlan) => [...p.slots].sort((a, b) => timeKey(a.time).localeCompare(timeKey(b.time)) || (a.auditor ?? -1) - (b.auditor ?? -1))

/** Findings: graded checklist answers, plus findings added by hand (for certification audits, the ones received). */
export function planFindings(p: AuditPlan): PlanFinding[] {
  const fromQ = p.questions
    .filter((q) => q.result === "Minor" || q.result === "Major" || q.result === "Opportunity")
    .filter((q) => !p.findings.some((f) => f.fromQuestion === q.id))
    .map((q) => ({ id: `f-${q.id}`, title: q.text.replace(/\?$/, ""), detail: q.note ?? "", grade: q.result as FindingGrade, clause: q.clause, slotId: q.slotId, fromQuestion: q.id }))
  return [...p.findings, ...fromQ]
}

/* ------------------------------------------------------------------ */
/* Evidence pack: worked out from the records                          */
/* ------------------------------------------------------------------ */

export type PackState = "Ready" | "Out of date" | "Missing"
export interface PackItem { key: string; title: string; meta: string; owner: string; state: PackState; to?: string; evidenceId?: string }

export function usePack(plan: AuditPlan) {
  const { state } = useStore()
  const today = todayIso()
  return sortedSlots(plan)
    .filter((s) => !s.shared && s.clauses.length)
    .map((s) => {
      const covers = (c: string) => s.clauses.some((x) => c === x || c.startsWith(`${x}.`) || x.startsWith(`${c}.`))
      const removed = new Set((plan.packRemoved ?? []).filter((r) => r.slotId === s.id).map((r) => r.evidenceId))
      const added = new Set((plan.packAdded ?? []).filter((r) => r.slotId === s.id).map((r) => r.evidenceId))
      const ev = state.evidence.filter((e) => !removed.has(e.id) && (added.has(e.id) || (e.clauses.some(covers) && (!s.processes.length || e.processes.some((p) => s.processes.includes(p))))))
      const items: PackItem[] = ev.slice(0, 6).map((e) => {
        const old = e.addedDate ? daysBetween(e.addedDate, today) > 365 : false
        const owner = state.processes.find((p) => e.processes.includes(p.name))?.owner ?? e.addedBy
        return { key: e.id, evidenceId: e.id, title: e.title, meta: `${e.id} · added ${e.added}`, owner, state: old ? "Out of date" : "Ready", to: `/evidence/${e.id}` }
      })
      // a clause in the slot with nothing behind it is missing
      for (const c of s.clauses) {
        if (!ev.some((e) => e.clauses.some((x) => x === c || x.startsWith(`${c}.`) || c.startsWith(`${x}.`)))) {
          const owner = state.processes.find((p) => s.processes.includes(p.name))?.owner ?? "Maria Santos"
          items.push({ key: `${s.id}-${c}`, title: `Evidence for clause ${c}`, meta: "Nothing recorded yet", owner, state: "Missing" })
        }
      }
      return { slot: s, items }
    })
}

const PACK_TONE: Record<PackState, BadgeTone> = { Ready: "done", "Out of date": "soon", Missing: "overdue" }

/* ------------------------------------------------------------------ */
/* New plan                                                            */
/* ------------------------------------------------------------------ */

export function NewPlanDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, add, takenIds, settings } = useStore()
  const navigate = useNavigate()
  const [kind, setKind] = React.useState<PlanKind>("Stage 2")
  const [date, setDate] = React.useState("")
  const [err, setErr] = React.useState("")
  const [auditors, setAuditors] = React.useState<{ name: string; role: string }[]>([])
  const opts = { body: settings.certification.body.trim(), date, scope: state.documents.find((d) => d.scopeContent)?.scopeContent?.products || INITIAL_SCOPE.products, sites: settings.sites.filter((s) => s.inScope).map((s) => s.name).join(", "), standard: ISO_EDITION }
  React.useEffect(() => {
    if (open) {
      setKind("Stage 2")
      setDate(settings.certification.main || "")
      setErr("")
    }
  }, [open, settings.certification.main])
  // the template's auditors, ready to rename
  React.useEffect(() => setAuditors(planFromTemplate(kind, "x", opts).auditors), [kind, open]) // eslint-disable-line react-hooks/exhaustive-deps
  function create() {
    if (!date) return setErr("Set the date, or the date it’s expected.")
    const id = nextId(takenIds("auditPlans"), `AP-${date.slice(0, 4)}-`)
    if (auditors.some((a) => !a.name.trim())) return setErr("Give every auditor a name, or remove the empty one.")
    if (!auditors.length) return setErr("Add at least one auditor.")
    const base = planFromTemplate(kind, id, opts)
    const n = auditors.length
    // slots for auditors that were removed go to the lead auditor
    const plan = { ...base, auditors: auditors.map((a) => ({ name: a.name.trim(), role: a.role.trim() || "Auditor" })), slots: base.slots.map((x) => (x.auditor !== undefined && x.auditor >= n ? { ...x, auditor: 0 } : x)) }
    add("auditPlans", plan)
    toast(`${id} created from the ${kind} template`, { description: "Change anything: auditors, times, areas and what the printout shows." })
    onOpenChange(false)
    navigate(`/audits/plans/${id}`)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New audit plan</DialogTitle>
          <DialogDescription>Start from a template, then change anything. The workflow is the same for every kind; only the auditors differ.</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Kind of audit" className="grid gap-2 sm:grid-cols-2">
          {PLAN_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={cn("flex cursor-pointer flex-col items-start gap-0.5 rounded-md border bg-card p-3 text-left hover:bg-hover", kind === k && "border-primary ring-1 ring-primary")}
            >
              <span className="text-sm font-semibold">{k}</span>
              <span className="text-[0.8125rem] text-muted-foreground">{PLAN_KIND_HINT[k]}</span>
            </button>
          ))}
        </div>
        <Field label="Date" htmlFor="np-d">
          <Input id="np-d" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Auditors</legend>
          {auditors.map((a, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
              <Input aria-label={`Auditor ${i + 1} name`} value={a.name} list="np-people" onChange={(e) => setAuditors(auditors.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" />
              <Input aria-label={`Auditor ${i + 1} role`} value={a.role} onChange={(e) => setAuditors(auditors.map((x, k) => (k === i ? { ...x, role: e.target.value } : x)))} placeholder="Role" />
              <Button variant="ghost" size="icon" aria-label={`Remove auditor ${i + 1}`} disabled={auditors.length === 1} onClick={() => setAuditors(auditors.filter((_, k) => k !== i))}><Trash2Icon /></Button>
            </div>
          ))}
          <datalist id="np-people"><PeopleOptions /></datalist>
          <Button variant="outline" size="sm" className="self-start" onClick={() => setAuditors([...auditors, { name: "", role: "Auditor" }])}><PlusIcon /> Add auditor</Button>
        </fieldset>
        {err && <p className="text-[0.8125rem] font-medium text-overdue" role="alert">{err}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create}>Create plan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Audits › Audit plans tab. */
export function AuditPlanList() {
  const { state, remove } = useStore()
  const { edit } = usePlanRights()
  const [open, setOpen] = React.useState(false)
  const plans = [...state.auditPlans].sort((a, b) => a.date.localeCompare(b.date))
  return (
    <>
      <DataTable
        label="Audit plans"
        rows={plans}
        getRowId={(p) => p.id}
        minWidth={760}
        empty={{ title: "No audit plans yet", body: "Plan a mock audit, a certification audit or a whole-QMS internal audit with a timetable." }}
        toolbar={
          <>
            <span className="text-[0.8125rem] text-muted-foreground">Mock, certification and whole-QMS audits with a timetable, checklist, evidence pack, findings and report.</span>
            {edit && (
              <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
                <PlusIcon /> New audit plan
              </Button>
            )}
          </>
        }
        columns={[
          { id: "t", header: "Audit", className: "min-w-[220px]", cell: (p) => <Link to={`/audits/plans/${p.id}`} className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{p.id}</span><span className="font-medium text-foreground">{p.title}</span></Link> },
          { id: "k", header: "Kind", cell: (p) => <Badge tone={isExternal(p.kind) ? "progress" : "draft"}>{p.kind}</Badge> },
          { id: "d", header: "Date", cell: (p) => formatDate(p.date) },
          { id: "b", header: "Audited by", cell: (p) => <span className="text-muted-foreground">{p.auditedBy}</span> },
          { id: "s", header: "Status", cell: (p) => <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge> },
          { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (p) => <RowActions name={p.id} openTo={`/audits/plans/${p.id}`} removeKind={edit && p.status !== "Report released" ? "delete" : undefined} onRemove={() => remove("auditPlans", p.id)} /> },
        ]}
      />
      <NewPlanDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/* The plan page                                                       */
/* ------------------------------------------------------------------ */

export default function AuditPlanPage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { state, update, notify } = useStore()
  const plan = state.auditPlans.find((p) => p.id === id)
  const rights = usePlanRights(plan)
  if (!plan || !rights.view) return <NotFound />
  const external = isExternal(plan.kind)
  const set = (patch: Partial<AuditPlan>) => update("auditPlans", plan.id, patch)
  const tab = params.get("tab") ?? "plan"

  function emailPlan() {
    const people = [...new Set([...plan!.auditors.map((a) => a.name), ...plan!.slots.flatMap((s) => s.processes.map((n) => state.processes.find((p) => p.name === n)?.owner ?? ""))])].filter((n) => state.people.some((p) => p.name === n))
    notify(people, { kind: "Audit", title: `${plan!.title} on ${formatDate(plan!.date)}`, body: "The plan and your slot are ready. Prepare the evidence for your area.", href: `/audits/plans/${plan!.id}` })
    toast("Plan sent", { description: `${people.length} people get it in ThryveMS and by email, with a link to the plan.` })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: plan.id }]}
        title={plan.title}
        description={`${formatDate(plan.date)} · ${plan.hours} · audited by ${plan.auditedBy}`}
        badge={<span className="flex flex-wrap gap-2"><Badge tone={external ? "progress" : "draft"}>{external ? "External" : "Internal"} · {plan.kind}</Badge><Badge tone={STATUS_TONE[plan.status]}>{plan.status}</Badge></span>}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/plans/${plan.id}/print`}><PrinterIcon /> Print or PDF</Link>
            </Button>
            {rights.edit && (
              <Button onClick={emailPlan}>
                <MailIcon /> Email plan to participants
              </Button>
            )}
          </>
        }
      />
      <Tabs defaultValue={tab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="plan">Plan</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="evidence">Evidence pack</TabsTrigger>
          <TabsTrigger value="findings">Findings <span className="text-xs font-normal text-muted-foreground">{planFindings(plan).length}</span></TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>
        <TabsContent value="plan"><PlanTab plan={plan} set={set} edit={rights.edit} /></TabsContent>
        <TabsContent value="checklist"><ChecklistTab plan={plan} set={set} edit={rights.edit} /></TabsContent>
        <TabsContent value="evidence"><EvidenceTab plan={plan} set={set} edit={rights.edit} /></TabsContent>
        <TabsContent value="findings"><FindingsTab plan={plan} set={set} edit={rights.edit} /></TabsContent>
        <TabsContent value="report"><ReportTab plan={plan} set={set} release={rights.release} /></TabsContent>
      </Tabs>
    </>
  )
}

type TabProps = { plan: AuditPlan; set: (p: Partial<AuditPlan>) => void; edit: boolean }

function PlanTab({ plan, set, edit }: TabProps) {
  const [slotSheet, setSlotSheet] = React.useState<{ open: boolean; slot?: PlanSlot; shared?: boolean }>({ open: false })
  const [auditorDlg, setAuditorDlg] = React.useState<{ open: boolean; index?: number }>({ open: false })
  const slots = sortedSlots(plan)
  const times = [...new Set(slots.map((s) => s.time))]
  const field = (k: "title" | "auditedBy" | "date" | "hours" | "standard" | "sites" | "scope", label: string, type = "text") => (
    <Field label={label} htmlFor={`ap-${k}`}>
      <Input id={`ap-${k}`} type={type} value={plan[k]} disabled={!edit} onChange={(e) => set({ [k]: e.target.value } as Partial<AuditPlan>)} />
    </Field>
  )
  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Plan details</CardTitle>
          {edit ? <span className="text-[0.8125rem] text-muted-foreground">Everything on this page is editable. Changes save as you go.</span> : <span className="text-[0.8125rem] text-muted-foreground">{plan.status === "Report released" ? "The report is released, so the plan is read only." : "You can view this plan. Ask an audit lead to change it."}</span>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-3">
            {field("title", "Title")}
            {field("auditedBy", "Audited by")}
            {field("date", "Date", "date")}
            {field("hours", "Hours")}
            {field("standard", "Standard")}
            {field("sites", "Sites")}
          </div>
          {field("scope", "Scope")}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Objectives" htmlFor="ap-obj" help="One per line.">
              <Textarea id="ap-obj" value={plan.objectives.join("\n")} disabled={!edit} onChange={(e) => set({ objectives: e.target.value.split("\n") })} className="min-h-24" />
            </Field>
            <Field label="Criteria" htmlFor="ap-cri" help="One per line.">
              <Textarea id="ap-cri" value={plan.criteria.join("\n")} disabled={!edit} onChange={(e) => set({ criteria: e.target.value.split("\n") })} className="min-h-24" />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-0.5">
            <CardTitle>Timetable</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Rows follow their start time; change the time to move a row. Click a slot to change it.</span>
          </div>
          {edit && (
            <span className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setAuditorDlg({ open: true })}><PlusIcon /> Add auditor</Button>
              <Button size="sm" variant="outline" onClick={() => setSlotSheet({ open: true, shared: true })}><PlusIcon /> Add break</Button>
              <Button size="sm" onClick={() => setSlotSheet({ open: true })}><PlusIcon /> Add slot</Button>
            </span>
          )}
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="w-20 border-b px-4 py-2.5 font-medium">Time</th>
                {plan.auditors.map((a, i) => (
                  <th key={i} className="border-b border-l px-4 py-2.5 font-medium">
                    <span className="flex items-center justify-between gap-2">
                      {edit ? (
                        <button type="button" onClick={() => setAuditorDlg({ open: true, index: i })} aria-label={`Edit ${a.name}`} className="group flex cursor-pointer flex-col text-left">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:text-primary">{a.name}<PencilIcon className="size-3 text-muted-foreground" aria-hidden="true" /></span>
                          <span>{a.role}</span>
                        </button>
                      ) : (
                        <span className="flex flex-col"><span className="text-sm font-semibold text-foreground">{a.name}</span><span>{a.role}</span></span>
                      )}
                      {edit && plan.auditors.length > 1 && (
                        <button type="button" aria-label={`Remove ${a.name}`} className="cursor-pointer rounded-sm p-1 hover:bg-hover" onClick={() => set({ auditors: plan.auditors.filter((_, k) => k !== i), slots: plan.slots.filter((s) => s.auditor !== i).map((s) => (s.auditor !== undefined && s.auditor > i ? { ...s, auditor: s.auditor - 1 } : s)) })}>
                          <Trash2Icon className="size-3.5" />
                        </button>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {times.map((t) => {
                const row = slots.filter((s) => s.time === t)
                const sharedSlot = row.find((s) => s.shared)
                return (
                  <tr key={t} className="border-t align-top">
                    <td className="px-4 py-3 font-semibold tabular-nums">{t}</td>
                    {sharedSlot ? (
                      <td colSpan={plan.auditors.length} className="border-l bg-background px-4 py-3">
                        <span className="flex items-center justify-between gap-2">
                          <button type="button" disabled={!edit} onClick={() => setSlotSheet({ open: true, slot: sharedSlot })} className="text-left font-semibold enabled:cursor-pointer enabled:hover:text-primary">{sharedSlot.area}</button>
                          {edit && <DeleteSlot plan={plan} set={set} slot={sharedSlot} />}
                        </span>
                      </td>
                    ) : (
                      plan.auditors.map((_, i) => {
                        const s = row.find((x) => x.auditor === i)
                        return (
                          <td key={i} className="border-l px-4 py-3">
                            {s ? (
                              <span className="flex items-start justify-between gap-2">
                              <button type="button" disabled={!edit} onClick={() => setSlotSheet({ open: true, slot: s })} className="flex min-w-0 flex-col gap-1 text-left enabled:cursor-pointer enabled:hover:text-primary">
                                <span className="font-semibold">{s.area}</span>
                                <span className="text-[0.8125rem] text-muted-foreground">{s.topics}</span>
                                <span className="flex flex-wrap gap-1">{[...s.processes, ...s.clauses].map((x) => <Badge key={x} tone="outline">{x}</Badge>)}</span>
                              </button>
                              {edit && <DeleteSlot plan={plan} set={set} slot={s} />}
                              </span>
                            ) : edit ? (
                              <button type="button" className="cursor-pointer text-[0.8125rem] text-muted-foreground hover:text-primary" onClick={() => setSlotSheet({ open: true, slot: { id: "", time: t, auditor: i, area: "", topics: "", processes: [], clauses: [] } })}>
                                Add slot
                              </button>
                            ) : null}
                          </td>
                        )
                      })
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader><CardTitle>On the printout</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <fieldset className="flex flex-col gap-2.5">
            <legend className="sr-only">Sections</legend>
            {PRINT_PARTS.map((part) => (
              <label key={part} className="flex items-center gap-2.5 text-sm">
                <Checkbox disabled={!edit} checked={plan.print.show.includes(part)} onCheckedChange={(v) => set({ print: { ...plan.print, show: v ? [...plan.print.show, part] : plan.print.show.filter((x) => x !== part) } })} />
                {part}
              </label>
            ))}
          </fieldset>
          <Field label="Paper" htmlFor="ap-paper" help="Portrait fits up to 2 auditors per timetable. With more, the next auditors continue in another timetable below.">
            <NativeSelect id="ap-paper" value={plan.print.paper} disabled={!edit} onChange={(e) => set({ print: { ...plan.print, paper: e.target.value as AuditPlan["print"]["paper"] } })}>
              <option>A4 portrait</option>
              <option>A4 landscape</option>
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <SlotSheet plan={plan} set={set} state={slotSheet} onClose={() => setSlotSheet({ open: false })} />
      <AuditorDialog
        open={auditorDlg.open}
        initial={auditorDlg.index !== undefined ? plan.auditors[auditorDlg.index] : undefined}
        onOpenChange={(o) => setAuditorDlg((d) => ({ ...d, open: o }))}
        onAdd={(a) => set({ auditors: auditorDlg.index !== undefined ? plan.auditors.map((x, k) => (k === auditorDlg.index ? a : x)) : [...plan.auditors, a] })}
      />
    </div>
  )
}

/** Removes a slot or break from the timetable, with its checklist questions; Undo puts it back. */
function DeleteSlot({ plan, set, slot }: { plan: AuditPlan; set: (p: Partial<AuditPlan>) => void; slot: PlanSlot }) {
  return (
    <button
      type="button"
      aria-label={`Delete ${slot.area || "slot"} at ${slot.time}`}
      title="Delete"
      className="shrink-0 cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-hover hover:text-overdue"
      onClick={() => {
        const before = { slots: plan.slots, questions: plan.questions }
        set({ slots: plan.slots.filter((x) => x.id !== slot.id), questions: plan.questions.filter((q) => q.slotId !== slot.id) })
        toast(`${slot.area || "Slot"} deleted`, { action: { label: "Undo", onClick: () => set(before) } })
      }}
    >
      <Trash2Icon className="size-3.5" />
    </button>
  )
}

/** Choose ISO 9001 clauses from the list; search by number or title. */
function ClausePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = React.useState(false)
  const [q, setQ] = React.useState("")
  const shown = ISO_CLAUSES.filter((c) => !q || `${c.no} ${c.title}`.toLowerCase().includes(q.toLowerCase()))
  const toggle = (no: string) => onChange(value.includes(no) ? value.filter((x) => x !== no) : [...value, no].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
  return (
    <div className="flex flex-col gap-2">
      <span id="sl-c-label" className="text-sm font-medium">Clauses</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((no) => (
          <span key={no} className="inline-flex items-center gap-1 rounded-sm border bg-card py-0.5 pl-2 pr-1 text-[0.8125rem]">
            {no}
            <button type="button" aria-label={`Remove clause ${no}`} className="cursor-pointer rounded-sm p-0.5 hover:bg-hover" onClick={() => toggle(no)}>
              <XIcon className="size-3" />
            </button>
          </span>
        ))}
        <Button type="button" variant="outline" size="sm" aria-expanded={open} aria-controls="sl-c-list" onClick={() => setOpen((o) => !o)}>
          {open ? "Done" : value.length ? "Change clauses" : "Choose clauses"}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 rounded-md border p-2">
          <Input aria-label="Search clauses" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by number or title" />
          <ul id="sl-c-list" role="group" aria-labelledby="sl-c-label" className="flex max-h-64 flex-col overflow-y-auto">
            {shown.map((c) => (
              <li key={c.no}>
                <label className={cn("flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-hover", !c.no.includes(".") && "font-semibold")}>
                  <Checkbox checked={value.includes(c.no)} onCheckedChange={() => toggle(c.no)} className="mt-0.5" />
                  <span><span className="mr-1.5 tabular-nums">{c.no}</span>{c.title}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="px-2 py-1.5 text-[0.8125rem] text-muted-foreground">No clause matches.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}

function SlotSheet({ plan, set, state: st, onClose }: { plan: AuditPlan; set: (p: Partial<AuditPlan>) => void; state: { open: boolean; slot?: PlanSlot; shared?: boolean }; onClose: () => void }) {
  const { state } = useStore()
  const blank: PlanSlot = { id: "", time: "09:00", area: "", topics: "", processes: [], clauses: [], auditor: 0 }
  const [f, setF] = React.useState<PlanSlot>(blank)
  const [clauses, setClauses] = React.useState<string[]>([])
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    if (st.open) {
      const s = st.slot ?? { ...blank, shared: st.shared, auditor: st.shared ? undefined : 0 }
      setF({ ...s, id: s.id || `sl-${Date.now()}` })
      setClauses(s.clauses)
      setErr("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st])
  const existing = plan.slots.some((s) => s.id === f.id)
  function save() {
    if (!/^\d{1,2}:\d{2}$/.test(f.time)) return setErr("Choose a start time.")
    if (!f.area.trim()) return setErr(f.shared ? "Name the break, such as Lunch." : "Say what’s audited in this slot.")
    const clean: PlanSlot = { ...f, area: f.area.trim(), clauses }
    set({ slots: existing ? plan.slots.map((s) => (s.id === f.id ? clean : s)) : [...plan.slots, clean] })
    onClose()
  }
  return (
    <Sheet open={st.open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{existing ? (f.shared ? "Edit break" : "Edit slot") : f.shared ? "Add break" : "Add slot"}</SheetTitle>
          <SheetDescription>{f.shared ? "Opening, lunch, report writing and closing span every auditor." : "What one auditor audits at this time, and the processes and clauses it covers."}</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start time" htmlFor="sl-t" error={err}>
              <Input id="sl-t" type="time" step={900} value={f.time.padStart(5, "0")} onChange={(e) => setF({ ...f, time: e.target.value })} />
            </Field>
            {!f.shared && (
              <Field label="Auditor" htmlFor="sl-a">
                <NativeSelect id="sl-a" value={f.auditor ?? 0} onChange={(e) => setF({ ...f, auditor: Number(e.target.value) })}>
                  {plan.auditors.map((a, i) => <option key={i} value={i}>{a.name}</option>)}
                </NativeSelect>
              </Field>
            )}
          </div>
          <Field label={f.shared ? "Name" : "Area"} htmlFor="sl-ar"><Input id="sl-ar" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} /></Field>
          {!f.shared && (
            <>
              <Field label="Topics" htmlFor="sl-to"><Textarea id="sl-to" value={f.topics} onChange={(e) => setF({ ...f, topics: e.target.value })} className="min-h-16" /></Field>
              <ClausePicker value={clauses} onChange={setClauses} />
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-sm font-medium">Processes</legend>
                {state.processes.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={f.processes.includes(p.name)} onCheckedChange={(v) => setF({ ...f, processes: v ? [...f.processes, p.name] : f.processes.filter((x) => x !== p.name) })} />
                    {p.name}
                  </label>
                ))}
              </fieldset>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          {existing && <Button variant="ghost" className="mr-auto text-overdue" onClick={() => { set({ slots: plan.slots.filter((s) => s.id !== f.id), questions: plan.questions.filter((q) => q.slotId !== f.id) }); onClose() }}><Trash2Icon /> Remove</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{existing ? "Save" : "Add"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function AuditorDialog({ open, onOpenChange, onAdd, initial }: { open: boolean; onOpenChange: (v: boolean) => void; onAdd: (a: { name: string; role: string }) => void; initial?: { name: string; role: string } }) {
  const [name, setName] = React.useState("")
  const [role, setRole] = React.useState("Auditor")
  React.useEffect(() => {
    if (open) { setName(initial?.name ?? ""); setRole(initial?.role ?? "Auditor") }
  }, [open, initial])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit auditor" : "Add auditor"}</DialogTitle>
          <DialogDescription>{initial ? "Their slots in the timetable stay as they are." : "Adds a column to the timetable."}</DialogDescription>
        </DialogHeader>
        <Field label="Name" htmlFor="au-n" help="Someone in ThryveMS, or an outside auditor’s name."><Input id="au-n" value={name} onChange={(e) => setName(e.target.value)} placeholder="Auditor 4" list="au-people" /><datalist id="au-people"><PeopleOptions /></datalist></Field>
        <Field label="Role" htmlFor="au-r"><Input id="au-r" value={role} onChange={(e) => setRole(e.target.value)} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!name.trim()} onClick={() => { onAdd({ name: name.trim(), role: role.trim() || "Auditor" }); onOpenChange(false) }}>{initial ? "Save" : "Add auditor"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Checklist                                                           */
/* ------------------------------------------------------------------ */

function ChecklistTab({ plan, set, edit }: TabProps) {
  const slots = sortedSlots(plan).filter((s) => !s.shared)
  const [slotId, setSlotId] = React.useState(slots[0]?.id ?? "")
  const [adding, setAdding] = React.useState({ text: "", clause: "" })
  const slot = slots.find((s) => s.id === slotId) ?? slots[0]
  const qs = plan.questions.filter((q) => q.slotId === slot?.id)
  const answered = plan.questions.filter((q) => q.result !== "Not checked").length
  const count = (r: QResult) => plan.questions.filter((q) => q.result === r).length
  const setQ = (id: string, patch: Partial<AuditPlan["questions"][number]>) => set({ questions: plan.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) })

  if (isExternal(plan.kind) && plan.questions.length === 0) {
    return (
      <Card>
        <EmptyLine
          title="The certification body uses its own checklist"
          body="Record their findings on the Findings tab. You can still prepare with your own questions as a dry run."
          action={edit && <Button variant="outline" onClick={() => set({ questions: plan.slots.filter((s) => !s.shared).flatMap((s) => [...new Set(s.clauses.map((c) => c.split(".")[0]))].flatMap((ch) => (QUESTION_BANK[ch] ?? []).map((text, i) => ({ id: `${s.id}-b${ch}-${i}`, slotId: s.id, text, clause: s.clauses.find((c) => c.split(".")[0] === ch) ?? ch, result: "Not checked" as QResult })))) })}>Prepare with your own questions</Button>}
        />
      </Card>
    )
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone="draft">{answered} of {plan.questions.length} answered</Badge>
          {(["Conforms", "Opportunity", "Minor", "Major"] as QResult[]).map((r) => <Badge key={r} tone={RESULT_TONE[r]}>{count(r)} {r.toLowerCase()}</Badge>)}
        </div>
        <span className="flex gap-2">
          <Button variant="outline" size="sm" asChild><Link to={`/audits/plans/${plan.id}/print?part=checklist`}><PrinterIcon /> Print blank</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to={`/audits/plans/${plan.id}/print?part=checklist&results=1`}><PrinterIcon /> Print with results</Link></Button>
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav aria-label="Slots" className="flex flex-col gap-1 self-start rounded-md border bg-card p-2">
          {slots.map((s) => {
            const sq = plan.questions.filter((q) => q.slotId === s.id)
            return (
              <button key={s.id} type="button" onClick={() => setSlotId(s.id)} aria-current={slot?.id === s.id ? "true" : undefined} className={cn("flex cursor-pointer items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-hover", slot?.id === s.id && "bg-hover font-semibold")}>
                <span className="flex flex-col"><span>{s.area}</span><span className="text-xs font-normal text-muted-foreground">{s.time} · {s.clauses.join(", ") || "no clauses"}</span></span>
                <span className="text-xs font-normal text-muted-foreground">{sq.filter((q) => q.result !== "Not checked").length}/{sq.length}</span>
              </button>
            )
          })}
        </nav>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-0.5">
              <CardTitle>{slot?.area ?? "No slots"}</CardTitle>
              {slot && <span className="text-[0.8125rem] text-muted-foreground">{slot.time} · {plan.auditors[slot.auditor ?? 0]?.name} · {slot.processes.join(", ")}</span>}
            </div>
          </CardHeader>
          <ol className="flex flex-col">
            {qs.length === 0 && <li><EmptyLine title="No questions in this slot" body="Add your own, or add the standard questions for its clauses." /></li>}
            {qs.map((q) => (
              <li key={q.id} className="flex flex-col gap-2.5 border-t px-5 py-4 first:border-t-0">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex flex-col gap-0.5"><span className="text-sm font-medium">{q.text}</span><span className="text-xs text-muted-foreground">Clause {q.clause}</span></span>
                  {edit && <button type="button" aria-label="Remove question" className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-hover" onClick={() => set({ questions: plan.questions.filter((x) => x.id !== q.id) })}><Trash2Icon className="size-3.5" /></button>}
                </div>
                <div role="radiogroup" aria-label={`Result: ${q.text}`} className="flex flex-wrap gap-1.5">
                  {RESULTS.map((r) => (
                    <button key={r} type="button" role="radio" aria-checked={q.result === r} disabled={!edit} onClick={() => setQ(q.id, { result: r })} className={cn("rounded-full border px-3 py-1 text-[0.8125rem] font-medium enabled:cursor-pointer", q.result === r ? "border-transparent ring-1 ring-current" : "bg-card text-muted-foreground")}>
                      {q.result === r ? <Badge tone={RESULT_TONE[r]} className="bg-transparent p-0">{r}</Badge> : r}
                    </button>
                  ))}
                </div>
                <Input aria-label={`Note: ${q.text}`} value={q.note ?? ""} disabled={!edit} onChange={(e) => setQ(q.id, { note: e.target.value })} placeholder="What you saw, and the evidence" />
              </li>
            ))}
          </ol>
          {edit && slot && (
            <div className="flex flex-col gap-3 border-t px-5 py-4">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-end">
                <Field label="Add question" htmlFor="cq-t"><Input id="cq-t" value={adding.text} onChange={(e) => setAdding({ ...adding, text: e.target.value })} /></Field>
                <Field label="Clause" htmlFor="cq-c"><Input id="cq-c" value={adding.clause} onChange={(e) => setAdding({ ...adding, clause: e.target.value })} placeholder={slot.clauses[0] ?? "7.5"} /></Field>
                <Button variant="outline" disabled={!adding.text.trim()} onClick={() => { set({ questions: [...plan.questions, { id: `q-${Date.now()}`, slotId: slot.id, text: adding.text.trim(), clause: adding.clause.trim() || slot.clauses[0] || "", result: "Not checked" }] }); setAdding({ text: "", clause: "" }) }}>Add</Button>
              </div>
              <Button variant="ghost" size="sm" className="self-start" onClick={() => {
                const have = new Set(qs.map((q) => q.text))
                const extra = [...new Set(slot.clauses.map((c) => c.split(".")[0]))].flatMap((ch) => (QUESTION_BANK[ch] ?? []).filter((t) => !have.has(t)).map((text, i) => ({ id: `q-${Date.now()}-${ch}-${i}`, slotId: slot.id, text, clause: slot.clauses.find((c) => c.split(".")[0] === ch) ?? ch, result: "Not checked" as QResult })))
                set({ questions: [...plan.questions, ...extra] })
                toast(extra.length ? `${extra.length} question${extra.length === 1 ? "" : "s"} added from the question bank` : "Every question from the bank is already here")
              }}><PlusIcon /> Add from the question bank</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Evidence pack                                                       */
/* ------------------------------------------------------------------ */

function EvidenceTab({ plan, set, edit }: TabProps) {
  const { notify } = useStore()
  const pack = usePack(plan)
  const all = pack.flatMap((p) => p.items)
  const gaps = all.filter((i) => i.state !== "Ready")
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">Gathered from the plan: each slot’s processes and clauses pull in their latest evidence. It updates on its own as records are added.</p>
        <span className="flex flex-wrap gap-2">
          {edit && (
            <Button variant="outline" disabled={!gaps.length} onClick={() => {
              const owners = [...new Set(gaps.map((g) => g.owner))]
              notify(owners, { kind: "Assigned", title: `Evidence needed for ${plan.title}`, body: `${gaps.length} item${gaps.length === 1 ? " is" : "s are"} missing or out of date before ${formatDate(plan.date)}.`, href: `/audits/plans/${plan.id}?tab=evidence` })
              toast("Owners asked", { description: `${owners.join(", ")} get a task for their items.` })
            }}>Ask owners for missing items</Button>
          )}
          <Button variant="outline" onClick={() => toast("Preview: no link is made", { description: "The live service gives the auditor a read-only link to these records only, until the audit ends." })}>Share with auditor</Button>
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-[0.8125rem]">
        {(["Ready", "Out of date", "Missing"] as PackState[]).map((s) => <Badge key={s} tone={PACK_TONE[s]}>{all.filter((i) => i.state === s).length} {s.toLowerCase()}</Badge>)}
      </div>
      {pack.length === 0 && <Card><EmptyLine title="No slots with clauses yet" body="Add clauses to the timetable’s slots and the pack fills itself." /></Card>}
      {pack.map(({ slot, items }) => {
        const worst: PackState = items.some((i) => i.state === "Missing") ? "Missing" : items.some((i) => i.state === "Out of date") ? "Out of date" : "Ready"
        return (
          <Card key={slot.id}>
            <CardHeader>
              <CardTitle>{slot.area} · {slot.clauses.join(", ")}</CardTitle>
              <Badge tone={PACK_TONE[worst]}>{items.filter((i) => i.state === "Ready").length} of {items.length} ready</Badge>
            </CardHeader>
            <ul>
              {items.map((i) => (
                <li key={i.key} className="flex flex-wrap items-center gap-3 border-t px-5 py-3 text-sm">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {i.to ? <Link to={i.to} className="font-medium hover:text-primary hover:underline">{i.title}</Link> : <span className="font-medium">{i.title}</span>}
                    <span className="text-xs text-muted-foreground">{i.meta}</span>
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">{i.owner}</span>
                  <Badge tone={PACK_TONE[i.state]}>{i.state}</Badge>
                  {edit && i.evidenceId && (
                    <button type="button" aria-label={`Take ${i.title} out of this pack`} className="cursor-pointer rounded-sm p-1 text-muted-foreground hover:bg-hover" onClick={() => set({ packRemoved: [...(plan.packRemoved ?? []), { slotId: slot.id, evidenceId: i.evidenceId! }] })}>
                      <Trash2Icon className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

function FindingsTab({ plan, set, edit }: TabProps) {
  const { state } = useStore()
  const findings = planFindings(plan)
  const external = isExternal(plan.kind)
  const [sheet, setSheet] = React.useState<{ open: boolean; f?: PlanFinding }>({ open: false })
  const [f, setF] = React.useState<PlanFinding>({ id: "", title: "", detail: "", grade: "Minor", clause: "" })
  React.useEffect(() => {
    if (sheet.open) setF(sheet.f ?? { id: `f-${Date.now()}`, title: "", detail: "", grade: "Minor", clause: "" })
  }, [sheet])
  function save() {
    if (!f.title.trim()) return
    const others = plan.findings.filter((x) => x.id !== f.id)
    set({ findings: [...others, { ...f, title: f.title.trim() }] })
    setSheet({ open: false })
  }
  const slotName = (id?: string) => plan.slots.find((s) => s.id === id)?.area
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          {external ? "Record the findings from the certification body’s report." : "Collected from the checklist: every answer graded minor, major or opportunity. Reword or add one by hand."} When the report is released, each nonconformity opens in Corrective Action and each opportunity in Improvements.
        </p>
        {edit && <Button onClick={() => setSheet({ open: true })}><PlusIcon /> {external ? "Add finding received" : "Add finding"}</Button>}
      </div>
      <DataTable
        label="Findings"
        rows={findings}
        getRowId={(x) => x.id}
        minWidth={820}
        empty={{ title: "No findings", body: external ? "Add the findings from the certification body’s report." : "Grade checklist answers minor, major or opportunity and they show here." }}
        columns={[
          { id: "t", header: "Finding", className: "min-w-[260px]", cell: (x) => <span className="flex flex-col gap-0.5"><span className="font-medium">{x.title}</span>{x.detail && <span className="text-xs text-muted-foreground">{x.detail}</span>}</span> },
          { id: "g", header: "Grade", cell: (x) => <Badge tone={GRADE_TONE[x.grade]}>{x.grade}</Badge> },
          { id: "c", header: "Clause, slot", cell: (x) => <span className="text-muted-foreground">{[x.clause, slotName(x.slotId)].filter(Boolean).join(" · ")}</span> },
          {
            id: "b",
            header: "Becomes",
            cell: (x) => {
              const nc = x.ncId && state.ncs.find((n) => n.id === x.ncId)
              const imp = x.improvementId && state.improvements.find((i) => i.id === x.improvementId)
              if (nc) return <Link to={`/corrective-action/${nc.id}`} className="font-medium text-primary">{nc.id}</Link>
              if (imp) return <Link to={`/corrective-action/improvements/${imp.id}`} className="font-medium text-primary">{imp.id}</Link>
              return <span className="text-muted-foreground">{x.grade === "Opportunity" ? "An improvement" : "A nonconformity"}, when released</span>
            },
          },
          { id: "e", header: <span className="sr-only">Edit</span>, className: "w-12", cell: (x) => (edit ? <Button variant="ghost" size="icon" aria-label={`Edit ${x.title}`} onClick={() => setSheet({ open: true, f: x })}><PencilIcon /></Button> : null) },
        ]}
      />
      <Sheet open={sheet.open} onOpenChange={(o) => !o && setSheet({ open: false })}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheet.f ? "Edit finding" : external ? "Add finding received" : "Add finding"}</SheetTitle>
            <SheetDescription>Word it as a statement an auditee can act on.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Field label="Finding" htmlFor="fd-t"><Input id="fd-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
            <Field label="Details and evidence" htmlFor="fd-d"><Textarea id="fd-d" value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} className="min-h-20" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Grade" htmlFor="fd-g">
                <NativeSelect id="fd-g" value={f.grade} onChange={(e) => setF({ ...f, grade: e.target.value as FindingGrade })}>
                  <option>Major</option><option>Minor</option><option>Opportunity</option>
                </NativeSelect>
              </Field>
              <Field label="Clause" htmlFor="fd-c"><Input id="fd-c" value={f.clause} onChange={(e) => setF({ ...f, clause: e.target.value })} /></Field>
            </div>
            <Field label="Slot" htmlFor="fd-s" optional>
              <NativeSelect id="fd-s" value={f.slotId ?? ""} onChange={(e) => setF({ ...f, slotId: e.target.value || undefined })}>
                <option value="">None</option>
                {plan.slots.filter((s) => !s.shared).map((s) => <option key={s.id} value={s.id}>{s.time} · {s.area}</option>)}
              </NativeSelect>
            </Field>
          </SheetBody>
          <SheetFooter>
            {sheet.f && plan.findings.some((x) => x.id === f.id) && <Button variant="ghost" className="mr-auto text-overdue" onClick={() => { set({ findings: plan.findings.filter((x) => x.id !== f.id) }); setSheet({ open: false }) }}><Trash2Icon /> Remove</Button>}
            <Button variant="ghost" onClick={() => setSheet({ open: false })}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

function ReportTab({ plan, set, release }: { plan: AuditPlan; set: (p: Partial<AuditPlan>) => void; release: boolean }) {
  const { state, add, takenIds, notify, user } = useStore()
  const findings = planFindings(plan)
  const n = (g: FindingGrade) => findings.filter((f) => f.grade === g).length
  const released = plan.status === "Report released"
  const topManagement = [...new Set(state.reviews.flatMap((r) => r.reviewers))].filter((x) => state.people.some((p) => p.name === x))

  function doRelease() {
    const out: PlanFinding[] = []
    let ncIds = takenIds("ncs")
    let impIds = takenIds("improvements")
    const year = todayIso().slice(0, 4)
    for (const f of findings) {
      const slot = plan.slots.find((s) => s.id === f.slotId)
      const proc = state.processes.find((p) => slot?.processes.includes(p.name)) ?? state.processes.find((p) => p.id === "improvement") ?? state.processes[0]
      if (f.grade === "Opportunity") {
        const id = nextId(impIds, `IMP-${year}-`)
        impIds = [...impIds, id]
        add("improvements", { id, title: f.title, details: f.detail, process: proc.name, owner: proc.owner, source: `${plan.kind} ${plan.id}`, state: "Proposed", raisedDate: todayIso(), raisedBy: user.name })
        out.push({ ...f, improvementId: id })
      } else {
        const id = nextId(ncIds, `NC-${year}-`)
        ncIds = [...ncIds, id]
        add("ncs", { id, title: f.title, process: proc.name, clause: f.clause, source: `${plan.kind} ${plan.id}`, severity: f.grade as "Minor" | "Major", stage: 0, owner: proc.owner, verifier: "Maria Santos", due: "In 30 days", details: f.detail, containment: "", rootCause: "", tasks: [], raised: "Today", raisedDate: todayIso(), ...(plan.kind === "Mock audit" ? { fromConsultant: true } : {}) })
        notify([proc.owner], { kind: "Assigned", title: `${id} ${f.title}`, body: `From ${plan.id}, ${plan.title}. Find the cause and fix it.`, href: `/corrective-action/${id}` })
        out.push({ ...f, ncId: id })
      }
    }
    set({ findings: out, status: "Report released", releasedOn: todayIso(), releasedBy: user.name })
    if (topManagement.length) notify(topManagement, { kind: "Waiting on you", title: `Accept the report: ${plan.title}`, body: "It’s in Management review › Needs you, with a guide to what to check.", href: "/management-review" })
    toast("Report released", { description: `${n("Major") + n("Minor")} nonconformities and ${n("Opportunity")} improvements opened. Top management is asked to accept it.` })
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card>
        <CardHeader>
          <CardTitle>{plan.title} report</CardTitle>
          <Badge tone={released ? "done" : "draft"}>{released ? `Released ${formatDate(plan.releasedOn)}` : "Draft"}</Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{formatDate(plan.date)} · {plan.auditors.map((a) => `${a.name} (${a.role.toLowerCase()})`).join(", ")} · {plan.standard} · {plan.sites}</p>
          <Field label="Verdict" htmlFor="rp-v">
            <Input id="rp-v" value={plan.verdict ?? ""} disabled={released || !release} onChange={(e) => set({ verdict: e.target.value })} placeholder={plan.kind === "Mock audit" ? "Ready for Stage 1 once the minor findings are closed" : "Recommended for certification"} />
          </Field>
          <Field label="Summary" htmlFor="rp-s">
            <Textarea id="rp-s" value={plan.summary ?? ""} disabled={released || !release} onChange={(e) => set({ summary: e.target.value })} className="min-h-24" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            {(["Major", "Minor", "Opportunity"] as FindingGrade[]).map((g) => (
              <div key={g} className="flex flex-col rounded-md border px-3 py-2.5">
                <span className={cn("text-xl font-semibold", g === "Major" ? "text-overdue" : g === "Minor" ? "text-soon" : "text-progress")}>{n(g)}</span>
                <span className="text-[0.8125rem] text-muted-foreground">{g === "Opportunity" ? "Opportunities" : g}</span>
              </div>
            ))}
          </div>
          <p className="text-[0.8125rem] text-muted-foreground">The PDF has the report, the findings and an appendix with the plan and the checklist with results.</p>
          {plan.acceptedOn && <p className="text-sm text-done">Accepted by {plan.acceptedBy} on {formatDate(plan.acceptedOn)}.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>When you release it</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            <li>{n("Major") + n("Minor")} nonconformities open in Corrective Action</li>
            <li>{n("Opportunity")} improvements open in Improvements</li>
            <li>Top management is asked to accept it in Management review</li>
            <li>Participants are told, with a link to the report</li>
          </ul>
          <Button variant="outline" asChild><Link to={`/audits/plans/${plan.id}/print?part=report`}><PrinterIcon /> Download PDF</Link></Button>
          {release && !released && <Button onClick={doRelease}>Release report</Button>}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Print                                                               */
/* ------------------------------------------------------------------ */

/** The printable plan, checklist or report. Portrait fits 2 auditors per timetable; the rest continue below. */
export function AuditPlanPrint() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { state, settings, user } = useStore()
  const plan = state.auditPlans.find((p) => p.id === id)
  const { view } = usePlanRights(plan)
  if (!plan || !view) return <div className="mx-auto max-w-3xl p-6"><NotFound /></div>
  const part = params.get("part") ?? "plan"
  const show = (s: (typeof PRINT_PARTS)[number]) => plan.print.show.includes(s)
  const portrait = plan.print.paper === "A4 portrait"
  const per = portrait ? 2 : plan.auditors.length
  const groups: number[][] = []
  for (let i = 0; i < plan.auditors.length; i += per) groups.push(plan.auditors.map((_, k) => k).slice(i, i + per))
  const slots = sortedSlots(plan)
  const times = [...new Set(slots.map((s) => s.time))]
  const cell = "border border-foreground/25 px-2 py-1.5 align-top"
  const title = part === "checklist" ? `${plan.title} checklist` : part === "report" ? `${plan.title} report` : `${plan.title} plan`

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style>{`@page { size: A4 ${portrait ? "portrait" : "landscape"}; margin: 14mm }`}</style>
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-3 print:hidden">
        <Link to={`/audits/plans/${plan.id}`} className="text-[0.8125rem] font-medium text-primary">Back to {plan.id}</Link>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">{plan.print.paper}. Your browser makes the PDF; ThryveMS doesn’t store one.</span>
          <Button onClick={() => window.print()}><PrinterIcon /> Print or save as PDF</Button>
        </span>
      </div>
      <article className={cn("mx-auto flex flex-col gap-5 bg-card px-4 py-8 text-sm sm:px-8 print:max-w-none print:px-0 print:py-0", portrait ? "max-w-[820px]" : "max-w-[1120px]")}>
        <header className="flex items-start justify-between gap-4 border-b-2 border-foreground pb-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-bold">{title}</h1>
            {show("Logo and company name") && <span className="text-muted-foreground">{settings.org.name} · {plan.standard}</span>}
          </div>
          <span className="text-right text-xs text-muted-foreground">{plan.id}<br />Printed {formatDate(nowIso().slice(0, 10))}</span>
        </header>

        {part === "plan" && (
          <>
            {show("Plan details") && (
              <table className="w-full border-collapse">
                <tbody>
                  {[["Activity", plan.kind], ["Date and hours", `${formatDate(plan.date)} · ${plan.hours}`], ["Audited by", plan.auditedBy], ["Sites", plan.sites], ...(show("Scope") ? [["Scope", plan.scope]] : []), ["Auditors", plan.auditors.map((a) => `${a.name} (${a.role})`).join(", ")]].map(([k, v]) => (
                    <tr key={k}><th scope="row" className={cn(cell, "w-1/4 bg-muted text-left font-semibold")}>{k}</th><td className={cell}>{v}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {show("Objectives and criteria") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-foreground/25 p-2.5"><b>Objectives</b><ul className="list-disc pl-5">{plan.objectives.filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul></div>
                <div className="border border-foreground/25 p-2.5"><b>Criteria</b><ul className="list-disc pl-5">{plan.criteria.filter(Boolean).map((o) => <li key={o}>{o}</li>)}</ul></div>
              </div>
            )}
            {show("Timetable") &&
              groups.map((g, gi) => (
                <section key={gi} className="flex flex-col gap-1 print:break-inside-avoid">
                  {groups.length > 1 && <h2 className="font-semibold">Timetable {gi + 1} of {groups.length} · {g.map((k) => plan.auditors[k].name).join(" and ")}</h2>}
                  <table className="w-full table-fixed border-collapse">
                    <thead><tr className="bg-muted"><th className={cn(cell, "w-16 text-left")}>Time</th>{g.map((k) => <th key={k} className={cn(cell, "text-left")}>{plan.auditors[k].name} · {plan.auditors[k].role}</th>)}</tr></thead>
                    <tbody>
                      {times.map((t) => {
                        const row = slots.filter((s) => s.time === t)
                        const sh = row.find((s) => s.shared)
                        if (!sh && !row.some((s) => g.includes(s.auditor ?? -1))) return null
                        return (
                          <tr key={t} className={sh ? "bg-muted/60" : undefined}>
                            <td className={cn(cell, "font-semibold")}>{t}</td>
                            {sh ? <td colSpan={g.length} className={cn(cell, "font-semibold")}>{sh.area}</td> : g.map((k) => { const s = row.find((x) => x.auditor === k); return <td key={k} className={cell}>{s && <><b>{s.area}</b>{s.topics ? `: ${s.topics}` : ""}{show("Clause numbers in each slot") && s.clauses.length ? <span className="text-muted-foreground"> ({s.clauses.join(", ")})</span> : null}</>}</td> })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </section>
              ))}
          </>
        )}

        {part === "checklist" &&
          sortedSlots(plan).filter((s) => !s.shared).map((s) => (
            <section key={s.id} className="flex flex-col gap-1 print:break-inside-avoid">
              <h2 className="font-semibold">{s.time} · {s.area} · {plan.auditors[s.auditor ?? 0]?.name}</h2>
              <table className="w-full table-fixed border-collapse">
                <thead><tr className="bg-muted"><th className={cn(cell, "w-14 text-left")}>Clause</th><th className={cn(cell, "text-left")}>Question</th><th className={cn(cell, "w-28 text-left")}>Result</th><th className={cn(cell, "w-1/3 text-left")}>Notes and evidence</th></tr></thead>
                <tbody>
                  {plan.questions.filter((q) => q.slotId === s.id).map((q) => (
                    <tr key={q.id}><td className={cell}>{q.clause}</td><td className={cell}>{q.text}</td><td className={cell}>{params.get("results") ? q.result : ""}</td><td className={cn(cell, "h-10")}>{params.get("results") ? q.note : ""}</td></tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

        {part === "report" && (
          <>
            {plan.verdict && <p className="border border-foreground/25 p-2.5 font-semibold">Verdict: {plan.verdict}</p>}
            {plan.summary && <p>{plan.summary}</p>}
            <table className="w-full border-collapse">
              <thead><tr className="bg-muted"><th className={cn(cell, "text-left")}>Finding</th><th className={cn(cell, "w-24 text-left")}>Grade</th><th className={cn(cell, "w-20 text-left")}>Clause</th><th className={cn(cell, "w-28 text-left")}>Record</th></tr></thead>
              <tbody>{planFindings(plan).map((f) => <tr key={f.id}><td className={cell}><b>{f.title}</b>{f.detail ? `. ${f.detail}` : ""}</td><td className={cell}>{f.grade}</td><td className={cell}>{f.clause}</td><td className={cell}>{f.ncId ?? f.improvementId ?? ""}</td></tr>)}</tbody>
            </table>
          </>
        )}

        {show("Signature lines") && part !== "checklist" && (
          <footer className="mt-8 grid grid-cols-3 gap-6 print:break-inside-avoid">
            {["Prepared by · Lead auditor", "Accepted by · Management representative", "Date"].map((s) => <div key={s} className="flex flex-col gap-1"><span className="h-8 border-b border-foreground" /><span className="text-xs text-muted-foreground">{s}</span></div>)}
          </footer>
        )}
        <p className="text-xs text-muted-foreground print:hidden">Made from ThryveMS for {user.name}.</p>
      </article>
    </div>
  )
}
