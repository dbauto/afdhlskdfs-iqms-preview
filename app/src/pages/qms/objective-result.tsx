import * as React from "react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { formatDate, recentResultPeriods, resultPeriodLabel, todayIso } from "@/lib/periods"
import { fmtKpi, fmtTarget, nextPeriodFor, withResult } from "@/data/records"
import type { Objective } from "@/data/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { EvidencePicker, Field } from "@/components/app/form"

/** Enter the result for one month or quarter. A period with no result stays "No data", never zero (plan v3 §17). */
export function AddResultDialog({ objective, onOpenChange }: { objective?: Objective; onOpenChange: (open: boolean) => void }) {
  const { update, user } = useStore()
  const periods = objective ? recentResultPeriods(objective.frequency, objective.frequency === "quarterly" ? 6 : 12) : []
  const [period, setPeriod] = React.useState("")
  const [value, setValue] = React.useState("")
  const [evidence, setEvidence] = React.useState<string[]>([])
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    if (!objective) return
    const next = nextPeriodFor(objective, periods[0])
    setPeriod(periods.includes(next) ? next : periods[0])
    setValue("")
    setEvidence([])
    setError("")
  }, [objective?.id])

  const existing = objective?.results?.find((r) => r.period === period)

  function save() {
    if (!objective) return
    const v = parseFloat(value.replace(",", "."))
    if (isNaN(v)) return setError("Enter the result as a number, for example 94.5.")
    update("objectives", objective.id, withResult(objective, { period, value: v, enteredOn: todayIso(), enteredBy: user.name, evidence: evidence.length ? evidence : undefined }))
    const below = v < objective.target
    toast(below ? "Result saved, below target" : "Result saved, on target", { description: below ? `${resultPeriodLabel(period)}. Consider raising a corrective action.` : resultPeriodLabel(period) })
    onOpenChange(false)
  }

  return (
    <Dialog open={!!objective} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add result</DialogTitle>
          <DialogDescription>
            {objective?.name}, target {objective && fmtTarget(objective)}. Last result {objective && fmtKpi(objective)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={objective?.frequency === "quarterly" ? "Quarter" : "Month"} htmlFor="kpi-p" help={existing ? `Replaces the ${fmtKpi(objective!, existing.value)} entered on ${formatDate(existing.enteredOn)}.` : undefined}>
            <NativeSelect id="kpi-p" value={period} onChange={(e) => setPeriod(e.target.value)}>
              {periods.map((p) => (
                <option key={p} value={p}>
                  {resultPeriodLabel(p)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Result" htmlFor="kpi-v" error={error || undefined}>
            <Input id="kpi-v" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} aria-invalid={!!error} />
          </Field>
        </div>
        <Field label="Evidence for this result" optional help="The report or record the figure comes from, so an auditor can trace it.">
          <EvidencePicker value={evidence} onChange={setEvidence} process={objective?.process} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save result</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
