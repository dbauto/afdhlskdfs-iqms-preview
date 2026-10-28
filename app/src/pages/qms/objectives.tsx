import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CalendarIcon, PlusIcon, TargetIcon, TrendingDownIcon, TrendingUpIcon, PaperclipIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore, startProcess } from "@/lib/store"
import { RULES } from "@/lib/rules"
import { cn } from "@/lib/utils"
import { belowTarget, fmtKpi, fmtTarget, hasData, kpiTone, onTarget, resultsOf } from "@/data/records"
import { resultPeriodLabel } from "@/lib/periods"
import { ChartTip, TIP_FOCUS } from "@/components/app/chart-tip"
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
import { REVIEW_INPUTS } from "@/data/reviews"
import { AddResultDialog } from "./objective-result"

/** Inputs an objective can feed. c2 (quality objectives) always covers every objective. */
const FEEDABLE = REVIEW_INPUTS.filter((i) => i.ref !== "c2")

/** Pick the management review inputs this objective feeds. */
function ReviewInputPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div role="group" aria-label="Management review inputs" className="flex flex-wrap gap-2">
      {FEEDABLE.map((i) => {
        const on = value.includes(i.ref)
        return (
          <button key={i.ref} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== i.ref) : [...value, i.ref])} className={cn("inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[0.8125rem]", on ? "border-primary bg-highlight font-medium text-primary" : "border-input hover:bg-background")}>
            <span className="font-semibold">{i.ref}</span> {i.name}
          </button>
        )
      })}
    </div>
  )
}

/** Short x-axis label for a result period: the month's initial, or the quarter. */
const tick = (period: string) => {
  const q = period.match(/-Q([1-4])$/)
  return q ? `Q${q[1]}` : "JFMAMJJASOND"[Number(period.slice(5, 7)) - 1] ?? ""
}
const num = (v: number) => String(Math.round(v * 10) / 10)

/**
 * The last six results as bars, with the period under each bar, the top, bottom and target values on
 * the left, a dashed target line, and each bar's value on hover, focus or tap. The latest bar is coloured by target.
 */
export function Sparkbars({ o, tall }: { o: Objective; tall?: boolean }) {
  const results = resultsOf(o).slice(-6)
  if (!results.length) return <span className="text-[0.8125rem] text-muted-foreground">No results yet</span>
  const vals = results.map((r) => r.value)
  const lo = Math.min(...vals, o.target)
  const hi = Math.max(...vals, o.target)
  const pad = (hi - lo || 1) * 0.15
  const min = lo - pad
  const max = hi + pad
  const pos = (v: number) => ((v - min) / (max - min)) * 100
  const unit = o.unit === "%" ? "%" : ""
  const h = tall ? "h-20" : "h-9"
  return (
    <span className="inline-flex items-stretch gap-1.5" role="group" aria-label={`${o.name}, last ${results.length} results`}>
      <span className={cn("relative w-7 shrink-0 text-right text-[0.625rem] leading-none tabular-nums text-muted-foreground", h)} aria-hidden="true">
        {pos(o.target) < 78 && <span className="absolute right-0 top-0 -translate-y-1/2">{num(max)}</span>}
        <span className="absolute right-0 -translate-y-1/2 font-semibold text-done" style={{ top: `${100 - pos(o.target)}%` }}>{num(o.target)}</span>
        {pos(o.target) > 22 && <span className="absolute bottom-0 right-0 translate-y-1/2">{num(min)}</span>}
      </span>
      <span className="flex flex-col gap-1">
        <span className={cn("relative flex items-end gap-1 border-b border-l border-border px-1", h)}>
          <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-done" style={{ bottom: `${pos(o.target)}%` }} aria-hidden="true" />
          {results.map((r, i) => {
            const last = i === results.length - 1
            const ok = onTarget(o, r.value)
            const gap = Math.abs(r.value - o.target)
            return (
              <ChartTip
                key={r.period}
                label={`${resultPeriodLabel(r.period)}: ${fmtKpi(o, r.value)}, ${ok ? "on target" : "below target"}`}
                tip={<><span className="font-semibold">{resultPeriodLabel(r.period)}</span> · {fmtKpi(o, r.value)}<br />Target {fmtTarget(o)} · {ok ? "on target" : `${num(gap)}${unit ? " points" : ""} below`}{r.enteredBy ? <><br /><span className="opacity-75">Entered by {r.enteredBy}</span></> : null}</>}
              >
                <span className={cn(TIP_FOCUS, "relative z-[1] rounded-t-[2px]", tall ? "w-4" : "w-2.5", last ? (ok ? "bg-done" : "bg-overdue") : ok ? "bg-input" : "bg-track-late")} style={{ height: `${Math.max(4, pos(r.value))}%` }} />
              </ChartTip>
            )
          })}
        </span>
        <span className="flex gap-1 px-1 text-[0.625rem] leading-none text-muted-foreground" aria-hidden="true">
          {results.map((r) => <span key={r.period} className={cn("text-center", tall ? "w-4" : "w-2.5")}>{tick(r.period)}</span>)}
        </span>
      </span>
    </span>
  )
}

