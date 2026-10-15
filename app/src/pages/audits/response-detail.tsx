import { useParams, useSearchParams } from "react-router-dom"
import { useStore } from "@/lib/store"
import { questionsOf } from "@/lib/audit-workflow"
import { PageHeader, KeyFacts } from "@/components/app/page"
import { AuditReferenceLink } from "@/components/app/audit-evidence"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { referenceKey } from "@/lib/audit-evidence"
import { formatDate } from "@/lib/periods"
import NotFound from "@/pages/not-found"

export default function ResponseDetail() {
  const { responseId } = useParams(),
    [params] = useSearchParams(),
    { state } = useStore()
  const response = state.auditeeResponses.find((r) => r.id === responseId)
  const revision = Number(params.get("revision") ?? response?.submissionRevision)
  const submission = response?.submissions?.find((s) => s.revision === revision)
  const checklist = state.auditChecklists.find((c) => c.id === response?.checklistId),
    question = questionsOf(checklist).find((q) => q.id === response?.questionId)
  if (!response || !submission || !question) return <NotFound />
  return (
    <>
      <PageHeader
        title={`Questionnaire response ${response.id}`}
        description={`Submitted response · submission ${revision} · checklist version ${response.version}`}
      />
      <Alert tone="info">
        This is the submitted version linked as evidence. Later answers do not change it. The auditor makes a separate evidence
        decision.
      </Alert>
      <Card>
        <CardContent className="py-4">
          <KeyFacts
            facts={[
              { k: "Respondent", v: response.respondent },
              { k: "Identity", v: response.identity ?? "Workspace account" },
              { k: "Recorded by", v: submission.recordedBy ?? "Respondent" },
              { k: "Submitted", v: formatDate(submission.submittedAt.slice(0, 10)) },
            ]}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{question.text}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-col gap-4 text-sm">
          <p className="whitespace-pre-wrap break-words">{submission.selectedValues?.join(", ") || submission.value}</p>
          {submission.explanation && <p className="whitespace-pre-wrap break-words">{submission.explanation}</p>}
          {submission.naReason && <p>N/A: {submission.naReason}</p>}
          <ul className="flex flex-col gap-2">
            {submission.evidence.map((ref) => (
              <li key={referenceKey(ref)}>
                <AuditReferenceLink reference={ref} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  )
}
