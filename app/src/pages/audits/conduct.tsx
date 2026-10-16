import { auditForms, formKey, formRights, formWorkLocked, formTitle } from "@/lib/audit-form-policy"
import { AuditFormApprovalPanel } from "./form-approval"
import * as React from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { useStore } from "@/lib/store"
import { auditRights, latestChecklist, questionsOf, assessmentBlockReason } from "@/lib/audit-workflow"
import { latestAssessment, questionReferences, executionQuestionVisible, type AssessmentDraft } from "@/lib/audit-execution"
import { referenceKey } from "@/lib/audit-evidence"
import type { AssessmentResult, AuditFinding, AuditReference, EvidenceVerification } from "@/data/audit-types"
import { QuestionAnswer } from "@/components/app/question-answer"
import { Checkbox } from "@/components/ui/checkbox"
import { ViewChips } from "@/components/app/page"
import { nowIso, formatDate } from "@/lib/periods"
import { AuditEvidenceEditor, AuditReferenceLink } from "@/components/app/audit-evidence"
import { PageHeader, FigureGrid, RecordLayout, ScrollList, EmptyLine } from "@/components/app/page"
import { Field } from "@/components/app/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"
import { RecordLink } from "@/components/app/record-link"
import { NcSheet } from "@/pages/improvement/nc-sheet"
import { ListChecksIcon, CircleCheckIcon, FileQuestionIcon } from "lucide-react"
import NotFound from "@/pages/not-found"
const blank: AssessmentDraft = {
  result: "",
  answer: "",
  objectiveEvidence: "",
  sampling: "",
  interviewee: "",
  notes: "",
  evidence: [],
  status: "Draft",
}
const RESULTS: AssessmentResult[] = ["Conforms", "Observation", "Minor NC", "Major NC", "Not applicable"]
function EvidenceDecision({
  reference,
  verification,
  onSave,
  disabled,
}: {
  reference: AuditReference
  verification?: EvidenceVerification
  onSave: (status: EvidenceVerification["status"], notes: string) => void
  disabled: boolean
}) {
  const [status, setStatus] = React.useState<EvidenceVerification["status"]>(verification?.status ?? "Pending review"),
    [notes, setNotes] = React.useState(verification?.notes ?? "")
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-sm border p-3 text-sm">
      <AuditReferenceLink reference={reference} />
      <Field label="Verification decision">
        <NativeSelect
          aria-label={`Verification of ${reference.title}`}
          value={status}
          disabled={disabled}
          onChange={(e) => setStatus(e.target.value as EvidenceVerification["status"])}
        >
          {["Pending review", "Verified", "Insufficient", "Not applicable"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Verification notes">
        <Input
          aria-label={`Verification note for ${reference.title}`}
          placeholder="What you checked or what is missing"
          disabled={disabled}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
      {!disabled && (
        <Button variant="outline" size="sm" className="self-start" onClick={() => onSave(status, notes)}>
          Save verification
        </Button>
      )}
      {verification && (
        <span className="text-xs text-muted-foreground">
          {verification.status} · {verification.by} · {formatDate(verification.at.slice(0, 10))}
        </span>
      )}
    </div>
  )
}
export default function ConductAudit() {
  const { id } = useParams(), [params] = useSearchParams()
  return <ConductAuditWorkspace key={`${id}:${params.get("version") ?? params.get("form") ?? "default"}`} />
}
function ConductAuditWorkspace() {
  const { id } = useParams(),
    [params, setParams] = useSearchParams(),
    store = useStore(),
    { state, user, role, auditCommand, can } = store
  const audit = state.audits.find((a) => a.id === id),
    checklist = params.get("version") ? state.auditChecklists.find(c => c.auditId === id && c.id === params.get("version") && c.status === "Released") : latestChecklist(state, id ?? "", true, params.get("form"))
  const all = questionsOf(checklist).filter((q) => q.type !== "Instruction")
  const visible = all.filter((q) => executionQuestionVisible(state, checklist?.id ?? "", q.id))
  const [filter, setFilter] = React.useState("All questions"),
    [selected, setSelected] = React.useState(params.get("question") ?? ""),
    [form, setForm] = React.useState<AssessmentDraft>(blank),
    [dirty, setDirty] = React.useState(false),
    [error, setError] = React.useState(""),
    [saving, setSaving] = React.useState(false),
    [ncFor, setNcFor] = React.useState<AuditFinding>(),
    [request, setRequest] = React.useState(""),
    [finding, setFinding] = React.useState({
      title: "",
      facts: "",
      requirement: "",
      owner: "",
      classification: "Observation" as AuditFinding["classification"],
    }),
    [existingNc, setExistingNc] = React.useState(""),
    [unavailable, setUnavailable] = React.useState("")
  const rows = visible.filter((q) =>
    filter === "My questions"
      ? q.askedBy === user.name
      : filter === "Unanswered"
        ? latestAssessment(state, checklist?.id ?? "", q.id)?.status !== "Completed"
        : filter === "Needs review"
          ? state.evidenceVerifications.some(
              (v) => v.checklistId === checklist?.id && v.questionId === q.id && v.status === "Insufficient",
            ) || state.clarificationRequests.some((r) => r.questionId === q.id && r.status !== "Resolved")
          : filter === "Findings"
            ? state.auditFindings.some((f) => f.checklistId === checklist?.id && f.questionId === q.id)
            : true,
  )
  const q = rows.find((q) => q.id === selected) ?? rows[0],
    assessment = q && checklist ? latestAssessment(state, checklist.id, q.id) : undefined
  const rights = audit ? auditRights(audit, user, role) : undefined
  const report = state.auditReports.filter((r) => r.auditId === id).sort((a, b) => b.version - a.version)[0],
    locked = report?.status === "Issued" || !!checklist && (formWorkLocked(checklist) || latestChecklist(state, id ?? "", true, formKey(checklist))?.id !== checklist.id)
  const block = q && audit ? assessmentBlockReason(state, audit, q, user, role) : undefined,
    editable = !!q && !block && !locked && !!checklist && formRights(state, checklist, user, role).edit
  React.useEffect(() => {
    setForm(
      assessment
        ? {
            result: assessment.result,
            answer: assessment.answer ?? "",
            selectedValues: assessment.selectedValues,
            objectiveEvidence: assessment.objectiveEvidence,
            sampling: assessment.sampling,
            interviewee: assessment.interviewee,
            notes: assessment.notes,
            evidence: assessment.evidence,
            status: assessment.status,
          }
        : blank,
    )
    setDirty(false)
    setError("")
    setFinding({
      title: "",
      facts: "",
      requirement: "",
      owner: audit?.auditee ?? state.processes.find((p) => p.name === audit?.process)?.owner ?? "",
      classification: assessment?.result === "Minor NC" || assessment?.result === "Major NC" ? assessment.result : "Observation",
    })
  }, [q?.id, assessment?.id])
  const saveRef = React.useRef<() => boolean>(() => true)
  React.useEffect(() => {
    if (!dirty) return
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    const click = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]")
      if (a && a.getAttribute("target") !== "_blank" && !saveRef.current()) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener("beforeunload", before)
    document.addEventListener("click", click, true)
    return () => {
      window.removeEventListener("beforeunload", before)
      document.removeEventListener("click", click, true)
    }
  }, [dirty])
  if (!audit || !checklist || !rights || !formRights(state, checklist, user, role).view || (!rights.assigned && !rights.manage)) return <NotFound />
  function save(status: "Draft" | "Completed" = "Draft") {
    if (!q || !editable || !checklist) return !dirty
    setSaving(true)
    try {
      auditCommand({
        kind: "saveAssessment",
        auditId: audit!.id,
        checklistId: checklist.id,
        questionId: q.id,
        draft: { ...form, status },
      })
      setDirty(false)
      setError("")
      toast(status === "Completed" ? "Assessment completed" : "Assessment draft saved")
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setSaving(false)
    }
  }
  saveRef.current = () => !dirty || save("Draft")
  const patch = (p: Partial<AssessmentDraft>) => {
    setForm({ ...form, ...p })
    setDirty(true)
  }
  const choose = (id: string) => {
    if (!dirty || save("Draft")) setSelected(id)
  }
  const refs = q ? questionReferences(state, checklist.id, q.id) : [],
    responses = state.auditeeResponses.filter((r) => r.checklistId === checklist.id && r.questionId === q?.id),
    findings = state.auditFindings.filter((f) => f.checklistId === checklist.id && f.questionId === q?.id)
  const completed = visible.filter((q) => latestAssessment(state, checklist.id, q.id)?.status === "Completed").length
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Audits", to: "/audits" },
          { label: audit.id, to: `/audits/${audit.id}` },
        ]}
        title={`Conduct ${audit.process.toLowerCase()} audit`}
        description={`${audit.date} · Checklist version ${checklist.version} · Lead ${audit.lead}. Auditee answers and auditor assessments are separate records.`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/audits/${audit.id}/results`}>Responses and results</Link>
            </Button>
            <Button disabled={!editable || saving} onClick={() => save("Completed")}>
              Complete assessment
            </Button>
          </>
        }
      />
      <Card><CardContent className="py-4"><Field label="Audit form" htmlFor="conduct-form"><NativeSelect id="conduct-form" value={checklist.id} onChange={e => { if (saveRef.current()) setParams({ version: e.target.value }) }}>{state.auditChecklists.filter(c => c.auditId === audit.id && c.status === "Released" && !c.withdrawnAt).map(c => <option key={c.id} value={c.id}>{formTitle(c)} · version {c.version}</option>)}</NativeSelect></Field></CardContent></Card>
      <FigureGrid
        figures={[
          { value: `${completed} of ${visible.length}`, label: "Questions assessed", icon: CircleCheckIcon },
          {
            value: visible.filter(
              (q) => q.askedBy === user.name && latestAssessment(state, checklist.id, q.id)?.status !== "Completed",
            ).length,
            label: "Your pending assessments",
            icon: ListChecksIcon,
          },
          {
            value: state.clarificationRequests.filter((r) => r.auditId === audit.id && r.status !== "Resolved").length,
            label: "Outstanding clarifications",
            icon: FileQuestionIcon,
          },
        ]}
      />
      {locked && (
        <Alert tone="info">This form is read-only because it is completed, awaiting approval, withdrawn or an earlier version. Recorded responses and assessments remain available.</Alert>
      )}
      <AuditFormApprovalPanel key={checklist.id} form={checklist} />
      <ViewChips
        value={filter}
        onChange={(v) => {
          if (!dirty || save("Draft")) {
            setFilter(v)
            setSelected("")
          }
        }}
        views={["All questions", "My questions", "Unanswered", "Needs review", "Findings"].map((label) => ({ label, id: label }))}
      />
      <RecordLayout
        sideFirst
        side={
          <Card>
            <CardHeader>
              <CardTitle>Checklist questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollList label="Checklist questions" count={rows.length}>
                {rows.map((x, i) => (
                  <button
                    key={x.id}
                    aria-pressed={q?.id === x.id}
                    onClick={() => choose(x.id)}
                    className="rounded-sm border p-2 text-left text-sm hover:bg-hover"
                  >
                    {i + 1}. {x.text}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {x.askedBy} · {latestAssessment(state, checklist.id, x.id)?.status ?? "Not started"}
                    </span>
                  </button>
                ))}
                {!rows.length && <p className="text-sm text-muted-foreground">No questions match this view.</p>}
              </ScrollList>
            </CardContent>
          </Card>
        }
        main={
          q && (
            <div className="flex min-w-0 flex-col gap-5">
              <Card>
                <CardHeader>
                  <CardTitle>{q.text}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    Clause {q.clause ?? "—"} · {q.askedBy} · {q.required ? "Required" : "Optional"}
                  </span>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {q.guidance && <p className="text-sm text-muted-foreground">{q.guidance}</p>}
                  {block && <Alert tone="warning">{block}</Alert>}
                  <h2 className="text-sm font-semibold">Auditee responses</h2>
                  {!responses.length && (
                    <p className="text-sm text-muted-foreground">No auditee response. This does not establish conformity.</p>
                  )}
                  {responses.map((r) => (
                    <div key={r.id} className="rounded-sm border p-3 text-sm">
                      <span className="font-medium">
                        {r.respondent} · {r.status}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {r.identity ?? "Workspace account"}
                        {r.recordedBy ? ` · recorded by ${r.recordedBy}` : ""} · submission{" "}
                        {r.submissionRevision ?? "not submitted"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{r.selectedValues?.join(", ") || r.value}</p>
                      {r.explanation && <p className="mt-1 whitespace-pre-wrap">{r.explanation}</p>}
                      {r.naReason && <p>N/A reason: {r.naReason}</p>}
                      <ul className="mt-2 flex flex-col gap-2">
                        {r.evidence.map((ref) => (
                          <li key={referenceKey(ref)}>
                            <AuditReferenceLink reference={ref} />
                          </li>
                        ))}
                      </ul>
                      {editable && !!r.submissions?.length && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          disabled={form.evidence.some(
                            (ref) => ref.kind === "response" && ref.id === r.id && ref.responseRevision === r.submissionRevision,
                          )}
                          onClick={() =>
                            patch({
                              evidence: [
                                ...form.evidence,
                                {
                                  kind: "response",
                                  id: r.id,
                                  responseRevision: r.submissionRevision,
                                  title: `Questionnaire response ${r.id}`,
                                  addedBy: user.name,
                                  addedAt: nowIso(),
                                },
                              ],
                            })
                          }
                        >
                          Use response as evidence
                        </Button>
                      )}
                    </div>
                  ))}
                  <h2 className="text-sm font-semibold">Auditor assessment</h2>
                  <fieldset disabled={!editable} className="flex min-w-0 flex-col gap-4">
                    {q.respondBy !== "Auditee" &&
                      !["Audit assessment", "Evidence review", "Document reference"].includes(q.type) && (
                        <Field label="Auditor answer">
                          <QuestionAnswer
                            question={q}
                            value={form.answer ?? ""}
                            selectedValues={form.selectedValues}
                            disabled={!editable}
                            id="aa-answer"
                            label="Auditor answer"
                            onChange={(answer, selectedValues) => patch({ answer, selectedValues })}
                          />
                        </Field>
                      )}
                    <Field label="Assessment result" htmlFor="aa-result">
                      <NativeSelect
                        id="aa-result"
                        value={form.result}
                        onChange={(e) => patch({ result: e.target.value as AssessmentDraft["result"] })}
                      >
                        <option value="">Choose an assessment</option>
                        {RESULTS.map((v) => (
                          <option key={v} value={v}>
                            {v === "Minor NC" ? "Minor nonconformity" : v === "Major NC" ? "Major nonconformity" : v}
                          </option>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field label="Objective evidence observed" htmlFor="aa-evidence">
                      <Textarea
                        id="aa-evidence"
                        value={form.objectiveEvidence}
                        onChange={(e) => patch({ objectiveEvidence: e.target.value })}
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Interviewee" htmlFor="aa-person" optional>
                        <Input id="aa-person" value={form.interviewee} onChange={(e) => patch({ interviewee: e.target.value })} />
                      </Field>
                      <Field label="Sampling details" htmlFor="aa-sampling" optional>
                        <Input id="aa-sampling" value={form.sampling} onChange={(e) => patch({ sampling: e.target.value })} />
                      </Field>
                    </div>
                    <Field label="Verification and observation notes" htmlFor="aa-notes" optional>
                      <Textarea id="aa-notes" value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
                    </Field>
                  </fieldset>
                  <Field label="Auditor evidence references">
                    <AuditEvidenceEditor
                      allowResponses
                      auditProcess={audit.process}
                      value={form.evidence}
                      readOnly={!editable}
                      onChange={(evidence) => patch({ evidence })}
                    />
                  </Field>
                  {error && (
                    <p role="alert" className="whitespace-pre-line text-sm text-overdue">
                      {error}
                    </p>
                  )}
                  <label className="flex min-h-9 items-center gap-3 text-sm font-medium">
                    <Checkbox
                      aria-label="Checklist item completed"
                      disabled={!editable || saving}
                      checked={assessment?.status === "Completed" && !dirty}
                      onCheckedChange={(checked) => save(checked === true ? "Completed" : "Draft")}
                    />
                    Checklist item completed
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Tick after recording your assessment. Completed means checked; the assessment result records conformity.
                  </p>
                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" disabled={saving} onClick={() => save("Draft")}>
                        Save assessment draft
                      </Button>
                      <Button
                        variant="quiet"
                        disabled={saving}
                        onClick={() => {
                          if (save("Completed")) {
                            const i = rows.findIndex((x) => x.id === q.id)
                            if (i < rows.length - 1) setSelected(rows[i + 1].id)
                          }
                        }}
                      >
                        Save and next
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {dirty
                      ? "Unsaved assessment changes. Navigation saves a draft."
                      : assessment
                        ? `${assessment.status} · ${assessment.auditor} · ${formatDate(assessment.at.slice(0, 10))}. Reassessment adds a new record; earlier contributions stay unchanged.`
                        : "No assessment recorded."}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Evidence verification</CardTitle>
                </CardHeader>
                <CardContent className="flex min-w-0 flex-col gap-3">
                  {!refs.length && (
                    <p className="text-sm text-muted-foreground">No evidence references linked to this question.</p>
                  )}
                  {refs.map((ref) => (
                    <EvidenceDecision
                      key={`${q.id}:${referenceKey(ref)}`}
                      reference={ref}
                      disabled={!editable}
                      verification={state.evidenceVerifications
                        .filter(
                          (v) =>
                            v.checklistId === checklist.id &&
                            v.questionId === q.id &&
                            referenceKey(v.reference) === referenceKey(ref),
                        )
                        .at(-1)}
                      onSave={(status, notes) => {
                        try {
                          auditCommand({
                            kind: "verifyAuditEvidence",
                            auditId: audit.id,
                            checklistId: checklist.id,
                            questionId: q.id,
                            reference: ref,
                            status,
                            notes,
                          })
                          toast("Evidence verification saved")
                        } catch (e) {
                          setError((e as Error).message)
                        }
                      }}
                    />
                  ))}
                  {editable && (
                    <>
                      <Field label="Reason evidence is unavailable">
                        <Textarea
                          aria-label="Reason evidence is unavailable"
                          placeholder="If required evidence cannot be obtained, document why"
                          value={unavailable}
                          onChange={(e) => setUnavailable(e.target.value)}
                        />
                      </Field>
                      <Button
                        variant="outline"
                        disabled={!unavailable.trim()}
                        onClick={() => {
                          try {
                            auditCommand({
                              kind: "verifyAuditEvidence",
                              auditId: audit.id,
                              checklistId: checklist.id,
                              questionId: q.id,
                              reference: {
                                kind: "link",
                                title: "Required evidence unavailable",
                                addedBy: user.name,
                                addedAt: "",
                              },
                              status: "Not applicable",
                              notes: unavailable,
                              unavailable: true,
                            })
                            toast("Evidence unavailability recorded")
                            setUnavailable("")
                          } catch (e) {
                            setError((e as Error).message)
                          }
                        }}
                      >
                        Document unavailable evidence
                      </Button>
                    </>
                  )}
                  {state.evidenceVerifications
                    .filter((v) => v.checklistId === checklist.id && v.questionId === q.id && v.unavailable)
                    .map((v) => (
                      <p key={v.id} className="text-sm">
                        Evidence unavailable: {v.notes} · {v.by} · {formatDate(v.at.slice(0, 10))}
                      </p>
                    ))}
                </CardContent>
              </Card>
              {!!responses.length && editable && (
                <Card>
                  <CardHeader>
                    <CardTitle>Clarification and evidence requests</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <Field label="Clarification request">
                      <Textarea
                        aria-label="Auditor clarification request"
                        value={request}
                        onChange={(e) => setRequest(e.target.value)}
                        placeholder="What needs clarification or additional evidence?"
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      {responses.map((r) => (
                        <Button
                          key={r.assignmentId}
                          variant="outline"
                          disabled={!request.trim()}
                          onClick={() => {
                            try {
                              auditCommand({
                                kind: "requestClarification",
                                auditId: audit.id,
                                assignmentId: r.assignmentId,
                                questionId: q.id,
                                text: request,
                                requestKind: "More evidence",
                              })
                              setRequest("")
                              toast("Evidence request sent")
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          Request evidence from {r.respondent}
                        </Button>
                      ))}
                    </div>
                    {state.clarificationRequests
                      .filter((r) => r.checklistId === checklist.id && r.questionId === q.id)
                      .map((r) => (
                        <div key={r.id} className="rounded-sm border p-3 text-sm">
                          <p>
                            {r.text} · {r.to} · {r.status}
                          </p>
                          {r.reply && <p>Reply: {r.reply}</p>}
                          {r.status === "Answered" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                try {
                                  auditCommand({ kind: "resolveClarification", auditId: audit.id, requestId: r.id })
                                  toast("Request resolved")
                                } catch (e) {
                                  setError((e as Error).message)
                                }
                              }}
                            >
                              Resolve request {r.id}
                            </Button>
                          )}
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Findings from this question</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {!findings.length && (
                    <EmptyLine
                      title="No findings from this question"
                      body="Complete an observation or nonconformity assessment to raise a finding here."
                    />
                  )}
                  {findings.map((f) => (
                    <div key={f.id} className="flex flex-col gap-2 rounded-sm border p-3 text-sm">
                      <RecordLink kind="audit-finding" id={f.id} label={f.title}>
                        {f.id} {f.title}
                      </RecordLink>
                      <p>
                        {f.classification} · {f.status} · {f.owner}
                      </p>
                      <p>{f.facts}</p>
                      {f.ncId ? (
                        <RecordLink kind="nonconformity" id={f.ncId} />
                      ) : (
                        ["Minor NC", "Major NC"].includes(f.classification) &&
                        editable && (
                          <>
                            <Button
                              variant="outline"
                              className="self-start"
                              disabled={!can("Corrective Action", "Add and edit")}
                              title={
                                !can("Corrective Action", "Add and edit")
                                  ? "Add and edit access to Corrective Action is required"
                                  : undefined
                              }
                              onClick={() => setNcFor(f)}
                            >
                              Raise corrective action
                            </Button>
                            <NativeSelect
                              aria-label={`Existing NC for ${f.id}`}
                              value={existingNc}
                              onChange={(e) => setExistingNc(e.target.value)}
                            >
                              <option value="">Or link an existing nonconformity</option>
                              {state.ncs
                                .filter((n) => n.process === audit.process)
                                .map((n) => (
                                  <option key={n.id} value={n.id}>
                                    {n.id} {n.title}
                                  </option>
                                ))}
                            </NativeSelect>
                            <Button
                              variant="quiet"
                              disabled={!existingNc}
                              onClick={() => {
                                try {
                                  auditCommand({ kind: "linkFindingNc", auditId: audit.id, findingId: f.id, ncId: existingNc })
                                  toast("Nonconformity linked")
                                } catch (e) {
                                  setError((e as Error).message)
                                }
                              }}
                            >
                              Link existing nonconformity
                            </Button>
                          </>
                        )
                      )}
                    </div>
                  ))}
                  {editable &&
                    assessment?.status === "Completed" &&
                    ["Observation", "Minor NC", "Major NC"].includes(assessment.result) &&
                    !findings.some((f) => f.assessmentId === assessment.id) && (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm">Raise a finding from this assessment without leaving the question.</p>
                        <Field label="Finding title" htmlFor="af-title">
                          <Input
                            id="af-title"
                            value={finding.title}
                            onChange={(e) => setFinding({ ...finding, title: e.target.value })}
                          />
                        </Field>
                        <Field label="Applicable requirement" htmlFor="af-requirement">
                          <Textarea
                            id="af-requirement"
                            value={finding.requirement}
                            onChange={(e) => setFinding({ ...finding, requirement: e.target.value })}
                          />
                        </Field>
                        <Field label="Facts and objective evidence" htmlFor="af-facts">
                          <Textarea
                            id="af-facts"
                            value={finding.facts}
                            onChange={(e) => setFinding({ ...finding, facts: e.target.value })}
                          />
                        </Field>
                        <Field label="Finding owner" htmlFor="af-owner">
                          <NativeSelect
                            id="af-owner"
                            value={finding.owner}
                            onChange={(e) => setFinding({ ...finding, owner: e.target.value })}
                          >
                            <option value="">Choose owner</option>
                            {state.people
                              .filter((p) => p.status === "Active")
                              .map((p) => (
                                <option key={p.id}>{p.name}</option>
                              ))}
                          </NativeSelect>
                        </Field>
                        {assessment.result === "Observation" && (
                          <NativeSelect
                            aria-label="Observation classification"
                            value={finding.classification}
                            onChange={(e) =>
                              setFinding({ ...finding, classification: e.target.value as AuditFinding["classification"] })
                            }
                          >
                            <option>Observation</option>
                            <option>Opportunity</option>
                          </NativeSelect>
                        )}
                        <Button
                          variant="outline"
                          className="self-start"
                          onClick={() => {
                            try {
                              auditCommand({
                                kind: "raiseAuditFinding",
                                auditId: audit.id,
                                assessmentId: assessment.id,
                                ...finding,
                                clause: q.clause ?? audit.clauses[0],
                              })
                              toast("Finding raised")
                            } catch (e) {
                              setError((e as Error).message)
                            }
                          }}
                        >
                          Raise finding
                        </Button>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          )
        }
      />
      <NcSheet
        open={!!ncFor}
        onOpenChange={(v) => {
          if (!v) setNcFor(undefined)
        }}
        auditFinding={ncFor}
      />
    </>
  )
}
