import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import { CircleCheckIcon, ListChecksIcon, PlusIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react"

import { useStore } from "@/lib/store"
import type { Nonconformity } from "@/data/types"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable, type Column } from "@/components/app/data-table"
import { FigureGrid, PageHeader, ViewChips } from "@/components/app/page"
import { NcStage, SeverityBadge, StateBadge } from "@/components/app/status"
import { RowActions } from "@/components/app/record-actions"
import { ProcessOptions } from "@/components/app/form"
import { NcSheet } from "./nc-sheet"

type View = "all" | "open" | "mine" | "overdue" | "major"

const CORRECTIVE_ACTIONS = [
  { id: "CA-2026-07", title: "Re-evaluate all approved suppliers and set a yearly reminder", for: "NC-2026-007", owner: "Joy Aquino", helpers: ["Maria Santos"], due: "4 Oct", state: "Overdue" },
  { id: "CA-2026-06", title: "Move calibration due dates into the equipment register", for: "NC-2026-005", owner: "Paolo Ramos", helpers: ["Carlos Mendoza", "Ben Castillo"], due: "2 Sep", state: "Done" },
  { id: "CA-2026-08", title: "Add a label revision check at final inspection", for: "NC-2026-008", owner: "Ana Cruz", helpers: [], due: "24 Oct", state: "In progress" },
  { id: "CA-2026-09", title: "Goods-in checklist made mandatory in the ERP", for: "NC-2026-009", owner: "Joy Aquino", helpers: ["Aaron Lim"], due: "31 Oct", state: "In progress" },
  { id: "CA-2026-03", title: "Second-person sign-off on line clearance", for: "Mixed labels on line 2", owner: "Carlos Mendoza", helpers: [], due: "15 Oct", state: "In progress" },
]
const IMPROVEMENTS = [
  { id: "IMP-2026-03", title: "Shadow board for torque tools at each cell", owner: "Ben Castillo", state: "In progress" },
  { id: "IMP-2026-02", title: "Digital first-off approval on tablets", owner: "Carlos Mendoza", state: "Planned" },
  { id: "IMP-2026-01", title: "Monthly supplier scorecards", owner: "Joy Aquino", state: "Done" },
]
const COMPLAINTS = [
  { id: "CC-2026-04", title: "Wrong label revision on 40 parts, order 8812", customer: "Northwind Foods", owner: "Ana Cruz", state: "In progress" },
  { id: "CC-2026-03", title: "Late delivery, order 8790", customer: "Pacific Freight", owner: "Carlos Mendoza", state: "Done" },
]

