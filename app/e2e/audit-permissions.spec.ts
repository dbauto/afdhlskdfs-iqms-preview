import { test, expect } from "@playwright/test"
import type { State } from "../src/lib/store"
import { applyAuditCommand, scopeAuditRecords } from "../src/lib/audit-workflow"
import { applyExecutionCommand } from "../src/lib/audit-execution"
import { PEOPLE, ROLES } from "../src/data/org"

test("audit commands reject cross-respondent access, missing permissions, restricted evidence and stale references", async ({
  page,
}) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /Good .*Aaron/ })).toBeVisible()
  let state: State = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
  const person = (id: string) => PEOPLE.find((p) => p.id === id)!
  const role = (id: string) => ROLES.find((r) => r.id === person(id).roleId)!
  const lead = person("p-dr"),
    leadRole = role("p-dr"),
    joy = person("p-ja"),
    joyRole = role("p-ja")
  state.audits = state.audits.map((a) => (a.id === "IA-2026-10" ? { ...a, auditors: ["Kim Dela Cruz"] } : a))
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "releaseChecklist",
    auditId: "IA-2026-10",
    id: "ACL-PERM",
    usesQuestionnaire: true,
    sections: [
      {
        id: "section",
        clause: "7.2",
        title: "Competence",
        items: [
          {
            id: "q1",
            type: "Text notes",
            text: "Describe competence checks",
            askedBy: lead.name,
            clause: "7.2",
            respondBy: "Auditee",
            required: true,
            evidenceEnabled: false,
            evidenceRule: "Not required",
            evidence: [],
            guidance: "",
          },
          {
            id: "q2",
            type: "Multiple select",
            text: "Select retained records",
            choices: ["Training", "Review"],
            askedBy: "Kim Dela Cruz",
            clause: "7.2",
            respondBy: "Auditee",
            required: true,
            evidenceRule: "Optional",
            evidence: [],
            guidance: "",
          },
        ],
      },
    ],
  })
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "assignQuestionnaire",
    auditId: "IA-2026-10",
    id: "AQA-PERM",
    checklistId: "ACL-PERM",
    respondent: joy.name,
    questionIds: ["q1", "q2"],
    dueDate: "2099-01-01",
  })
  const draft = { questionId: "q1", value: "Quarterly competence checks", explanation: "", naReason: "", evidence: [] }
  expect(() =>
    applyAuditCommand(state, person("p-bc"), role("p-bc"), {
      kind: "saveResponses",
      auditId: "IA-2026-10",
      assignmentId: "AQA-PERM",
      responses: [draft],
      submit: false,
    }),
  ).toThrow(/Only the assigned respondent/)
  const denied = { ...joyRole, access: { ...joyRole.access, Audits: "None" as const } }
  expect(() =>
    applyAuditCommand(state, joy, denied, {
      kind: "saveResponses",
      auditId: "IA-2026-10",
      assignmentId: "AQA-PERM",
      responses: [draft],
      submit: false,
    }),
  ).toThrow(/Only the assigned respondent/)
  expect(scopeAuditRecords(state, state, joy, denied).questionnaireAssignments).toHaveLength(0)
  expect(scopeAuditRecords(state, state, joy, denied).audits).toHaveLength(0)
  expect(() =>
    applyAuditCommand(state, { ...joy, status: "Deactivated" }, joyRole, {
      kind: "saveResponses",
      auditId: "IA-2026-10",
      assignmentId: "AQA-PERM",
      responses: [draft],
      submit: false,
    }),
  ).toThrow(/not available/)
  expect(() =>
    applyAuditCommand(state, joy, joyRole, {
      kind: "saveResponses",
      auditId: "IA-2026-10",
      assignmentId: "AQA-PERM",
      responses: [
        {
          ...draft,
          evidence: [{ kind: "link", title: "Example", url: "https://example.com/evidence", addedBy: joy.name, addedAt: "" }],
        },
      ],
      submit: false,
    }),
  ).toThrow(/Evidence links are disabled/)
  expect(() =>
    applyAuditCommand(state, joy, joyRole, {
      kind: "saveResponses",
      auditId: "IA-2026-10",
      assignmentId: "AQA-PERM",
      responses: [draft, { ...draft, questionId: "q2", value: "Forged option", selectedValues: ["Forged option"] }],
      submit: true,
    }),
  ).toThrow(/configured options/)
  state = applyAuditCommand(state, joy, joyRole, {
    kind: "saveResponses",
    auditId: "IA-2026-10",
    assignmentId: "AQA-PERM",
    responses: [draft, { ...draft, questionId: "q2", value: "Training, Review", selectedValues: ["Training", "Review"] }],
    submit: true,
  })
  const repeat = applyAuditCommand(state, joy, joyRole, {
    kind: "saveResponses",
    auditId: "IA-2026-10",
    assignmentId: "AQA-PERM",
    responses: [draft],
    submit: true,
  })
  expect(repeat.auditeeResponses.map((r) => r.submissions?.length)).toEqual([1, 1])
  const kim = scopeAuditRecords(state, state, person("p-kd"), role("p-kd"))
  expect(kim.auditeeResponses.map((r) => r.questionId)).toEqual(["q2"])
  expect(
    scopeAuditRecords(state, state, { ...person("p-ec"), accessEndsOn: "2020-01-01" }, role("p-ec")).auditeeResponses,
  ).toHaveLength(0)
  const restricted = {
    ...state.documents[0],
    id: "SYNTHETIC-RESTRICTED",
    title: "Synthetic restricted title",
    classification: "Highly confidential" as const,
    owner: "Other synthetic owner",
    viewers: [],
    reviewers: [],
    approvers: [],
  }
  state.documents.push(restricted)
  const ref = { kind: "document" as const, id: restricted.id, title: restricted.title, addedBy: joy.name, addedAt: "" }
  state.auditeeResponses[1].evidence = [ref]
  state.auditeeResponses[1].submissions![0].evidence = [ref]
  const filtered = scopeAuditRecords(state, state, person("p-kd"), role("p-kd"))
  expect(JSON.stringify(filtered.auditeeResponses)).not.toContain("Synthetic restricted title")
  expect(filtered.auditeeResponses[0].evidence[0].title).toBe("Not available")
  expect(() =>
    applyExecutionCommand(state, person("p-kd"), role("p-kd"), {
      kind: "verifyAuditEvidence",
      auditId: "IA-2026-10",
      checklistId: "ACL-PERM",
      questionId: "q2",
      reference: ref,
      status: "Verified",
      notes: "Cannot verify a restricted record",
    }),
  ).toThrow(/unavailable or not permitted/)
  expect(() =>
    applyExecutionCommand(state, lead, leadRole, {
      kind: "saveAssessment",
      auditId: "IA-2026-10",
      checklistId: "ACL-PERM",
      questionId: "q1",
      draft: {
        result: "Conforms",
        objectiveEvidence: "Compared records",
        sampling: "Three records",
        interviewee: "",
        notes: "",
        evidence: [
          {
            kind: "response",
            id: state.auditeeResponses[0].id,
            responseRevision: 999,
            title: "Invalid revision",
            addedBy: lead.name,
            addedAt: "",
          },
        ],
        status: "Completed",
      },
    }),
  ).toThrow(/unavailable or not permitted/)
})
