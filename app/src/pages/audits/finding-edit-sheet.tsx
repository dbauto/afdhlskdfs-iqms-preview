import * as React from "react"
import { toast } from "sonner"
import type { AuditFinding } from "@/data/audit-types"
import { useStore } from "@/lib/store"
import { useDraftClose } from "@/lib/use-draft-close"
import { Field } from "@/components/app/form"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet"

export function FindingEditSheet({
  finding,
  onClose,
}: {
  finding: AuditFinding
  onClose: () => void
}) {
  const { state, auditCommand } = useStore(),
    audit = state.audits.find((a) => a.id === finding.auditId)!
  const [draft, setDraft] = React.useState({
    title: finding.title,
    facts: finding.facts,
    requirement: finding.requirement,
    clause: finding.clause,
    owner: finding.owner,
  })
  const [dirty, setDirty] = React.useState(false),
    [error, setError] = React.useState("")
  const close = useDraftClose(dirty, onClose),
    busy = React.useRef(false)
  function patch(key: keyof typeof draft, value: string) {
    setDirty(true)
    setDraft((d) => ({ ...d, [key]: value }))
  }
  function save() {
    if (busy.current) return
    busy.current = true
    try {
      auditCommand({
        kind: "updateAuditFinding",
        auditId: finding.auditId,
        findingId: finding.id,
        ...draft,
      })
      toast("Finding updated")
      onClose()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      busy.current = false
    }
  }
  return (
    <Sheet open onOpenChange={(v) => !v && close.requestClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit finding</SheetTitle>
          <SheetDescription>
            Earlier wording is kept in the finding’s history. Reviewed findings
            must be reopened before editing.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {error && <Alert tone="danger">{error}</Alert>}
          <Field label="Finding title" htmlFor="finding-edit-title">
            <Input
              id="finding-edit-title"
              value={draft.title}
              onChange={(e) => patch("title", e.target.value)}
            />
          </Field>
          <Field label="Requirement" htmlFor="finding-edit-requirement">
            <Textarea
              id="finding-edit-requirement"
              value={draft.requirement}
              onChange={(e) => patch("requirement", e.target.value)}
            />
          </Field>
          <Field label="Facts" htmlFor="finding-edit-facts">
            <Textarea
              id="finding-edit-facts"
              value={draft.facts}
              onChange={(e) => patch("facts", e.target.value)}
            />
          </Field>
          <Field label="Clause" htmlFor="finding-edit-clause">
            <NativeSelect
              id="finding-edit-clause"
              value={draft.clause}
              onChange={(e) => patch("clause", e.target.value)}
            >
              {audit.clauses.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Responsible owner" htmlFor="finding-edit-owner">
            <NativeSelect
              id="finding-edit-owner"
              value={draft.owner}
              onChange={(e) => patch("owner", e.target.value)}
            >
              {state.people
                .filter((p) => p.status === "Active")
                .map((p) => (
                  <option key={p.id}>{p.name}</option>
                ))}
            </NativeSelect>
          </Field>
        </SheetBody>
        <SheetFooter>
          {close.discarding ? (
            <>
              <span className="mr-auto text-sm">
                Discard unsaved finding changes?
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
              <Button onClick={save}>Save finding</Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
