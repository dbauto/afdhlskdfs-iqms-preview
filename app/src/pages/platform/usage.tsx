import * as React from "react"
import { Link } from "react-router-dom"

import { ACTIVE_AVERAGE, ACTIVE_DAILY, ACTIVE_MONTHLY, ACTIVE_TODAY, ACTIVE_WEEKLY, BUSIEST, CAPACITY, CURRENT_HOUR, HOURS, SERVICES, STATUS_TONE, TESTED_AT_ONCE, TESTED_PER_ORG, USAGE_KPIS } from "@/data/observability"
import { niceMax } from "@/components/app/chart-tip"
import { DataTable } from "@/components/app/data-table"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PlatformHeader } from "./shell"
import { BarChart, KpiRow, Legend, Meter, OpsFilters, Segmented, TableTitle } from "./ops-kit"

const PERIODS = ["Per hour today", "Daily", "Weekly", "Monthly"] as const
type Period = (typeof PERIODS)[number]

function ActiveUsers() {
  const [period, setPeriod] = React.useState<Period>("Per hour today")
  const series = period === "Daily" ? ACTIVE_DAILY : period === "Weekly" ? ACTIVE_WEEKLY : period === "Monthly" ? ACTIVE_MONTHLY : null
  return (
    <Card>
      <CardHeader>
        <span className="flex flex-col">
          <CardTitle>Active users</CardTitle>
          <span className="text-xs text-muted-foreground">Unique people with an active session. Hover a bar for the exact number.</span>
        </span>
        <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      </CardHeader>
      <div className="flex flex-col gap-3 px-5 pb-4 pt-3">
        {series ? (
          <>
            <BarChart
              values={series.values}
              labels={series.labels}
              max={niceMax(Math.max(...series.values))}
              label={`Active users, ${period.toLowerCase()}`}
              everyNth={1}
              tip={(i) => <><span className="font-semibold">{series.labels[i]}</span><br />{series.values[i].toLocaleString()} active users</>}
            />
            <span className="text-xs text-muted-foreground">{series.note}</span>
          </>
        ) : (
          <>
            <BarChart
              values={ACTIVE_TODAY}
              labels={HOURS}
              max={500}
              steps={5}
              height="h-60"
              label="Active users per hour today"
              overlay={ACTIVE_AVERAGE}
              limit={{ value: TESTED_AT_ONCE, label: `Tested capacity · ${TESTED_AT_ONCE} at once` }}
              barClass={(i) => (i === CURRENT_HOUR ? "bg-primary/45" : "bg-primary")}
              tip={(i) => <><span className="font-semibold">{HOURS[i]} – {HOURS[(i + 1) % 24]}</span><br />{ACTIVE_TODAY[i] ?? "No data yet"} active{i === CURRENT_HOUR ? " so far" : ""}<br />4-week average {ACTIVE_AVERAGE[i]}</>}
            />
            <Legend items={[{ label: "Active users this hour", className: "bg-primary" }, { label: "Current hour so far", className: "bg-primary/45" }, { label: "Same hour, 4-week average", className: "bg-soon-bar", line: true }, { label: "Tested capacity", className: "border-overdue", dashed: true }]} />
          </>
        )}
      </div>
    </Card>
  )
}

