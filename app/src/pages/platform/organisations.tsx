import * as React from "react"
import { ContentLink as Link } from "@/components/app/content-link"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { type Tenant } from "@/data/admin"
import { PARTNERS, partnerName, usePlatform, type AccountHealth, type ClientAccount, type PlanChange } from "@/lib/platform-store"
import { Alert } from "@/components/ui/alert"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { PlatformHeader } from "./shell"
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

/** Platform admin turns sections on or off for one client. */
function ModulesSheet({ tenant, onClose }: { tenant?: ClientAccount; onClose: () => void }) {
  const { modules, setModules } = useStore()
  const [map, setMap] = React.useState<ModuleMap>({})
  React.useEffect(() => {
    if (tenant) setMap(modules[tenant.id] ?? {})
  }, [tenant, modules])
  const count = MODULES.filter((m) => isOn(map, m.area)).length
  return (
    <Sheet open={!!tenant} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Modules for {tenant?.name}</SheetTitle>
          <SheetDescription>Sections turned off disappear for everyone at this client: menu, pages, buttons and the role editor. Their records are kept and come back if the section is turned on again.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button key={p.name} variant="outline" size="sm" onClick={() => setMap(Object.fromEntries(MODULES.map((m) => [m.area, p.on.includes(m.area)])))}>
                {p.name}
              </Button>
            ))}
          </div>
          <ul className="rounded-md border">
            {MODULES.map((m, i) => (
              <li key={m.area} className={cn("flex items-center gap-4 px-4 py-3", i > 0 && "border-t border-rule-soft")}>
                <span className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">{m.area}</span>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {m.what}. ISO 9001 clause {m.clause}.
                  </span>
                </span>
                <Switch checked={isOn(map, m.area)} onCheckedChange={(v) => setMap({ ...map, [m.area]: v })} aria-label={`${m.area} for ${tenant?.name}`} />
              </li>
            ))}
          </ul>
          {count < MODULES.length && (
            <p className="text-[0.8125rem] text-muted-foreground">
              With {MODULES.length - count} section{MODULES.length - count > 1 ? "s" : ""} off, this client can’t show evidence for every ISO 9001 requirement in ThryveMS. That’s fine if they keep those records elsewhere.
            </p>
          )}
        </SheetBody>
        <SheetFooter>
          <span className="mr-auto text-[0.8125rem] text-muted-foreground">
            {count} of {MODULES.length} on
          </span>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!tenant) return
              setModules(tenant.id, map)
              toast(`Modules saved for ${tenant.name}`, { description: "People see the change the next time a page opens." })
              onClose()
            }}
          >
            Save modules
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

const HEALTH_TONE: Record<AccountHealth, BadgeTone> = {
  Healthy: "done",
  "2 warnings": "soon",
  "SharePoint sync failing": "overdue",
  "Trial ends in 5 days": "soon",
  "No active admin": "overdue",
  "Not checked": "draft",
}

const firstOfNextMonth = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 1, 12).toISOString().slice(0, 10)
}

