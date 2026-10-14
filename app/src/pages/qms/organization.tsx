import * as React from "react"
import { useSearchParams } from "react-router-dom"
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

type Term = { id: string; term: string; meaning: string; source: string; ours: string }

function TermDialog({ open, onOpenChange, term }: { open: boolean; onOpenChange: (v: boolean) => void; term?: Term }) {
  const { add, update } = useStore()
  const [f, setF] = React.useState({ term: "", meaning: "", source: "Company term", ours: "" })
  React.useEffect(() => {
    if (open) setF({ term: term?.term ?? "", meaning: term?.meaning ?? "", source: term?.source ?? "Company term", ours: term?.ours ?? "" })
  }, [open, term])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{term ? "Edit term" : "Add term"}</DialogTitle>
          <DialogDescription>Terms people at your company use, in plain words. ISO 9000 is the source for standard terms (clause 3).</DialogDescription>
        </DialogHeader>
        <Field label="Term" htmlFor="gt-t">
          <Input id="gt-t" value={f.term} onChange={(e) => setF({ ...f, term: e.target.value })} />
        </Field>
        <Field label="What it means" htmlFor="gt-m">
          <Textarea id="gt-m" value={f.meaning} onChange={(e) => setF({ ...f, meaning: e.target.value })} className="min-h-20" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Source" htmlFor="gt-s" help="For example ISO 9000, 3.6.9">
            <Input id="gt-s" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} />
          </Field>
          <Field label="How we use it" htmlFor="gt-o" optional>
            <Input id="gt-o" value={f.ours} onChange={(e) => setF({ ...f, ours: e.target.value })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (!f.term.trim() || !f.meaning.trim()) return
              if (term) update("glossary", term.id, f)
              else add("glossary", { id: `g-${Date.now()}`, ...f })
              toast(term ? "Term saved" : `${f.term} added to the glossary`)
              onOpenChange(false)
            }}
          >
            {term ? "Save changes" : "Add term"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Organization() {
  const { state, remove, can } = useStore()
  const [params] = useSearchParams()
  const [tab, setTab] = React.useState(params.get("tab") ?? "scope")
  const [termDlg, setTermDlg] = React.useState<{ open: boolean; term?: Term }>({ open: false })
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
            <Button onClick={() => (tab === "context" ? setIssue({ open: true }) : tab === "terms" ? setTermDlg({ open: true }) : setParty({ open: true }))}>
              <PlusIcon /> {tab === "context" ? "Add issue" : tab === "terms" ? "Add term" : "Add interested party"}
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
          <TabsTrigger value="terms">
            Terms <span className="text-xs font-normal text-muted-foreground">{state.glossary.length}</span>
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
                <span className="text-[0.8125rem] text-muted-foreground">QMS-MAN-001 rev 07, approved 12 Mar 2026</span>
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => toast("A new revision of QMS-MAN-001 was started")}>
                  Revise scope
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="max-w-3xl text-[0.9375rem] leading-relaxed">
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

        <TabsContent value="terms" className="flex flex-col gap-4">
          <p className="max-w-[720px] text-sm leading-normal text-muted-foreground">
            The words your company uses in the QMS, so everyone reads records the same way. Standard terms come from ISO 9000 (ISO 9001 clause 3). A glossary is optional, but it helps training and audits.
          </p>
          <DataTable
            label="Glossary"
            rows={[...state.glossary].sort((a, b) => a.term.localeCompare(b.term))}
            getRowId={(t) => t.id}
            minWidth={860}
            columns={[
              { id: "t", header: "Term", cell: (t) => <span className="whitespace-nowrap font-medium">{t.term}</span> },
              { id: "m", header: "What it means", cell: (t) => <span className="leading-normal">{t.meaning}</span>, className: "min-w-[320px]" },
              { id: "s", header: "Source", cell: (t) => <Badge tone={t.source === "Company term" ? "draft" : "progress"}>{t.source}</Badge> },
              { id: "o", header: "How we use it", cell: (t) => <span className="text-muted-foreground">{t.ours}</span> },
              { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (t) => <RowActions name={t.term} onEdit={canEdit ? () => setTermDlg({ open: true, term: t }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => remove("glossary", t.id)} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Roles, responsibilities and authorities</CardTitle>
              <span className="text-[0.8125rem] text-muted-foreground">Clause 5.3</span>
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

      <TermDialog open={termDlg.open} term={termDlg.term} onOpenChange={(o) => setTermDlg((s) => ({ ...s, open: o }))} />
      <PartyDialog open={party.open} party={party.party} onOpenChange={(o) => setParty((s) => ({ ...s, open: o }))} />
      <IssueDialog open={issue.open} issue={issue.issue} onOpenChange={(o) => setIssue((s) => ({ ...s, open: o }))} />
    </>
  )
}
