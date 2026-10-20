import * as React from "react"
import { toast } from "sonner"

import type { Person } from "@/data/types"
import { useStore, type Collection, type State } from "@/lib/store"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"

/** One piece of open work that names a person, and how to hand it to someone else. */
interface WorkItem {
  key: string
  kind: string
  ref: string
  title: string
  /** collection and record to patch, and the patch for a new name */
  collection: Collection
  id: string
  patch: (to: string) => object
}

const swap = (list: string[], from: string, to: string) => [...new Set(list.map((n) => (n === from ? to : n)))]

/** Everything still open that would be left with nobody if this person stopped working here. Past sign-offs and history stay theirs. */
export function openWorkOf(state: State, name: string): WorkItem[] {
  const out: WorkItem[] = []
  for (const p of state.processes) if (p.owner === name) out.push({ key: `process:${p.id}`, kind: "Process owner", ref: "Process", title: p.name, collection: "processes", id: p.id, patch: (to) => ({ owner: to }) })
  for (const d of state.documents) {
    if (d.withdrawn || d.stage === "Archived") continue
    if (d.owner === name) out.push({ key: `doc:${d.id}`, kind: "Document owner", ref: d.id, title: d.title, collection: "documents", id: d.id, patch: (to) => ({ owner: to }) })
    const reviewing = d.stage === "Technical review" && d.reviewers.includes(name) && !d.reviewedBy?.includes(name)
    const approving = d.stage === "Approval" && d.approvers.includes(name) && !d.approvedBy?.includes(name)
    if (reviewing) out.push({ key: `doc-review:${d.id}`, kind: "Document reviewer", ref: d.id, title: d.title, collection: "documents", id: d.id, patch: (to) => ({ reviewers: swap(d.reviewers, name, to) }) })
    if (approving) out.push({ key: `doc-approve:${d.id}`, kind: "Document approver", ref: d.id, title: d.title, collection: "documents", id: d.id, patch: (to) => ({ approvers: swap(d.approvers, name, to) }) })
  }
  for (const n of state.ncs) {
    if (n.stage >= 6) continue
    if (n.owner === name) out.push({ key: `nc:${n.id}`, kind: "Nonconformity owner", ref: n.id, title: n.title, collection: "ncs", id: n.id, patch: (to) => ({ owner: to }) })
    if (n.verifier === name) out.push({ key: `nc-verify:${n.id}`, kind: "Nonconformity verifier", ref: n.id, title: n.title, collection: "ncs", id: n.id, patch: (to) => ({ verifier: to }) })
  }
  for (const i of state.improvements) if (i.owner === name && i.state !== "Done" && i.state !== "Not going ahead") out.push({ key: `imp:${i.id}`, kind: "Improvement owner", ref: i.id, title: i.title, collection: "improvements", id: i.id, patch: (to) => ({ owner: to }) })
  for (const c of state.complaints) if (c.owner === name && c.state !== "Closed") out.push({ key: `cc:${c.id}`, kind: "Complaint owner", ref: c.id, title: c.title, collection: "complaints", id: c.id, patch: (to) => ({ owner: to }) })
  for (const r of state.risks) if (r.owner === name && r.review !== "Archived") out.push({ key: `risk:${r.id}`, kind: r.kind === "Opportunity" ? "Opportunity owner" : "Risk owner", ref: r.id, title: r.title, collection: "risks", id: r.id, patch: (to) => ({ owner: to }) })
  for (const o of state.objectives) if (o.owner === name) out.push({ key: `obj:${o.id}`, kind: "Objective owner", ref: o.id, title: o.name, collection: "objectives", id: o.id, patch: (to) => ({ owner: to }) })
  for (const a of state.reviewActions) if (a.owner === name && a.state === "Open") out.push({ key: `ra:${a.id}`, kind: "Review action owner", ref: a.reviewId, title: a.text, collection: "reviewActions", id: a.id, patch: (to) => ({ owner: to }) })
  for (const r of state.reviews) {
    if (r.stage === "Closed") continue
    if (r.preparedBy === name) out.push({ key: `rv-prep:${r.id}`, kind: "Management review preparer", ref: r.id, title: r.title, collection: "reviews", id: r.id, patch: (to) => ({ preparedBy: to }) })
    if (r.reviewers.includes(name) && r.stage !== "Reviewed") out.push({ key: `rv:${r.id}`, kind: "Top management reviewer", ref: r.id, title: r.title, collection: "reviews", id: r.id, patch: (to) => ({ reviewers: swap(r.reviewers, name, to) }) })
  }
  for (const q of state.requirements)
    if (q.owner === name && (q.status === "To do" || q.status === "In progress" || q.status === "Ready to confirm"))
      out.push({ key: `req:${q.id}`, kind: "Certification task", ref: `Clause ${q.clause}`, title: q.title, collection: "requirements", id: q.id, patch: (to) => ({ owner: to }) })
  return out
}

