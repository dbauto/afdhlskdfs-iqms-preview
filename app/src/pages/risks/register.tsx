import * as React from "react"
import { CircleCheckIcon, ListChecksIcon, PlusIcon, ShieldAlertIcon, SparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { nextId, useStore } from "@/lib/store"
import { RULES } from "@/lib/rules"
import { cn } from "@/lib/utils"
import type { Risk } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { RemarkMarker, RemarksSheet } from "@/components/app/remarks"
import { DataTable, type Column } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { RiskLevel, riskLevel } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { ChipChoice, Field, PeopleOptions, ProcessOptions } from "@/components/app/form"

type View = "all" | "risks" | "opps" | "overdue" | "high"

const LIK = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"]
const IMP_RISK = ["Minor", "Small", "Moderate", "Major", "Severe"]
const IMP_OPP = ["Small", "Some", "Useful", "Large", "Very large"]
const TREAT_RISK = ["Reduce it", "Avoid it", "Share or transfer it", "Accept it"] as const
const TREAT_OPP = ["Pursue it", "Explore further", "Not now"] as const

function Scale({ label, labels, value, onChange }: { label: string; labels: string[]; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
        {labels.map((l, i) => {
          const n = i + 1
          const on = n === value
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(n)}
              className={cn("flex cursor-pointer flex-col items-center gap-0.5 rounded-sm border px-1 py-2 text-center", on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card hover:bg-background")}
            >
              <span className="text-sm font-semibold">{n}</span>
              <span className={cn("text-[0.6875rem] leading-tight", on ? "text-primary-foreground/85" : "text-muted-foreground")}>{l}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function RiskSheet({ open, onOpenChange, risk, defaultProcess }: { open: boolean; onOpenChange: (v: boolean) => void; risk?: Risk; /** pre-fills the process (and its owner) when adding from a process page */ defaultProcess?: string }) {
  const { state, add, update, user } = useStore()
  const [kind, setKind] = React.useState<"Risk" | "Opportunity">("Risk")
  const [title, setTitle] = React.useState("")
  const [process, setProcess] = React.useState("Inspection & release")
  const [source, setSource] = React.useState("Internal audit IA-2026-06")
  const [l, setL] = React.useState(3)
  const [i, setI] = React.useState(4)
  const [treatment, setTreatment] = React.useState<string>("Reduce it")
  const [action, setAction] = React.useState("")
  const [owner, setOwner] = React.useState("Ana Cruz")
  const [review, setReview] = React.useState("")
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!open) return
    setError("")
    setKind(risk?.kind ?? "Risk")
    setTitle(risk?.title ?? "")
    setProcess(risk?.process ?? defaultProcess ?? "Inspection & release")
    setL(risk?.likelihood ?? 3)
    setI(risk?.impact ?? 4)
    setTreatment(risk?.treatment ?? "Reduce it")
    setAction(risk?.action ?? "")
    setOwner(risk?.owner ?? state.processes.find((p) => p.name === defaultProcess)?.owner ?? user.name)
    setReview("")
  }, [open, risk, user.name, defaultProcess])

  const lvl = riskLevel({ likelihood: l, impact: i, kind })
  const help = kind === "Opportunity" ? "Opportunities are ranked by benefit, not danger." : lvl.label === "High" ? "Needs an action and a review within 3 months." : lvl.label === "Medium" ? "Needs an action or a clear reason to accept it." : "Can be accepted and reviewed once a year."

  function save() {
    if (!title.trim()) return setError(`Describe the ${kind.toLowerCase()} in a sentence.`)
    const patch = { title: title.trim(), kind, process, likelihood: l, impact: i, treatment, action: action.trim() || treatment, owner, review: review || "In 3 months" }
    if (risk) {
      update("risks", risk.id, patch)
      toast(`${risk.id} saved`)
    } else {
      const id = nextId(state.risks.map((r) => r.id), kind === "Risk" ? "R-" : "O-")
      add("risks", { id, ...patch, source })
      toast(`${id} added`, { description: `${owner} owns it.` })
    }
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{risk ? `Edit ${risk.id}` : "Add risk or opportunity"}</SheetTitle>
          <SheetDescription>ISO 9001 clause 6.1. The rating updates as you choose likelihood and impact.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          {!risk && (
            <Field label="This is a">
              <ChipChoice
                label="This is a"
                options={["Risk", "Opportunity"] as const}
                value={kind}
                onChange={(v) => {
                  setKind(v)
                  setTreatment(v === "Risk" ? "Reduce it" : "Pursue it")
                }}
              />
            </Field>
          )}
          <Field label={kind === "Risk" ? "What could go wrong" : "What could go better"} htmlFor="r-title" error={error}>
            <Input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!error} placeholder={kind === "Risk" ? "Concessions released without customer agreement" : "Digital goods-in checks"} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Process" htmlFor="r-proc">
              <NativeSelect id="r-proc" value={process} onChange={(e) => setProcess(e.target.value)}>
                <ProcessOptions />
              </NativeSelect>
            </Field>
            <Field label="Found through" htmlFor="r-src" optional>
              <Input id="r-src" value={source} onChange={(e) => setSource(e.target.value)} />
            </Field>
          </div>
          <div className="flex flex-col gap-4 rounded-md border p-4">
            <Scale label="Likelihood" labels={LIK} value={l} onChange={setL} />
            <Scale label={kind === "Risk" ? "Impact" : "Benefit"} labels={kind === "Risk" ? IMP_RISK : IMP_OPP} value={i} onChange={setI} />
            <div className="flex flex-wrap items-center gap-3 border-t pt-4" aria-live="polite">
              <span className="text-2xl font-semibold">{lvl.score}</span>
              <Badge tone={lvl.tone}>{kind === "Risk" ? `${lvl.label} risk` : lvl.label}</Badge>
              <span className="text-[0.8125rem] text-muted-foreground">{help}</span>
            </div>
          </div>
          <Field label="What will you do about it?">
            <ChipChoice label="Treatment" options={kind === "Risk" ? TREAT_RISK : TREAT_OPP} value={treatment as never} onChange={setTreatment} />
          </Field>
          <Field label="Action" htmlFor="r-action" optional>
            <Textarea id="r-action" value={action} onChange={(e) => setAction(e.target.value)} className="min-h-20" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Owner" htmlFor="r-owner">
              <NativeSelect id="r-owner" value={owner} onChange={(e) => setOwner(e.target.value)}>
                <PeopleOptions />
              </NativeSelect>
            </Field>
            <Field label="Review again by" htmlFor="r-review">
              <Input id="r-review" type="date" value={review} onChange={(e) => setReview(e.target.value)} />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>{risk ? "Save changes" : `Add ${kind.toLowerCase()}`}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Matrix({ risks }: { risks: Risk[] }) {
  const only = risks.filter((r) => r.kind === "Risk")
  return (
    <div className="flex gap-3">
      <span className="flex items-center text-xs text-muted-foreground [writing-mode:vertical-rl] rotate-180">Impact</span>
      <div className="flex flex-1 flex-col gap-2">
        <div className="grid grid-cols-5 gap-1" role="table" aria-label="Risk matrix">
          {[5, 4, 3, 2, 1].map((imp) =>
            [1, 2, 3, 4, 5].map((lik) => {
              const n = only.filter((r) => r.likelihood === lik && r.impact === imp).length
              const s = lik * imp
              return (
                <span
                  key={`${lik}-${imp}`}
                  role="cell"
                  aria-label={`${n} risks, likelihood ${lik}, impact ${imp}`}
                  className={cn(
                    "flex aspect-[1.6] items-center justify-center rounded-[4px] text-sm font-semibold",
                    s >= RULES.riskHigh ? (n ? "bg-overdue-strong text-overdue" : "bg-overdue-tint") : s >= RULES.riskMedium ? (n ? "bg-soon-strong text-soon" : "bg-soon-tint") : n ? "bg-border text-muted-foreground" : "bg-background"
                  )}
                >
                  {n || ""}
                </span>
              )
            })
          )}
        </div>
        <span className="text-center text-xs text-muted-foreground">Likelihood</span>
      </div>
    </div>
  )
}

export default function Risks() {
  const { state, can, update } = useStore()
  const [view, setView] = React.useState<View>("all")
  const [sheet, setSheet] = React.useState<{ open: boolean; risk?: Risk }>({ open: false })
  const [remarksFor, setRemarksFor] = React.useState<Risk | undefined>()
  const canAdd = can("Risks & Opportunities", "Add and edit")
  const all = state.risks
  const F: Record<View, (r: Risk) => boolean> = {
    all: () => true,
    risks: (r) => r.kind === "Risk",
    opps: (r) => r.kind === "Opportunity",
    overdue: (r) => !!r.late,
    high: (r) => r.kind === "Risk" && riskLevel(r).label === "High",
  }
  const rows = [...all.filter(F[view])].sort((a, b) => b.likelihood * b.impact - a.likelihood * a.impact)

  const columns: Column<Risk>[] = [
    {
      id: "t",
      header: "Risk or opportunity",
      cell: (r) => (
        <button type="button" onClick={() => setSheet({ open: true, risk: r })} className="flex cursor-pointer flex-col gap-0.5 text-left">
          <span className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-primary">{r.id}</span><RemarkMarker kind="Risk" id={r.id} onClick={() => setRemarksFor(r)} /></span>
          <span className="font-medium">{r.title}</span>
          <span className="text-xs text-muted-foreground">{r.kind}</span>
        </button>
      ),
      className: "min-w-[240px]",
    },
    { id: "p", header: "Process", cell: (r) => <span className="text-muted-foreground">{r.process}</span>, className: "min-w-[130px]" },
    { id: "s", header: "Rating", cell: (r) => <RiskLevel risk={r} /> },
    { id: "a", header: "Treatment", className: "min-w-[190px]", cell: (r) => <span className="flex flex-col"><span>{r.treatment}</span>{r.action !== r.treatment && <span className="text-xs text-muted-foreground">{r.action}</span>}</span> },
    {
      id: "o",
      header: "Owner, review by",
      cell: (r) => (
        <span className="flex flex-col gap-0.5 whitespace-nowrap">
          <span>{r.owner}</span>
          <span className={r.late ? "text-[0.8125rem] font-semibold text-overdue" : "text-[0.8125rem] text-muted-foreground"}>{r.review === "Archived" ? "Archived" : r.late ? `Review late, ${r.review}` : `Review ${r.review.replace(/^In /, "in ")}`}</span>
        </span>
      ),
    },
    {
      id: "x",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (r) => (
        <RowActions
          name={r.id}
          onEdit={canAdd ? () => setSheet({ open: true, risk: r }) : undefined}
          extra={[{ label: "Consultant remarks", onSelect: () => setRemarksFor(r) }, ...(canAdd ? [{ label: "Mark reviewed today", icon: <CircleCheckIcon />, onSelect: () => { update("risks", r.id, { late: false, review: "In 12 months" }); toast(`${r.id} reviewed`) } }] : [])]}
          removeKind={canAdd ? "archive" : undefined}
          onRemove={() => update("risks", r.id, { treatment: "Closed", review: "Archived" })}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Risks & Opportunities"
        description="What could stop the QMS reaching its results, what could help, and what is being done. ISO 9001 clause 6.1."
        actions={
          canAdd && (
            <Button onClick={() => setSheet({ open: true })}>
              <PlusIcon /> Add risk or opportunity
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: all.filter((r) => r.kind === "Risk").length, label: "Open risks", badge: `${all.filter(F.high).length} high`, tone: "overdue", icon: ShieldAlertIcon },
          { value: all.filter((r) => r.kind === "Opportunity").length, label: "Opportunities being pursued", badge: "2 started", tone: "progress", icon: SparklesIcon },
          { value: 11, label: "Treatments in progress", badge: `${all.filter(F.overdue).length} overdue`, tone: "overdue", icon: ListChecksIcon },
          { value: `${all.length - all.filter(F.overdue).length} of ${all.length}`, label: "Reviewed in the last 12 months", badge: "On track", tone: "done", icon: CircleCheckIcon },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Risk matrix</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Risks only</span>
          </CardHeader>
          <CardContent>
            <Matrix risks={all} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Highest risks</CardTitle>
          </CardHeader>
          <ul>
            {rows
              .filter((r) => r.kind === "Risk")
              .slice(0, 4)
              .map((r, i) => (
                <li key={r.id} className={cn("flex items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <RiskLevel risk={r} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{r.title}</span>
                    <span className="truncate text-[0.8125rem] text-muted-foreground">
                      {r.id}, {r.process}, {r.action}
                    </span>
                  </span>
                  <span className={cn("text-[0.8125rem] whitespace-nowrap", r.late ? "font-semibold text-overdue" : "text-muted-foreground")}>{r.review}</span>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <ViewChips
        value={view}
        onChange={setView}
        views={[
          { id: "all", label: "All", count: all.length },
          { id: "risks", label: "Risks", count: all.filter(F.risks).length },
          { id: "opps", label: "Opportunities", count: all.filter(F.opps).length },
          { id: "high", label: "High", count: all.filter(F.high).length },
          { id: "overdue", label: "Review overdue", count: all.filter(F.overdue).length, warn: true },
        ]}
      />
      <DataTable label="Risks and opportunities" rows={rows} columns={columns} getRowId={(r) => r.id} minWidth={900} />
      <RiskSheet open={sheet.open} risk={sheet.risk} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} />
      <RemarksSheet target={remarksFor ? { kind: "Risk", id: remarksFor.id, label: `${remarksFor.id} ${remarksFor.title}`, to: "/risks", area: "Risks & Opportunities" } : undefined} onClose={() => setRemarksFor(undefined)} />
    </>
  )
}
