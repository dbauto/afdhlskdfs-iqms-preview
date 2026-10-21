import * as React from "react"
import { useParams } from "react-router-dom"
import { CircleCheckIcon, PencilIcon, PlayIcon, SendIcon, TriangleAlertIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { addDays, formatDate, isIsoDate, todayIso } from "@/lib/periods"
import { IMPROVEMENT_STATES, type Complaint, type ComplaintState, type Improvement, type ImprovementState } from "@/data/types"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChipChoice, Field, PeopleOptions, ProcessOptions } from "@/components/app/form"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"
import { NcSheet } from "./nc-sheet"

export const improvementTone = (s: ImprovementState): BadgeTone => (s === "Done" ? "done" : s === "Not going ahead" ? "draft" : s === "Proposed" ? "soon" : "progress")
export const complaintTone = (c: Complaint): BadgeTone =>
  c.state === "Closed" ? "done" : complaintLate(c) ? "overdue" : c.state === "New" ? "soon" : "progress"
/** a response is late when it isn't sent by the promised date */
export const complaintLate = (c: Complaint, today = todayIso()) => !c.respondedDate && c.state !== "Closed" && c.respondBy < today
export const improvementLate = (i: Improvement, today = todayIso()) => !!i.due && i.due < today && (i.state === "Planned" || i.state === "In progress" || i.state === "Proposed")

