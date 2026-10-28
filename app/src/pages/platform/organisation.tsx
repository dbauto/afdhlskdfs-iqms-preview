import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { AI_SUPPORT_ORGS, FEATURES, PARTNERS, orgDetail, peso, tenantById, versionFor, type OrgFeature } from "@/data/platform"
import type { Tenant } from "@/data/admin"
import { useStore } from "@/lib/store"
import { isOn, MODULES } from "@/lib/modules"
import { featuresFor, orgWithChanges, useConsole } from "@/lib/console-store"
import { useOrgScope } from "@/lib/org-scope"
import { usePlatformAccess } from "@/lib/platform-access"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Field } from "@/components/app/form"
import { Breadcrumbs, KeyFacts } from "@/components/app/page"
import NotFound from "@/pages/not-found"
import { PlatformHeader } from "./shell"

const KIND_TONE: Record<OrgFeature["kind"], "draft" | "progress" | "soon"> = { "In plan": "draft", "Add-on": "progress", "Needs client OK": "soon" }

/**
 * One organisation: deployment, subscription, sections and features in one place (ADR-038, ADR-042).
 * Accounts and health only, never their records.
 */
export default function OrganisationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const base = tenantById(id)
  const { can, me } = usePlatformAccess()
  const c = useConsole()
  const scope = useOrgScope()
  const { modules, setModules } = useStore()
  const [dialog, setDialog] = React.useState<"" | "deploy" | "rollback" | "plan" | "archive">("")
  const [pending, setPending] = React.useState<OrgFeature>()
  const [plan, setPlan] = React.useState<Tenant["plan"]>("Business")
  const [seats, setSeats] = React.useState("")
  const [error, setError] = React.useState("")
  if (!base || !scope.visible(base.id) || c.orgs[base.id]?.archived) return <NotFound />
  const t = orgWithChanges(base, c)
  const d = orgDetail(t)
  const version = c.orgs[t.id]?.version ?? versionFor(t)
  const next = c.releases.find((r) => r.state === "Testing")?.version
  const previous = c.releases.find((r) => r.state === "Kept for rollback")?.version
  const features = featuresFor(t.id, c, AI_SUPPORT_ORGS)
  const monthly = c.prices[t.plan] * t.used
  const partner = PARTNERS.find((p) => p.id === c.partnerOf[t.id])
  const setFeature = (f: OrgFeature, on: boolean) => {
    c.changeOrg(t.id, { features: { ...features, [f.key]: on } })
    c.log(me, `turned ${on ? "on" : "off"} ${f.name.toLowerCase()} for`, t.name, "Organisations")
    toast(`${f.name} turned ${on ? "on" : "off"} for ${t.name}`, { description: "Their administrator is told by email." })
  }
  return (
    <>
      <Breadcrumbs items={[{ label: "Organisations", to: "/platform/organisations" }, { label: t.name }]} />
      <PlatformHeader
        title={t.name}
        description={`${d.host} · ${t.plan} · client since ${t.created} · Client admin: ${t.admin || "None"}${partner ? ` · ${partner.name}` : ""}`}
        actions={can("deploy") && next && next !== version ? <Button onClick={() => setDialog("deploy")}>Deploy release {next}</Button> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Only the Developer deploys or rolls back</span>
          </CardHeader>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Release", v: version },
              { k: "Next available", v: next && next !== version ? `${next} · testing` : "None" },
              { k: "Release channel", v: d.channel },
              { k: "Database", v: d.database },
              { k: "Last backup check", v: d.backup },
              { k: "Health, last 24 h", v: <Badge tone={t.health === "Healthy" ? "done" : "soon"}>{t.health}</Badge> },
            ]}
          />
          {can("deploy") && previous && previous !== version && (
            <div className="flex flex-wrap gap-2 border-t border-rule-soft px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => setDialog("rollback")}>
                Roll back to {previous}
              </Button>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            {can("finance.view") && (d.overdue ? <Badge tone="overdue">Invoice overdue</Badge> : <Badge tone="done">Paid up</Badge>)}
          </CardHeader>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Plan", v: t.plan === "Trial" ? "Trial, no charge" : `${t.plan} · ${peso(c.prices[t.plan])} per user per month` },
              { k: "Seats", v: `${t.used} of ${t.seats} used` },
              ...(can("finance.view") ? [{ k: "This month", v: t.plan === "Trial" ? "No data" : `${peso(monthly)} + VAT ${peso(Math.round(monthly * 0.12))}` }] : []),
              { k: "Billing", v: "Monthly · invoice by email" },
              { k: "Contract", v: "Terms v2.1 and DPA v1.3 accepted" },
            ]}
          />
          {can("org.manage") && (
            <div className="flex flex-wrap gap-2 border-t border-rule-soft px-5 py-3">
              <Button variant="outline" size="sm" onClick={() => { setPlan(t.plan); setSeats(String(t.seats)); setError(""); setDialog("plan") }}>
                Change plan or seats
              </Button>
              {d.overdue && can("finance.view") && (
                <Button variant="outline" size="sm" onClick={() => { c.log(me, "sent a payment reminder to", t.name, "Finance"); toast(`Reminder sent to ${t.admin || "the organisation"}`) }}>
                  Send payment reminder
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader>
          <span className="flex flex-col">
            <CardTitle>Sections</CardTitle>
            <span className="text-xs text-muted-foreground">Turned-off sections disappear for everyone at this client. Their records are kept and come back if turned on again.</span>
          </span>
          <span className="text-[0.8125rem] text-muted-foreground">
            {MODULES.filter((m) => isOn(modules[t.id], m.area)).length} of {MODULES.length} on
          </span>
        </CardHeader>
        <ul className="grid md:grid-cols-2">
          {MODULES.map((m, i) => (
            <li key={m.area} className={cn("flex items-center gap-3.5 border-t border-rule-soft px-5 py-3", i < 2 && "md:border-t-0", i === 0 && "border-t-0")}>
              <Switch
                checked={isOn(modules[t.id], m.area)}
                disabled={!can("org.manage")}
                onCheckedChange={(v) => {
                  setModules(t.id, { ...(modules[t.id] ?? {}), [m.area]: v })
                  c.log(me, `turned ${v ? "on" : "off"} the ${m.area} section for`, t.name, "Organisations")
                }}
                aria-label={`${m.area} for ${t.name}`}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{m.area}</span>
                <span className="text-xs text-muted-foreground">
                  {m.what}. ISO 9001 clause {m.clause}.
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">In the plan, add-ons, or needing the client’s approval. Their administrator is told about each change.</span>
        </CardHeader>
        <ul className="grid md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <li key={f.key} className={cn("flex items-center gap-3.5 border-t border-rule-soft px-5 py-3", i < 2 && "md:border-t-0", i === 0 && "border-t-0")}>
              <Switch checked={!!features[f.key]} disabled={!can("org.manage")} onCheckedChange={(v) => (f.kind === "Needs client OK" && v ? setPending(f) : setFeature(f, v))} aria-label={`${f.name} for ${t.name}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.note}</span>
              </span>
              <Badge tone={KIND_TONE[f.kind]}>{f.kind}</Badge>
            </li>
          ))}
        </ul>
      </Card>
      {can("deploy") && (
        <div className="flex justify-end">
          <Button variant="destructive" onClick={() => setDialog("archive")}>
            Archive organisation
          </Button>
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask {t.name} to approve {pending?.name.toLowerCase()}?</DialogTitle>
            <DialogDescription>This changes how their people sign in or how their data is handled, so their Owner or Administrator approves it in Settings. It turns on when they do.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(undefined)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                c.log(me, `asked ${t.name} to approve`, pending!.name.toLowerCase(), "Organisations")
                toast(`Request sent to ${t.admin || "the organisation"}`, { description: `${pending?.name} turns on when they approve.` })
                setPending(undefined)
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "deploy" || dialog === "rollback"} onOpenChange={(o) => !o && setDialog("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog === "deploy" ? `Deploy ${next} to ${t.name}?` : `Roll back ${t.name} to ${previous}?`}
            </DialogTitle>
            <DialogDescription>
              {dialog === "deploy" ? `Runs outside ${t.name}’s working hours and is checked for 30 minutes before it counts as done.` : "Checked against database changes first. Their people may need to reload."} Logged in the activity log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog("")}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const v = dialog === "deploy" ? next! : previous!
                c.changeOrg(t.id, { version: v })
                c.log(me, dialog === "deploy" ? "deployed" : "rolled back", `${t.name} to ${v}`, "Deployments")
                toast(dialog === "deploy" ? `Deploying ${v} to ${t.name}` : `Rolling back ${t.name} to ${v}`)
                setDialog("")
              }}
            >
              {dialog === "deploy" ? "Deploy" : "Roll back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "plan"} onOpenChange={(o) => !o && setDialog("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan or seats for {t.name}</DialogTitle>
            <DialogDescription>Takes effect on the next invoice. Their administrator is told by email.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan" htmlFor="cp-plan">
              <NativeSelect id="cp-plan" value={plan} onChange={(e) => setPlan(e.target.value as Tenant["plan"])}>
                {(["Business", "Team", "Trial"] as const).map((p) => (
                  <option key={p} value={p}>
                    {p} · {p === "Trial" ? "no charge" : `${peso(c.prices[p])} per user`}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Seats" htmlFor="cp-seats" error={error}>
              <Input id="cp-seats" type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} aria-invalid={!!error} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog("")}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = parseInt(seats, 10)
                if (!n || n < t.used) return setError(`Enter at least ${t.used}, the seats already in use.`)
                c.changeOrg(t.id, { plan, seats: n })
                c.log(me, `changed plan to ${plan}, ${n} seats for`, t.name, "Organisations")
                toast(`${t.name}: ${plan}, ${n} seats`)
                setDialog("")
              }}
            >
              Save plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={dialog === "archive"} onOpenChange={(o) => !o && setDialog("")}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {t.name}?</DialogTitle>
            <DialogDescription>Stops their workspace and sign-ins. Their data is kept for the period in their contract so they can export it, then deleted. Logged in the activity log.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog("")}>
              Cancel
            </Button>
            <Button
              variant="destructive-solid"
              onClick={() => {
                c.changeOrg(t.id, { archived: true })
                c.log(me, "archived", t.name, "Organisations")
                toast(`${t.name} archived`)
                navigate("/platform/organisations")
              }}
            >
              Archive organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
