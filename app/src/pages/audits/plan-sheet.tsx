import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Audit } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChipChoice, Field, ProcessOptions } from "@/components/app/form"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { blockedReason } from "@/lib/auditors"
import { cn } from "@/lib/utils"
import type { Auditor } from "@/data/types"

/** Pick auditors from the auditor list. Anyone not independent of the process is shown, greyed, with the reason. */
function AuditorChoice({
  label,
  options,
  value,
  onChange,
  single,
  reasonFor,
  override,
}: {
  label: string
  options: Auditor[]
  value: string[]
  onChange: (v: string[]) => void
  single?: boolean
  reasonFor: (a: Auditor) => string | undefined
  override: boolean
}) {
  if (!options.length) return <p className="text-[0.8125rem] text-muted-foreground">No one on the auditor list can do this. Add auditors in Audits › Auditors.</p>
  return (
    <ul role={single ? "radiogroup" : "group"} aria-label={label} className="rounded-md border">
      {options.map((a, i) => {
        const why = reasonFor(a)
        const disabled = !!why && !override
        const on = value.includes(a.name)
        return (
          <li key={a.id} className={cn(i > 0 && "border-t border-rule-soft")}>
            <label className={cn("flex items-center gap-3 px-3.5 py-2.5", disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-hover")}>
              <input
                type={single ? "radio" : "checkbox"}
                name={label}
                checked={on}
                disabled={disabled}
                onChange={(e) => onChange(single ? [a.name] : e.target.checked ? [...value, a.name] : value.filter((v) => v !== a.name))}
                className="size-4 accent-[var(--primary)]"
              />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">{a.external ? `Outside auditor, ${a.external.organisation}` : a.training}</span>
              </span>
              {why ? <span className={cn("text-xs font-medium", override ? "text-soon" : "text-muted-foreground")}>{why}</span> : <Badge tone={a.level === "Lead auditor" ? "progress" : a.level === "In training" ? "soon" : "draft"}>{a.level}</Badge>}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

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

export function PlanAuditSheet({ open, onOpenChange, audit, defaultProcess }: { open: boolean; onOpenChange: (v: boolean) => void; audit?: Audit; /** pre-fills the process when planning from a process page */ defaultProcess?: string }) {
  const { state, add, update, notify } = useStore()
  const navigate = useNavigate()
  const [process, setProcess] = React.useState("Operations")
  const [why, setWhy] = React.useState<(typeof WHY)[number]>("In the programme")
  const [date, setDate] = React.useState("2026-10-21")
  const [lead, setLead] = React.useState<string[]>(["Daniel Reyes"])
  const [team, setTeam] = React.useState<string[]>(["Kim Dela Cruz"])
  const [start, setStart] = React.useState("template")
  const [error, setError] = React.useState("")
  const [override, setOverride] = React.useState(false)
  const [overrideWhy, setOverrideWhy] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setProcess(audit?.process ?? defaultProcess ?? "Operations")
    setLead(audit ? [audit.lead] : ["Daniel Reyes"])
    setTeam(audit?.auditors ?? ["Kim Dela Cruz"])
    setError("")
    setOverride(false)
    setOverrideWhy("")
  }, [open, audit, defaultProcess])

  const owner = state.processes.find((p) => p.name === process)?.owner ?? ""
  // ISO 9001 9.2.2: auditors can't audit their own work. The auditor list says who is independent of what.
  const available = state.auditors.filter((a) => a.status === "Active")
  const reasonFor = (a: Auditor) => blockedReason(a, process, state.processes, state.people)
  const byName = (n: string) => state.auditors.find((a) => a.name === n)
  const clash = [...lead, ...team].filter((n) => {
    const a = byName(n)
    return a && reasonFor(a)
  })
  const blockedCount = available.filter((a) => reasonFor(a)).length

  function save() {
    if (lead.length === 0) return setError("Choose a lead auditor.")
    if (clash.length && !override) return setError(`${clash.join(", ")} can’t audit ${process}: not independent of it.`)
    if (clash.length && !overrideWhy.trim()) return setError("Say why no independent auditor is available. It’s kept with the audit for the certification body.")
    if (byName(lead[0])?.level !== "Lead auditor") return setError(`${lead[0]} isn’t a lead auditor. Choose someone at lead auditor level.`)
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
    notify([...lead, ...team, owner], { kind: "Audit", title: `Internal audit ${id} planned: ${process}`, body: `${lead[0]} leads${team.length ? `, with ${team.join(", ")}` : ""}.`, href: `/audits/${id}` })
    toast(`${id} planned`, { description: clash.length ? `Not fully independent: ${clash.join(", ")}. Reason recorded in the activity log.` : `${owner} gets the plan and dates.` })
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
          <Field label="Lead auditor" help="Only lead auditors on the auditor list can lead.">
            <AuditorChoice label="Lead auditor" single options={available.filter((a) => a.level === "Lead auditor")} value={lead} onChange={(v) => { setLead(v); setTeam(team.filter((t) => !v.includes(t))) }} reasonFor={reasonFor} override={override} />
          </Field>
          <Field label="Audit team" optional help="Auditors and auditors in training. They share the checklist and write the report together.">
            <AuditorChoice label="Audit team" options={available.filter((a) => !lead.includes(a.name))} value={team} onChange={setTeam} reasonFor={reasonFor} override={override} />
          </Field>
          {blockedCount > 0 && (
            <div className="flex flex-col gap-3 rounded-md border px-4 py-3">
              <label className="flex items-center justify-between gap-4">
                <span className="flex flex-col">
                  <span className="text-sm font-medium">Allow someone who isn’t independent</span>
                  <span className="text-[0.8125rem] text-muted-foreground">Only when no independent auditor is available, for example in a small team. Consider an outside auditor first.</span>
                </span>
                <Switch checked={override} onCheckedChange={(v) => { setOverride(v); if (!v) { const ok = (n: string) => { const a = byName(n); return !(a && reasonFor(a)) }; setLead(lead.filter(ok)); setTeam(team.filter(ok)) } }} aria-label="Allow someone who isn’t independent" />
              </label>
              {override && (
                <Field label="Why" htmlFor="pa-why" help="Kept with the audit and in the activity log, for the certification body.">
                  <Input id="pa-why" value={overrideWhy} onChange={(e) => setOverrideWhy(e.target.value)} placeholder="Only two trained auditors; Kim is on leave until December" />
                </Field>
              )}
            </div>
          )}
          <Field label="Clauses in scope" help="Filled in from the process.">
            <div className="flex flex-wrap gap-2">
              {(CLAUSES[process] ?? []).map((c) => (
                <span key={c} className="inline-flex h-7 items-center rounded-full border bg-background px-3 text-[0.8125rem]">
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
          {error && <p className="text-[0.8125rem] text-destructive">{error}</p>}
        </SheetBody>
        <SheetFooter>
          {!audit && <span className="mr-auto text-[0.8125rem] text-muted-foreground">{owner} gets the plan and dates.</span>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{audit ? "Save changes" : "Plan audit"}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
