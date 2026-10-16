import { ContentLink as Link } from "@/components/app/content-link"
import { CircleCheckIcon, FileTextIcon, NetworkIcon, TriangleAlertIcon } from "lucide-react"

import { RemarkMarker } from "@/components/app/remarks"
import { visibleRecords, processHealth, processWeeks, clauseCoverage } from "@/lib/record-figures"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { BadgeTone } from "@/components/ui/badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { FigureGrid, PageHeader } from "@/components/app/page"

const WEEK = {
  g: { label: "No open issues", cls: "bg-track-ok" },
  s: { label: "Due soon or below target", cls: "bg-track-soon" },
  o: { label: "Overdue", cls: "bg-track-late" },
  n: { label: "No data", cls: "bg-border" },
} as const

const ROW = "grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_180px_160px] items-center gap-4 px-5"

function WeekTracker({ weeks }: { weeks: string }) {
  const total = weeks.length
  return (
    <span className="flex gap-0.5">
      {weeks.split("").map((w, i) => {
        const k = (w in WEEK ? w : "n") as keyof typeof WEEK
        const ago = total - 1 - i
        return (
          <i
            key={i}
            className={cn("h-[22px] flex-1 rounded-[2px]", WEEK[k].cls)}
            title={`${ago === 0 ? "This week" : ago === 1 ? "Last week" : `${ago} weeks ago`}: ${WEEK[k].label}`}
          />
        )
      })}
    </span>
  )
}

export default function Processes() {
  const { state: scoped, can, canSee } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const flagged = state.processes.filter(p => ["o", "s"].includes(processHealth(state, p).code)).length
  const bands = (["Management", "Core", "Support"] as const).map((b) => ({ name: b, items: state.processes.filter((p) => p.band === b) }))

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS" }, { label: "Processes" }]}
        title="Processes"
        description="How the business works as a set of processes, who owns each, and which ISO 9001 clauses each one covers. Clause 4.4."
        actions={can("Processes", "Manage") && <Button variant="outline" asChild><Link to="/settings/process-structure">Edit process structure</Link></Button>}
      />
      <FigureGrid
        figures={[
          { value: state.processes.length, label: "Processes in the QMS", badge: "All have owners", tone: "done", icon: NetworkIcon },
          { value: flagged, label: "Need attention", badge: `${state.processes.filter(p => processHealth(state, p).code === "o").length} overdue`, tone: "overdue", icon: TriangleAlertIcon },
          { value: coverage.hasData ? `${coverage.current} of ${coverage.total}` : "No data", label: "Requirements with linked evidence", badge: "Linked references", tone: "done", icon: CircleCheckIcon },
          { value: state.documents.length, label: "Controlled documents", badge: `${state.documents.filter(d => d.reviewOverdue).length} overdue`, tone: "soon", icon: FileTextIcon, to: "/documents" },
        ]}
      />

      <Card className="gap-0 overflow-hidden p-0">
        <CardHeader className="border-b px-5 py-4">
          <CardTitle>Process map</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">Customer requirements in, satisfied customers out</span>
        </CardHeader>
        <div className="overflow-x-auto">
          <div className="min-w-[900px]" role="table" aria-label="Processes">
            <div role="row" className={cn(ROW, "py-2.5 text-xs font-semibold text-muted-foreground")}>
              <span role="columnheader">Process</span>
              <span role="columnheader">Owner</span>
              <span role="columnheader">ISO 9001 clauses</span>
              <span role="columnheader">Last 12 weeks</span>
              <span role="columnheader">Status</span>
            </div>
            {bands.map((b) =>
              b.items.length === 0 ? null : (
                <div key={b.name} role="rowgroup">
                  <div className="border-y bg-background px-5 py-2 text-xs font-semibold text-muted-foreground">
                    {b.name === "Core" ? "Core, in order of flow" : b.name}
                  </div>
                  {b.items.map((p) => {
                    const flag = processHealth(state, p)
                    const weeks = processWeeks(state, p)
                    return (
                      <Link
                        key={p.id}
                        role="row"
                        to={`/qms/processes/${p.id}`}
                        className={cn(ROW, "border-b border-rule-soft py-3 transition-colors last:border-b-0 hover:bg-background")}
                      >
                        <span className="flex items-center gap-2"><span className="text-sm font-semibold">{p.name}</span><RemarkMarker kind="Process" id={p.id} /></span>
                        <span className="text-[0.8125rem] text-muted-foreground">{p.owner}</span>
                        <span className="text-[0.8125rem] text-muted-foreground">{p.clauses}</span>
                        <WeekTracker weeks={weeks} />
                        <span>
                          <Badge tone={flag.tone}>{flag.label}</Badge>
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 border-t px-5 py-3 text-xs text-muted-foreground">
          {(Object.keys(WEEK) as (keyof typeof WEEK)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i className={cn("size-2.5 rounded-[2px]", WEEK[k].cls)} />
              {WEEK[k].label}
            </span>
          ))}
        </div>
      </Card>
    </>
  )
}
