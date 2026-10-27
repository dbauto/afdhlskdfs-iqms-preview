import * as React from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2Icon, ClockIcon, FileCheckIcon, TriangleAlertIcon } from "lucide-react"

import { GOV_REPORTS, longDate, type Agency, type GovReport, type GovState } from "@/data/platform"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { FigureGrid, ViewChips } from "@/components/app/page"
import { PlatformHeader } from "./shell"

export const GOV_TONE: Record<GovState, BadgeTone> = { Filed: "done", "Draft ready": "progress", "Due soon": "soon", "Not started": "draft", "None open": "done", Overdue: "overdue" }
const AGENCIES: Agency[] = ["BIR", "NPC", "SEC", "Payroll agencies", "Clients"]

/** Asks for the report's scope before generating (ADR-040). */
export function ScopeDialog({ report, onClose }: { report?: GovReport; onClose: () => void }) {
  const navigate = useNavigate()
  const [from, setFrom] = React.useState("")
  const [to, setTo] = React.useState("")
  const [error, setError] = React.useState("")
  React.useEffect(() => {
    if (report) {
      setFrom(report.scope[0])
      setTo(report.scope[1])
      setError("")
    }
  }, [report])
  const changed = !!report && (from !== report.scope[0] || to !== report.scope[1])
  return (
    <Dialog open={!!report} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate {report?.name}</DialogTitle>
          <DialogDescription>Choose the dates the report covers. Records dated inside them are counted. Filled with the period this report usually covers.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date" htmlFor="gr-from" error={error}>
            <Input id="gr-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!error} />
          </Field>
          <Field label="End date" htmlFor="gr-to">
            <Input id="gr-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
        {changed && report?.fixedPeriod && (
          <p className="rounded-md border border-soon-border bg-soon-tint px-3 py-2 text-[0.8125rem]">
            The agency expects {longDate(report.scope[0])} – {longDate(report.scope[1])} for this report. A different scope is marked on the draft.
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!from || !to) return setError("Enter both a start and an end date.")
              if (from > to) return setError("The start date must be on or before the end date.")
              navigate(`/platform/government-reports/${report!.id}?from=${from}&to=${to}`)
            }}
          >
            Generate draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function GovernmentReports() {
  const navigate = useNavigate()
  const [agency, setAgency] = React.useState<"all" | Agency>("all")
  const [generate, setGenerate] = React.useState<GovReport>()
  const rows = GOV_REPORTS.filter((r) => agency === "all" || r.agency === agency)
  const count = (s: GovState) => GOV_REPORTS.filter((r) => r.state === s).length
  return (
    <>
      <PlatformHeader
        title="Government reports"
        description="Every report ThryveMS must file, with its due date. Generate a draft from ThryveMS records for the dates you choose, check it with your lawyer or accountant, file it on the agency’s portal, then record the reference here."
      />
      <FigureGrid
        figures={[
          { value: String(count("Due soon")), label: "Due in the next 14 days", badge: "Due soon", tone: "soon", icon: ClockIcon },
          { value: String(count("Draft ready")), label: "Ready to check and file", badge: "Draft ready", tone: "progress", icon: FileCheckIcon },
          { value: String(count("Overdue")), label: "Past their due date", badge: "Overdue", tone: count("Overdue") ? "overdue" : "draft", icon: TriangleAlertIcon },
          { value: String(count("Filed")), label: "Filed this period, with reference", badge: "Filed", tone: "done", icon: CheckCircle2Icon },
        ]}
      />
      <ViewChips value={agency} onChange={(v) => setAgency(v as typeof agency)} views={[{ id: "all", label: "All", count: GOV_REPORTS.length }, ...AGENCIES.map((a) => ({ id: a, label: a, count: GOV_REPORTS.filter((r) => r.agency === a).length }))]} />
      <DataTable
        label="Government reports"
        rows={rows}
        getRowId={(r) => r.id}
        minWidth={900}
        columns={[
          { id: "a", header: "Agency", cell: (r) => <span className="whitespace-nowrap text-[0.8125rem] font-semibold">{r.agency}</span> },
          { id: "n", header: "Report", className: "min-w-[280px]", cell: (r) => <span className="flex flex-col"><span className="font-medium">{r.name}</span><span className="text-xs text-muted-foreground">From {r.from}</span></span> },
          { id: "f", header: "How often", cell: (r) => <span className="text-[0.8125rem]">{r.freq}</span> },
          { id: "d", header: "Next due", cell: (r) => <span className="whitespace-nowrap text-[0.8125rem]">{r.due}</span> },
          { id: "s", header: "Status", cell: (r) => <Badge tone={GOV_TONE[r.state]}>{r.state}</Badge> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            cell: (r) =>
              r.state === "Draft ready" || r.state === "Filed" ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/platform/government-reports/${r.id}?from=${r.scope[0]}&to=${r.scope[1]}`)}>
                  {r.state === "Filed" ? "See filing" : "Open draft"}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setGenerate(r)}>
                  {r.state === "None open" ? "Start a notice" : "Generate draft"}
                </Button>
              ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">Due dates are reminders set from current rules; confirm them with your accountant and lawyer. Payroll contributions apply only if ThryveMS has employees. ThryveMS prepares drafts; it doesn’t file with the NPC, BIR or SEC for you.</p>
      <ScopeDialog report={generate} onClose={() => setGenerate(undefined)} />
    </>
  )
}
