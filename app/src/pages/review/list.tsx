import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { CalendarClockIcon, CalendarDaysIcon, FileCheckIcon, ListChecksIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { REVIEW_INPUTS } from "@/data/reviews"
import type { ManagementReviewRecord, ReviewAction, ReviewFormat } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { Field, PeopleOptions, PeoplePicker } from "@/components/app/form"
import { FORMATS, actionsFor, formatLabel, linkedClosed, stageTone, useReviewRights } from "./shared"
import { hrefForId } from "@/lib/record-links"
import { todayIso } from "@/lib/periods"

const fmtDate = (v: string) => {
  const d = new Date(v)
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
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
  const [reviewers, setReviewers] = React.useState<string[]>(["Eric Navarro"])
  const [others, setOthers] = React.useState<string[]>([])
  const [preparedBy, setPreparedBy] = React.useState(user.name)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setFormat("No meeting")
    setDate("")
    setPlace("")
    setReviewers(["Eric Navarro"])
    setOthers([])
    setPreparedBy(user.name)
    setError("")
  }, [open, user.name])

  function save() {
    if (!date) return setError(format === "Meeting" ? "Choose the meeting date." : "Choose the date top management should have reviewed it by.")
    if (!reviewers.length) return setError("Choose at least one person from top management. ISO 9001 needs top management to review the QMS.")
    const year = new Date(date).getFullYear() || new Date().getFullYear()
    const id = nextId(state.reviews.filter((r) => r.id.startsWith(`MR-${year}-`)).map((r) => r.id), `MR-${year}-`, 2)
    const month = new Date(date).toLocaleDateString("en-GB", { month: "long" })
    const record: ManagementReviewRecord = {
      id,
      title: `${month} ${year} management review`,
      format,
      stage: "Preparing",
      date: fmtDate(date),
      place: format === "Meeting" ? place.trim() || undefined : undefined,
      reviewers,
      others,
      preparedBy,
      inputs: REVIEW_INPUTS.map((i) => ({ ...i })),
      status: Object.fromEntries([...reviewers, ...others].map((n) => [n, "Not opened" as const])),
      comments: [],
    }
    add("reviews", record)
    notify([preparedBy], { kind: "Assigned", title: `Prepare ${id}, ${record.title}`, body: `Add a note to each input before ${record.date}.`, href: `/management-review/${id}` })
    toast(`${id} planned`, { description: "The inputs are filled in from iQMS. Add a note to each, then send the review pack." })
    onOpenChange(false)
    navigate(`/management-review/${id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Plan a management review</SheetTitle>
          <SheetDescription>The 11 inputs from ISO 9001 clause 9.3.2 are added for you, with figures from iQMS.</SheetDescription>
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
          <Field label="Top management" help="They review the inputs and sign off. Usually the owner or managing director." error={error && date ? error : undefined}>
            <PeoplePicker label="Top management" value={reviewers} onChange={setReviewers} />
          </Field>
          <Field label={format === "Meeting" ? "Also attending" : "Also gets the review pack"} optional>
            <PeoplePicker label="Others" value={others} onChange={setOthers} exclude={reviewers} />
          </Field>
          <Field label="Prepared by" htmlFor="mr-prep" help="Writes the notes on the inputs. They can hand an input to someone else.">
            <NativeSelect id="mr-prep" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)}>
              <PeopleOptions />
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

/** Confirm an action is done. Used on the list and on a review. */
export function ActionState({ a }: { a: ReviewAction }) {
  const { state, update, user } = useStore()
  const { canManage } = useReviewRights()
  const hint = linkedClosed(state, a)
  const mayClose = canManage || a.owner === user.name
  if (a.state === "Done") return <Badge tone="done">Done</Badge>
  if (mayClose && hint)
    return (
      <Button size="sm" variant="outline" onClick={() => { update("reviewActions", a.id, { state: "Done", late: false, doneOn: "Today", doneDate: todayIso() }); toast("Action marked done") }}>
        Mark done?
      </Button>
    )
  return (
    <span className="flex items-center gap-2">
      <Badge tone={a.late ? "overdue" : "progress"}>{a.late ? "Overdue" : "In progress"}</Badge>
      {mayClose && (
        <button type="button" onClick={() => { update("reviewActions", a.id, { state: "Done", late: false, doneOn: "Today", doneDate: todayIso() }); toast("Action marked done") }} className="cursor-pointer text-xs font-medium text-primary hover:underline">
          Done
        </button>
      )}
    </span>
  )
}

export function ActionsTable({ rows, label, showFrom = true, minWidth = 820 }: { rows: ReviewAction[]; label: string; showFrom?: boolean; minWidth?: number }) {
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
        ...(showFrom ? [{ id: "f", header: "From", cell: (a: ReviewAction) => <Link to={`/management-review/${a.reviewId}`} className="whitespace-nowrap text-[0.8125rem] font-medium text-primary">{a.reviewId}</Link> }] : []),
        { id: "y", header: "Type", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{a.type}</span> },
        { id: "o", header: "Owner", cell: (a) => <span className="whitespace-nowrap">{a.owner}</span> },
        { id: "d", header: "Due", cell: (a) => <span className={cn("whitespace-nowrap", a.late && a.state === "Open" && "font-semibold text-overdue")}>{a.due}</span> },
        { id: "l", header: "Linked to", cell: (a) => (a.linked ? <Link to={hrefForId(a.linked)} className="whitespace-nowrap text-[0.8125rem] font-medium text-primary">{a.linked}</Link> : <span className="text-muted-foreground">None</span>) },
        { id: "s", header: "State", cell: (a) => <ActionState a={a} /> },
      ]}
    />
  )
}

export default function ManagementReviews() {
  const { state, rules } = useStore()
  const { canManage } = useReviewRights()
  const [view, setView] = React.useState<"reviews" | "actions">("reviews")
  const [plan, setPlan] = React.useState(false)
  const next = state.reviews.find((r) => r.stage === "Planned" || r.stage === "Preparing")
  const last = state.reviews.find((r) => r.stage === "Reviewed" || r.stage === "Closed")
  const openActs = state.reviewActions.filter((a) => a.state === "Open")
  const lateActs = openActs.filter((a) => a.late)
  const every = rules.mrEvery === 12 ? "Once a year" : rules.mrEvery === 6 ? "Twice a year" : "Every quarter"
  const notes = next ? next.inputs.filter((i) => i.note || i.notApplicable).length : 0

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
            ? { value: next.date.replace(/ \d{4}$/, ""), label: `Next review, ${next.id}. ${notes} of ${next.inputs.length} inputs have a note`, badge: next.format === "Meeting" ? "Meeting" : next.format === "No meeting" ? "No meeting" : "Several meetings", tone: "progress", icon: CalendarDaysIcon, to: `/management-review/${next.id}` }
            : { value: "Not planned", label: "Next review", badge: "Plan one", tone: "soon", icon: CalendarDaysIcon },
          { value: openActs.length, label: "Open actions from past reviews", badge: lateActs.length ? `${lateActs.length} overdue` : "On track", tone: lateActs.length ? "overdue" : "done", icon: ListChecksIcon },
          { value: state.reviews.filter((r) => r.signOff).length, label: "Signed review records, kept as evidence for clause 9.3", badge: "Ready for audit", tone: "done", icon: FileCheckIcon, to: "/evidence" },
          { value: every, label: `Company rule${last ? `. Last reviewed ${last.recordedOn ?? last.date}` : ""}. Change it in Settings › QMS rules`, badge: next || last ? "On schedule" : "Overdue", tone: next || last ? "done" : "overdue", icon: CalendarClockIcon },
        ]}
      />
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
            { id: "m", header: "Record", cell: (r) => <span className="flex flex-col whitespace-nowrap"><span>{r.signOff ? (r.signOff.how === "Signed scan" ? "Signed scan" : "Signed off in iQMS") : r.stage === "Reviewed" ? "Waiting for sign-off" : "Not yet"}</span>{r.signOff && <span className="text-xs text-muted-foreground">{r.signOff.when}</span>}</span> },
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
