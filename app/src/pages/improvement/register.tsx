import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { CircleCheckIcon, ListChecksIcon, MessageSquareWarningIcon, PlusIcon, TrendingUpIcon, TriangleAlertIcon } from "lucide-react"

import { RemarkMarker } from "@/components/app/remarks"
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
import { ComplaintSheet, ImprovementSheet, complaintLate, complaintTone, improvementLate, improvementTone } from "./improvements"
import { useSearchParams } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { dueOn } from "@/lib/record-figures"
import { formatDate, todayIso } from "@/lib/periods"

type View = "all" | "open" | "mine" | "overdue" | "major"

/** A corrective action is a task on a nonconformity, planned once its root cause is known (clause 10.2.1 c). */
interface CaRow { id: string; title: string; nc: Nonconformity; owner: string; helpers: string[]; due?: string; dueText: string; state: "Done" | "Overdue" | "In progress" }

export default function CorrectiveAction() {
  const { state, update, can, user } = useStore()
  const [params, setParams] = useSearchParams()
  const tab = params.get("tab") ?? "ncs"
  const setTab = (t: string) => setParams(t === "ncs" ? {} : { tab: t }, { replace: true })
  const [impSheet, setImpSheet] = React.useState(false)
  const [ccSheet, setCcSheet] = React.useState(false)
  const today = todayIso()
  const cas: CaRow[] = state.ncs.flatMap((n) =>
    n.tasks.map((t) => {
      const due = dueOn(t.due)
      return { id: `${n.id}:${t.id}`, title: t.name, nc: n, owner: t.accountable, helpers: t.helpers, due, dueText: due ? formatDate(due) : t.due || "No date", state: t.done ? "Done" : due && due < today ? "Overdue" : "In progress" } as CaRow
    }),
  )
  const openCas = cas.filter((c) => c.state !== "Done")
  const improvements = state.improvements
  const complaints = state.complaints
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
          <span className="flex items-center gap-2"><span className="text-[0.8125rem] font-medium text-primary">{n.id}</span><RemarkMarker kind="Nonconformity" id={n.id} /></span>
          <span className="font-medium">{n.title}</span>
          <span className="text-xs text-muted-foreground">
            Clause {n.clause}, found by {n.source.charAt(0).toLowerCase() + n.source.slice(1)}
          </span>
        </Link>
      ),
      className: "min-w-[240px]",
    },
    { id: "process", header: "Process", cell: (n) => <span className="text-muted-foreground">{n.process}</span>, className: "min-w-[130px]" },
    { id: "sev", header: "Severity", cell: (n) => <SeverityBadge value={n.severity} /> },
    { id: "stage", header: "Stage", cell: (n) => <NcStage nc={n} />, className: "min-w-[160px]" },
    {
      id: "owner",
      header: "Owner, due",
      cell: (n) => (
        <span className="flex flex-col gap-0.5 whitespace-nowrap">
          <span>{n.owner}</span>
          <span className={n.late ? "text-[0.8125rem] font-semibold text-overdue" : "text-[0.8125rem] text-muted-foreground"}>{n.late ? `Late, due ${n.due}` : `Due ${n.due}`}</span>
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      className: "w-12",
      cell: (n) => (
        <RowActions
          name={n.id}
          openTo={`/corrective-action/${n.id}`}
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
          { value: openCas.length, label: "Corrective actions in progress", badge: `${openCas.filter((c) => c.state === "Overdue").length} overdue`, tone: openCas.some((c) => c.state === "Overdue") ? "overdue" : "done", icon: ListChecksIcon },
          { value: open.filter((n) => n.stage === 4).length, label: "Waiting for verification", badge: `${open.filter((n) => n.stage === 4 && n.verifier === user.name).length} for you`, tone: "progress", icon: CircleCheckIcon },
          { value: complaints.filter((c) => c.state !== "Closed").length, label: "Open customer complaints", badge: `${complaints.filter((c) => complaintLate(c)).length} response overdue`, tone: complaints.some((c) => complaintLate(c)) ? "overdue" : "done", icon: MessageSquareWarningIcon },
        ]}
      />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="ncs">
            Nonconformities <span className="text-xs font-normal text-muted-foreground">{open.length}</span>
          </TabsTrigger>
          <TabsTrigger value="cas">
            Corrective actions <span className="text-xs font-normal text-muted-foreground">{openCas.length}</span>
          </TabsTrigger>
          <TabsTrigger value="imp">
            Improvements <span className="text-xs font-normal text-muted-foreground">{improvements.filter((i) => i.state !== "Done" && i.state !== "Not going ahead").length}</span>
          </TabsTrigger>
          <TabsTrigger value="cc">
            Customer complaints <span className="text-xs font-normal text-muted-foreground">{complaints.filter((c) => c.state !== "Closed").length}</span>
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
            minWidth={900}
            toolbar={
              <NativeSelect aria-label="Process" value={process} onChange={(e) => setProcess(e.target.value)} className="h-9 w-auto min-w-48 text-[0.8125rem]">
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
            empty={{ title: "No corrective actions yet", body: "Actions are planned on a nonconformity once its root cause is found." }}
            rows={cas}
            getRowId={(r) => r.id}
            minWidth={900}
            columns={[
              { id: "t", header: "Corrective action", cell: (r) => <span className="font-medium">{r.title}</span> },
              { id: "f", header: "Fixes", cell: (r) => <span className="flex flex-col gap-0.5"><Link to={`/corrective-action/${r.nc.id}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{r.nc.id}</Link><span className="text-[0.8125rem] text-muted-foreground">{r.nc.title}</span></span> },
              { id: "o", header: "People", cell: (r) => <span className="flex flex-col"><span>{r.owner}, accountable</span>{r.helpers.length > 0 && <span className="text-xs text-muted-foreground">With {r.helpers.join(", ")}</span>}</span> },
              { id: "d", header: "Due", cell: (r) => r.dueText },
              { id: "s", header: "State", cell: (r) => <StateBadge value={r.state} /> },
            ]}
          />
        </TabsContent>
        <TabsContent value="imp" className="flex flex-col gap-4">
          {canAdd && (
            <Button className="self-start" variant="outline" onClick={() => setImpSheet(true)}>
              <PlusIcon /> Add improvement
            </Button>
          )}
          <DataTable
            label="Improvements"
            empty={{ title: "No improvements yet", body: "Record improvement ideas and projects here. ISO 9001 clause 10.3." }}
            rows={improvements}
            getRowId={(r) => r.id}
            minWidth={800}
            columns={[
              { id: "t", header: "Improvement", cell: (r) => <span className="flex flex-col gap-0.5"><Link to={`/corrective-action/improvements/${r.id}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{r.id}</Link><span className="font-medium">{r.title}</span></span> },
              { id: "p", header: "Process", cell: (r) => <span className="text-muted-foreground">{r.process}</span> },
              { id: "o", header: "Owner", cell: (r) => r.owner },
              { id: "d", header: "Target", cell: (r) => (r.due ? formatDate(r.due) : "No date") },
              { id: "s", header: "State", cell: (r) => <Badge tone={improvementLate(r) ? "overdue" : improvementTone(r.state)}>{improvementLate(r) ? "Overdue" : r.state}</Badge> },
            ]}
          />
        </TabsContent>
        <TabsContent value="cc" className="flex flex-col gap-4">
          {canAdd && (
            <Button className="self-start" variant="outline" onClick={() => setCcSheet(true)}>
              <PlusIcon /> Log customer complaint
            </Button>
          )}
          <DataTable
            label="Customer complaints"
            empty={{ title: "No customer complaints", body: "Log complaints here; raise a nonconformity from one when something needs fixing." }}
            rows={complaints}
            getRowId={(r) => r.id}
            minWidth={900}
            columns={[
              { id: "t", header: "Complaint", cell: (r) => <span className="flex flex-col gap-0.5"><Link to={`/corrective-action/complaints/${r.id}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{r.id}</Link><span className="font-medium">{r.title}</span></span> },
              { id: "c", header: "Customer", cell: (r) => <span className="flex flex-col"><span>{r.customer}</span>{r.reference && <span className="text-xs text-muted-foreground">{r.reference}</span>}</span> },
              { id: "o", header: "Owner", cell: (r) => r.owner },
              { id: "d", header: "Respond by", cell: (r) => (r.respondedDate ? `Responded ${formatDate(r.respondedDate)}` : formatDate(r.respondBy)) },
              { id: "n", header: "Nonconformity", cell: (r) => (r.ncId ? <Link to={`/corrective-action/${r.ncId}`} className="text-[0.8125rem] font-medium text-primary hover:underline">{r.ncId}</Link> : <span className="text-muted-foreground">None</span>) },
              { id: "s", header: "State", cell: (r) => <Badge tone={complaintTone(r)}>{complaintLate(r) ? "Response overdue" : r.state}</Badge> },
            ]}
          />
        </TabsContent>
      </Tabs>

      <ImprovementSheet open={impSheet} onOpenChange={setImpSheet} />
      <ComplaintSheet open={ccSheet} onOpenChange={setCcSheet} />
      <NcSheet open={sheet.open} nc={sheet.nc} onOpenChange={(o) => setSheet((s) => ({ ...s, open: o }))} />
    </>
  )
}
