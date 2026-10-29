import * as React from "react"
import { PaperclipIcon } from "lucide-react"
import { parseClauses } from "@/data/iso"
import { toast } from "sonner"

import { addDays, isIsoDate, todayIso } from "@/lib/periods"
import { nextId, useStore } from "@/lib/store"
import { NC_SOURCES } from "@/data/records"
import type { Complaint, Nonconformity, Severity } from "@/data/types"
import { RULES } from "@/lib/rules"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChipChoice, Field, PeopleOptions, ProcessOptions } from "@/components/app/form"
import { allows, peopleAllowed, personAllowed } from "@/lib/permissions"

const CLAUSES = [
  "7.1.5 Monitoring and measuring resources",
  "7.2 Competence",
  "7.5.3 Control of documented information",
  "8.2.3 Review of requirements",
  "8.3 Design and development",
  "8.4.1 Control of external providers",
  "8.5.1 Control of production",
  "8.5.2 Identification and traceability",
  "8.6 Release of products",
  "8.7 Control of nonconforming outputs",
  "9.1.3 Analysis and evaluation",
  "9.3 Management review",
]

/** A minor or major nonconformity result on an audit checklist question. */
export interface AuditResultNc {
  auditId: string
  checklistId: string
  questionId: string
  question: string
  clause?: string
  result: "Minor NC" | "Major NC"
  facts: string
  process: string
  owner: string
}

