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
import { useStore } from "@/lib/store"
import { visibleRecords } from "@/lib/record-figures"
import { formatDate } from "@/lib/periods"
import { EXPORT_PARTS, download, exportRows, toCsv, type ExportPart } from "@/lib/data-export"
import type { Area } from "@/data/types"

const AREA_OF: Record<ExportPart, Area | undefined> = {
  "Documents register": "Documents",
  "Nonconformities and corrective actions": "Corrective Action",
  "Improvements and customer complaints": "Corrective Action",
  "Risks and opportunities": "Risks & Opportunities",
  Audits: "Audits",
  "Objectives and results": "Objectives & KPIs",
  "Management reviews and actions": "Management Review",
  "Activity log": undefined,
}
const FORMATS = ["CSV files, one per register", "JSON, everything selected", "Excel, one sheet per register (live service only)", "PDF audit pack (live service only)"]

export default function DataExport() {
  const { state: scoped, can, canSee, user, settings, saveSettings } = useStore()
  // only what this person may see, as every list and figure (plan v3 §9)
  const state = visibleRecords(scoped, canSee)
  const available = EXPORT_PARTS.filter((p) => !AREA_OF[p] || can(AREA_OF[p]!))
  const [parts, setParts] = React.useState<string[]>(available.slice(0, 5))
  const [format, setFormat] = React.useState(FORMATS[0])
  const exports = settings.exports
  const liveOnly = format.includes("live service only")
  function run() {
    const chosen = available.filter((p) => parts.includes(p))
    const stamp = new Date().toISOString().slice(0, 10)
    if (format.startsWith("JSON")) {
      const data = Object.fromEntries(chosen.map((p) => [p, exportRows(state, p)]))
      download(`thryvems-export-${stamp}.json`, JSON.stringify({ organization: settings.org.name, exportedBy: user.name, exportedAt: new Date().toISOString(), registers: data }, null, 2), "application/json")
    } else {
      for (const p of chosen) download(`thryvems-${p.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${stamp}.csv`, toCsv(exportRows(state, p)), "text/csv;charset=utf-8")
    }
    saveSettings("exports", [{ id: `ex-${Date.now()}`, what: chosen.length === 1 ? chosen[0] : `${chosen.length} registers`, by: user.name, when: formatDate(stamp), format: format.startsWith("JSON") ? "JSON" : "CSV", state: "Ready", parts: chosen }, ...exports].slice(0, 20))
    toast("Export downloaded", { description: "Keep the file somewhere only the right people can open." })
  }
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
              {available.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2.5 text-sm">
                  <Checkbox checked={parts.includes(p)} onCheckedChange={(v) => setParts((x) => (v ? [...x, p] : x.filter((y) => y !== p)))} />
                  {p}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Format" htmlFor="ex-f">
            <NativeSelect id="ex-f" value={format} onChange={(e) => setFormat(e.target.value)} className="sm:w-96">
              {FORMATS.map((f) => (
                <option key={f} disabled={f.includes("live service only")}>
                  {f}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Alert tone="warning">Exports include people’s names and emails. Keep the file somewhere only the right people can open. Confidential records are exported as links and descriptions only.</Alert>
          <Button
            className="self-start"
            disabled={!parts.length || liveOnly}
            onClick={run}
          >
            <DownloadIcon /> Download export
          </Button>
        </CardContent>
      </Card>
      <DataTable
        label="Recent exports" empty={{ title: "No exports yet", body: "Exports you make are listed here. In the live service the files are kept for 24 hours, then deleted." }}
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
