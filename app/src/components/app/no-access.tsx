import * as React from "react"
import { Link } from "react-router-dom"
import { LockIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { RequestKind } from "@/lib/access-requests"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { RadioCard, RadioGroup } from "@/components/ui/radio-group"
import { EmptyState } from "@/components/app/page"
import { Field } from "@/components/app/form"
import NotFound from "@/pages/not-found"

/**
 * Shown instead of "not found" when a Public or Internal record is outside the person's processes.
 * Gives the number only, never the title or contents, and lets them ask the owner for access.
 * Anything else (Confidential, deleted, wrong link, section turned off) still shows NotFound.
 */
export function NoAccess({ kind, id }: { kind: RequestKind; id?: string }) {
  const { accessTarget, requestAccess } = useStore()
  const target = id ? accessTarget(kind, id) : undefined
  const [open, setOpen] = React.useState(false)
  const [scope, setScope] = React.useState<"Record" | "Process">("Record")
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState("")
  const sending = React.useRef(false)

  React.useEffect(() => {
    if (!open) return
    setScope("Record")
    setNote("")
    setError("")
    sending.current = false
  }, [open])

  if (!target) return <NotFound />
  const asks = scope === "Process" ? target.processOwner : target.recordDecider
  const waitingFor = target.waiting?.decider

  return (
    <>
      <Card className="mt-6">
        <EmptyState
          icon={LockIcon}
          title={`You don’t have access to ${target.id}`}
          body={
            waitingFor
              ? `You asked ${waitingFor} for access. You’ll get a notification when they decide.`
              : `It belongs to the ${target.process} process, which your role doesn’t cover. Ask its owner to share it with you.`
          }
          action={
            waitingFor ? (
              <Button variant="outline" asChild>
                <Link to="/">Go to Overview</Link>
              </Button>
            ) : (
              <Button onClick={() => setOpen(true)}>Request access</Button>
            )
          }
        />
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request access to {target.id}</DialogTitle>
            <DialogDescription>Your role stays the same. The owner opens only what you ask for.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="What do you need?">
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as "Record" | "Process")}>
                <RadioCard value="Record" title="This record only" help={`${target.recordDecider} decides.`} />
                <RadioCard value="Process" title={`Shared records in ${target.process}`} help={`${target.processOwner}, the process owner, ticks which ones to share with you.`} />
              </RadioGroup>
            </Field>
            <Field label="Why you need it" htmlFor="ar-note" optional error={error}>
              <Textarea id="ar-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="I’m covering for Carlos during the line 2 audit." />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (sending.current) return
                sending.current = true
                try {
                  requestAccess({ kind, id: target.id, scope, note })
                  toast("Request sent", { description: `${asks} will be asked to decide.` })
                  setOpen(false)
                } catch (e) {
                  setError((e as Error).message)
                  sending.current = false
                }
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
