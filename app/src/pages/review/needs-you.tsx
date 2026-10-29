import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CheckIcon, SettingsIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { addDays, formatDate, isIsoDate, todayIso } from "@/lib/periods"
import type { BriefText } from "@/lib/settings"
import type { AuditPlan } from "@/data/audit-plans"
import { NC_STAGES, type Nonconformity, type TopDecision } from "@/data/types"
import { DOC_TYPE_CODES } from "@/lib/settings"
import { nextId } from "@/lib/ids"
import { KeyFacts } from "@/components/app/page"
import { NativeSelect } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, Textarea } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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

export type NeedKind = "Audit report" | "Policy" | "Document" | "High risk" | "Major nonconformity" | "Resource request"

export interface NeedItem {
  key: string
  kind: NeedKind
  title: string
  meta: string
  ready: boolean
  missing: string[]
  /** audit report items only */
  plan?: AuditPlan
  /** other items: the record, why it comes to top management, its facts and what to judge */
  href?: string
  recordId?: string
  owner?: string
  why?: string
  facts?: { k: string; v: string }[]
  questions?: string[]
}

const RESOLVED: TopDecision["choice"][] = ["Approve", "Approve with a condition"]

/**
 * Items waiting for top management: released audit reports not yet accepted, plus the approvals the workspace
 * settings send to top management (policy and chosen document types, high risks, open major nonconformities,
 * resource requests). Each item's key carries its version, so a new revision or a changed score comes back.
 * Ordinary revisions, minor nonconformities and normal risks stay with their owners and show in the review topics.
 */
