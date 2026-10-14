import * as React from "react"
import { RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { DEFAULT_RULES, type QmsRules as Rules } from "@/lib/rules"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect } from "@/components/ui/input"
import { SettingRow } from "@/components/app/form"
import { SettingsHeader } from "./layout"

/** Number box with a unit after it, for days and months. */
function NumberWithUnit({ id, value, onChange, unit, min = 1, max = 365 }: { id: string; value: number; onChange: (v: number) => void; unit: string; min?: number; max?: number }) {
  return (
    <span className="flex items-center gap-2">
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, parseInt(e.target.value, 10) || min)))}
        className="h-9 w-20 text-right"
      />
      <span className="w-14 text-[13px] text-muted-foreground">{unit}</span>
    </span>
  )
}

/** 5 × 5 matrix coloured by the thresholds being edited. */
function MatrixPreview({ medium, high }: { medium: number; high: number }) {
  return (
    <div className="flex flex-col gap-1.5" aria-label={`Risk matrix: medium from ${medium}, high from ${high}`}>
      <div className="grid grid-cols-5 gap-1">
        {[5, 4, 3, 2, 1].flatMap((imp) =>
          [1, 2, 3, 4, 5].map((lik) => {
            const s = lik * imp
            return (
              <span
                key={`${lik}-${imp}`}
                className={cn("flex size-9 items-center justify-center rounded-[4px] text-xs font-semibold", s >= high ? "bg-overdue-strong text-overdue" : s >= medium ? "bg-soon-strong text-soon" : "bg-secondary text-muted-foreground")}
              >
                {s}
              </span>
            )
          })
        )}
      </div>
      <span className="text-center text-xs text-muted-foreground">Likelihood × impact</span>
    </div>
  )
}

