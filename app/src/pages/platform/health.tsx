import * as React from "react"
import { Link } from "react-router-dom"

import { BACKUPS, BUSIEST, DOT_TONE, HEALTH_KPIS, HEALTH_PARTS, HOURS, INTEGRATIONS, ORG_HEALTH, PERMISSION_DENIALS, RELEASE_HEALTH, SIGNIN_FAILURES } from "@/data/observability"
import { DataTable } from "@/components/app/data-table"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PlatformHeader } from "./shell"
import { KpiRow, Legend, LineChart, OpsFilters, Segmented, StatusDot, TableTitle } from "./ops-kit"

const PART_LINK: Record<(typeof HEALTH_PARTS)[number], string> = {
  "Website and API": "/platform/errors",
  Database: "/platform/usage",
  "Background queue": "/platform/jobs",
  Backups: "/platform/health",
  Integrations: "/platform/health",
}
const INTEGRATION_DOT = { Working: "bg-done", Slow: "bg-soon-bar", Down: "bg-overdue" } as const

export default function Health() {
  const [org, setOrg] = React.useState("")
  const [sort, setSort] = React.useState<"Problems first" | "A to Z">("Problems first")
  const score = (p: string[]) => p.filter((x) => x === "Problem").length * 10 + p.filter((x) => x === "Watch").length
  const orgs = [...ORG_HEALTH].sort((a, b) => (sort === "A to Z" ? a.name.localeCompare(b.name) : score(b.parts) - score(a.parts)))
  return (
    <>
      <PlatformHeader
        eyebrow="Operations"
        title="Health"
        description="Is every organisation, integration, backup and release in good shape? One row per organisation, with a dot for each part."
        actions={<OpsFilters orgs={BUSIEST.map((b) => b.name)} org={org} setOrg={setOrg} />}
      />
      <KpiRow items={HEALTH_KPIS} />
      <DataTable
        label="Health by organisation"
        toolbar={<><TableTitle title="Health by organisation" note="Open a dot to see the matching errors, jobs or figures." /><Segmented label="Sort" options={["Problems first", "A to Z"] as const} value={sort} onChange={setSort} /></>}
        rows={orgs}
        getRowId={(o) => o.id}
        minWidth={980}
        columns={[
          { id: "n", header: "Organisation", cell: (o) => <Link to={`/platform/organisations/${o.id}`} className="font-medium text-primary hover:underline">{o.name}</Link> },
          ...HEALTH_PARTS.map((part, i) => ({
            id: part,
            header: part,
            cell: (o: (typeof ORG_HEALTH)[number]) => (
              <Link to={PART_LINK[part]} className="hover:underline" aria-label={`${o.name}, ${part}: ${o.parts[i]}`}>
                <StatusDot className={DOT_TONE[o.parts[i]]} label={o.parts[i]} />
              </Link>
            ),
          })),
          { id: "r", header: "Release", cell: (o) => <span className="font-mono text-[0.8125rem]">{o.release}</span> },
        ]}
      />
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <DataTable
          label="Integrations"
          toolbar={<TableTitle title="Integrations" note="Checked every 5 minutes with a test call. No client data is sent." />}
          rows={INTEGRATIONS}
          getRowId={(i) => i.id}
          minWidth={640}
          columns={[
            { id: "n", header: "Service", cell: (i) => <span className="flex flex-col"><span className="font-medium">{i.name}</span><span className="text-xs text-muted-foreground">{i.detail}</span></span> },
            { id: "s", header: "Status", cell: (i) => <StatusDot className={INTEGRATION_DOT[i.status]} label={i.status} /> },
            { id: "r", header: "Response", cell: (i) => i.response },
            { id: "l", header: "Last problem", cell: (i) => <span className="text-[0.8125rem] text-muted-foreground">{i.last}</span> },
          ]}
        />
        <DataTable
          label="Backups, restore tests and migrations"
          toolbar={<TableTitle title="Backups, restore tests and migrations" note="Restore is tested monthly on a copy." />}
          rows={BACKUPS}
          getRowId={(b) => b.id}
          minWidth={520}
          columns={[
            { id: "n", header: "Organisation", cell: (b) => b.name },
            { id: "b", header: "Last backup", cell: (b) => b.backup },
            { id: "r", header: "Restore test", cell: (b) => (b.due ? <Badge tone="soon">{b.restore}</Badge> : b.restore) },
            { id: "s", header: "Schema", cell: (b) => <span className="font-mono text-[0.8125rem]">{b.schema}</span> },
          ]}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <span className="flex flex-col">
              <CardTitle>Sign-in failures and permission denials</CardTitle>
              <span className="text-xs text-muted-foreground">Per hour. A spike above 3× usual raises an alert.</span>
            </span>
          </CardHeader>
          <div className="flex flex-col gap-3 px-5 pb-4 pt-3">
            <LineChart
              series={[{ values: SIGNIN_FAILURES, className: "stroke-overdue" }, { values: PERMISSION_DENIALS, className: "stroke-primary" }]}
              labels={HOURS.map((h) => h.slice(0, 2))}
              max={12}
              label="Sign-in failures and permission denials per hour"
              tip={(i) => <><span className="font-semibold">{HOURS[i]}</span><br />Sign-in failures {SIGNIN_FAILURES[i]}<br />Permission denials {PERMISSION_DENIALS[i]}</>}
            />
            <Legend items={[{ label: `Sign-in failures · ${SIGNIN_FAILURES.reduce((a, b) => a + b, 0)} today`, className: "bg-overdue", line: true }, { label: `Permission denials · ${PERMISSION_DENIALS.reduce((a, b) => a + b, 0)} today`, className: "bg-primary", line: true }]} />
          </div>
        </Card>
        <DataTable
          label="Releases and health"
          toolbar={<TableTitle title="Releases and health" note="Errors and speed in the hour before and after each release." />}
          rows={RELEASE_HEALTH}
          getRowId={(r) => r.id}
          minWidth={680}
          columns={[
            { id: "v", header: "Release", cell: (r) => <span className="font-mono text-[0.8125rem]">{r.version}</span> },
            { id: "s", header: "State", cell: (r) => <Badge tone={r.tone}>{r.state}</Badge> },
            { id: "e", header: "Server errors", cell: (r) => r.errors },
            { id: "p", header: "Speed (p95)", cell: (r) => r.speed },
            { id: "n", header: "Note", cell: (r) => <span className="text-[0.8125rem] text-muted-foreground">{r.note}</span> },
          ]}
        />
      </div>
    </>
  )
}
