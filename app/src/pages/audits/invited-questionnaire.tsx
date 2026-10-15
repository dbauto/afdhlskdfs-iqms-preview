import * as React from "react"
import { useParams } from "react-router-dom"
import { useStore } from "@/lib/store"
import { questionVisible, responseProblems, type ResponseDraft } from "@/lib/questionnaire-workflow"
import { QuestionAnswer } from "@/components/app/question-answer"
import { AuditEvidenceEditor } from "@/components/app/audit-evidence"
import { Field } from "@/components/app/form"
import { PageHeader, KeyFacts, RecordLayout } from "@/components/app/page"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/input"
import NotFound from "@/pages/not-found"

export default function InvitedQuestionnaire() {
  const { invitationId = "" } = useParams(),
    store = useStore(),
    preview = store.invitedPreview(invitationId)
  const [selected, setSelected] = React.useState(""),
    [error, setError] = React.useState(""),
    [saving, setSaving] = React.useState(false),
    [replies, setReplies] = React.useState<Record<string, string>>({})
  if (!preview)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <NotFound />
      </main>
    )
  const { invitation, assignment, responses, clarifications } = preview
  const values = Object.fromEntries(responses.map((r) => [r.questionId, r.selectedValues ?? r.value]))
  const qs = preview.questions.filter((q) => questionVisible(q, preview.questions, values)),
    q = qs.find((q) => q.id === selected) ?? qs[0]
  const submitted = ["Submitted", "Resubmitted"].includes(assignment.status),
    response = responses.find((r) => r.questionId === q?.id)
  const editable =
    !submitted &&
    (assignment.status !== "Clarification requested" ||
      clarifications.some((r) => r.questionId === q?.id && r.status !== "Resolved"))
  const draft: ResponseDraft = response ?? { questionId: q?.id ?? "", value: "", explanation: "", naReason: "", evidence: [] }
  function save(patch: Partial<ResponseDraft> = {}, submit = false) {
    if (saving) return
    setSaving(true)
    try {
      store.saveInvitedPreview(invitationId, q && !submitted ? [{ ...draft, ...patch }] : [], submit)
      setError("")
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Auditee questionnaire"
        description={`${preview.audit.process} · ${assignment.status}`}
        actions={
          !submitted && (
            <Button disabled={saving} onClick={() => save({}, true)}>
              Submit questionnaire
            </Button>
          )
        }
      />
      <Alert tone="warning">
        Synthetic respondent preview. Email identity is unverified. No email has been sent. This page shows only this invitation’s
        questions and responses; it is not a production sign-in.
      </Alert>
      <Card>
        <CardContent className="py-4">
          <KeyFacts
            facts={[
              { k: "Respondent", v: invitation.name },
              { k: "Email", v: invitation.email },
              { k: "Department or position", v: invitation.department || "Not provided" },
              {
                k: "Completion",
                v: `${
                  qs.filter(
                    (q) =>
                      !responseProblems(
                        q,
                        responses.find((r) => r.questionId === q.id),
                      ).length,
                  ).length
                } of ${qs.length} answered`,
              },
            ]}
          />
        </CardContent>
      </Card>
      {error && (
        <p role="alert" className="whitespace-pre-line text-sm text-overdue">
          {error}
        </p>
      )}
      <RecordLayout
        sideFirst
        main={
          q ? (
            <Card>
              <CardHeader>
                <CardTitle>{q.text}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Field label="Your answer">
                  <QuestionAnswer
                    question={q}
                    value={draft.value}
                    selectedValues={draft.selectedValues}
                    disabled={!editable}
                    onChange={(value, selectedValues) => save({ value, selectedValues })}
                  />
                </Field>
                <Field label="Explanation" optional>
                  <Textarea
                    aria-label="Explanation"
                    value={draft.explanation}
                    disabled={!editable}
                    onChange={(e) => save({ explanation: e.target.value })}
                  />
                </Field>
                {draft.value === "N/A" && (
                  <Field label="Why is it not applicable?">
                    <Textarea
                      aria-label="Why is it not applicable?"
                      disabled={!editable}
                      value={draft.naReason}
                      onChange={(e) => save({ naReason: e.target.value })}
                    />
                  </Field>
                )}
                {q.evidenceEnabled !== false && q.evidenceRule !== "Not required" && (
                  <Field
                    label={q.evidenceRule === "Required" ? "Supporting evidence (required)" : "Supporting evidence (optional)"}
                  >
                    <AuditEvidenceEditor
                      linksOnly
                      readOnly={!editable}
                      value={draft.evidence}
                      onChange={(evidence) => save({ evidence })}
                    />
                  </Field>
                )}
                {clarifications
                  .filter((r) => r.questionId === q.id)
                  .map((r) => (
                    <div key={r.id} className="flex flex-col gap-3 rounded-sm border p-3 text-sm">
                      <p>
                        {r.text} · {r.status}
                      </p>
                      {r.reply && <p>{r.reply}</p>}
                      {!submitted && r.status !== "Resolved" && (
                        <>
                          <Field label="Clarification reply">
                            <Textarea
                              aria-label={`Reply to ${r.id}`}
                              value={replies[r.id] ?? r.reply ?? ""}
                              onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })}
                            />
                          </Field>
                          <Button
                            variant="outline"
                            onClick={() => {
                              try {
                                store.replyInvitedPreview(invitationId, r.id, replies[r.id] ?? r.reply ?? "")
                                setError("")
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
                <p className="text-xs text-muted-foreground">
                  {submitted
                    ? "Submitted answers are read-only until clarification is requested."
                    : "Answers save automatically in this browser."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Alert tone="info">No questions are available for this response.</Alert>
          )
        }
        side={
          <Card>
            <CardHeader>
              <CardTitle>Questions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {qs.map((question, i) => (
                <Button
                  key={question.id}
                  variant={question.id === q?.id ? "secondary" : "outline"}
                  className="h-auto min-h-9 justify-start whitespace-normal text-left"
                  onClick={() => setSelected(question.id)}
                >
                  {i + 1}. {question.text}
                </Button>
              ))}
            </CardContent>
          </Card>
        }
      />
    </main>
  )
}
