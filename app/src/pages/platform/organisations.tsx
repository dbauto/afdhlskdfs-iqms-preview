import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { useNavigate } from "react-router-dom"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { TENANTS, type Health, type Tenant } from "@/data/admin"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { PlatformHeader } from "./shell"
import { usePlatformAccess } from "@/lib/platform-access"
import { useOrgScope } from "@/lib/org-scope"
import { orgWithChanges, useConsole } from "@/lib/console-store"
import { useStore } from "@/lib/store"
import { isOn, MODULES, type ModuleMap } from "@/lib/modules"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import type { Area } from "@/data/types"

const PRESETS: { name: string; on: Area[] }[] = [
  { name: "Full ISO 9001", on: MODULES.map((m) => m.area) },
  { name: "Document control only", on: ["Documents", "Evidence"] },
  { name: "Documents and corrective action", on: ["Processes", "Documents", "Evidence", "Corrective Action"] },
]

const HEALTH_TONE: Record<Health, BadgeTone> = {
  Healthy: "done",
  "2 warnings": "soon",
  "SharePoint sync failing": "overdue",
  "Trial ends in 5 days": "soon",
  "No active admin": "overdue",
}

export default function Tenants() {
  const { can, me } = usePlatformAccess()
  const manage = can("org.manage")
  const navigate = useNavigate()
  const scope = useOrgScope()
  const cs = useConsole()
  const [added, setAdded] = React.useState<Tenant[]>([])
  const tenants = [...added, ...scope.orgs.map((t) => orgWithChanges(t, cs))]
  const setTenants = (f: (all: Tenant[]) => Tenant[]) => setAdded(f(added))
  const [health, setHealth] = React.useState("")
  const [plan, setPlan] = React.useState("")
  const [create, setCreate] = React.useState(false)
  const { modules } = useStore()
  const [f, setF] = React.useState({ name: "", domain: "", admin: "", plan: "Trial" as Tenant["plan"], seats: "25" })
  const people = tenants.reduce((s, t) => s + t.used, 0)
  const rows = tenants.filter((t) => (!health || (health === "attention" ? t.health !== "Healthy" : t.health === "Healthy")) && (!plan || t.plan === plan))

  return (
    <>
      <PlatformHeader
        title="Organisations"
        description={`${tenants.length} organisations, ${people.toLocaleString()} people. You see accounts and health, never their records.`}
        actions={
          manage ? (
            <Button onClick={() => setCreate(true)}>
              <PlusIcon /> Create organisation
            </Button>
          ) : undefined
        }
      />
      <DataTable
        label="Organisations" empty={{ title: "No organisations match", body: "Try another health or plan filter, or create an organisation." }}
        rows={rows}
        getRowId={(t) => t.id}
        minWidth={900}
        toolbar={
          <>
            <NativeSelect aria-label="Health" value={health} onChange={(e) => setHealth(e.target.value)} className="h-9 w-auto min-w-40 text-[0.8125rem]">
              <option value="">All health</option>
              <option value="attention">Needs attention</option>
              <option value="ok">Healthy</option>
            </NativeSelect>
            <NativeSelect aria-label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} className="h-9 w-auto min-w-36 text-[0.8125rem]">
              <option value="">All plans</option>
              <option>Business</option>
              <option>Team</option>
              <option>Trial</option>
            </NativeSelect>
          </>
        }
        columns={[
          { id: "n", header: "Organisation", cell: (t) => <span className="flex flex-col"><Link to={`/platform/organisations/${t.id}`} className="font-medium text-primary hover:underline">{t.name}</Link><span className="text-xs text-muted-foreground">{t.domain}</span></span> },
          { id: "p", header: "Plan", cell: (t) => t.plan },
          {
            id: "s",
            header: "Seats",
            className: "w-44",
            cell: (t) => (
              <span className="flex flex-col gap-1.5">
                <span className="text-[0.8125rem]">
                  {t.used} of {t.seats}
                </span>
                <span className="h-1 rounded-full bg-border">
                  <span className={cn("block h-1 rounded-full", t.used / t.seats > 0.95 ? "bg-soon" : "bg-primary")} style={{ width: `${Math.min(100, (t.used / t.seats) * 100)}%` }} />
                </span>
              </span>
            ),
          },
          {
            id: "m",
            header: "Modules",
            cell: (t) => {
              const n = MODULES.filter((m) => isOn(modules[t.id], m.area)).length
              return (
                <Link to={`/platform/organisations/${t.id}`} className="text-[0.8125rem] font-medium text-primary hover:underline">
                  {n === MODULES.length ? "All" : `${n} of ${MODULES.length}`}
                </Link>
              )
            },
          },
          { id: "a", header: "Client admin", cell: (t) => (t.admin ? t.admin : <span className="font-medium text-overdue">None</span>) },
          { id: "h", header: "Health, last 24 h", cell: (t) => <Badge tone={HEALTH_TONE[t.health]}>{t.health}</Badge> },
          {
            id: "x",
            header: <span className="sr-only">Actions</span>,
            className: "w-36",
            cell: (t) => (
              <span className="flex items-center justify-end gap-1">
                <Link to={`/platform/logs?org=${encodeURIComponent(t.name)}`} className="whitespace-nowrap text-[0.8125rem] font-medium text-primary">
                  View logs
                </Link>
                <RowActions
                  name={t.name}
                  extra={[
                    { label: "Open sections and features", onSelect: () => navigate(`/platform/organisations/${t.id}`) },
                    ...(can("support.access") ? [{ label: "Ask for support access", onSelect: () => toast(`Request sent to ${t.admin || "the organisation"}`) }] : []),
                    ...(manage ? [{ label: "Change plan or seats", onSelect: () => toast("Open the billing system to change the plan") }] : []),
                  ]}

                />
              </span>
            ),
          },
        ]}
      />



      <Dialog open={create} onOpenChange={setCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organisation</DialogTitle>
            <DialogDescription>Sets up an empty workspace and invites the client admin. They take it from there.</DialogDescription>
          </DialogHeader>
          <Field label="Company name" htmlFor="t-n">
            <Input id="t-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email domain" htmlFor="t-d" help="People with this domain can ask to join.">
              <Input id="t-d" value={f.domain} onChange={(e) => setF({ ...f, domain: e.target.value })} placeholder="company.com" />
            </Field>
            <Field label="Client admin email" htmlFor="t-a">
              <Input id="t-a" type="email" value={f.admin} onChange={(e) => setF({ ...f, admin: e.target.value })} />
            </Field>
            <Field label="Plan" htmlFor="t-p">
              <NativeSelect id="t-p" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as Tenant["plan"] })}>
                <option>Trial</option>
                <option>Team</option>
                <option>Business</option>
              </NativeSelect>
            </Field>
            <Field label="Seats" htmlFor="t-s">
              <Input id="t-s" type="number" min={1} value={f.seats} onChange={(e) => setF({ ...f, seats: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.name.trim() || !f.domain.trim()) return
                cs.log(me, "created organisation", f.name, "Organisations")
                setTenants((all) => [{ id: f.domain, name: f.name, domain: f.domain, plan: f.plan, used: 1, seats: parseInt(f.seats, 10) || 25, admin: f.admin.split("@")[0] || "Invited", health: "Healthy", region: "Singapore", created: "Today" }, ...all])
                toast(`${f.name} created`, { description: `Invitation sent to ${f.admin || "the client admin"}.` })
                setCreate(false)
              }}
            >
              Create organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
