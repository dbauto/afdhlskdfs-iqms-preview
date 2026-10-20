import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CalendarIcon, FileWarningIcon, PlusIcon, SearchCheckIcon, TriangleAlertIcon } from "lucide-react"

import { todayIso, formatDate, daysBetween, parseDisplayDate } from "@/lib/periods"
import { RemarkMarker } from "@/components/app/remarks"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Audit, Auditor } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, PageHeader, EmptyLine } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { PlanAuditSheet } from "./plan-sheet"
import { AuditorSheet } from "./auditor-sheet"
import { blockedReason } from "@/lib/auditors"
import { Badge } from "@/components/ui/badge"
import { auditLocked, auditResultIssues } from "@/lib/audit-report-policy"

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


export default function Audits() {
  const { state, can, remove, update } = useStore()
  const [sheet, setSheet] = React.useState<{ open: boolean; audit?: Audit }>({ open: false })
  const canPlan = can("Audits", "Add and edit")
  const audits = state.audits
  const auditors = state.auditors
  // Observations and nonconformities recorded as checklist results across the programme.
  const RESULTS = audits.flatMap(a => auditResultIssues(state, a.id).map(({ form, question, assessment }) => ({ id: `${form.id}:${question.id}`, title: question.text, audit: a.id, to: `/audits/${a.id}/conduct?version=${form.id}&question=${question.id}`, clause: question.clause ?? '—', kind: assessment.result, raised: assessment.ncId ?? '' })))
  const nextAudit = audits.filter(a => !['Held', 'Findings agreed', 'Report issued'].includes(a.state) && (a.plannedDate ?? parseDisplayDate(a.date) ?? '') >= todayIso()).sort((a, b) => (a.plannedDate ?? parseDisplayDate(a.date) ?? '').localeCompare(b.plannedDate ?? parseDisplayDate(b.date) ?? ''))[0]
  const unissued = audits.filter(a => ['Held', 'Findings agreed', 'Report late'].includes(a.state))
  const doneProcesses = new Set(audits.filter(a => ['Held', 'Findings agreed', 'Report issued', 'Report late'].includes(a.state)).map(a => a.process)).size
  const major = RESULTS.filter(f => f.kind === 'Major NC').length
  const canManage = can("Audits", "Manage")
  const [auditorSheet, setAuditorSheet] = React.useState<{ open: boolean; auditor?: Auditor }>({ open: false })

  return (
    <>
      <PageHeader
        title="Audits"
        description="The internal audit programme for 2026, each audit’s checklist and report, and the observations and nonconformities they recorded. ISO 9001 clause 9.2."
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
          { value: state.processes.length ? `${doneProcesses} of ${state.processes.length}` : "No data", label: "Processes audited this year", icon: SearchCheckIcon },
          { value: nextAudit ? formatDate(nextAudit.plannedDate ?? parseDisplayDate(nextAudit.date)) : "No data", label: nextAudit ? `Next audit, ${nextAudit.process}` : "Next audit", tone: "progress", icon: CalendarIcon, to: nextAudit ? `/audits/${nextAudit.id}` : undefined },
          { value: RESULTS.length || "No data", label: "Observations and nonconformities in 2026", badge: major ? `${major} major` : undefined, tone: major ? "overdue" : "draft", icon: TriangleAlertIcon },
          { value: unissued.length || "No data", label: "Audit report not yet issued", icon: FileWarningIcon, to: unissued[0] ? `/audits/${unissued[0].id}` : undefined },
        ]}
      />

      <Tabs defaultValue="programme" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="programme">Programme</TabsTrigger>
          <TabsTrigger value="audits">
            Audits <span className="text-xs font-normal text-muted-foreground">{audits.length}</span>
          </TabsTrigger>
          <TabsTrigger value="results">
            Results <span className="text-xs font-normal text-muted-foreground">{RESULTS.length}</span>
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
            {audits.length === 0 && <EmptyLine title="No audits planned for 2026" body="Plan at least one audit for each process this year. ISO 9001 clause 9.2." />}
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
                        {p.name}
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
            label="Audits" empty={{ title: "No audits planned yet", body: "Plan an audit for each process this year. ISO 9001 clause 9.2." }}
            rows={audits}
            getRowId={(a) => a.id}
            minWidth={980}
            columns={[
              { id: "a", header: "Audit", cell: (a) => <Link to={`/audits/${a.id}`} className="flex flex-col gap-0.5"><span className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-primary">{a.id}</span><RemarkMarker kind="Audit" id={a.id} /></span><span className="font-medium">{a.process}</span></Link> },
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
                    openTo={`/audits/${a.id}`}
                    onEdit={canPlan && !auditLocked(state, a.id) ? () => setSheet({ open: true, audit: a }) : undefined}
                    extra={canPlan ? [{ label: "Edit checklist", to: `/audits/${a.id}/checklist` }] : undefined}
                    removeKind={canPlan && a.state === "Planned" && !state.auditChecklists.some(c => c.auditId === a.id) ? "delete" : undefined}
                    onRemove={canPlan && a.state === "Planned" && !state.auditChecklists.some(c => c.auditId === a.id) ? () => remove("audits", a.id) : undefined}
                  />
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="results">
          <DataTable
            label="Observations and nonconformities"
            rows={RESULTS}
            getRowId={(f) => f.id}
            minWidth={900}
            columns={[
              { id: "f", header: "Checklist question", cell: (f) => <Link to={f.to} className="font-medium text-primary whitespace-normal">{f.title}</Link> },
              { id: "a", header: "Audit", cell: (f) => <Link to={`/audits/${f.audit}`} className="text-primary">{f.audit}</Link> },
              { id: "c", header: "Clause", cell: (f) => f.clause },
              { id: "k", header: "Result", cell: (f) => <StateBadge value={f.kind} /> },
              { id: "r", header: "Raised as", cell: (f) => (f.raised ? <Link to={`/corrective-action/${f.raised}`} className="text-primary">{f.raised}</Link> : f.kind === "Observation" ? <span className="text-muted-foreground">Not required</span> : <span className="text-overdue">Needs corrective action</span>) },
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
