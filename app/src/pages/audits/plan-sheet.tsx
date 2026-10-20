import * as React from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useStore, startProcess, nextId } from "@/lib/store"
import type { Audit } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { ChipChoice, Field, ProcessOptions } from "@/components/app/form"
import { Badge } from "@/components/ui/badge"
import { blockedReason } from "@/lib/auditors"
import { cn } from "@/lib/utils"
import type { Auditor } from "@/data/types"
import {
  addDays,
  todayIso,
  parseDisplayDate,
  formatDate,
  nowIso,
  isIsoDate,
} from "@/lib/periods"
import { useDraftClose } from "@/lib/use-draft-close"

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
  if (!options.length)
    return (
      <p className="text-[0.8125rem] text-muted-foreground">
        No one on the auditor list can do this. Add auditors in Audits ›
        Auditors.
      </p>
    )
  return (
    <ul
      role={single ? "radiogroup" : "group"}
      aria-label={label}
      className="rounded-md border"
    >
      {options.map((a, i) => {
        const why = reasonFor(a)
        const disabled = !!why && !override
        const on = value.includes(a.name)
        return (
          <li key={a.id} className={cn(i > 0 && "border-t border-rule-soft")}>
            <label
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5",
                disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer hover:bg-hover",
              )}
            >
              <input
                type={single ? "radio" : "checkbox"}
                name={label}
                checked={on}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    single
                      ? [a.name]
                      : e.target.checked
                        ? [...value, a.name]
                        : value.filter((v) => v !== a.name),
                  )
                }
                className="size-4 accent-[var(--primary)]"
              />
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground">
                  {a.external
                    ? `Outside auditor, ${a.external.organisation}`
                    : a.training}
                </span>
              </span>
              {why ? (
                <span
                  className={cn(
                    "text-xs font-medium",
                    override ? "text-soon" : "text-muted-foreground",
                  )}
                >
                  {why}
                </span>
              ) : (
                <Badge
                  tone={
                    a.level === "Lead auditor"
                      ? "progress"
                      : a.level === "In training"
                        ? "soon"
                        : "draft"
                  }
                >
                  {a.level}
                </Badge>
              )}
            </label>
          </li>
        )
      })}
    </ul>
  )
}

const WHY = [
  "In the programme",
  "Follow-up of a finding",
  "Triggered by an event",
] as const
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