export default function CorrectiveAction() {
  const { state, update, can, user } = useStore()
  const navigate = useNavigate()
  const [tab, setTab] = React.useState("ncs")
  const [view, setView] = React.useState<View>("all")
  const [process, setProcess] = React.useState("")
  const [sheet, setSheet] = React.useState<{ open: boolean; nc?: Nonconformity }>({ open: false })
  const canAdd = can("Corrective Action", "Add and edit")

  const ncs = state.ncs
  const open = ncs.filter((n) => n.stage < 6)
  const F: Record<View, (n: Nonconformity) => boolean> = {
    all: () => true,
    open: (n) => n.stage < 6,
    mine: (n) => n.stage < 6 && (n.owner === user.name || (n.verifier === user.name && n.stage === 4)),
    overdue: (n) => !!n.late,
    major: (n) => n.severity === "Major" && n.stage < 6,
  }
  const rows = ncs.filter(F[view]).filter((n) => !process || n.process === process)

  const columns: Column<Nonconformity>[] = [
    {
      id: "nc",
      header: "Nonconformity",
      cell: (n) => (
        <Link to={`/corrective-action/${n.id}`} className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-primary">{n.id}</span>
          <span className="font-medium">{n.title}</span>
        </Link>
      ),
      className: "min-w-[300px]",
    },
    { id: "process", header: "Process", cell: (n) => <span className="whitespace-nowrap text-muted-foreground">{n.process}</span> },
    { id: "clause", header: "Clause", cell: (n) => n.clause },
    { id: "source", header: "Found by", cell: (n) => <span className="whitespace-nowrap text-muted-foreground">{n.source}</span> },
    { id: "sev", header: "Severity", cell: (n) => <SeverityBadge value={n.severity} /> },
    { id: "stage", header: "Stage", cell: (n) => <NcStage nc={n} />, className: "min-w-[180px]" },
    { id: "owner", header: "Owner", cell: (n) => <span className="whitespace-nowrap">{n.owner}</span> },
    { id: "due", header: "Due", cell: (n) => <span className={n.late ? "whitespace-nowrap font-semibold text-overdue" : "whitespace-nowrap text-muted-foreground"}>{n.due}</span> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (n) => (
        <RowActions
          name={n.id}
          onOpen={() => navigate(`/corrective-action/${n.id}`)}
          onEdit={canAdd && n.stage < 6 ? () => setSheet({ open: true, nc: n }) : undefined}
          removeKind={canAdd ? (n.stage === 0 ? "withdraw" : "archive") : undefined}
          onRemove={() => update("ncs", n.id, { stage: 6, due: n.stage === 0 ? "Withdrawn" : `Archived` })}
        />
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Corrective Action"
        description="Nonconformities, the actions that fix their cause, improvements and customer complaints. ISO 9001 clause 10."
        actions={
          canAdd && (
            <Button onClick={() => setSheet({ open: true })}>
              <PlusIcon /> Add nonconformity
            </Button>
          )
        }
      />

      <FigureGrid
        figures={[
          { value: open.length, label: "Open nonconformities", badge: `${open.filter((n) => n.severity === "Major").length} major`, tone: "overdue", icon: TriangleAlertIcon },
          { value: 4, label: "Corrective actions in progress", badge: "1 overdue", tone: "overdue", icon: ListChecksIcon },
          { value: open.filter((n) => n.stage === 4).length, label: "Waiting for verification", badge: "1 for you", tone: "progress", icon: CircleCheckIcon },
          { value: "92%", label: "Effective on first action, 2026", badge: "14 closed", tone: "done", icon: TrendingUpIcon },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="ncs">
            Nonconformities <span className="text-xs font-normal text-muted-foreground">{open.length}</span>
          </TabsTrigger>
          <TabsTrigger value="cas">
            Corrective actions <span className="text-xs font-normal text-muted-foreground">{CORRECTIVE_ACTIONS.length}</span>
          </TabsTrigger>
          <TabsTrigger value="imp">
            Improvements <span className="text-xs font-normal text-muted-foreground">{IMPROVEMENTS.length}</span>
          </TabsTrigger>
          <TabsTrigger value="cc">
            Customer complaints <span className="text-xs font-normal text-muted-foreground">{COMPLAINTS.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ncs" className="flex flex-col gap-4">
          <ViewChips
            value={view}
            onChange={setView}
            views={[
              { id: "all", label: "All", count: ncs.length },
              { id: "open", label: "Open", count: open.length },
              { id: "mine", label: "Waiting on you", count: ncs.filter(F.mine).length },
              { id: "overdue", label: "Overdue", count: ncs.filter(F.overdue).length, warn: true },
              { id: "major", label: "Major", count: ncs.filter(F.major).length },
            ]}
          />
          <DataTable
            label="Nonconformities"
            rows={rows}
            columns={columns}
            getRowId={(n) => n.id}
            minWidth={1280}
            toolbar={
              <NativeSelect aria-label="Process" value={process} onChange={(e) => setProcess(e.target.value)} className="h-9 w-auto min-w-48 text-[13px]">
                <option value="">All processes</option>
                <ProcessOptions />
              </NativeSelect>
            }
            empty={{ title: "No nonconformities match", body: "Try another view." }}
          />
        </TabsContent>

        <TabsContent value="cas">
          <DataTable
            label="Corrective actions"
            rows={CORRECTIVE_ACTIONS}
            getRowId={(r) => r.id}
            minWidth={900}
            columns={[
              { id: "t", header: "Corrective action", cell: (r) => <span className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-primary">{r.id}</span><span className="font-medium">{r.title}</span></span> },
              { id: "f", header: "Fixes", cell: (r) => <span className="text-muted-foreground">{r.for}</span> },
              { id: "o", header: "People", cell: (r) => <span className="flex flex-col"><span>{r.owner}, accountable</span>{r.helpers.length > 0 && <span className="text-xs text-muted-foreground">With {r.helpers.join(", ")}</span>}</span> },
              { id: "d", header: "Due", cell: (r) => r.due },
              { id: "s", header: "State", cell: (r) => <StateBadge value={r.state} /> },
            ]}
          />
        </TabsContent>
        <TabsContent value="imp">
          <DataTable
            label="Improvements"
            rows={IMPROVEMENTS}
            getRowId={(r) => r.id}
            minWidth={700}
            columns={[
              { id: "t", header: "Improvement", cell: (r) => <span className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-primary">{r.id}</span><span className="font-medium">{r.title}</span></span> },
              { id: "o", header: "Owner", cell: (r) => r.owner },
              { id: "s", header: "State", cell: (r) => <StateBadge value={r.state} /> },
            ]}
          />
        </TabsContent>
        <TabsContent value="cc">
          <DataTable
            label="Customer complaints"
            rows={COMPLAINTS}
            getRowId={(r) => r.id}
            minWidth={800}
            columns={[
              { id: "t", header: "Complaint", cell: (r) => <span className="flex flex-col gap-0.5"><span className="text-[13px] font-medium text-primary">{r.id}</span><span className="font-medium">{r.title}</span></span> },
              { id: "c", header: "Customer", cell: (r) => r.customer },
              { id: "o", header: "Owner", cell: (r) => r.owner },
              { id: "s", header: "State", cell: (r) => <StateBadge value={r.state} /> },
            ]}
          />
        </TabsContent>
      </Tabs>

      <NcSheet open={sheet.open} nc={sheet.nc} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} />
    </>
  )
}
