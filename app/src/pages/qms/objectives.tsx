import * as React from "react"
import { Link } from "react-router-dom"
import { CalendarIcon, PlusIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon, PaperclipIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore, startProcess } from "@/lib/store"
import { cn } from "@/lib/utils"
import { belowTarget, fmtKpi, fmtTarget, hasData, kpiTone, onTarget } from "@/data/records"
import type { Objective } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import { Field, PeopleOptions, ProcessOptions, EvidencePicker } from "@/components/app/form"

/** Six-result bar trend. The latest bar is coloured by target. */
export function Sparkbars({ o }: { o: Objective }) {
  if (!o.values.length) return <span className="text-[0.8125rem] text-muted-foreground">No results yet</span>
  const lo = Math.min(...o.values)
  const hi = Math.max(...o.values)
  const span = hi - lo || 1
  return (
    <span className="flex h-8 items-end gap-1" role="img" aria-label={`${o.name}, last ${o.values.length} results: ${o.values.join(", ")}`}>
      {o.values.map((v, i) => {
        const last = i === o.values.length - 1
        return (
          <span
            key={i}
            className={cn("w-2.5 rounded-[2px]", last ? (onTarget(o, v) ? "bg-done" : "bg-overdue") : onTarget(o, v) ? "bg-input" : "bg-track-late")}
            style={{ height: `${30 + ((v - lo) / span) * 70}%` }}
          />
        )
      })}
    </span>
  )
}

type View = "all" | "below" | "mine"

