import * as React from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { nextId, useStore } from "@/lib/store"
import { auditRights, latestChecklist, questionsOf } from "@/lib/audit-workflow"
import { addDays, formatDate, todayIso } from "@/lib/periods"
import { questionVisible, responseProblems, type ResponseDraft } from "@/lib/questionnaire-workflow"
import { AuditEvidenceEditor } from "@/components/app/audit-evidence"
import { PageHeader, KeyFacts } from "@/components/app/page"
import { QuestionAnswer } from "@/components/app/question-answer"
import { Alert } from "@/components/ui/alert"
import { LinkInvitationForm } from "./respondent-invitations"
import { Field } from "@/components/app/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import NotFound from "@/pages/not-found"

export function QuestionnaireAssignments() {
  const { id } = useParams(),
    { state, user, role, takenIds, auditCommand } = useStore()
  const audit = state.audits.find((a) => a.id === id),
    checklist = latestChecklist(state, id ?? "", true)
  const [respondent, setRespondent] = React.useState(""),
    [due, setDue] = React.useState(addDays(todayIso(), 7)),
    [selected, setSelected] = React.useState<string[]>([]),
    [saving, setSaving] = React.useState(false)
  React.useEffect(() => {
    if (audit) auditCommand({ kind: "questionnaireReminders", auditId: audit.id })
  }, [id, user.id])
  if (!audit) return <NotFound />
  const lead = auditRights(audit, user, role).lead,
    qs = questionsOf(checklist).filter((q) => q.type !== "Instruction" && q.respondBy !== "Auditor")
  const assignments = state.questionnaireAssignments.filter((a) => a.auditId === audit.id)
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
        ]}
        title="Audit questionnaires"
        description={`${audit.process}, lead ${audit.lead}. Assign questions from a released checklist.`}
      />
      {lead && checklist?.usesQuestionnaire && (
        <Card>
          <CardHeader>
            <CardTitle>Assign a questionnaire</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Field label="Respondent" htmlFor="qa-person">
              <NativeSelect
                id="qa-person"
                value={respondent}
                onChange={(e) => {
                  setRespondent(e.target.value)
                  setSelected(qs.filter((q) => !q.respondent || q.respondent === e.target.value).map((q) => q.id))
                }}
              >
                <option value="">Choose a respondent</option>
                {state.people
                  .filter((p) => p.status !== "Deactivated" && (!p.accessEndsOn || p.accessEndsOn >= todayIso()))
                  .map((p) => (
                    <option key={p.id}>{p.name}</option>
                  ))}
              </NativeSelect>
            </Field>
            <Field label="Response deadline" htmlFor="qa-due">
              <Input type="date" id="qa-due" value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Questions to assign</legend>
              {qs.map((q) => (
                <label key={q.id} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.includes(q.id)}
                    onChange={(e) => setSelected(e.target.checked ? [...selected, q.id] : selected.filter((id) => id !== q.id))}
                  />
                  {q.text}
                </label>
              ))}
            </fieldset>
            <Button
              className="self-start"
              disabled={saving || !respondent || !selected.length}
              onClick={() => {
                setSaving(true)
                try {
                  auditCommand({
                    kind: "assignQuestionnaire",
                    auditId: audit.id,
                    id: nextId(takenIds("questionnaireAssignments"), "AQA-", 4),
                    checklistId: checklist.id,
                    respondent,
                    questionIds: selected,
                    dueDate: due,
                  })
                  toast("Questionnaire assigned")
                  setSelected([])
                } catch (e) {
                  toast.error((e as Error).message)
                } finally {
                  setSaving(false)
                }
              }}
            >
              Assign questionnaire
            </Button>
          </CardContent>
        </Card>
      )}
      <Alert tone="info">
        The checklist is for the auditor. The questionnaire collects answers from auditees. Prepare questions in{" "}
        <Link className="font-medium text-primary underline" to={`/audits/${audit.id}/checklist`}>
          Checklist — questionnaire builder
        </Link>
        , choose who responds, enable the pre-audit questionnaire and ask {audit.lead} to mark it ready. Each respondent keeps a
        separate submission.
      </Alert>
      {lead && checklist?.usesQuestionnaire && <LinkInvitationForm auditId={audit.id} checklist={checklist} />}
      {lead && !checklist?.usesQuestionnaire && (
        <p className="text-sm text-muted-foreground">
          Release a checklist with the pre-audit questionnaire enabled to assign questions.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{lead ? "Assigned questionnaires" : "Your questionnaires"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!assignments.length && <p className="text-sm text-muted-foreground">No questionnaires assigned.</p>}
          {assignments.map((a) => (
            <Link
              key={a.id}
              to={`/audits/${audit.id}/questionnaires/${a.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border p-3 text-sm hover:bg-hover"
            >
              <span>
                {a.id} · {a.respondent} · version {a.version} · due {formatDate(a.dueDate)}
              </span>
              <Badge tone={["Submitted", "Resubmitted"].includes(a.status) ? "done" : "progress"}>{a.status}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
export default function AuditeeQuestionnaire() {
  const { id, assignmentId } = useParams(),
    { state, user, role, auditCommand } = useStore()
  const audit = state.audits.find((a) => a.id === id),
    assignment = state.questionnaireAssignments.find((a) => a.id === assignmentId && a.auditId === id)
  const checklist = state.auditChecklists.find((c) => c.id === assignment?.checklistId)
  const all = questionsOf(checklist).filter((q) => assignment?.questionIds.includes(q.id))
  const responses = state.auditeeResponses.filter((r) => r.assignmentId === assignmentId)
  const values = Object.fromEntries(responses.map((r) => [r.questionId, r.selectedValues ?? r.value])),
    qs = all.filter((q) => questionVisible(q, all, values))
  const [selected, setSelected] = React.useState(""),
    [confirm, setConfirm] = React.useState(false),
    [error, setError] = React.useState(""),
    [reply, setReply] = React.useState<Record<string, string>>({}),
    [saving, setSaving] = React.useState(false),
    [requestText, setRequestText] = React.useState(""),
    [requestKind, setRequestKind] = React.useState<"Clarification" | "More evidence">("Clarification")
  const q = qs.find((q) => q.id === selected) ?? qs[0],
    response = responses.find((r) => r.questionId === q?.id)
  if (
    !audit ||
    !assignment ||
    !checklist ||
    (assignment.respondent !== user.name && !auditRights(audit, user, role).assigned && !auditRights(audit, user, role).manage)
  )
    return <NotFound />
  const own =
      (!assignment.invitationId &&
        (assignment.respondentId ? assignment.respondentId === user.id : assignment.respondent === user.name)) ||
      (assignment.recordedBy === user.name && auditRights(audit, user, role).assigned),
    requests = state.clarificationRequests.filter((r) => r.assignmentId === assignment.id)
  const submitted = ["Submitted", "Resubmitted"].includes(assignment.status)
  const editable =
    own &&
    !submitted &&
    (assignment.status !== "Clarification requested" || requests.some((r) => r.questionId === q?.id && r.status !== "Resolved"))
  const draft: ResponseDraft = response ?? { questionId: q?.id ?? "", value: "", explanation: "", naReason: "", evidence: [] }
  function save(patch: Partial<ResponseDraft> = {}, submit = false) {
    setSaving(true)
    try {
      auditCommand({
        kind: "saveResponses",
        auditId: audit!.id,
        assignmentId: assignment!.id,
        responses: q && !submitted ? [{ ...draft, ...patch }] : [],
        submit,
      })
      setError("")
      if (submit) {
        setConfirm(false)
        toast("Questionnaire submitted")
      }
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }
  const complete = qs.filter(
    (q) =>
      !responseProblems(
        q,
        responses.find((r) => r.questionId === q.id),
      ).length,
  ).length
  const currentIndex = qs.findIndex((x) => x.id === q?.id)
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
        ]}
        title="Auditee questionnaire"
        description={`${audit.process}. Answers save automatically as you type. The auditor makes a separate assessment.`}
        badge={<Badge tone={submitted ? "done" : "progress"}>{assignment.status}</Badge>}
        actions={
          own &&
          !submitted && (
            <Button disabled={saving} onClick={() => setConfirm(true)}>
              Submit questionnaire
            </Button>
          )
        }
      />
      {assignment.recordedBy && (
        <Alert tone="info">
          Interview response recorded on behalf of {assignment.respondent} by {assignment.recordedBy}. This is not a
          self-submission.
        </Alert>
      )}
      <Card>
        <CardContent className="py-4">
          <KeyFacts
            facts={[
              { k: "Audit", v: audit.id },
              { k: "Process", v: audit.process },
              { k: "Audit date", v: audit.date },
              { k: "Lead auditor", v: audit.lead },
              { k: "Respondent", v: assignment.respondent },
              { k: "Deadline", v: formatDate(assignment.dueDate) },
              { k: "Checklist", v: `Version ${assignment.version}` },
              { k: "Completion", v: `${complete} of ${qs.length} answered` },
            ]}
          />
        </CardContent>
      </Card>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Questions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSelected(
                  qs.find(
                    (q) =>
                      responseProblems(
                        q,
                        responses.find((r) => r.questionId === q.id),
                      ).length,
                  )?.id ?? "",
                )
              }
            >
              Next unanswered
            </Button>
            {qs.map((x, i) => (
              <button
                key={x.id}
                aria-pressed={q?.id === x.id}
                onClick={() => setSelected(x.id)}
                className="rounded-sm border p-2 text-left text-sm hover:bg-hover"
              >
                {i + 1}. {x.text}
                <span className="mt-1 block text-xs text-muted-foreground">
                  {requests.some((r) => r.questionId === x.id && r.status === "Open")
                    ? "Needs clarification"
                    : submitted
                      ? "Submitted"
                      : responseProblems(
                            x,
                            responses.find((r) => r.questionId === x.id),
                          ).length
                        ? responses.some((r) => r.questionId === x.id)
                          ? "In progress"
                          : "Not started"
                        : "Answered"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
        {q && (
          <Card>
            <CardHeader>
              <CardTitle>{q.text}</CardTitle>
              <span className="text-xs text-muted-foreground">
                Clause {q.clause ?? "—"} · {q.required ? "Required" : "Optional"} · evidence{" "}
                {q.evidenceRule?.toLowerCase() ?? "optional"}
              </span>
            </CardHeader>
            <CardContent className="flex min-w-0 flex-col gap-4">
              {q.guidance && <p className="text-sm text-muted-foreground">{q.guidance}</p>}
              <Field label="Your answer" htmlFor="aq-answer">
                <fieldset disabled={!editable}>
                  <QuestionAnswer
                    question={q}
                    value={draft.value}
                    selectedValues={draft.selectedValues}
                    disabled={!editable}
                    onChange={(value, selectedValues) => save({ value, selectedValues })}
                  />
                </fieldset>
              </Field>
              <Field label="Explanation" htmlFor="aq-explanation" optional>
                <Textarea
                  id="aq-explanation"
                  disabled={!editable}
                  value={draft.explanation}
                  onChange={(e) => save({ explanation: e.target.value })}
                />
              </Field>
              {["N/A", "Not applicable"].includes(draft.value) && (
                <Field label="Why is it not applicable?" htmlFor="aq-na">
                  <Textarea
                    id="aq-na"
                    disabled={!editable}
                    value={draft.naReason}
                    onChange={(e) => save({ naReason: e.target.value })}
                  />
                </Field>
              )}
              {q.evidenceEnabled !== false && q.evidenceRule !== "Not required" && (
                <Field label="Supporting evidence">
                  <AuditEvidenceEditor value={draft.evidence} readOnly={!editable} onChange={(evidence) => save({ evidence })} />
                </Field>
              )}
              {requests
                .filter((r) => r.questionId === q.id)
                .map((r) => (
                  <div key={r.id} className="flex flex-col gap-2 rounded-sm border p-3 text-sm">
                    <span className="font-medium">
                      {r.kind} · {r.status}
                    </span>
                    <p>{r.text}</p>
                    {r.reply && <p>Reply: {r.reply}</p>}
                    {own && !submitted && r.status !== "Resolved" && (
                      <>
                        <Textarea
                          aria-label={`Reply to ${r.id}`}
                          value={reply[r.id] ?? r.reply ?? ""}
                          onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })}
                        />
                        <Button
                          size="sm"
                          className="self-start"
                          onClick={() => {
                            try {
                              auditCommand({
                                kind: "replyClarification",
                                auditId: audit.id,
                                requestId: r.id,
                                reply: reply[r.id] ?? r.reply ?? "",
                              })
                              toast("Reply saved")
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          Send clarification reply
                        </Button>
                      </>
                    )}
                  </div>
                ))}
              {!own &&
                (auditRights(audit, user, role).lead || (auditRights(audit, user, role).assigned && q.askedBy === user.name)) && (
                  <div className="flex flex-col gap-3 rounded-sm border p-3">
                    <Field label="Request clarification or evidence">
                      <NativeSelect
                        aria-label="Request kind"
                        value={requestKind}
                        onChange={(e) => setRequestKind(e.target.value as "Clarification" | "More evidence")}
                      >
                        <option>Clarification</option>
                        <option>More evidence</option>
                      </NativeSelect>
                      <Textarea
                        aria-label="Clarification request"
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                      />
                    </Field>
                    <Button
                      disabled={!requestText.trim()}
                      className="self-start"
                      onClick={() => {
                        try {
                          auditCommand({
                            kind: "requestClarification",
                            auditId: audit.id,
                            assignmentId: assignment.id,
                            questionId: q.id,
                            text: requestText,
                            requestKind,
                          })
                          setRequestText("")
                          toast("Request sent")
                        } catch (e) {
                          setError((e as Error).message)
                        }
                      }}
                    >
                      Send request
                    </Button>
                    {requests
                      .filter((r) => r.questionId === q.id && r.status === "Answered")
                      .map((r) => (
                        <Button
                          key={r.id}
                          variant="outline"
                          onClick={() => {
                            try {
                              auditCommand({ kind: "resolveClarification", auditId: audit.id, requestId: r.id })
                              toast("Clarification resolved")
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          Resolve clarification {r.id}
                        </Button>
                      ))}
                  </div>
                )}
              {error && (
                <p role="alert" className="whitespace-pre-line text-sm text-overdue">
                  {error}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <Button
                    disabled={saving}
                    onClick={() => {
                      if (save()) toast("Draft saved")
                    }}
                  >
                    Save draft
                  </Button>
                )}
                <Button variant="outline" disabled={currentIndex <= 0} onClick={() => setSelected(qs[currentIndex - 1].id)}>
                  Previous question
                </Button>
                <Button
                  variant="outline"
                  disabled={currentIndex >= qs.length - 1}
                  onClick={() => setSelected(qs[currentIndex + 1].id)}
                >
                  Next question
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {response
                  ? `Saved ${formatDate(response.updatedAt.slice(0, 10))}. ${response.history.length} earlier draft changes retained.`
                  : "Not started."}
                {submitted ? " Submitted answers are read-only until an auditor requests clarification." : ""}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit questionnaire?</DialogTitle>
            <DialogDescription>
              Required answers and evidence are checked. Your answers become read-only until clarification is requested.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="whitespace-pre-line text-sm text-overdue">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Keep working
            </Button>
            <Button disabled={saving} onClick={() => save({}, true)}>
              Confirm submission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
