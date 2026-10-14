import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { FileTextIcon, ShieldAlertIcon, TargetIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { fmtKpi, fmtTarget, onTarget } from "@/data/records"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FigureGrid, KeyFacts, PageHeader, RecordLayout } from "@/components/app/page"
import { DocStage, NcStage, RiskLevel } from "@/components/app/status"
import { Field } from "@/components/app/form"
import NotFound from "@/pages/not-found"
import { Sparkbars } from "./objectives"

export default function ProcessDetail() {
  const { id } = useParams()
  const { state, update, can } = useStore()
  const p = state.processes.find((x) => x.id === id)
  const [edit, setEdit] = React.useState(false)
  const [f, setF] = React.useState({ purpose: "", inputs: "", activities: "", outputs: "" })
  if (!p) return <NotFound />

  const docs = state.documents.filter((d) => d.process === p.name)
  const risks = state.risks.filter((r) => r.process === p.name)
  const kpis = state.objectives.filter((o) => o.process === p.name)
  const ncs = state.ncs.filter((n) => n.process === p.name && n.stage < 6)
  const audits = state.audits.filter((a) => a.process === p.name)

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "QMS" }, { label: "Processes", to: "/qms/processes" }, { label: `${p.id} ${p.name}` }]}
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
      <FigureGrid
        figures={[
          { value: docs.length, label: "Documents", badge: `${docs.filter((d) => d.reviewOverdue || d.lateBy).length} overdue`, tone: "overdue", icon: FileTextIcon },
          { value: risks.filter((r) => r.kind === "Risk").length, label: "Open risks", badge: `${risks.filter((r) => r.likelihood * r.impact >= 15).length} high`, tone: "overdue", icon: ShieldAlertIcon },
          { value: `${kpis.filter((k) => onTarget(k)).length} of ${kpis.length}`, label: "Objectives on target", badge: kpis.some((k) => !onTarget(k)) ? "Below target" : "On target", tone: kpis.some((k) => !onTarget(k)) ? "soon" : "done", icon: TargetIcon },
          { value: ncs.length, label: "Open nonconformities", badge: `${ncs.filter((n) => n.severity === "Major").length} major`, tone: "overdue", icon: TriangleAlertIcon },
        ]}
      />

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
                          <span className="text-[13px] font-semibold">{t as string}</span>
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
                    <Link to="/qms/objectives" className="text-[13px] font-medium text-primary">
                      All objectives
                    </Link>
                  </CardHeader>
                  <ul>
                    {kpis.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No objectives for this process.</li>}
                    {kpis.map((k, i) => (
                      <li key={k.id} className={cn("flex flex-wrap items-center gap-4 px-5 py-4", i > 0 && "border-t border-rule-soft")}>
                        <span className="flex min-w-[200px] flex-1 flex-col">
                          <span className="text-sm font-medium">{k.name}</span>
                          <span className="text-[13px] text-muted-foreground">target {fmtTarget(k)}</span>
                        </span>
                        <Sparkbars o={k} />
                        <span className={cn("w-16 text-right text-lg font-semibold", onTarget(k) ? "text-done" : "text-overdue")}>{fmtKpi(k)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            }
            side={
              <Card>
                <CardHeader>
                  <CardTitle>People</CardTitle>
                </CardHeader>
                <CardContent className="py-1">
                  <KeyFacts
                    facts={[
                      { k: "Owner", v: p.owner },
                      { k: "Involved", v: p.involved },
                      { k: "Feeds", v: p.feeds },
                      { k: "Clauses", v: p.clauses },
                    ]}
                  />
                </CardContent>
              </Card>
            }
          />
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <ul>
              {docs.map((d, i) => (
                <li key={d.id} className={cn("grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/documents/${d.id}`} className="flex flex-col">
                    <span className="text-[13px] font-medium text-primary">{d.id}</span>
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
            <ul>
              {risks.map((r, i) => (
                <li key={r.id} className={cn("flex items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <RiskLevel risk={r} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium">{r.title}</span>
                    <span className="text-[13px] text-muted-foreground">
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
            <ul>
              {ncs.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No open nonconformities.</li>}
              {ncs.map((n, i) => (
                <li key={n.id} className={cn("grid grid-cols-[minmax(0,1fr)_200px] items-center gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/corrective-action/${n.id}`} className="flex flex-col">
                    <span className="text-[13px] font-medium text-primary">{n.id}</span>
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
            <ul>
              {audits.map((a, i) => (
                <li key={a.id} className={cn("flex items-center justify-between gap-4 px-5 py-3", i > 0 && "border-t border-rule-soft")}>
                  <Link to={`/audits/${a.id}`} className="flex flex-col">
                    <span className="text-[13px] font-medium text-primary">{a.id}</span>
                    <span className="text-sm">{a.date}, lead {a.lead}</span>
                  </Link>
                  <Badge tone={a.state === "Report late" ? "overdue" : a.state === "Report issued" ? "done" : "progress"}>{a.state}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </TabsContent>
      </Tabs>

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
                <Textarea id={`p-${k}`} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className="min-h-28 text-[13px]" />
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

