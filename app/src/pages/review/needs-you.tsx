import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CheckIcon, SettingsIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { addDays, formatDate, isIsoDate, todayIso } from "@/lib/periods"
import type { BriefText } from "@/lib/settings"
import type { AuditPlan } from "@/data/audit-plans"
import type { Nonconformity } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Field } from "@/components/app/form"
import { EmptyLine } from "@/components/app/page"

/**
 * Management review › Needs you: what top management is asked to approve between reviews, each opened as a
 * brief in a fixed format. The wording comes from the brief settings; the figures, the facts and the checks come
 * from the records, so nothing here is written by a machine.
 */

export interface Check { id: string; text: string; source: string; ok: boolean; note: string; optional: boolean }

/** The checks for accepting an audit report and its fix plan. Each one reads fields on the linked records. */
export function auditReportChecks(plan: AuditPlan, ncs: Nonconformity[], off: string[]): Check[] {
  const deadline = addDays(plan.releasedOn ?? plan.date, 30)
  const due = (n: Nonconformity) => (isIsoDate(n.dueDate) ? n.dueDate! : undefined)
  const of = (f: (n: Nonconformity) => boolean) => `${ncs.filter(f).length} of ${ncs.length}`
  const all: Check[] = [
    { id: "cause", text: "Every finding has a cause and a fix", source: "ISO 9001 10.2.1", ok: ncs.every((n) => !!n.rootCause.trim() && n.tasks.length > 0), note: of((n) => !!n.rootCause.trim() && n.tasks.length > 0), optional: false },
    { id: "owner", text: "Every fix has an owner and a due date before the deadline", source: "Good practice", ok: ncs.every((n) => !!n.owner && n.tasks.every((t) => !!t.accountable && !!t.due) && (!due(n) || due(n)! <= deadline)), note: `${of((n) => !!n.owner && n.tasks.every((t) => !!t.accountable && !!t.due))} · deadline ${formatDate(deadline)}`, optional: true },
    { id: "recur", text: "Every fix says what will stop it happening again", source: "ISO 9001 10.2.1", ok: ncs.every((n) => n.stage >= 2), note: of((n) => n.stage >= 2), optional: false },
  ]
  return all.filter((c) => !c.optional || !off.includes(c.id))
}

export interface NeedItem { key: string; title: string; meta: string; ready: boolean; plan: AuditPlan }

/** Items waiting for top management: released audit reports not yet accepted. */
export function useNeedsYou() {
  const { state, settings } = useStore()
  const text = settings.briefs["audit-report"]
  return state.auditPlans
    .filter((p) => p.status === "Report released" && !p.acceptedOn)
    .map((p) => {
      const ncs = state.ncs.filter((n) => p.findings.some((f) => f.ncId === n.id))
      const checks = auditReportChecks(p, ncs, text?.off ?? [])
      return { key: p.id, title: `Accept the ${p.title.toLowerCase()} report and fix plan`, meta: `Released ${formatDate(p.releasedOn)} · ${ncs.length} nonconformit${ncs.length === 1 ? "y" : "ies"}`, ready: checks.every((c) => c.ok), plan: p }
    })
}

export function NeedsYou() {
  const { state, user, role } = useStore()
  const items = useNeedsYou()
  const [open, setOpen] = React.useState<string | undefined>()
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const topManagement = new Set(state.reviews.flatMap((r) => r.reviewers))
  const decides = topManagement.has(user.name) && role.id !== "consultant"
  const edits = ["quality", "admin", "consultant"].includes(role.id)
  if (!decides && !edits) return null
  const current = items.find((i) => i.key === open)
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>Needs you</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">{items.length ? `${items.length} thing${items.length === 1 ? "" : "s"} for top management to approve between reviews` : "Nothing waiting for top management"}</span>
        </div>
        {edits && (
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon /> Brief settings
          </Button>
        )}
      </CardHeader>
      {items.length === 0 ? (
        <EmptyLine title="All caught up" body="Audit reports to accept, and other approvals, show here with a short guide to what to check." />
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.key} className="border-t">
              <button type="button" onClick={() => setOpen(i.key)} className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-hover">
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{i.title}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{i.meta}</span>
                </span>
                <Badge tone={i.ready ? "done" : "soon"}>{i.ready ? "Ready" : "Not ready yet"}</Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
      {current && <BriefSheet item={current} decides={decides} onClose={() => setOpen(undefined)} />}
      <BriefSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Card>
  )
}

