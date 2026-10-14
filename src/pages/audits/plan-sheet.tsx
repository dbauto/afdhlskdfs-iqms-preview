import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Audit } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChipChoice, Field, PeoplePicker, ProcessOptions } from "@/components/app/form"

const WHY = ["In the programme", "Follow-up of a finding", "Triggered by an event"] as const
const CLAUSES: Record<string, string[]> = {
  Operations: ["8.1", "8.5.1", "8.5.2", "8.5.4", "7.5.3"],
  "Purchasing & suppliers": ["8.4.1", "8.4.2", "8.4.3"],
  "Inspection & release": ["8.6", "8.7", "7.1.5"],
  "Design & development": ["8.3"],
  "Sales & customer": ["8.2", "9.1.2"],
  "People & competence": ["7.1.2", "7.2", "7.3"],
  "Infrastructure & equipment": ["7.1.3", "7.1.4", "7.1.5"],
  "Leadership & planning": ["4", "5", "6.2", "9.3"],
  "Monitoring & improvement": ["9.1", "9.2", "10"],
}

export function PlanAuditSheet({ open, onOpenChange, audit }: { open: boolean; onOpenChange: (v: boolean) => void; audit?: Audit }) {
  const { state, add, update } = useStore()
  const navigate = useNavigate()
  const [process, setProcess] = React.useState("Operations")
  const [why, setWhy] = React.useState<(typeof WHY)[number]>("In the programme")
  const [date, setDate] = React.useState("2026-10-21")
  const [lead, setLead] = React.useState<string[]>(["Daniel Reyes"])
  const [team, setTeam] = React.useState<string[]>(["Kim Dela Cruz"])
  const [start, setStart] = React.useState("template")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setProcess(audit?.process ?? "Operations")
    setLead(audit ? [audit.lead] : ["Daniel Reyes"])
    setTeam(audit?.auditors ?? ["Kim Dela Cruz"])
    setError("")
  }, [open, audit])

  const owner = state.processes.find((p) => p.name === process)?.owner ?? ""
  // ISO 9001 9.2.2: auditors can't audit their own work
  const notAllowed = [owner, ...(process === "Operations" ? ["Ben Castillo"] : [])]
  const clash = [...lead, ...team].filter((p) => notAllowed.includes(p))

  function save() {
    if (lead.length === 0) return setError("Choose a lead auditor.")
    if (clash.length) return setError(`${clash.join(", ")} can’t audit their own process.`)
    if (audit) {
      update("audits", audit.id, { process, lead: lead[0], auditors: team })
      toast(`${audit.id} saved`)
      onOpenChange(false)
      return
    }
    const n = Math.max(...state.audits.map((a) => parseInt(a.id.slice(-2), 10))) + 1
    const id = `IA-2026-${String(n).padStart(2, "0")}`
    const d = new Date(date)
    add("audits", {
      id,
      process,
      month: isNaN(d.getTime()) ? 10 : d.getMonth(),
      date: isNaN(d.getTime()) ? date : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
      lead: lead[0],
      auditors: team,
      state: "Planned",
      kind: why === "In the programme" ? "Planned" : why === "Follow-up of a finding" ? "Follow-up" : "Triggered",
      clauses: CLAUSES[process] ?? [],
    })
    toast(`${id} planned`, { description: `${owner} gets the plan and dates.` })
    onOpenChange(false)
    navigate(`/audits/${id}/checklist`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{audit ? `Edit ${audit.id}` : "Plan an audit"}</SheetTitle>
          <SheetDescription>One audit covers one process. The checklist opens next.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="Process" htmlFor="pa-proc" help={owner ? `Owned by ${owner}.` : undefined}>
            <NativeSelect id="pa-proc" value={process} onChange={(e) => setProcess(e.target.value)}>
              <ProcessOptions />
            </NativeSelect>
          </Field>
          {!audit && (
            <>
              <Field label="Why this audit">
                <ChipChoice label="Why this audit" options={WHY} value={why} onChange={setWhy} />
              </Field>
              <Field label="Date" htmlFor="pa-date">
                <Input id="pa-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-56" />
              </Field>
            </>
          )}
          <Field label="Lead auditor">
            <PeoplePicker label="Lead auditor" single value={lead} onChange={setLead} exclude={notAllowed} />
          </Field>
          <Field label="Auditors" optional help="Several auditors can share the checklist and write the report together.">
            <PeoplePicker label="Auditors" value={team} onChange={setTeam} exclude={[...notAllowed, ...lead]} />
          </Field>
          <Alert tone="info">
            {notAllowed.join(" and ")} {notAllowed.length > 1 ? "aren’t" : "isn’t"} offered: auditors can’t audit their own work (ISO 9001 clause 9.2.2).
          </Alert>
          <Field label="Clauses in scope" help="Filled in from the process.">
            <div className="flex flex-wrap gap-2">
              {(CLAUSES[process] ?? []).map((c) => (
                <span key={c} className="inline-flex h-7 items-center rounded-full border bg-background px-3 text-[13px]">
                  {c}
                </span>
              ))}
            </div>
          </Field>
          {!audit && (
            <Field label="Start the checklist from">
              <RadioGroup value={start} onValueChange={setStart}>
                <RadioCard value="template" title={`${process} template`} help="Kept in Checklist templates" />
                <RadioCard value="last" title="Last year’s checklist" help="With last year’s findings noted" />
                <RadioCard value="blank" title="A blank checklist" help="Build it from scratch" />
              </RadioGroup>
            </Field>
          )}
          {error && <p className="text-[13px] text-destructive">{error}</p>}
        </SheetBody>
        <SheetFooter>
          {!audit && <span className="mr-auto text-[13px] text-muted-foreground">{owner} gets the plan and dates.</span>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{audit ? "Save changes" : "Plan audit"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
