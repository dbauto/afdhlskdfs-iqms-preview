import { NeedsYou } from "./needs-you"
import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { CalendarClockIcon, CalendarDaysIcon, FileCheckIcon, ListChecksIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { REVIEW_INPUTS } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewAction, ReviewFormat } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { EvidencePicker, Field, PeopleOptions, PeoplePicker } from "@/components/app/form"
import { FORMATS, actionsFor, formatLabel, inputReady, isLate, linkedClosed, periodOf, reviewPeople, signState, stageTone, useActionReminders, useReviewRights } from "./shared"
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

function PlanSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, add, user, notify } = useStore()
  const navigate = useNavigate()
  const [format, setFormat] = React.useState<ReviewFormat>("No meeting")
  const [date, setDate] = React.useState("")
  const [place, setPlace] = React.useState("")
  // only people who can open management reviews can take part; top management defaults to the Top management role
  const allowed = reviewPeople(state)
  const notAllowed = state.people.map((p) => p.name).filter((n) => !allowed.includes(n))
  const topManagement = state.people.filter((p) => p.status === "Active" && p.roleId === "top").map((p) => p.name)
  const [reviewers, setReviewers] = React.useState<string[]>(topManagement)
  const [others, setOthers] = React.useState<string[]>([])
  const [preparedBy, setPreparedBy] = React.useState(user.name)
  const [contributors, setContributors] = React.useState<string[]>([])
  const [start, setStart] = React.useState("")
  const [end, setEnd] = React.useState("")
  const [error, setError] = React.useState("")
  // the period runs on from the end of the last review's period
  const last = latestReview(state.reviews)
  const defaultStart = last ? addDays(periodOf(last).end, 1) : ""
  const consultants = state.people.filter((p) => p.roleId === "consultant").map((p) => p.name)

  React.useEffect(() => {
    if (!open) return
    setFormat("No meeting")
    setDate("")
    setPlace("")
    setReviewers(topManagement)
    setOthers([])
    setPreparedBy(user.name)
    setContributors([])
    setStart(defaultStart)
    setEnd("")
    setError("")
  }, [open, user.name])

  function save() {
    if (!date) return setError(format === "Meeting" ? "Choose the meeting date." : "Choose the date top management should have reviewed it by.")
    if (!reviewers.length) return setError("Choose at least one person from top management. ISO 9001 needs top management to review the QMS.")
    if (reviewers.some((n) => consultants.includes(n))) return setError("A consultant can’t act as top management. Choose a director or the managing director.")
    const periodEnd = end || date
    if (!start) return setError("Choose when the reporting period starts.")
    if (start > periodEnd) return setError("The reporting period must start before it ends.")
    const year = new Date(date).getFullYear() || new Date().getFullYear()
    const id = nextId(state.reviews.filter((r) => r.id.startsWith(`MR-${year}-`)).map((r) => r.id), `MR-${year}-`, 2)
    const month = new Date(date).toLocaleDateString("en-GB", { month: "long" })
    const record: ManagementReviewRecord = {
      id,
      title: `${month} ${year} management review`,
      format,
      stage: "Planned",
      date: fmtDate(date),
      place: format === "Meeting" ? place.trim() || undefined : undefined,
      reviewers,
      others,
      contributors: contributors.length ? contributors : undefined,
      preparedBy,
      period: { start, end: periodEnd },
      inputs: REVIEW_INPUTS.map((i) => ({ ...i })),
      status: Object.fromEntries([...reviewers, ...others].map((n) => [n, "Not opened" as const])),
      comments: [],
    }
    add("reviews", record)
    notify([preparedBy], { kind: "Assigned", title: `Prepare ${id}, ${record.title}`, body: `Add an analysis to each input before ${record.date}.`, href: `/management-review/${id}` })
    if (contributors.length) notify(contributors, { kind: "Assigned", title: `You’re helping prepare ${id}`, body: `${preparedBy} may hand you inputs to prepare.`, href: `/management-review/${id}` })
    toast(`${id} planned`, { description: "Figures and supporting records are filled in from ThryveMS for the reporting period. Add an analysis to each input, then send the review pack." })
    onOpenChange(false)
    navigate(`/management-review/${id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Plan a management review</SheetTitle>
          <SheetDescription>The 11 inputs from ISO 9001 clause 9.3.2 are added for you, with figures and supporting records from ThryveMS for the reporting period.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="How it’s held">
            <FormatChoice value={format} onChange={setFormat} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={format === "Meeting" ? "Meeting date" : format === "No meeting" ? "Review by" : "Complete by"} htmlFor="mr-date" error={error && !date ? error : undefined}>
              <Input id="mr-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            {format === "Meeting" && (
              <Field label="Place" htmlFor="mr-place" optional>
                <Input id="mr-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Board room" />
              </Field>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Reporting period starts" htmlFor="mr-start" help={last ? `The day after ${last.id}’s period ended.` : "The first review usually covers the last 12 months."}>
              <Input id="mr-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Reporting period ends" htmlFor="mr-end" optional help="Leave empty to end on the review date.">
              <Input id="mr-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
          </div>
          <Field label="Top management" help="They evaluate the inputs and sign off. Usually the owner or managing director. Consultants can’t act as top management." error={error && date ? error : undefined}>
            <PeoplePicker label="Top management" value={reviewers} onChange={setReviewers} exclude={[...consultants, ...notAllowed]} />
          </Field>
          <Field label={format === "Meeting" ? "Also attending" : "Also gets the review pack"} optional>
            <PeoplePicker label="Others" value={others} onChange={setOthers} exclude={[...reviewers, ...notAllowed]} />
          </Field>
          <Field label="Contributors" optional help="Department heads who help prepare inputs. The preparer can hand them an input. Only people with access to Management Review are listed.">
            <PeoplePicker label="Contributors" value={contributors} onChange={setContributors} exclude={[...reviewers, preparedBy, ...notAllowed]} />
          </Field>
          <Field label="Prepared by" htmlFor="mr-prep" help="Checks the figures and records and writes the analysis. They can hand an input to someone else.">
            <NativeSelect id="mr-prep" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}>
              <PeopleOptions names={allowed} />
            </NativeSelect>
          </Field>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Plan review</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
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
  const { state, rules } = useStore()
  const { canManage } = useReviewRights()
  useActionReminders()
  const [view, setView] = React.useState<"reviews" | "actions">("reviews")
  const [plan, setPlan] = React.useState(false)
  const next = state.reviews.find((r) => r.stage === "Planned" || r.stage === "Preparing")
  const last = latestReview(state.reviews)
  const openActs = state.reviewActions.filter((a) => a.state === "Open")
  const lateActs = openActs.filter((a) => isLate(a))
  // the next review is due one interval after the last one was held
  const lastHeld = last ? (last.lockedAt?.slice(0, 10) ?? parseDisplayDate(last.recordedOn ?? last.date)) : undefined
  const dueBy = lastHeld ? addMonths(lastHeld, rules.mrEvery) : undefined
  const nextDate = next ? parseDisplayDate(next.date) : undefined
  const schedule = !last && !next ? { badge: "Not planned", tone: "overdue" as const } : next ? (dueBy && nextDate && nextDate > dueBy ? { badge: `Planned after ${fmtDate(dueBy)}`, tone: "soon" as const } : { badge: "On schedule", tone: "done" as const }) : dueBy && dueBy < todayIso() ? { badge: `Overdue since ${fmtDate(dueBy)}`, tone: "overdue" as const } : { badge: dueBy ? `Next due by ${fmtDate(dueBy)}` : "Plan the next one", tone: "soon" as const }
  const signed = state.reviews.filter((r) => (r.stage === "Reviewed" || r.stage === "Closed") && signState(r).complete).length
  const every = rules.mrEvery === 12 ? "Once a year" : rules.mrEvery === 6 ? "Twice a year" : "Every quarter"
  const notes = next ? next.inputs.filter(inputReady).length : 0

  return (
    <>
      <PageHeader
        title="Management Review"
        description="Top management reviews the QMS at planned intervals to check it still works and fits the company’s direction. It doesn’t have to be a meeting. ISO 9001 clause 9.3."
        actions={
          canManage && (
            <Button onClick={() => setPlan(true)}>
              <PlusIcon /> Plan review
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          next
            ? { value: next.date.replace(/ \d{4}$/, ""), label: `Next review, ${next.id}. ${notes} of ${next.inputs.length} inputs prepared`, badge: next.format === "Meeting" ? "Meeting" : next.format === "No meeting" ? "No meeting" : "Several meetings", tone: "progress", icon: CalendarDaysIcon, to: `/management-review/${next.id}` }
            : { value: "Not planned", label: "Next review", badge: "Plan one", tone: "soon", icon: CalendarDaysIcon },
          { value: openActs.length, label: "Open actions from past reviews", badge: lateActs.length ? `${lateActs.length} overdue` : "On track", tone: lateActs.length ? "overdue" : "done", icon: ListChecksIcon },
          { value: signed, label: "Review records signed by all top management, kept as evidence for clause 9.3", badge: signed ? "Ready for audit" : "None yet", tone: signed ? "done" : "soon", icon: FileCheckIcon, to: "/evidence" },
          { value: every, label: `Company rule${last ? `. Last reviewed ${last.recordedOn ?? last.date}` : ""}. Change it in Settings › QMS rules`, badge: schedule.badge, tone: schedule.tone, icon: CalendarClockIcon },
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
          empty={{ title: "No management reviews yet", body: "Plan the first one. It can be a meeting, or top management can review a pack and sign off.", action: canManage ? <Button size="sm" onClick={() => setPlan(true)}><PlusIcon /> Plan review</Button> : undefined }}
          columns={[
            { id: "t", header: "Review", className: "min-w-[240px]", cell: (r) => <Link to={`/management-review/${r.id}`} className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{r.id}</span><span className="font-medium">{r.title}</span></Link> },
            { id: "d", header: "Date", cell: (r) => <span className="whitespace-nowrap">{r.date}</span> },
            { id: "f", header: "How", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{formatLabel(r.format)}</span> },
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
          ]}
        />
      ) : (
        <ActionsTable label="Open actions from management reviews" rows={openActs} />
      )}
      {view === "actions" && <p className="text-[0.8125rem] text-muted-foreground">Actions still open at the next review become its first input, so nothing is lost between reviews.</p>}
      <PlanSheet open={plan} onOpenChange={setPlan} />
    </>
  )
}
