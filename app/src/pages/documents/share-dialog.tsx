import * as React from "react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { isLocked, type DocRecord } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  const { user, state, notify } = useStore()
  const [people, setPeople] = React.useState<string[]>([])
  const [level, setLevel] = React.useState<Level>("Can view")
  const [ends, setEnds] = React.useState("30 days")
  const [reason, setReason] = React.useState("")
  const submitting = React.useRef(false)
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
    if (submitting.current) return
    submitting.current = true
    setGrants((g) => [
      ...g,
      ...people.map((p) => ({
        name: p,
        how: ownerApproves ? `Waiting for ${doc.owner} to approve` : `Shared by ${user.name}, ends in ${ends}, “${reason.trim()}”`,
        level,
        pending: ownerApproves,
      })),
    ])
    if (ownerApproves) notify([doc.owner], { kind: "Waiting on you", title: `Approve access to ${doc.id} for ${people.join(", ")}`, body: `${user.name}: “${reason.trim()}”`, href: `/documents/${doc.id}` })
    else notify(people, { kind: "Shared", title: `${user.name} shared ${doc.id} with you`, body: `${doc.title}. “${reason.trim()}”`, href: `/documents/${doc.id}` })
    toast(ownerApproves ? `Asked ${doc.owner} to approve` : `Shared ${doc.id} with ${people.join(", ")}`, {
      description: locked ? "Remember to share the file itself in SharePoint too." : undefined,
    })
    setPeople([])
    setReason("")
    setError("")
    queueMicrotask(() => { submitting.current = false })
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

        <div className="@container/share min-w-0">
        <div className="grid min-w-0 gap-4 ">
          <Field label="Access">
            <RadioGroup aria-label="Access" value={level} onValueChange={value => setLevel(value as Level)} className="grid min-w-0 grid-cols-1 gap-2 @[22rem]/share:grid-cols-3">
              {LEVELS.map(l => <label key={l} className={cn("flex min-h-10 min-w-0 cursor-pointer items-center gap-2 rounded-sm border border-input px-3 py-2 text-[0.8125rem] font-medium has-[[data-state=checked]]:bg-highlight has-[[data-state=checked]]:border-primary", locked && l === "Can edit" && "cursor-not-allowed opacity-40")}><RadioGroupItem value={l} disabled={locked && l === "Can edit"} /><span className="break-words">{l}</span></label>)}
            </RadioGroup>
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

        </div>

        <Field label="Reason" htmlFor="share-reason" error={error}>
          <Input id="share-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example, Q4 capacity planning" />
        </Field>

        {locked && (
          <Alert tone="warning">
            ThryveMS does not change SharePoint permissions. {doc.owner} will also need to share the file itself with them in SharePoint, or the link will not open.
          </Alert>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[0.8125rem] font-medium">Who has access</p>
          <ul className="rounded-md border">
            {grants.map((g, i) => (
              <li key={g.name + i} className={cn("flex items-center gap-3 px-3 py-2.5", i > 0 && "border-t border-rule-soft")}>
                <Avatar name={g.name} size={28} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className={cn("truncate text-xs", g.pending ? "text-soon" : "text-muted-foreground")}>{g.how}</span>
                </span>
                {g.pending ? <Badge tone="soon">Waiting</Badge> : <span className="text-[0.8125rem] text-muted-foreground">{g.level}</span>}
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