/** Change a client's plan or seats, with the date it takes effect and the reason, kept in the change history. */
function PlanSheet({ account, onClose }: { account?: ClientAccount; onClose: () => void }) {
  const { changePlan } = usePlatform()
  const [f, setF] = React.useState<PlanChange>({ plan: "Team", seats: 25, effective: firstOfNextMonth(), reason: "" })
  const [error, setError] = React.useState("")
  React.useEffect(() => {
    if (account) setF({ plan: account.plan, seats: account.seats, effective: firstOfNextMonth(), reason: "" })
    setError("")
  }, [account])
  const save = () => {
    if (!account) return
    if (!Number.isInteger(f.seats) || f.seats < Math.max(1, account.used)) return setError(`Seats can’t be lower than the ${account.used} people already using ${account.name}.`)
    if (!f.reason.trim()) return setError("Say why the plan or seats change.")
    changePlan(account.id, f)
    toast(`Plan and seats saved for ${account.name}`, { description: "Recorded in the change history." })
    onClose()
  }
  return (
    <Sheet open={!!account} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Change plan or seats</SheetTitle>
          <SheetDescription>{account?.name}. Now {account?.plan}, {account?.seats} seats.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Plan" htmlFor="pc-p">
              <NativeSelect id="pc-p" value={f.plan} onChange={(e) => setF({ ...f, plan: e.target.value as Tenant["plan"] })}>
                <option>Trial</option>
                <option>Team</option>
                <option>Business</option>
              </NativeSelect>
            </Field>
            <Field label="Seats" htmlFor="pc-s">
              <Input id="pc-s" type="number" min={1} value={String(f.seats)} onChange={(e) => setF({ ...f, seats: parseInt(e.target.value, 10) || 0 })} />
            </Field>
            <Field label="Takes effect" htmlFor="pc-e" help="Invoices use the new plan from this date.">
              <Input id="pc-e" type="date" value={f.effective} onChange={(e) => setF({ ...f, effective: e.target.value })} />
            </Field>
          </div>
          <Field label="Reason" htmlFor="pc-r">
            <Textarea id="pc-r" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          </Field>
          {error && <Alert tone="danger">{error}</Alert>}
        </SheetBody>
        <SheetFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save plan and seats</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

const EMPTY = { name: "", domain: "", admin: "", plan: "Trial" as Tenant["plan"], seats: "25", partnerId: "" }

export default function Tenants() {
  const { visibleAccounts, createAccount, archiveAccount, requestSupport } = usePlatform()
  const tenants = visibleAccounts()
  const [health, setHealth] = React.useState("")
  const [plan, setPlan] = React.useState("")
  const [create, setCreate] = React.useState(false)
  const [mods, setMods] = React.useState<ClientAccount | undefined>()
  const [planFor, setPlanFor] = React.useState<ClientAccount | undefined>()
  const [error, setError] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const { modules } = useStore()
  const [f, setF] = React.useState(EMPTY)
  const people = tenants.reduce((s, t) => s + t.used, 0)
  const rows = tenants.filter((t) => (!health || (health === "attention" ? t.health !== "Healthy" : t.health === "Healthy")) && (!plan || t.plan === plan))

  const submit = () => {
    if (busy) return
    if (!f.name.trim() || !f.domain.trim()) return setError("Enter the company name and its email domain.")
    setBusy(true)
    const problem = createAccount({ name: f.name, domain: f.domain, adminInvite: f.admin, plan: f.plan, seats: parseInt(f.seats, 10) || 25, partnerId: f.partnerId })
    setBusy(false)
    if (problem) return setError(problem)
    toast(`${f.name.trim()} account created`, { description: "Not provisioned yet. No workspace or database has been deployed, and no invitation is sent until it goes live." })
    setF(EMPTY)
    setError("")
    setCreate(false)
  }

  return (
    <>
      <PlatformHeader
        title="Organisations"
        description={`${tenants.length} organisations, ${people.toLocaleString()} people. You see accounts and health, never their records.`}
        actions={
          <Button onClick={() => setCreate(true)}>
            <PlusIcon /> Create organisation
          </Button>
        }
      />
      <DataTable
        label="Organisations" empty={{ title: "No organisations match", body: "Try another health or plan filter, or create an organisation." }}
        rows={rows}
        getRowId={(t) => t.id}
        minWidth={1080}
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
          { id: "n", header: "Organisation", cell: (t) => <span className="flex flex-col"><span className="font-medium">{t.name}</span><span className="text-xs text-muted-foreground">{t.domain}</span></span> },
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
                <button type="button" onClick={() => setMods(t)} className="cursor-pointer text-[0.8125rem] font-medium text-primary hover:underline">
                  {n === MODULES.length ? "All" : `${n} of ${MODULES.length}`}
                </button>
              )
            },
          },
          { id: "pa", header: "Partner", cell: (t) => partnerName(t.partnerId) ?? <span className="text-muted-foreground">None</span> },
          {
            id: "a",
            header: "Client admin",
            cell: (t) =>
              t.admin ? (
                t.admin
              ) : t.adminInvite ? (
                <span className="flex flex-col"><span>{t.adminInvite}</span><span className="text-xs text-muted-foreground">Invited when live</span></span>
              ) : (
                <span className="font-medium text-overdue">None</span>
              ),
          },
          { id: "d", header: "Deployment", cell: (t) => <Badge tone={t.deployment === "Live" ? "done" : "draft"}>{t.deployment}</Badge> },
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
                    { label: "Choose modules", onSelect: () => setMods(t) },
                    {
                      label: "Ask for support access",
                      onSelect: () => {
                        if (t.deployment !== "Live" || !t.admin) return toast(`${t.name} has no client admin to ask yet`)
                        requestSupport(t.id)
                        toast(`Support access requested from ${t.admin}`, { description: "Shows in Support access until the client admin answers." })
                      },
                    },
                    { label: "Change plan or seats", onSelect: () => setPlanFor(t) },
                  ]}
                  removeKind="archive"
                  onRemove={t.deployment === "Live" ? undefined : () => archiveAccount(t.id)}
                />
              </span>
            ),
          },
        ]}
      />

      <ModulesSheet tenant={mods} onClose={() => setMods(undefined)} />
      <PlanSheet account={planFor} onClose={() => setPlanFor(undefined)} />

      <Dialog open={create} onOpenChange={(o) => { setCreate(o); if (!o) setError("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organisation</DialogTitle>
            <DialogDescription>Creates the client account. It doesn’t deploy anything: the workspace, database and domain are provisioned as a separate step, and the client admin is invited when the workspace is live.</DialogDescription>
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
            <Field label="Business partner" htmlFor="t-pa" help="The partner who manages this client's account.">
              <NativeSelect id="t-pa" value={f.partnerId} onChange={(e) => setF({ ...f, partnerId: e.target.value })}>
                <option value="">None</option>
                {PARTNERS.map((p) => (
                  <option key={p.id} value={p.partnerId}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreate(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              Create organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