type View = "all" | "below" | "mine"

export default function Objectives() {
  const { state, add, update, remove, user, can, takenIds } = useStore()
  const [view, setView] = React.useState<View>("all")
  const [resultFor, setResultFor] = React.useState<Objective | undefined>()
  const [edit, setEdit] = React.useState<{ open: boolean; o?: Objective }>({ open: false })
  const [showEvidence, setShowEvidence] = React.useState<Objective | undefined>()
  const [f, setF] = React.useState({ name: "", process: startProcess(state.processes), target: "95", unit: "%" as "%" | "score", frequency: (RULES.kpiPeriod === "Quarterly" ? "quarterly" : "monthly") as "monthly" | "quarterly", owner: user.name, evidence: [] as string[], reviewInputs: [] as string[] })
  const canEdit = can("Objectives & KPIs", "Add and edit")
  const all = state.objectives
  const F: Record<View, (o: Objective) => boolean> = { all: () => true, below: (o) => belowTarget(o), mine: (o) => o.owner === user.name }
  const rows = all.filter(F[view])

  function openEdit(o?: Objective) {
    setF({ name: o?.name ?? "", process: o?.process ?? startProcess(state.processes), target: String(o?.target ?? 95), unit: o?.unit ?? "%", frequency: o?.frequency ?? "monthly", owner: o?.owner ?? user.name, evidence: o?.evidence ?? [], reviewInputs: o?.reviewInputs ?? [] })
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
          { id: "n", header: "Objective", cell: (o) => <span className="flex flex-col gap-0.5"><Link to={`/qms/objectives/${o.id}`} className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{o.id}</span><span className="font-medium">{o.name}</span></Link><span className="text-[0.8125rem] text-muted-foreground">{o.process}, measured {o.frequency}</span>{o.evidence?.length ? <button type="button" onClick={() => setShowEvidence(o)} className="flex cursor-pointer items-center gap-1 self-start text-xs font-medium text-primary hover:underline"><PaperclipIcon className="size-3" />{o.evidence.length} evidence item{o.evidence.length > 1 ? "s" : ""}</button> : <span className="text-xs text-muted-foreground">No evidence linked</span>}</span>, className: "min-w-[260px]" },
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
                  <Button variant="quiet" size="sm" onClick={() => setResultFor(o)}>
                    Add result
                  </Button>
                )}
                <RowActions name={o.name} onEdit={canEdit ? () => openEdit(o) : undefined} removeKind={canEdit ? "archive" : undefined} onRemove={() => remove("objectives", o.id)} />
              </span>
            ),
          },
        ]}
      />

      <AddResultDialog objective={resultFor} onOpenChange={(o) => !o && setResultFor(undefined)} />

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
          <Field label="Feeds management review" optional help="Its results show under these inputs in a management review. Every objective is also listed under c2, quality objectives.">
            <ReviewInputPicker value={f.reviewInputs} onChange={(v) => setF({ ...f, reviewInputs: v })} />
          </Field>
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
                if (edit.o) update("objectives", edit.o.id, { name: f.name, process: f.process, owner: f.owner, target, frequency: f.frequency, evidence: f.evidence, reviewInputs: f.reviewInputs })
                else add("objectives", { id: nextId(takenIds("objectives"), "OBJ-2026-", 2), name: f.name, process: f.process, owner: f.owner, target, unit: f.unit, frequency: f.frequency, values: [], results: [], nextResult: "31 Oct", evidence: f.evidence, reviewInputs: f.reviewInputs })
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
                    <Link to={`/evidence/${id}`} className="text-[0.8125rem] font-medium text-primary">{id}</Link>
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

