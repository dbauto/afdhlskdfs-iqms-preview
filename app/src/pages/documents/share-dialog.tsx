import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { isLocked, type DocRecord } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field, PeoplePicker } from "@/components/app/form"
import { useStore } from "@/lib/store"

const LEVELS = ["Can view", "Can comment", "Can edit"] as const
type Level = (typeof LEVELS)[number]

interface Grant {
  name: string
  how: string
  level: Level | string
  pending?: boolean
}

/**
 * Share one record with people their role doesn't let them see.
 * The backend enforces access; this dialog shows the rules.
 */
export function ShareDialog({ open, onOpenChange, doc }: { open: boolean; onOpenChange: (v: boolean) => void; doc: DocRecord }) {
  const { user, state } = useStore()
  const [people, setPeople] = React.useState<string[]>([])
  const [level, setLevel] = React.useState<Level>("Can view")
  const [ends, setEnds] = React.useState("30 days")
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const [grants, setGrants] = React.useState<Grant[]>(() => [
    { name: doc.owner, how: "Owner", level: "Can edit" },
    ...doc.viewers.filter((v) => v !== doc.owner).map((v) => ({ name: v, how: "Named on the record", level: "Can view" })),
    ...(doc.id === "SAL-REC-011" ? [{ name: "Carlos Mendoza", how: "Shared by Grace Lim, ends 31 Oct, “Q4 capacity planning”", level: "Can view" }] : []),
  ])

  const high = doc.classification === "Highly confidential"
  const locked = isLocked(doc.classification)
  const ownerApproves = high && user.name !== doc.owner

  // people whose role can't see this record
  const noAccess = people.filter((p) => {
    const person = state.people.find((x) => x.name === p)
    return locked || person?.roleId === "viewer"
  })

  function submit() {
    if (people.length === 0) return setError("Choose at least one person.")
    if (!reason.trim()) return setError("Say why they need it. The reason is kept in the access history.")
    setGrants((g) => [
      ...g,
      ...people.map((p) => ({
        name: p,
        how: ownerApproves ? `Waiting for ${doc.owner} to approve` : `Shared by ${user.name}, ends in ${ends}, “${reason.trim()}”`,
        level,
        pending: ownerApproves,
      })),
    ])
    toast(ownerApproves ? `Asked ${doc.owner} to approve` : `Shared ${doc.id} with ${people.join(", ")}`, {
      description: locked ? "Remember to share the file itself in SharePoint too." : undefined,
    })
    setPeople([])
    setReason("")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Share {doc.title}</DialogTitle>
          <DialogDescription>
            {doc.id}, {doc.classification.toLowerCase()}, owned by {doc.owner}
          </DialogDescription>
        </DialogHeader>

        <Field label="Share with">
          <PeoplePicker label="Share with" value={people} onChange={setPeople} exclude={grants.map((g) => g.name)} />
        </Field>

        {noAccess.length > 0 && (
          <Alert tone="info" title={`${noAccess.join(", ")} can’t see this record through their role`}>
            Sharing gives {noAccess.length > 1 ? "them" : "them"} {level.replace("Can ", "").toLowerCase()} access to this one record only, for the time you set.
            {ownerApproves && ` Because it is highly confidential, ${doc.owner} must approve the share first.`}
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Access">
            <div role="radiogroup" aria-label="Access" className="flex overflow-hidden rounded-sm border border-input">
              {LEVELS.map((l, i) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={l === level}
                  onClick={() => setLevel(l)}
                  disabled={locked && l === "Can edit"}
                  className={cn("h-10 flex-1 cursor-pointer text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-40", i > 0 && "border-l border-input", l === level ? "bg-foreground text-white" : "bg-card hover:bg-background")}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Access ends" htmlFor="share-ends">
            <NativeSelect id="share-ends" value={ends} onChange={(e) => setEnds(e.target.value)}>
              <option>7 days</option>
              <option>30 days</option>
              <option>90 days</option>
              {!locked && <option>Never</option>}
            </NativeSelect>
          </Field>
        </div>

        <Field label="Reason" htmlFor="share-reason" error={error}>
          <Input id="share-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, Q4 capacity planning" />
        </Field>

        {locked && (
          <Alert tone="warning">
            iQMS does not change SharePoint permissions. {doc.owner} will also need to share the file itself with them in SharePoint, or the link will not open.
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-medium">Who has access</p>
          <ul className="rounded-md border">
            {grants.map((g, i) => (
              <li key={g.name + i} className={cn("flex items-center gap-3 px-3 py-2.5", i > 0 && "border-t border-rule-soft")}>
                <Avatar name={g.name} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className={cn("truncate text-xs", g.pending ? "text-soon" : "text-muted-foreground")}>{g.how}</span>
                </span>
                {g.pending ? <Badge tone="soon">Waiting</Badge> : <span className="text-[13px] text-muted-foreground">{g.level}</span>}
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Done
          </Button>
          <Button onClick={submit}>{ownerApproves ? `Ask ${doc.owner.split(" ")[0]} to approve` : "Share"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
