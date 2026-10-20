import * as React from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import type { ChecklistQuestion, ChecklistSection } from "@/data/types"
import { QUESTIONNAIRE_ANSWER_TYPES } from "@/data/audit-types"
import { ANSWER_TYPES } from "@/data/records"
import { docIdOf, involvement } from "@/lib/auditors"
import { useDraftClose } from "@/lib/use-draft-close"
import { normalizeQuestion } from "@/lib/audit-workflow"
import { nextId, useStore } from "@/lib/store"
import { Alert } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Input, NativeSelect, Textarea } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
} from "@/components/ui/sheet"
import { Field } from "./form"
import { ConfirmRemove, RowActions } from "./record-actions"
import { QuestionAnswer } from "./question-answer"

/** Shared question editor for reusable templates and versioned audit checklists. */
export function ChecklistEditor({
  sections,
  onChange,
  editable,
  clauses,
  auditors,
  defaultAuditor,
  usesQuestionnaire,
  idPrefix,
  mode = "Checklist",
}: {
  sections: ChecklistSection[]
  onChange: (sections: ChecklistSection[]) => void
  editable: boolean
  clauses: string[]
  auditors: string[]
  defaultAuditor: string
  usesQuestionnaire: boolean
  idPrefix: string
  mode?: "Checklist" | "Questionnaire"
}) {
  const { state, canSee } = useStore()
  const questionnaire = mode === "Questionnaire"
  const answerTypes: readonly string[] = questionnaire
    ? QUESTIONNAIRE_ANSWER_TYPES
    : ANSWER_TYPES
  const [settingsId, setSettingsId] = React.useState<string>()
  const [deleteId, setDeleteId] = React.useState<string>()
  const [evidenceDraft, setEvidenceDraft] = React.useState("")
  const close = useDraftClose(!!evidenceDraft.trim(), () => {
    setSettingsId(undefined)
    setEvidenceDraft("")
  })
  const all = sections.flatMap((s) => s.items)
  const current = all.find((q) => q.id === settingsId)
  const numbering = new Map(all.map((q, i) => [q.id, i + 1]))
  function change(next: ChecklistSection[]) {
    if (editable) onChange(next)
  }
  function patchQ(qid: string, patch: Partial<ChecklistQuestion>) {
    change(
      sections.map((s) => ({
        ...s,
        items: s.items.map((q) =>
          q.id === qid
            ? {
                ...q,
                ...patch,
                ...(questionnaire
                  ? {
                      respondBy: "Auditee" as const,
                      auditeeRequired: patch.required ?? q.required,
                    }
                  : {}),
              }
            : q,
        ),
      })),
    )
  }
  function move(qid: string, dir: -1 | 1) {
    change(
      sections.map((s) => {
        const index = s.items.findIndex((q) => q.id === qid),
          next = index + dir
        if (index < 0 || next < 0 || next >= s.items.length) return s
        const items = [...s.items]
        ;[items[index], items[next]] = [items[next], items[index]]
        return { ...s, items }
      }),
    )
  }
  const conflicts = (q: ChecklistQuestion, who = q.askedBy) =>
    q.evidence
      .map((ev) => {
        const doc = state.documents.find((d) => d.id === docIdOf(ev)),
          how =
            doc && canSee(doc.classification, doc.viewers)
              ? involvement(who, doc)
              : undefined
        return how && doc ? { doc: doc.id, how } : undefined
      })
      .filter((x): x is { doc: string; how: string } => !!x)
  return (
    <>
      <div className="flex min-w-0 flex-col gap-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="flex-wrap gap-2">
              <div className="flex min-w-0 flex-[1_1_18rem] items-center gap-3">
                <span className="rounded-sm bg-background px-2 py-0.5 text-xs font-semibold">
                  {section.clause}
                </span>
                <Input
                  aria-label="Section title"
                  disabled={!editable}
                  value={section.title}
                  onChange={(e) =>
                    change(
                      sections.map((s) =>
                        s.id === section.id
                          ? { ...s, title: e.target.value }
                          : s,
                      ),
                    )
                  }
                  className="min-w-0 flex-1 font-semibold"
                />
              </div>
              {editable && (
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    const q = normalizeQuestion({
                      id: nextId(
                        all.map((q) => q.id),
                        `AQ-${idPrefix}-`,
                        3,
                      ),
                      text: "New question",
                      type: usesQuestionnaire
                        ? "Text notes"
                        : "Audit assessment",
                      respondBy: usesQuestionnaire ? "Auditee" : "Auditor",
                      askedBy: defaultAuditor,
                      clause: clauses.includes(section.clause)
                        ? section.clause
                        : clauses[0],
                      required: true,
                      ...(questionnaire
                        ? { assessmentRequired: false, auditeeRequired: true }
                        : {}),
                      evidence: [],
                      guidance: "",
                    })
                    change(
                      sections.map((s) =>
                        s.id === section.id
                          ? { ...s, items: [...s.items, q] }
                          : s,
                      ),
                    )
                  }}
                >
                  <PlusIcon /> Add question
                </Button>
              )}
              {editable && (
                <RowActions
                  name={section.title}
                  removeKind="delete"
                  onRemove={() =>
                    change(sections.filter((s) => s.id !== section.id))
                  }
                />
              )}
            </CardHeader>
            <div className="flex flex-col divide-y divide-rule-soft">
              {!section.items.length && (
                <p className="px-5 py-4 text-sm text-muted-foreground">
                  No questions yet. Add a question to this section.
                </p>
              )}
              {section.items.map((q) => (
                <section
                  key={q.id}
                  aria-label={`Question ${numbering.get(q.id)}`}
                  data-question-id={q.id}
                  className="flex min-w-0 flex-col gap-4 px-5 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">
                        Question {numbering.get(q.id)}
                      </span>
                      <Badge tone="outline">{q.type}</Badge>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Question ${numbering.get(q.id)} settings`}
                      onClick={() => {
                        setSettingsId(q.id)
                        setEvidenceDraft("")
                      }}
                    >
                      <EllipsisIcon />
                    </Button>
                  </div>
                  {questionnaire && (
                    <Field
                      label="Answer type"
                      htmlFor={`q-type-inline-${q.id}`}
                    >
                      <NativeSelect
                        id={`q-type-inline-${q.id}`}
                        disabled={!editable}
                        value={q.type}
                        onChange={(e) => patchQ(q.id, { type: e.target.value })}
                      >
                        {!answerTypes.includes(q.type) && (
                          <option value={q.type} disabled>
                            Choose an answer type
                          </option>
                        )}
                        {answerTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </NativeSelect>
                    </Field>
                  )}
                  <Field label="Question" htmlFor={`q-text-${q.id}`}>
                    <Textarea
                      id={`q-text-${q.id}`}
                      readOnly={!editable}
                      value={q.text}
                      onChange={(e) => patchQ(q.id, { text: e.target.value })}
                      className="min-h-20"
                    />
                  </Field>
                  {["Multiple choice", "Multiple select"].includes(q.type) && (
                    <Field
                      label="Choices, one per line"
                      htmlFor={`q-choices-${q.id}`}
                    >
                      <Textarea
                        id={`q-choices-${q.id}`}
                        readOnly={!editable}
                        value={(q.choices ?? []).join("\n")}
                        onChange={(e) =>
                          patchQ(q.id, { choices: e.target.value.split("\n") })
                        }
                      />
                    </Field>
                  )}
                  {q.type !== "Instruction" && (
                    <div className="flex min-w-0 flex-col gap-2 rounded-md bg-background p-3">
                      <span className="text-xs text-muted-foreground">
                        Answer preview
                      </span>
                      <QuestionAnswer
                        question={q}
                        value=""
                        disabled
                        onChange={() => undefined}
                        id={`preview-${q.id}`}
                        label={`Answer preview for question ${numbering.get(q.id)}`}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {q.respondBy ?? "Auditor"} ·{" "}
                    {q.required ? "Answer required" : "Answer optional"} ·{" "}
                    {q.evidenceEnabled === false ||
                    q.evidenceRule === "Not required"
                      ? "Evidence links disabled"
                      : `Evidence ${(q.evidenceRule ?? "Optional").toLowerCase()}`}{" "}
                    · {q.askedBy}
                  </p>
                  {conflicts(q).length > 0 && (
                    <Alert tone="warning">
                      Not independent: {q.askedBy} {conflicts(q)[0].how}{" "}
                      {conflicts(q)[0].doc}
                    </Alert>
                  )}
                </section>
              ))}
            </div>
          </Card>
        ))}
        {editable && (
          <Button
            variant="outline"
            className="self-start"
            onClick={() => {
              const clause =
                clauses.find((c) => !sections.some((s) => s.clause === c)) ??
                "New"
              change([
                ...sections,
                {
                  id: nextId(
                    sections.map((s) => s.id),
                    `AS-${idPrefix}-`,
                    3,
                  ),
                  clause,
                  title: "New section",
                  items: [],
                },
              ])
            }}
          >
            <PlusIcon /> Add section
          </Button>
        )}
      </div>
      <Sheet
        open={!!current}
        onOpenChange={(open) => {
          if (!open) close.requestClose()
        }}
      >
        <SheetContent className="max-w-[440px]">
          <SheetHeader>
            <SheetTitle>Question settings</SheetTitle>
            <SheetDescription>
              Question {current ? numbering.get(current.id) : ""} ·{" "}
              {editable
                ? "Changes save automatically."
                : `Read-only ${mode.toLowerCase()}.`}
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            {close.discarding && (
              <Alert tone="warning" title="Discard unsaved evidence link?">
                <p>
                  The question changes are saved. This unlinked text has not
                  been added.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="outline" onClick={close.keep}>
                    Keep editing
                  </Button>
                  <Button variant="outline" onClick={close.discard}>
                    Discard link
                  </Button>
                </div>
              </Alert>
            )}
            {current && (
              <fieldset
                disabled={!editable}
                className="flex min-w-0 flex-col gap-5"
              >
                <Field label="Answer type" htmlFor="q-type">
                  <NativeSelect
                    id="q-type"
                    value={current.type}
                    onChange={(e) =>
                      patchQ(current.id, { type: e.target.value })
                    }
                  >
                    {!answerTypes.includes(current.type) && (
                      <option value={current.type} disabled>
                        Choose an answer type
                      </option>
                    )}
                    {answerTypes.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </NativeSelect>
                </Field>

                {!questionnaire && (
                  <Field label="Who should respond?" htmlFor="q-respond">
                    <NativeSelect
                      id="q-respond"
                      value={current.respondBy ?? "Auditor"}
                      onChange={(e) =>
                        patchQ(current.id, {
                          respondBy: e.target
                            .value as ChecklistQuestion["respondBy"],
                          auditeeRequired:
                            e.target.value !== "Auditor" && current.required,
                        })
                      }
                    >
                      {["Auditee", "Auditor", "Both"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
                {questionnaire && (
                  <p className="text-sm text-muted-foreground">
                    Auditees answer this questionnaire. Assign respondents after
                    it is marked ready.
                  </p>
                )}
                {(current.respondBy ?? "Auditor") !== "Auditor" && (
                  <Field
                    label="Assigned respondent"
                    htmlFor="q-respondent"
                    optional
                  >
                    <NativeSelect
                      id="q-respondent"
                      value={current.respondent ?? ""}
                      onChange={(e) =>
                        patchQ(current.id, { respondent: e.target.value })
                      }
                    >
                      <option value="">Choose when assigning</option>
                      {state.people
                        .filter((p) => p.status !== "Deactivated")
                        .map((p) => (
                          <option key={p.id}>{p.name}</option>
                        ))}
                    </NativeSelect>
                  </Field>
                )}
                <label className="flex min-h-8 items-center justify-between gap-3 text-sm">
                  Allow evidence links
                  <Switch
                    aria-label="Allow evidence links"
                    checked={
                      current.evidenceEnabled !== false &&
                      current.evidenceRule !== "Not required"
                    }
                    onCheckedChange={(enabled) =>
                      patchQ(current.id, {
                        evidenceEnabled: enabled,
                        evidenceRule: enabled ? "Optional" : "Not required",
                      })
                    }
                  />
                </label>
                <Field label="Evidence requirement" htmlFor="q-evidence-rule">
                  <NativeSelect
                    disabled={current.evidenceEnabled === false}
                    id="q-evidence-rule"
                    value={current.evidenceRule ?? "Optional"}
                    onChange={(e) =>
                      patchQ(current.id, {
                        evidenceRule: e.target
                          .value as ChecklistQuestion["evidenceRule"],
                        evidenceEnabled: e.target.value !== "Not required",
                      })
                    }
                  >
                    {["Not required", "Optional", "Required", "When No"].map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </NativeSelect>
                </Field>
                <label className="flex items-center justify-between gap-3 text-sm">
                  N/A needs a justification
                  <Switch
                    aria-label="N/A needs a justification"
                    checked={current.naJustification ?? true}
                    onCheckedChange={(v) =>
                      patchQ(current.id, { naJustification: v })
                    }
                  />
                </label>
                {!questionnaire && (
                  <label className="flex items-center justify-between gap-3 text-sm">
                    Checklist result required
                    <Switch
                      aria-label="Checklist result required"
                      checked={current.assessmentRequired ?? true}
                      onCheckedChange={(v) =>
                        patchQ(current.id, { assessmentRequired: v })
                      }
                    />
                  </label>
                )}
                <Field label="Show after question" optional>
                  <NativeSelect
                    aria-label="Show after question"
                    value={current.showWhen?.questionId ?? ""}
                    onChange={(e) =>
                      patchQ(current.id, {
                        showWhen: e.target.value
                          ? { questionId: e.target.value, equals: "No" }
                          : undefined,
                      })
                    }
                  >
                    <option value="">Always show</option>
                    {all
                      .slice(0, all.indexOf(current))
                      .filter((q) => q.type !== "Instruction")
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.text}
                        </option>
                      ))}
                  </NativeSelect>
                  {current.showWhen && (
                    <Input
                      aria-label="Show when answer equals"
                      value={current.showWhen.equals}
                      onChange={(e) =>
                        patchQ(current.id, {
                          showWhen: {
                            ...current.showWhen!,
                            equals: e.target.value,
                          },
                        })
                      }
                    />
                  )}
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Clause" htmlFor="q-clause">
                    <NativeSelect
                      id="q-clause"
                      value={current.clause ?? ""}
                      onChange={(e) =>
                        patchQ(current.id, { clause: e.target.value })
                      }
                    >
                      <option value="">None</option>
                      {Array.from(
                        new Set([
                          ...clauses,
                          ...(current.clause ? [current.clause] : []),
                        ]),
                      ).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </NativeSelect>
                  </Field>
                  <Field
                    label={questionnaire ? "Reviewed by" : "Asked by"}
                    htmlFor="q-by"
                  >
                    <NativeSelect
                      id="q-by"
                      value={current.askedBy}
                      onChange={(e) =>
                        patchQ(current.id, { askedBy: e.target.value })
                      }
                    >
                      {Array.from(new Set([...auditors, current.askedBy])).map(
                        (p) => (
                          <option key={p}>{p}</option>
                        ),
                      )}
                    </NativeSelect>
                  </Field>
                </div>
                {(() => {
                  const c = conflicts(current)
                  if (!c.length) return null
                  const swap = auditors.find(
                    (p) =>
                      p !== current.askedBy &&
                      conflicts(current, p).length === 0,
                  )
                  return (
                    <Alert
                      tone="warning"
                      title="Someone else should judge this item"
                    >
                      <span className="flex flex-col items-start gap-2.5">
                        <span>
                          {current.askedBy}{" "}
                          {c.map((x) => `${x.how} ${x.doc}`).join(" and ")}, so
                          judging it would mean auditing their own work. ISO
                          9001 clause 9.2.2.
                        </span>
                        {swap && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              patchQ(current.id, { askedBy: swap })
                            }
                          >
                            Give to {swap}
                          </Button>
                        )}
                      </span>
                    </Alert>
                  )
                })()}
                <Field label="Evidence to look at">
                  <ul className="flex flex-col gap-1.5">
                    {current.evidence.length === 0 && (
                      <li className="text-[0.8125rem] text-muted-foreground">
                        Nothing linked yet. Link the documents or records the
                        auditor should look at.
                      </li>
                    )}
                    {current.evidence.map((ev) => {
                      const doc = state.documents.find(
                        (d) => d.id === docIdOf(ev),
                      )
                      const visible =
                        !!doc && canSee(doc.classification, doc.viewers)
                      return (
                        <li
                          key={ev}
                          className="flex items-center gap-2 rounded-sm border px-2.5 py-1.5 text-[0.8125rem]"
                        >
                          <FileTextIcon className="size-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate">
                            {visible ? ev : "Not available"}
                          </span>
                          <button
                            type="button"
                            aria-label={
                              visible
                                ? `Remove ${ev}`
                                : "Remove unavailable reference"
                            }
                            onClick={() =>
                              patchQ(current.id, {
                                evidence: current.evidence.filter(
                                  (x) => x !== ev,
                                ),
                              })
                            }
                            className="cursor-pointer text-muted-foreground"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (!evidenceDraft.trim()) return
                      patchQ(current.id, {
                        evidence: [...current.evidence, evidenceDraft.trim()],
                      })
                      setEvidenceDraft("")
                    }}
                  >
                    <Input
                      aria-label="Link a document or record"
                      list="doc-ids"
                      value={evidenceDraft}
                      onChange={(e) => setEvidenceDraft(e.target.value)}
                      placeholder="Link a document or record"
                      className="h-9"
                    />
                    <datalist id="doc-ids">
                      {state.documents
                        .filter((d) => canSee(d.classification, d.viewers))
                        .slice(0, 40)
                        .map((d) => (
                          <option key={d.id} value={`${d.id} ${d.title}`} />
                        ))}
                    </datalist>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="h-9"
                    >
                      Link
                    </Button>
                  </form>
                </Field>
                <Field
                  label={
                    questionnaire
                      ? "Guidance for the respondent"
                      : "Guidance for the auditor"
                  }
                  htmlFor="q-guide"
                  optional
                >
                  <Textarea
                    id="q-guide"
                    value={current.guidance}
                    onChange={(e) =>
                      patchQ(current.id, { guidance: e.target.value })
                    }
                    className="min-h-20"
                  />
                </Field>
                <label className="flex items-start justify-between gap-4">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">Answer required</span>
                    <span className="text-[0.8125rem] text-muted-foreground">
                      The audit can’t be closed until it is answered.
                    </span>
                  </span>
                  <Switch
                    checked={current.required}
                    onCheckedChange={(v) =>
                      patchQ(current.id, {
                        required: v,
                        auditeeRequired:
                          (current.respondBy ?? "Auditor") !== "Auditor" && v,
                      })
                    }
                    aria-label="Answer required"
                  />
                </label>
              </fieldset>
            )}
          </SheetBody>
          <SheetFooter>
            {current && editable && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    sections.find((s) =>
                      s.items.some((q) => q.id === current.id),
                    )?.items[0]?.id === current.id
                  }
                  onClick={() => move(current.id, -1)}
                >
                  <ArrowUpIcon /> Move up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    sections
                      .find((s) => s.items.some((q) => q.id === current.id))
                      ?.items.at(-1)?.id === current.id
                  }
                  onClick={() => move(current.id, 1)}
                >
                  <ArrowDownIcon /> Move down
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setSettingsId(undefined)
                    setEvidenceDraft("")
                    setDeleteId(current.id)
                  }}
                >
                  <Trash2Icon /> Delete question
                </Button>
              </>
            )}
            <Button variant="outline" onClick={close.requestClose}>
              Done
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <ConfirmRemove
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(undefined)
        }}
        kind="delete"
        name={`question ${numbering.get(deleteId ?? "") ?? ""}`}
        onConfirm={() => {
          change(
            sections.map((s) => ({
              ...s,
              items: s.items.filter((q) => q.id !== deleteId),
            })),
          )
        }}
      />
    </>
  )
}
