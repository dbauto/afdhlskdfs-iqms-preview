import * as React from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { CircleCheckIcon, CircleIcon, ListChecksIcon, PencilIcon, PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { auditRights, latestChecklist, questionsOf } from "@/lib/audit-workflow"
import { latestAssessment } from "@/lib/audit-execution"
import { RecordLink } from "@/components/app/record-link"
import { Alert } from "@/components/ui/alert"
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
const STEP_OF: Record<string, number> = {
  Planned: 0,
  "Checklist ready": 1,
  Held: 2,
  "Findings agreed": 3,
  "Report late": 4,
  "Report issued": 5,
  "Follow-up": 0,
}

export default function AuditDetail() {
  const { id } = useParams(),
    navigate = useNavigate()
  const { state, update, user, role } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  const [edit, setEdit] = React.useState(false)
  const findings = state.auditFindings.filter((f) => f.auditId === id)
  const checklist = latestChecklist(state, id ?? "", true)
  const questions = questionsOf(checklist).filter((q) => q.type !== "Instruction")
  const completed = questions.filter((q) => latestAssessment(state, checklist?.id ?? "", q.id)?.status === "Completed").length
  const currentChecklist = latestChecklist(state, id ?? "")
  const [editors, setEditors] = React.useState<string[]>(["Kim Dela Cruz"])
  const [readers, setReaders] = React.useState<string[]>(["Ana Cruz", "Eric Navarro"])

  if (!audit) return <NotFound />

  const rights = auditRights(audit, user, role)
  if (
    !rights.assigned &&
    !rights.manage &&
    state.questionnaireAssignments.some((a) => a.auditId === audit.id && a.respondent === user.name)
  )
    return (
      <>
        <PageHeader title={`${audit.process} audit`} description={`${audit.id} · ${audit.date} · Lead ${audit.lead}`} />
        <Card>
          <CardHeader>
            <CardTitle>Your assigned questionnaires</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {state.questionnaireAssignments
              .filter((a) => a.auditId === audit.id && a.respondent === user.name)
              .map((a) => (
                <Link key={a.id} className="text-primary" to={`/audits/${audit.id}/questionnaires/${a.id}`}>
                  Open questionnaire {a.id} · {a.status}
                </Link>
              ))}
          </CardContent>
        </Card>
      </>
    )
  const effectiveState = audit.state === "Checklist ready" && !checklist ? "Planned" : audit.state
  const step = STEP_OF[effectiveState] ?? 0
  const late = audit.state === "Report late"
  const issued = audit.state === "Report issued"
  const isLead = audit.lead === user.name
  const rich = audit.id === "IA-2026-06"
  const readiness = [
    { label: "Every checklist question answered", done: !!questions.length && completed === questions.length },
    { label: "Findings agreed with the auditee", done: !!checklist && findings.every((f) => f.status !== "Draft") },
    {
      label: "Nonconformities raised in Corrective Action",
      done: !!checklist && findings.filter((f) => ["Minor NC", "Major NC"].includes(f.classification)).every((f) => !!f.ncId),
    },
    { label: "Summary and conclusion written", done: false },
  ]

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: audit.id }]}
        title={`${audit.process} audit`}
        badge={<StateBadge value={late ? "Report late" : effectiveState} />}
        meta={
          <MetaLine parts={[audit.id, `${issued || step >= 2 ? "Held" : "Planned for"} ${audit.date}`, `Lead ${audit.lead}`]} />
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/questionnaires`}>Questionnaires</Link>
            </Button>
            {(rights.assigned || rights.manage) && latestChecklist(state, audit.id, true) && (
              <Button asChild>
                <Link to={`/audits/${audit.id}/conduct`}>Conduct audit</Link>
              </Button>
            )}
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
                disabled
                variant="outline"
                title="Report issuance is unavailable until the versioned report workflow is completed"
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
            steps={STEPS.map((s, i) => ({
              label: s,
              when: rich ? ["12 Jan", "28 Aug", "4 Sep", "11 Sep", issued ? "Today" : "Was due 7 Oct"][i] : undefined,
            }))}
            current={issued ? 5 : step}
            late={late}
          />
        </CardContent>
      </Card>

      {late && (
        <YourStep
          title={isLead ? "Your step: issue the report" : `Waiting on ${audit.lead} to issue the report`}
          due="6 days late"
          tone="overdue"
        >
          The audit was held and findings are agreed. Write the summary, then issue the report. Kim Dela Cruz can edit the draft
          with you.
        </YourStep>
      )}

      <Alert tone="info">
        {!checklist
          ? `Next: prepare the checklist and questionnaire, then ask ${audit.lead} to mark it ready.`
          : `Next: assign questionnaires where needed, then conduct the audit. ${completed} of ${questions.length} checklist items completed.`}
      </Alert>
      <RemarkBanner kind={"Audit"} id={audit.id} />
      <RecordLayout
        main={
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Checklist</CardTitle>
                  <span className="text-[0.8125rem] text-muted-foreground">
                    {checklist
                      ? `${completed} of ${questions.length} checklist items completed. Open Conduct audit to record assessments.`
                      : `Checklist version ${currentChecklist?.version ?? 1} is not released. Build questions, then mark it ready.`}
                  </span>
                </div>
                <Button variant="quiet" size="sm" asChild>
                  <Link to={`/audits/${audit.id}/checklist`}>Open checklist</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm">
                  {completed} of {questions.length} checklist items completed.
                </p>
                {checklist && (rights.assigned || rights.manage) ? (
                  <Button variant="outline" className="self-start" asChild>
                    <Link to={`/audits/${audit.id}/conduct`}>Open auditor checklist</Link>
                  </Button>
                ) : (
                  <EmptyState
                    icon={ListChecksIcon}
                    title="Checklist not released"
                    body={`The lead auditor, ${audit.lead}, must mark the checklist ready before the audit can be conducted.`}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                {!issued && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!checklist || !rights.assigned}
                    onClick={() => navigate(`/audits/${audit.id}/conduct`)}
                  >
                    <PlusIcon /> Add finding
                  </Button>
                )}
              </CardHeader>
              <ul>
                {findings.length === 0 && <li className="px-5 py-4 text-sm text-muted-foreground">No findings yet.</li>}
                {findings.map((x, i) => (
                  <li
                    key={i}
                    className={cn("flex items-start justify-between gap-4 px-5 py-3.5", i > 0 && "border-t border-rule-soft")}
                  >
                    <span className="flex flex-col gap-0.5">
                      <RecordLink kind="audit-finding" id={x.id} label={x.title}>
                        {x.title}
                      </RecordLink>
                      <span className="text-[0.8125rem] text-muted-foreground">
                        {x.id} · clause {x.clause} · {x.owner}
                        {x.ncId ? ` · ${x.ncId}` : ""}
                      </span>
                    </span>
                    <StateBadge value={x.classification} />
                  </li>
                ))}
              </ul>
            </Card>
            <RemarksPanel
              target={{
                kind: "Audit",
                id: audit.id,
                label: `${audit.id} ${audit.process}`,
                to: `/audits/${audit.id}`,
                area: "Audits",
              }}
            />
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
                    {r.done || issued ? (
                      <CircleCheckIcon className="size-4 text-done" />
                    ) : (
                      <CircleIcon className="size-4 text-overdue" />
                    )}
                    {r.label}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-0.5">
                  <CardTitle>Report, shared with</CardTitle>
                  <span className="text-[0.8125rem] text-muted-foreground">Only the lead auditor can issue it</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label="Can edit">
                  <div className="flex items-center gap-2 text-sm">
                    <Avatar name={audit.lead} size={24} /> {audit.lead} (lead)
                  </div>
                  <PeoplePicker
                    label="Can edit the report"
                    value={editors}
                    onChange={setEditors}
                    exclude={[audit.lead]}
                    placeholder="Add an editor"
                  />
                </Field>
                <Field label="Can read before it is issued">
                  <PeoplePicker
                    label="Can read before it is issued"
                    value={readers}
                    onChange={setReaders}
                    placeholder="Add a reader"
                  />
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
    </>
  )
}
