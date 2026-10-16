import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { PageHeader, KeyFacts } from "@/components/app/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RecordLink } from "@/components/app/record-link"
import { AuditReferenceLink } from "@/components/app/audit-evidence"
import { formatDate } from "@/lib/periods"
import { auditRights } from "@/lib/audit-workflow"
import { auditAuditee, auditLocked } from "@/lib/audit-report-policy"
import { formRights, findingReviewLocked } from "@/lib/audit-form-policy"
import { Field } from "@/components/app/form"
import { Button } from "@/components/ui/button"
import { Textarea, NativeSelect } from "@/components/ui/input"
import { Alert } from "@/components/ui/alert"
import { NcSheet } from "@/pages/improvement/nc-sheet"
import { FindingEditSheet } from "./finding-edit-sheet"
import NotFound from "@/pages/not-found"
export default function AuditFindingDetail() {
  const { id } = useParams(),
    { user } = useStore()
  return <FindingWorkspace key={`${id}:${user.id}`} id={id} />
}
function FindingWorkspace({ id }: { id?: string }) {
  const { state, user, role, auditCommand, can } = useStore()
  const f = state.auditFindings.find((f) => f.id === id),
    audit = state.audits.find((a) => a.id === f?.auditId)
  const [error, setError] = React.useState(""),
    [editing, setEditing] = React.useState(false),
    [outcome, setOutcome] = React.useState<"Confirmed" | "Withdrawn">(
      "Confirmed",
    ),
    [nc, setNc] = React.useState(false),
    [existingNc, setExistingNc] = React.useState("")
  const draftKey = `thryvems.finding-comment:${id}:${user.id}`
  const [comment, setComment] = React.useState(
    () => sessionStorage.getItem(draftKey) ?? "",
  )
  React.useEffect(() => {
    if (comment) sessionStorage.setItem(draftKey, comment)
    else sessionStorage.removeItem(draftKey)
  }, [comment, draftKey])
  if (!f || !audit) return <NotFound />
  const rights = auditRights(audit, user, role),
    form = state.auditChecklists.find((c) => c.id === f.checklistId)
  const lead = rights.lead,
    auditee = auditAuditee(state, audit),
    ownReview = user.name === auditee
  const locked =
    auditLocked(state, audit.id) || (!!form && findingReviewLocked(form))
  const historical =
    !!form &&
    state.auditChecklists.some(
      (c) =>
        c.auditId === audit.id &&
        c.formId === form.formId &&
        c.version > form.version,
    )
  const canWork = !locked
  const linkNc =
    canWork &&
    !!form &&
    formRights(state, form, user, role).edit &&
    (lead || (rights.assigned && f.auditor === user.name))
  const act = (fn: () => void, message: string) => {
    try {
      fn()
      setError("")
      setComment("")
      toast(message)
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <>
      <PageHeader
        title={f.title}
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: f.auditId, to: `/audits/${f.auditId}` },
        ]}
        description={`${f.id} · ${f.classification} · ${f.disposition?.outcome === "Withdrawn" ? "Withdrawn" : f.status}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${f.auditId}/results`}>
                Responses and results
              </Link>
            </Button>
            {canWork &&
              !historical &&
              !form?.withdrawnAt &&
              f.status === "Draft" &&
              !f.reviewRequestedAt &&
              !!form &&
              formRights(state, form, user, role).edit &&
              (lead || (rights.assigned && f.auditor === user.name)) && (
                <Button onClick={() => setEditing(true)}>Edit finding</Button>
              )}
          </>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card>
        <CardContent className="py-4">
          <KeyFacts
            facts={[
              { k: "Audit", v: <RecordLink kind="audit" id={f.auditId} /> },
              {
                k: "Question",
                v: form ? (
                  <Link
                    className="text-primary"
                    to={`/audits/${f.auditId}/conduct?version=${f.checklistId}&question=${f.questionId}`}
                  >
                    {f.questionId}
                  </Link>
                ) : (
                  f.questionId
                ),
              },
              { k: "Auditor", v: f.auditor },
              { k: "Process", v: f.process },
              { k: "Clause", v: f.clause },
              { k: "Form version", v: String(f.version) },
              { k: "Owner", v: f.owner },
              { k: "Raised", v: formatDate(f.at.slice(0, 10)) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Requirement, facts and evidence</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="whitespace-pre-wrap break-words">{f.requirement}</p>
          <p className="whitespace-pre-wrap break-words">{f.facts}</p>
          {f.evidence.map((r, i) => (
            <AuditReferenceLink key={i} reference={r} />
          ))}
          {f.ncId && <RecordLink kind="nonconformity" id={f.ncId} />}
          {!f.ncId &&
            f.disposition?.outcome !== "Withdrawn" &&
            ["Minor NC", "Major NC"].includes(f.classification) && (
              <>
                <Alert tone="warning">
                  This nonconformity must be linked to a corrective action
                  before the finding and form can be finalized.
                </Alert>
                {linkNc && (
                  <>
                    <Button
                      variant="outline"
                      className="self-start"
                      disabled={!can("Corrective Action", "Add and edit")}
                      onClick={() => setNc(true)}
                    >
                      Raise corrective action
                    </Button>
                    <Field
                      label="Existing corrective action"
                      htmlFor="finding-existing-nc"
                    >
                      <NativeSelect
                        id="finding-existing-nc"
                        value={existingNc}
                        onChange={(e) => setExistingNc(e.target.value)}
                      >
                        <option value="">
                          Choose an existing nonconformity
                        </option>
                        {state.ncs
                          .filter((n) => n.process === audit.process)
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.id} · {n.title}
                            </option>
                          ))}
                      </NativeSelect>
                    </Field>
                    <Button
                      variant="outline"
                      className="self-start"
                      disabled={!existingNc}
                      onClick={() =>
                        act(
                          () =>
                            auditCommand({
                              kind: "linkFindingNc",
                              auditId: audit.id,
                              findingId: f.id,
                              ncId: existingNc,
                            }),
                          "Corrective action linked",
                        )
                      }
                    >
                      Link existing corrective action
                    </Button>
                  </>
                )}
              </>
            )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Auditee review and final disposition</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm">
            The auditee, {auditee ?? "not yet assigned"}, records agreement or
            disagreement. The lead then finalizes the finding. A disagreement
            remains part of the report, together with the lead’s resolution.
          </p>
          {!locked && (historical || form?.withdrawnAt) && (
            <Alert tone="info">
              The source form is{" "}
              {form?.withdrawnAt ? "withdrawn" : "an earlier version"}.
              Questions, responses and assessments stay unchanged. Its
              outstanding findings still require auditee review and final
              disposition.
            </Alert>
          )}
          {locked && (
            <Alert tone="info">
              This finding is read-only.{" "}
              {historical
                ? "Use the current form version for new work."
                : "The lead must start a report amendment if issued, then reopen form completion before changing the finding."}
            </Alert>
          )}
          {f.reviewRequestedAt && (
            <p className="text-sm">
              Review requested on {formatDate(f.reviewRequestedAt.slice(0, 10))}
              .
            </p>
          )}
          {f.discussion && (
            <Alert
              tone={f.discussion.decision === "Disputed" ? "warning" : "info"}
            >
              {f.discussion.by}: {f.discussion.decision}.{" "}
              {f.discussion.comment || "No comment recorded."}
            </Alert>
          )}
          {f.disposition && (
            <p className="whitespace-pre-wrap break-words text-sm">
              {f.disposition.outcome === "Withdrawn"
                ? "Withdrawn"
                : "Finalized"}{" "}
              by {f.disposition.by}:{" "}
              {f.disposition.reason || "Auditee agreement confirmed."}
            </p>
          )}
          {canWork && lead && f.status !== "Final" && (
            <Field label="Final disposition" htmlFor="finding-disposition">
              <NativeSelect
                id="finding-disposition"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value as typeof outcome)}
              >
                <option value="Confirmed">Confirm the finding</option>
                <option value="Withdrawn">
                  Withdraw with a recorded reason
                </option>
              </NativeSelect>
            </Field>
          )}
          {canWork &&
            (lead ||
              (ownReview && f.reviewRequestedAt && f.status !== "Final")) && (
              <Field
                label={
                  ownReview
                    ? "Your review comment"
                    : "Lead resolution or reason to reopen"
                }
                htmlFor="finding-review-comment"
              >
                <Textarea
                  id="finding-review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </Field>
            )}
          <div className="flex flex-wrap gap-2">
            {canWork && lead && !f.reviewRequestedAt && (
              <Button
                variant="outline"
                onClick={() =>
                  act(
                    () =>
                      auditCommand({
                        kind: "requestFindingReview",
                        auditId: audit.id,
                        findingId: f.id,
                      }),
                    "Finding sent to the auditee",
                  )
                }
              >
                Request auditee review
              </Button>
            )}
            {canWork &&
              ownReview &&
              f.reviewRequestedAt &&
              f.status !== "Final" && (
                <>
                  <Button
                    onClick={() =>
                      act(
                        () =>
                          auditCommand({
                            kind: "respondToFinding",
                            auditId: audit.id,
                            findingId: f.id,
                            decision: "Agreed",
                            comment,
                          }),
                        "Agreement recorded",
                      )
                    }
                  >
                    Agree with finding
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      act(
                        () =>
                          auditCommand({
                            kind: "respondToFinding",
                            auditId: audit.id,
                            findingId: f.id,
                            decision: "Disputed",
                            comment,
                          }),
                        "Disagreement recorded",
                      )
                    }
                  >
                    Dispute finding
                  </Button>
                </>
              )}
            {canWork && lead && f.status !== "Final" && (
              <Button
                variant="outline"
                disabled={!f.discussion}
                onClick={() =>
                  act(
                    () =>
                      auditCommand({
                        kind: "finalizeAuditFinding",
                        auditId: audit.id,
                        findingId: f.id,
                        reason: comment,
                        outcome,
                      }),
                    "Finding finalized",
                  )
                }
              >
                Finalize finding
              </Button>
            )}
            {canWork && lead && (f.status === "Final" || f.discussion) && (
              <Button
                variant="outline"
                onClick={() =>
                  act(
                    () =>
                      auditCommand({
                        kind: "reopenAuditFinding",
                        auditId: audit.id,
                        findingId: f.id,
                        reason: comment,
                      }),
                    "Finding reopened",
                  )
                }
              >
                Reopen finding
              </Button>
            )}
          </div>
          {lead && !f.discussion && f.reviewRequestedAt && (
            <p className="text-sm text-muted-foreground">
              Waiting for {auditee} to agree or dispute this finding.
            </p>
          )}
          <details className="text-sm">
            <summary>Finding review history</summary>
            {!f.history?.length && (
              <p className="mt-2">No review actions recorded.</p>
            )}
            {f.history?.map((h, i) => (
              <p key={i} className="mt-3 whitespace-pre-wrap break-words">
                {h.action} · {h.by} · {formatDate(h.at.slice(0, 10))}:{" "}
                {h.comment || "No comment"}
              </p>
            ))}
            {f.revisions?.map((r, i) => (
              <div key={i} className="mt-3 border-t pt-2">
                <p>
                  Earlier wording · {r.by} · {formatDate(r.at.slice(0, 10))}
                </p>
                <p className="whitespace-pre-wrap break-words">
                  {r.title}: {r.requirement} — {r.facts}
                </p>
              </div>
            ))}
          </details>
        </CardContent>
      </Card>
      <NcSheet open={nc} onOpenChange={setNc} auditFinding={f} />
      {editing && (
        <FindingEditSheet finding={f} onClose={() => setEditing(false)} />
      )}
    </>
  )
}
