import { formatDate } from "@/lib/periods"
import * as React from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { useStore } from "@/lib/store"
import { auditRights, questionsOf } from "@/lib/audit-workflow"
import {
  auditForms,
  formBuilderPath,
  formRights,
  formTitle,
} from "@/lib/audit-form-policy"
import { auditLocked } from "@/lib/audit-report-policy"
import {
  latestAssessment,
  executionQuestionVisible,
} from "@/lib/audit-execution"
import { PageHeader, ViewChips } from "@/components/app/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { DataTable } from "@/components/app/data-table"
import { NativeSelect } from "@/components/ui/input"
import { Field } from "@/components/app/form"
import { AuditFormApprovalPanel } from "./form-approval"
import NotFound from "@/pages/not-found"

export default function AuditResults() {
  const { id } = useParams(),
    { state, user, role } = useStore(),
    [params, setParams] = useSearchParams()
  const [view, setView] = React.useState("Responses")
  const audit = state.audits.find((a) => a.id === id)
  if (!audit) return <NotFound />
  const rights = auditRights(audit, user, role)
  const forms = auditForms(state, audit.id).filter(
    (c) => formRights(state, c, user, role).view,
  )
  const requested =
    params.get("form") &&
    state.auditChecklists.find(
      (c) =>
        c.auditId === audit.id &&
        c.id === params.get("form") &&
        formRights(state, c, user, role).view,
    )
  if (params.get("form") && !requested) return <NotFound />
  const form = requested || forms[0]
  const versions = new Set(
    state.auditChecklists
      .filter(
        (c) => c.auditId === audit.id && formRights(state, c, user, role).view,
      )
      .map((c) => c.id),
  )
  const responses = state.auditeeResponses.filter(
    (r) =>
      r.auditId === audit.id &&
      (!params.get("form") || r.checklistId === form?.id),
  )
  const assignments = state.questionnaireAssignments.filter(
    (a) =>
      a.auditId === audit.id &&
      (!params.get("form") || a.checklistId === form?.id),
  )
  const findings = state.auditFindings.filter(
    (f) =>
      f.auditId === audit.id &&
      (!params.get("form") || f.checklistId === form?.id),
  )
  const assessed = state.auditChecklists
    .filter(
      (c) =>
        versions.has(c.id) &&
        c.status === "Released" &&
        (!params.get("form") || c.id === form?.id),
    )
    .flatMap((c) =>
      questionsOf(c)
        .filter(
          (q) =>
            q.type !== "Instruction" &&
            executionQuestionVisible(state, c.id, q.id),
        )
        .map((q) => ({
          id: `${c.id}:${q.id}`,
          form: c,
          q,
          assessment: latestAssessment(state, c.id, q.id),
        })),
    )
  const author = rights.assigned || rights.manage
  return (
    <>
      <PageHeader
        title="Audit results"
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
        ]}
        description={`${audit.process}. Respondent answers, auditor conclusions and findings remain separate and attributable.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}`}>Back to audit</Link>
            </Button>
            {author && (
              <Button variant="outline" asChild>
                <Link to={`/audits/${audit.id}/report`}>Audit report</Link>
              </Button>
            )}
          </>
        }
      />
      <Alert tone="info">
        {author
          ? "Review the submitted answers, complete independent assessments, resolve findings, then complete each form below. A questionnaire can collect answers without requiring an auditor assessment."
          : "You can see your own questionnaire responses and findings sent to you for review."}
      </Alert>
      {author && (
        <Card>
          <CardContent className="flex flex-wrap items-end gap-4">
            <Field label="Form results" htmlFor="results-form">
              <NativeSelect
                id="results-form"
                value={params.get("form") ?? ""}
                onChange={(e) =>
                  setParams(e.target.value ? { form: e.target.value } : {})
                }
              >
                <option value="">All permitted forms and versions</option>
                {state.auditChecklists
                  .filter((c) => versions.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {formTitle(c)} · version {c.version}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/questionnaires`}>
                Assign questionnaires
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      <ViewChips
        value={view}
        onChange={setView}
        views={[
          "Responses",
          ...(author ? ["Assessments"] : []),
          "Findings",
        ].map((id) => ({ id, label: id }))}
      />
      {view === "Responses" && (
        <>
          <DataTable
            label="Questionnaire responses"
            rows={responses}
            getRowId={(r) => r.id}
            minWidth={760}
            empty={{
              title: assignments.length
                ? "No responses saved yet"
                : "No questionnaires assigned",
              body: "Mark a questionnaire ready, assign respondents and ask them to submit their answers. Each respondent has a separate response record.",
            }}
            columns={[
              {
                id: "question",
                header: "Question",
                cell: (r) => (
                  <span className="flex max-w-md flex-col gap-1 whitespace-normal">
                    <span>
                      {questionsOf(
                        state.auditChecklists.find(
                          (c) => c.id === r.checklistId,
                        ),
                      ).find((q) => q.id === r.questionId)?.text ??
                        r.questionId}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {r.checklistId} · version {r.version}
                    </span>
                  </span>
                ),
              },
              { id: "who", header: "Respondent", cell: (r) => r.respondent },
              {
                id: "answer",
                header: "Answer",
                cell: (r) => (
                  <span className="block max-w-sm whitespace-pre-wrap break-words">
                    {r.selectedValues?.join(", ") || r.value || "No answer"}
                  </span>
                ),
              },
              {
                id: "status",
                header: "Status",
                cell: (r) => (
                  <Badge tone={r.status === "Submitted" ? "done" : "draft"}>
                    {r.status}
                  </Badge>
                ),
              },
              {
                id: "open",
                header: "Review",
                cell: (r) => (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={`/audits/${audit.id}/questionnaires/${r.assignmentId}`}
                    >
                      View answers and history
                    </Link>
                  </Button>
                ),
              },
            ]}
          />
          <Card>
            <CardHeader>
              <CardTitle>Respondent progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {!assignments.length && (
                <p className="text-sm text-muted-foreground">
                  No assignments yet.
                </p>
              )}
              {assignments.map((a) => (
                <Link
                  key={a.id}
                  to={`/audits/${audit.id}/questionnaires/${a.id}`}
                  className="flex flex-wrap justify-between gap-2 rounded-md border p-3 text-sm"
                >
                  <span>
                    {a.respondent} · {a.checklistId} · due{" "}
                    {formatDate(a.dueDate)}
                  </span>
                  <Badge>{a.status}</Badge>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
      {view === "Assessments" && author && (
        <DataTable
          label="Auditor assessments"
          rows={assessed}
          getRowId={(x) => x.id}
          minWidth={760}
          empty={{
            title: "No released questions yet",
            body: "Prepare the forms and ask the lead to mark them ready first.",
          }}
          columns={[
            {
              id: "question",
              header: "Question",
              cell: ({ q, form }) => (
                <span className="flex max-w-md flex-col gap-1 whitespace-normal">
                  <span>{q.text}</span>
                  <span className="text-xs text-muted-foreground">
                    {formTitle(form)} · version {form.version}
                  </span>
                </span>
              ),
            },
            { id: "auditor", header: "Auditor", cell: ({ q }) => q.askedBy },
            {
              id: "result",
              header: "Result",
              cell: ({ q, assessment }) =>
                assessment?.result ||
                (q.assessmentRequired === false && q.respondBy !== "Auditor"
                  ? "Assessment optional"
                  : "Not assessed"),
            },
            {
              id: "status",
              header: "Completion",
              cell: ({ assessment }) => assessment?.status ?? "Not started",
            },
            {
              id: "open",
              header: "Review",
              cell: ({ q, form }) => (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    to={`/audits/${audit.id}/conduct?version=${form.id}&question=${q.id}`}
                  >
                    Open assessment
                  </Link>
                </Button>
              ),
            },
          ]}
        />
      )}
      {view === "Findings" && (
        <>
          <Alert tone="info">
            Findings record verified observations, opportunities and
            nonconformities. An answer or completed assessment does not
            automatically raise a finding. The responsible auditor raises it;
            the lead requests the auditee’s response and records its final
            disposition.
          </Alert>
          <DataTable
            label="Audit findings"
            rows={findings}
            getRowId={(f) => f.id}
            minWidth={700}
            empty={{
              title: "No findings recorded",
              body: "An audit with no findings can still be completed and reported.",
            }}
            columns={[
              {
                id: "title",
                header: "Finding",
                cell: (f) => (
                  <Link
                    className="text-primary whitespace-normal"
                    to={`/audits/findings/${f.id}`}
                  >
                    {f.id} · {f.title}
                  </Link>
                ),
              },
              {
                id: "class",
                header: "Classification",
                cell: (f) => f.classification,
              },
              { id: "auditor", header: "Auditor", cell: (f) => f.auditor },
              {
                id: "state",
                header: "Review",
                cell: (f) =>
                  f.status === "Final" && f.discussion?.decision === "Disputed"
                    ? "Final · disagreement recorded"
                    : f.status,
              },
              {
                id: "nc",
                header: "Corrective action",
                cell: (f) =>
                  f.ncId ? (
                    <Link
                      className="text-primary"
                      to={`/corrective-action/${f.ncId}`}
                    >
                      {f.ncId}
                    </Link>
                  ) : ["Minor NC", "Major NC"].includes(f.classification) ? (
                    f.disposition?.outcome === "Withdrawn" ? (
                      "Withdrawn with a recorded reason"
                    ) : (
                      "Needs a linked action"
                    )
                  ) : (
                    "Not required"
                  ),
              },
            ]}
          />
        </>
      )}
      {author && form && !auditLocked(state, audit.id) && (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4">
              <Field
                label="Form to complete or review"
                htmlFor="completion-form"
              >
                <NativeSelect
                  id="completion-form"
                  value={form.id}
                  onChange={(e) => setParams({ form: e.target.value })}
                >
                  {forms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formTitle(c)}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Button variant="outline" asChild>
                <Link to={formBuilderPath(form)}>Open form builder</Link>
              </Button>
            </CardContent>
          </Card>
          <AuditFormApprovalPanel key={form.id} form={form} />
        </>
      )}
    </>
  )
}
