import * as React from "react"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { CERTIFICATION_KINDS, milestones, whenText, type CertificationSettings } from "@/lib/certification"
import { formatDate } from "@/lib/periods"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Field } from "@/components/app/form"
import { SettingsHeader } from "./layout"

/** The external certification cycle: who certifies the QMS, which audit is next, and when. */
export default function CertificationSettingsPage({ embedded = false, onSaved }: { embedded?: boolean; onSaved?: () => void }) {
  const { settings, saveSettings } = useStore()
  const [c, setC] = React.useState<CertificationSettings>(settings.certification)
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const set = (p: Partial<CertificationSettings>) => setC((x) => ({ ...x, ...p }))
  const needsStage1 = c.kind === "initial" || (c.kind === "recertification" && c.stage1Needed)
  const mainLabel = c.kind === "initial" ? "Stage 2 audit, on site" : c.kind === "recertification" ? "Recertification audit" : "Surveillance audit"

  function save() {
    const e: Record<string, string> = {}
    if (!c.main) e.main = `Set the ${mainLabel.toLowerCase()} date, or the date it’s expected.`
    if (needsStage1 && c.stage1 && c.main && c.stage1 > c.main) e.stage1 = "Stage 1 comes before the main audit."
    if (c.mock && c.main && c.mock > c.main) e.mock = "Hold the mock audit before the real one."
    if (c.kind !== "initial" && c.expiry && c.main && c.main > c.expiry) e.main = "The audit has to happen before the certificate expires."
    setErrors(e)
    if (Object.keys(e).length) return
    saveSettings("certification", { ...c, body: c.body.trim(), stage1: needsStage1 ? c.stage1 : "", expiry: c.kind === "initial" ? "" : c.expiry })
    toast("Certification saved", { description: "The Overview and Certification readiness use the new dates." })
    onSaved?.()
  }

  const preview = milestones({ ...c, stage1: needsStage1 ? c.stage1 : "" })

  return (
    <>
      {!embedded && <SettingsHeader title="Certification" description="Who certifies your QMS, which audit comes next, and when. The Overview and Certification readiness count down to these dates." />}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1">
            <CardTitle>Next audit</CardTitle>
            <CardDescription>A certificate runs for three years: surveillance audits in years 1 and 2, then recertification before it expires.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div role="radiogroup" aria-label="Kind of audit" className="grid gap-3 sm:grid-cols-2">
            {CERTIFICATION_KINDS.map((k) => {
              const on = c.kind === k.value
              return (
                <button
                  key={k.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set({ kind: k.value })}
                  className={cn("flex cursor-pointer items-start gap-2 rounded-md border bg-card p-3 text-left transition-colors hover:bg-hover", on && "border-primary ring-1 ring-primary")}
                >
                  <span className="flex flex-1 flex-col">
                    <span className="text-sm font-semibold">{k.label}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">{k.hint}</span>
                  </span>
                  {on && <CheckIcon className="size-4 text-primary" />}
                </button>
              )
            })}
          </div>
          {c.kind === "recertification" && (
            <div className="flex items-start justify-between gap-4 rounded-md border px-4 py-3">
              <div className="flex flex-col gap-0.5">
                <label htmlFor="cert-s1" className="text-sm font-medium">Stage 1 needed</label>
                <span className="text-[0.8125rem] text-muted-foreground">Usually not. Turn on when there were significant changes, such as a new site, a wider scope or new processes, and the certification body asks for a Stage 1.</span>
              </div>
              <Switch id="cert-s1" checked={c.stage1Needed} onCheckedChange={(v) => set({ stage1Needed: !!v })} />
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Certification body" htmlFor="cert-body" optional>
              <Input id="cert-body" value={c.body} onChange={(e) => set({ body: e.target.value })} placeholder="The company that audits and certifies you" />
            </Field>
            <Field label="Mock audit" htmlFor="cert-mock" optional error={errors.mock} help="A practice audit before the real one, by your consultant or an outside auditor.">
              <Input id="cert-mock" type="date" value={c.mock} onChange={(e) => set({ mock: e.target.value })} />
            </Field>
            {needsStage1 && (
              <Field label="Stage 1 audit, documents and readiness" htmlFor="cert-stage1" optional error={errors.stage1}>
                <Input id="cert-stage1" type="date" value={c.stage1} onChange={(e) => set({ stage1: e.target.value })} />
              </Field>
            )}
            <Field label={mainLabel} htmlFor="cert-main" error={errors.main}>
              <Input id="cert-main" type="date" value={c.main} onChange={(e) => set({ main: e.target.value })} />
            </Field>
            {c.kind !== "initial" && (
              <Field label="Certificate expires" htmlFor="cert-expiry" optional>
                <Input id="cert-expiry" type="date" value={c.expiry} onChange={(e) => set({ expiry: e.target.value })} />
              </Field>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {preview.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dates set yet.</p>
          ) : (
            <ol aria-label="Certification timeline" className="flex flex-col gap-2">
              {preview.map((m) => (
                <li key={m.key} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule-soft pb-2 text-sm last:border-b-0">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">
                    {formatDate(m.date)} · {whenText(m.date)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button onClick={save}>Save certification</Button>
      </div>
    </>
  )
}