const CHOICES = ["Approve", "Approve with a condition", "Need more information", "Send back"] as const

function BriefSheet({ item, decides, onClose }: { item: NeedItem; decides: boolean; onClose: () => void }) {
  const { state, settings, update, notify, user } = useStore()
  const plan = item.plan
  const text = settings.briefs["audit-report"]
  const ncs = state.ncs.filter((n) => plan.findings.some((f) => f.ncId === n.id))
  const checks = auditReportChecks(plan, ncs, text?.off ?? [])
  const failed = checks.filter((c) => !c.ok)
  const [choice, setChoice] = React.useState<(typeof CHOICES)[number] | "">("")
  const [words, setWords] = React.useState("")
  const [err, setErr] = React.useState("")

  function decide() {
    if (!choice) return setErr("Choose a decision.")
    if (choice === "Approve" && failed.length) return setErr("Approve opens once every check passes. Choose another option, or ask the owners to finish.")
    if (choice !== "Approve" && !words.trim()) return setErr("Say what’s needed, in your own words.")
    const decision = { choice, words: words.trim(), by: user.name, on: todayIso() }
    if (choice === "Approve" || choice === "Approve with a condition") update("auditPlans", plan.id, { acceptedOn: todayIso(), acceptedBy: user.name, decision })
    else update("auditPlans", plan.id, { decision })
    const lead = plan.releasedBy ? [plan.releasedBy] : []
    notify(lead, { kind: "Waiting on you", title: `${choice}: ${plan.title}`, body: words.trim() || "Accepted.", href: `/audits/plans/${plan.id}?tab=report` })
    toast(choice === "Approve" || choice === "Approve with a condition" ? "Accepted" : "Sent back with your note", { description: `${plan.releasedBy ?? "The audit lead"} is told.` })
    onClose()
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-[560px]">
        <SheetHeader>
          <Badge tone={failed.length ? "soon" : "done"} className="self-start">{failed.length ? `Not ready yet · ${failed.length} thing${failed.length === 1 ? "" : "s"} missing` : "Ready"}</Badge>
          <SheetTitle>{item.title}</SheetTitle>
          <SheetDescription>
            The {plan.auditedBy === "Consultant" ? "consultant" : plan.auditedBy} found {ncs.length} problem{ncs.length === 1 ? "" : "s"} to fix. Your team has written how they will fix them. You are asked to accept the report and the plan.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-3 sm:grid-cols-2">
            <section className="flex flex-col gap-1 rounded-md bg-background p-3">
              <h3 className="text-[0.8125rem] font-semibold">Why this matters</h3>
              <p className="text-[0.8125rem] text-muted-foreground">{text?.why}</p>
            </section>
            <section className="flex flex-col gap-1 rounded-md bg-background p-3">
              <h3 className="text-[0.8125rem] font-semibold">What good looks like</h3>
              <p className="text-[0.8125rem] text-muted-foreground">{text?.good}</p>
            </section>
          </div>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Where it stands</h3>
            <ul className="flex flex-col gap-2">
              {ncs.map((n) => (
                <li key={n.id} className="flex flex-col gap-0.5 rounded-md border px-3 py-2 text-[0.8125rem]">
                  <Link to={`/corrective-action/${n.id}`} className="font-medium text-primary hover:underline">{n.id} {n.title}</Link>
                  <span className="text-muted-foreground">{n.tasks.length ? `Fix: ${n.tasks.map((t) => t.name).join("; ")}` : "No fix yet"}</span>
                  <span className="text-muted-foreground">{n.owner} · {n.dueDate ? `by ${formatDate(n.dueDate)}` : n.due}</span>
                </li>
              ))}
              {ncs.length === 0 && <li className="text-[0.8125rem] text-muted-foreground">No nonconformities. Only opportunities were found.</li>}
            </ul>
            <Link to={`/audits/plans/${plan.id}?tab=findings`} className="text-[0.8125rem] font-medium text-primary">All findings</Link>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Already checked for you</h3>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <span className={cn("mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full", c.ok ? "bg-done-tint text-done" : "bg-overdue-tint text-overdue")} aria-hidden="true">
                    {c.ok ? <CheckIcon className="size-3" /> : <XIcon className="size-3" />}
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span>{c.text}<span className="sr-only">{c.ok ? ", passes" : ", not yet"}</span></span>
                    <span className="text-xs text-muted-foreground">{c.note} · {c.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Still for you to judge</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {(text?.questions ?? []).map((q) => <li key={q}>{q}</li>)}
            </ul>
          </section>
          {decides && (
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Your decision</h3>
              <div role="radiogroup" aria-label="Your decision" className="flex flex-wrap gap-2">
                {CHOICES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={choice === c} disabled={c === "Approve" && failed.length > 0} onClick={() => { setChoice(c); setErr("") }} className={cn("rounded-md border bg-card px-3 py-2 text-[0.8125rem] font-medium enabled:cursor-pointer enabled:hover:bg-hover disabled:opacity-50", choice === c && "border-primary ring-1 ring-primary")}>
                    {c}
                  </button>
                ))}
              </div>
              <Field label="In your words" htmlFor="br-w" error={err} help={failed.length ? "Approve opens once every check passes." : undefined}>
                <Input id="br-w" value={words} onChange={(e) => setWords(e.target.value)} placeholder="For example: Accept once the calibration is booked." />
              </Field>
            </section>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {decides && <Button onClick={decide}>Record decision</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function BriefSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, saveSettings } = useStore()
  const cur = settings.briefs["audit-report"]
  const [f, setF] = React.useState<BriefText>(cur)
  React.useEffect(() => {
    if (open) setF(settings.briefs["audit-report"])
  }, [open, settings.briefs])
  const optional = [{ id: "owner", text: "Every fix has an owner and a due date before the deadline", source: "Good practice" }]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Brief settings · Audit report and fix plan</DialogTitle>
          <DialogDescription>The wording top management reads, and which good-practice checks apply. Checks from ISO 9001 are always on. Changes apply to items from now on.</DialogDescription>
        </DialogHeader>
        <Field label="Why this matters" htmlFor="bs-why"><Textarea id="bs-why" value={f.why} onChange={(e) => setF({ ...f, why: e.target.value })} className="min-h-16" /></Field>
        <Field label="What good looks like" htmlFor="bs-good"><Textarea id="bs-good" value={f.good} onChange={(e) => setF({ ...f, good: e.target.value })} className="min-h-16" /></Field>
        <Field label="Questions to judge" htmlFor="bs-q" help="One per line."><Textarea id="bs-q" value={f.questions.join("\n")} onChange={(e) => setF({ ...f, questions: e.target.value.split("\n") })} className="min-h-20" /></Field>
        {optional.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
            <span className="flex flex-col"><label htmlFor={`bs-${c.id}`} className="text-sm font-medium">{c.text}</label><span className="text-xs text-muted-foreground">{c.source}</span></span>
            <Switch id={`bs-${c.id}`} checked={!f.off.includes(c.id)} onCheckedChange={(v) => setF({ ...f, off: v ? f.off.filter((x) => x !== c.id) : [...f.off, c.id] })} />
          </div>
        ))}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { saveSettings("briefs", { ...settings.briefs, "audit-report": { ...f, questions: f.questions.map((q) => q.trim()).filter(Boolean) } }); toast("Brief settings saved"); onOpenChange(false) }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
