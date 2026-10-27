import * as React from "react"
import { toast } from "sonner"

import { useConsole, type Approval } from "@/lib/console-store"
import { usePlatformAccess } from "@/lib/platform-access"
import { Alert } from "@/components/ui/alert"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { ViewChips } from "@/components/app/page"
import { PlatformHeader } from "./shell"

const STATE_TONE: Record<Approval["state"], BadgeTone> = { Waiting: "soon", Approved: "done", Declined: "draft" }

/** Why this person can't decide, in one sentence; undefined when they can (ADR-042). */
export function cannotDecide(a: Approval, me: { name: string }, canDeploy: boolean) {
  if (a.state !== "Waiting") return "Already decided."
  if (!canDeploy) return "Only the Developer decides deployments and AI settings."
  if (a.second && a.requestedBy === me.name) return "A second admin must decide this, not the person who asked."
  return undefined
}

export default function Approvals() {
  const c = useConsole()
  const { me, can } = usePlatformAccess()
  const [view, setView] = React.useState<"waiting" | "decided" | "all">("waiting")
  const [deciding, setDeciding] = React.useState<{ a: Approval; approve: boolean }>()
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const rows = c.approvals.filter((a) => (view === "all" ? true : view === "waiting" ? a.state === "Waiting" : a.state !== "Waiting"))
  const waiting = c.approvals.filter((a) => a.state === "Waiting").length
  return (
    <>
      <PlatformHeader title="Approvals" description="Promotions, deployments, rollbacks, AI-agent fixes and AI setting changes wait here until the Developer decides. AI settings need a second admin. Every decision is logged." />
      {!can("deploy") && <Alert tone="info">You can follow approvals here. Deciding them is kept for the Developer.</Alert>}
      <ViewChips
        value={view}
        onChange={(v) => setView(v as typeof view)}
        views={[
          { id: "waiting", label: "Waiting", count: waiting, warn: waiting > 0 },
          { id: "decided", label: "Decided", count: c.approvals.length - waiting },
          { id: "all", label: "All", count: c.approvals.length },
        ]}
      />
      <DataTable
        label="Approvals"
        rows={rows}
        getRowId={(a) => a.id}
        minWidth={900}
        empty={{ title: view === "waiting" ? "Nothing waits for approval" : "No approvals here", body: "Requests to promote, deploy, roll back or change AI settings show here." }}
        columns={[
          { id: "k", header: "Kind", cell: (a) => <span className="flex flex-col"><span className="whitespace-nowrap text-[0.8125rem] font-semibold">{a.kind}</span>{a.second && <span className="text-xs text-muted-foreground">Second admin</span>}</span> },
          { id: "t", header: "Request", className: "min-w-[280px]", cell: (a) => <span className="flex flex-col"><span className="font-medium">{a.title}</span><span className="text-xs text-muted-foreground">{a.detail}</span></span> },
          { id: "r", header: "Asked by", cell: (a) => <span className="flex flex-col whitespace-nowrap text-[0.8125rem]"><span>{a.requestedBy}</span><span className="text-xs text-muted-foreground">{a.requestedAt}</span></span> },
          { id: "s", header: "State", cell: (a) => <span className="flex flex-col gap-0.5"><Badge tone={STATE_TONE[a.state]}>{a.state}</Badge>{a.decidedBy && <span className="text-xs text-muted-foreground">{a.decidedBy}, {a.decidedAt}</span>}</span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            cell: (a) => {
              if (a.state !== "Waiting") return a.reason ? <span className="text-xs text-muted-foreground">{a.reason}</span> : null
              const why = cannotDecide(a, me, can("deploy"))
              if (why) return <span className="text-xs text-muted-foreground">{why}</span>
              return (
                <span className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setDeciding({ a, approve: false }); setReason(""); setError("") }}>
                    Decline
                  </Button>
                  <Button size="sm" onClick={() => { setDeciding({ a, approve: true }); setReason(""); setError("") }}>
                    Approve
                  </Button>
                </span>
              )
            },
          },
        ]}
      />
      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deciding?.approve ? "Approve" : "Decline"} {deciding?.a.title.charAt(0).toLowerCase()}
              {deciding?.a.title.slice(1)}?
            </DialogTitle>
            <DialogDescription>
              {deciding?.approve
                ? deciding.a.kind === "Promotion" || deciding.a.kind === "Deployment" || deciding.a.kind === "AI agent fix"
                  ? "Deploys outside the client’s working hours and is checked for 30 minutes before it counts as done. You can roll back from Deployments."
                  : "Takes effect now and is logged."
                : "The person who asked is told, with your reason."}
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason" htmlFor="ap-reason" optional={deciding?.approve} error={error}>
            <Textarea id="ap-reason" value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-16" aria-invalid={!!error} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeciding(undefined)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (!deciding) return
                if (!deciding.approve && !reason.trim()) return setError("Say why you’re declining, so they know what to change.")
                setBusy(true)
                c.decide(me, deciding.a.id, deciding.approve, reason.trim() || undefined)
                toast(deciding.approve ? "Approved" : "Declined", { description: deciding.a.title })
                setDeciding(undefined)
                setBusy(false)
              }}
            >
              {deciding?.approve ? "Approve" : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