export function PlanAuditSheet({
  open,
  onOpenChange,
  audit,
  defaultProcess,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  audit?: Audit
  /** pre-fills the process when planning from a process page */ defaultProcess?: string
}) {
  const { state, add, update, notify, takenIds, user } = useStore()
  const navigate = useNavigate()
  const [process, setProcess] = React.useState(startProcess(state.processes))
  const [why, setWhy] = React.useState<(typeof WHY)[number]>("In the programme")
  const [date, setDate] = React.useState(addDays(todayIso(), 7))
  const [due, setDue] = React.useState(addDays(todayIso(), 21))
  const [scheduleReason, setScheduleReason] = React.useState("")
  const [dirty, setDirty] = React.useState(false)
  const close = useDraftClose(dirty, () => onOpenChange(false))
  const [lead, setLead] = React.useState<string[]>(["Daniel Reyes"])
  const [team, setTeam] = React.useState<string[]>(["Kim Dela Cruz"])
  const [auditee, setAuditee] = React.useState("")
  const [start, setStart] = React.useState("template")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setProcess(
      audit?.process ?? defaultProcess ?? startProcess(state.processes),
    )
    setLead(audit ? [audit.lead] : ["Daniel Reyes"])
    setTeam(audit?.auditors ?? ["Kim Dela Cruz"])
    setAuditee(
      audit?.auditee ??
        state.processes.find(
          (p) =>
            p.name ===
            (audit?.process ?? defaultProcess ?? startProcess(state.processes)),
        )?.owner ??
        "",
    )
    setDate(
      audit?.plannedDate ??
        parseDisplayDate(audit?.date ?? "") ??
        addDays(todayIso(), 7),
    )
    setDue(audit?.reportDueDate ?? addDays(todayIso(), 21))
    setWhy(
      audit?.kind === "Follow-up"
        ? "Follow-up of a finding"
        : audit?.kind === "Triggered"
          ? "Triggered by an event"
          : "In the programme",
    )
    setScheduleReason("")
    setDirty(false)
    setError("")
  }, [open, audit, defaultProcess])

  const owner = state.processes.find((p) => p.name === process)?.owner ?? ""
  // ISO 9001 9.2.2: auditors can't audit their own work. The auditor list says who is independent of what.
  const available = state.auditors.filter((a) => a.status === "Active")
  const reasonFor = (a: Auditor) =>
    blockedReason(a, process, state.processes, state.people)
  const byName = (n: string) => state.auditors.find((a) => a.name === n)
  const clash = [...lead, ...team].filter((n) => {
    const a = byName(n)
    return a && reasonFor(a)
  })

  function save() {
    if (!isIsoDate(date) || !isIsoDate(due) || due < date)
      return setError(
        "Choose valid audit and report dates, with the report due on or after the audit.",
      )
    if (lead.length === 0) return setError("Choose a lead auditor.")
    if (clash.length)
      return setError(
        `${clash.join(", ")} can’t audit ${process}: choose an independent auditor.`,
      )
    if (byName(lead[0])?.level !== "Lead auditor")
      return setError(
        `${lead[0]} isn’t a lead auditor. Choose someone at lead auditor level.`,
      )
    if (audit) {
      const previous =
        audit.plannedDate ?? parseDisplayDate(audit.date) ?? audit.date
      if (date !== previous && !scheduleReason.trim())
        return setError("Explain why the audit date is changing.")
      try {
        update("audits", audit.id, {
          process,
          lead: lead[0],
          auditors: team,
          auditee,
          date: formatDate(date),
          plannedDate: date,
          month: Number(date.slice(5, 7)) - 1,
          reportDueDate: due,
          timezone: audit.timezone ?? "Asia/Manila",
          clauses:
            process === audit.process
              ? audit.clauses
              : (CLAUSES[process] ?? []),
          scheduleHistory: [
            ...(audit.scheduleHistory ?? []),
            ...(date !== previous
              ? [
                  {
                    from: previous,
                    to: date,
                    reason: scheduleReason.trim(),
                    by: user.name,
                    at: nowIso(),
                  },
                ]
              : []),
          ],
        })
      } catch (e) {
        return setError((e as Error).message)
      }
      toast(`${audit.id} saved`)
      onOpenChange(false)
      return
    }
    const previous = state.auditChecklists
      .filter(
        (c) =>
          c.status === "Released" &&
          !c.withdrawnAt &&
          state.audits.some((a) => a.id === c.auditId && a.process === process),
      )
      .sort(
        (a, b) =>
          (b.releasedAt ?? "").localeCompare(a.releasedAt ?? "") ||
          b.version - a.version,
      )[0]
    if (start === "last" && !previous)
      return setError(
        "There is no released checklist for this process yet. Choose a template or a blank checklist.",
      )
    const id = nextId(
      takenIds("audits"),
      `IA-${new Date(date).getFullYear()}-`,
      2,
    )
    const d = new Date(date)
    try {
      add("audits", {
        id,
        process,
        auditee,
        month: isNaN(d.getTime()) ? 10 : d.getMonth(),
        date: isNaN(d.getTime())
          ? date
          : d.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
        lead: lead[0],
        auditors: team,
        state: "Planned",
        kind:
          why === "In the programme"
            ? "Planned"
            : why === "Follow-up of a finding"
              ? "Follow-up"
              : "Triggered",
        plannedDate: date,
        reportDueDate: due,
        timezone: "Asia/Manila",
        clauses: CLAUSES[process] ?? [],
        usesQuestionnaire:
          start === "template"
            ? state.templates.find(
                (t) => t.process === process && t.sections?.length,
              )?.usesQuestionnaire
            : false,
        templateSnapshot:
          start === "last" && previous
            ? {
                id: previous.id,
                version: previous.version,
                sections: structuredClone(previous.sections).map((s) => ({
                  ...s,
                  items: s.items.map((q) => ({
                    ...q,
                    evidence: [],
                    askedBy: lead[0],
                  })),
                })),
              }
            : start === "template"
              ? (() => {
                  const t = state.templates.find(
                    (t) => t.process === process && t.sections?.length,
                  )
                  return t
                    ? {
                        id: t.id,
                        version: t.version ?? 1,
                        sections: structuredClone(t.sections!).map((s) => ({
                          ...s,
                          items: s.items.map((q) => ({
                            ...q,
                            askedBy: lead[0],
                          })),
                        })),
                      }
                    : undefined
                })()
              : undefined,
      })
    } catch (e) {
      return setError((e as Error).message)
    }
    notify([...lead, ...team, owner], {
      kind: "Audit",
      title: `Internal audit ${id} planned: ${process}`,
      body: `${lead[0]} leads${team.length ? `, with ${team.join(", ")}` : ""}.`,
      href: `/audits/${id}`,
    })
    toast(`${id} planned`, { description: `${owner} gets the plan and dates.` })
    onOpenChange(false)
    navigate(`/audits/${id}`)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && close.requestClose()}>
      <SheetContent onChangeCapture={() => setDirty(true)}>
        <SheetHeader>
          <SheetTitle>
            {audit ? `Edit ${audit.id}` : "Plan an audit"}
          </SheetTitle>
          <SheetDescription>
            Plan one process and its team, then add the checklists and
            questionnaires on the audit page.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field
            label="Process"
            htmlFor="pa-proc"
            help={owner ? `Owned by ${owner}.` : undefined}
          >
            <NativeSelect
              id="pa-proc"
              value={process}
              disabled={
                !!audit &&
                state.auditChecklists.some((c) => c.auditId === audit.id)
              }
              onChange={(e) => {
                setProcess(e.target.value)
                setAuditee(
                  state.processes.find((p) => p.name === e.target.value)
                    ?.owner ?? "",
                )
              }}
            >
              <ProcessOptions />
            </NativeSelect>
          </Field>
          {!audit && (
            <>
              <Field label="Why this audit">
                <ChipChoice
                  label="Why this audit"
                  options={WHY}
                  value={why}
                  onChange={setWhy}
                />
              </Field>
            </>
          )}
          <Field label="Date" htmlFor="pa-date">
            <Input
              id="pa-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
          <Field label="Report due" htmlFor="pa-report-due">
            <Input
              id="pa-report-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </Field>
          <Field
            label="Auditee"
            htmlFor="pa-auditee"
            help="This person answers for the audited process and receives the findings paper."
          >
            <NativeSelect
              id="pa-auditee"
              value={auditee}
              onChange={(e) => setAuditee(e.target.value)}
            >
              <option value="">Choose an auditee</option>
              {state.people
                .filter(
                  (p) =>
                    p.status === "Active" &&
                    ![...lead, ...team].includes(p.name) &&
                    state.roles.find((r) => r.id === p.roleId)?.access
                      .Audits !== "None",
                )
                .map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          {audit &&
            date !==
              (audit.plannedDate ??
                parseDisplayDate(audit.date) ??
                audit.date) && (
              <Field
                label="Reason for rescheduling"
                htmlFor="pa-schedule-reason"
              >
                <Input
                  id="pa-schedule-reason"
                  value={scheduleReason}
                  onChange={(e) => setScheduleReason(e.target.value)}
                />
              </Field>
            )}
          <Field
            label="Lead auditor"
            help="Only lead auditors on the auditor list can lead."
          >
            <AuditorChoice
              label="Lead auditor"
              single
              options={available.filter((a) => a.level === "Lead auditor")}
              value={lead}
              onChange={(v) => {
                setDirty(true)
                setLead(v)
                setTeam(team.filter((t) => !v.includes(t)))
              }}
              reasonFor={reasonFor}
              override={false}
            />
          </Field>
          <Field
            label="Audit team"
            optional
            help="Auditors and auditors in training. They share the checklist and write the report together."
          >
            <AuditorChoice
              label="Audit team"
              options={available.filter((a) => !lead.includes(a.name))}
              value={team}
              onChange={(v) => {
                setDirty(true)
                setTeam(v)
              }}
              reasonFor={reasonFor}
              override={false}
            />
          </Field>
          <Field label="Clauses in scope" help="Filled in from the process.">
            <div className="flex flex-wrap gap-2">
              {(CLAUSES[process] ?? []).map((c) => (
                <span
                  key={c}
                  className="inline-flex h-7 items-center rounded-full border bg-background px-3 text-[0.8125rem]"
                >
                  {c}
                </span>
              ))}
            </div>
          </Field>
          {!audit && (
            <Field label="Start the checklist from">
              <RadioGroup
                value={start}
                onValueChange={(v) => {
                  setDirty(true)
                  setStart(v)
                }}
              >
                <RadioCard
                  value="template"
                  title={`${process} template`}
                  help="Kept in Checklist templates"
                />
                <RadioCard
                  value="last"
                  title="Most recent released checklist"
                  help="Copy its questions; responses and results stay with their original audit"
                />
                <RadioCard
                  value="blank"
                  title="A blank checklist"
                  help="Build it from scratch"
                />
              </RadioGroup>
            </Field>
          )}
          {error && (
            <p className="text-[0.8125rem] text-destructive">{error}</p>
          )}
        </SheetBody>
        <SheetFooter>
          {!audit && (
            <span className="mr-auto text-[0.8125rem] text-muted-foreground">
              {owner} gets the plan and dates.
            </span>
          )}
          {close.discarding ? (
            <>
              <span className="mr-auto text-sm">
                Discard unsaved plan changes?
              </span>
              <Button variant="outline" onClick={close.keep}>
                Keep editing
              </Button>
              <Button variant="destructive-solid" onClick={close.discard}>
                Discard changes
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={close.requestClose}>
                Cancel
              </Button>
              <Button onClick={save}>
                {audit ? "Save changes" : "Plan audit"}
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
