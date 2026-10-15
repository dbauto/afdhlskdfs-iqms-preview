import * as React from "react"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore, startProcess } from "@/lib/store"
import { DOC_TYPES } from "@/data/records"
import { CLASSIFICATIONS, isLocked, type ApprovalMode, type Classification, type DocRecord } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ClausePicker, Field, PeopleOptions, PeoplePicker, ProcessOptions } from "@/components/app/form"
import { formatClauses, parseClauses } from "@/data/iso"
import { defaultRoute } from "@/lib/routes"
import { RevisionSheet } from "./revision-sheet"

const CLASS_HELP: Record<Classification, string> = {
  Public: "Can be shared outside the company, such as the quality policy.",
  Internal: "For everyone at the company. Most documents.",
  Confidential: "Named people only. iQMS keeps the link and a description, not the file.",
  "Highly confidential": "A very small group, such as directors. Link and description only.",
}

const PREFIX: Record<string, string> = {
  "Leadership & planning": "QMS",
  "Sales & customer": "SAL",
  "Design & development": "DES",
  "Purchasing & suppliers": "PUR",
  Operations: "OPS",
  "Inspection & release": "INS",
  "People & competence": "HR",
  "Infrastructure & equipment": "EQP",
  "Monitoring & improvement": "IMP",
}
const TYPE_CODE: Record<string, string> = { Manual: "MAN", Policy: "POL", Procedure: "PRO", "Work instruction": "WI", Form: "FRM", Register: "REG", Record: "REC", Standard: "STD" }

function numberFor(process: string, type: string, existing: string[]) {
  const pre = `${PREFIX[process] ?? "DOC"}-${TYPE_CODE[type] ?? "DOC"}-`
  const n = existing.filter((i) => i.startsWith(pre)).map((i) => parseInt(i.slice(pre.length), 10) || 0)
  return pre + String(Math.max(0, ...n) + 1).padStart(3, "0")
}

