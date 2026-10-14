/**
 * Consultant remarks on records. The consultant (or a quality manager) adds a remark,
 * anyone who can see the record replies, and the consultant or a quality manager resolves it.
 * Open remarks show as a banner on the record, a marker in tables, a count in the top bar
 * and the sidebar, and in the Remarks inbox.
 */
import * as React from "react"
import { Link } from "react-router-dom"
import { CheckIcon, MessageSquareTextIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Area, Remark, RemarkKind } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export interface RemarkTarget {
  kind: RemarkKind
  id: string
  label: string
  to: string
  area: Area
}

/** Who may write and resolve remarks: the consultant, quality managers and administrators. */
export function useRemarkRights() {
  const { role } = useStore()
  const can = ["consultant", "quality", "admin"].includes(role.id)
  return { canAdd: can, canResolve: can }
}

export function useRemarks(kind?: RemarkKind, id?: string) {
  const { state } = useStore()
  const all = state.remarks.filter((r) => (!kind || r.kind === kind) && (!id || r.targetId === id))
  return { all, open: all.filter((r) => r.status === "Open") }
}

/** Consultant name for headings, from the first remark or the consultant user. */
function useConsultantName() {
  const { state } = useStore()
  return state.people.find((p) => p.roleId === "consultant")?.name ?? "Your consultant"
}

/** Shown at the top of a record page when there are open remarks. */
export function RemarkBanner({ kind, id }: { kind: RemarkKind; id: string }) {
  const { open } = useRemarks(kind, id)
  const name = useConsultantName()
  if (!open.length) return null
  return (
    <a
      href="#remarks"
      onClick={(e) => {
        e.preventDefault()
        document.getElementById("remarks")?.scrollIntoView({ behavior: "smooth", block: "start" })
      }}
      className="flex items-center gap-3 rounded-md border border-soon-border bg-soon-tint px-4 py-3 text-sm transition-colors hover:border-soon"
    >
      <MessageSquareTextIcon className="size-[1.125rem] shrink-0 text-soon" />
      <span className="flex-1">
        <span className="font-semibold">
          {open.length} open remark{open.length > 1 ? "s" : ""} from {name}
        </span>
        <span className="text-muted-foreground">, consultant. {open[0].text.length > 90 ? open[0].text.slice(0, 90) + "…" : open[0].text}</span>
      </span>
      <span className="font-medium text-primary">View</span>
    </a>
  )
}

/** Small marker for table rows. Click to open the remarks. */
export function RemarkMarker({ kind, id, onClick }: { kind: RemarkKind; id: string; onClick?: () => void }) {
  const { open } = useRemarks(kind, id)
  if (!open.length) return null
  const body = (
    <>
      <MessageSquareTextIcon className="size-3.5" />
      {open.length}
    </>
  )
  const cls = "inline-flex h-6 items-center gap-1 rounded-full bg-soon-tint px-2 text-xs font-semibold text-soon"
  return onClick ? (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick() }} className={cn(cls, "cursor-pointer hover:bg-soon-strong")} aria-label={`${open.length} open consultant remark${open.length > 1 ? "s" : ""}`} title="Consultant remarks">
      {body}
    </button>
  ) : (
    <span className={cls} aria-label={`${open.length} open consultant remark${open.length > 1 ? "s" : ""}`} title="Consultant remarks">
      {body}
    </span>
  )
}

