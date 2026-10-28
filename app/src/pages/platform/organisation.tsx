import * as React from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { AI_SUPPORT_ORGS, FEATURES, orgDetail, peso, tenantById, type OrgFeature } from "@/data/platform"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Breadcrumbs, KeyFacts } from "@/components/app/page"
import NotFound from "@/pages/not-found"
import { PlatformHeader } from "./shell"
import { usePlatformAccess } from "@/lib/platform-access"

const KIND_TONE: Record<OrgFeature["kind"], "draft" | "progress" | "soon"> = { "In plan": "draft", "Add-on": "progress", "Needs client OK": "soon" }

/** One organisation: deployment, subscription and features (ADR-038). Accounts and health only, never their records. */
export default function OrganisationPage() {
  const { id } = useParams()
  const t = tenantById(id)
  const { can } = usePlatformAccess()
  const [features, setFeatures] = React.useState(() => FEATURES.map((f) => (f.key === "ai-support" ? { ...f, on: !!t && AI_SUPPORT_ORGS.has(t.name) } : f)))
  const [deploy, setDeploy] = React.useState(false)
  const [pending, setPending] = React.useState<OrgFeature>()
  if (!t) return <NotFound />
  const d = orgDetail(t)
  const toggle = (f: OrgFeature) => {
    if (f.kind === "Needs client OK" && !f.on) return setPending(f)
    setFeatures((all) => all.map((x) => (x.key === f.key ? { ...x, on: !x.on } : x)))
    toast(`${f.name} turned ${f.on ? "off" : "on"} for ${t.name}`, { description: "Their administrator is told by email." })
  }
  return (
    <>
      <Breadcrumbs items={[{ label: "Organisations", to: "/platform/organisations" }, { label: t.name }]} />
      <PlatformHeader
        title={t.name}
        description={`${d.host} · ${t.plan} · client since ${t.created} · Client admin: ${t.admin || "None"}`}
        actions={can("deploy") ? <Button onClick={() => setDeploy(true)}>Deploy release 2026.10.4</Button> : undefined}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Deployment</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Deploys need Danica’s approval</span>
          </CardHeader>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Release", v: d.release },
              { k: "Next available", v: d.next },
              { k: "Release channel", v: d.channel },
              { k: "Database", v: d.database },
              { k: "Last backup check", v: d.backup },
              { k: "Health, last 24 h", v: <Badge tone={t.health === "Healthy" ? "done" : "soon"}>{t.health}</Badge> },
            ]}
          />
          <div className="flex flex-wrap gap-2 border-t border-rule-soft px-5 py-3">
            <Button variant="outline" size="sm" onClick={() => toast("Release notes for 2026.10.4", { description: "Security fixes SEC-2026-014 and SEC-2026-016." })}>
              See release notes
            </Button>
            {can("deploy") && (
              <Button variant="outline" size="sm" onClick={() => toast("Rollback needs approval", { description: "Checked against database changes first; sent to Danica." })}>
                Roll back to 2026.10.2
              </Button>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            {d.overdue ? <Badge tone="overdue">Invoice overdue</Badge> : <Badge tone="done">Paid up</Badge>}
          </CardHeader>
          <KeyFacts
            className="px-5 py-1"
            facts={[
              { k: "Plan", v: t.plan === "Trial" ? "Trial, no charge" : `${t.plan} · ${peso(d.monthly / Math.max(1, t.used))} per user per month` },
              { k: "Seats", v: `${t.used} of ${t.seats} used` },
              { k: "This month", v: t.plan === "Trial" ? "No data" : `${peso(d.monthly)} + VAT ${peso(d.vat)}` },
              { k: "Billing", v: "Monthly · invoice by email" },
              { k: "Contract", v: "Terms v2.1 and DPA v1.3 accepted" },
            ]}
          />
          <div className="flex flex-wrap gap-2 border-t border-rule-soft px-5 py-3">
            {can("org.manage") && (
              <Button variant="outline" size="sm" onClick={() => toast("Open the billing system to change the plan or seats")}>
                Change plan or seats
              </Button>
            )}
            {d.overdue && (
              <Button variant="outline" size="sm" onClick={() => toast(`Reminder sent to ${t.admin || "the organisation"}`)}>
                Send payment reminder
              </Button>
            )}
          </div>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">In the plan, or turned on for this client. Their administrator is told about each change. Sections are set in Organisations › Modules.</span>
        </CardHeader>
        <ul className="grid md:grid-cols-2">
          {features.map((f, i) => (
            <li key={f.key} className={cn("flex items-center gap-3.5 border-t border-rule-soft px-5 py-3", i < 2 && "md:border-t-0", i === 0 && "border-t-0")}>
              <Switch checked={f.on} disabled={!can("org.manage")} onCheckedChange={() => toggle(f)} aria-label={`${f.name} for ${t.name}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.note}</span>
              </span>
              <Badge tone={KIND_TONE[f.kind]}>{f.kind}</Badge>
            </li>
          ))}
        </ul>
      </Card>

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
                toast(`Request sent to ${t.admin || "the organisation"}`, { description: `${pending?.name} turns on when they approve.` })
                setPending(undefined)
              }}
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={deploy} onOpenChange={setDeploy}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy 2026.10.4 to {t.name}?</DialogTitle>
            <DialogDescription>Sent to Danica for approval. After approval it deploys outside {t.name}’s working hours and is checked for 30 minutes before it counts as done.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeploy(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast("Deployment sent for approval")
                setDeploy(false)
              }}
            >
              Send for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
