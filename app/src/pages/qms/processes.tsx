import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CircleCheckIcon, FileTextIcon, NetworkIcon, TriangleAlertIcon } from "lucide-react"

import { RemarkMarker } from "@/components/app/remarks"
import { visibleRecords, processHealth, processWeeks, clauseCoverage } from "@/lib/record-figures"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { ProcessCoverArt } from "@/components/app/process-cover"
import type { Process } from "@/data/types"

const WEEK = {
  g: { label: "No open issues", cls: "bg-track-ok" },
  s: { label: "Due soon or below target", cls: "bg-track-soon" },
  o: { label: "Overdue", cls: "bg-track-late" },
  n: { label: "No data", cls: "bg-border" },
} as const

const WEEK_PLAIN = { g: "No open issues", s: "Needs attention", o: "Overdue", n: "No data" } as const

/** How long the process has been in its current state, in plain words. */
function streakOf(weeks: string, label: string) {
  const codes = weeks.split("")
  const now = codes.at(-1) ?? "n"
  let run = 0
  for (let i = codes.length - 1; i >= 0 && codes[i] === now; i--) run++
  const span = run >= codes.length ? `for ${codes.length} weeks or more` : `for ${run} week${run === 1 ? "" : "s"}`
  if (now === "g") return `No open issues ${span}`
  if (now === "o") return `Overdue ${span}`
  if (now === "n") return "No data yet"
  return `${label === "KPI below target" ? "Below target" : "Needs attention"} ${span}`
}

function WeekSquares({ weeks }: { weeks: string }) {
  const total = weeks.length
  const codes = weeks.split("").map((w) => (w in WEEK ? w : "n") as keyof typeof WEEK)
  return (
    <span role="img" aria-label={`Last ${total} weeks, oldest first: ${codes.map((k) => WEEK_PLAIN[k].toLowerCase()).join(", ")}`} className="flex gap-[3px]">
      {codes.map((k, i) => {
        const ago = total - 1 - i
        return <i key={i} className={cn("h-3.5 flex-1 rounded-[3px]", WEEK[k].cls)} title={`${ago === 0 ? "This week" : ago === 1 ? "Last week" : `${ago} weeks ago`}: ${WEEK[k].label}`} />
      })}
    </span>
  )
}

type Band = "All" | Process["band"]

export default function Processes() {
  const { state: scoped, can, canSee } = useStore()
  const state = visibleRecords(scoped, canSee)
  const coverage = clauseCoverage(state, canSee)
  const flagged = state.processes.filter(p => ["o", "s"].includes(processHealth(state, p).code)).length
  const [band, setBand] = React.useState<Band>("All")
  const order: Process["band"][] = ["Management", "Core", "Support"]
  const shown = order.flatMap((b) => state.processes.filter((p) => p.band === b && (band === "All" || band === b)))

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewChips<Band>
          value={band}
          onChange={setBand}
          views={(["All", ...order] as Band[]).map((b) => ({ id: b, label: b === "Core" ? "Core" : b, count: b === "All" ? state.processes.length : state.processes.filter((p) => p.band === b).length }))}
        />
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {(Object.keys(WEEK) as (keyof typeof WEEK)[]).map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <i className={cn("size-2.5 rounded-[2px]", WEEK[k].cls)} />
              {WEEK_PLAIN[k]}
            </span>
          ))}
          <span>Each square is one week.</span>
        </span>
      </div>

      <ul aria-label="Processes" className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.5rem),1fr))] gap-4">
        {shown.map((p) => {
          const flag = processHealth(state, p)
          const weeks = processWeeks(state, p)
          const docs = state.documents.filter((d) => d.process === p.name).length
          const ncs = state.ncs.filter((n) => n.process === p.name && n.stage < 6).length
          return (
            <li key={p.id} className="flex">
              <Link
                to={`/qms/processes/${p.id}`}
                aria-label={`${p.name}, ${flag.label}`}
                className="group flex w-full flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="relative block h-32 shrink-0">
                  <ProcessCoverArt process={p} className="size-full" />
                  <Badge tone={flag.tone} className="absolute right-3 top-3 shadow-sm">{flag.label}</Badge>
                  <Avatar name={p.owner} size={36} className="absolute -bottom-[18px] left-5 ring-2 ring-card" />
                </span>
                <span className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-7">
                  <span className="flex flex-col gap-1">
                    <span className="text-[0.8125rem] text-muted-foreground">{p.band} · Clauses {p.clauses}</span>
                    <span className="flex items-center gap-2 text-[1.0625rem] font-semibold leading-snug group-hover:text-primary">
                      {p.name}
                      <RemarkMarker kind="Process" id={p.id} />
                    </span>
                    <span className="text-[0.8125rem] text-muted-foreground">{p.owner}</span>
                  </span>
                  <span className="flex flex-col gap-2">
                    <span className="text-sm font-medium">{streakOf(weeks, flag.label)}</span>
                    <WeekSquares weeks={weeks} />
                  </span>
                  <span className="mt-auto border-t border-rule-soft pt-3 text-[0.8125rem] text-muted-foreground">
                    {docs} document{docs === 1 ? "" : "s"} · {ncs ? `${ncs} open nonconformit${ncs === 1 ? "y" : "ies"}` : "no open nonconformities"}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