/**
 * Deactivate someone without leaving their open work with nobody: list what they own or are waiting on,
 * hand it to one person or to a different person per item, then deactivate. Past sign-offs and history keep their name.
 */
export function DeactivateDialog({ person, open, onOpenChange }: { person?: Person; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, update, notify } = useStore()
  const items = React.useMemo(() => (person ? openWorkOf(state, person.name) : []), [state, person])
  const audits = person ? state.questionnaireAssignments.filter((q) => q.respondent === person.name && !["Submitted", "Resubmitted"].includes(q.status)).length : 0
  const people = state.people.filter((p) => p.status !== "Deactivated" && p.id !== person?.id && p.roleId !== "consultant" && p.roleId !== "guest-auditor")
  const [all, setAll] = React.useState("")
  const [each, setEach] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (!open) return
    setAll("")
    setEach({})
  }, [open, person?.id])
  if (!person) return null
  const target = (k: string) => each[k] || all
  const missing = items.filter((i) => !target(i.key)).length

  function confirm() {
    if (missing) return
    const given = new Map<string, number>()
    for (const i of items) {
      const to = target(i.key)
      update(i.collection, i.id, i.patch(to) as never)
      given.set(to, (given.get(to) ?? 0) + 1)
    }
    update("people", person!.id, { status: "Deactivated" })
    for (const [to, n] of given) notify([to], { kind: "Assigned", title: `${n} item${n === 1 ? "" : "s"} from ${person!.name} passed to you`, body: `${person!.name} was deactivated. Open My tasks to see what’s yours now.`, href: "/my-tasks" })
    toast(`${person!.name} deactivated`, { description: items.length ? `${items.length} open item${items.length === 1 ? "" : "s"} reassigned. Their past work keeps their name.` : "They had no open work. Their past work keeps their name." })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Deactivate {person.name}</DialogTitle>
          <DialogDescription>
            They can’t sign in once deactivated, and don’t use a seat. Their past work, sign-offs and history keep their name.
            {items.length ? " Choose who takes over what’s still open." : ""}
          </DialogDescription>
        </DialogHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{person.name} has no open work to hand over.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <Field label="Give everything to" htmlFor="reassign-all" help="You can choose someone different for any item below.">
              <NativeSelect id="reassign-all" value={all} onChange={(e) => setAll(e.target.value)}>
                <option value="">Choose a person</option>
                {people.map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <ul aria-label="Open work" className="max-h-[320px] overflow-y-auto rounded-md border">
              {items.map((i) => (
                <li key={i.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule-soft px-4 py-3 first:border-t-0">
                  <div className="flex min-w-0 flex-[999_1_16rem] flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      {i.kind} · {i.ref}
                    </span>
                    <span className="truncate text-sm font-medium">{i.title}</span>
                  </div>
                  <NativeSelect aria-label={`New ${i.kind.toLowerCase()} for ${i.title}`} value={each[i.key] ?? ""} onChange={(e) => setEach((m) => ({ ...m, [i.key]: e.target.value }))} className="h-9 w-48 text-[0.8125rem]">
                    <option value="">{all ? `Same: ${all}` : "Choose a person"}</option>
                    {people.map((p) => (
                      <option key={p.id}>{p.name}</option>
                    ))}
                  </NativeSelect>
                </li>
              ))}
            </ul>
          </div>
        )}
        {audits > 0 && <Alert tone="warning">{`${person.name} has ${audits} audit questionnaire${audits === 1 ? "" : "s"} to answer. Ask the audit lead to reassign ${audits === 1 ? "it" : "them"} from the audit.`}</Alert>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={missing > 0} onClick={confirm}>
            {items.length ? (missing ? `Choose who takes over (${missing} left)` : "Reassign and deactivate") : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
