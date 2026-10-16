import * as React from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import type {
  AuditReport,
  AuditFinding,
  AuditEditorialDecision,
} from "@/data/audit-types"
import type { ReportDraft } from "@/lib/audit-report-commands"
import { useStore } from "@/lib/store"
import { auditRights } from "@/lib/audit-workflow"
import {
  auditAuditee,
  auditFindingsForReport,
  latestAuditReport,
  reportProblems,
  auditLocked,
} from "@/lib/audit-report-policy"
import { formTitle, formRights } from "@/lib/audit-form-policy"
import { formatDate } from "@/lib/periods"
import { useDraftClose } from "@/lib/use-draft-close"
import { PageHeader, KeyFacts, ScrollList } from "@/components/app/page"
import { Field } from "@/components/app/form"
import { AuditReferenceLink } from "@/components/app/audit-evidence"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert } from "@/components/ui/alert"
import { NativeSelect, Textarea } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import NotFound from "@/pages/not-found"

const narrativeFields: { key: keyof ReportDraft; label: string }[] = [
  { key: "objectives", label: "Audit objectives" },
  { key: "scope", label: "Scope" },
  { key: "criteria", label: "Criteria" },
  { key: "evidenceSummary", label: "Evidence and sampling summary" },
  { key: "summary", label: "Report summary" },
  { key: "conclusion", label: "Conclusion" },
  { key: "followUp", label: "Follow-up and recommendations" },
]
export default function AuditReportPage() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    { state } = useStore()
  const audit = state.audits.find((a) => a.id === id)
  if (!audit) return <NotFound />
  return (
    <ReportWorkspace
      key={`${id}:${params.get("version") ?? "current"}`}
      auditId={audit.id}
    />
  )
}
function ReportWorkspace({ auditId }: { auditId: string }) {
  const { state, user, role, auditCommand } = useStore(),
    [params, setParams] = useSearchParams()
  const liveAudit = state.audits.find((a) => a.id === auditId)!,
    latest = latestAuditReport(state, auditId)
  const report = params.get("version")
    ? state.auditReports.find(
        (r) => r.auditId === auditId && r.id === params.get("version"),
      )
    : latest
  const rights = auditRights(liveAudit, user, role)
  const [error, setError] = React.useState(""),
    [confirm, setConfirm] = React.useState(false),
    [amend, setAmend] = React.useState(false),
    [reason, setReason] = React.useState("")
  const close = useDraftClose(!!reason.trim(), () => setAmend(false))
  if (
    (!rights.assigned && !rights.manage) ||
    (params.get("version") && !report)
  )
    return <NotFound />
  const audit = report?.snapshot?.audit ?? liveAudit
  const issued = report?.status === "Issued",
    editable =
      rights.lead &&
      !auditLocked(state, auditId) &&
      !issued &&
      (!report || report.id === latest?.id)
  const restricted = !!report?.restricted
  const draft: ReportDraft = {
    objectives: report?.objectives ?? "",
    scope: report?.scope ?? audit.process,
    criteria:
      report?.criteria ?? audit.clauses.map((c) => `Clause ${c}`).join(", "),
    evidenceSummary: report?.evidenceSummary ?? "",
    summary: report?.summary ?? "",
    conclusion: report?.conclusion ?? "",
    followUp: report?.followUp ?? "",
  }
  const findings =
    report?.snapshot?.findings ?? auditFindingsForReport(state, auditId)
  const forms =
    report?.snapshot?.checklists ??
    state.auditChecklists.filter((c) => c.auditId === auditId)
  const problems = reportProblems(state, liveAudit, report)
  const act = (fn: () => void, message: string) => {
    try {
      fn()
      setError("")
      toast(message)
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    }
  }
  function patch(key: keyof ReportDraft, value: string) {
    try {
      auditCommand({
        kind: "saveAuditReport",
        auditId,
        reportId: report?.id,
        draft: { ...draft, [key]: value },
      })
      setError("")
    } catch (e) {
      setError((e as Error).message)
    }
  }
  return (
    <>
      <PageHeader
        title={`Audit report${report ? ` · version ${report.version}` : ""}`}
        badge={
          <Badge tone={issued ? "done" : "draft"}>
            {issued ? "Issued" : "Draft"}
          </Badge>
        }
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: auditId, to: `/audits/${auditId}` },
        ]}
        description={`${audit.process} · ${issued ? `Issued by ${report.issuedBy} on ${formatDate(report.issuedAt?.slice(0, 10))}. This version is frozen.` : `Lead ${audit.lead}. Each auditor saves their contribution; the lead writes the final report and reviews the findings.`}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${auditId}/results`}>
                Responses and results
              </Link>
            </Button>
            {!restricted && issued && (
              <Button variant="outline" onClick={() => window.print()}>
                Print report
              </Button>
            )}
            {rights.lead && issued && report.id === latest?.id && (
              <Button onClick={() => setAmend(true)}>
                Start report amendment
              </Button>
            )}
            {editable && (
              <Button
                disabled={!!problems.length}
                onClick={() => setConfirm(true)}
              >
                Issue report
              </Button>
            )}
          </>
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4">
          <Field label="Report version" htmlFor="report-version">
            <NativeSelect
              id="report-version"
              value={report?.id ?? ""}
              onChange={(e) =>
                setParams(e.target.value ? { version: e.target.value } : {})
              }
            >
              {!report && <option value="">New draft</option>}
              {state.auditReports
                .filter((r) => r.auditId === auditId)
                .sort((a, b) => b.version - a.version)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    Version {r.version} · {r.status}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          {report?.amendmentReason && (
            <p className="text-sm">Amendment: {report.amendmentReason}</p>
          )}
        </CardContent>
      </Card>
      {restricted && (
        <Alert tone="info">
          You can contribute to the report using your assigned audit work. The
          full report contains forms outside your access and is not available to
          you.
        </Alert>
      )}
      {!issued && !restricted && (
        <Card>
          <CardHeader>
            <CardTitle>Before the lead issues this report</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {!problems.length ? (
              <p className="text-sm text-done">
                All report requirements are complete. The lead can issue this
                version.
              </p>
            ) : (
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="self-start" asChild>
              <Link to={`/audits/${auditId}/results`}>
                Review forms, responses and findings
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {!restricted && (
        <div className="audit-report-print flex min-w-0 flex-col gap-5">
          <div className="hidden print:block">
            <h1 className="text-[1.75rem] font-semibold">
              Audit report · {auditId} · version {report?.version}
            </h1>
            <p className="text-sm">
              Issued by {report?.issuedBy} on{" "}
              {formatDate(report?.issuedAt?.slice(0, 10))}
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Report record</CardTitle>
            </CardHeader>
            <CardContent>
              <KeyFacts
                facts={[
                  { k: "Audit", v: audit.id },
                  { k: "Process", v: audit.process },
                  {
                    k: "Audit date",
                    v: formatDate(report?.dates ?? audit.date),
                  },
                  {
                    k: "Auditors",
                    v: (
                      report?.auditors ?? [audit.lead, ...audit.auditors]
                    ).join(", "),
                  },
                  {
                    k: "Auditee",
                    v: (report?.auditees ?? [auditAuditee(state, audit)])
                      .filter(Boolean)
                      .join(", "),
                  },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Final report</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {editable && (
                <p className="text-sm text-muted-foreground">
                  Report fields save automatically as a draft. Issuing freezes
                  this version and its source records.
                </p>
              )}
              {narrativeFields.map(({ key, label }) => (
                <Field key={key} label={label} htmlFor={`report-${key}`}>
                  {editable ? (
                    <Textarea
                      id={`report-${key}`}
                      value={draft[key]}
                      onChange={(e) => patch(key, e.target.value)}
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {draft[key] || "None recorded"}
                    </p>
                  )}
                </Field>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Auditor contributions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!report?.contributions?.length && (
                <p className="text-sm text-muted-foreground">
                  No contributions saved yet.
                </p>
              )}
              <ScrollList
                count={report?.contributions?.length ?? 0}
                label="Report contributions"
              >
                {report?.contributions?.map((c) => (
                  <li key={c.auditorId}>
                    <article className="min-w-0 rounded-md border p-4 text-sm">
                      <p className="font-medium">
                        {c.auditor} · {formatDate(c.at.slice(0, 10))}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words">
                        {c.summary}
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words">
                        Conclusion: {c.conclusion}
                      </p>
                      {c.followUp && (
                        <p className="mt-2 whitespace-pre-wrap break-words">
                          Follow-up: {c.followUp}
                        </p>
                      )}
                      {!!c.history.length && (
                        <details className="mt-2">
                          <summary>
                            Earlier contribution versions ({c.history.length})
                          </summary>
                          {c.history.map((h, i) => (
                            <div
                              key={i}
                              className="mt-2 border-t pt-2 whitespace-pre-wrap"
                            >
                              {h.summary}
                              <br />
                              {h.conclusion}
                            </div>
                          ))}
                        </details>
                      )}
                    </article>
                  </li>
                ))}
              </ScrollList>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Consolidated findings</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                All original findings stay attributable. Merging records an
                editorial relationship; the original facts, evidence, auditee
                responses and corrective actions remain in this report’s source
                record.
              </p>
              {!findings.length && (
                <p className="text-sm">
                  No findings recorded. A report with no nonconformities can be
                  issued.
                </p>
              )}
              <ScrollList
                count={findings.length}
                label="Consolidated finding records"
              >
                {findings.map((f) => (
                  <li key={`${f.id}:${report?.id}`}>
                    <FindingEditorial
                      finding={f}
                      findings={findings}
                      report={report}
                      editable={editable}
                      onError={setError}
                    />
                  </li>
                ))}
              </ScrollList>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Source records</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <ScrollList
                count={forms.length}
                label="Report source form versions"
              >
                {forms.map((f) => (
                  <li key={f.id} className="py-2">
                    {formTitle(f)} · version {f.version} ·{" "}
                    {f.withdrawnAt
                      ? `Withdrawn: ${f.withdrawalReason}`
                      : f.completedAt
                        ? "Completed"
                        : f.status}
                  </li>
                ))}
              </ScrollList>
              <p>
                {report?.snapshot
                  ? `${report.snapshot.responses.length} response records, ${report.snapshot.assessments.length} assessment contributions and ${report.snapshot.verifications.length} evidence decisions frozen at issuance.`
                  : "Source records will be frozen when the lead issues this version."}
              </p>
              {issued && (
                <details>
                  <summary>Frozen answers and assessments</summary>
                  {report.snapshot?.responses.map((r) => (
                    <p
                      key={r.id}
                      className="mt-3 whitespace-pre-wrap break-words"
                    >
                      {r.respondent} · {r.questionId}:{" "}
                      {r.selectedValues?.join(", ") || r.value}
                    </p>
                  ))}
                  {report.snapshot?.assessments.map((a) => (
                    <p
                      key={a.id}
                      className="mt-3 whitespace-pre-wrap break-words"
                    >
                      {a.auditor} · {a.questionId} · {a.result}:{" "}
                      {a.objectiveEvidence}
                    </p>
                  ))}
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {!issued &&
        rights.assigned &&
        (rights.lead ||
          (["Add and edit", "Manage"].includes(role.access.Audits) &&
            state.auditChecklists.some(
              (c) =>
                c.auditId === auditId && formRights(state, c, user, role).edit,
            ))) && (
          <ContributionEditor
            key={`${report?.id ?? "new"}:${user.id}`}
            auditId={auditId}
            report={report}
          />
        )}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue audit report?</DialogTitle>
            <DialogDescription>
              This freezes report version {report?.version ?? 1}, every included
              form version, responses, assessments, findings, evidence decisions
              and individual contributions. Later corrections require an
              amendment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep editing
            </Button>
            <Button
              onClick={() => {
                if (
                  report &&
                  act(
                    () =>
                      auditCommand({
                        kind: "issueAuditReport",
                        auditId,
                        reportId: report.id,
                      }),
                    "Audit report issued",
                  )
                ) {
                  setConfirm(false)
                  setParams({ version: report.id })
                }
              }}
            >
              Confirm issuance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={amend} onOpenChange={(v) => !v && close.requestClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start report amendment</DialogTitle>
            <DialogDescription>
              The issued version remains unchanged. The next numbered report
              starts as a draft, with a recorded reason.
            </DialogDescription>
          </DialogHeader>
          <Field label="Amendment reason" htmlFor="report-amendment">
            <Textarea
              id="report-amendment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <DialogFooter>
            {close.discarding ? (
              <>
                <span className="mr-auto text-sm">
                  Discard amendment reason?
                </span>
                <Button variant="outline" onClick={close.keep}>
                  Keep editing
                </Button>
                <Button
                  variant="destructive-solid"
                  onClick={() => {
                    setReason("")
                    close.discard()
                  }}
                >
                  Discard changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={close.requestClose}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (
                      report &&
                      act(
                        () =>
                          auditCommand({
                            kind: "amendAuditReport",
                            auditId,
                            reportId: report.id,
                            reason,
                          }),
                        "Report amendment started",
                      )
                    ) {
                      setReason("")
                      setAmend(false)
                      setParams({})
                    }
                  }}
                >
                  Create amendment draft
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
function ContributionEditor({
  auditId,
  report,
}: {
  auditId: string
  report?: AuditReport
}) {
  const { user, auditCommand } = useStore(),
    saved = report?.contributions?.find((c) => c.auditorId === user.id)
  const key = `thryvems.report-contribution:${auditId}:${report?.version ?? 1}:${user.id}`
  const [draft, setDraft] = React.useState(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(key) ?? "null") ?? {
          summary: saved?.summary ?? "",
          conclusion: saved?.conclusion ?? "",
          followUp: saved?.followUp ?? "",
        }
      )
    } catch {
      return { summary: "", conclusion: "", followUp: "" }
    }
  })
  const [error, setError] = React.useState("")
  const patch = (field: string, value: string) => {
    const next = { ...draft, [field]: value }
    setDraft(next)
    sessionStorage.setItem(key, JSON.stringify(next))
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your audit contribution</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <p className="text-sm text-muted-foreground">
          {user.name}: your unsaved text is kept in this tab. Save it to share
          your conclusions with the lead. You can change only your own
          contribution.
        </p>
        {(["summary", "conclusion", "followUp"] as const).map((field) => (
          <Field
            key={field}
            label={`Your ${field === "followUp" ? "follow-up" : field}`}
            htmlFor={`contribution-${field}`}
          >
            <Textarea
              id={`contribution-${field}`}
              value={draft[field]}
              onChange={(e) => patch(field, e.target.value)}
            />
          </Field>
        ))}
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            try {
              auditCommand({ kind: "saveAuditContribution", auditId, ...draft })
              sessionStorage.removeItem(key)
              setError("")
              toast("Your contribution saved")
            } catch (e) {
              setError((e as Error).message)
            }
          }}
        >
          Save contribution
        </Button>
      </CardContent>
    </Card>
  )
}
function FindingEditorial({
  finding: f,
  findings,
  report,
  editable,
  onError,
}: {
  finding: AuditFinding
  findings: AuditFinding[]
  report?: AuditReport
  editable: boolean
  onError: (s: string) => void
}) {
  const { auditCommand } = useStore(),
    decision = report?.decisions?.find((d) => d.findingId === f.id)
  const key = `thryvems.editorial:${f.auditId}:${report?.version ?? 1}:${f.id}`
  let initial: Partial<AuditEditorialDecision> = {}
  try {
    initial = JSON.parse(sessionStorage.getItem(key) ?? "{}")
  } catch {
    /* Start from the saved decision. */
  }
  const [action, setAction] = React.useState<AuditEditorialDecision["action"]>(
      initial.action ??
        decision?.action ??
        (f.disposition?.outcome === "Withdrawn" ? "Exclude" : "Include"),
    ),
    [targetId, setTargetId] = React.useState(
      initial.targetId ?? decision?.targetId ?? "",
    ),
    [reason, setReason] = React.useState(
      initial.reason ?? decision?.reason ?? "",
    )
  React.useEffect(() => {
    if (!editable) return
    if (
      decision?.action === action &&
      (decision.targetId ?? "") === targetId &&
      decision.reason === reason
    )
      sessionStorage.removeItem(key)
    else
      sessionStorage.setItem(key, JSON.stringify({ action, targetId, reason }))
  }, [action, targetId, reason, key, editable, decision])
  return (
    <article className="flex min-w-0 flex-col gap-3 rounded-md border p-4 text-sm">
      <Link
        className="font-medium text-primary"
        to={`/audits/findings/${f.id}`}
      >
        {f.id} · {f.title}
      </Link>
      <p>
        {f.classification} · clause {f.clause} · {f.auditor} · {f.status}
      </p>
      <p className="whitespace-pre-wrap break-words">{f.facts}</p>
      {f.discussion && (
        <p>
          Auditee: {f.discussion.decision} ·{" "}
          {f.discussion.comment || "No comment"}
        </p>
      )}
      {f.disposition?.reason && <p>Lead resolution: {f.disposition.reason}</p>}
      {f.evidence.map((r, i) => (
        <AuditReferenceLink key={i} reference={r} />
      ))}
      {f.ncId && (
        <Link className="text-primary" to={`/corrective-action/${f.ncId}`}>
          {f.ncId}
        </Link>
      )}
      {editable ? (
        <>
          <Field label="Editorial decision" htmlFor={`editorial-${f.id}`}>
            <NativeSelect
              id={`editorial-${f.id}`}
              value={action}
              onChange={(e) => setAction(e.target.value as typeof action)}
            >
              <option
                value="Include"
                disabled={f.disposition?.outcome === "Withdrawn"}
              >
                Include as a separate finding
              </option>
              <option
                value="Merge"
                disabled={f.disposition?.outcome === "Withdrawn"}
              >
                Merge with a duplicate finding
              </option>
              {f.disposition?.outcome === "Withdrawn" && (
                <option value="Exclude">Exclude this withdrawn finding</option>
              )}
            </NativeSelect>
          </Field>
          {action === "Merge" && (
            <Field label="Included finding" htmlFor={`target-${f.id}`}>
              <NativeSelect
                id={`target-${f.id}`}
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                <option value="">Choose a finding</option>
                {findings
                  .filter(
                    (x) =>
                      x.id !== f.id &&
                      x.classification === f.classification &&
                      x.clause === f.clause,
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.id} · {x.title}
                    </option>
                  ))}
              </NativeSelect>
            </Field>
          )}
          <Field
            label={
              action === "Exclude"
                ? "Reason for excluding the withdrawn finding"
                : action === "Merge"
                  ? "Reason for merging"
                  : "Editorial notes (optional)"
            }
            htmlFor={`editorial-reason-${f.id}`}
          >
            <Textarea
              id={`editorial-reason-${f.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              try {
                auditCommand({
                  kind: "decideReportFinding",
                  auditId: f.auditId,
                  findingId: f.id,
                  action,
                  targetId,
                  reason,
                })
                onError("")
                sessionStorage.removeItem(key)
                toast("Editorial decision saved")
              } catch (e) {
                onError((e as Error).message)
              }
            }}
          >
            {decision ? "Update editorial decision" : "Save editorial decision"}
          </Button>
        </>
      ) : (
        <p>
          {!decision
            ? "Lead editorial review pending."
            : decision.action === "Exclude"
              ? `Withdrawn finding excluded: ${decision.reason}`
              : decision.action === "Merge"
                ? `Merged with ${decision.targetId}: ${decision.reason}`
                : "Included as a separate finding"}
        </p>
      )}
    </article>
  )
}
