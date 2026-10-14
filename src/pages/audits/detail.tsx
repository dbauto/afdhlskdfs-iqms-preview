import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { CircleCheckIcon, CircleIcon, ListChecksIcon, PencilIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { AUDIT_CHECKS } from "@/data/records"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input, NativeSelect } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EmptyState, KeyFacts, LifecycleTrack, MetaLine, PageHeader, RecordLayout, YourStep } from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { Field, PeoplePicker } from "@/components/app/form"
import NotFound from "@/pages/not-found"
import { PlanAuditSheet } from "./plan-sheet"

const STEPS = ["Planned", "Checklist ready", "Audit held", "Findings agreed", "Report issued"]
const STEP_OF: Record<string, number> = { Planned: 0, "Checklist ready": 1, Held: 2, "Findings agreed": 3, "Report late": 4, "Report issued": 5, "Follow-up": 0 }

export default function AuditDetail() {
  const { id } = useParams()
  const { state, update, user } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const [edit, setEdit] = React.useState(false)
  const [finding, setFinding] = React.useState(false)
  const [f, setF] = React.useState({ title: "", clause: "8.7", kind: "Observation" })
  const [findings, setFindings] = React.useState(() =>
    id === "IA-2026-06"
      ? [
          { title: "Concessions released without customer signature", meta: "F-2026-12, clause 8.7, raised as NC-2026-011, owner Ana Cruz", kind: "Minor nonconformity" },
          { title: "Reject bin labels faded at bench 2", meta: "F-2026-13, clause 8.7, no action required", kind: "Observation" },
        ]
      : []
  )
  const [editors, setEditors] = React.useState<string[]>(["Kim Dela Cruz"])
  const [readers, setReaders] = React.useState<string[]>(["Ana Cruz", "Eric Navarro"])

  if (!audit) return <NotFound />

  const step = STEP_OF[audit.state] ?? 0
  const late = audit.state === "Report late"
  const issued = audit.state === "Report issued"
  const isLead = audit.lead === user.name
  const rich = audit.id === "IA-2026-06"
  const readiness = [
    { label: "Every checklist question answered", done: rich },
    { label: "Findings agreed with the auditee", done: rich },
    { label: "Nonconformities raised in Corrective Action", done: rich },
    { label: "Summary and conclusion written", done: false },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: audit.id }]}
        title={`${audit.process} audit`}
        badge={<StateBadge value={late ? "Report late" : audit.state} />}
        meta={<MetaLine parts={[audit.id, `${issued || step >= 2 ? "Held" : "Planned for"} ${audit.date}`, `Lead ${audit.lead}`]} />}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/checklist`}>
                <ListChecksIcon /> Checklist
              </Link>
            </Button>
            {!issued && (
              <Button variant="outline" onClick={() => setEdit(true)}>
                <PencilIcon /> Edit
              </Button>
            )}
            {late && (
              <Button
                disabled={!isLead}
                title={isLead ? undefined : "Only the lead auditor can issue the report"}
                onClick={() => {
                  update("audits", audit.id, { state: "Report issued" })
                  toast(`${audit.id} report issued`, { description: "Sent to the auditee and the process owner." })
                }}
              >
                Issue report
              </Button>
            )}
          </>
        }
      />

      <Card>
        <CardContent className="py-5">
          <LifecycleTrack
            steps={STEPS.map((s, i) => ({ label: s, when: rich ? ["12 Jan", "28 Aug", "4 Sep", "11 Sep", issued ? "Today" : "Was due 7 Oct"][i] : undefined }))}
            current={issued ? 5 : step}
            late={late}
          />
        </CardContent>
      </Card>

      {late && (
        <YourStep title={isLead ? "Your step: issue the report" : `Waiting on ${audit.lead} to issue the report`} due="6 days late" tone="overdue">
          The audit was held and findings are agreed. Write the summary, then issue the report. Kim Dela Cruz can edit the draft with you.
        </YourStep>
      )}

      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Checklist</CardTitle>
                  <span className="text-[13px] text-muted-foreground">{rich ? "8 questions: 6 conform, 1 nonconformity, 1 observation" : "Built from the process template. Answers appear here during the audit."}</span>
                </div>
                <Button variant="quiet" size="sm" asChild>
                  <Link to={`/audits/${audit.id}/checklist`}>Open checklist</Link>
                </Button>
              </CardHeader>
              {rich ? (
                <div className="overflow-x-auto">
                  <Table className="min-w-[680px]">
                    <TableHeader>
                      <tr>
                        <TableHead>Clause</TableHead>
                        <TableHead>Question and what was seen</TableHead>
                        <TableHead>Result</TableHead>
                      </tr>
                    </TableHeader>
                    <TableBody>
                      {AUDIT_CHECKS.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="align-top font-medium">{c.clause}</TableCell>
                          <TableCell>
                            <span className="flex flex-col gap-1">
                              <span className="font-medium">{c.q}</span>
                              <span className="text-[13px] text-muted-foreground">{c.note}</span>
                            </span>
                          </TableCell>
                          <TableCell className="align-top">
                            <StateBadge value={c.result} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState icon={ListChecksIcon} title="Not started yet" body="Answers are recorded during the audit, on a laptop or phone." />
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                {!issued && (
                  <Button variant="outline" size="sm" onClick={() => setFinding(true)}>
                    <PlusIcon /> Add finding
                  </Button>
                )}
              </CardHeader>
              <ul>
                {findings.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No findings yet.</li>}
                {findings.map((x, i) => (
                  <li key={i} className={cn("flex items-start justify-between gap-4 px-5 py-3.5", i > 0 && "border-t border-rule-soft")}>
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{x.title}</span>
                      <span className="text-[13px] text-muted-foreground">{x.meta}</span>
                    </span>
                    <StateBadge value={x.kind} />
                  </li>
                ))}
              </ul>
            </Card>
          </>
        }
        side={
          <>
            <Card>
              <CardHeader>
                <CardTitle>Report readiness</CardTitle>
              </CardHeader>
              <ul className="flex flex-col gap-2.5 px-5 py-4">
                {readiness.map((r) => (
                  <li key={r.label} className="flex items-center gap-2.5 text-sm">
                    {r.done || issued ? <CircleCheckIcon className="size-4 text-done" /> : <CircleIcon className="size-4 text-overdue" />}
                    {r.label}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Report, shared with</CardTitle>
                  <span className="text-[13px] text-muted-foreground">Only the lead auditor can issue it</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label="Can edit">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar name={audit.lead} size={24} /> {audit.lead} (lead)
                  </div>
                  <PeoplePicker label="Can edit the report" value={editors} onChange={setEditors} exclude={[audit.lead]} placeholder="Add an editor" />
                </Field>
                <Field label="Can read before it is issued">
                  <PeoplePicker label="Can read before it is issued" value={readers} onChange={setReaders} placeholder="Add a reader" />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="py-1">
                <KeyFacts
                  facts={[
                    { k: "Process", v: audit.process },
                    { k: "Type", v: `${audit.kind} internal audit` },
                    { k: "Clauses", v: audit.clauses.join(", ") },
                    { k: "Lead auditor", v: audit.lead === user.name ? `${audit.lead} (you)` : audit.lead },
                    { k: "Auditors", v: audit.auditors.join(", ") || "None" },
                    { k: "Auditee", v: state.processes.find((p) => p.name === audit.process)?.owner },
                  ]}
                />
              </CardContent>
            </Card>
          </>
        }
      />

      <PlanAuditSheet open={edit} onOpenChange={setEdit} audit={audit} />

      <Dialog open={finding} onOpenChange={setFinding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add finding</DialogTitle>
            <DialogDescription>A nonconformity is also raised in Corrective Action, owned by the process owner.</DialogDescription>
          </DialogHeader>
          <Field label="Finding" htmlFor="f-title">
            <Input id="f-title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clause" htmlFor="f-clause">
              <NativeSelect id="f-clause" value={f.clause} onChange={(e) => setF({ ...f, clause: e.target.value })}>
                {audit.clauses.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Result" htmlFor="f-kind">
              <NativeSelect id="f-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                <option>Observation</option>
                <option>Minor nonconformity</option>
                <option>Major nonconformity</option>
                <option>Opportunity for improvement</option>
              </NativeSelect>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!f.title.trim()) return
                setFindings((x) => [...x, { title: f.title.trim(), meta: `New, clause ${f.clause}`, kind: f.kind }])
                toast(f.kind.includes("nonconformity") ? "Finding added and nonconformity raised" : "Finding added")
                setF({ title: "", clause: audit.clauses[0] ?? "", kind: "Observation" })
                setFinding(false)
              }}
            >
              Add finding
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

