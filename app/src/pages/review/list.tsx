import { NeedsYou } from "./needs-you"
import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { CalendarClockIcon, CalendarDaysIcon, FileCheckIcon, ListChecksIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { REVIEW_INPUTS } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewAction, ReviewFormat, ReviewKind } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { ChipChoice, EvidencePicker, Field, FieldGroup, PeopleOptions, PeoplePicker } from "@/components/app/form"
import { RowActions } from "@/components/app/record-actions"
import { PendingTopics, TopicAdder, toInputs, type NewTopic } from "./items"
import { FORMATS, actionsFor, inputReady, isLate, kindLabel, kindOf, linkedClosed, nextItemRef, periodOf, reviewPeople, reviewStarted, signState, stageTone, useActionReminders, useReviewRights } from "./shared"
import { hrefForId, kindOfId } from "@/lib/record-links"
import { useCanOpen } from "@/components/app/record-link"
import { addDays, parseDisplayDate, todayIso } from "@/lib/periods"

const fmtDate = (v: string) => {
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

/** The most recently held review, by its locked or planned date. */
function latestReview(reviews: ManagementReviewRecord[]) {
  const held = (r: ManagementReviewRecord) => r.lockedAt?.slice(0, 10) ?? parseDisplayDate(r.recordedOn ?? r.date) ?? ""
  return reviews.filter((r) => r.stage === "Reviewed" || r.stage === "Closed").sort((a, b) => held(b).localeCompare(held(a)))[0]
}
function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function FormatChoice({ value, onChange }: { value: ReviewFormat; onChange: (f: ReviewFormat) => void }) {
  return (
    <div role="radiogroup" aria-label="How it’s held" className="grid gap-2 sm:grid-cols-3">
      {FORMATS.map((f) => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={value === f.id}
          onClick={() => onChange(f.id)}
          className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left transition-colors", value === f.id ? "border-primary bg-highlight" : "hover:border-input")}
        >
          <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-[1.5px]", value === f.id ? "border-[5px] border-primary" : "border-input")} />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{f.title}</span>
            <span className="text-xs leading-snug text-muted-foreground">{f.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

const PROMPTS = ["Top management request", "Planned review", "After an audit", "Complaint or incident", "Change in the business", "Other"] as const
type Prompt = (typeof PROMPTS)[number] | ""

/** Type of review: the same card radio as the rest of the app. */
function KindChoice({ value, onChange, disabled }: { value: ReviewKind; onChange: (k: ReviewKind) => void; disabled?: boolean }) {
  const kinds: { id: ReviewKind; title: string; hint: string }[] = [
    { id: "Internal", title: "Internal review", hint: "Top management chooses what to review: processes, documents, evidence, risks, links or a topic of their own." },
    { id: "ISO 9001", title: "ISO 9001 review (clause 9.3)", hint: "The 11 inputs from clause 9.3.2 are added for you, with figures for a reporting period. Counts as your management review for the audit." },
  ]
  return (
    <div role="radiogroup" aria-label="Type of review" className="grid gap-2 sm:grid-cols-2">
      {kinds.map((k) => (
        <button
          key={k.id}
          type="button"
          role="radio"
          aria-checked={value === k.id}
          disabled={disabled && value !== k.id}
          onClick={() => onChange(k.id)}
          className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50", value === k.id ? "border-primary bg-highlight" : "hover:border-input")}
        >
          <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-[1.5px]", value === k.id ? "border-[5px] border-primary" : "border-input")} />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">{k.title}</span>
            <span className="text-xs leading-snug text-muted-foreground">{k.hint}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

/**
 * Start a review, or edit one that hasn't been evaluated yet. A review can be held whenever top management wants:
 * an internal review of what they choose, or an ISO 9001 review with the clause 9.3.2 inputs. It always happens in
 * ThryveMS, so there is no meeting format to choose.
 */
export function StartReview({ open, onOpenChange, kind: startKind = "Internal", editing }: { open: boolean; onOpenChange: (v: boolean) => void; kind?: ReviewKind; editing?: ManagementReviewRecord }) {
  const { state, add, update, user, notify } = useStore()
  const navigate = useNavigate()
  const allowed = reviewPeople(state)
  const notAllowed = state.people.map((p) => p.name).filter((n) => !allowed.includes(n))
  const topManagement = state.people.filter((p) => p.status === "Active" && p.roleId === "top").map((p) => p.name)
  const consultants = state.people.filter((p) => p.roleId === "consultant").map((p) => p.name)
  const last = latestReview(state.reviews.filter((r) => kindOf(r) === "ISO 9001"))
  const defaultStart = last ? addDays(periodOf(last).end, 1) : ""
  const iAmTop = topManagement.includes(user.name)

  const [kind, setKind] = React.useState<ReviewKind>(startKind)
  const [title, setTitle] = React.useState("")
  const [question, setQuestion] = React.useState("")
  const [prompt, setPrompt] = React.useState<Prompt>("")
  const [date, setDate] = React.useState("")
  const [start, setStart] = React.useState("")
  const [end, setEnd] = React.useState("")
  const [requestedBy, setRequestedBy] = React.useState("")
  const [reviewers, setReviewers] = React.useState<string[]>([])
  const [self, setSelf] = React.useState(false)
  const [preparedBy, setPreparedBy] = React.useState(user.name)
  const [prepareNote, setPrepareNote] = React.useState("")
  const [contributors, setContributors] = React.useState<string[]>([])
  const [topics, setTopics] = React.useState<NewTopic[]>([])
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const r = editing
    setKind(r ? kindOf(r) : startKind)
    setTitle(r?.title ?? "")
    setQuestion(r?.question ?? "")
    setPrompt((r?.prompt as Prompt) ?? "")
    setDate(r ? parseDisplayDate(r.date) ?? "" : "")
    setStart(r?.period?.start ?? defaultStart)
    setEnd(r?.period && r.period.end !== parseDisplayDate(r.date) ? r.period.end : "")
    setRequestedBy(r?.requestedBy ?? (iAmTop ? user.name : topManagement[0] ?? user.name))
    setReviewers(r?.reviewers ?? topManagement)
    setSelf(!!r && !!r.requestedBy && r.preparedBy === r.requestedBy)
    setPreparedBy(r?.preparedBy ?? (iAmTop ? state.people.find((p) => p.roleId === "quality" && p.status === "Active")?.name ?? user.name : user.name))
    setPrepareNote(r?.prepareNote ?? "")
    setContributors(r?.contributors ?? [])
    setTopics([])
    setError("")
    setBusy(false)
  }, [open, editing?.id, user.name])

  const preparer = self ? requestedBy : preparedBy

  function save(asDraft: boolean) {
    if (busy) return
    if (!title.trim()) return setError("Give the review a title.")
    if (!date) return setError("Choose the date top management should have reviewed it by.")
    if (!reviewers.length) return setError("Choose at least one person from top management.")
    if (reviewers.some((n) => consultants.includes(n))) return setError("A consultant can’t act as top management. Choose a director or the managing director.")
    if (kind === "ISO 9001") {
      if (!start) return setError("Choose when the reporting period starts.")
      if (start > (end || date)) return setError("The reporting period must start before it ends.")
    }
    if (!editing && kind === "Internal" && !topics.length) return setError("Add at least one thing for top management to review.")
    setBusy(true)
    const period = kind === "ISO 9001" ? { start, end: end || date } : { start: date, end: date }
    const details = { title: title.trim(), question: question.trim() || undefined, prompt: prompt || undefined, requestedBy, prepareNote: prepareNote.trim() || undefined, date: fmtDate(date), reviewers, contributors: contributors.length ? contributors : undefined, preparedBy: preparer, period }
    if (editing) {
      update("reviews", editing.id, details)
      if (preparer !== editing.preparedBy) notify([preparer], { kind: "Assigned", title: `Prepare ${editing.id}, ${details.title}`, body: details.prepareNote ?? `Top management wants it by ${details.date}.`, href: `/management-review/${editing.id}` })
      toast("Review updated")
      onOpenChange(false)
      return
    }
    const year = new Date(date).getFullYear() || new Date().getFullYear()
    const id = nextId(state.reviews.filter((r) => r.id.startsWith(`MR-${year}-`)).map((r) => r.id), `MR-${year}-`, 2)
    const clause = kind === "ISO 9001" ? REVIEW_INPUTS.map((i) => ({ ...i })) : []
    const record: ManagementReviewRecord = {
      id,
      kind,
      ...details,
      format: "No meeting",
      stage: asDraft ? "Planned" : "Preparing",
      others: [],
      inputs: [...clause, ...toInputs(topics, clause, nextItemRef)],
      status: Object.fromEntries(reviewers.map((n) => [n, "Not opened" as const])),
      comments: [],
    }
    add("reviews", record)
    if (preparer !== user.name) notify([preparer], { kind: "Assigned", title: `Prepare ${id}, ${record.title}`, body: record.prepareNote ?? `${requestedBy} wants it ready by ${record.date}.`, href: `/management-review/${id}` })
    const helpers = [...new Set(topics.map((t) => t.preparedBy).filter((n): n is string => !!n && n !== preparer && n !== user.name))]
    if (helpers.length) notify(helpers, { kind: "Assigned", title: `You’re preparing a topic for ${id}`, body: record.title, href: `/management-review/${id}` })
    if (contributors.length) notify(contributors, { kind: "Assigned", title: `You’re helping prepare ${id}`, body: `${preparer} may hand you topics to prepare.`, href: `/management-review/${id}` })
    toast(asDraft ? `${id} saved as a draft` : `${id} started`, { description: kind === "ISO 9001" ? "Figures and supporting records are filled in from ThryveMS for the reporting period." : undefined })
    onOpenChange(false)
    navigate(`/management-review/${id}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${editing.id}` : "Start a review"}</DialogTitle>
          <DialogDescription>Say what top management wants to look at. Everything can be changed later, until top management starts evaluating.</DialogDescription>
        </DialogHeader>
        <Field label="Title" htmlFor="mr-title" error={error && !title.trim() ? error : undefined}>
          <Input id="mr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Delivery delays to Visayas customers" />
        </Field>
        <Field label="What does top management want to find out or decide?" htmlFor="mr-question" optional help="Shown at the top of the review so everyone preparing knows what’s being asked.">
          <Textarea id="mr-question" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why have late deliveries to Visayas customers doubled since August?" />
        </Field>
        <Field label="What prompted it" optional>
          <ChipChoice label="What prompted it" options={PROMPTS} value={prompt as (typeof PROMPTS)[number]} onChange={(v) => setPrompt(v === prompt ? "" : v)} />
        </Field>
        <Field label="Type of review" help={editing ? "The type can’t change once the review has started." : undefined}>
          <KindChoice value={kind} onChange={setKind} disabled={!!editing} />
        </Field>
        {kind === "Internal" && !editing && (
          <FieldGroup title="What do you want to review?" description="Add a record from ThryveMS, a link or a topic in your own words. You can add more later.">
            <TopicAdder defaultPreparer={preparer} exclude={topics.map((t) => t.item.recordId ?? "")} onAdd={(t) => setTopics((x) => [...x, ...t])} />
            <PendingTopics topics={topics} onRemove={(k) => setTopics((x) => x.filter((_, i) => i !== k))} />
          </FieldGroup>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Decide by" htmlFor="mr-date" error={error && !date ? error : undefined}>
            <Input id="mr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Requested by" htmlFor="mr-req">
            <NativeSelect id="mr-req" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)}>
              <PeopleOptions names={[...new Set([...topManagement, user.name])].filter((n) => allowed.includes(n))} />
            </NativeSelect>
          </Field>
        </div>
        {kind === "ISO 9001" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reporting period starts" htmlFor="mr-start" help={last ? `The day after ${last.id}’s period ended.` : "The first review usually covers the last 12 months."}>
              <Input id="mr-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Reporting period ends" htmlFor="mr-end" optional help="Leave empty to end on the decide-by date.">
              <Input id="mr-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Top management" help="They evaluate the topics and sign off. Usually the owner or managing director. Consultants can’t act as top management." error={error && date && title.trim() && !reviewers.length ? error : undefined}>
          <PeoplePicker label="Top management" value={reviewers} onChange={setReviewers} exclude={[...consultants, ...notAllowed]} />
        </Field>
        <Field label="Who prepares it?">
          <div role="radiogroup" aria-label="Who prepares it?" className="grid gap-2 sm:grid-cols-2">
            {([[false, "Ask someone to prepare it", "They get a task to gather what’s needed. Each topic can still have its own preparer."], [true, "I’ll prepare it myself", `No one else is asked. ${requestedBy || "Top management"} adds the notes and evidence, then reviews.`]] as const).map(([v, t, h]) => (
              <button key={t} type="button" role="radio" aria-checked={self === v} onClick={() => setSelf(v)} className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left transition-colors", self === v ? "border-primary bg-highlight" : "hover:border-input")}>
                <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-[1.5px]", self === v ? "border-[5px] border-primary" : "border-input")} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{t}</span>
                  <span className="text-xs leading-snug text-muted-foreground">{h}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>
        {!self && (
          <>
            <Field label="Preparer" htmlFor="mr-prep" help="Only people with access to Management Review are listed.">
              <NativeSelect id="mr-prep" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}>
                <PeopleOptions names={allowed} />
              </NativeSelect>
            </Field>
            <Field label="What they need to prepare" htmlFor="mr-note" optional>
              <Textarea id="mr-note" value={prepareNote} onChange={(e) => setPrepareNote(e.target.value)} placeholder="Delivery figures for August to October and the courier contract." />
            </Field>
          </>
        )}
        <Field label="Contributors" optional help="People who help prepare topics. Only people with access to Management Review are listed.">
          <PeoplePicker label="Contributors" value={contributors} onChange={setContributors} exclude={[...reviewers, preparer, ...notAllowed]} />
        </Field>
        {error && date && title.trim() && reviewers.length > 0 && <p role="alert" className="text-[0.8125rem] font-medium text-overdue">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {editing ? (
            <Button disabled={busy} onClick={() => save(false)}>Save changes</Button>
          ) : (
            <>
              <Button variant="outline" disabled={busy} onClick={() => save(true)}>Save as draft</Button>
              <Button disabled={busy} onClick={() => save(false)}>Create and open workspace</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Confirm an action is done, with the evidence that shows it, or a reason when there is none. Used on the list and on a review. */
export function ActionState({ a }: { a: ReviewAction }) {
  const { state, update, user } = useStore()
  const { canManage } = useReviewRights()
  const [open, setOpen] = React.useState(false)
  const [evidence, setEvidence] = React.useState<string[]>(a.completionEvidence ?? [])
  const [note, setNote] = React.useState("")
  const hint = linkedClosed(state, a)
  const mayClose = canManage || a.owner === user.name
  if (a.state === "Done") return <Badge tone="done">Done</Badge>
  const start = () => {
    setEvidence(a.completionEvidence ?? [])
    setNote("")
    setOpen(true)
  }
  return (
    <span className="flex items-center gap-2">
      {mayClose && hint ? (
        <Button size="sm" variant="outline" onClick={start}>
          Mark done?
        </Button>
      ) : (
        <>
          <Badge tone={isLate(a) ? "overdue" : "progress"}>{isLate(a) ? "Overdue" : "In progress"}</Badge>
          {mayClose && (
            <button type="button" onClick={start} className="cursor-pointer text-xs font-medium text-primary hover:underline">
              Done
            </button>
          )}
        </>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {a.id} done</DialogTitle>
            <DialogDescription>
              Link the record that shows it was done. The next management review checks finished actions for evidence.
              {hint ? ` ${hint}.` : ""}
            </DialogDescription>
          </DialogHeader>
          <EvidencePicker value={evidence} onChange={setEvidence} label="Completion evidence" />
          {!evidence.length && (
            <Field label="Why there’s no evidence" htmlFor={`done-note-${a.id}`} help="Needed when no evidence is linked.">
              <Textarea id={`done-note-${a.id}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agreed verbally at the October management meeting." />
            </Field>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!evidence.length && !note.trim()}
              onClick={() => {
                update("reviewActions", a.id, { state: "Done", late: false, doneOn: "Today", doneDate: todayIso(), completionEvidence: evidence, doneNote: evidence.length ? undefined : note.trim() })
                setOpen(false)
                toast("Action marked done")
              }}
            >
              Mark done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </span>
  )
}

export function ActionsTable({ rows, label, showFrom = true, minWidth = 820 }: { rows: ReviewAction[]; label: string; showFrom?: boolean; minWidth?: number }) {
  const canOpen = useCanOpen()
  const { state } = useStore()
  return (
    <DataTable
      label={label}
      rows={rows}
      getRowId={(a) => a.id}
      minWidth={minWidth}
      empty={{ title: "No actions", body: "Decisions from a review become actions with an owner and a due date." }}
      columns={[
        {
          id: "t",
          header: "Action",
          className: "min-w-[240px]",
          cell: (a) => {
            const hint = linkedClosed(state, a)
            return (
              <span className="flex flex-col gap-0.5">
                <Link to={`/management-review/actions/${a.id}`} className="font-medium hover:text-primary hover:underline">{a.text}</Link>
                {hint && <span className="text-xs text-done">{hint}</span>}
                {a.state === "Done" && a.doneOn && <span className="text-xs text-muted-foreground">Done {a.doneOn}</span>}
              </span>
            )
          },
        },
        ...(showFrom ? [{ id: "f", header: "From", cell: (a: ReviewAction) => <span className="flex flex-col whitespace-nowrap"><Link to={`/management-review/${a.reviewId}`} className="text-[0.8125rem] font-medium text-primary">{a.reviewId}</Link>{a.inputRef && <span className="text-xs text-muted-foreground">Input {a.inputRef}</span>}</span> }] : [{ id: "i", header: "Input", cell: (a: ReviewAction) => <span className="text-muted-foreground">{a.inputRef ?? "None"}</span> }]),
        { id: "y", header: "Type", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{a.type}</span> },
        { id: "o", header: "Owner", cell: (a) => <span className="whitespace-nowrap">{a.owner}</span> },
        { id: "d", header: "Due", cell: (a) => <span className={cn("whitespace-nowrap", isLate(a) && "font-semibold text-overdue")}>{a.due}</span> },
        { id: "l", header: "Linked to", cell: (a) => (a.linked && canOpen(kindOfId(a.linked), a.linked) ? <Link to={hrefForId(a.linked)} className="whitespace-nowrap text-[0.8125rem] font-medium text-primary">{a.linked}</Link> : <span className="text-muted-foreground">{a.linked ?? "None"}</span>) },
        { id: "s", header: "State", cell: (a) => <ActionState a={a} /> },
      ]}
    />
  )
}

export default function ManagementReviews() {
  const { state, rules, user, role, remove } = useStore()
  const { canManage } = useReviewRights()
  useActionReminders()
  const [view, setView] = React.useState<"reviews" | "actions">("reviews")
  const [plan, setPlan] = React.useState<ReviewKind | undefined>()
  const [editing, setEditing] = React.useState<ManagementReviewRecord | undefined>()
  // the figures and the schedule are about ISO 9001 reviews, the ones clause 9.3 asks for at planned intervals
  const iso = state.reviews.filter((r) => kindOf(r) === "ISO 9001")
  const next = iso.find((r) => r.stage === "Planned" || r.stage === "Preparing")
  const last = latestReview(iso)
  const notConsultant = role.id !== "consultant"
  /** Same rules as useReviewRights, worked out per row: edit until recorded; delete only while nothing is evaluated or signed. */
  const rowRights = (r: ManagementReviewRecord) => {
    const preparing = r.stage === "Planned" || r.stage === "Preparing"
    const requester = notConsultant && r.requestedBy === user.name
    const reviewer = notConsultant && r.reviewers.includes(user.name)
    return { edit: preparing && (canManage || requester || reviewer), del: preparing && (canManage || requester) && !reviewStarted(state, r) }
  }
  function deleteReview(r: ManagementReviewRecord) {
    for (const e of state.reviewEvaluations.filter((x) => x.reviewId === r.id)) remove("reviewEvaluations", e.id)
    for (const c of state.reviewRecordChecks.filter((x) => x.reviewId === r.id)) remove("reviewRecordChecks", c.id)
    remove("reviews", r.id)
    toast(`${r.id} deleted`)
  }
  const openActs = state.reviewActions.filter((a) => a.state === "Open")
  const lateActs = openActs.filter((a) => isLate(a))
  // the next review is due one interval after the last one was held
  const lastHeld = last ? (last.lockedAt?.slice(0, 10) ?? parseDisplayDate(last.recordedOn ?? last.date)) : undefined
  const dueBy = lastHeld ? addMonths(lastHeld, rules.mrEvery) : undefined
  const nextDate = next ? parseDisplayDate(next.date) : undefined
  const schedule = !last && !next ? { badge: "Not planned", tone: "overdue" as const } : next ? (dueBy && nextDate && nextDate > dueBy ? { badge: `Planned after ${fmtDate(dueBy)}`, tone: "soon" as const } : { badge: "On schedule", tone: "done" as const }) : dueBy && dueBy < todayIso() ? { badge: `Overdue since ${fmtDate(dueBy)}`, tone: "overdue" as const } : { badge: dueBy ? `Next due by ${fmtDate(dueBy)}` : "Plan the next one", tone: "soon" as const }
  const signed = iso.filter((r) => (r.stage === "Reviewed" || r.stage === "Closed") && signState(r).complete).length
  const every = rules.mrEvery === 12 ? "Once a year" : rules.mrEvery === 6 ? "Twice a year" : "Every quarter"
  const notes = next ? next.inputs.filter(inputReady).length : 0

  return (
    <>
      <PageHeader
        title="Management Review"
        description="Top management can review anything, whenever they need to: a process, a document, evidence, a KPI or a topic of their own. Use an ISO 9001 review at planned intervals to cover clause 9.3."
        actions={
          canManage && (
            <>
              <Button variant="outline" onClick={() => setPlan("ISO 9001")}>
                Start an ISO 9001 review
              </Button>
              <Button onClick={() => setPlan("Internal")}>
                <PlusIcon /> Start a review
              </Button>
            </>
          )
        }
      />
      <FigureGrid
        figures={[
          next
            ? { value: next.date.replace(/ \d{4}$/, ""), label: `Next ISO 9001 review, ${next.id}. ${notes} of ${next.inputs.length} inputs prepared`, badge: "ISO 9001 · 9.3", tone: "progress", icon: CalendarDaysIcon, to: `/management-review/${next.id}` }
            : { value: "Not planned", label: "Next ISO 9001 review", badge: "Start one", tone: "soon", icon: CalendarDaysIcon },
          { value: openActs.length, label: "Open actions from past reviews", badge: lateActs.length ? `${lateActs.length} overdue` : "On track", tone: lateActs.length ? "overdue" : "done", icon: ListChecksIcon },
          { value: signed, label: "Review records signed by all top management, kept as evidence for clause 9.3", badge: signed ? "Ready for audit" : "None yet", tone: signed ? "done" : "soon", icon: FileCheckIcon, to: "/evidence" },
          { value: every, label: `Company rule for ISO 9001 reviews${last ? `. Last reviewed ${last.recordedOn ?? last.date}` : ""}. Change it in Settings › QMS rules`, badge: schedule.badge, tone: schedule.tone, icon: CalendarClockIcon },
        ]}
      />
      <NeedsYou />
      <ViewChips
        value={view}
        onChange={(v) => setView(v as "reviews" | "actions")}
        views={[
          { id: "reviews", label: "Reviews", count: state.reviews.length },
          { id: "actions", label: "Open actions", count: openActs.length, warn: lateActs.length > 0 },
        ]}
      />
      {view === "reviews" ? (
        <DataTable
          label="Management reviews"
          rows={state.reviews}
          getRowId={(r) => r.id}
          minWidth={860}
          empty={{ title: "No management reviews yet", body: "Start one when top management wants to look at something, or start an ISO 9001 review for clause 9.3.", action: canManage ? <Button size="sm" onClick={() => setPlan("Internal")}><PlusIcon /> Start a review</Button> : undefined }}
          columns={[
            { id: "t", header: "Review", className: "min-w-[240px]", cell: (r) => <Link to={`/management-review/${r.id}`} className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{r.id}</span><span className="font-medium">{r.title}</span></Link> },
            { id: "d", header: "Date", cell: (r) => <span className="whitespace-nowrap">{r.date}</span> },
            { id: "f", header: "Type", cell: (r) => <span className="flex flex-col whitespace-nowrap"><span>{kindLabel(r)}</span>{r.requestedBy && <span className="text-xs text-muted-foreground">Requested by {r.requestedBy}</span>}</span> },
            { id: "s", header: "Stage", cell: (r) => { const s = stageTone(r, actionsFor(state, r.id).open.length); return <Badge tone={s.tone}>{s.label}</Badge> } },
            {
              id: "a",
              header: "Actions",
              cell: (r) => {
                const { acts, open, late } = actionsFor(state, r.id)
                if (!acts.length) return <span className="text-muted-foreground">{r.stage === "Preparing" || r.stage === "Planned" ? "After the review" : "None"}</span>
                return (
                  <span className="flex flex-col">
                    <span className="whitespace-nowrap">{acts.length - open.length} of {acts.length} done</span>
                    {late.length > 0 && <span className="text-xs text-overdue">{late.length} overdue</span>}
                  </span>
                )
              },
            },
            { id: "m", header: "Record", cell: (r) => { const s = signState(r); const locked = r.stage === "Reviewed" || r.stage === "Closed"; return <span className="flex flex-col whitespace-nowrap"><span>{!locked ? "Not yet" : s.complete ? "Signed by top management" : `${s.signed.length} of ${r.reviewers.length} signed`}</span>{locked && !s.complete && <span className="text-xs text-muted-foreground">Waiting for {s.missing.join(", ")}</span>}</span> } },
            {
              id: "x",
              header: <span className="sr-only">Actions</span>,
              className: "w-12",
              cell: (r) => {
                const rr = rowRights(r)
                if (!rr.edit && !rr.del) return null
                return <RowActions name={r.id} openTo={`/management-review/${r.id}`} onEdit={rr.edit ? () => setEditing(r) : undefined} removeKind={rr.del ? "delete" : undefined} onRemove={rr.del ? () => deleteReview(r) : undefined} />
              },
            },
          ]}
        />
      ) : (
        <ActionsTable label="Open actions from management reviews" rows={openActs} />
      )}
      {view === "actions" && <p className="text-[0.8125rem] text-muted-foreground">Actions still open at the next review become its first input, so nothing is lost between reviews.</p>}
      <StartReview open={!!plan} kind={plan} onOpenChange={(o) => !o && setPlan(undefined)} />
      <StartReview open={!!editing} editing={editing} onOpenChange={(o) => !o && setEditing(undefined)} />
    </>
  )
}
