import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ALERTS, ALERT_RULES, BUSIEST, ERRORS_ALERT_LINE, ERRORS_PER_HOUR, ERROR_GROUPS, ERROR_KPIS, HOURS, RELEASE_MARK, TRACE, type ErrorGroup } from "@/data/observability"
import { DataTable } from "@/components/app/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlatformAccess } from "@/lib/platform-access"
import { PlatformHeader } from "./shell"
import { BarChart, KpiRow, Legend, OpsFilters, Segmented, Spark, TableTitle } from "./ops-kit"

const STATE_TONE = { New: "overdue", Recurring: "soon", Resolved: "done" } as const
const STEP_BAR = { primary: "bg-primary", done: "bg-done", overdue: "bg-overdue", faint: "bg-faint" } as const

export default function Errors() {
  const canAct = usePlatformAccess().can("deploy")
  const [org, setOrg] = React.useState("")
  const [acked, setAcked] = React.useState<string[]>([])
  const [state, setState] = React.useState<"All" | ErrorGroup["state"]>("All")
  const groups = ERROR_GROUPS.filter((g) => state === "All" || g.state === state)
  return (
    <>
      <PlatformHeader
        eyebrow="Operations"
        title="Errors and alerts"
        description="What is failing, how often, since which release, and who has been told. Open an error to follow one request end to end."
        actions={<OpsFilters orgs={BUSIEST.map((b) => b.name)} org={org} setOrg={setOrg} />}
      />
      <KpiRow items={ERROR_KPIS} />
      <DataTable
        label="Open alerts"
        toolbar={<TableTitle title="Open alerts" note="Critical alerts page the person on call; they never go to the AI queue." />}
        rows={ALERTS}
        getRowId={(a) => a.id}
        minWidth={900}
        empty={{ title: "No open alerts", body: "Alerts show here when a rule below is met." }}
        columns={[
          { id: "s", header: "Severity", className: "w-28", cell: (a) => <Badge tone={a.severity === "Critical" ? "overdue" : "soon"}>{a.severity}</Badge> },
          { id: "r", header: "Alert", cell: (a) => <span className="flex flex-col"><span className="font-medium">{a.rule}</span><span className="text-xs text-muted-foreground">{a.detail}</span></span> },
          { id: "t", header: "Started", cell: (a) => <span className="whitespace-nowrap text-muted-foreground">{a.started}</span> },
          { id: "w", header: "Who was told", cell: (a) => (acked.includes(a.id) ? <Badge tone="done">Acknowledged</Badge> : a.told) },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-px whitespace-nowrap",
            cell: (a) => (
              <span className="flex justify-end gap-1.5">
                <Button variant="outline" size="sm" asChild><Link to={a.logs}>Open logs</Link></Button>
                {canAct && !acked.includes(a.id) && <Button variant="outline" size="sm" onClick={() => { setAcked((x) => [...x, a.id]); toast("Alert acknowledged") }}>Acknowledge</Button>}
                {canAct && <Button variant="quiet" size="sm" onClick={() => toast("Snoozed for 1 hour")}>Snooze 1 h</Button>}
              </span>
            ),
          },
        ]}
      />
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <span className="flex flex-col">
              <CardTitle>Server errors per hour</CardTitle>
              <span className="text-xs text-muted-foreground">Releases are marked; red bars are above the alert line.</span>
            </span>
          </CardHeader>
          <div className="flex flex-col gap-3 px-5 pb-4 pt-3">
            <BarChart
              values={ERRORS_PER_HOUR}
              labels={HOURS.map((h) => h.slice(0, 2))}
              max={25}
              steps={5}
              height="h-64"
              label="Server errors per hour"
              limit={{ value: ERRORS_ALERT_LINE, label: "Alert line" }}
              marker={{ index: RELEASE_MARK.hour, label: RELEASE_MARK.label }}
              barClass={(_, v) => (v > ERRORS_ALERT_LINE ? "bg-overdue" : "bg-primary")}
              tip={(i) => <><span className="font-semibold">{HOURS[i]}</span><br />{ERRORS_PER_HOUR[i]} server errors</>}
            />
            <Legend items={[{ label: "Server errors", className: "bg-primary" }, { label: "Above the alert line", className: "bg-overdue" }, { label: "Release", className: "border-soon", dashed: true }]} />
          </div>
        </Card>
        <DataTable
          label="Alert rules"
          toolbar={<TableTitle title="Alert rules" note="From the backend plan. Changing a rule needs a second platform admin." />}
          rows={ALERT_RULES}
          getRowId={(r) => r.id}
          minWidth={520}
          columns={[
            { id: "r", header: "Rule", cell: (r) => r.rule },
            { id: "w", header: "When", cell: (r) => r.when },
            { id: "h", header: "Who hears", cell: (r) => r.who },
          ]}
        />
      </div>
      <DataTable
        label="Error groups"
        toolbar={<><TableTitle title="Error groups" note="The same error from many requests is grouped once. IDs only, never record contents." /><Segmented label="State" options={["All", "New", "Recurring", "Resolved"] as const} value={state} onChange={setState} /></>}
        rows={groups}
        getRowId={(g) => g.id}
        minWidth={900}
        empty={{ title: "No errors here" }}
        columns={[
          { id: "s", header: "State", className: "w-28", cell: (g) => <Badge tone={STATE_TONE[g.state]}>{g.state}</Badge> },
          { id: "m", header: "Error", cell: (g) => <span className="flex flex-col"><span className="font-medium">{g.message}</span><span className="font-mono text-xs text-muted-foreground">{g.where}</span></span> },
          { id: "o", header: "Organisations", cell: (g) => g.orgs },
          { id: "f", header: "First seen in", cell: (g) => <span className="font-mono text-[0.8125rem]">{g.since}</span> },
          { id: "c", header: "24 h", cell: (g) => g.count },
          { id: "t", header: "Trend", cell: (g) => <Spark values={g.trend} className={g.state === "New" ? "stroke-overdue" : g.state === "Recurring" ? "stroke-soon-bar" : "stroke-done"} /> },
        ]}
      />
      <DataTable
        label={`Request trace ${TRACE.requestId}`}
        toolbar={
          <>
            <TableTitle title={`Request trace · ${TRACE.requestId}`} note={`One request from the click to the database, outbox, queue and email. ${TRACE.meta}.`} />
            <Button variant="outline" size="sm" asChild><Link to="/platform/logs?org=Meridian%20Clinics">Open in logs</Link></Button>
            <Button variant="outline" size="sm" onClick={() => { void navigator.clipboard?.writeText(TRACE.requestId); toast("Request ID copied") }}>Copy request ID</Button>
          </>
        }
        rows={TRACE.steps}
        getRowId={(s) => s.id}
        minWidth={820}
        columns={[
          { id: "s", header: "Step", className: "w-40", cell: (s) => <span className="font-medium">{s.step}</span> },
          { id: "w", header: "What happened", cell: (s) => <span className="font-mono text-[0.8125rem]">{s.what}</span> },
          { id: "a", header: "At", className: "w-20 text-right", headClassName: "text-right", cell: (s) => (s.at === null ? "None" : `${s.at} ms`) },
          {
            id: "b",
            header: `0 – ${TRACE.windowMs} ms`,
            className: "w-[38%]",
            cell: (s) => (
              <span className="relative block h-3.5 rounded-[3px] bg-secondary" aria-label={s.at === null ? "Did not run" : `${s.duration} ms from ${s.at} ms`}>
                {s.at !== null && <span className={cn("absolute inset-y-0 rounded-[3px]", STEP_BAR[s.tone])} style={{ left: `${(s.at / TRACE.windowMs) * 100}%`, width: `${Math.max((s.duration / TRACE.windowMs) * 100, 0.8)}%` }} />}
              </span>
            ),
          },
        ]}
      />
    </>
  )
}
