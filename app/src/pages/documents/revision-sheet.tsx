import * as React from "react"
import { RouteIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { INITIAL_SCOPE, SCOPE_DOCUMENT, documentRights, nextDocumentRevision } from "@/lib/document-control"
import { ScopeFields } from "@/pages/qms/scope-fields"
import { useDraftClose } from "@/lib/use-draft-close"
import { revisionRoute, routeProblems, typePlural } from "@/lib/routes"
import type { DocRecord, QmsScopeContent } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Field, PeoplePicker } from "@/components/app/form"
import { allows, peopleAllowed, personAllowed } from "@/lib/permissions"


/** Start the next revision of a published document, with its review route proposed and editable. */
export function RevisionSheet({ doc, onClose }: { doc?: DocRecord; onClose: () => void }) {
  const { state, documentCommand, user, role, routeDefaults, notify } = useStore()
  const proposed = React.useMemo(() => (doc ? revisionRoute(doc, state.processes, state.people, routeDefaults) : undefined), [doc, state.processes, state.people, routeDefaults])
  const [reviewers, setReviewers] = React.useState<string[]>([])
  const [approvers, setApprovers] = React.useState<string[]>([])
  const [note, setNote] = React.useState("")
  const [scope, setScope] = React.useState<QmsScopeContent>(INITIAL_SCOPE)
  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const close = useDraftClose(!!doc && dirty, onClose)
  const [problems, setProblems] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!proposed) return
    // the person starting the revision can't approve it, so take them off the proposal
    setReviewers(proposed.reviewers)
    setApprovers(proposed.approvers.filter((n) => n !== user.name))
    setNote("")
    setScope(doc?.scopeContent ?? INITIAL_SCOPE)
    setDirty(false)
    close.keep()
    setProblems([])
  }, [proposed, user.name])

  if (!doc || !proposed || !documentRights(state, user, doc).edit) return null
  const proposedApprovers = proposed.approvers.filter((n) => n !== user.name)
  const changed = reviewers.join() !== proposed.reviewers.join() || approvers.join() !== proposedApprovers.join()
  const selfApprover = proposed.approvers.includes(user.name)
  const requiredOthers = proposed.required.filter((n) => n !== user.name)
  const isQuality = allows(role, "docs.routeOverride")

  function start() {
    const p = routeProblems({ reviewers, approvers }, { author: user.name, isQuality, required: proposed!.required.filter((n) => n !== user.name), doc: doc!, consultants: state.people.filter((x) => !personAllowed(state.people, state.roles, x.name, "docs.approve")).map((x) => x.name) })
    if (!note.trim()) p.unshift("Say what’s changing in this revision. It goes in the revision history.")
    setProblems(p)
    if (p.length) return
    if (saving) return
    setSaving(true)
    const rev = nextDocumentRevision(doc!)
    try { documentCommand({ kind: "startRevision", id: doc!.id, expectedRev: doc!.rev, reviewers, approvers, note, scopeContent: doc!.id === SCOPE_DOCUMENT ? scope : undefined }) } catch (e) { setProblems([(e as Error).message]); setSaving(false); return }
    notify([...reviewers, ...approvers], { kind: "Assigned", title: `You’re on the route for ${doc!.id} revision ${rev}`, body: `${note.trim()}. You’ll be asked to act when it’s sent for review.`, href: `/documents/${doc!.id}` })
    toast(`Revision ${rev} of ${doc!.id} started`, { description: doc!.effectivity === "Suspended" ? `Revision ${doc!.rev} stays suspended; starting a draft does not resume it.` : `Revision ${doc!.rev} stays in force until it’s published. ${reviewers.join(", ")} will review it when you send it.` })
    setDirty(false)
    setSaving(false)
    onClose()
  }

  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && close.requestClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Start revision {nextDocumentRevision(doc)} of {doc.id}
          </SheetTitle>
          <SheetDescription>
            {doc.title}. {doc.effectivity === "Suspended" ? `Revision ${doc.rev} is suspended; starting a draft does not resume it.` : `Revision ${doc.rev} stays the controlled version until revision ${nextDocumentRevision(doc)} is published.`}
          </SheetDescription>
        </SheetHeader>
        <SheetBody onChange={() => setDirty(true)}>
          {doc.id === SCOPE_DOCUMENT && <ScopeFields value={scope} onChange={value => { setScope(value); setDirty(true) }} />}
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
              <PeoplePicker label="Technical reviewers" value={reviewers} onChange={v => { setReviewers(v); setDirty(true) }} />
            </Field>
            <Field label="Approval" help={requiredOthers.length ? `${requiredOthers.join(" and ")} must approve ${typePlural(doc.type)} in ${doc.process}.` : undefined}>
              <PeoplePicker label="Approvers" value={approvers} onChange={v => { setApprovers(v); setDirty(true) }} exclude={[user.name]} />
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
          {close.discarding && <Alert tone="warning" title="Discard unsaved changes?"><Button variant="outline" onClick={close.keep}>Keep editing</Button><Button variant="destructive" onClick={close.discard}>Discard changes</Button></Alert>}
          <Button variant="ghost" onClick={close.requestClose}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={start}>Start revision {nextDocumentRevision(doc)}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
