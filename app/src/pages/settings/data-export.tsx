import * as React from "react"
import { DownloadIcon } from "lucide-react"
import { toast } from "sonner"

import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { StateBadge } from "@/components/app/status"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

const PARTS = ["Documents register", "Nonconformities and corrective actions", "Risks and opportunities", "Audits, checklists and findings", "Objectives and results", "Management reviews", "Activity log"]

export default function DataExport() {
  const [parts, setParts] = React.useState<string[]>(PARTS.slice(0, 5))
  const [exports, setExports] = React.useState([
    { id: "ex-3", what: "Audit pack for the surveillance audit", by: "Maria Santos", when: "2 Oct 2026", format: "PDF and Excel", state: "Ready" },
    { id: "ex-2", what: "Whole workspace", by: "Aaron Lim", when: "1 Jul 2026", format: "JSON", state: "Expired" },
  ])
  return (
    <>
      <SettingsHeader title="Data export" description="Download your QMS records, for an external audit, a backup, or to move to another system. Your data is always yours." />
      <Card>
        <CardHeader>
          <CardTitle>New export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field label="What to include">
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PARTS.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox checked={parts.includes(p)} onCheckedChange={(v) => setParts((x) => (v ? [...x, p] : x.filter((y) => y !== p)))} />
                  {p}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Format" htmlFor="ex-f">
            <NativeSelect id="ex-f" defaultValue="Excel (one sheet per register)" className="sm:w-80">
              <option>Excel (one sheet per register)</option>
              <option>PDF audit pack</option>
              <option>CSV files</option>
              <option>JSON, everything</option>
            </NativeSelect>
          </Field>
          <Alert tone="warning">Exports include people’s names and emails. Keep the file somewhere only the right people can open. Confidential records are exported as links and descriptions only.</Alert>
          <Button
            className="self-start"
            disabled={!parts.length}
            onClick={() => {
              setExports((e) => [{ id: `ex-${Date.now()}`, what: `${parts.length} registers`, by: "You", when: "Today", format: "Excel", state: "Pending" }, ...e])
              toast("Export started", { description: "We’ll email you a download link. It works for 7 days." })
            }}
          >
            <DownloadIcon /> Start export
          </Button>
        </CardContent>
      </Card>
      <DataTable
        label="Recent exports"
        rows={exports}
        getRowId={(e) => e.id}
        minWidth={700}
        columns={[
          { id: "w", header: "Export", cell: (e) => <span className="font-medium">{e.what}</span> },
          { id: "f", header: "Format", cell: (e) => e.format },
          { id: "b", header: "By", cell: (e) => e.by },
          { id: "d", header: "Made", cell: (e) => e.when },
          { id: "s", header: "State", cell: (e) => <StateBadge value={e.state} /> },
        ]}
      />
    </>
  )
}