function RemarkItem({ r }: { r: Remark }) {
  const { update, user } = useStore()
  const { canResolve } = useRemarkRights()
  const [reply, setReply] = React.useState("")
  const [replying, setReplying] = React.useState(false)
  const resolved = r.status === "Resolved"
  return (
    <li className={cn("flex flex-col gap-3 px-5 py-4", resolved && "opacity-70")}>
      <div className="flex items-start gap-3">
        <Avatar name={r.author} size={32} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2 text-[0.8125rem]">
            <span className="font-semibold">{r.author}</span>
            <Badge tone="soon">Consultant</Badge>
            <span className="text-muted-foreground">{r.when}</span>
            {resolved && <Badge tone="done">Resolved{r.resolvedBy ? ` by ${r.resolvedBy}` : ""}</Badge>}
          </span>
          <p className="text-sm leading-relaxed">{r.text}</p>
        </div>
      </div>
      {r.replies.length > 0 && (
        <ul className="ml-11 flex flex-col gap-2.5 border-l-2 border-rule-soft pl-4">
          {r.replies.map((x, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <span className="text-[0.8125rem]">
                <span className="font-semibold">{x.author}</span> <span className="text-muted-foreground">{x.when}</span>
              </span>
              <span className="text-sm">{x.text}</span>
            </li>
          ))}
        </ul>
      )}
      {!resolved && (
        <div className="ml-11 flex flex-col gap-2">
          {replying ? (
            <>
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply, for example what you changed" className="min-h-16" aria-label={`Reply to ${r.author}`} autoFocus />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!reply.trim()}
                  onClick={() => {
                    update("remarks", r.id, { replies: [...r.replies, { author: user.name, text: reply.trim(), when: "Just now" }] })
                    setReply("")
                    setReplying(false)
                    toast("Reply sent", { description: `${r.author} gets a notification.` })
                  }}
                >
                  Send reply
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReplying(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setReplying(true)}>
                Reply
              </Button>
              {canResolve && (
                <Button size="sm" variant="ghost" onClick={() => { update("remarks", r.id, { status: "Resolved", resolvedBy: user.name }); toast("Remark resolved") }}>
                  <CheckIcon /> Mark resolved
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {resolved && canResolve && (
        <Button size="sm" variant="ghost" className="ml-9 self-start" onClick={() => update("remarks", r.id, { status: "Open", resolvedBy: undefined })}>
          <RotateCcwIcon /> Reopen
        </Button>
      )}
    </li>
  )
}

/** All remarks on one record, with a box for the consultant to add one. */
export function RemarksList({ target }: { target: RemarkTarget }) {
  const { add, user } = useStore()
  const { all } = useRemarks(target.kind, target.id)
  const { canAdd } = useRemarkRights()
  const [text, setText] = React.useState("")
  const [showResolved, setShowResolved] = React.useState(false)
  const open = all.filter((r) => r.status === "Open")
  const resolved = all.filter((r) => r.status === "Resolved")
  return (
    <>
      <ul className="divide-y divide-rule-soft">
        {open.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No open remarks.</li>}
        {open.map((r) => (
          <RemarkItem key={r.id} r={r} />
        ))}
        {showResolved && resolved.map((r) => <RemarkItem key={r.id} r={r} />)}
      </ul>
      {resolved.length > 0 && (
        <button type="button" onClick={() => setShowResolved(!showResolved)} className="cursor-pointer border-t border-rule-soft px-5 py-2.5 text-left text-[0.8125rem] font-medium text-primary">
          {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
        </button>
      )}
      {canAdd && (
        <div className="flex flex-col gap-2 border-t px-5 py-4">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a remark: what the auditor will look for, and what to change" className="min-h-20" aria-label="New remark" />
          <Button
            size="sm"
            className="self-end"
            disabled={!text.trim()}
            onClick={() => {
              add("remarks", { id: `rm-${Date.now()}`, kind: target.kind, targetId: target.id, targetLabel: target.label, to: target.to, area: target.area, author: user.name, text: text.trim(), when: "Just now", status: "Open", replies: [] })
              setText("")
              toast("Remark added", { description: "The owner sees it on the record and in their remarks." })
            }}
          >
            Add remark
          </Button>
        </div>
      )}
    </>
  )
}

/** Card for record pages. Anchored as #remarks for the banner. */
export function RemarksPanel({ target }: { target: RemarkTarget }) {
  const { all, open } = useRemarks(target.kind, target.id)
  const { canAdd } = useRemarkRights()
  if (!all.length && !canAdd) return null
  return (
    <Card id="remarks" className="scroll-mt-24">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareTextIcon className="size-4 text-soon" />
          <CardTitle>Consultant remarks</CardTitle>
        </div>
        {open.length > 0 && <Badge tone="soon">{open.length} open</Badge>}
      </CardHeader>
      <RemarksList target={target} />
    </Card>
  )
}

/** For records without their own page (risks, evidence): remarks in a side sheet. */
export function RemarksSheet({ target, onClose }: { target?: RemarkTarget; onClose: () => void }) {
  return (
    <Sheet open={!!target} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Consultant remarks</SheetTitle>
          <SheetDescription>{target?.label}</SheetDescription>
        </SheetHeader>
        <SheetBody className="-mx-6 p-0">{target && <RemarksList target={target} />}</SheetBody>
      </SheetContent>
    </Sheet>
  )
}

/** Short list for the Overview and the inbox. */
export function RemarkRow({ r, first }: { r: Remark; first?: boolean }) {
  return (
    <Link to={r.to} className={cn("flex items-start gap-3 px-5 py-3 hover:bg-hover", !first && "border-t border-rule-soft")}>
      <MessageSquareTextIcon className="mt-0.5 size-4 shrink-0 text-soon" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{r.targetLabel}</span>
        <span className="line-clamp-2 text-[0.8125rem] text-muted-foreground">{r.text}</span>
        <span className="text-xs text-muted-foreground">
          {r.author}, {r.when}
          {r.replies.length ? `, ${r.replies.length} repl${r.replies.length > 1 ? "ies" : "y"}` : ""}
        </span>
      </span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{r.area}</span>
    </Link>
  )
}
