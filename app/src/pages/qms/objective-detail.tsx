import * as React from "react"
import { useParams } from "react-router-dom"
import { PlusIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { formatDate, resultPeriodLabel } from "@/lib/periods"
import { fmtKpi, fmtTarget, hasData, onTarget, resultsOf } from "@/data/records"
import { REVIEW_INPUTS } from "@/data/reviews"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/app/data-table"
import { KeyFacts, MetaLine, PageHeader, RecordLayout } from "@/components/app/page"
import { RecordLink } from "@/components/app/record-link"
import NotFound from "@/pages/not-found"
import { Sparkbars } from "./objectives"
import { AddResultDialog } from "./objective-result"

/** One quality objective or KPI: target, results by period, owner, process and evidence. */
export default function ObjectiveDetail() {
  const { id } = useParams()
  const { state, can, canSee } = useStore()
  const o = state.objectives.find((x) => x.id === id)
  const [adding, setAdding] = React.useState(false)
  // state is already narrowed to the processes this person may see
  if (!o || !can("Objectives & KPIs")) return <NotFound />
  const canEdit = can("Objectives & KPIs", "Add and edit")
  const results = resultsOf(o).reverse()
  const evidence = (o.evidence ?? []).map((e) => state.evidence.find((x) => x.id === e)).filter((e) => !!e && canSee(e.classification, [], e.addedBy))
  const feeds = ["c2", ...(o.reviewInputs ?? [])].map((r) => REVIEW_INPUTS.find((i) => i.ref === r)).filter((i) => !!i)
  const state_ = !hasData(o) ? { label: "No data", tone: "draft" as const } : onTarget(o) ? { label: "On target", tone: "done" as const } : { label: "Below target", tone: "overdue" as const }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Objectives & KPIs", to: "/qms/objectives" }, { label: o.id }]}
        title={o.name}
        badge={<Badge tone={state_.tone}>{state_.label}</Badge>}
        meta={<MetaLine parts={[o.id, o.process, `Measured ${o.frequency}`]} />}
        actions={
          canEdit && (
            <Button onClick={() => setAdding(true)}>
              <PlusIcon /> Add result
            </Button>
          )
        }
      />
      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Latest results</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">Clause 9.1</span>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-8">
                <span className="flex flex-col gap-1">
                  <span className={cn("text-[1.75rem] font-semibold leading-none", !hasData(o) ? "text-muted-foreground" : onTarget(o) ? "text-done" : "text-overdue")}>{fmtKpi(o)}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">{results[0] ? resultPeriodLabel(results[0].period) : "No result entered yet"}</span>
                </span>
                <Sparkbars o={o} />
              </CardContent>
            </Card>
            <DataTable
              label="Results by period"
              rows={results}
              getRowId={(r) => r.period}
              minWidth={560}
              empty={{ title: "No results yet", body: "Each month or quarter shows here once its result is entered. A period without a result is No data, never zero." }}
              columns={[
                { id: "p", header: o.frequency === "quarterly" ? "Quarter" : "Month", cell: (r) => <span className="font-medium whitespace-nowrap">{resultPeriodLabel(r.period)}</span> },
                { id: "v", header: "Result", cell: (r) => <span className={cn("font-semibold", onTarget(o, r.value) ? "text-done" : "text-overdue")}>{fmtKpi(o, r.value)}</span> },
                { id: "t", header: "Against target", cell: (r) => <Badge tone={onTarget(o, r.value) ? "done" : "overdue"}>{onTarget(o, r.value) ? "On target" : "Below target"}</Badge> },
                { id: "e", header: "Entered", cell: (r) => <span className="flex flex-col whitespace-nowrap"><span>{formatDate(r.enteredOn)}</span>{r.enteredBy && <span className="text-xs text-muted-foreground">{r.enteredBy}</span>}</span> },
                { id: "ev", header: "Evidence", cell: (r) => (r.evidence?.length ? <span className="flex flex-wrap gap-x-2">{r.evidence.map((e) => <RecordLink key={e} kind="evidence" id={e} className="text-[0.8125rem]" />)}</span> : <span className="text-muted-foreground">None</span>) },
              ]}
            />
          </>
        }
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Target", v: fmtTarget(o) },
                    { k: "Owner", v: o.owner },
                    { k: "Process", v: o.process },
                    { k: "Measured", v: o.frequency === "monthly" ? "Monthly" : "Quarterly" },
                    { k: "Next result", v: o.nextResult },
                    { k: "Management review", v: feeds.map((i) => `${i!.ref} ${i!.name}`).join("; ") },
                  ]}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Supporting evidence</CardTitle>
              </CardHeader>
              <ul>
                {evidence.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No evidence linked yet.</li>}
                {evidence.map((e, i) => (
                  <li key={e!.id} className={cn("flex flex-col gap-0.5 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                    <RecordLink kind="evidence" id={e!.id} className="self-start text-[0.8125rem]" />
                    <span className="text-sm">{e!.title}</span>
                    <span className="text-xs text-muted-foreground">Added {e!.added} by {e!.addedBy}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
      />
      <AddResultDialog objective={adding ? o : undefined} onOpenChange={setAdding} />
    </>
  )
}
