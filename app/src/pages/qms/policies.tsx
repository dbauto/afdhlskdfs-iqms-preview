import * as React from "react"
import { BookCheckIcon, CalendarIcon, PenLineIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import type { Policy } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, Textarea } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"

export default function Policies() {
  const { state, add, update, remove, can } = useStore()
  const [edit, setEdit] = React.useState<{ open: boolean; p?: Policy }>({ open: false })
  const [f, setF] = React.useState({ title: "", summary: "" })
  const canEdit = can("Policies", "Add and edit")
  const pols = state.policies
  const ack = pols.reduce((s, p) => s + p.acknowledged, 0)
  const total = pols.filter((p) => p.state !== "Draft").reduce((s, p) => s + p.appliesTo, 0)

  function open(p?: Policy) {
    setF({ title: p?.title ?? "", summary: p?.summary ?? "" })
    setEdit({ open: true, p })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS", to: "/qms/processes" }, { label: "Policies" }]}
        title="Policies"
        description="The quality policy and the policies that support it, and who has read and acknowledged each one. ISO 9001 clauses 5.2 and 7.3."
        actions={
          canEdit && (
            <Button onClick={() => open()}>
              <PlusIcon /> Add policy
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: pols.filter((p) => p.state !== "Draft").length, label: "Published policies", badge: "1 review due", tone: "soon", icon: BookCheckIcon },
          { value: `${Math.round((ack / total) * 100)}%`, label: "Acknowledged by the people they apply to", badge: `${total - ack} still to sign`, tone: "soon", icon: PenLineIcon },
          { value: "30 Jan", label: "Quality policy last reviewed", badge: "At management review", tone: "done", icon: CalendarIcon },
        ]}
      />
      <DataTable
        label="Policies"
        rows={pols}
        getRowId={(p) => p.id}
        minWidth={940}
        columns={[
          { id: "t", header: "Policy", cell: (p) => <span className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-primary">{p.id}, rev {p.rev}</span><span className="font-medium">{p.title}</span><span className="max-w-md text-[13px] text-muted-foreground">{p.summary}</span></span>, className: "min-w-[320px]" },
          { id: "a", header: "Approved", cell: (p) => (p.approvedBy ? <span className="flex flex-col"><span className="whitespace-nowrap">{p.approvedBy}</span><span className="text-xs text-muted-foreground">{p.approvedOn}</span></span> : <span className="text-muted-foreground">Not yet</span>) },
          {
            id: "k",
            header: "Acknowledged",
            cell: (p) => (
              <span className="flex w-40 flex-col gap-1.5">
                <span className="text-[13px]">
                  {p.acknowledged} of {p.appliesTo}
                </span>
                <span className="h-1.5 rounded-full bg-border">
                  <span className={p.acknowledged === p.appliesTo ? "block h-1.5 rounded-full bg-done" : "block h-1.5 rounded-full bg-primary"} style={{ width: `${(p.acknowledged / p.appliesTo) * 100}%` }} />
                </span>
              </span>
            ),
          },
          { id: "s", header: "State", cell: (p) => <StateBadge value={p.state === "Review due" ? "Review due" : p.state} /> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-12",
            cell: (p) => (
              <RowActions
                name={p.title}
                onEdit={canEdit ? () => open(p) : undefined}
                extra={p.state !== "Draft" && p.acknowledged < p.appliesTo ? [{ label: "Remind people to acknowledge", onSelect: () => toast(`Reminder sent to ${p.appliesTo - p.acknowledged} people`) }] : undefined}
                removeKind={canEdit ? (p.state === "Draft" ? "delete" : "archive") : undefined}
                onRemove={() => (p.state === "Draft" ? remove("policies", p.id) : update("policies", p.id, { state: "Review due" }))}
              />
            ),
          },
        ]}
      />

      <Dialog open={edit.open} onOpenChange={(o) => setEdit((e) => ({ ...e, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit.p ? `Edit ${edit.p.title}` : "Add policy"}</DialogTitle>
            <DialogDescription>A policy is a controlled document. It goes through review and approval, then people are asked to acknowledge it.</DialogDescription>
          </DialogHeader>
          <Field label="Title" htmlFor="pol-t">
            <Input id="pol-t" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </Field>
          <Field label="In one sentence" htmlFor="pol-s">
            <Textarea id="pol-s" value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className="min-h-20" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.title.trim()) return
                if (edit.p) update("policies", edit.p.id, f)
                else {
                  const n = Math.max(...pols.map((p) => parseInt(p.id.slice(-3), 10))) + 1
                  add("policies", { id: `QMS-POL-${String(n).padStart(3, "0")}`, ...f, rev: "01", approvedBy: "", approvedOn: "", acknowledged: 0, appliesTo: 146, state: "Draft" })
                }
                toast(edit.p ? "Policy saved" : `${f.title} added as a draft`)
                setEdit({ open: false })
              }}
            >
              {edit.p ? "Save changes" : "Add policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
