import * as React from "react"
import { PaperclipIcon } from "lucide-react"
import { parseClauses } from "@/data/iso"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { NC_SOURCES } from "@/data/records"
import type { Nonconformity, Severity } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChipChoice, Field, PeopleOptions, ProcessOptions } from "@/components/app/form"

const CLAUSES = ["7.1.5 Monitoring and measuring resources", "7.2 Competence", "7.5.3 Control of documented information", "8.2.3 Review of requirements", "8.3 Design and development", "8.4.1 Control of external providers", "8.5.1 Control of production", "8.5.2 Identification and traceability", "8.6 Release of products", "8.7 Control of nonconforming outputs", "9.1.3 Analysis and evaluation", "9.3 Management review"]

export function NcSheet({ open, onOpenChange, nc, defaultProcess }: { open: boolean; onOpenChange: (v: boolean) => void; nc?: Nonconformity; /** pre-fills the process (and its owner) when raising from a process page */ defaultProcess?: string }) {
  const { state, add, update, user } = useStore()
  const editing = !!nc
  const blank = {
    title: "",
    details: "",
    source: "Process check",
    process: "Infrastructure & equipment",
    clause: CLAUSES[0],
    severity: "Minor" as Severity,
    containment: "",
    owner: "Paolo Ramos",
    due: "",
  }
  const [f, setF] = React.useState(blank)
  const [files, setFiles] = React.useState<string[]>([])
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => setF((x) => ({ ...x, [k]: v }))

  React.useEffect(() => {
    if (!open) return
    setErrors({})
    setFiles([])
    if (nc) {
      setF({
        title: nc.title,
        details: nc.details,
        source: nc.source,
        process: nc.process,
        clause: CLAUSES.find((c) => c.startsWith(nc.clause)) ?? `${nc.clause}`,
        severity: nc.severity,
        containment: nc.containment,
        owner: nc.owner,
        due: nc.due,
      })
    } else {
      const proc = state.processes.find((p) => p.name === defaultProcess)
      const first = proc ? parseClauses(proc.clauses).map((c) => CLAUSES.find((x) => { const no = x.split(" ")[0]; return no === c || no.startsWith(c + ".") })).find(Boolean) : undefined
      setF(proc ? { ...blank, process: proc.name, owner: proc.owner, clause: first ?? blank.clause } : blank)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nc, defaultProcess])

  function save() {
    const e: Record<string, string> = {}
    if (!f.title.trim()) e.title = "Give it a short title people will recognise."
    if (!f.details.trim()) e.details = "Describe what was found and the evidence."
    setErrors(e)
    if (Object.keys(e).length) return
    const clause = f.clause.split(" ")[0]
    if (editing) {
      update("ncs", nc!.id, { title: f.title, details: f.details, process: f.process, clause, severity: f.severity, containment: f.containment, owner: f.owner, due: f.due || nc!.due })
      toast(`${nc!.id} saved`)
    } else {
      const id = nextId(state.ncs.map((n) => n.id), "NC-2026-")
      add("ncs", {
        id,
        title: f.title.trim(),
        process: f.process,
        clause,
        source: f.source,
        severity: f.severity,
        stage: f.containment.trim() ? 1 : 0,
        owner: f.owner,
        verifier: user.name,
        due: f.due || (f.severity === "Major" ? "In 30 days" : "In 60 days"),
        details: f.details.trim(),
        containment: f.containment.trim(),
        rootCause: "",
        tasks: [],
        raised: "Today",
      })
      toast(`${id} added`, { description: `${f.owner} will be notified.` })
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
          <Field label="What went wrong" htmlFor="nc-title" error={errors.title} help="A short title people will recognise in a list.">
            <Input id="nc-title" value={f.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} placeholder="Height gauges in use without a calibration label" />
          </Field>
          <Field label="Details and evidence of the problem" htmlFor="nc-details" error={errors.details}>
            <Textarea id="nc-details" value={f.details} onChange={(e) => set("details", e.target.value)} aria-invalid={!!errors.details} />
          </Field>
          {!editing && (
            <Field label="Found by">
              <ChipChoice label="Found by" options={NC_SOURCES} value={f.source} onChange={(v) => set("source", v)} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="nc-proc">
              <NativeSelect id="nc-proc" value={f.process} onChange={(e) => set("process", e.target.value)}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="ISO 9001 clause" htmlFor="nc-clause">
              <NativeSelect id="nc-clause" value={f.clause} onChange={(e) => set("clause", e.target.value)}>
                {CLAUSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Severity">
            <RadioGroup value={f.severity} onValueChange={(v) => set("severity", v as Severity)} className="sm:grid-cols-2">
              <RadioCard value="Minor" title="Minor" help="A single lapse that does not stop the QMS meeting its results." />
              <RadioCard value="Major" title="Major" help="A requirement is not met at all, or a lapse could reach a customer." />
            </RadioGroup>
          </Field>
          <Field label="What was done straight away" htmlFor="nc-cont" optional>
            <Textarea id="nc-cont" value={f.containment} onChange={(e) => set("containment", e.target.value)} className="min-h-20" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="nc-owner" help="Suggested: owner of the process.">
              <NativeSelect id="nc-owner" value={f.owner} onChange={(e) => set("owner", e.target.value)}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Fix by" htmlFor="nc-due" help={f.severity === "Major" ? "30 days for a major nonconformity." : "60 days for a minor nonconformity."}>
              <Input id="nc-due" type="date" value={/^\d{4}-/.test(f.due) ? f.due : ""} onChange={(e) => set("due", e.target.value)} />
            </Field>
          </div>
          {!editing && (
            <Field label="Evidence" optional>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input bg-background px-4 py-6 text-center text-sm text-muted-foreground hover:border-primary">
                <PaperclipIcon className="size-5" />
                <span>
                  Drop photos or files here, or <span className="font-medium text-primary">choose them</span>
                </span>
                <span className="text-xs">You can also paste a SharePoint or OneDrive link</span>
                <input type="file" multiple className="sr-only" onChange={(e) => setFiles(Array.from(e.target.files ?? []).map((x) => x.name))} />
              </label>
              {files.length > 0 && <p className="text-[13px]">{files.join(", ")}</p>}
            </Field>
          )}
        </SheetBody>
        <SheetFooter>
          {!editing && <span className="mr-auto text-[13px] text-muted-foreground">{f.owner} will be notified.</span>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{editing ? "Save changes" : "Add nonconformity"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