export function NcSheet({
  open,
  onOpenChange,
  nc,
  defaultProcess,
  auditResult,
  fromComplaint,
  onCreated,
}: {
  /** raising from a customer complaint: pre-fills it and links back */
  fromComplaint?: Complaint
  onCreated?: (id: string) => void
  auditResult?: AuditResultNc
  open: boolean
  onOpenChange: (v: boolean) => void
  nc?: Nonconformity
  /** pre-fills the process (and its owner) when raising from a process page */ defaultProcess?: string
}) {
  const { state, add, update, user, notify, takenIds, auditCommand, role } = useStore()
  const editing = !!nc
  const blank = {
    title: "",
    details: "",
    source: "Process check",
    // the first process this person can see, and its owner; never a process hidden from them
    process: state.processes[0]?.name ?? "",
    clause: CLAUSES[0],
    severity: "Minor" as Severity,
    containment: "",
    owner: state.processes[0]?.owner ?? user.name,
    verifier: "",
    due: "",
  }
  const [f, setF] = React.useState(blank)
  const [files, setFiles] = React.useState<string[]>([])
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))
  // the owner follows the process until someone picks an owner themselves
  const ownerPicked = React.useRef(false)
  const verifierPicked = React.useRef(false)
  // people who can own or check a corrective action: active staff, not outside consultants or guest auditors
  const staff = state.people.filter((p) => p.status === "Active" && personAllowed(state.people, state.roles, p.name, "work.assignable")).map((p) => p.name)
  /** default verifier: a quality manager who isn't the owner, else the person raising it if they aren't the owner */
  const defaultVerifier = (owner: string) =>
    state.people.find((p) => p.status === "Active" && personAllowed(state.people, state.roles, p.name, "docs.qmRule") && p.name !== owner)?.name ?? (user.name !== owner ? user.name : "")
  const actionDays = f.severity === "Major" ? RULES.majorAction : RULES.minorAction
  const setProcess = (name: string) =>
    setF((x) => {
      const owner = ownerPicked.current ? x.owner : (state.processes.find((p) => p.name === name)?.owner ?? x.owner)
      return { ...x, process: name, owner, verifier: verifierPicked.current && x.verifier !== owner ? x.verifier : defaultVerifier(owner) }
    })

  React.useEffect(() => {
    if (!open) return
    ownerPicked.current = !!nc
    verifierPicked.current = !!nc
    setErrors({})
    setFiles([])
    if (auditResult) {
      setF({
        ...blank,
        title: auditResult.question,
        details: auditResult.facts,
        source: `Audit ${auditResult.auditId}, question ${auditResult.questionId}`,
        process: auditResult.process,
        clause: CLAUSES.find((c) => c.split(" ")[0] === auditResult.clause) ?? auditResult.clause ?? blank.clause,
        severity: auditResult.result === "Major NC" ? "Major" : "Minor",
        owner: auditResult.owner,
        verifier: defaultVerifier(auditResult.owner),
      })
    } else if (fromComplaint) {
      setF({
        ...blank,
        title: `Customer complaint ${fromComplaint.id}: ${fromComplaint.title}`,
        details: [fromComplaint.reference, fromComplaint.details].filter(Boolean).join(". "),
        source: "Customer complaint",
        process: fromComplaint.process,
        owner: fromComplaint.owner,
        verifier: defaultVerifier(fromComplaint.owner),
      })
    } else if (nc) {
      setF({
        title: nc.title,
        details: nc.details,
        source: nc.source,
        process: nc.process,
        clause: CLAUSES.find((c) => c.startsWith(nc.clause)) ?? `${nc.clause}`,
        severity: nc.severity,
        containment: nc.containment,
        owner: nc.owner,
        verifier: nc.verifier,
        due: nc.due,
      })
    } else {
      const proc = state.processes.find((p) => p.name === defaultProcess)
      const first = proc
        ? parseClauses(proc.clauses)
            .map((c) =>
              CLAUSES.find((x) => {
                const no = x.split(" ")[0]
                return no === c || no.startsWith(c + ".")
              }),
            )
            .find(Boolean)
        : undefined
      setF(proc ? { ...blank, process: proc.name, owner: proc.owner, verifier: defaultVerifier(proc.owner), clause: first ?? blank.clause } : { ...blank, verifier: defaultVerifier(blank.owner) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nc, defaultProcess, auditResult, fromComplaint])

  function save() {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = "Give it a short title people will recognise."
    if (!f.details.trim()) e.details = "Describe what was found and the evidence."
    if (!auditResult && (!f.verifier || f.verifier === f.owner)) e.verifier = "Choose someone other than the owner to check the action was done."
    setErrors(e)
    if (Object.keys(e).length) return
    if (auditResult) {
      try {
        auditCommand({
          kind: "raiseResultNc",
          auditId: auditResult.auditId,
          checklistId: auditResult.checklistId,
          questionId: auditResult.questionId,
          id: nextId(takenIds("ncs"), `NC-${new Date().getFullYear()}-`),
          title: f.title,
          details: f.details,
          owner: f.owner,
          containment: f.containment,
          dueDate: f.due,
        })
        toast("Corrective action linked to the checklist result")
        onOpenChange(false)
      } catch (error) {
        setErrors({ details: (error as Error).message })
      }
      return
    }
    const clause = f.clause.split(" ")[0]
    if (editing) {
      update("ncs", nc!.id, {
        title: f.title,
        details: f.details,
        process: f.process,
        clause,
        severity: f.severity,
        containment: f.containment,
        owner: f.owner,
        verifier: f.verifier,
        due: f.due || nc!.due,
        ...(isIsoDate(f.due) ? { dueDate: f.due } : {}),
      })
      toast(`${nc!.id} saved`)
    } else {
      const id = nextId(takenIds("ncs"), `NC-${todayIso().slice(0, 4)}-`)
      add("ncs", {
        id,
        title: f.title.trim(),
        process: f.process,
        clause,
        source: f.source,
        severity: f.severity,
        stage: f.containment.trim() ? 1 : 0,
        owner: f.owner,
        verifier: f.verifier,
        due: f.due || `In ${actionDays} days`,
        details: f.details.trim(),
        containment: f.containment.trim(),
        rootCause: "",
        tasks: [],
        raised: "Today",
        ...(allows(role, "remarks.consultant") ? { fromConsultant: true } : {}),
        raisedDate: todayIso(),
        dueDate: isIsoDate(f.due) ? f.due : addDays(todayIso(), actionDays),
      })
      notify([f.owner], {
        kind: "Assigned",
        title: `You own ${id} ${f.title.trim()}`,
        body: `Contain it first, then find the root cause. Due ${f.due || `in ${actionDays} days`}.`,
        href: `/corrective-action/${id}`,
      })
      toast(`${id} added`, { description: `${f.owner} will be notified.` })
      onCreated?.(id)
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? `Edit ${nc!.id}` : "Add nonconformity"}</SheetTitle>
          <SheetDescription>Record what went wrong. The owner is asked to contain it within 2 working days.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field
            label="What went wrong"
            htmlFor="nc-title"
            error={errors.title}
            help="A short title people will recognise in a list."
          >
            <Input
              id="nc-title"
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              aria-invalid={!!errors.title}
              placeholder="Height gauges in use without a calibration label"
            />
          </Field>
          <Field label="Details and evidence of the problem" htmlFor="nc-details" error={errors.details}>
            <Textarea
              id="nc-details"
              value={f.details}
              onChange={(e) => set("details", e.target.value)}
              aria-invalid={!!errors.details}
            />
          </Field>
          {!editing && !auditResult && (
            <Field label="Found by">
              <ChipChoice label="Found by" options={NC_SOURCES} value={f.source} onChange={(v) => set("source", v)} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="nc-proc">
              <NativeSelect
                disabled={!!auditResult}
                id="nc-proc"
                value={f.process}
                onChange={(e) => setProcess(e.target.value)}
              >
                {auditResult && !state.processes.some((p) => p.name === auditResult.process) && (
                  <option value={auditResult.process}>{auditResult.process}</option>
                )}
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="ISO 9001 clause" htmlFor="nc-clause">
              <NativeSelect
                disabled={!!auditResult}
                id="nc-clause"
                value={f.clause}
                onChange={(e) => set("clause", e.target.value)}
              >
                {CLAUSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Severity">
            <fieldset disabled={!!auditResult}>
              <RadioGroup value={f.severity} onValueChange={(v) => set("severity", v as Severity)} className="sm:grid-cols-2">
                <RadioCard value="Minor" title="Minor" help="A single lapse that does not stop the QMS meeting its results." />
                <RadioCard
                  value="Major"
                  title="Major"
                  help="A requirement is not met at all, or a lapse could reach a customer."
                />
              </RadioGroup>
            </fieldset>
          </Field>
          <Field label="What was done straight away" htmlFor="nc-cont" optional>
            <Textarea
              id="nc-cont"
              value={f.containment}
              onChange={(e) => set("containment", e.target.value)}
              className="min-h-20"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="nc-owner" help="Suggested: owner of the process.">
              <NativeSelect id="nc-owner" value={f.owner} onChange={(e) => { ownerPicked.current = true; const owner = e.target.value; setF((x) => ({ ...x, owner, verifier: verifierPicked.current && x.verifier !== owner ? x.verifier : defaultVerifier(owner) })) }}>
                <PeopleOptions names={staff} />
              </NativeSelect>
            </Field>
            {!auditResult && (
              <Field label="Verifier" htmlFor="nc-verifier" error={errors.verifier} help="Checks the action was carried out. Suggested: a quality manager.">
                <NativeSelect id="nc-verifier" value={f.verifier} onChange={(e) => { verifierPicked.current = true; set("verifier", e.target.value) }} aria-invalid={!!errors.verifier}>
                  <option value="">Choose a person</option>
                  <PeopleOptions names={staff.filter((n) => n !== f.owner)} />
                </NativeSelect>
              </Field>
            )}
            <Field
              label="Fix by"
              htmlFor="nc-due"
              help={`${actionDays} days for a ${f.severity.toLowerCase()} nonconformity (Settings › QMS rules).`}
            >
              <Input
                id="nc-due"
                type="date"
                value={/^\d{4}-/.test(f.due) ? f.due : ""}
                onChange={(e) => set("due", e.target.value)}
              />
            </Field>
          </div>
          {!editing && !auditResult && (
            <Field
              label="Link to photos or files"
              optional
              help="Paste a SharePoint or OneDrive link. ThryveMS keeps the link, not the file. You can link more evidence after saving."
            >
              <Input
                value={files[0] ?? ""}
                onChange={(e) => setFiles(e.target.value ? [e.target.value] : [])}
                placeholder="https://yourcompany.sharepoint.com/…"
                aria-label="Link to photos or files"
              />
            </Field>
          )}
        </SheetBody>
        <SheetFooter>
          {!editing && <span className="mr-auto text-[0.8125rem] text-muted-foreground">{f.owner} will be notified.</span>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? "Save changes" : "Add nonconformity"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