/** owner follows the process until someone picks an owner */
function useOwnerFollowsProcess(initial: { process: string; owner: string }, open: boolean, locked: boolean) {
  const { state } = useStore()
  const [process, setProcessRaw] = React.useState(initial.process)
  const [owner, setOwnerRaw] = React.useState(initial.owner)
  const picked = React.useRef(locked)
  React.useEffect(() => {
    if (!open) return
    picked.current = locked
    setProcessRaw(initial.process)
    setOwnerRaw(initial.owner)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return {
    process,
    owner,
    setProcess: (p: string) => {
      setProcessRaw(p)
      if (!picked.current) setOwnerRaw(state.processes.find((x) => x.name === p)?.owner ?? owner)
    },
    setOwner: (o: string) => {
      picked.current = true
      setOwnerRaw(o)
    },
  }
}

/* ---------------- Improvements ---------------- */

export function ImprovementSheet({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item?: Improvement }) {
  const { state, add, update, user, notify, takenIds } = useStore()
  const first = state.processes[0]
  const po = useOwnerFollowsProcess({ process: item?.process ?? first?.name ?? "", owner: item?.owner ?? first?.owner ?? user.name }, open, !!item)
  const [f, setF] = React.useState({ title: "", details: "", source: "", due: "", benefit: "" })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setF({ title: item?.title ?? "", details: item?.details ?? "", source: item?.source ?? "", due: item?.due ?? "", benefit: item?.benefit ?? "" })
  }, [open, item])
  function save() {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = "Say what you want to improve, in a sentence."
    if (f.due && !isIsoDate(f.due)) e.due = "Choose a date."
    setErrors(e)
    if (Object.keys(e).length) return
    const patch = { title: f.title.trim(), details: f.details.trim(), source: f.source.trim() || "Suggestion", due: f.due || undefined, benefit: f.benefit.trim() || undefined, process: po.process, owner: po.owner }
    if (item) {
      update("improvements", item.id, patch)
      toast(`${item.id} saved`)
    } else {
      const id = nextId(takenIds("improvements"), `IMP-${todayIso().slice(0, 4)}-`)
      add("improvements", { id, ...patch, state: "Proposed", raisedDate: todayIso(), raisedBy: user.name })
      if (po.owner !== user.name) notify([po.owner], { kind: "Assigned", title: `You own improvement ${id} ${patch.title}`, body: "Plan it, or say why it isn’t going ahead.", href: `/corrective-action/improvements/${id}` })
      toast(`${id} added`, { description: `${po.owner} owns it.` })
    }
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.id}` : "Add improvement"}</SheetTitle>
          <SheetDescription>An idea or project to make the QMS or a process better. ISO 9001 clauses 10.1 and 10.3.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="What to improve" htmlFor="imp-title" error={errors.title}>
            <Input id="imp-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-invalid={!!errors.title} placeholder="Shadow board for torque tools at each cell" />
          </Field>
          <Field label="Details" htmlFor="imp-details" optional>
            <Textarea id="imp-details" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
          </Field>
          <Field label="What it should achieve" htmlFor="imp-benefit" optional>
            <Input id="imp-benefit" value={f.benefit} onChange={(e) => setF({ ...f, benefit: e.target.value })} placeholder="No shift starts with a missing tool" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="imp-proc">
              <NativeSelect id="imp-proc" value={po.process} onChange={(e) => po.setProcess(e.target.value)}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Owner" htmlFor="imp-owner" help="Suggested: owner of the process.">
              <NativeSelect id="imp-owner" value={po.owner} onChange={(e) => po.setOwner(e.target.value)}>
                <PeopleOptions names={[...new Set([po.owner, ...state.people.filter((p) => p.status === "Active").map((p) => p.name)])]} />
              </NativeSelect>
            </Field>
            <Field label="Where it came from" htmlFor="imp-src" optional>
              <Input id="imp-src" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Staff suggestion" />
            </Field>
            <Field label="Target date" htmlFor="imp-due" optional error={errors.due}>
              <Input id="imp-due" type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{item ? "Save changes" : "Add improvement"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ImprovementDetail() {
  const { id } = useParams()
  const { state, can, update, user } = useStore()
  const item = state.improvements.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  const [closing, setClosing] = React.useState<"" | "Done" | "Not going ahead">("")
  const [note, setNote] = React.useState("")
  if (!item || !can("Corrective Action")) return <NotFound />
  const mayChange = can("Corrective Action", "Add and edit") || item.owner === user.name
  const open = item.state !== "Done" && item.state !== "Not going ahead"
  const move = (state: ImprovementState, extra: Partial<Improvement> = {}) => {
    update("improvements", item.id, { state, ...extra })
    toast(`${item.id}: ${state.toLowerCase()}`)
  }
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Corrective Action", to: "/corrective-action" }, { label: "Improvements", to: "/corrective-action?tab=imp" }, { label: item.id }]}
        title={item.title}
        badge={<Badge tone={improvementLate(item) ? "overdue" : improvementTone(item.state)}>{improvementLate(item) ? "Overdue" : item.state}</Badge>}
        meta={<MetaLine parts={[item.id, "Improvement", item.process, "Clause 10.3"]} />}
        actions={
          mayChange &&
          open && (
            <>
              {item.state === "Proposed" && (
                <Button onClick={() => move("Planned")}>
                  <CircleCheckIcon /> Plan it
                </Button>
              )}
              {item.state === "Planned" && (
                <Button onClick={() => move("In progress")}>
                  <PlayIcon /> Start
                </Button>
              )}
              {item.state === "In progress" && (
                <Button onClick={() => { setNote(""); setClosing("Done") }}>
                  <CircleCheckIcon /> Mark done
                </Button>
              )}
              <Button variant="outline" onClick={() => { setNote(""); setClosing("Not going ahead") }}>
                <XIcon /> Not going ahead
              </Button>
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            </>
          )
        }
      />
      <RecordLayout
        main={
          <Card>
            <CardHeader>
              <CardTitle>The improvement</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Details", v: item.details || "None given." },
                  { k: "Should achieve", v: item.benefit || "Not said." },
                  ...(item.outcome ? [{ k: "What it achieved", v: item.outcome }] : []),
                  ...(item.reason ? [{ k: "Why not", v: item.reason }] : []),
                ]}
              />
            </CardContent>
          </Card>
        }
        side={
          <Card>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Owner", v: item.owner },
                  { k: "Process", v: item.process },
                  { k: "Came from", v: item.source },
                  { k: "Raised", v: `${formatDate(item.raisedDate)} by ${item.raisedBy}` },
                  { k: "Target", v: item.due ? formatDate(item.due) : "No date" },
                  ...(item.doneDate ? [{ k: "Done", v: formatDate(item.doneDate) }] : []),
                ]}
              />
            </CardContent>
          </Card>
        }
      />
      <ImprovementSheet open={edit} onOpenChange={setEdit} item={item} />
      <Dialog open={!!closing} onOpenChange={(v) => !v && setClosing("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{closing === "Done" ? "Mark done" : "Not going ahead"}</DialogTitle>
            <DialogDescription>{closing === "Done" ? "Say what it achieved, so the management review can see the result (clause 9.3.2 f)." : "Say why, so the idea isn’t raised again without the reason."}</DialogDescription>
          </DialogHeader>
          <Field label={closing === "Done" ? "What it achieved" : "Why not"} htmlFor="imp-note">
            <Textarea id="imp-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClosing("")}>
              Cancel
            </Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                move(closing as ImprovementState, closing === "Done" ? { outcome: note.trim(), doneDate: todayIso() } : { reason: note.trim() })
                setClosing("")
              }}
            >
              {closing === "Done" ? "Mark done" : "Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ---------------- Customer complaints ---------------- */

export function ComplaintSheet({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item?: Complaint }) {
  const { state, add, update, user, notify, takenIds } = useStore()
  const first = state.processes[0]
  const po = useOwnerFollowsProcess({ process: item?.process ?? first?.name ?? "", owner: item?.owner ?? first?.owner ?? user.name }, open, !!item)
  const blank = { title: "", customer: "", reference: "", details: "", received: todayIso(), respondBy: addDays(todayIso(), 14) }
  const [f, setF] = React.useState(blank)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setF(item ? { title: item.title, customer: item.customer, reference: item.reference ?? "", details: item.details, received: item.received, respondBy: item.respondBy } : blank)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])
  function save() {
    const e: Record<string, string> = {}
    if (!f.customer.trim()) e.customer = "Who complained?"
    if (!f.title.trim()) e.title = "Say what went wrong for the customer."
    if (!isIsoDate(f.received)) e.received = "Choose a date."
    if (!isIsoDate(f.respondBy)) e.respondBy = "Choose a date."
    else if (isIsoDate(f.received) && f.respondBy < f.received) e.respondBy = "Respond on or after the day it was received."
    setErrors(e)
    if (Object.keys(e).length) return
    const patch = { title: f.title.trim(), customer: f.customer.trim(), reference: f.reference.trim() || undefined, details: f.details.trim(), received: f.received, respondBy: f.respondBy, process: po.process, owner: po.owner }
    if (item) {
      update("complaints", item.id, patch)
      toast(`${item.id} saved`)
    } else {
      const id = nextId(takenIds("complaints"), `CC-${todayIso().slice(0, 4)}-`)
      add("complaints", { id, ...patch, state: "New", loggedBy: user.name })
      if (po.owner !== user.name) notify([po.owner], { kind: "Assigned", title: `Customer complaint ${id} from ${patch.customer}`, body: `Respond by ${formatDate(patch.respondBy)}.`, href: `/corrective-action/complaints/${id}` })
      toast(`${id} logged`, { description: `${po.owner} responds by ${formatDate(patch.respondBy)}.` })
    }
    onOpenChange(false)
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.id}` : "Log customer complaint"}</SheetTitle>
          <SheetDescription>What the customer told you, and who responds. ISO 9001 clauses 8.2.1 and 9.1.2.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer" htmlFor="cc-customer" error={errors.customer}>
              <Input id="cc-customer" value={f.customer} onChange={(e) => setF({ ...f, customer: e.target.value })} aria-invalid={!!errors.customer} />
            </Field>
            <Field label="Order or reference" htmlFor="cc-ref" optional>
              <Input id="cc-ref" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="Order 8812" />
            </Field>
          </div>
          <Field label="What went wrong" htmlFor="cc-title" error={errors.title}>
            <Input id="cc-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-invalid={!!errors.title} placeholder="Wrong label revision on 40 parts" />
          </Field>
          <Field label="What the customer said" htmlFor="cc-details" optional>
            <Textarea id="cc-details" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="cc-proc">
              <NativeSelect id="cc-proc" value={po.process} onChange={(e) => po.setProcess(e.target.value)}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Owner" htmlFor="cc-owner" help="Responds to the customer.">
              <NativeSelect id="cc-owner" value={po.owner} onChange={(e) => po.setOwner(e.target.value)}>
                <PeopleOptions names={[...new Set([po.owner, ...state.people.filter((p) => p.status === "Active").map((p) => p.name)])]} />
              </NativeSelect>
            </Field>
            <Field label="Received" htmlFor="cc-received" error={errors.received}>
              <Input id="cc-received" type="date" value={f.received} onChange={(e) => setF({ ...f, received: e.target.value })} />
            </Field>
            <Field label="Respond by" htmlFor="cc-respond" error={errors.respondBy}>
              <Input id="cc-respond" type="date" value={f.respondBy} onChange={(e) => setF({ ...f, respondBy: e.target.value })} />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{item ? "Save changes" : "Log complaint"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

export function ComplaintDetail() {
  const { id } = useParams()
  const { state, can, update, user } = useStore()
  const c = state.complaints.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  const [respond, setRespond] = React.useState(false)
  const [closing, setClosing] = React.useState(false)
  const [raising, setRaising] = React.useState(false)
  const [text, setText] = React.useState("")
  const [satisfied, setSatisfied] = React.useState<"Yes" | "Partly" | "No">("Yes")
  if (!c || !can("Corrective Action")) return <NotFound />
  const mayChange = can("Corrective Action", "Add and edit") || c.owner === user.name
  const move = (s: ComplaintState, extra: Partial<Complaint> = {}) => {
    update("complaints", c.id, { state: s, ...extra })
    toast(`${c.id}: ${s.toLowerCase()}`)
  }
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Corrective Action", to: "/corrective-action" }, { label: "Customer complaints", to: "/corrective-action?tab=cc" }, { label: c.id }]}
        title={c.title}
        badge={<Badge tone={complaintTone(c)}>{complaintLate(c) ? "Response overdue" : c.state}</Badge>}
        meta={<MetaLine parts={[c.id, c.customer, c.reference ?? "", c.process].filter(Boolean)} />}
        actions={
          mayChange &&
          c.state !== "Closed" && (
            <>
              {c.state === "New" && (
                <Button onClick={() => move("Investigating")}>
                  <PlayIcon /> Start investigating
                </Button>
              )}
              {(c.state === "New" || c.state === "Investigating") && (
                <Button variant={c.state === "New" ? "outline" : "default"} onClick={() => { setText(c.response ?? ""); setRespond(true) }}>
                  <SendIcon /> Record response
                </Button>
              )}
              {c.state === "Responded" && (
                <Button onClick={() => { setSatisfied(c.satisfied ?? "Yes"); setClosing(true) }}>
                  <CircleCheckIcon /> Close
                </Button>
              )}
              {!c.ncId && can("Corrective Action", "Add and edit") && (
                <Button variant="outline" onClick={() => setRaising(true)}>
                  <TriangleAlertIcon /> Raise nonconformity
                </Button>
              )}
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            </>
          )
        }
      />
      <RecordLayout
        main={
          <Card>
            <CardHeader>
              <CardTitle>The complaint</CardTitle>
            </CardHeader>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "What the customer said", v: c.details || "Not recorded." },
                  { k: "Our response", v: c.response ? c.response : "Not sent yet." },
                  ...(c.satisfied ? [{ k: "Customer accepted it", v: c.satisfied }] : []),
                  { k: "Nonconformity", v: c.ncId ? <RecordLink kind="nonconformity" id={c.ncId} /> : "None raised" },
                ]}
              />
            </CardContent>
          </Card>
        }
        side={
          <Card>
            <CardContent className="py-1">
              <KeyFacts
                facts={[
                  { k: "Owner", v: c.owner },
                  { k: "Process", v: c.process },
                  { k: "Received", v: formatDate(c.received) },
                  { k: "Respond by", v: formatDate(c.respondBy) },
                  ...(c.respondedDate ? [{ k: "Responded", v: formatDate(c.respondedDate) }] : []),
                  ...(c.closedDate ? [{ k: "Closed", v: formatDate(c.closedDate) }] : []),
                  { k: "Logged by", v: c.loggedBy },
                ]}
              />
            </CardContent>
          </Card>
        }
      />
      <ComplaintSheet open={edit} onOpenChange={setEdit} item={c} />
      <Dialog open={respond} onOpenChange={setRespond}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record response</DialogTitle>
            <DialogDescription>What you told {c.customer}: the cause if known, what you did about it, and what happens next.</DialogDescription>
          </DialogHeader>
          <Field label="Response" htmlFor="cc-response">
            <Textarea id="cc-response" value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRespond(false)}>
              Cancel
            </Button>
            <Button
              disabled={!text.trim()}
              onClick={() => {
                move("Responded", { response: text.trim(), respondedDate: todayIso() })
                setRespond(false)
              }}
            >
              Record response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={closing} onOpenChange={setClosing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close complaint</DialogTitle>
            <DialogDescription>Did the customer accept the response? This feeds customer satisfaction (clause 9.1.2).</DialogDescription>
          </DialogHeader>
          <Field label="Customer accepted it">
            <ChipChoice label="Customer accepted it" options={["Yes", "Partly", "No"] as const} value={satisfied} onChange={setSatisfied} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setClosing(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                move("Closed", { satisfied, closedDate: todayIso() })
                setClosing(false)
              }}
            >
              Close complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NcSheet
        open={raising}
        onOpenChange={setRaising}
        fromComplaint={c}
        onCreated={(ncId) => {
          update("complaints", c.id, { ncId, state: c.state === "New" ? "Investigating" : c.state })
        }}
      />
    </>
  )
}

export const IMPROVEMENT_STATE_LIST = IMPROVEMENT_STATES
