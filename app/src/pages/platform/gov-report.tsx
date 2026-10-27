import * as React from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { COST_TOTAL, GOV_REPORTS, INCIDENTS, INVOICED, INVOICES, longDate, peso, vatOf, type GovReport } from "@/data/platform"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { Breadcrumbs } from "@/components/app/page"
import NotFound from "@/pages/not-found"
import { GOV_TONE } from "./gov-reports"
import { PlatformHeader } from "./shell"

const QUICK: { label: string; range: [string, string] }[] = [
  { label: "Calendar year 2026", range: ["2026-01-01", "2026-12-31"] },
  { label: "Year to date", range: ["2026-01-01", "2026-10-27"] },
  { label: "Q3 2026", range: ["2026-07-01", "2026-09-30"] },
  { label: "October 2026", range: ["2026-10-01", "2026-10-31"] },
  { label: "September 2026", range: ["2026-09-01", "2026-09-30"] },
]

/** Draft content for a report and scope, with where each figure came from. Sample data in the preview. */
function draftFor(r: GovReport, from: string, to: string): { k: string; v: string; src: string }[] {
  const inScope = INCIDENTS.filter((i) => i.date >= from && i.date <= to)
  const count = (k: (typeof INCIDENTS)[number]["kind"]) => inScope.filter((i) => i.kind === k).length
  const scope = { k: "Scope", v: `${longDate(from)} – ${longDate(to)}`, src: "Chosen when the draft was generated" }
  if (r.id === "npc-asir" || r.id === "npc-breach") {
    return [
      { k: "Personal information controller", v: "[Operator legal name] · ThryveMS", src: "From the company record" },
      { k: "Data Protection Officer", v: "[DPO name] · privacy@iqms.ph", src: "From the NPC registration" },
      scope,
      { k: "Security incidents", v: inScope.length ? `${inScope.length} recorded: ${count("Failed sign-in attack")} failed sign-in attacks blocked, ${count("Availability")} availability incidents, ${count("Misdirected email")} misdirected emails (no personal data)` : "None recorded in this scope", src: "From the incident log" },
      { k: "Personal data breaches", v: inScope.some((i) => i.personalData) ? "See breach register" : "None. No breach required notice to the NPC or data subjects.", src: "From the breach register" },
      { k: "Breakdown by type", v: `Confidentiality 0 · Integrity 0 · Availability ${count("Availability")}`, src: "Counted from incident log tags" },
      { k: "Measures taken", v: "MFA for administrators, separate database per client, quarterly security scans, yearly penetration test", src: "From Security scans and POL-04, POL-07" },
    ]
  }
  if (r.agency === "BIR") {
    const months = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / (30.4 * 86_400_000)))
    const sales = INVOICED * months
    return [
      { k: "Taxpayer", v: "[Operator legal name] · TIN [number] · RDO [code]", src: "From the company record" },
      scope,
      { k: "Sales, before VAT", v: peso(sales), src: `From ${INVOICES.length * months} invoices issued in the scope` },
      { k: "Output VAT 12%", v: peso(vatOf(sales)), src: "Calculated from sales" },
      { k: "Purchases with input VAT", v: peso(COST_TOTAL * months), src: "From provider bills (foreign providers flagged for review)" },
      { k: "Statement", v: "Draft for your accountant. File through eFPS or eBIRForms.", src: "Edit if needed" },
    ]
  }
  if (r.agency === "Clients") {
    return [scope, { k: "Organisations", v: "23 reports, one per organisation", src: "From Organisations" }, { k: "Uptime", v: "99.97% (target 99.5%)", src: "From monitoring" }, { k: "Incidents", v: `${inScope.length} in scope, none affecting client data`, src: "From the incident log" }, { k: "Service credits", v: "₱0", src: "From the service levels terms" }]
  }
  return [scope, { k: "Company", v: "[Operator legal name] · SEC registration [number]", src: "From the company record" }, { k: "Contents", v: "Filled from the company record and finance figures for the scope", src: "Check with your corporate secretary or accountant" }]
}

