import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { TENANTS } from "@/data/admin"
import { versionFor, type ChangeType, type Release, type Sandbox } from "@/data/platform"
import { useConsole } from "@/lib/console-store"
import { useOrgScope } from "@/lib/org-scope"
import { Textarea } from "@/components/ui/input"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { DataTable } from "@/components/app/data-table"
import { Field } from "@/components/app/form"
import { KeyFacts } from "@/components/app/page"
import { PlatformHeader } from "./shell"
import { usePlatformAccess } from "@/lib/platform-access"
import { Alert } from "@/components/ui/alert"

const SANDBOX_TONE: Record<Sandbox["state"], BadgeTone> = { "Ready for review": "done", Testing: "progress", Draft: "draft", "Waiting for approval": "soon" }
const RELEASE_TONE = { Testing: "progress", Released: "done", "Kept for rollback": "draft" } as const
const STEPS = [
  { t: "Create a sandbox", d: "Copy of the version and settings, synthetic records only" },
  { t: "Test", d: "Automatic tests plus your own checks" },
  { t: "Approve", d: "Danica approves the promotion" },
  { t: "Release or roll back", d: "Outside client hours, checked for 30 minutes, logged" },
]

function CreateSandbox({ open, orgId, onClose, onCreate, taken }: { open: boolean; orgId?: string; onClose: () => void; onCreate: (s: Sandbox) => void; taken: string[] }) {
  const RELEASES = useConsole().releases
  const [org, setOrg] = React.useState(orgId ?? TENANTS[0].id)
  const [version, setVersion] = React.useState(RELEASES[0].version)
  const [change, setChange] = React.useState<ChangeType>("Bug fix")
  const [reference, setReference] = React.useState("")
  const [error, setError] = React.useState("")
  React.useEffect(() => {
    if (open) {
      setOrg(orgId ?? TENANTS[0].id)
      setError("")
    }
  }, [open, orgId])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create sandbox</DialogTitle>
          <DialogDescription>A separate copy of the organisation’s app version and settings with synthetic records. It never uses their production database, files or passwords, and is removed after 14 days.</DialogDescription>
        </DialogHeader>
        <Field label="Organisation" htmlFor="sb-org" error={error}>
          <NativeSelect id="sb-org" value={org} onChange={(e) => setOrg(e.target.value)} aria-invalid={!!error}>
            {TENANTS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="App version" htmlFor="sb-ver">
            <NativeSelect id="sb-ver" value={version} onChange={(e) => setVersion(e.target.value)}>
              {RELEASES.map((r) => (
                <option key={r.version} value={r.version}>
                  {r.version} ({r.state.toLowerCase()})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Change type" htmlFor="sb-change">
            <NativeSelect id="sb-change" value={change} onChange={(e) => setChange(e.target.value as ChangeType)}>
              <option>Bug fix</option>
              <option>Feature update</option>
              <option>Version check</option>
            </NativeSelect>
          </Field>
        </div>
        <Field label="Issue or change reference" htmlFor="sb-ref" optional help="For example a support report or security finding number.">
          <Input id="sb-ref" value={reference} onChange={(e) => setReference(e.target.value.slice(0, 100))} placeholder="SR-1043" />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (taken.includes(org)) return setError("This organisation already has a sandbox. Remove it before creating another.")
              onCreate({ id: `sb-${org}-${Date.now()}`, orgId: org, version, change, reference: reference.trim(), created: "Just now", state: "Draft", tests: "Not run yet" })
              onClose()
            }}
          >
            Create sandbox
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RegisterRelease({ open, onClose, onSave, taken }: { open: boolean; onClose: () => void; onSave: (r: Release) => void; taken: string[] }) {
  const [version, setVersion] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (open) {
      setVersion("")
      setNotes("")
      setErrors({})
    }
  }, [open])
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register release</DialogTitle>
          <DialogDescription>Adds a built version from the release pipeline so it can be tested in sandboxes. It reaches no client until a promotion is approved.</DialogDescription>
        </DialogHeader>
        <Field label="Version" htmlFor="rr-v" error={errors.v} help="Year, month and number, like 2026.11.1.">
          <Input id="rr-v" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="2026.11.1" aria-invalid={!!errors.v} />
        </Field>
        <Field label="Release notes" htmlFor="rr-n" error={errors.n}>
          <Textarea id="rr-n" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed, in plain words" aria-invalid={!!errors.n} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const e: Record<string, string> = {}
              if (!/^\d{4}\.\d{1,2}\.\d{1,3}$/.test(version.trim())) e.v = "Enter a version like 2026.11.1."
              else if (taken.includes(version.trim())) e.v = "That version is already registered."
              if (!notes.trim()) e.n = "Say what changed."
              setErrors(e)
              if (Object.keys(e).length) return
              onSave({ version: version.trim(), notes: notes.trim(), date: "Testing", state: "Testing" })
              onClose()
            }}
          >
            Register release
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Deployments() {
  const { can, me } = usePlatformAccess()
  const canDeploy = can("deploy")
  const c = useConsole()
  const scope = useOrgScope()
  const sandboxes = c.sandboxes
  const setSandboxes = (f: (all: Sandbox[]) => Sandbox[]) => c.setSandboxes(f(c.sandboxes))
  const RELEASES = c.releases
  const [newRelease, setNewRelease] = React.useState(false)
  const versionOf = (t: (typeof TENANTS)[number]) => c.orgs[t.id]?.version ?? versionFor(t)
  const [create, setCreate] = React.useState<{ open: boolean; orgId?: string }>({ open: false })
  const [compare, setCompare] = React.useState<Sandbox>()
  const name = (id: string) => TENANTS.find((t) => t.id === id)?.name ?? id
  const sandboxFor = (id: string) => sandboxes.find((s) => s.orgId === id)
  const on = (v: string) => TENANTS.filter((t) => versionOf(t) === v).length
  return (
    <>
      <PlatformHeader
        title="Deployments"
        description="Each organisation has its own production and, when needed, one sandbox to test a fix or a new version with synthetic data. Nothing reaches production without approval."
        actions={canDeploy ? <Button onClick={() => setCreate({ open: true })}>Create sandbox</Button> : undefined}
      />
      {!canDeploy && <Alert tone="info">You can see every environment and release as {me.role}. Creating sandboxes, promoting, deploying and rolling back are kept for the Developer.</Alert>}
      <ol className="grid gap-3 rounded-md border bg-card px-5 py-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.t} className="flex flex-col gap-1.5">
            <span aria-hidden="true" className={cn("h-1 rounded-full", i < 2 ? "bg-primary" : "bg-border")} />
            <span className="text-[0.8125rem] font-semibold">
              {i + 1}. {s.t}
            </span>
            <span className="text-xs text-muted-foreground">{s.d}</span>
          </li>
        ))}
      </ol>
      <DataTable
        label="Environments"
        rows={scope.orgs}
        getRowId={(t) => t.id}
        minWidth={860}
        toolbar={<h2 className="text-[0.9375rem] font-semibold">Environments</h2>}
        columns={[
          { id: "o", header: "Organisation", cell: (t) => <span className="flex flex-col"><Link to={`/platform/organisations/${t.id}`} className="font-medium text-primary hover:underline">{t.name}</Link><span className="text-xs text-muted-foreground">{t.id}.iqms.ph</span></span> },
          { id: "p", header: "Production", cell: (t) => <span className="font-mono text-[0.8125rem]">{versionOf(t)}</span> },
          { id: "h", header: "Health", cell: (t) => <Badge tone={t.health === "Healthy" ? "done" : "soon"}>{t.health}</Badge> },
          { id: "s", header: "Sandbox", cell: (t) => { const s = sandboxFor(t.id); return s ? <span className="text-[0.8125rem]">{s.version} · {s.state.toLowerCase()}</span> : <span className="text-[0.8125rem] text-muted-foreground">None</span> } },
          { id: "x", header: <span className="sr-only">Actions</span>, cell: (t) => sandboxFor(t.id) ? <Button variant="outline" size="sm" onClick={() => setCompare(sandboxFor(t.id))}>Compare</Button> : canDeploy ? <Button variant="outline" size="sm" onClick={() => setCreate({ open: true, orgId: t.id })}>Create sandbox</Button> : null },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Sandboxes</CardTitle>
            <span className="text-[0.8125rem] text-muted-foreground">Synthetic data only · removed after 14 days</span>
          </CardHeader>
          {sandboxes.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground">No sandboxes. Create one to test a fix or a new version for one organisation.</p>
          ) : (
            <ul>
              {sandboxes.map((s, i) => (
                <li key={s.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">
                      {name(s.orgId)} · {s.version}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.change}
                      {s.reference ? ` · ${s.reference}` : ""} · created {s.created} · {s.tests}
                    </span>
                  </span>
                  <Badge tone={SANDBOX_TONE[s.state]}>{s.state}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setCompare(s)}>
                    Compare
                  </Button>
                  {canDeploy && (<>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={s.state !== "Ready for review"}
                    onClick={() => {
                      setSandboxes((all) => all.map((x) => (x.id === s.id ? { ...x, state: "Waiting for approval" } : x)))
                      c.request(me, { kind: "Promotion", title: `Promote ${s.version} to ${name(s.orgId)}`, detail: `${s.change}${s.reference ? ` ${s.reference}` : ""} · ${s.tests}`, org: name(s.orgId), effect: { sandboxId: s.id, orgId: s.orgId, version: s.version } })
                      toast(`Promotion of ${s.version} to ${name(s.orgId)} sent for approval`, { description: "It waits in Approvals." })
                    }}
                  >
                    Ask to promote
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setSandboxes((all) => all.filter((x) => x.id !== s.id)); c.log(me, "removed sandbox", `${name(s.orgId)} · ${s.version}`, "Deployments"); toast("Sandbox removed", { description: "Production is unaffected." }) }}>
                    Remove
                  </Button>
                  </>)}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Releases</CardTitle>
            {canDeploy && (
              <Button variant="outline" size="sm" onClick={() => setNewRelease(true)}>
                Register release
              </Button>
            )}
          </CardHeader>
          <ul>
            {RELEASES.map((r, i) => (
              <li key={r.version} className={cn("flex items-center gap-3 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                <span className="w-24 shrink-0 font-mono text-[0.8125rem]">{r.version}</span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[0.8125rem]">{r.notes}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.date} · {on(r.version)} organisation{on(r.version) === 1 ? "" : "s"}
                  </span>
                </span>
                <Badge tone={RELEASE_TONE[r.state]}>{r.state}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <CreateSandbox
        open={create.open}
        orgId={create.orgId}
        taken={sandboxes.map((s) => s.orgId)}
        onClose={() => setCreate({ open: false })}
        onCreate={(s) => {
          setSandboxes((all) => [...all, s])
          c.log(me, "created sandbox", `${name(s.orgId)} · ${s.version}`, "Deployments")
          toast(`Sandbox created for ${name(s.orgId)}`, { description: "Preview only: no cloud resources are created until the backend is approved." })
        }}
      />
      <RegisterRelease
        open={newRelease}
        onClose={() => setNewRelease(false)}
        taken={RELEASES.map((r) => r.version)}
        onSave={(r) => {
          c.addRelease(r)
          c.log(me, "registered release", r.version, "Deployments")
          toast(`Release ${r.version} registered`, { description: "Test it in a sandbox before promoting." })
        }}
      />
      <Dialog open={!!compare} onOpenChange={(o) => !o && setCompare(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compare versions</DialogTitle>
            <DialogDescription>{compare ? name(compare.orgId) : ""}: production and sandbox</DialogDescription>
          </DialogHeader>
          {compare && (
            <KeyFacts
              facts={[
                { k: "Production", v: versionOf(TENANTS.find((t) => t.id === compare.orgId)!) },
                { k: "Sandbox", v: compare.version },
                { k: "Data", v: "Separate synthetic records" },
                { k: "Change", v: `${compare.change}${compare.reference ? ` · ${compare.reference}` : ""}` },
                { k: "Tests", v: compare.tests },
                { k: "State", v: <Badge tone={SANDBOX_TONE[compare.state]}>{compare.state}</Badge> },
              ]}
            />
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompare(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
