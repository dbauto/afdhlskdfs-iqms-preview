import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { CalendarIcon, FileWarningIcon, PlusIcon, SearchCheckIcon, TriangleAlertIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Audit, Auditor } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { PlanAuditSheet } from "./plan-sheet"
import { AuditorSheet } from "./auditor-sheet"
import { blockedReason } from "@/lib/auditors"
import { Badge } from "@/components/ui/badge"

/** "Jun 2026" is in the past when this is the prototype's "today" (14 Oct 2026). */
const pastDue = (when: string) => {
  const d = new Date(`1 ${when}`)
  return !isNaN(d.getTime()) && d < new Date(2026, 9, 1)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const NOW = 9

function cellStyle(a: Audit) {
  if (a.state === "Report late") return "bg-overdue text-background"
  if (a.kind === "Follow-up") return "border-[1.5px] border-dashed border-soon bg-card text-soon"
  if (["Report issued", "Findings agreed", "Held"].includes(a.state)) return "bg-done text-background"
  return "bg-primary text-background"
}

const FINDINGS = [
  { id: "F-2026-12", title: "Concessions released without customer signature", audit: "IA-2026-06", clause: "8.7", kind: "Minor nonconformity", raised: "NC-2026-011" },
  { id: "F-2026-13", title: "Reject bin labels faded at bench 2", audit: "IA-2026-06", clause: "8.7", kind: "Observation", raised: "" },
  { id: "F-2026-09", title: "Approved supplier list not re-evaluated for 2026", audit: "IA-2026-04", clause: "8.4.1", kind: "Major nonconformity", raised: "NC-2026-007" },
  { id: "F-2026-10", title: "Goods-in check skipped for two deliveries", audit: "IA-2026-04", clause: "8.4.2", kind: "Minor nonconformity", raised: "NC-2026-009" },
  { id: "F-2026-05", title: "Torque wrenches used past their calibration date", audit: "IA-2026-02", clause: "7.1.5", kind: "Minor nonconformity", raised: "NC-2026-005" },
  { id: "F-2026-04", title: "Design input checklist missed a load case", audit: "IA-2026-11", clause: "8.3.3", kind: "Minor nonconformity", raised: "NC-2026-004" },
]

export default function Audits() {
  const { state, can, remove, update } = useStore()
  const navigate = useNavigate()
  const [sheet, setSheet] = React.useState<{ open: boolean; audit?: Audit }>({ open: false })
  const canPlan = can("Audits", "Add and edit")
  const audits = state.audits
  const auditors = state.auditors
  const canManage = can("Audits", "Manage")
  const [auditorSheet, setAuditorSheet] = React.useState<{ open: boolean; auditor?: Auditor }>({ open: false })

  return (
    <>
      <PageHeader
        title="Audits"
        description="The internal audit programme for 2026, each audit’s checklist and report, and the findings they raised. ISO 9001 clause 9.2."
        actions={
          canPlan && (
            <>
              <Button variant="outline" asChild>
                <Link to="/audits/templates">Checklist templates</Link>
              </Button>
              <Button onClick={() => setSheet({ open: true })}>
                <PlusIcon /> Plan audit
              </Button>
            </>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: "6 of 9", label: "Processes audited this year", badge: "On plan", tone: "done", icon: SearchCheckIcon },
          { value: "21 Oct", label: "Next audit, Operations", badge: "In 8 days", tone: "progress", icon: CalendarIcon, to: "/audits/IA-2026-05" },
          { value: FINDINGS.length + 3, label: "Findings raised in 2026", badge: "2 major", tone: "overdue", icon: TriangleAlertIcon },
          { value: 1, label: "Audit report not yet issued", badge: "6 days late", tone: "overdue", icon: FileWarningIcon, to: "/audits/IA-2026-06" },
        ]}
      />

      <Tabs defaultValue="programme" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="programme">Programme</TabsTrigger>
          <TabsTrigger value="audits">
            Audits <span className="text-xs font-normal text-muted-foreground">{audits.length}</span>
          </TabsTrigger>
          <TabsTrigger value="findings">
            Findings <span className="text-xs font-normal text-muted-foreground">{FINDINGS.length}</span>
          </TabsTrigger>
          <TabsTrigger value="auditors">
            Auditors <span className="text-xs font-normal text-muted-foreground">{auditors.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programme" className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>2026 programme</CardTitle>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-done" />Done</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-primary" />Planned</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-overdue" />Late</span>
                <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border border-dashed border-soon" />Follow-up</span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="w-[230px] px-5 py-3 text-left text-xs font-medium text-muted-foreground">Process</th>
                    {MONTHS.map((m, i) => (
                      <th key={m} scope="col" className={cn("py-3 text-center text-xs font-medium", i === NOW ? "bg-highlight font-bold text-primary" : "text-muted-foreground")}>
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.processes.map((p) => (
                    <tr key={p.id} className="border-t border-rule-soft">
                      <th scope="row" className="px-5 py-2.5 text-left font-normal">
                        <span className="text-muted-foreground">{p.id}</span> {p.name}
                      </th>
                      {MONTHS.map((m, i) => {
                        const a = audits.find((x) => x.process === p.name && x.month === i)
                        return (
                          <td key={m} className={cn("px-1 py-2 text-center", i === NOW && "bg-highlight")}>
                            {a && (
                              <Link to={`/audits/${a.id}`} title={`${a.id}, ${a.process}, ${a.state}`} className={cn("inline-flex h-7 min-w-11 items-center justify-center rounded-[4px] px-1.5 text-xs font-semibold", cellStyle(a))}>
                                {a.id.slice(-2)}
                              </Link>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="audits">
          <DataTable
            label="Audits"
            rows={audits}
            getRowId={(a) => a.id}
            minWidth={980}
            columns={[
              { id: "a", header: "Audit", cell: (a) => <Link to={`/audits/${a.id}`} className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{a.id}</span><span className="font-medium">{a.process}</span></Link> },
              { id: "k", header: "Type", cell: (a) => <span className="text-muted-foreground">{a.kind}</span> },
              { id: "d", header: "Date", cell: (a) => <span className="whitespace-nowrap">{a.date}</span> },
              { id: "t", header: "Team", cell: (a) => <span className="flex flex-col"><span>{a.lead}, lead</span>{a.auditors.length > 0 && <span className="text-xs text-muted-foreground">With {a.auditors.join(", ")}</span>}</span> },
              { id: "s", header: "State", cell: (a) => <StateBadge value={a.state} /> },
              {
                id: "x",
                header: <span className="sr-only">Actions</span>,
                className: "w-12",
                cell: (a) => (
                  <RowActions
                    name={a.id}
                    onOpen={() => navigate(`/audits/${a.id}`)}
                    onEdit={canPlan ? () => setSheet({ open: true, audit: a }) : undefined}
                    extra={canPlan ? [{ label: "Edit checklist", onSelect: () => navigate(`/audits/${a.id}/checklist`) }] : undefined}
                    removeKind={canPlan ? (a.state === "Planned" ? "delete" : "archive") : undefined}
                    onRemove={() => (a.state === "Planned" ? remove("audits", a.id) : update("audits", a.id, { state: "Report issued" }))}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="findings">
          <DataTable
            label="Findings"
            rows={FINDINGS}
            getRowId={(f) => f.id}
            minWidth={900}
            columns={[
              { id: "f", header: "Finding", cell: (f) => <span className="flex flex-col gap-0.5"><span className="text-[0.8125rem] font-medium text-primary">{f.id}</span><span className="font-medium">{f.title}</span></span> },
              { id: "a", header: "Audit", cell: (f) => <Link to={`/audits/${f.audit}`} className="text-primary">{f.audit}</Link> },
              { id: "c", header: "Clause", cell: (f) => f.clause },
              { id: "k", header: "Result", cell: (f) => <StateBadge value={f.kind} /> },
              { id: "r", header: "Raised as", cell: (f) => (f.raised ? <Link to={`/corrective-action/${f.raised}`} className="text-primary">{f.raised}</Link> : <span className="text-muted-foreground">No action needed</span>) },
            ]}
          />
        </TabsContent>

        <TabsContent value="auditors" className="flex flex-col gap-4">
          <p className="max-w-[46rem] text-sm text-muted-foreground">
            People who can audit. Being an auditor is on top of their usual job; they only see the audits they’re assigned to, and are never offered for a process they own or work in. ISO 9001 clauses 7.2 and 9.2.2.
          </p>
          <DataTable
            label="Auditors"
            rows={auditors}
            getRowId={(a) => a.id}
            minWidth={880}
            toolbar={
              canManage && (
                <Button size="sm" className="ml-auto" onClick={() => setAuditorSheet({ open: true })}>
                  <PlusIcon /> Add auditor
                </Button>
              )
            }
            empty={{ title: "No auditors yet", body: "Add the people who can audit, with their training." }}
            columns={[
              {
                id: "n",
                header: "Auditor",
                className: "min-w-[200px]",
                cell: (a) => {
                  const person = state.people.find((p) => p.name === a.name)
                  return (
                    <span className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-medium">
                        {a.name}
                        {a.status === "Paused" && <Badge tone="draft">Not available</Badge>}
                      </span>
                      <span className="text-xs text-muted-foreground">{a.external ? `Outside auditor, ${a.external.organisation}` : person?.title}</span>
                    </span>
                  )
                },
              },
              { id: "l", header: "Level", cell: (a) => <Badge tone={a.level === "Lead auditor" ? "progress" : a.level === "In training" ? "soon" : "draft"}>{a.level}</Badge> },
              {
                id: "c",
                header: "Competence",
                className: "min-w-[220px]",
                cell: (a) => (
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[0.8125rem]">{a.training}</span>
                    <span className={pastDue(a.recheckBy) ? "text-xs font-semibold text-overdue" : "text-xs text-muted-foreground"}>
                      {a.trainedOn && `Trained ${a.trainedOn}. `}
                      {a.recheckBy && (pastDue(a.recheckBy) ? `Re-check overdue since ${a.recheckBy}` : `Re-check by ${a.recheckBy}`)}
                    </span>
                  </span>
                ),
              },
              {
                id: "y",
                header: "2026",
                cell: (a) => (
                  <span className="flex flex-col whitespace-nowrap text-[0.8125rem]">
                    <span>Led {audits.filter((x) => x.lead === a.name).length}</span>
                    <span className="text-muted-foreground">Joined {audits.filter((x) => x.auditors.includes(a.name)).length}</span>
                  </span>
                ),
              },
              {
                id: "x",
                header: "Can’t audit",
                cell: (a) => {
                  const blocked = state.processes.filter((p) => blockedReason(a, p.name, state.processes, state.people))
                  return blocked.length ? (
                    <span className="flex flex-col text-[0.8125rem] text-muted-foreground">
                      {blocked.map((p) => (
                        <span key={p.id}>{p.name}</span>
                      ))}
                    </span>
                  ) : (
                    <span className="text-[0.8125rem] text-muted-foreground">Any process</span>
                  )
                },
              },
              {
                id: "a",
                header: <span className="sr-only">Actions</span>,
                className: "w-12",
                cell: (a) => (
                  <RowActions
                    name={a.name}
                    onEdit={canManage ? () => setAuditorSheet({ open: true, auditor: a }) : undefined}
                    extra={canManage ? [{ label: a.status === "Active" ? "Mark not available" : "Mark available", onSelect: () => update("auditors", a.id, { status: a.status === "Active" ? "Paused" : "Active" }) }] : undefined}
                    removeKind={canManage ? "delete" : undefined}
                    onRemove={() => remove("auditors", a.id)}
                  />
                ),
              },
            ]}
          />
        </TabsContent>
      </Tabs>

      <AuditorSheet open={auditorSheet.open} auditor={auditorSheet.auditor} onOpenChange={(o) => setAuditorSheet((s) => ({ ...s, open: o }))} />
      <PlanAuditSheet open={sheet.open} audit={sheet.audit} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} />
    </>
  )
}
