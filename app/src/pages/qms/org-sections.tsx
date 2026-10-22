import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { PencilIcon, PlusIcon, PrinterIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { daysBetween, formatDate, isIsoDate, nowIso, todayIso } from "@/lib/periods"
import { INITIAL_SCOPE, SCOPE_DOCUMENT } from "@/lib/document-control"
import type { LegalItem, OrgNode, OrgNodeType, Site } from "@/lib/settings"
import { ISO_EDITION } from "@/data/iso"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { DataTable } from "@/components/app/data-table"
import { Field, PeopleOptions } from "@/components/app/form"
import { EmptyLine, KeyFacts } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import NotFound from "@/pages/not-found"

const newId = (p: string) => `${p}-${Date.now().toString(36)}`
const safeLink = (s?: string) => !!s && /^https:\/\//i.test(s.trim())

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export function ProfileTab({ canEdit }: { canEdit: boolean }) {
  const { settings, saveSettings } = useStore()
  const [open, setOpen] = React.useState(false)
  const org = settings.org
  const p = settings.profile
  const [f, setF] = React.useState({ org, p })
  React.useEffect(() => {
    if (open) setF({ org: settings.org, p: settings.profile })
  }, [open, settings.org, settings.profile])
  const setOrg = (x: Partial<typeof org>) => setF((s) => ({ ...s, org: { ...s.org, ...x } }))
  const setP = (x: Partial<typeof p>) => setF((s) => ({ ...s, p: { ...s.p, ...x } }))

  function save() {
    if (!f.org.name.trim()) return toast("Give the company a name.")
    saveSettings("org", { ...f.org, name: f.org.name.trim() })
    saveSettings("profile", { ...f.p, custom: f.p.custom.filter((c) => c.label.trim()) })
    toast("Profile saved")
    setOpen(false)
  }

  const groups: { title: string; facts: { k: string; v: React.ReactNode }[] }[] = [
    { title: "Company", facts: [{ k: "Trading name", v: org.name }, { k: "Registered name", v: org.legal }, { k: "TIN", v: org.tin }, { k: "Industry", v: org.industry }, { k: "Head office", v: org.address }] },
    { title: "About", facts: [{ k: "What we do", v: p.about || "Not filled in" }, { k: "Main customers", v: p.customers || "Not filled in" }, { k: "Founded", v: p.founded || "Not filled in" }] },
    { title: "Certificate", facts: [{ k: "Standard", v: ISO_EDITION }, { k: "Certification body", v: settings.certification.body.trim() || "Not set" }, { k: "Accreditation", v: p.accreditation || "Not filled in" }, { k: "Certificate number", v: p.certificateNo || "Not filled in" }] },
  ]
  if (p.custom.length) groups.push({ title: "Your own fields", facts: p.custom.map((c) => ({ k: c.label, v: c.value || "Not filled in" })) })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          The company profile used on printouts and exports. The logo is in <Link to="/settings/branding" className="font-medium text-primary">Settings › Branding</Link>.
        </p>
        {canEdit && (
          <Button variant="outline" onClick={() => setOpen(true)}>
            <PencilIcon /> Edit profile
          </Button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.title}>
            <CardHeader>
              <CardTitle>{g.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyFacts facts={g.facts} />
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>What people and auditors see about the company.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Field label="Trading name" htmlFor="pf-name"><Input id="pf-name" value={f.org.name} onChange={(e) => setOrg({ name: e.target.value })} /></Field>
            <Field label="Registered name" htmlFor="pf-legal"><Input id="pf-legal" value={f.org.legal} onChange={(e) => setOrg({ legal: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="TIN" htmlFor="pf-tin"><Input id="pf-tin" value={f.org.tin} onChange={(e) => setOrg({ tin: e.target.value })} /></Field>
              <Field label="Founded" htmlFor="pf-founded" optional><Input id="pf-founded" value={f.p.founded} onChange={(e) => setP({ founded: e.target.value })} /></Field>
            </div>
            <Field label="Industry" htmlFor="pf-ind"><Input id="pf-ind" value={f.org.industry} onChange={(e) => setOrg({ industry: e.target.value })} /></Field>
            <Field label="Head office address" htmlFor="pf-addr"><Input id="pf-addr" value={f.org.address} onChange={(e) => setOrg({ address: e.target.value })} /></Field>
            <Field label="What we do" htmlFor="pf-about" optional><Textarea id="pf-about" value={f.p.about} onChange={(e) => setP({ about: e.target.value })} className="min-h-16" /></Field>
            <Field label="Main customers" htmlFor="pf-cust" optional><Input id="pf-cust" value={f.p.customers} onChange={(e) => setP({ customers: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Accreditation" htmlFor="pf-acc" optional><Input id="pf-acc" value={f.p.accreditation} onChange={(e) => setP({ accreditation: e.target.value })} /></Field>
              <Field label="Certificate number" htmlFor="pf-cert" optional><Input id="pf-cert" value={f.p.certificateNo} onChange={(e) => setP({ certificateNo: e.target.value })} /></Field>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 text-[0.9375rem] font-semibold">Your own fields</legend>
              {f.p.custom.map((c, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
                  <Field label="Label" htmlFor={`pf-cl-${i}`}><Input id={`pf-cl-${i}`} value={c.label} onChange={(e) => setP({ custom: f.p.custom.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} /></Field>
                  <Field label="Value" htmlFor={`pf-cv-${i}`}><Input id={`pf-cv-${i}`} value={c.value} onChange={(e) => setP({ custom: f.p.custom.map((x, k) => (k === i ? { ...x, value: e.target.value } : x)) })} /></Field>
                  <Button variant="ghost" size="icon" aria-label={`Remove ${c.label || "field"}`} onClick={() => setP({ custom: f.p.custom.filter((_, k) => k !== i) })}><Trash2Icon /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="self-start" onClick={() => setP({ custom: [...f.p.custom, { label: "", value: "" }] })}><PlusIcon /> Add field</Button>
            </fieldset>
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save profile</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Sites                                                               */
/* ------------------------------------------------------------------ */

const SITE_KINDS: Site["kind"][] = ["Central office", "Site", "Branch", "Office"]

export function SitesTab({ canEdit }: { canEdit: boolean }) {
  const { settings, saveSettings, state } = useStore()
  const sites = settings.sites
  const [sheet, setSheet] = React.useState<{ open: boolean; site?: Site }>({ open: false })
  const blank: Site = { id: "", name: "", kind: "Site", address: "", people: 0, processes: [], inScope: true }
  const [f, setF] = React.useState<Site>(blank)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    if (sheet.open) {
      setF(sheet.site ?? { ...blank, id: newId("site") })
      setErr("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet])
  const total = sites.reduce((n, s) => n + (s.inScope ? s.people : 0), 0)
  const central = sites.find((s) => s.kind === "Central office")

  function save() {
    if (!f.name.trim()) return setErr("Give the site a name.")
    if (f.kind === "Central office" && sites.some((s) => s.kind === "Central office" && s.id !== f.id)) return setErr("Only one site can be the central office. Change the other one first.")
    const next = sites.some((s) => s.id === f.id) ? sites.map((s) => (s.id === f.id ? { ...f, name: f.name.trim() } : s)) : [...sites, { ...f, name: f.name.trim() }]
    saveSettings("sites", next)
    toast(sheet.site ? "Site saved" : `${f.name.trim()} added`)
    setSheet({ open: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          [String(total), "People across the sites in scope"],
          [String(sites.length), "Sites, branches and offices"],
          [central?.name ?? "Not set", "Central office, which controls documents, audits and reviews"],
        ].map(([v, l]) => (
          <div key={l} className="flex flex-col gap-1 rounded-md border bg-card px-4 py-3">
            <span className="text-xl font-semibold">{v}</span>
            <span className="text-[0.8125rem] text-muted-foreground">{l}</span>
          </div>
        ))}
      </div>
      <DataTable
        label="Sites"
        rows={sites}
        getRowId={(s) => s.id}
        minWidth={800}
        empty={{ title: "No sites yet", body: "Add the head office and every site, branch or office. The certification body uses head counts to plan audit days." }}
        toolbar={
          <>
            <span className="text-[0.8125rem] text-muted-foreground">The certification body uses head counts and the central office to plan audit days.</span>
            {canEdit && (
              <Button size="sm" className="ml-auto" onClick={() => setSheet({ open: true })}>
                <PlusIcon /> Add site
              </Button>
            )}
          </>
        }
        columns={[
          { id: "n", header: "Site", cell: (s) => <span className="flex flex-col gap-1"><span className="font-medium">{s.name}</span><Badge tone={s.kind === "Central office" ? "progress" : "draft"} className="self-start">{s.kind}</Badge></span> },
          { id: "a", header: "Address", cell: (s) => <span className="text-muted-foreground">{s.address}</span> },
          { id: "p", header: "People", cell: (s) => <span className="tabular-nums">{s.people}</span> },
          { id: "pr", header: "Processes here", cell: (s) => <span className="text-muted-foreground">{s.processes.join(", ") || "None chosen"}</span> },
          { id: "sc", header: "In scope", cell: (s) => (s.inScope ? "Yes" : "No") },
          { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (s) => <RowActions name={s.name} onEdit={canEdit ? () => setSheet({ open: true, site: s }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => saveSettings("sites", sites.filter((x) => x.id !== s.id))} /> },
        ]}
      />
      <Sheet open={sheet.open} onOpenChange={(o) => !o && setSheet({ open: false })}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheet.site ? "Edit site" : "Add site"}</SheetTitle>
            <SheetDescription>A place where the company works. Records stay shared; this records where and how many.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Field label="Name" htmlFor="st-n" error={err}><Input id="st-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kind" htmlFor="st-k">
                <NativeSelect id="st-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Site["kind"] })}>
                  {SITE_KINDS.map((k) => <option key={k}>{k}</option>)}
                </NativeSelect>
              </Field>
              <Field label="People" htmlFor="st-p"><Input id="st-p" type="number" min={0} value={f.people} onChange={(e) => setF({ ...f, people: Math.max(0, Number(e.target.value) || 0) })} /></Field>
            </div>
            <Field label="Address" htmlFor="st-a"><Input id="st-a" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Processes here</legend>
              {state.processes.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={f.processes.includes(p.name)} onCheckedChange={(v) => setF({ ...f, processes: v ? [...f.processes, p.name] : f.processes.filter((x) => x !== p.name) })} />
                  {p.name}
                </label>
              ))}
            </fieldset>
            <div className="flex items-center justify-between gap-4 rounded-md border px-4 py-3">
              <label htmlFor="st-s" className="text-sm font-medium">In the QMS scope</label>
              <Switch id="st-s" checked={f.inScope} onCheckedChange={(v) => setF({ ...f, inScope: !!v })} />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheet({ open: false })}>Cancel</Button>
            <Button onClick={save}>{sheet.site ? "Save site" : "Add site"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Org chart builder                                                   */
/* ------------------------------------------------------------------ */

const NODE_TYPES: OrgNodeType[] = ["Position", "Department", "Site", "Team", "Company"]
const NODE_TONE: Record<OrgNodeType, BadgeTone> = { Company: "solid", Position: "progress", Department: "done", Site: "soon", Team: "draft" }

const descendants = (nodes: OrgNode[], id: string): string[] => nodes.filter((n) => n.parent === id).flatMap((n) => [n.id, ...descendants(nodes, n.id)])

function OrgBranch({ node, nodes, onEdit, onAdd, canEdit, print }: { node: OrgNode; nodes: OrgNode[]; onEdit: (n: OrgNode) => void; onAdd: (parent: string) => void; canEdit: boolean; print?: boolean }) {
  const kids = nodes.filter((n) => n.parent === node.id)
  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-card px-3 py-2 print:break-inside-avoid">
        <Badge tone={NODE_TONE[node.type]}>{node.type}</Badge>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-semibold">{node.title}</span>
          <span className="text-xs text-muted-foreground">
            {[node.person || (node.type === "Position" ? "Role only, no name" : ""), node.people ? `${node.people} ${node.people === 1 ? "person" : "people"}` : ""].filter(Boolean).join(" · ") || " "}
          </span>
        </span>
        {canEdit && !print && (
          <span className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => onAdd(node.id)} aria-label={`Add a box under ${node.title}`}>
              <PlusIcon /> Add under
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onEdit(node)} aria-label={`Edit ${node.title}`}>
              <PencilIcon />
            </Button>
          </span>
        )}
      </div>
      {kids.length > 0 && (
        <ul className="ml-4 flex flex-col gap-2 border-l-2 border-rule-soft pl-4" role="list">
          {kids.map((k) => (
            <OrgBranch key={k.id} node={k} nodes={nodes} onEdit={onEdit} onAdd={onAdd} canEdit={canEdit} print={print} />
          ))}
        </ul>
      )}
    </li>
  )
}

export function OrgTree({ nodes, print }: { nodes: OrgNode[]; print?: boolean }) {
  const roots = nodes.filter((n) => !n.parent || !nodes.some((x) => x.id === n.parent))
  return (
    <ul className="flex flex-col gap-2" role="list" aria-label="Org chart">
      {roots.map((r) => (
        <OrgBranch key={r.id} node={r} nodes={nodes} onEdit={() => {}} onAdd={() => {}} canEdit={false} print={print} />
      ))}
    </ul>
  )
}

export function OrgChartTab({ canEdit }: { canEdit: boolean }) {
  const { settings, saveSettings } = useStore()
  const nodes = settings.orgChart
  const [sheet, setSheet] = React.useState<{ open: boolean; node?: OrgNode; parent?: string }>({ open: false })
  const [f, setF] = React.useState<OrgNode>({ id: "", type: "Position", title: "" })
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    if (sheet.open) {
      setF(sheet.node ?? { id: newId("oc"), type: "Position", title: "", parent: sheet.parent })
      setErr("")
    }
  }, [sheet])
  const roots = nodes.filter((n) => !n.parent || !nodes.some((x) => x.id === n.parent))
  const blocked = sheet.node ? new Set([sheet.node.id, ...descendants(nodes, sheet.node.id)]) : new Set<string>()

  function save() {
    if (!f.title.trim()) return setErr("Give the box a title, such as a role, department or site.")
    const clean = { ...f, title: f.title.trim(), person: f.person || undefined, parent: f.parent || undefined }
    saveSettings("orgChart", nodes.some((n) => n.id === f.id) ? nodes.map((n) => (n.id === f.id ? clean : n)) : [...nodes, clean])
    toast(sheet.node ? "Saved" : `${clean.title} added`)
    setSheet({ open: false })
  }
  function removeNode() {
    const node = sheet.node!
    // the boxes under it move up to its parent, so nothing is lost
    saveSettings("orgChart", nodes.filter((n) => n.id !== node.id).map((n) => (n.parent === node.id ? { ...n, parent: node.parent } : n)))
    toast(`${node.title} removed`, { description: "The boxes under it moved up one level." })
    setSheet({ open: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          How the company is structured, from the top down. A box can be a position, department, site or team, and doesn’t need a person’s name or a ThryveMS account. Clause 5.3.
        </p>
        {canEdit && (
          <Button variant="outline" onClick={() => setSheet({ open: true })}>
            <PlusIcon /> Add box
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="py-5">
          {roots.length === 0 ? (
            <EmptyLine title="No org chart yet" body="Start with the top box, such as the general manager, then add what sits under it." />
          ) : (
            <ul className="flex flex-col gap-2" role="list" aria-label="Org chart">
              {roots.map((r) => (
                <OrgBranch key={r.id} node={r} nodes={nodes} canEdit={canEdit} onEdit={(n) => setSheet({ open: true, node: n })} onAdd={(parent) => setSheet({ open: true, parent })} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Sheet open={sheet.open} onOpenChange={(o) => !o && setSheet({ open: false })}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheet.node ? "Edit box" : "Add box"}</SheetTitle>
            <SheetDescription>Move a box by changing who it reports to. Everything under it moves with it.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="oc-t">
                <NativeSelect id="oc-t" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value as OrgNodeType })}>
                  {NODE_TYPES.map((t) => <option key={t}>{t}</option>)}
                </NativeSelect>
              </Field>
              <Field label="People" htmlFor="oc-p" optional>
                <Input id="oc-p" type="number" min={0} value={f.people ?? ""} onChange={(e) => setF({ ...f, people: e.target.value ? Math.max(0, Number(e.target.value) || 0) : undefined })} />
              </Field>
            </div>
            <Field label="Title" htmlFor="oc-ti" error={err}>
              <Input id="oc-ti" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="QA Supervisor, Quality, Calamba Plant" />
            </Field>
            <Field label="Person" htmlFor="oc-pe" optional help="Leave empty to show the role only. They don’t need a ThryveMS account.">
              <Input id="oc-pe" value={f.person ?? ""} onChange={(e) => setF({ ...f, person: e.target.value })} list="oc-people" />
              <datalist id="oc-people"><PeopleOptions /></datalist>
            </Field>
            <Field label="Reports to" htmlFor="oc-r">
              <NativeSelect id="oc-r" value={f.parent ?? ""} onChange={(e) => setF({ ...f, parent: e.target.value || undefined })}>
                <option value="">Nobody (top of the chart)</option>
                {nodes.filter((n) => !blocked.has(n.id)).map((n) => (
                  <option key={n.id} value={n.id}>{n.title}</option>
                ))}
              </NativeSelect>
            </Field>
          </SheetBody>
          <SheetFooter>
            {sheet.node && <Button variant="ghost" className="mr-auto text-overdue" onClick={removeNode}><Trash2Icon /> Remove</Button>}
            <Button variant="ghost" onClick={() => setSheet({ open: false })}>Cancel</Button>
            <Button onClick={save}>{sheet.node ? "Save" : "Add box"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Legal & permits                                                     */
/* ------------------------------------------------------------------ */

export function legalStatus(item: LegalItem, today = todayIso()): { label: string; tone: BadgeTone } {
  if (!item.expires || !isIsoDate(item.expires)) return { label: item.reviewed ? `Reviewed ${formatDate(item.reviewed)}` : "No expiry", tone: "draft" }
  const days = daysBetween(today, item.expires)
  if (days < 0) return { label: `Expired ${formatDate(item.expires)}`, tone: "overdue" }
  if (days <= 60) return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, tone: "soon" }
  return { label: `Expires ${formatDate(item.expires)}`, tone: "done" }
}

export function LegalTab({ canEdit }: { canEdit: boolean }) {
  const { settings, saveSettings } = useStore()
  const items = settings.legal
  const siteNames = ["All sites", ...settings.sites.map((s) => s.name)]
  const [sheet, setSheet] = React.useState<{ open: boolean; item?: LegalItem; kind?: LegalItem["kind"] }>({ open: false })
  const [f, setF] = React.useState<LegalItem>({ id: "", kind: "Permit", name: "", issuedBy: "", site: "All sites", owner: "Maria Santos" })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  React.useEffect(() => {
    if (sheet.open) {
      setF(sheet.item ?? { id: newId("lg"), kind: sheet.kind ?? "Permit", name: "", issuedBy: "", number: "", site: "All sites", owner: "Maria Santos", link: "" })
      setErrors({})
    }
  }, [sheet])

  function save() {
    const e: Record<string, string> = {}
    if (!f.name.trim()) e.name = "Say what the permit or requirement is."
    if (f.link?.trim() && !safeLink(f.link)) e.link = "Use a link that starts with https://, to where the file is kept."
    if (f.kind === "Permit" && !f.expires) e.expires = "Set the expiry date so the owner is reminded in time."
    setErrors(e)
    if (Object.keys(e).length) return
    const clean = { ...f, name: f.name.trim(), link: f.link?.trim() }
    saveSettings("legal", items.some((x) => x.id === f.id) ? items.map((x) => (x.id === f.id ? clean : x)) : [...items, clean])
    toast(sheet.item ? "Saved" : `${clean.name} added`)
    setSheet({ open: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable
        label="Legal requirements and permits"
        rows={items}
        getRowId={(i) => i.id}
        minWidth={900}
        empty={{ title: "Nothing listed yet", body: "Add the permits you need to operate and the laws that apply to your products and sites. ISO 9001 clauses 4.2 and 8.2.2." }}
        toolbar={
          <>
            <span className="text-[0.8125rem] text-muted-foreground">Owners are reminded 60 days before a permit expires.</span>
            {canEdit && (
              <span className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSheet({ open: true, kind: "Legal requirement" })}><PlusIcon /> Add legal requirement</Button>
                <Button size="sm" onClick={() => setSheet({ open: true, kind: "Permit" })}><PlusIcon /> Add permit</Button>
              </span>
            )}
          </>
        }
        columns={[
          { id: "n", header: "Permit or requirement", cell: (i) => <span className="flex flex-col gap-1"><span className="font-medium">{i.name}</span><Badge tone={i.kind === "Permit" ? "progress" : "draft"} className="self-start">{i.kind}</Badge></span>, className: "min-w-[220px]" },
          { id: "b", header: "Issued by · number", cell: (i) => <span className="text-muted-foreground">{[i.issuedBy, i.number].filter(Boolean).join(" · ") || "Not filled in"}</span> },
          { id: "s", header: "Site", cell: (i) => i.site },
          { id: "o", header: "Owner", cell: (i) => i.owner },
          { id: "e", header: "Status", cell: (i) => { const st = legalStatus(i); return <Badge tone={st.tone}>{st.label}</Badge> } },
          { id: "l", header: "File", cell: (i) => (safeLink(i.link) ? <a href={i.link} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">Open file</a> : <span className="text-muted-foreground">No link</span>) },
          { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (i) => <RowActions name={i.name} onEdit={canEdit ? () => setSheet({ open: true, item: i }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => saveSettings("legal", items.filter((x) => x.id !== i.id))} /> },
        ]}
      />
      <Sheet open={sheet.open} onOpenChange={(o) => !o && setSheet({ open: false })}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{sheet.item ? `Edit ${f.kind.toLowerCase()}` : `Add ${f.kind.toLowerCase()}`}</SheetTitle>
            <SheetDescription>The file stays where you keep it, such as SharePoint. Add a link to it.</SheetDescription>
          </SheetHeader>
          <SheetBody>
            <Field label="Kind" htmlFor="lg-k">
              <NativeSelect id="lg-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as LegalItem["kind"] })}>
                <option>Permit</option>
                <option>Legal requirement</option>
              </NativeSelect>
            </Field>
            <Field label="Name" htmlFor="lg-n" error={errors.name}><Input id="lg-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Business permit" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Issued by" htmlFor="lg-b"><Input id="lg-b" value={f.issuedBy} onChange={(e) => setF({ ...f, issuedBy: e.target.value })} /></Field>
              <Field label="Number" htmlFor="lg-no" optional><Input id="lg-no" value={f.number ?? ""} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
              <Field label="Site" htmlFor="lg-s">
                <NativeSelect id="lg-s" value={f.site} onChange={(e) => setF({ ...f, site: e.target.value })}>
                  {siteNames.map((s) => <option key={s}>{s}</option>)}
                </NativeSelect>
              </Field>
              <Field label="Owner" htmlFor="lg-o">
                <NativeSelect id="lg-o" value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}><PeopleOptions /></NativeSelect>
              </Field>
              <Field label={f.kind === "Permit" ? "Expires" : "Last reviewed"} htmlFor="lg-e" error={errors.expires} optional={f.kind !== "Permit"}>
                <Input id="lg-e" type="date" value={(f.kind === "Permit" ? f.expires : f.reviewed) ?? ""} onChange={(e) => setF(f.kind === "Permit" ? { ...f, expires: e.target.value } : { ...f, reviewed: e.target.value })} />
              </Field>
            </div>
            <Field label="Link to the file" htmlFor="lg-l" optional error={errors.link}><Input id="lg-l" value={f.link ?? ""} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://" /></Field>
          </SheetBody>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setSheet({ open: false })}>Cancel</Button>
            <Button onClick={save}>{sheet.item ? "Save" : `Add ${f.kind.toLowerCase()}`}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

export const EXPORT_PARTS = [
  ["profile", "Profile"],
  ["scope", "Scope and exclusions"],
  ["sites", "Sites and head count"],
  ["chart", "Org chart"],
  ["legal", "Legal & permits"],
  ["context", "Context"],
  ["parties", "Interested parties"],
  ["terms", "Terms"],
] as const
type PartId = (typeof EXPORT_PARTS)[number][0]

export function ExportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [parts, setParts] = React.useState<PartId[]>(["profile", "scope", "sites", "chart", "context", "parties"])
  const navigate = useNavigate()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Organization &amp; Scope</DialogTitle>
          <DialogDescription>One document with your logo, a cover and contents. Tick what to include, then print or save it as a PDF.</DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">Sections</legend>
          {EXPORT_PARTS.map(([id, label]) => (
            <label key={id} className="flex items-center gap-2.5 text-sm">
              <Checkbox checked={parts.includes(id)} onCheckedChange={(v) => setParts((p) => (v ? [...p, id] : p.filter((x) => x !== id)))} />
              {label}
            </label>
          ))}
        </fieldset>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={parts.length === 0}
            onClick={() => {
              onOpenChange(false)
              navigate(`/qms/organization/print?parts=${EXPORT_PARTS.map(([id]) => id).filter((id) => parts.includes(id)).join(",")}`)
            }}
          >
            <PrinterIcon /> Open printable version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The printable Organization & Scope, outside the app shell. The browser makes the PDF; nothing is stored. */
export function OrgPrint() {
  const { state, settings, can, user } = useStore()
  const [params] = useSearchParams()
  if (!can("Organization & Scope")) return <div className="mx-auto max-w-3xl p-6"><NotFound /></div>
  const parts = (params.get("parts") ?? "").split(",").filter((p): p is PartId => EXPORT_PARTS.some(([id]) => id === p))
  const label = (id: PartId) => EXPORT_PARTS.find(([x]) => x === id)![1]
  const scopeDoc = state.documents.find((d) => d.id === SCOPE_DOCUMENT)
  const scope = scopeDoc?.scopeContent ?? INITIAL_SCOPE
  const org = settings.org
  const p = settings.profile
  const facts = (rows: [string, React.ReactNode][]) => (
    <dl className="grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-[180px_minmax(0,1fr)] print:grid-cols-[180px_minmax(0,1fr)]">
      {rows.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  )
  const table = (head: string[], rows: React.ReactNode[][]) => (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>{head.map((h) => <th key={h} className="border border-foreground/20 bg-muted px-2 py-1.5 text-left font-semibold">{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, k) => <td key={k} className="border border-foreground/20 px-2 py-1.5 align-top">{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  )
  const body: Record<PartId, React.ReactNode> = {
    profile: facts([["Trading name", org.name], ["Registered name", org.legal], ["TIN", org.tin], ["Industry", org.industry], ["Head office", org.address], ["What we do", p.about], ["Main customers", p.customers], ["Founded", p.founded], ["Standard", ISO_EDITION], ["Certification body", settings.certification.body], ["Accreditation", p.accreditation], ["Certificate number", p.certificateNo], ...p.custom.map((c) => [c.label, c.value] as [string, string])]),
    scope: <div className="flex flex-col gap-3"><p className="text-sm leading-relaxed">{scope.statement}</p>{facts([["Products and services", scope.products], ["Sites", scope.sites], ["Not applicable", scope.exclusions], ["Standard", scope.standard]])}</div>,
    sites: table(["Site", "Kind", "Address", "People", "Processes", "In scope"], settings.sites.map((s) => [s.name, s.kind, s.address, s.people, s.processes.join(", "), s.inScope ? "Yes" : "No"])),
    chart: <OrgTree nodes={settings.orgChart} print />,
    legal: table(["Permit or requirement", "Issued by", "Site", "Owner", "Status"], settings.legal.map((i) => [i.name, [i.issuedBy, i.number].filter(Boolean).join(" · "), i.site, i.owner, legalStatus(i).label])),
    context: table(["Type", "Issue", "What it means for the QMS"], state.issues.map((i) => [i.kind, i.issue, i.effect])),
    parties: table(["Interested party", "What they need", "How we keep track"], state.parties.map((x) => [x.name, x.needs, x.howMonitored])),
    terms: table(["Term", "What it means", "Source"], [...state.glossary].sort((a, b) => a.term.localeCompare(b.term)).map((t) => [t.term, t.meaning, t.source])),
  }
  return (
    <div className="min-h-screen bg-background print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-3 print:hidden">
        <Link to="/qms/organization" className="text-[0.8125rem] font-medium text-primary">Back to Organization &amp; Scope</Link>
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-muted-foreground">Your browser makes the PDF. ThryveMS doesn’t store one.</span>
          <Button onClick={() => window.print()}><PrinterIcon /> Print or save as PDF</Button>
        </span>
      </div>
      <article className="mx-auto flex max-w-[880px] flex-col gap-8 bg-card px-4 py-8 sm:px-8 sm:py-10 print:max-w-none print:px-0 print:py-0">
        <header className="flex flex-col gap-3 border-b pb-6 print:break-after-page print:border-0">
          <span className="text-[0.8125rem] text-muted-foreground">{org.name} · {ISO_EDITION}</span>
          <h1 className="text-[1.75rem] font-semibold leading-tight">Organization &amp; Scope</h1>
          <p className="text-sm text-muted-foreground">{org.legal} · {org.address}</p>
          <nav aria-label="Contents" className="flex flex-col gap-1 pt-2">
            <h2 className="text-sm font-semibold">Contents</h2>
            <ol className="list-decimal pl-5 text-sm">
              {parts.map((id) => <li key={id}>{label(id)}</li>)}
            </ol>
          </nav>
        </header>
        {parts.map((id, i) => (
          <section key={id} className="flex flex-col gap-3 print:break-inside-avoid-page" aria-label={label(id)}>
            <h2 className="text-lg font-semibold">{i + 1}. {label(id)}</h2>
            {body[id]}
          </section>
        ))}
        {parts.length === 0 && <EmptyLine title="Nothing chosen" body="Go back and tick at least one section." />}
        <footer className="border-t pt-4 text-xs text-muted-foreground">Made from ThryveMS on {formatDate(nowIso().slice(0, 10))} for {user.name}.</footer>
      </article>
    </div>
  )
}

