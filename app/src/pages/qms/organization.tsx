import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { BuildingIcon, CircleCheckIcon, PlusIcon, UsersIcon, WavesIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { INITIAL_SCOPE, SCOPE_DOCUMENT, controlledRevision, documentRights } from "@/lib/document-control"
import { RevisionSheet } from "@/pages/documents/revision-sheet"
import { DocSheet } from "@/pages/documents/doc-sheet"
import { Alert } from "@/components/ui/alert"
import { formatDate, todayIso } from "@/lib/periods"
import { cn } from "@/lib/utils"
import type { ContextIssue, InterestedParty } from "@/data/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/app/data-table"
import { FigureGrid, KeyFacts, PageHeader, EmptyLine } from "@/components/app/page"
import { RowActions } from "@/components/app/record-actions"
import { Field } from "@/components/app/form"
import { ExportDialog, LegalTab, OrgChartTab, ProfileTab, SitesTab } from "./org-sections"
import { PrinterIcon } from "lucide-react"

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
              if (party) update("parties", party.id, { ...f, changedDate: todayIso() })
              else add("parties", { id: `ip-${Date.now()}`, ...f, changedDate: todayIso() })
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
              if (issue) update("issues", issue.id, { ...f, changedDate: todayIso() })
              else add("issues", { id: `ci-${Date.now()}`, ...f, changedDate: todayIso() })
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
  const { state, remove, can, user, settings } = useStore()
  const scopeDoc = state.documents.find(d => d.id === SCOPE_DOCUMENT)
  const scopeVisible = can("Documents") && scopeDoc && documentRights(state, user, scopeDoc).view
  const scope = scopeDoc?.scopeContent ?? INITIAL_SCOPE
  const [revisingScope, setRevisingScope] = React.useState(false)
  const [editingScope, setEditingScope] = React.useState(false)
  const [params] = useSearchParams()
  const [tab, setTab] = React.useState(params.get("tab") ?? "scope")
  const [termDlg, setTermDlg] = React.useState<{ open: boolean; term?: Term }>({ open: false })
  const [party, setParty] = React.useState<{ open: boolean; party?: InterestedParty }>({ open: false })
  const [issue, setIssue] = React.useState<{ open: boolean; issue?: ContextIssue }>({ open: false })
  const [exporting, setExporting] = React.useState(false)
  const canEdit = can("Organization & Scope", "Add and edit")

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS", to: "/qms/processes" }, { label: "Organization & Scope" }]}
        title="Organization & Scope"
        description="Who we are, where we work, what the QMS covers, and who has a stake in it. ISO 9001 clauses 4.1 to 4.3 and 5.3."
        actions={
          <>
            <Button variant="outline" onClick={() => setExporting(true)}>
              <PrinterIcon /> Export
            </Button>
            {canEdit && ["context", "terms", "parties"].includes(tab) && (
              <Button onClick={() => (tab === "context" ? setIssue({ open: true }) : tab === "terms" ? setTermDlg({ open: true }) : setParty({ open: true }))}>
                <PlusIcon /> {tab === "context" ? "Add issue" : tab === "terms" ? "Add term" : "Add interested party"}
              </Button>
            )}
          </>
        }
      />
      <RevisionSheet doc={revisingScope ? scopeDoc : undefined} onClose={() => setRevisingScope(false)} />
      <DocSheet open={editingScope} doc={scopeDoc} onOpenChange={setEditingScope} />
      <FigureGrid
        figures={[
          { value: scopeVisible ? `Rev ${scopeDoc.rev}` : "No data", label: "QMS scope", badge: scopeVisible ? scopeDoc.stage === "Published" ? scopeDoc.effectivity === "Suspended" ? "Suspended" : "Current" : scopeDoc.stage : undefined, tone: scopeVisible && scopeDoc.stage === "Published" && scopeDoc.effectivity !== "Suspended" ? "done" : "draft", icon: BuildingIcon },
          { value: state.issues.length, label: "Internal and external issues", badge: "2 added this quarter", tone: "progress", icon: WavesIcon },
          { value: state.parties.length, label: "Interested parties", badge: "1 review due", tone: "soon", icon: UsersIcon },
          { value: settings.sites.reduce((n, x) => n + (x.inScope ? x.people : 0), 0), label: "People across the sites", badge: `${settings.sites.length} site${settings.sites.length === 1 ? "" : "s"}`, tone: "progress", icon: CircleCheckIcon },
        ]}
      />
      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="scope">Scope</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="sites">
            Sites <span className="text-xs font-normal text-muted-foreground">{settings.sites.length}</span>
          </TabsTrigger>
          <TabsTrigger value="chart">Org chart</TabsTrigger>
          <TabsTrigger value="legal">
            Legal &amp; permits <span className="text-xs font-normal text-muted-foreground">{settings.legal.length}</span>
          </TabsTrigger>
          <TabsTrigger value="context">
            Context <span className="text-xs font-normal text-muted-foreground">{state.issues.length}</span>
          </TabsTrigger>
          <TabsTrigger value="parties">
            Interested parties <span className="text-xs font-normal text-muted-foreground">{state.parties.length}</span>
          </TabsTrigger>
          <TabsTrigger value="terms">
            Terms <span className="text-xs font-normal text-muted-foreground">{state.glossary.length}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scope">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-0.5">
                <CardTitle>Scope of the QMS</CardTitle>
                <span className="text-[0.8125rem] text-muted-foreground">{scopeVisible ? `${scopeDoc.id} rev ${scopeDoc.rev} · ${scopeDoc.stage}` : "No data"}</span>
              </div>
              {canEdit && scopeVisible && documentRights(state, user, scopeDoc).edit && ["Published", "Draft", "Changes requested"].includes(scopeDoc.stage) && (
                <Button variant="outline" size="sm" onClick={() => scopeDoc.stage === "Published" ? setRevisingScope(true) : setEditingScope(true)}>Revise scope</Button>
              )}
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
              {!scopeVisible ? <EmptyLine title="The scope document is not available to you." /> : <>
                {scopeDoc.stage !== "Published" && scopeDoc.stage !== "Archived" && <Alert tone="info" title={`Revision ${scopeDoc.rev} · ${scopeDoc.stage}`}>This is the proposed scope. {controlledRevision(scopeDoc)?.effectivity === "Suspended" ? "The earlier controlled revision is suspended; saving a draft does not resume it." : "The earlier controlled revision stays in force until this revision is approved and published."} <Link to={`/documents/${scopeDoc.id}`} className="font-medium underline">Open document</Link></Alert>}
                {scopeDoc.stage === "Archived" && <Alert tone="warning">The scope document is archived and is no longer in force.</Alert>}
                {scopeDoc.effectivity === "Suspended" && <Alert tone="warning">Effectivity is suspended. Open the document to read the reason.</Alert>}
                <p className="max-w-3xl break-words text-[0.9375rem] leading-relaxed">{scope.statement}</p>
                <KeyFacts facts={[
                  { k: "Products and services", v: scope.products },
                  { k: "Sites", v: scope.sites },
                  { k: "Not applicable", v: scope.exclusions },
                  { k: "Standard", v: scope.standard },
                  { k: "Published on", v: formatDate(scopeDoc.publishedOn) || "No data" },
                ]} />
                <Link to={`/documents/${scopeDoc.id}`} className="self-start text-sm text-primary underline">Open document</Link>
              </>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="context">
          <DataTable
            label="Context issues" empty={{ title: "No issues recorded yet", body: "Add the internal and external issues that affect your QMS, such as market changes or key people leaving. ISO 9001 clause 4.1." }}
            rows={state.issues}
            getRowId={(i) => i.id}
            minWidth={760}
            columns={[
              { id: "k", header: "Type", cell: (i) => <Badge tone={i.kind === "External" ? "progress" : "draft"}>{i.kind}</Badge> },
              { id: "i", header: "Issue", cell: (i) => <Link to={`/qms/organization/issues/${i.id}`} className="font-medium hover:text-primary hover:underline">{i.issue}</Link> },
              { id: "e", header: "What it means for the QMS", cell: (i) => <span className="text-muted-foreground">{i.effect}</span> },
              { id: "x", header: <span className="sr-only">Actions</span>, className: "w-12", cell: (i) => <RowActions name="this issue" onEdit={canEdit ? () => setIssue({ open: true, issue: i }) : undefined} removeKind={canEdit ? "delete" : undefined} onRemove={() => remove("issues", i.id)} /> },
            ]}
          />
        </TabsContent>

        <TabsContent value="parties">
          <DataTable
            label="Interested parties" empty={{ title: "No interested parties yet", body: "Add the groups that matter to your QMS, such as customers, regulators and suppliers, and what they need. ISO 9001 clause 4.2." }}
            rows={state.parties}
            getRowId={(p) => p.id}
            minWidth={820}
            columns={[
              { id: "n", header: "Interested party", cell: (p) => <span className="flex items-center gap-2 font-medium"><Link to={`/qms/organization/parties/${p.id}`} className="hover:text-primary hover:underline">{p.name}</Link>{p.reviewDue && <Badge tone="soon">Review due</Badge>}</span> },
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
            label="Glossary" empty={{ title: "No terms yet", body: "Add the words your company uses with a special meaning, so everyone reads documents the same way." }}
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

        <TabsContent value="profile"><ProfileTab canEdit={canEdit} /></TabsContent>
        <TabsContent value="sites"><SitesTab canEdit={canEdit} /></TabsContent>
        <TabsContent value="chart"><OrgChartTab canEdit={canEdit} /></TabsContent>
        <TabsContent value="legal"><LegalTab canEdit={canEdit} /></TabsContent>
      </Tabs>

      <TermDialog open={termDlg.open} term={termDlg.term} onOpenChange={(o) => setTermDlg((s) => ({ ...s, open: o }))} />
      <PartyDialog open={party.open} party={party.party} onOpenChange={(o) => setParty((s) => ({ ...s, open: o }))} />
      <ExportDialog open={exporting} onOpenChange={setExporting} />
      <IssueDialog open={issue.open} issue={issue.issue} onOpenChange={(o) => setIssue((s) => ({ ...s, open: o }))} />
    </>
  )
}
