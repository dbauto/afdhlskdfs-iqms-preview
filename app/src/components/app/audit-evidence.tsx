import * as React from "react"
import type { AuditReference } from "@/data/audit-types"
import { useStore } from "@/lib/store"
import { nowIso } from "@/lib/periods"
import { isSafeUrl } from "@/lib/record-links"
import { referenceKey, mayReadReference } from "@/lib/audit-evidence"
import { ContentLink as Link } from "@/components/app/content-link"
import { RecordLink, OutsideLink } from "./record-link"
import { Field, RecordPicker } from "./form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EvidenceSheet } from "@/pages/evidence/evidence-sheet"
export function AuditReferenceLink({ reference: r, auditProcess }: { reference: AuditReference; auditProcess?: string }) {
  const { state, canSee, user, role } = useStore()
  if (r.kind === "response") {
    const response = state.auditeeResponses.find((response) => response.id === r.id)
    const submission = response?.submissions?.find((s) => s.revision === r.responseRevision)
    return response && submission ? (
      <Link
        target="_blank"
        rel="noopener noreferrer"
        className="break-words font-medium text-primary hover:underline"
        to={`/audits/responses/${response.id}?revision=${submission.revision}`}
      >
        Questionnaire response {response.id} · {response.respondent} · submission {submission.revision}
      </Link>
    ) : (
      <span className="text-muted-foreground">Not available ({r.id})</span>
    )
  }
  if (r.kind === "link") return <OutsideLink url={r.url} label={r.title} />
  const record = r.kind === "document" ? state.documents.find((d) => d.id === r.id) : state.evidence.find((e) => e.id === r.id)
  const viewers = record && "viewers" in record ? (record.viewers as string[]) : undefined
  const owner = record ? ("owner" in record ? record.owner : record.addedBy) : undefined
  const route = record && "reviewers" in record ? [...record.reviewers, ...record.approvers] : undefined
  return record && canSee(record.classification, viewers, owner, route) && mayReadReference(state, user, role, r, auditProcess) ? (
    <RecordLink kind={r.kind} id={r.id!} label={record.title}>
      {record.title}
    </RecordLink>
  ) : (
    <span className="text-muted-foreground">Not available ({r.id})</span>
  )
}
export function AuditEvidenceEditor({
  value,
  onChange,
  readOnly = false,
  auditProcess,
  linksOnly = false,
  allowResponses = false,
  noun = "evidence",
}: {
  /** What is being linked, in sentence case after the first word, e.g. "findings paper". */
  noun?: string
  linksOnly?: boolean
  allowResponses?: boolean
  auditProcess?: string
  value: AuditReference[]
  onChange: (refs: AuditReference[]) => void
  readOnly?: boolean
}) {
  const { state, user, role, canSee, can } = useStore()
  const [url, setUrl] = React.useState(""),
    [title, setTitle] = React.useState(""),
    [error, setError] = React.useState(""),
    [create, setCreate] = React.useState(false)
  const documents = state.documents.filter((d) =>
      mayReadReference(state, user, role, { kind: "document", id: d.id, title: d.title, addedBy: "", addedAt: "" }, auditProcess),
    ),
    evidence = state.evidence.filter((e) =>
      mayReadReference(state, user, role, { kind: "evidence", id: e.id, title: e.title, addedBy: "", addedAt: "" }, auditProcess),
    )
  const responses = allowResponses
    ? state.auditeeResponses
        .filter((r) => r.submissions?.length)
        .map((r) => ({ id: r.id, title: `${r.respondent}: ${r.value}`, meta: `Questionnaire · ${r.questionId}` }))
    : []
  const options = [
    ...responses,
    ...documents.map((d) => ({ id: d.id, title: d.title, meta: "Document" })),
    ...evidence.map((e) => ({ id: e.id, title: e.title, meta: "Evidence" })),
  ]
  function fromId(id: string): AuditReference {
    const response = state.auditeeResponses.find((r) => r.id === id)
    if (response)
      return {
        kind: "response",
        id,
        responseRevision: response.submissionRevision ?? 1,
        title: `Questionnaire response ${id}`,
        addedBy: user.name,
        addedAt: nowIso(),
      }
    const d = documents.find((d) => d.id === id),
      e = evidence.find((e) => e.id === id)
    return { kind: d ? "document" : "evidence", id, title: d?.title ?? e?.title ?? id, addedBy: user.name, addedAt: nowIso() }
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {value.length ? (
        <ul className="flex flex-col gap-2">
          {value.map((r) => (
            <li key={referenceKey(r)} className="flex flex-wrap items-center gap-2 break-all text-sm">
              <AuditReferenceLink reference={r} auditProcess={auditProcess} />
              {!readOnly && (
                <Button
                  size="sm"
                  variant="quiet"
                  aria-label={`Remove evidence ${r.title}`}
                  onClick={() => onChange(value.filter((x) => referenceKey(x) !== referenceKey(r)))}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No {noun} linked.</p>
      )}
      {!readOnly && (
        <>
          {!linksOnly && (
            <RecordPicker
              label="Link existing document or evidence"
              options={options}
              value={value.filter((r) => r.kind !== "link").map((r) => r.id!)}
              onChange={(ids) =>
                onChange([
                  ...value.filter((r) => r.kind === "link"),
                  ...ids.map((id) => value.find((r) => r.id === id) ?? fromId(id)),
                ])
              }
            />
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={`${noun[0].toUpperCase()}${noun.slice(1)} title`}>
              <Input
                aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} title`}
                placeholder={`${noun[0].toUpperCase()}${noun.slice(1)} title`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label={`${noun[0].toUpperCase()}${noun.slice(1)} URL`}>
              <Input aria-label={`${noun[0].toUpperCase()}${noun.slice(1)} URL`} placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </Field>
          </div>
          {error && (
            <p role="alert" className="text-sm text-overdue">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!url.trim()}
              onClick={() => {
                if (!isSafeUrl(url)) return setError("Use a full https:// link to a public document host.")
                const r: AuditReference = {
                  kind: "link",
                  url: url.trim(),
                  title: title.trim() || (noun === "evidence" ? "Supporting evidence" : `${noun[0].toUpperCase()}${noun.slice(1)}`),
                  addedBy: user.name,
                  addedAt: nowIso(),
                }
                onChange([...value.filter((x) => referenceKey(x) !== referenceKey(r)), r])
                setUrl("")
                setTitle("")
                setError("")
              }}
            >
              Add {noun} link
            </Button>
            {!linksOnly && can("Evidence", "Add and edit") && (
              <Button variant="quiet" size="sm" onClick={() => setCreate(true)}>
                Add to evidence library
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Links open in a new tab. SharePoint and OneDrive are identified by source; other links are external and not checked.
            Adding a link does not verify it.
          </p>
          <EvidenceSheet
            open={create}
            onOpenChange={setCreate}
            onCreated={(id) => onChange([...value, { kind: "evidence", id, title: id, addedBy: user.name, addedAt: nowIso() }])}
          />
        </>
      )}
    </div>
  )
}
