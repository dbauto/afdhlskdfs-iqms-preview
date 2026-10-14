import { Link } from "react-router-dom"
import { CircleCheckIcon, FileTextIcon, NetworkIcon, TriangleAlertIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { BadgeTone } from "@/components/ui/badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { FigureGrid, PageHeader } from "@/components/app/page"

/** Process health flags shown on the map */
export const PROCESS_FLAG: Record<string, { label: string; tone: BadgeTone }> = {
  "03": { label: "Changes requested", tone: "soon" },
  "04": { label: "Major NC overdue", tone: "overdue" },
  "05": { label: "KPI below target", tone: "soon" },
  "06": { label: "Report late", tone: "overdue" },
  "08": { label: "Verify action", tone: "soon" },
}

/**
 * Sample weekly history for the tracker, oldest week first.
 * g = no open issues, s = due soon or below target, o = overdue, n = no data.
 * The backend will work this out from NCs, KPIs, audits and actions for each process.
 */
export const PROCESS_WEEKS: Record<string, string> = {
  "01": "gggggggggggg",
  "09": "gggsgggggggg",
  "02": "gggggggggggg",
  "03": "ggggggggggss",
  "04": "gggggssooooo",
  "05": "gggggggsgsss",
  "06": "ggggggggggso",
  "07": "nngggggggggg",
  "08": "gggggggggsss",
}

const WEEK = {
  g: { label: "No open issues", cls: "bg-track-ok" },
  s: { label: "Due soon or below target", cls: "bg-track-soon" },
  o: { label: "Overdue", cls: "bg-track-late" },
  n: { label: "No data", cls: "bg-border" },
} as const

const ROW = "grid grid-cols-[36px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1.1fr)_180px_160px] items-center gap-4 px-5"

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
  const { state, can } = useStore()
  const flagged = Object.keys(PROCESS_FLAG).length
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
          { value: flagged, label: "Need attention", badge: "2 overdue", tone: "overdue", icon: TriangleAlertIcon },
          { value: "41 of 41", label: "ISO 9001 requirements given an owner", badge: "Complete", tone: "done", icon: CircleCheckIcon },
          { value: state.documents.length, label: "Controlled documents", badge: "6 overdue", tone: "soon", icon: FileTextIcon, to: "/documents" },
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
              <span role="columnheader" aria-label="Number" />
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
                    const flag = PROCESS_FLAG[p.id]
                    const weeks = PROCESS_WEEKS[p.id] ?? "nnnnnnnnnnnn"
                    return (
                      <Link
                        key={p.id}
                        role="row"
                        to={`/qms/processes/${p.id}`}
                        className={cn(ROW, "border-b border-rule-soft py-3 transition-colors last:border-b-0 hover:bg-background")}
                      >
                        <span className="font-mono text-xs font-semibold text-muted-foreground">{p.id}</span>
                        <span className="text-sm font-semibold">{p.name}</span>
                        <span className="text-[0.8125rem] text-muted-foreground">{p.owner}</span>
                        <span className="text-[0.8125rem] text-muted-foreground">{p.clauses}</span>
                        <WeekTracker weeks={weeks} />
                        <span>
                          {flag ? (
                            <Badge tone={flag.tone}>{flag.label}</Badge>
                          ) : PROCESS_WEEKS[p.id] ? (
                            <Badge tone="done">On track</Badge>
                          ) : (
                            <Badge tone="draft">No data yet</Badge>
                          )}
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
