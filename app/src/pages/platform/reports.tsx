import * as React from "react"
import { BotIcon, GitBranchIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { SupportReport, SupportState } from "@/data/types"
import { Alert } from "@/components/ui/alert"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/app/data-table"
import { ViewChips } from "@/components/app/page"
import { PlatformHeader } from "./shell"

export const SUPPORT_TONE: Record<SupportState, BadgeTone> = {
  New: "soon",
  Investigating: "progress",
  "Fix in sandbox": "progress",
  "Waiting for approval": "soon",
  Deployed: "done",
  Closed: "draft",
}

function ReportSheet({ r, onClose }: { r?: SupportReport; onClose: () => void }) {
  const { update } = useStore()
  const [reply, setReply] = React.useState("")
  const [approve, setApprove] = React.useState(false)
  if (!r) return null
  const log = (who: string, text: string, state?: SupportState) => update("supportReports", r.id, { updates: [...r.updates, { when: "Just now", who, text }], ...(state ? { state } : {}) })
  return (
    <Sheet open={!!r} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {r.id} {r.title}
          </SheetTitle>
          <SheetDescription>
            {r.source === "Person" ? `${r.from} at ${r.org}` : `Error monitor, ${r.org}`}, {r.category.toLowerCase()}, {r.impact.toLowerCase()}. Raised {r.created}.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="flex items-center gap-2">
            <Badge tone={SUPPORT_TONE[r.state]}>{r.state}</Badge>
            {r.page && <span className="text-[0.8125rem] text-muted-foreground">On {r.page}</span>}
          </div>
          <p className="text-sm leading-relaxed">{r.details}</p>
          {r.attachments.length > 0 && <p className="text-[0.8125rem] text-muted-foreground">Attached: {r.attachments.join(", ")}</p>}
          {r.diagnostics && (
            <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 rounded-sm bg-background p-3 text-xs">
              <dt className="text-muted-foreground">App</dt>
              <dd>{r.diagnostics.app}</dd>
              <dt className="text-muted-foreground">Browser</dt>
              <dd>{r.diagnostics.browser}</dd>
              <dt className="text-muted-foreground">Role</dt>
              <dd>{r.diagnostics.role}</dd>
              <dt className="text-muted-foreground">Errors</dt>
              <dd>{r.diagnostics.errors.length ? r.diagnostics.errors.join("; ") : "None"}</dd>
            </dl>
          )}
          {r.agent && (
            <div className="flex flex-col gap-2 rounded-md border p-4">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <BotIcon className="size-4 text-primary" /> AI agent
              </span>
              <p className="text-sm">
                <span className="text-muted-foreground">Found: </span>
                {r.agent.finding}
              </p>
              {r.agent.fix && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Fix: </span>
                  {r.agent.fix}
                </p>
              )}
              {r.agent.branch && (
                <p className="flex items-center gap-1.5 font-mono text-xs">
                  <GitBranchIcon className="size-3.5" /> {r.agent.branch}
                </p>
              )}
              {r.agent.tests && <p className="text-[0.8125rem] text-done">{r.agent.tests}</p>}
              {r.agent.sandbox && <p className="text-[0.8125rem] text-muted-foreground">Try it in the sandbox: {r.agent.sandbox}</p>}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-semibold">Timeline</span>
            <ol className="flex flex-col gap-2 border-l-2 border-rule-soft pl-4">
              {r.updates.map((u, i) => (
                <li key={i} className="flex flex-col">
                  <span className="text-sm">{u.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {u.who}, {u.when}
                  </span>
                </li>
              ))}
            </ol>
          </div>
          {r.from && (
            <div className="flex flex-col gap-2">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${r.from}. It goes by email and shows in their reports.`} aria-label="Reply" className="min-h-16" />
              <Button size="sm" variant="outline" className="self-start" disabled={!reply.trim()} onClick={() => { log("Leo Navarro", reply.trim()); setReply(""); toast("Reply sent") }}>
                Send reply
              </Button>
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          {r.state === "Waiting for approval" ? (
            <>
              <Button variant="ghost" onClick={() => { log("Leo Navarro", "Fix rejected. Sent back to the agent with notes.", "Investigating"); toast("Sent back") }}>
                Reject fix
              </Button>
              <Button onClick={() => setApprove(true)}>
                <ShieldCheckIcon /> Approve deploy
              </Button>
            </>
          ) : r.state === "New" || r.state === "Investigating" ? (
            <>
              <Button variant="ghost" onClick={() => { log("Leo Navarro", "Closed.", "Closed"); onClose() }}>
                Close report
              </Button>
              <Button variant="outline" onClick={() => { log("Leo Navarro", "Sent to the AI agent to reproduce and fix in the sandbox.", "Investigating"); toast("AI agent is looking at it", { description: "It works on a sandbox copy and asks you before anything is deployed." }) }}>
                <BotIcon /> Ask the AI agent
              </Button>
            </>
          ) : r.state === "Deployed" ? (
            <Button variant="outline" onClick={() => { log("Leo Navarro", "Closed.", "Closed"); onClose() }}>
              Close report
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
      <Dialog open={approve} onOpenChange={setApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy the fix for {r.id}?</DialogTitle>
            <DialogDescription>
              Merges {r.agent?.branch ?? "the fix branch"} into main and deploys to production. Tests passed in the sandbox. You can roll back from Background jobs if anything goes wrong.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setApprove(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                log("Leo Navarro", "Approved and deployed.", "Deployed")
                setApprove(false)
                toast(`${r.id} fix deployed`, { description: "The reporter is told it’s fixed." })
              }}
            >
              Approve and deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

export default function SupportReports() {
  const { state } = useStore()
  const [view, setView] = React.useState<"open" | "approval" | "all">("open")
  const [openId, setOpenId] = React.useState<string>()
  const all = state.supportReports
  const isOpen = (r: SupportReport) => r.state !== "Closed" && r.state !== "Deployed"
  const rows = all.filter((r) => (view === "all" ? true : view === "approval" ? r.state === "Waiting for approval" : isOpen(r)))
  return (
    <>
      <PlatformHeader title="Support reports" description="Reports from people using ThryveMS and failures caught by the error monitor. The AI agent reproduces and fixes them in the sandbox. Nothing reaches production until you approve it." />
      <Alert tone="info">The AI agent works on a branch and the sandbox only. It has no access to production data or deploy rights. Every deploy needs your approval.</Alert>
      <ViewChips
        value={view}
        onChange={(v) => setView(v as typeof view)}
        views={[
          { id: "open", label: "Open", count: all.filter(isOpen).length },
          { id: "approval", label: "Waiting for your approval", count: all.filter((r) => r.state === "Waiting for approval").length, warn: true },
          { id: "all", label: "All", count: all.length },
        ]}
      />
      <DataTable
        label="Support reports"
        rows={rows}
        getRowId={(r) => r.id}
        minWidth={900}
        empty={{ title: "Nothing here", body: "New reports and monitor alerts show here." }}
        columns={[
          { id: "t", header: "Report", className: "min-w-[260px]", cell: (r) => <button type="button" onClick={() => setOpenId(r.id)} className="flex cursor-pointer flex-col gap-0.5 text-left"><span className="font-mono text-[0.8125rem] text-primary">{r.id}</span><span className="font-medium">{r.title}</span></button> },
          { id: "f", header: "From", cell: (r) => <span className="flex flex-col whitespace-nowrap"><span>{r.source === "Person" ? r.from : "Error monitor"}</span><span className="text-xs text-muted-foreground">{r.org}</span></span> },
          { id: "i", header: "Impact", cell: (r) => <span className={cn("whitespace-nowrap", r.impact === "I can’t work" && "font-semibold text-overdue")}>{r.impact}</span> },
          { id: "a", header: "AI agent", cell: (r) => <span className="text-[0.8125rem] text-muted-foreground">{r.agent ? (r.agent.tests ? "Fix tested in sandbox" : "Investigating") : "Not started"}</span> },
          { id: "s", header: "State", cell: (r) => <Badge tone={SUPPORT_TONE[r.state]}>{r.state}</Badge> },
          { id: "c", header: "Raised", cell: (r) => <span className="whitespace-nowrap text-muted-foreground">{r.created}</span> },
        ]}
      />
      <ReportSheet r={all.find((r) => r.id === openId)} onClose={() => setOpenId(undefined)} />
    </>
  )
}