export default function GovReportPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const report = GOV_REPORTS.find((r) => r.id === id)
  const [from, setFrom] = React.useState(params.get("from") ?? report?.scope[0] ?? "")
  const [to, setTo] = React.useState(params.get("to") ?? report?.scope[1] ?? "")
  const [generated, setGenerated] = React.useState({ from, to })
  const [error, setError] = React.useState("")
  const [checks, setChecks] = React.useState([true, true, false, false, false])
  const [ref, setRef] = React.useState(report?.ref ?? "")
  const [filedOn, setFiledOn] = React.useState("")
  const [proof, setProof] = React.useState("")
  const [filed, setFiled] = React.useState(report?.state === "Filed")
  const [history, setHistory] = React.useState<{ t: string; w: string }[]>([])
  if (!report) return <NotFound />
  const custom = report.fixedPeriod && (generated.from !== report.scope[0] || generated.to !== report.scope[1])
  const sections = draftFor(report, generated.from, generated.to)
  const regenerate = () => {
    if (!from || !to) return setError("Enter both a start and an end date.")
    if (from > to) return setError("The start date must be on or before the end date.")
    setError("")
    setGenerated({ from, to })
    setHistory((h) => [{ t: `Draft generated for ${longDate(from)} – ${longDate(to)}`, w: "Leo Navarro · just now" }, ...h])
    navigate(`/platform/government-reports/${report.id}?from=${from}&to=${to}`, { replace: true })
    toast("Draft regenerated", { description: `${longDate(from)} – ${longDate(to)}` })
  }
  const CHECKS = ["Figures match the source records", "Scope matches what the agency expects", "Company and officer details are current", "Reviewed by your lawyer, accountant or DPO", `Submitted on the ${report.agency === "BIR" ? "BIR (eFPS or eBIRForms)" : report.agency === "Clients" ? "client email" : report.agency} portal`]
  return (
    <>
      <Breadcrumbs items={[{ label: "Government reports", to: "/platform/government-reports" }, { label: report.name }]} />
      <PlatformHeader
        title={report.name}
        description={`${report.agency} · scope ${longDate(generated.from)} – ${longDate(generated.to)} · next due ${report.due}`}
        actions={
          <>
            <Button variant="outline" onClick={() => toast("Draft downloaded as Word", { description: "Edit it, then file it on the agency’s portal." })}>
              Download as Word
            </Button>
            <Button
              disabled={filed}
              onClick={() => {
                if (!ref.trim() || !filedOn.trim()) return toast("Add the reference number and the date filed first", { description: "They’re in Filing record." })
                setFiled(true)
                setHistory((h) => [{ t: `Marked as filed · ref ${ref.trim()}`, w: `Leo Navarro · ${filedOn.trim()}` }, ...h])
                toast("Report marked as filed")
              }}
            >
              {filed ? "Filed" : "Mark as filed"}
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-end gap-4 px-5 py-4">
          <span className="flex min-w-[240px] flex-1 flex-col gap-0.5">
            <span className="text-[0.9375rem] font-semibold">Report scope</span>
            <span className="text-xs text-muted-foreground">Records dated inside these dates are counted. Change them for a correction or a partial period, then regenerate.</span>
          </span>
          <Field label="Start date" htmlFor="rs-from" error={error}>
            <Input id="rs-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={!!error} />
          </Field>
          <Field label="End date" htmlFor="rs-to">
            <Input id="rs-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Quick pick" htmlFor="rs-quick">
            <NativeSelect
              id="rs-quick"
              value={QUICK.find((q) => q.range[0] === from && q.range[1] === to)?.label ?? "Custom"}
              onChange={(e) => {
                const q = QUICK.find((x) => x.label === e.target.value)
                if (q) {
                  setFrom(q.range[0])
                  setTo(q.range[1])
                }
              }}
            >
              {QUICK.map((q) => (
                <option key={q.label}>{q.label}</option>
              ))}
              <option>Custom</option>
            </NativeSelect>
          </Field>
          <Button variant="outline" onClick={regenerate}>
            Regenerate draft
          </Button>
        </div>
        {custom && <p className="border-t border-rule-soft px-5 py-2.5 text-[0.8125rem] text-soon">The agency expects {longDate(report.scope[0])} – {longDate(report.scope[1])} for this report. This draft uses a different scope and is marked so.</p>}
      </Card>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Draft content</CardTitle>
            <span className="flex items-center gap-2">
              {custom && <Badge tone="soon">Custom scope</Badge>}
              <Badge tone={filed ? "done" : GOV_TONE[report.state === "Filed" ? "Filed" : "Draft ready"]}>{filed ? "Filed" : "Draft"}</Badge>
            </span>
          </CardHeader>
          <dl>
            {sections.map((s, i) => (
              <div key={s.k} className={cn("grid gap-1 px-5 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4", i > 0 && "border-t border-rule-soft")}>
                <dt className="text-[0.8125rem] text-muted-foreground">{s.k}</dt>
                <dd className="flex flex-col gap-0.5">
                  <span className="text-sm">{s.v}</span>
                  <span className="text-xs text-muted-foreground">{s.src}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Before you file</CardTitle>
            </CardHeader>
            <ul>
              {CHECKS.map((c, i) => (
                <li key={c} className={cn("px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-[0.8125rem]">
                    <Checkbox checked={checks[i]} onCheckedChange={(v) => setChecks((all) => all.map((x, k) => (k === i ? !!v : x)))} className="mt-0.5" />
                    {c}
                  </label>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Filing record</CardTitle>
            </CardHeader>
            <div className="flex flex-col gap-3 px-5 py-4">
              <Field label="Reference number" htmlFor="fr-ref">
                <Input id="fr-ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Shown on the portal after you submit" disabled={filed} />
              </Field>
              <Field label="Date filed" htmlFor="fr-date">
                <Input id="fr-date" type="date" value={filedOn} onChange={(e) => setFiledOn(e.target.value)} disabled={filed} />
              </Field>
              <Field label="Proof of filing" htmlFor="fr-proof" optional>
                <Input id="fr-proof" type="url" value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https:// link to the acknowledgement" disabled={filed} />
              </Field>
              <span className="text-xs text-muted-foreground">Kept with the report for 5 years. The next period’s report is added automatically.</span>
            </div>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <ul>
              {[...history, { t: `Draft generated for ${longDate(report.scope[0])} – ${longDate(report.scope[1])}`, w: "Leo Navarro · 27 Oct 2026" }].map((h, i) => (
                <li key={i} className={cn("flex flex-col px-5 py-2.5", i > 0 && "border-t border-rule-soft")}>
                  <span className="text-[0.8125rem]">{h.t}</span>
                  <span className="text-xs text-muted-foreground">{h.w}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