export default function QmsRules() {
  const { rules, setRules } = useStore()
  const [r, setR] = React.useState<Rules>(rules)
  const set = <K extends keyof Rules>(k: K, v: Rules[K]) => setR((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(r) !== JSON.stringify(rules)
  const bad = r.riskMedium >= r.riskHigh

  return (
    <>
      <SettingsHeader
        title="QMS rules"
        description="The rules iQMS uses to rate risks, set due dates and plan audits. Changing them updates ratings straight away and applies to new due dates; existing due dates stay as they are."
        actions={
          <Button variant="outline" onClick={() => setR(DEFAULT_RULES)}>
            <RotateCcwIcon /> Use iQMS defaults
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Risk rating</CardTitle>
            <CardDescription>ISO 9001 clause 6.1. A risk’s score is likelihood times impact, each from 1 to 5.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-start gap-8">
          <div className="flex min-w-[260px] flex-1 flex-col gap-4">
            <div className="grid grid-cols-[110px_1fr] items-center gap-3">
              <label htmlFor="r-med" className="text-sm font-medium">
                Medium from
              </label>
              <NumberWithUnit id="r-med" value={r.riskMedium} onChange={(v) => set("riskMedium", v)} unit="points" min={2} max={24} />
              <label htmlFor="r-high" className="text-sm font-medium">
                High from
              </label>
              <NumberWithUnit id="r-high" value={r.riskHigh} onChange={(v) => set("riskHigh", v)} unit="points" min={3} max={25} />
            </div>
            <p className={cn("text-[13px]", bad ? "font-medium text-overdue" : "text-muted-foreground")}>
              {bad ? "High must start above medium." : `Low is 1 to ${r.riskMedium - 1}, medium ${r.riskMedium} to ${r.riskHigh - 1}, high ${r.riskHigh} to 25. Opportunities use the same bands.`}
            </p>
          </div>
          <MatrixPreview medium={r.riskMedium} high={r.riskHigh} />
        </CardContent>
        <SettingRow title="Review high risks every" htmlFor="r-rh">
          <NumberWithUnit id="r-rh" value={r.reviewHigh} onChange={(v) => set("reviewHigh", v)} unit="months" max={24} />
        </SettingRow>
        <SettingRow title="Review medium risks every" htmlFor="r-rm">
          <NumberWithUnit id="r-rm" value={r.reviewMedium} onChange={(v) => set("reviewMedium", v)} unit="months" max={24} />
        </SettingRow>
        <SettingRow title="Review low risks every" htmlFor="r-rl">
          <NumberWithUnit id="r-rl" value={r.reviewLow} onChange={(v) => set("reviewLow", v)} unit="months" max={36} />
        </SettingRow>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Corrective action</CardTitle>
            <CardDescription>ISO 9001 clause 10.2. Due dates set automatically when a nonconformity is raised; the owner can ask for more time.</CardDescription>
          </div>
        </CardHeader>
        <div className="hidden grid-cols-[minmax(0,1fr)_150px_150px] gap-6 border-b border-rule-soft px-5 py-2.5 text-xs text-muted-foreground sm:grid">
          <span>Severity</span>
          <span>Contain within</span>
          <span>Action done within</span>
        </div>
        {(
          [
            ["Major", "majorContain", "majorAction", "Breaks a requirement, or could reach the customer"],
            ["Minor", "minorContain", "minorAction", "A one-off lapse with little effect"],
          ] as const
        ).map(([name, c, a, hint], i) => (
          <div key={name} className={cn("grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_150px_150px] sm:items-center sm:gap-6", i > 0 && "border-t border-rule-soft")}>
            <span className="flex flex-col">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-[13px] text-muted-foreground">{hint}</span>
            </span>
            <NumberWithUnit id={`r-${c}`} value={r[c]} onChange={(v) => set(c, v)} unit="days" />
            <NumberWithUnit id={`r-${a}`} value={r[a]} onChange={(v) => set(a, v)} unit="days" />
          </div>
        ))}
        <SettingRow title="Check effectiveness after" hint="Days after the action is done. Someone other than the owner checks the problem hasn’t come back." htmlFor="r-eff">
          <NumberWithUnit id="r-eff" value={r.effectiveAfter} onChange={(v) => set("effectiveAfter", v)} unit="days" />
        </SettingRow>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Audits and objectives</CardTitle>
            <CardDescription>ISO 9001 clauses 9.2 and 6.2.</CardDescription>
          </div>
        </CardHeader>
        <SettingRow first title="Audit each process at least every" hint="The audit programme flags processes that are due." htmlFor="r-aud">
          <NumberWithUnit id="r-aud" value={r.auditEvery} onChange={(v) => set("auditEvery", v)} unit="months" max={36} />
        </SettingRow>
        <SettingRow title="Audit report due" hint="Days after the audit ends." htmlFor="r-rep">
          <NumberWithUnit id="r-rep" value={r.reportDays} onChange={(v) => set("reportDays", v)} unit="days" max={60} />
        </SettingRow>
        <SettingRow title="Enter objective results" hint="Owners are reminded when results are due." htmlFor="r-kpi">
          <NativeSelect id="r-kpi" value={r.kpiPeriod} onChange={(e) => set("kpiPeriod", e.target.value as Rules["kpiPeriod"])} className="w-[152px]">
            <option>Monthly</option>
            <option>Quarterly</option>
          </NativeSelect>
        </SettingRow>
      </Card>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 border-t bg-background/95 px-1 py-3 backdrop-blur">
        <span className="mr-auto text-[13px] text-muted-foreground">{dirty ? "Not saved yet." : "Saved."}</span>
        <Button variant="ghost" disabled={!dirty} onClick={() => setR(rules)}>
          Discard changes
        </Button>
        <Button
          disabled={!dirty || bad}
          onClick={() => {
            setRules(r)
            toast("QMS rules saved", { description: "Risk ratings are updated. New due dates follow the new rules." })
          }}
        >
          Save rules
        </Button>
      </div>
    </>
  )
}
