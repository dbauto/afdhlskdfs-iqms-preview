import * as React from "react"
import { RouteIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { revisionRoute, routeProblems, typePlural } from "@/lib/routes"
import type { DocRecord } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Field, PeoplePicker } from "@/components/app/form"

const next = (rev: string) => String(parseInt(rev, 10) + 1).padStart(2, "0")

/** Start the next revision of a published document, with its review route proposed and editable. */
export function RevisionSheet({ doc, onClose }: { doc?: DocRecord; onClose: () => void }) {
  const { state, update, user, role, routeDefaults } = useStore()
  const proposed = React.useMemo(() => (doc ? revisionRoute(doc, state.processes, state.people, routeDefaults) : undefined), [doc, state.processes, state.people, routeDefaults])
  const [reviewers, setReviewers] = React.useState<string[]>([])
  const [approvers, setApprovers] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  const [problems, setProblems] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!proposed) return
    // the person starting the revision can't approve it, so take them off the proposal
    setReviewers(proposed.reviewers)
    setApprovers(proposed.approvers.filter((n) => n !== user.name))
    setNote("")
    setProblems([])
  }, [proposed, user.name])

  if (!doc || !proposed) return null
  const proposedApprovers = proposed.approvers.filter((n) => n !== user.name)
  const changed = reviewers.join() !== proposed.reviewers.join() || approvers.join() !== proposedApprovers.join()
  const selfApprover = proposed.approvers.includes(user.name)
  const requiredOthers = proposed.required.filter((n) => n !== user.name)
  const isQuality = role.id === "quality" || role.id === "admin"

  function start() {
    const p = routeProblems({ reviewers, approvers }, { author: user.name, isQuality, required: proposed!.required.filter((n) => n !== user.name), doc: doc! })
    if (!note.trim()) p.unshift("Say what’s changing in this revision. It goes in the revision history.")
    setProblems(p)
    if (p.length) return
    const rev = next(doc!.rev)
    update("documents", doc!.id, { stage: "Draft", rev, reviewers, approvers, changeNote: note.trim(), startedBy: user.name })
    toast(`Revision ${rev} of ${doc!.id} started`, { description: `Revision ${doc!.rev} stays in force until it’s published. ${reviewers.join(", ")} will review it when you send it.` })
    onClose()
  }

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Start revision {next(doc.rev)} of {doc.id}
          </SheetTitle>
          <SheetDescription>
            {doc.title}. Revision {doc.rev} stays the controlled version until revision {next(doc.rev)} is published.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Field label="What’s changing" htmlFor="rv-note" help="Printed in the revision history, so readers and auditors can see what changed and why. ISO 9001 clause 7.5.3.">
            <Textarea id="rv-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="New torque values for the M8 fasteners after the supplier change" className="min-h-20" />
          </Field>

          <div className="flex flex-col gap-4 rounded-md border p-4">
            <div className="flex items-start gap-3">
              <RouteIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-0.5">
                <p className="text-[0.9375rem] font-semibold">Who reviews and approves it</p>
                <p className="text-[0.8125rem] text-muted-foreground">
                  {changed ? "Changed for this revision only. The process and company defaults stay as they are." : `${proposed.source}. Change it for this revision if needed.`}
                </p>
              </div>
            </div>
            {selfApprover && <p className="text-[0.8125rem] text-soon">You’d normally approve this document, but you’re starting the revision, so choose someone else to approve it.</p>}
            {proposed.notes.map((n) => (
              <p key={n} className="text-[0.8125rem] text-soon">
                {n}
              </p>
            ))}
            <Field label="Technical review">
              <PeoplePicker label="Technical reviewers" value={reviewers} onChange={setReviewers} />
            </Field>
            <Field label="Approval" help={requiredOthers.length ? `${requiredOthers.join(" and ")} must approve ${typePlural(doc.type)} in ${doc.process}.` : undefined}>
              <PeoplePicker label="Approvers" value={approvers} onChange={setApprovers} exclude={[user.name]} />
            </Field>
            {changed && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => { setReviewers(proposed.reviewers); setApprovers(proposedApprovers) }}>
                Go back to the proposed route
              </Button>
            )}
          </div>

          {problems.length > 0 && (
            <Alert tone="danger" title="Before you start">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Alert>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={start}>Start revision {next(doc.rev)}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
