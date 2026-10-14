import { Link } from "react-router-dom"
import { CircleCheckIcon, FileTextIcon, NetworkIcon, TriangleAlertIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { BadgeTone } from "@/components/ui/badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader } from "@/components/app/page"

/** Process health flags shown on the map */
export const PROCESS_FLAG: Record<string, { label: string; tone: BadgeTone }> = {
  "03": { label: "Changes requested", tone: "soon" },
  "04": { label: "Major NC overdue", tone: "overdue" },
  "05": { label: "KPI below target", tone: "soon" },
  "06": { label: "Report late", tone: "overdue" },
  "08": { label: "Verify action", tone: "soon" },
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

      <Card>
        <CardHeader>
          <CardTitle>Process map</CardTitle>
          <span className="text-[13px] text-muted-foreground">Customer requirements in, satisfied customers out</span>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {bands.map((b) => (
            <div key={b.name} className={cn("grid grid-cols-1 gap-3 rounded-md p-3 md:grid-cols-[110px_minmax(0,1fr)]", b.name === "Core" ? "bg-accent" : "bg-background")}>
              <span className="self-center text-[13px] font-semibold text-muted-foreground">{b.name}</span>
              <div className={cn("grid gap-3", b.name === "Core" ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2")}>
                {b.items.map((p) => {
                  const flag = PROCESS_FLAG[p.id]
                  return (
                    <Link
                      key={p.id}
                      to={`/qms/processes/${p.id}`}
                      className={cn("flex flex-col gap-1.5 rounded-md border bg-card p-3.5 transition-colors hover:border-input", flag?.tone === "overdue" && "border-[#f2cbc7]")}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">{p.id}</span>
                        {flag && <span className={cn("mt-1 size-2 rounded-full", flag.tone === "overdue" ? "bg-overdue" : "bg-[#d99a2b]")} title={flag.label} />}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.owner}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <DataTable
        label="Processes"
        rows={state.processes}
        getRowId={(p) => p.id}
        minWidth={900}
        columns={[
          { id: "n", header: "Process", cell: (p) => <Link to={`/qms/processes/${p.id}`} className="font-medium text-primary"><span className="text-muted-foreground">{p.id}</span> {p.name}</Link> },
          { id: "o", header: "Owner", cell: (p) => p.owner },
          { id: "c", header: "ISO 9001 clauses", cell: (p) => <span className="text-muted-foreground">{p.clauses}</span> },
          { id: "d", header: "Documents", cell: (p) => state.documents.filter((d) => d.process === p.name).length },
          { id: "r", header: "Risks", cell: (p) => state.risks.filter((r) => r.process === p.name && r.kind === "Risk").length },
          { id: "s", header: "Needs attention", cell: (p) => (PROCESS_FLAG[p.id] ? <Badge tone={PROCESS_FLAG[p.id].tone}>{PROCESS_FLAG[p.id].label}</Badge> : <span className="text-muted-foreground">Nothing</span>) },
        ]}
      />
    </>
  )
}
