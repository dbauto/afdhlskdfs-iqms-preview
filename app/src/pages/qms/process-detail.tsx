import * as React from "react"
import { useParams } from "react-router-dom"
import { ContentLink as Link } from "@/components/app/content-link"
import { FileTextIcon, PlusIcon, ShieldAlertIcon, TargetIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { useStore } from "@/lib/store"
import { RULES } from "@/lib/rules"
import { cn } from "@/lib/utils"
import { fmtKpi, fmtTarget, onTarget, kpiTone } from "@/data/records"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Process } from "@/data/types"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FigureGrid, KeyFacts, PageHeader, RecordLayout } from "@/components/app/page"
import { DocStage, NcStage, RiskLevel } from "@/components/app/status"
import { Field, PeoplePicker } from "@/components/app/form"
import { defaultRoute } from "@/lib/routes"
import NotFound from "@/pages/not-found"
import { DocSheet } from "@/pages/documents/doc-sheet"
import { RiskSheet } from "@/pages/risks/register"
import { PlanAuditSheet } from "@/pages/audits/plan-sheet"
import { NcSheet } from "@/pages/improvement/nc-sheet"
import { Sparkbars } from "./objectives"

/** Header row inside a process tab: what the list is, where else it lives, and the add button. */
/** This process's review route: who reviews and approves its documents, with the company default as fallback. */
function RouteCard({ processName }: { processName: string }) {
  const { state, update, can, routeDefaults } = useStore()
  const p = state.processes.find((x) => x.name === processName)!
  const [open, setOpen] = React.useState(false)
  const [rev, setRev] = React.useState<string[]>([])
  const [app, setApp] = React.useState<string[]>([])
  const effective = defaultRoute("Procedure", p.name, state.processes, state.people, routeDefaults)
  const own = !!(p.route?.reviewers?.length || p.route?.approvers?.length)
  const canEdit = can("Processes", "Add and edit") || can("Documents", "Manage")
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-0.5">
          <CardTitle>Review route</CardTitle>
          <span className="text-[0.8125rem] text-muted-foreground">{own ? "Set for this process" : "Company default"}</span>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => { setRev(p.route?.reviewers ?? []); setApp(p.route?.approvers ?? []); setOpen(true) }}>
            Change
          </Button>
        )}
      </CardHeader>
      <CardContent className="py-1">
        <KeyFacts
          facts={[
            { k: "Technical review", v: effective.reviewers.join(", ") || "Not set" },
            { k: "Approval", v: own && p.route?.approvers?.length ? effective.approvers.join(", ") : `By document type, ${effective.approvers.join(", ")} for procedures` },
          ]}
        />
        <p className="pb-3 text-[0.8125rem] text-muted-foreground">Used for new documents and proposed for each new revision. It can be changed for one revision.</p>
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review route for {p.name}</DialogTitle>
            <DialogDescription>Leave a step empty to use the company default from Settings › Review and approval.</DialogDescription>
          </DialogHeader>
          <Field label="Technical review" help={`Company default: ${routeDefaults.reviewers.join(", ")}`}>
            <PeoplePicker label="Technical reviewers" value={rev} onChange={setRev} />
          </Field>
          <Field label="Approval" help="Company default: set by document type, usually the process owner.">
            <PeoplePicker label="Approvers" value={app} onChange={setApp} />
          </Field>
          <DialogFooter>
            {own && (
              <Button variant="ghost" className="mr-auto" onClick={() => { update("processes", p.id, { route: undefined }); setOpen(false); toast(`${p.name} uses the company default route`) }}>
                Use company default
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => { update("processes", p.id, { route: { reviewers: rev, approvers: app } }); setOpen(false); toast(`Review route saved for ${p.name}`, { description: "Revisions already started keep their route." }) }}>
              Save route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function TabBar({ text, to, toLabel, action }: { text: string; to: string; toLabel: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3">
      <p className="text-[0.8125rem] text-muted-foreground">
        {text} Also listed in{" "}
        <Link to={to} className="font-medium text-primary">
          {toLabel}
        </Link>
        .
      </p>
      {action}
    </div>
  )
}

const Empty = ({ children }: { children: React.ReactNode }) => <li className="px-5 py-4 text-sm text-muted-foreground">{children}</li>

type AddKind = "doc" | "risk" | "nc" | "audit" | null

export default function ProcessDetail() {
  const { id } = useParams()
  const { state, update, can } = useStore()
  const p = state.processes.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  const [adding, setAdding] = React.useState<AddKind>(null)
  const [f, setF] = React.useState({ purpose: "", inputs: "", activities: "", outputs: "" })
  const [assigning, setAssigning] = React.useState(false)
  if (!p) return <NotFound />

  const docs = state.documents.filter((d) => d.process === p.name)
  const risks = state.risks.filter((r) => r.process === p.name)
  const kpis = state.objectives.filter((o) => o.process === p.name)
  const ncs = state.ncs.filter((n) => n.process === p.name && n.stage < 6)
  const audits = state.audits.filter((a) => a.process === p.name)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS" }, { label: "Processes", to: "/qms/processes" }, { label: p.name }]}
        title={p.name}
        description={`Owned by ${p.owner}. Covers ISO 9001 clauses ${p.clauses}.`}
        actions={
          can("Processes", "Add and edit") && (
            <Button
              variant="outline"
              onClick={() => {
                setF({ purpose: p.purpose, inputs: p.inputs.join("\n"), activities: p.activities.join("\n"), outputs: p.outputs.join("\n") })
                setEdit(true)
              }}
            >
              Edit process
            </Button>
          )
        }
      />
      <AssignPeopleDialog open={assigning} onOpenChange={setAssigning} process={p} />
      <FigureGrid
        figures={[
          { value: docs.length, label: "Documents", badge: `${docs.filter((d) => d.reviewOverdue || d.lateBy).length} overdue`, tone: "overdue", icon: FileTextIcon },
          { value: risks.filter((r) => r.kind === "Risk").length, label: "Open risks", badge: `${risks.filter((r) => r.likelihood * r.impact >= RULES.riskHigh).length} high`, tone: "overdue", icon: ShieldAlertIcon },
          { value: `${kpis.filter((k) => onTarget(k)).length} of ${kpis.length}`, label: "Objectives on target", badge: kpis.some((k) => !onTarget(k)) ? "Below target" : "On target", tone: kpis.some((k) => !onTarget(k)) ? "soon" : "done", icon: TargetIcon },
          { value: ncs.length, label: "Open nonconformities", badge: `${ncs.filter((n) => n.severity === "Major").length} major`, tone: "overdue", icon: TriangleAlertIcon },
        ]}
      />

      <RemarkBanner kind="Process" id={p.id} />
      <Tabs defaultValue="summary" className="flex flex-col gap-5">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="docs">Documents <span className="text-xs font-normal text-muted-foreground">{docs.length}</span></TabsTrigger>
          <TabsTrigger value="risks">Risks <span className="text-xs font-normal text-muted-foreground">{risks.length}</span></TabsTrigger>
          <TabsTrigger value="ncs">Nonconformities <span className="text-xs font-normal text-muted-foreground">{ncs.length}</span></TabsTrigger>
          <TabsTrigger value="audits">Audits <span className="text-xs font-normal text-muted-foreground">{audits.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <RecordLayout
            main={
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>How the process works</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-5">
                    <p className="text-sm leading-relaxed">{p.purpose}</p>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        ["Inputs", p.inputs],
                        ["Activities", p.activities],
                        ["Outputs", p.outputs],
                      ].map(([t, list]) => (
                        <div key={t as string} className="flex flex-col gap-2 rounded-md bg-background p-4">
                          <span className="text-[0.8125rem] font-semibold">{t as string}</span>
                          <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
                            {(list as string[]).map((x) => (
                              <li key={x}>{x}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Objectives</CardTitle>
                    <Link to="/qms/objectives" className="text-[0.8125rem] font-medium text-primary">
                      All objectives
                    </Link>
                  </CardHeader>
                  <ul>
                    {kpis.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No objectives for this process.</li>}
                    {kpis.map((k, i) => (
                      <li key={k.id} className={cn("flex flex-wrap items-center gap-4 px-5 py-4", i > 0 && "border-t border-rule-soft")}>
                        <span className="flex min-w-[200px] flex-1 flex-col">
                          <span className="text-sm font-medium">{k.name}</span>
                          <span className="text-[0.8125rem] text-muted-foreground">target {fmtTarget(k)}</span>
                        </span>
                        <Sparkbars o={k} />
                        <span className={cn("w-16 text-right text-lg font-semibold", kpiTone(k))}>{fmtKpi(k)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <RemarksPanel target={{ kind: "Process", id: p.id, label: p.name, to: `/qms/processes/${p.id}`, area: "Processes" }} />
              </>
            }
            side={
              <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>People</CardTitle>
                  {can("Processes", "Manage") && (
                    <Button variant="quiet" size="sm" onClick={() => setAssigning(true)}>
                      Assign people
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="py-1">
                  <KeyFacts
                    facts={[
                      { k: "Owner", v: p.owner },
                      { k: "Works in this process", v: p.members?.length ? p.members.join(", ") : "No one assigned yet" },
                      { k: "Involved", v: p.involved },
                      { k: "Feeds", v: p.feeds },
                      { k: "Clauses", v: p.clauses },
                    ]}
                  />
                </CardContent>
              </Card>
              {can("Documents") && <RouteCard processName={p.name} />}
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <TabBar
              text={`Documents for ${p.name}.`}
              to="/documents"
              toLabel="Documents"
              action={can("Documents", "Add and edit") && <Button size="sm" onClick={() => setAdding("doc")}><PlusIcon /> Add document</Button>}
            />
            <ul>
              {docs.length === 0 && <Empty>No documents for this process yet.</Empty>}
              {docs.map((d, i) => (
                <li key={d.id} className={cn("grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/documents/${d.id}`} className="flex flex-col">
                    <span className="text-[0.8125rem] font-medium text-primary">{d.id}</span>
                    <span className="text-sm font-medium">{d.title}</span>
                  </Link>
                  <DocStage doc={d} />
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
        <TabsContent value="risks">
          <Card>
            <TabBar
              text={`Risks and opportunities for ${p.name}.`}
              to="/risks"
              toLabel="Risks & Opportunities"
              action={can("Risks & Opportunities", "Add and edit") && <Button size="sm" onClick={() => setAdding("risk")}><PlusIcon /> Add risk or opportunity</Button>}
            />
            <ul>
              {risks.length === 0 && <Empty>No risks or opportunities for this process yet.</Empty>}
              {risks.map((r, i) => (
                <li key={r.id} className={cn("flex items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <RiskLevel risk={r} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      {r.id}, {r.action}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
        <TabsContent value="ncs">
          <Card>
            <TabBar
              text={`Open nonconformities for ${p.name}.`}
              to="/corrective-action"
              toLabel="Corrective Action"
              action={can("Corrective Action", "Add and edit") && <Button size="sm" onClick={() => setAdding("nc")}><PlusIcon /> Report nonconformity</Button>}
            />
            <ul>
              {ncs.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No open nonconformities.</li>}
              {ncs.map((n, i) => (
                <li key={n.id} className={cn("grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/corrective-action/${n.id}`} className="flex flex-col">
                    <span className="text-[0.8125rem] font-medium text-primary">{n.id}</span>
                    <span className="text-sm font-medium">{n.title}</span>
                  </Link>
                  <NcStage nc={n} />
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
        <TabsContent value="audits">
          <Card>
            <TabBar
              text={`Internal audits of ${p.name}.`}
              to="/audits"
              toLabel="Audits"
              action={can("Audits", "Add and edit") && <Button size="sm" onClick={() => setAdding("audit")}><PlusIcon /> Plan audit</Button>}
            />
            <ul>
              {audits.length === 0 && <Empty>No audits of this process yet.</Empty>}
              {audits.map((a, i) => (
                <li key={a.id} className={cn("flex items-center justify-between gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/audits/${a.id}`} className="flex flex-col">
                    <span className="text-[0.8125rem] font-medium text-primary">{a.id}</span>
                    <span className="text-sm">{a.date}, lead {a.lead}</span>
                  </Link>
                  <Badge tone={a.state === "Report late" ? "overdue" : a.state === "Report issued" ? "done" : "progress"}>{a.state}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

      {/* The same forms as the Documents, Risks, Corrective Action and Audits pages, with this process filled in.
          They save to the same records, so whatever is added here shows on those pages too. */}
      <DocSheet open={adding === "doc"} onOpenChange={(o) => setAdding(o ? "doc" : null)} defaultProcess={p.name} />
      <RiskSheet open={adding === "risk"} onOpenChange={(o) => setAdding(o ? "risk" : null)} defaultProcess={p.name} />
      <NcSheet open={adding === "nc"} onOpenChange={(o) => setAdding(o ? "nc" : null)} defaultProcess={p.name} />
      <PlanAuditSheet open={adding === "audit"} onOpenChange={(o) => setAdding(o ? "audit" : null)} defaultProcess={p.name} />

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {p.name}</DialogTitle>
            <DialogDescription>One item per line for inputs, activities and outputs.</DialogDescription>
          </DialogHeader>
          <Field label="Purpose" htmlFor="pp">
            <Textarea id="pp" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} className="min-h-20" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            {(["inputs", "activities", "outputs"] as const).map((k) => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)} htmlFor={`p-${k}`}>
                <Textarea id={`p-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="min-h-28 text-[0.8125rem]" />
              </Field>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEdit(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean)
                update("processes", p.id, { purpose: f.purpose, inputs: lines(f.inputs), activities: lines(f.activities), outputs: lines(f.outputs) })
                toast(`${p.name} saved`)
                setEdit(false)
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


/** Who works in a process. People whose role covers only assigned processes see a process, and its records, only when they are listed here or own it. */
function AssignPeopleDialog({ open, onOpenChange, process: p }: { open: boolean; onOpenChange: (v: boolean) => void; process: Process }) {
  const { state, update } = useStore()
  const [members, setMembers] = React.useState<string[]>(p.members ?? [])
  React.useEffect(() => {
    if (open) setMembers(p.members ?? [])
  }, [open, p.members])
  const narrow = (name: string) => {
    const person = state.people.find((x) => x.name === name)
    const scope = state.roles.find((r) => r.id === person?.roleId)?.scope
    return scope === "Processes they own" || scope === "Processes they are assigned to"
  }
  const removed = (p.members ?? []).filter((n) => !members.includes(n) && narrow(n))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who works in {p.name}</DialogTitle>
          <DialogDescription>
            People whose role covers only their assigned processes see this process and its documents, risks, objectives, audits, evidence and actions only if they are listed here. The owner, {p.owner}, always sees it.
          </DialogDescription>
        </DialogHeader>
        <Field label="People in this process" help="Roles that cover all processes, such as Quality manager, already see everything. Adding them here records that they work in the process.">
          <PeoplePicker label="People in this process" value={members} onChange={setMembers} exclude={[p.owner]} searchable />
        </Field>
        {removed.length > 0 && (
          <p className="text-[0.8125rem] text-muted-foreground">
            {removed.join(", ")} will stop seeing {p.name} and its records straight away.
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              update("processes", p.id, { members })
              onOpenChange(false)
              toast(`People saved for ${p.name}`)
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