export function useNeedsYou(): NeedItem[] {
  const { state, settings } = useStore()
  const text = settings.briefs["audit-report"]
  const rules = settings.topApproval
  const decided = (key: string) => (state.topDecisions ?? []).some((d) => d.key === key)
  const audits: NeedItem[] = state.auditPlans
    .filter((p) => p.status === "Report released" && !p.acceptedOn)
    .map((p) => {
      const ncs = state.ncs.filter((n) => p.findings.some((f) => f.ncId === n.id))
      const checks = auditReportChecks(p, ncs, text?.off ?? [])
      return { key: p.id, kind: "Audit report" as const, title: `Approve the audit report and fix plan: ${p.title}`, meta: `Released ${formatDate(p.releasedOn)} · ${ncs.length} nonconformit${ncs.length === 1 ? "y" : "ies"}`, ready: checks.every((c) => c.ok), missing: checks.filter((c) => !c.ok).map((c) => c.text.charAt(0).toLowerCase() + c.text.slice(1)), plan: p }
    })
  const out: NeedItem[] = [...audits]
  if (rules.docTypes.includes("Policy")) {
    for (const p of state.policies.filter((x) => x.state !== "Current")) {
      const key = `policy:${p.id}:${p.rev}:${p.state}`
      if (decided(key)) continue
      out.push({
        key, kind: "Policy", recordId: p.id, href: "/qms/policies", owner: p.approvedBy || undefined,
        title: p.state === "Draft" ? `Approve a new policy: ${p.title}` : `Confirm the policy still fits: ${p.title}`,
        meta: p.state === "Draft" ? `${p.id} · draft, revision ${p.rev}` : `${p.id} · review due ${p.reviewDue ?? "now"} · approved ${p.approvedOn} by ${p.approvedBy}`,
        ready: true, missing: [],
        why: "Top management sets the quality policy and the policies under it, and makes sure they fit the company’s direction (ISO 9001 5.2).",
        facts: [{ k: "Policy", v: `${p.id} ${p.title}` }, { k: "Revision", v: p.rev }, { k: "What it says", v: p.summary }, { k: "Acknowledged", v: `${p.acknowledged} of ${p.appliesTo} people` }],
        questions: ["Does it still match where the company is going?", "Can people act on it, or is it only words?", "Does anything here need money or people to keep?"],
      })
    }
  }
  const docTypes = rules.docTypes.filter((t) => t !== "Policy")
  for (const d of state.documents.filter((x) => docTypes.includes(x.type) && (x.stage === "Approval" || x.stage === "Ready to publish"))) {
    const key = `doc:${d.id}:${d.rev}`
    if (decided(key)) continue
    out.push({
      key, kind: "Document", recordId: d.id, href: `/documents/${d.id}`, owner: d.owner,
      title: `Approve a ${d.type.toLowerCase()} revision: ${d.title}`,
      meta: `${d.id} · revision ${d.rev} · ${d.stage.toLowerCase()} · owner ${d.owner}`,
      ready: true, missing: [],
      why: `Your settings send new ${d.type.toLowerCase()} revisions to top management. Other documents are approved by their owners (ISO 9001 7.5.2).`,
      facts: [{ k: "Document", v: `${d.id} ${d.title}` }, { k: "Revision", v: d.rev }, { k: "Why it changed", v: d.changeNote || "Not given" }, { k: "Owner", v: d.owner }],
      questions: ["Is the change clear and is the reason good?", "Does it change how people work, and are they told?", "Does it still fit the policy and the scope?"],
    })
  }
  if (rules.riskScore > 0) {
    for (const r of state.risks.filter((x) => x.kind === "Risk" && x.likelihood * x.impact >= rules.riskScore)) {
      const score = r.likelihood * r.impact
      const key = `risk:${r.id}:${score}:${r.reviewedDate ?? r.review}`
      if (decided(key)) continue
      out.push({
        key, kind: "High risk", recordId: r.id, href: `/risks/${r.id}`, owner: r.owner,
        title: `Accept or fund the treatment of a high risk: ${r.title}`,
        meta: `${r.id} · score ${score} (likelihood ${r.likelihood} × impact ${r.impact}) · owner ${r.owner}`,
        ready: true, missing: [],
        why: `Risks scoring ${rules.riskScore} or more need top management to accept the plan, pay for it, or accept the risk as it is (ISO 9001 6.1).`,
        facts: [{ k: "Risk", v: `${r.id} ${r.title}` }, { k: "Process", v: r.process }, { k: "Score", v: `${score}` }, { k: "Treatment", v: r.treatment || "None yet" }, { k: "Next review", v: r.review }],
        questions: ["Is the treatment enough to bring the risk down?", "Does it need money, people or a decision from you?", "If nothing is done, can the company live with it?"],
      })
    }
  }
  if (rules.majorNc) {
    const closed = NC_STAGES.indexOf("Closed")
    for (const n of state.ncs.filter((x) => x.severity === "Major" && x.stage < closed)) {
      const key = `nc:${n.id}`
      if (decided(key) || audits.some((a) => a.plan?.findings.some((f) => f.ncId === n.id))) continue
      out.push({
        key, kind: "Major nonconformity", recordId: n.id, href: `/corrective-action/${n.id}`, owner: n.owner,
        title: `Confirm the fix for a major nonconformity: ${n.title}`,
        meta: `${n.id} · ${NC_STAGES[n.stage].toLowerCase()} · owner ${n.owner} · due ${n.due}`,
        ready: !!n.rootCause.trim() && n.tasks.length > 0, missing: !n.rootCause.trim() || !n.tasks.length ? ["a cause and a fix from the owner"] : [],
        why: "A major nonconformity can stop certification. Top management confirms the fix is enough and has what it needs (ISO 9001 10.2).",
        facts: [{ k: "Nonconformity", v: `${n.id} ${n.title}` }, { k: "Process", v: n.process }, { k: "Cause", v: n.rootCause || "Not found yet" }, { k: "Fix", v: n.tasks.map((t) => t.name).join("; ") || "None yet" }, { k: "Due", v: n.due }],
        questions: ["Does the fix stop it happening again?", "Do the people named have the time and budget?", "Is the due date realistic?"],
      })
    }
  }
  if (rules.resources) {
    for (const a of state.reviewActions.filter((x) => x.type === "Resource need" && x.state === "Open")) {
      const key = `resource:${a.id}`
      if (decided(key)) continue
      out.push({
        key, kind: "Resource request", recordId: a.id, href: `/management-review/actions/${a.id}`, owner: a.owner,
        title: `Resource request: ${a.text}`,
        meta: `${a.id} from ${a.reviewId} · owner ${a.owner} · due ${a.due}`,
        ready: true, missing: [],
        why: "Budget, people and equipment are top management’s to give (ISO 9001 7.1).",
        facts: [{ k: "Request", v: a.text }, { k: "From review", v: a.reviewId }, { k: "Owner", v: a.owner }, { k: "Due", v: a.due }],
        questions: ["Is it needed to keep the QMS working, or nice to have?", "Is there a cheaper way?", "Who pays, and by when?"],
      })
    }
  }
  return out.filter((i) => !(i.kind !== "Audit report" && (state.topDecisions ?? []).some((d) => d.key === i.key && RESOLVED.includes(d.choice))))
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
          <span className="text-[0.8125rem] text-muted-foreground">{items.length ? `${items.length} thing${items.length === 1 ? "" : "s"} for top management to approve between reviews. Each opens a short guide with the checks already done` : "Nothing waiting for top management"}</span>
        </div>
        {edits && (
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)}>
            <SettingsIcon /> Brief settings
          </Button>
        )}
      </CardHeader>
      {items.length === 0 ? (
        <EmptyLine title="All caught up" body="Audit reports, policy and manual revisions, high risks, major nonconformities and resource requests show here with a short guide to what to check." />
      ) : (
        <ul>
          {items.map((i) => (
            <li key={i.key} className="border-t">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{i.kind}</span>
                    <span className="text-sm font-medium">{i.title}</span>
                    <Badge tone={i.ready ? "done" : "soon"}>{i.ready ? "Ready for you" : "Waiting on the team"}</Badge>
                  </span>
                  <span className="text-[0.8125rem] text-muted-foreground">{i.meta}</span>
                  {!i.ready && <span className="text-[0.8125rem]">Still missing: {i.missing.join("; ")}.</span>}
                </span>
                <Button size="sm" variant={i.ready ? "default" : "outline"} onClick={() => setOpen(i.key)}>{!i.ready ? "See what’s missing" : i.kind === "Audit report" ? "Review and approve" : "Review and decide"}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {current && (current.plan ? <BriefSheet item={current} decides={decides} onClose={() => setOpen(undefined)} /> : <ApprovalBrief item={current} decides={decides} onClose={() => setOpen(undefined)} />)}
      <BriefSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Card>
  )
}

const CHOICES = ["Approve", "Approve with a condition", "Need more information", "Send back"] as const

export function BriefSheet({ item, decides, onClose }: { item: NeedItem; decides: boolean; onClose: () => void }) {
  const { state, settings, update, notify, user } = useStore()
  const plan = item.plan!
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <Badge tone={failed.length ? "soon" : "done"} className="self-start">{failed.length ? `Not ready yet · ${failed.length} thing${failed.length === 1 ? "" : "s"} missing` : "Ready"}</Badge>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>
            The {plan.auditedBy === "Consultant" ? "consultant" : plan.auditedBy} found {ncs.length} problem{ncs.length === 1 ? "" : "s"} to fix. Your team has written how they will fix them. You are asked to accept the report and the plan.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {decides && <Button onClick={decide}>Record decision</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The brief for any approval other than an audit report: why it comes to top management, the facts, what to judge, the decision. */
function ApprovalBrief({ item, decides, onClose }: { item: NeedItem; decides: boolean; onClose: () => void }) {
  const { state, add, notify, user } = useStore()
  const [choice, setChoice] = React.useState<(typeof CHOICES)[number] | "">("")
  const [words, setWords] = React.useState("")
  const [err, setErr] = React.useState("")
  function decide() {
    if (!choice) return setErr("Choose a decision.")
    if (choice === "Approve" && !item.ready) return setErr("Approve opens once the owner has finished. Choose another option.")
    if (choice !== "Approve" && !words.trim()) return setErr("Say what’s needed, in your own words.")
    const id = nextId((state.topDecisions ?? []).map((d) => d.id), "TD-")
    add("topDecisions", { id, key: item.key, choice, words: words.trim(), by: user.name, on: todayIso() })
    if (item.owner && item.owner !== user.name) notify([item.owner], { kind: "Waiting on you", title: `${choice}: ${item.title}`, body: words.trim() || "Approved.", href: item.href ?? "/management-review" })
    toast(RESOLVED.includes(choice) ? "Decision recorded" : "Sent back with your note", { description: item.owner ? `${item.owner} is told.` : undefined })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[720px]">
        <DialogHeader>
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{item.kind}</span>
            <Badge tone={item.ready ? "done" : "soon"}>{item.ready ? "Ready for you" : "Waiting on the team"}</Badge>
          </span>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>{item.why}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Where it stands</h3>
            <KeyFacts facts={(item.facts ?? []).map((f) => ({ k: f.k, v: f.v }))} />
            {item.href && <Link to={item.href} className="text-[0.8125rem] font-medium text-primary">Open {item.recordId}</Link>}
            {!item.ready && <p className="text-[0.8125rem]">Still missing: {item.missing.join("; ")}.</p>}
          </section>
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Still for you to judge</h3>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">{(item.questions ?? []).map((q) => <li key={q}>{q}</li>)}</ul>
          </section>
          {decides && (
            <section className="flex flex-col gap-3 border-t pt-4">
              <h3 className="text-sm font-semibold">Your decision</h3>
              <div role="radiogroup" aria-label="Your decision" className="flex flex-wrap gap-2">
                {CHOICES.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={choice === c} disabled={c === "Approve" && !item.ready} onClick={() => { setChoice(c); setErr("") }} className={cn("rounded-md border bg-card px-3 py-2 text-[0.8125rem] font-medium enabled:cursor-pointer enabled:hover:bg-hover disabled:opacity-50", choice === c && "border-primary ring-1 ring-primary")}>
                    {c}
                  </button>
                ))}
              </div>
              <Field label="In your words" htmlFor="ab-w" error={err}>
                <Input id="ab-w" value={words} onChange={(e) => setWords(e.target.value)} placeholder="For example: Approved, start with the Calamba plant." />
              </Field>
            </section>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
          {decides && <Button onClick={decide}>Record decision</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BriefSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { settings, saveSettings } = useStore()
  const cur = settings.briefs["audit-report"]
  const [f, setF] = React.useState<BriefText>(cur)
  React.useEffect(() => {
    if (open) setF(settings.briefs["audit-report"])
  }, [open, settings.briefs])
  const [topicQs, setTopicQs] = React.useState("")
  React.useEffect(() => {
    if (open) setTopicQs((settings.briefs["review-topic"]?.questions ?? []).join("\n"))
  }, [open, settings.briefs])
  const [rules, setRules] = React.useState(settings.topApproval)
  React.useEffect(() => {
    if (open) setRules(settings.topApproval)
  }, [open, settings.topApproval])
  const optional = [{ id: "owner", text: "Every fix has an owner and a due date before the deadline", source: "Good practice" }]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Approvals and brief settings</DialogTitle>
          <DialogDescription>The wording top management reads on audit report briefs and review topic briefs, and which good-practice checks apply. Checks from ISO 9001 are always on. Changes apply to items from now on.</DialogDescription>
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
        <section className="flex flex-col gap-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold">What comes to top management for approval</h3>
          <p className="text-xs text-muted-foreground">Released audit reports always come. Everything else stays with its owner and shows in the review topics.</p>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-[0.8125rem] font-medium">New revisions of these document types</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {DOC_TYPE_CODES.map(([t]) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={rules.docTypes.includes(t)} onCheckedChange={(v) => setRules({ ...rules, docTypes: v ? [...rules.docTypes, t] : rules.docTypes.filter((x) => x !== t) })} aria-label={`${t} revisions`} />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Risks at or above this score" htmlFor="bs-risk" help="Likelihood × impact. Top management accepts or funds the treatment.">
            <NativeSelect id="bs-risk" value={String(rules.riskScore)} onChange={(e) => setRules({ ...rules, riskScore: Number(e.target.value) })}>
              {[[0, "Don’t send risks"], [10, "10 or more"], [12, "12 or more"], [15, "15 or more"], [20, "20 or more"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </NativeSelect>
          </Field>
          {([["majorNc", "Open major nonconformities", "Top management confirms the fix"], ["resources", "Resource requests from reviews", "Budget, people and equipment"]] as const).map(([k, l, h]) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <span className="flex flex-col"><label htmlFor={`bs-${k}`} className="text-sm font-medium">{l}</label><span className="text-xs text-muted-foreground">{h}</span></span>
              <Switch id={`bs-${k}`} checked={rules[k]} onCheckedChange={(v) => setRules({ ...rules, [k]: v })} />
            </div>
          ))}
        </section>
        <Field label="Review topics · questions to judge" htmlFor="bs-tq" help="Shown on every topic brief of a management review. One per line."><Textarea id="bs-tq" value={topicQs} onChange={(e) => setTopicQs(e.target.value)} className="min-h-20" /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { saveSettings("topApproval", rules); saveSettings("briefs", { ...settings.briefs, "review-topic": { why: "", good: "", off: [], questions: topicQs.split("\n").map((q) => q.trim()).filter(Boolean) }, "audit-report": { ...f, questions: f.questions.map((q) => q.trim()).filter(Boolean) } }); toast("Brief settings saved"); onOpenChange(false) }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