export default function Usage() {
  const [org, setOrg] = React.useState("")
  const [first, setFirst] = React.useState<"Bottlenecks first" | "All">("Bottlenecks first")
  const order = { Bottleneck: 0, Watch: 1, Healthy: 2 }
  const capacity = first === "All" ? CAPACITY : [...CAPACITY].sort((a, b) => order[a.status] - order[b.status])
  const [range, setRange] = React.useState<"Today" | "7 days" | "30 days">("Today")
  const mult = range === "Today" ? 1 : range === "7 days" ? 7 : 30
  const busy = CAPACITY.filter((c) => c.status === "Bottleneck").length
  const watch = CAPACITY.filter((c) => c.status === "Watch").length
  return (
    <>
      <PlatformHeader
        eyebrow="Operations"
        title="Usage and capacity"
        description="Who is using ThryveMS right now, how that changes through the day and over time, whether the system keeps up, and which services are busiest. Counts only: no names or records."
        actions={<OpsFilters orgs={BUSIEST.map((b) => b.name)} org={org} setOrg={setOrg} />}
      />
      <KpiRow items={USAGE_KPIS} />
      <ActiveUsers />
      <Alert tone={busy ? "warning" : "success"} title={`${busy} bottleneck, ${watch} to watch`}>
        Northwind Foods keeps hitting the export limit and its database slows down in the morning peak. Meridian Clinics had 88 people at once, above the {TESTED_PER_ORG} it was tested for. Everything else has room to spare.
      </Alert>
      <DataTable
        label="Capacity and bottlenecks"
        toolbar={<><TableTitle title="Capacity and bottlenecks" note="Measured against the limits and targets in the backend plan." /><Segmented label="Order" options={["Bottlenecks first", "All"] as const} value={first} onChange={setFirst} /></>}
        rows={capacity}
        getRowId={(c) => c.id}
        minWidth={820}
        columns={[
          { id: "n", header: "What we measure", cell: (c) => <span className="flex flex-col"><span className="font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{c.detail}</span></span> },
          { id: "v", header: "Now", cell: (c) => c.now },
          { id: "u", header: "Use of limit", className: "w-48", cell: (c) => <Meter value={c.used} tone={STATUS_TONE[c.status]} /> },
          { id: "s", header: "Status", className: "w-32", cell: (c) => <Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge> },
        ]}
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <DataTable
          label="Most used services"
          toolbar={<><TableTitle title="Most used services" note="Client API calls and background jobs. Names follow the backend plan." /><Segmented label="Range" options={["Today", "7 days", "30 days"] as const} value={range} onChange={setRange} /></>}
          rows={SERVICES}
          getRowId={(s) => s.id}
          minWidth={720}
          columns={[
            { id: "n", header: "Service", cell: (s) => <span className="font-medium">{s.name}</span> },
            { id: "k", header: "Kind", cell: (s) => <Badge tone={s.kind === "API" ? "progress" : "draft"}>{s.kind}</Badge> },
            { id: "c", header: "Calls", cell: (s) => (s.calls * mult).toLocaleString() },
            { id: "sh", header: "Share", className: "w-40", cell: (s) => <span className="flex items-center gap-2"><Meter value={s.share * 3} tone="progress" /><span className="w-8 text-right text-xs text-muted-foreground">{s.share}%</span></span> },
            { id: "p", header: "p95", cell: (s) => s.p95 },
            { id: "e", header: "Errors", cell: (s) => s.errors },
          ]}
        />
        <DataTable
          label="Busiest organisations"
          toolbar={<TableTitle title="Busiest organisations" note={`Each was load-tested for ${TESTED_PER_ORG} people at once.`} />}
          rows={BUSIEST}
          getRowId={(b) => b.id}
          minWidth={460}
          columns={[
            { id: "n", header: "Organisation", cell: (b) => <Link to={`/platform/organisations/${b.id}`} className="font-medium text-primary hover:underline">{b.name}</Link> },
            { id: "a", header: "Active now", cell: (b) => b.now },
            { id: "p", header: "Peak today", cell: (b) => b.peak },
            { id: "l", header: "Load", cell: (b) => (b.peak > TESTED_PER_ORG ? <Badge tone="soon">Over tested load</Badge> : b.peak > TESTED_PER_ORG * 0.9 ? <Badge tone="soon">Near tested load</Badge> : <Badge tone="done">Room to spare</Badge>) },
          ]}
        />
      </div>
      <p className="text-[0.8125rem] text-muted-foreground">Active means a request in the last 5 minutes. Figures are collected once a minute into the platform database and kept 13 months, without record contents. Sample figures until the backend collects them.</p>
    </>
  )
}
