import { formatDate } from "@/lib/periods"
import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { CircleCheckIcon, CircleIcon, PencilIcon } from "lucide-react"
import { RemarkBanner, RemarksPanel } from "@/components/app/remarks"
import { auditRights } from "@/lib/audit-workflow"
import { auditForms } from "@/lib/audit-form-policy"
import {
  auditAuditee,
  auditLocked,
  auditStage,
  auditFindingsForReport,
  latestAuditReport,
  reportLate,
} from "@/lib/audit-report-policy"
import { useStore } from "@/lib/store"
import { Avatar } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import {
  KeyFacts,
  LifecycleTrack,
  MetaLine,
  PageHeader,
  RecordLayout,
} from "@/components/app/page"
import { StateBadge } from "@/components/app/status"
import { PlanAuditSheet } from "./plan-sheet"
import { AuditFormList } from "./form-list"
import { CopyAuditPlanSheet } from "./copy-plan-sheet"
import NotFound from "@/pages/not-found"

const STEPS = [
  "Planned",
  "Forms ready",
  "Audit held",
  "Findings resolved",
  "Report issued",
]
export default function AuditDetail() {
  const { id } = useParams(),
    { state, user, role, can } = useStore()
  const [copying, setCopying] = React.useState(false),
    [edit, setEdit] = React.useState(false)
  const audit = state.audits.find((a) => a.id === id)
  if (!audit) return <NotFound />
  const rights = auditRights(audit, user, role),
    forms = auditForms(state, audit.id)
  const own = state.questionnaireAssignments.filter(
    (a) => a.auditId === audit.id && a.respondent === user.name,
  )
  const reviewFindings = state.auditFindings.filter(
    (f) => f.auditId === audit.id && f.reviewRequestedAt,
  )
  if (!rights.assigned && !rights.manage)
    return (
      <>
        <PageHeader
          title={`${audit.process} audit`}
          description={`${audit.id} · ${audit.date} · Lead ${audit.lead}`}
          actions={
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/results`}>
                Your responses and findings
              </Link>
            </Button>
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Your assigned questionnaires</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!own.length && (
              <p className="text-sm text-muted-foreground">
                No questionnaire assigned to you.
              </p>
            )}
            {own.map((a) => (
              <Link
                key={a.id}
                className="text-primary"
                to={`/audits/${audit.id}/questionnaires/${a.id}`}
              >
                Open questionnaire {a.id} · {a.status}
              </Link>
            ))}
          </CardContent>
        </Card>
        {!!reviewFindings.length && (
          <Card>
            <CardHeader>
              <CardTitle>Findings for your review</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {reviewFindings.map((f) => (
                <Link
                  key={f.id}
                  className="text-primary"
                  to={`/audits/findings/${f.id}`}
                >
                  {f.title} · {f.status}
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </>
    )
  const stage = auditStage(state, audit),
    locked = auditLocked(state, audit.id),
    report = latestAuditReport(state, audit.id)
  const findings = auditFindingsForReport(state, audit.id),
    completed = forms.filter((c) => c.completedAt).length
  const step = {
    Planned: 0,
    "Checklist ready": 1,
    Held: 2,
    "Findings agreed": 3,
    "Report issued": 5,
    "Report late": 3,
    "Follow-up": 0,
  }[stage]
  const pendingDraft = forms.find((c) => c.status !== "Released")
  const next = locked
    ? "The issued report is frozen. The lead can start a numbered amendment if a correction is needed."
    : !forms.length
      ? "Add a checklist for auditor checks or a questionnaire for auditee answers. Prepare the questions, then ask the lead to mark each form ready."
      : pendingDraft
        ? `Prepare the questions in “${pendingDraft.title ?? pendingDraft.id}”. Complete its approval route if configured; ${audit.lead} then marks it ready. No approval required still needs the lead’s release.`
        : completed < forms.length
          ? "Assign questionnaires to respondents, review their submitted answers, complete the auditor assessments and resolve findings. Use Responses and results to track the work and complete each form."
          : "Every current form is complete. Each contributing auditor saves their conclusions in Audit report. The lead reviews the findings, writes the final summary and issues the report."
  const ready = [
    {
      label: "Every current form marked ready",
      done: !!forms.length && forms.every((c) => c.status === "Released"),
    },
    {
      label: "Responses, assessments and form approvals complete",
      done: !!forms.length && completed === forms.length,
    },
    {
      label: "Findings finalized with auditee responses",
      done: !!forms.length && findings.every((f) => f.status === "Final"),
    },
    {
      label: "Every nonconformity linked to Corrective Action",
      done:
        !!forms.length &&
        findings
          .filter(
            (f) =>
              ["Minor NC", "Major NC"].includes(f.classification) &&
              f.disposition?.outcome !== "Withdrawn",
          )
          .every((f) => !!f.ncId),
    },
    {
      label: "Report summary and conclusion saved",
      done: !!report?.summary.trim() && !!report.conclusion.trim(),
    },
  ]
  return (
    <>
      {copying && (
        <CopyAuditPlanSheet audit={audit} onClose={() => setCopying(false)} />
      )}
      <PageHeader
        breadcrumbs={[{ label: "Audits", to: "/audits" }, { label: audit.id }]}
        title={`${audit.process} audit`}
        badge={
          <StateBadge
            value={stage === "Findings agreed" ? "Findings resolved" : stage}
          />
        }
        meta={
          <MetaLine
            parts={[
              audit.id,
              `${audit.heldDate ? "Held" : "Planned for"} ${audit.heldDate ? formatDate(audit.heldDate) : audit.date}`,
              `Lead ${audit.lead}`,
            ]}
          />
        }
        actions={
          <>
            <Button asChild>
              <Link to={`/audits/${audit.id}/results`}>
                Responses and results
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/report`}>
                {locked ? "View issued report" : "Audit report"}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/questionnaires`}>
                Questionnaires
              </Link>
            </Button>
            {forms.some((c) => c.status === "Released") && (
              <Button variant="outline" asChild>
                <Link to={`/audits/${audit.id}/conduct`}>Conduct audit</Link>
              </Button>
            )}
            {can("Audits", "Add and edit") && (
              <Button variant="outline" onClick={() => setCopying(true)}>
                Copy to another process
              </Button>
            )}
            {!locked &&
              can("Audits", "Add and edit") &&
              (rights.lead || rights.manage) && (
                <Button variant="outline" onClick={() => setEdit(true)}>
                  <PencilIcon /> Edit plan
                </Button>
              )}
          </>
        }
      />
      <Card>
        <CardContent className="py-5">
          <LifecycleTrack
            steps={STEPS.map((label) => ({ label }))}
            current={step}
            late={reportLate(state, audit)}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Next step</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">{next}</p>
          <p className="text-sm text-muted-foreground">
            {completed} of {forms.length} permitted current forms completed.
            Lead: {audit.lead}. Auditee:{" "}
            {auditAuditee(state, audit) ?? "Choose an auditee in the plan"}.
          </p>
        </CardContent>
      </Card>
      {reportLate(state, audit) && (
        <Alert tone="warning">
          The report was due {audit.reportDueDate}. Complete the outstanding
          work in Audit report before issuance.
        </Alert>
      )}
      <RemarkBanner kind="Audit" id={audit.id} />
      <RecordLayout
        main={
          <>
            <AuditFormList audit={audit} />
            <Card>
              <CardHeader>
                <CardTitle>Findings</CardTitle>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/audits/${audit.id}/results`}>Review results</Link>
                </Button>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Auditors explicitly raise verified observations, opportunities
                  and nonconformities from their assessments. The lead requests
                  the auditee’s response and finalizes each finding.
                </p>
                {!findings.length && (
                  <p className="text-sm">
                    No findings recorded. An audit with no findings can still
                    issue a report.
                  </p>
                )}
                {findings.map((f) => (
                  <Link
                    key={f.id}
                    className="flex flex-wrap justify-between gap-3 rounded-md border p-3"
                    to={`/audits/findings/${f.id}`}
                  >
                    <span className="flex min-w-0 flex-col gap-1 text-sm">
                      <span className="font-medium text-primary break-words">
                        {f.title}
                      </span>
                      <span className="text-muted-foreground">
                        {f.id} · clause {f.clause} · {f.owner} · {f.status}
                        {f.ncId ? ` · ${f.ncId}` : ""}
                      </span>
                    </span>
                    <StateBadge value={f.classification} />
                  </Link>
                ))}
              </CardContent>
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
              <CardContent className="flex flex-col gap-3">
                {ready.map((r) => (
                  <div key={r.label} className="flex items-start gap-2 text-sm">
                    {r.done ? (
                      <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-done" />
                    ) : (
                      <CircleIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span>{r.label}</span>
                  </div>
                ))}
                <Link
                  className="text-sm text-primary"
                  to={`/audits/${audit.id}/report`}
                >
                  Open report and remaining requirements
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Audit team</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  Form preparation, independent assessment and lead release are
                  separate responsibilities.
                </p>
                {[audit.lead, ...audit.auditors].map((name) => (
                  <div key={name} className="flex items-center gap-2 text-sm">
                    <Avatar name={name} size={24} />
                    {name}
                    {name === audit.lead ? " (lead)" : ""}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <KeyFacts
                  facts={[
                    { k: "Process", v: audit.process },
                    { k: "Type", v: `${audit.kind} internal audit` },
                    { k: "Clauses", v: audit.clauses.join(", ") },
                    { k: "Lead auditor", v: audit.lead },
                    { k: "Auditors", v: audit.auditors.join(", ") || "None" },
                    { k: "Auditee", v: auditAuditee(state, audit) },
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