export default function Objectives() {
  const { state, add, update, remove, user, can, takenIds } = useStore()
  const [view, setView] = React.useState<View>("all")
  const [result, setResult] = React.useState<{ open: boolean; o?: Objective; value: string }>({ open: false, value: "" })
  const [edit, setEdit] = React.useState<{ open: boolean; o?: Objective }>({ open: false })
  const [showEvidence, setShowEvidence] = React.useState<Objective | undefined>()
  const [f, setF] = React.useState({ name: "", process: startProcess(state.processes), target: "95", unit: "%" as "%" | "score", frequency: "monthly" as "monthly" | "quarterly", owner: user.name, evidence: [] as string[] })
  const [resultEvidence, setResultEvidence] = React.useState<string[]>([])
  const canEdit = can("Objectives & KPIs", "Add and edit")
  const all = state.objectives
  const F: Record<View, (o: Objective) => boolean> = { all: () => true, below: (o) => belowTarget(o), mine: (o) => o.owner === user.name }
  const rows = all.filter(F[view])

  function openEdit(o?: Objective) {
    setF({ name: o?.name ?? "", process: o?.process ?? startProcess(state.processes), target: String(o?.target ?? 95), unit: o?.unit ?? "%", frequency: o?.frequency ?? "monthly", owner: o?.owner ?? user.name, evidence: o?.evidence ?? [] })
    setEdit({ open: true, o })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS", to: "/qms/processes" }, { label: "Objectives & KPIs" }]}
        title="Objectives & KPIs"
        description="Quality objectives for 2026, how each is measured, and the latest results. ISO 9001 clauses 6.2 and 9.1."
        actions={
          canEdit && (
            <Button onClick={() => openEdit()}>
              <PlusIcon /> Add objective
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: all.length, label: "Quality objectives for 2026", badge: "All measured", tone: "done", icon: TargetIcon },
          { value: all.filter((o) => onTarget(o)).length, label: "On target", badge: "Up from 4", tone: "done", icon: TrendingUpIcon },
          { value: all.filter((o) => belowTarget(o)).length, label: "Below target", badge: "Needs action", tone: "overdue", icon: TrendingDownIcon },
          { value: "28 Oct", label: "Q3 results due", badge: `${all.length} to enter`, tone: "progress", icon: CalendarIcon },
        ]}
      />
      <ViewChips
        value={view}
        onChange={setView}
        views={[
          { id: "all", label: "All", count: all.length },
          { id: "below", label: "Below target", count: all.filter(F.below).length, warn: true },
          { id: "mine", label: "Mine", count: all.filter(F.mine).length },
        ]}
      />
      <DataTable
        label="Objectives" empty={{ title: "No objectives match", body: "Set measurable quality objectives with a target and owner. ISO 9001 clause 6.2." }}
        rows={rows}
        getRowId={(o) => o.id}
        minWidth={940}
        columns={[
          { id: "n", header: "Objective", cell: (o) => <span className="flex flex-col gap-0.5"><span className="font-medium">{o.name}</span><span className="text-[0.8125rem] text-muted-foreground">{o.process}, measured {o.frequency}</span>{o.evidence?.length ? <button type="button" onClick={() => setShowEvidence(o)} className="flex cursor-pointer items-center gap-1 self-start text-xs font-medium text-primary hover:underline"><PaperclipIcon className="size-3" />{o.evidence.length} evidence item{o.evidence.length > 1 ? "s" : ""}</button> : <span className="text-xs text-muted-foreground">No evidence linked</span>}</span>, className: "min-w-[260px]" },
          { id: "t", header: "Target", cell: (o) => fmtTarget(o) },
          { id: "trend", header: "Last six", cell: (o) => <Sparkbars o={o} /> },
          { id: "v", header: "Latest", cell: (o) => <span className={cn("text-[0.9375rem] font-semibold", kpiTone(o))}>{fmtKpi(o)}</span> },
          { id: "s", header: "State", cell: (o) => <Badge tone={!hasData(o) ? "draft" : onTarget(o) ? "done" : "overdue"}>{!hasData(o) ? "No data" : onTarget(o) ? "On target" : "Below target"}</Badge> },
          { id: "o", header: "Owner", cell: (o) => <span className="flex flex-col"><span className="whitespace-nowrap">{o.owner}</span><span className="text-xs text-muted-foreground">Next {o.nextResult}</span></span> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-[150px]",
            cell: (o) => (
              <span className="flex items-center justify-end gap-1">
                {canEdit && (
                  <Button variant="quiet" size="sm" onClick={() => { setResultEvidence([]); setResult({ open: true, o, value: "" }) }}>
                    Add result
                  </Button>
                )}
                <RowActions name={o.name} onEdit={canEdit ? () => openEdit(o) : undefined} removeKind={canEdit ? "archive" : undefined} onRemove={() => remove("objectives", o.id)} />
              </span>
            ),
          },
        ]}
      />

      <Dialog open={result.open} onOpenChange={(open) => setResult((r) => ({ ...r, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add result</DialogTitle>
            <DialogDescription>
              {result.o?.name}, target {result.o && fmtTarget(result.o)}. Last result {result.o && fmtKpi(result.o)}.
            </DialogDescription>
          </DialogHeader>
          <Field label="Result for October" htmlFor="kpi-v">
            <Input id="kpi-v" inputMode="decimal" value={result.value} onChange={(e) => setResult({ ...result, value: e.target.value })} className="sm:w-40" />
          </Field>
          <Field label="Evidence for this result" optional help="The report or record the figure comes from, so an auditor can trace it.">
            <EvidencePicker value={resultEvidence} onChange={setResultEvidence} process={result.o?.process} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResult({ open: false, value: "" })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const v = parseFloat(result.value)
                if (!result.o || isNaN(v)) return
                const values = [...result.o.values, v].slice(-6)
                update("objectives", result.o.id, { values, evidence: [...new Set([...(result.o.evidence ?? []), ...resultEvidence])] })
                const below = v < result.o.target
                toast(below ? "Result saved, below target" : "Result saved, on target", { description: below ? "Consider raising a corrective action." : undefined })
                setResult({ open: false, value: "" })
              }}
            >
              Save result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={edit.open} onOpenChange={(open) => setEdit((e) => ({ ...e, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{edit.o ? "Edit objective" : "Add objective"}</DialogTitle>
            <DialogDescription>Objectives must be measurable and have an owner. Clause 6.2.</DialogDescription>
          </DialogHeader>
          <Field label="Objective" htmlFor="o-n">
            <Input id="o-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="o-p">
              <NativeSelect id="o-p" value={f.process} onChange={(e) => setF({ ...f, process: e.target.value })}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Owner" htmlFor="o-o">
              <NativeSelect id="o-o" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Target, at least" htmlFor="o-t">
              <Input id="o-t" inputMode="decimal" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} />
            </Field>
            <Field label="Measured" htmlFor="o-f">
              <NativeSelect id="o-f" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value as "monthly" | "quarterly" })}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </NativeSelect>
            </Field>
          </div>
          <Field label="Supporting evidence" optional help={`Records that show how results are measured, such as the KPI pack. Evidence for ${f.process} is listed first.`}>
            <EvidencePicker value={f.evidence} onChange={(v) => setF({ ...f, evidence: v })} process={f.process} />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit({ open: false })}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.name.trim()) return
                const target = parseFloat(f.target) || 0
                if (edit.o) update("objectives", edit.o.id, { name: f.name, process: f.process, owner: f.owner, target, frequency: f.frequency, evidence: f.evidence })
                else add("objectives", { id: nextId(takenIds("objectives"), "OBJ-2026-", 2), name: f.name, process: f.process, owner: f.owner, target, unit: f.unit, frequency: f.frequency, values: [], nextResult: "31 Oct", evidence: f.evidence })
                toast(edit.o ? "Objective saved" : `${f.name} added`)
                setEdit({ open: false })
              }}
            >
              {edit.o ? "Save changes" : "Add objective"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Sheet open={!!showEvidence} onOpenChange={(o) => !o && setShowEvidence(undefined)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Evidence for {showEvidence?.name}</SheetTitle>
            <SheetDescription>
              {showEvidence?.id}, {showEvidence?.process}. Records that show how the results are measured.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <ul className="flex flex-col gap-2">
              {(showEvidence?.evidence ?? []).map((id) => {
                const e = state.evidence.find((x) => x.id === id)
                return (
                  <li key={id} className="flex flex-col gap-0.5 rounded-md border px-4 py-3">
                    <span className="text-[0.8125rem] font-medium text-primary">{id}</span>
                    <span className="text-sm font-medium">{e?.title ?? "This evidence was removed"}</span>
                    {e && (
                      <span className="text-xs text-muted-foreground">
                        {e.kind}, {e.processes.join(", ")}, added {e.added} by {e.addedBy}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
            <Link to="/evidence" className="text-[0.8125rem] font-medium text-primary">
              Open Evidence
            </Link>
          </SheetBody>
          {canEdit && showEvidence && (
            <SheetFooter>
              <Button variant="outline" onClick={() => { const o = showEvidence; setShowEvidence(undefined); openEdit(o) }}>
                Change linked evidence
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

