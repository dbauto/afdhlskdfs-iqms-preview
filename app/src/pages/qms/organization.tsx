import * as React from "react"
import { BuildingIcon, CircleCheckIcon, PlusIcon, UsersIcon, WavesIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ContextIssue, InterestedParty } from "@/data/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, KeyFacts, PageHeader } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"

function PartyDialog({ open, onOpenChange, party }: { open: boolean; onOpenChange: (v: boolean) => void; party?: InterestedParty }) {
  const { add, update } = useStore()
  const [f, setF] = React.useState({ name: "", needs: "", howMonitored: "" })
  React.useEffect(() => {
    if (open) setF({ name: party?.name ?? "", needs: party?.needs ?? "", howMonitored: party?.howMonitored ?? "" })
  }, [open, party])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{party ? "Edit interested party" : "Add interested party"}</DialogTitle>
          <DialogDescription>Who has a stake in the QMS, what they need from it, and how you keep track. Clause 4.2.</DialogDescription>
        </DialogHeader>
        <Field label="Who" htmlFor="ip-n">
          <Input id="ip-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="What they need" htmlFor="ip-needs">
          <Textarea id="ip-needs" value={f.needs} onChange={(e) => setF({ ...f, needs: e.target.value })} className="min-h-20" />
        </Field>
        <Field label="How you keep track" htmlFor="ip-how">
          <Input id="ip-how" value={f.howMonitored} onChange={(e) => setF({ ...f, howMonitored: e.target.value })} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!f.name.trim()) return
              if (party) update("parties", party.id, f)
              else add("parties", { id: `ip-${Date.now()}`, ...f })
              toast(party ? "Saved" : `${f.name} added`)
              onOpenChange(false)
            }}
          >
            {party ? "Save changes" : "Add interested party"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IssueDialog({ open, onOpenChange, issue }: { open: boolean; onOpenChange: (v: boolean) => void; issue?: ContextIssue }) {
  const { add, update } = useStore()
  const [f, setF] = React.useState<{ kind: "Internal" | "External"; issue: string; effect: string }>({ kind: "External", issue: "", effect: "" })
  React.useEffect(() => {
    if (open) setF({ kind: issue?.kind ?? "External", issue: issue?.issue ?? "", effect: issue?.effect ?? "" })
  }, [open, issue])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{issue ? "Edit issue" : "Add issue"}</DialogTitle>
          <DialogDescription>Internal and external issues that affect what the QMS can achieve. Clause 4.1.</DialogDescription>
        </DialogHeader>
        <Field label="Internal or external" htmlFor="ci-k">
          <NativeSelect id="ci-k" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "Internal" | "External" })}>
            <option>External</option>
            <option>Internal</option>
          </NativeSelect>
        </Field>
        <Field label="Issue" htmlFor="ci-i">
          <Input id="ci-i" value={f.issue} onChange={(e) => setF({ ...f, issue: e.target.value })} />
        </Field>
        <Field label="What it means for the QMS" htmlFor="ci-e">
          <Input id="ci-e" value={f.effect} onChange={(e) => setF({ ...f, effect: e.target.value })} />
        </Field>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!f.issue.trim()) return
              if (issue) update("issues", issue.id, f)
              else add("issues", { id: `ci-${Date.now()}`, ...f })
              onOpenChange(false)
            }}
          >
            {issue ? "Save changes" : "Add issue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Organization() {
  const { state, remove, can } = useStore()
  const [tab, setTab] = React.useState("scope")
  const [party, setParty] = React.useState<{ open: boolean; party?: InterestedParty }>({ open: false })
  const [issue, setIssue] = React.useState<{ open: boolean; issue?: ContextIssue }>({ open: false })
  const canEdit = can("Organization & Scope", "Add and edit")
  const people = state.people.slice(0, 15)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS", to: "/qms/processes" }, { label: "Organization & Scope" }]}
        title="Organization & Scope"
        description="Who we are, what the QMS covers, and who has a stake in it. ISO 9001 clauses 4.1 to 4.3 and 5.3."
        actions={
          canEdit && (
            <Button onClick={() => (tab === "context" ? setIssue({ open: true }) : setParty({ open: true }))}>
              <PlusIcon /> {tab === "context" ? "Add issue" : "Add interested party"}
            </Button>
          )
        }
      />
      <FigureGrid
        figures={[
          { value: "Rev 07", label: "QMS scope", badge: "Current", tone: "done", icon: BuildingIcon },
          { value: state.issues.length, label: "Internal and external issues", badge: "2 added this quarter", tone: "progress", icon: WavesIcon },
          { value: state.parties.length, label: "Interested parties", badge: "1 review due", tone: "soon", icon: UsersIcon },
          { value: 17, label: "People with defined roles", badge: "All assigned", tone: "done", icon: CircleCheckIcon },
        ]}
      />
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="context">
            Context <span className="text-xs font-normal text-muted-foreground">{state.issues.length}</span>
          </TabsTrigger>
          <TabsTrigger value="parties">
            Interested parties <span className="text-xs font-normal text-muted-foreground">{state.parties.length}</span>
          </TabsTrigger>
          <TabsTrigger value="chart">
            Roles <span className="text-xs font-normal text-muted-foreground">17</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle>Scope of the QMS</CardTitle>
                <span className="text-[13px] text-muted-foreground">QMS-MAN-001 rev 07, approved 12 Mar 2026</span>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => toast("A new revision of QMS-MAN-001 was started")}>
                  Revise scope
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="max-w-3xl text-[15px] leading-relaxed">
                The design, manufacture, inspection and delivery of precision machined and assembled components for industrial equipment makers, carried out at the Arden &amp; Co. head office and production plant.
              </p>
              <KeyFacts
                facts={[
                  { k: "Products and services", v: "Machined components, sub-assemblies, and design support for customer-specified parts." },
                  { k: "Sites", v: "Head office and production plant. Outsourced heat treatment and plating are controlled as external processes." },
                  { k: "Not applicable", v: "None. All ISO 9001 requirements apply." },
                  { k: "Standard", v: "ISO 9001, certified since 2019. Next surveillance audit February 2027." },
                ]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <DataTable
            label="Context issues"
            rows={state.issues}
            getRowId={(i) => i.id}
            minWidth={760}
            columns={[
              { id: "k", header: "Type", cell: (i) => <Badge tone={i.kind === "External" ? "progress" : "draft"}>{i.kind}</Badge> },
              { id: "i", header: "Issue", cell: (i) => <span className="font-medium">{i.issue}</span> },
              { id: "e", header: "What it means for the QMS", cell: (i) => <span className="text-muted-foreground">{i.effect}</span> },
              { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (i) => <RowActions name="this issue" onEdit={canEdit ? () => setIssue({ open: true, issue: i }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => remove("issues", i.id)} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="parties">
          <DataTable
            label="Interested parties"
            rows={state.parties}
            getRowId={(p) => p.id}
            minWidth={820}
            columns={[
              { id: "n", header: "Interested party", cell: (p) => <span className="flex items-center gap-2 font-medium">{p.name}{p.reviewDue && <Badge tone="soon">Review due</Badge>}</span> },
              { id: "w", header: "What they need", cell: (p) => <span className="text-muted-foreground">{p.needs}</span> },
              { id: "h", header: "How we keep track", cell: (p) => p.howMonitored },
              { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (p) => <RowActions name={p.name} onEdit={canEdit ? () => setParty({ open: true, party: p }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => remove("parties", p.id)} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Roles, responsibilities and authorities</CardTitle>
              <span className="text-[13px] text-muted-foreground">Clause 5.3</span>
            </CardHeader>
            <ul className="grid sm:grid-cols-2 xl:grid-cols-3">
              {people.map((p, i) => (
                <li key={p.id} className={cn("flex items-center gap-3 border-rule-soft px-5 py-3", i > 0 && "border-t sm:[&:nth-child(2)]:border-t-0 xl:[&:nth-child(3)]:border-t-0")}>
                  <Avatar name={p.name} size={32} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{p.title}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      <PartyDialog open={party.open} party={party.party} onOpenChange={(o) => setParty((s) => ({ ...s, open: o }))} />
      <IssueDialog open={issue.open} issue={issue.issue} onOpenChange={(o) => setIssue((s) => ({ ...s, open: o }))} />
    </>
  )
}