/** Add document and Edit document share one panel. */
export function DocSheet({ open, onOpenChange, doc, defaultProcess }: { open: boolean; onOpenChange: (v: boolean) => void; doc?: DocRecord; /** pre-fills the process when adding from a process page */ defaultProcess?: string }) {
  const { state, add, update, user, routeDefaults, notify, takenIds } = useStore()
  const editing = !!doc
  const [kind, setKind] = React.useState("new")
  const [cls, setCls] = React.useState<Classification>(doc?.classification ?? "Internal")
  const [title, setTitle] = React.useState(doc?.title ?? "")
  const [description, setDescription] = React.useState(doc?.description ?? "")
  const [link, setLink] = React.useState(doc?.link ?? "")
  const [type, setType] = React.useState(doc?.type ?? "Procedure")
  const [process, setProcess] = React.useState(doc?.process ?? defaultProcess ?? startProcess(state.processes))
  const [owner, setOwner] = React.useState(doc?.owner ?? user.name)
  const [viewers, setViewers] = React.useState<string[]>(doc?.viewers ?? [])
  const [reviewers, setReviewers] = React.useState<string[]>(doc?.reviewers ?? ["Nina Flores"])
  const [approvers, setApprovers] = React.useState<string[]>(doc?.approvers ?? ["Maria Santos"])
  const [mode, setMode] = React.useState<ApprovalMode>(doc?.approvalMode ?? "Everyone must approve")
  const [months, setMonths] = React.useState("12")
  const [clauses, setClauses] = React.useState<string[]>(doc?.clauses ?? [])
  const [clausesTouched, setClausesTouched] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [routeTouched, setRouteTouched] = React.useState(false)
  const [routeSource, setRouteSource] = React.useState("")
  const [revisionOf, setRevisionOf] = React.useState("")
  const [revDoc, setRevDoc] = React.useState<DocRecord | undefined>()

  React.useEffect(() => {
    if (!open) return
    setRouteTouched(false)
    setKind("new")
    setRevisionOf("")
    setCls(doc?.classification ?? "Internal")
    setTitle(doc?.title ?? "")
    setDescription(doc?.description ?? "")
    setLink(doc?.link ?? "")
    setType(doc?.type ?? "Procedure")
    setProcess(doc?.process ?? defaultProcess ?? startProcess(state.processes))
    setOwner(doc?.owner ?? user.name)
    setViewers(doc?.viewers ?? [])
    setReviewers(doc?.reviewers ?? ["Nina Flores"])
    setApprovers(doc?.approvers ?? ["Maria Santos"])
    setMode(doc?.approvalMode ?? "Everyone must approve")
    setClauses(doc?.clauses ?? [])
    setClausesTouched(false)
    setErrors({})
  }, [open, doc, user.name, defaultProcess])

  // New documents get the default route for their type and process until someone changes it by hand.
  React.useEffect(() => {
    if (!open || editing || routeTouched) return
    const r = defaultRoute(type, process, state.processes, state.people, routeDefaults)
    setReviewers(r.reviewers)
    setApprovers(r.approvers.filter((n) => n !== user.name))
    setRouteSource(r.source)
  }, [open, editing, routeTouched, type, process, state.processes, state.people, routeDefaults, user.name])

  // New documents start with the clauses of their process until someone changes them by hand.
  const processClauses = parseClauses(state.processes.find((p) => p.name === process)?.clauses ?? "")
  React.useEffect(() => {
    if (!open || editing || clausesTouched) return
    setClauses(processClauses)
  }, [open, editing, clausesTouched, process, state.processes])

  const locked = isLocked(cls)
  const number = doc?.id ?? numberFor(process, type, takenIds("documents"))

  function save(submit: boolean) {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Give the document a title."
    if (!link.trim()) e.link = "Paste the SharePoint or OneDrive link to the file."
    else if (!/^https?:\/\//.test(link.trim())) e.link = "The link should start with https://"
    if (!description.trim()) e.description = "Say what the document is for and when it is used."
    if (locked && viewers.length === 0) e.viewers = "Name at least one person who can see this record."
    if (submit && clauses.length === 0) e.clauses = "Choose at least one ISO 9001 clause this document covers."
    if (submit && reviewers.length === 0) e.reviewers = "Add at least one technical reviewer."
    if (submit && approvers.length === 0) e.approvers = "Add at least one approver."
    else if (approvers.some((n) => state.people.find((x) => x.name === n)?.roleId === "consultant")) e.approvers = "Consultants can’t approve. Approval stays with your own people."
    else if (submit && !editing && approvers.includes(user.name)) e.approvers = "You’re adding this document, so you can’t also approve it. Choose someone else."
    setErrors(e)
    if (Object.keys(e).length) return

    const record: DocRecord = {
      id: number,
      title: title.trim(),
      process,
      type,
      rev: doc?.rev ?? "01",
      stage: editing ? doc!.stage : submit ? "Technical review" : "Draft",
      owner,
      nextReview: doc?.nextReview ?? "Not set",
      classification: cls,
      description: description.trim(),
      link: link.trim(),
      clauses,
      viewers: locked ? viewers : [],
      reviewers,
      approvers,
      approvalMode: mode,
    }
    if (editing) {
      update("documents", doc!.id, record)
      toast(`${number} saved`)
    } else {
      add("documents", record)
      if (submit) notify(reviewers, { kind: "Waiting on you", title: `Review ${number} ${record.title}`, body: `${user.name} sent revision ${record.rev} for technical review.`, href: `/documents/${number}` })
      if (owner !== user.name) notify([owner], { kind: "Assigned", title: `You own ${number} ${record.title}`, href: `/documents/${number}` })
      toast(submit ? `${number} submitted for review` : `${number} saved as a draft`, {
        description: submit ? `${reviewers.join(", ")} will be asked to review it.` : undefined,
      })
    }
    onOpenChange(false)
  }

  return (
    <>
    <RevisionSheet doc={revDoc} onClose={() => setRevDoc(undefined)} />
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? `Edit ${doc!.id}` : "Add document"}</SheetTitle>
          <SheetDescription>The file stays in SharePoint or OneDrive. iQMS controls its revisions and approval.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {!editing && (
            <Field label="What are you adding?">
              <RadioGroup value={kind} onValueChange={setKind} className="sm:grid-cols-2">
                <RadioCard value="new" title="A new document" help="Starts at revision 01 and goes through review before it is published." />
                <RadioCard value="revision" title="A new revision" help="Of a document already in the library. The current revision stays in force until this one is published." />
              </RadioGroup>
            </Field>
          )}

          {kind === "revision" && !editing ? (
            <Field label="Which document" htmlFor="doc-revof" help="Only published documents can get a new revision. The next step shows who will review and approve it.">
              <NativeSelect id="doc-revof" value={revisionOf} onChange={(e) => setRevisionOf(e.target.value)}>
                <option value="">Choose a published document</option>
                {state.documents
                  .filter((d) => d.stage === "Published")
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.id} {d.title}, revision {d.rev}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          ) : (
            <>
          <Field label="Classification">
            <RadioGroup value={cls} onValueChange={(v) => setCls(v as Classification)} className="sm:grid-cols-2">
              {CLASSIFICATIONS.map((c) => (
                <RadioCard key={c} value={c} title={c} help={CLASS_HELP[c]} icon={isLocked(c) ? <LockIcon className="size-3.5" /> : undefined} />
              ))}
            </RadioGroup>
          </Field>

          {locked && (
            <Alert tone="warning" title="iQMS will not open this file">
              <p>Only the link and your description are saved. Before you add the link, check its sharing in SharePoint or OneDrive:</p>
              <ul className="mt-1.5 list-disc pl-5">
                <li>Share it only with the named people who need it.</li>
                <li>Do not use “Anyone with the link” or “People in your company”.</li>
              </ul>
            </Alert>
          )}

          <Field label="Link to the file" htmlFor="doc-link" error={errors.link} help={locked ? "Saved as written. iQMS does not check or preview confidential files." : "iQMS checks the link opens and shows a preview to reviewers."}>
            <Input id="doc-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://yourcompany.sharepoint.com/…" aria-invalid={!!errors.link} />
          </Field>

          <Field label="Title" htmlFor="doc-title" error={errors.title} help={locked ? "Visible to everyone who can open the register, so keep it general." : undefined}>
            <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!errors.title} />
          </Field>

          <Field
            label="Description"
            htmlFor="doc-desc"
            error={errors.description}
            help={locked ? "Say what the document is for and when it is used. Do not include names, prices, figures or anything else from inside the file." : "Say what the document is for and when it is used."}
          >
            <Textarea id="doc-desc" value={description} onChange={(e) => setDescription(e.target.value)} aria-invalid={!!errors.description} />
          </Field>

          {locked && (
            <Field label="Who can see this record in iQMS" error={errors.viewers} help="Everyone else sees only that a confidential record exists, with its number and owner.">
              <PeoplePicker label="Who can see this record" value={viewers} onChange={setViewers} />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="doc-type">
              <NativeSelect id="doc-type" value={type} onChange={(e) => setType(e.target.value)} disabled={editing}>
                {DOC_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Process" htmlFor="doc-proc">
              <NativeSelect id="doc-proc" value={process} onChange={(e) => setProcess(e.target.value)} disabled={editing}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Document number" help={editing ? "Numbers don’t change after a document is created." : "Given automatically from the process and type. Change the pattern in Settings."}>
              <Input value={number} readOnly className="bg-background" />
            </Field>
            <Field label="Owner" htmlFor="doc-owner">
              <NativeSelect id="doc-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
          </div>

          <Field
            label="ISO 9001 clauses"
            htmlFor="doc-clauses"
            error={errors.clauses}
            help={
              !editing && !clausesTouched && processClauses.length
                ? `Filled in from the ${process} process (${formatClauses(processClauses)}). Keep only the clauses this document covers, or add others.`
                : "Choose every clause this document covers. It shows under each one in Documents › By ISO clause."
            }
          >
            <ClausePicker id="doc-clauses" label="ISO 9001 clauses" value={clauses} onChange={(v) => { setClausesTouched(true); setClauses(v) }} />
          </Field>

          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex flex-col gap-1">
              <p className="text-[0.9375rem] font-semibold">Who reviews and approves it</p>
              <p className="text-[0.8125rem] text-muted-foreground">Each step can have several people. Reviewers use the link with their own SharePoint access.</p>
            </div>
            {!editing && <p className="-mt-2 text-[0.8125rem] text-muted-foreground">{routeTouched ? "Changed for this document only. The defaults stay as they are." : `${routeSource}. Change it here if this document needs other people.`}</p>}
            <Field label="Technical review" error={errors.reviewers}>
              <PeoplePicker label="Technical reviewers" value={reviewers} onChange={(v) => { setRouteTouched(true); setReviewers(v) }} />
            </Field>
            <Field label="Approval" error={errors.approvers}>
              <PeoplePicker label="Approvers" value={approvers} onChange={(v) => { setRouteTouched(true); setApprovers(v) }} />
            </Field>
            {approvers.length > 1 && (
              <Field label="When there are several approvers" htmlFor="doc-mode">
                <NativeSelect id="doc-mode" value={mode} onChange={(e) => setMode(e.target.value as ApprovalMode)}>
                  <option>Everyone must approve</option>
                  <option>Any one of them</option>
                  <option>One after another</option>
                </NativeSelect>
              </Field>
            )}
          </div>

          <Field label="Review again every" htmlFor="doc-months">
            <NativeSelect id="doc-months" value={months} onChange={(e) => setMonths(e.target.value)} className="sm:w-48">
              <option value="12">12 months</option>
              <option value="24">24 months</option>
              <option value="36">36 months</option>
            </NativeSelect>
          </Field>
            </>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {editing ? (
            <Button onClick={() => save(false)}>Save changes</Button>
          ) : kind === "revision" ? (
            <Button
              disabled={!revisionOf}
              onClick={() => {
                setRevDoc(state.documents.find((d) => d.id === revisionOf))
                onOpenChange(false)
              }}
            >
              Next
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => save(false)}>
                Save as draft
              </Button>
              <Button onClick={() => save(true)}>Submit for review</Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
    </>
  )
}
