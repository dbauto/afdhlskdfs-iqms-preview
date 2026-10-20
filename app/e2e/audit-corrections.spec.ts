import { openPageLink } from "./helpers/page-links"
import { test, expect } from "@playwright/test"
import {
  auditFixture,
  auditId,
  command,
  addForm,
  releaseForm,
  formSettings,
  installState,
  viewAs,
} from "./helpers/audit-forms"

async function actor(
  page: import("@playwright/test").Page,
  from: string,
  to: string,
) {
  await page
    .getByRole("button", { name: new RegExp(from) })
    .first()
    .click()
  await page.getByRole("menuitem", { name: new RegExp(to) }).click()
}
const assessment = {
  result: "Minor NC" as const,
  objectiveEvidence: "Synthetic record review.",
  sampling: "Two records",
  interviewee: "",
  notes: "",
  evidence: [],
  status: "Completed" as const,
}
const draft = {
  objectives: "Review competence.",
  scope: "People & competence",
  criteria: "Clause 7.2",
  evidenceSummary: "Two synthetic records checked.",
  summary: "The sample was reviewed.",
  conclusion: "The original result was corrected after review.",
  followUp: "No corrective action required.",
}
const paper = {
  kind: "link" as const,
  url: "https://example.com/synthetic-findings-paper",
  title: "Synthetic findings paper",
  addedBy: "Daniel Reyes",
  addedAt: "",
}

test("planning creates a usable template copy, records rescheduling and offers a recoverable missing-history choice", async ({
  page,
}) => {
  await page.goto("/audits")
  await page.getByRole("button", { name: "Plan audit", exact: true }).click()
  await page.locator("#pa-proc").selectOption("People & competence")
  await page
    .getByRole("radio", { name: /Most recent released checklist/ })
    .check()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Plan audit", exact: true })
    .click()
  await expect(
    page.getByText(/There is no released checklist for this process yet/),
  ).toBeVisible()
  await page
    .getByRole("radio", { name: /People & competence template/ })
    .check()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Plan audit", exact: true })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "People & competence audit",
      exact: true,
    }),
  ).toBeVisible()
  const id = page.url().split("/").at(-1)!
  await page.getByRole("button", { name: "Add checklist", exact: true }).click()
  await page.locator("#af-title").fill("Competence controls")
  await page.getByRole("button", { name: "Add form", exact: true }).click()
  await expect(page.locator('textarea[id^="q-text-"]').first()).toBeEditable()
  let saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
  const form = saved.auditChecklists.find((c: any) => c.auditId === id)
  expect(form.templateSource.id).toBe("CT-05")
  expect(form.sections.flatMap((s: any) => s.items).length).toBe(
    saved.audits
      .find((a: any) => a.id === id)
      .templateSnapshot.sections.flatMap((s: any) => s.items).length,
  )
  const original = structuredClone(
    saved.templates.find((t: any) => t.id === "CT-05"),
  )
  await page
    .locator('textarea[id^="q-text-"]')
    .first()
    .fill("Clarified first competence check")
  page = await openPageLink(page, page.getByRole("link", { name: "Back to audit", exact: true }))
  await page.getByRole("button", { name: "Edit plan", exact: true }).click()
  await expect(page.locator("#pa-proc")).toBeDisabled()
  await page.locator("#pa-date").fill("2027-01-07")
  await page.locator("#pa-report-due").fill("2027-01-21")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await expect(
    page.getByText("Explain why the audit date is changing.", { exact: true }),
  ).toBeVisible()
  await page
    .locator("#pa-schedule-reason")
    .fill("Move to the agreed January schedule.")
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
  expect(saved.audits.find((a: any) => a.id === id).scheduleHistory[0].to).toBe(
    "2027-01-07",
  )
  expect(saved.templates.find((t: any) => t.id === "CT-05")).toEqual(original)
})

test("a preparer requests a released questionnaire revision and edits the new draft without changing the original", async ({
  page,
}) => {
  let state = await auditFixture(page)
  state.audits.find((a) => a.id === auditId)!.auditors = [
    "Kim Dela Cruz",
    "Ben Castillo",
  ]
  const settings = {
    ...formSettings("Released competence questions", "Questionnaire"),
    ownerId: "p-ms",
  }
  state = releaseForm(
    addForm(state, "AQF-6401", "Questionnaire", settings),
    "AQF-6401",
  )
  const original = structuredClone(
    state.auditChecklists.find((c) => c.id === "AQF-6401")!.sections,
  )
  await installState(
    page,
    state,
    "p-ms",
    `/audits/${auditId}/questionnaire-builder?version=AQF-6401`,
  )
  await expect(page.locator('textarea[id^="q-text-"]')).toHaveAttribute(
    "readonly",
    "",
  )
  await page
    .getByRole("button", { name: "Request revision", exact: true })
    .click()
  await page.locator("#revision-reason").fill("Clarify the review frequency.")
  await page
    .getByRole("button", { name: "Send revision request", exact: true })
    .click()
  await actor(page, "Maria Santos", "Daniel Reyes")
  await page
    .getByRole("button", { name: "Start questionnaire revision", exact: true })
    .click()
  await expect(page.locator("#revision-reason")).toHaveValue(
    "Clarify the review frequency.",
  )
  await page
    .getByRole("button", { name: "Create revision draft", exact: true })
    .click()
  await actor(page, "Daniel Reyes", "Maria Santos")
  await page
    .locator('textarea[id^="q-text-"]')
    .fill("How often is competence reviewed?")
  await page.reload()
  await expect(page.locator('textarea[id^="q-text-"]')).toHaveValue(
    "How often is competence reviewed?",
  )
  const final = await page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
  expect(
    final.auditChecklists.find((c: any) => c.id === "AQF-6401").sections,
  ).toEqual(original)
  expect(
    final.auditChecklists.filter((c: any) => c.formId === "AQF-6401"),
  ).toHaveLength(2)
})

test("reassessing a nonconformity as conforming needs no corrective action and keeps the earlier result", async ({
  page,
}) => {
  let state = releaseForm(
    addForm(await auditFixture(page), "ACL-6501"),
    "ACL-6501",
  )
  state = command(state, "p-dr", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6501",
    questionId: "ACL-6501-q1",
    draft: assessment,
  })
  const first = state.auditorAssessments.at(-1)!
  expect(() =>
    command(state, "p-dr", {
      kind: "completeAuditForm",
      auditId,
      checklistId: "ACL-6501",
    }),
  ).toThrow(/corrective action/)
  await installState(
    page,
    state,
    "p-dr",
    `/audits/${auditId}/conduct?version=ACL-6501&question=ACL-6501-q1`,
  )
  await expect(
    page.getByRole("button", { name: "Raise corrective action", exact: true }),
  ).toBeVisible()
  await page.locator("#aa-result").selectOption("Conforms")
  await page
    .locator("#aa-evidence")
    .fill("The complete index and the review record were found.")
  await page.getByRole("button", { name: "Record result", exact: true }).click()
  await expect(
    page.getByRole("button", { name: "Raise corrective action", exact: true }),
  ).toHaveCount(0)
  state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
  const latest = state.auditorAssessments.at(-1)!
  expect(latest.result).toBe("Conforms")
  expect(latest.supersedes).toBe(first.id)
  expect(state.auditorAssessments.find((a) => a.id === first.id)?.result).toBe(
    "Minor NC",
  )
  state = command(state, "p-dr", {
    kind: "completeAuditForm",
    auditId,
    checklistId: "ACL-6501",
  })
  state = command(state, "p-dr", { kind: "saveAuditReport", auditId, draft })
  state = command(state, "p-dr", {
    kind: "saveAuditContribution",
    auditId,
    summary: "The full sample was checked.",
    conclusion: "The original gap was disproved.",
    followUp: "",
  })
  state = command(state, "p-dr", {
    kind: "saveFindingsPaper",
    auditId,
    references: [paper],
  })
  state = command(state, "p-dr", {
    kind: "issueAuditReport",
    auditId,
    reportId: state.auditReports.at(-1)!.id,
  })
  expect(state.ncs.some((n) => n.source.includes("ACL-6501"))).toBe(false)
  await installState(page, state, "p-dr", `/audits/${auditId}/report`)
  await expect(
    page.getByText(
      "No observations or nonconformities recorded on the checklist.",
      { exact: true },
    ),
  ).toBeVisible()
})

test("results pin an earlier questionnaire version and reject unavailable version IDs", async ({
  page,
}) => {
  let state = releaseForm(
    addForm(await auditFixture(page), "AQF-6601", "Questionnaire"),
    "AQF-6601",
  )
  state = command(state, "p-dr", {
    kind: "assignQuestionnaire",
    auditId,
    id: "AQA-6601",
    checklistId: "AQF-6601",
    respondent: "Joy Aquino",
    questionIds: ["AQF-6601-q1"],
    dueDate: "2027-01-10",
  })
  state = command(state, "p-ja", {
    kind: "saveResponses",
    auditId,
    assignmentId: "AQA-6601",
    submit: true,
    responses: [
      {
        questionId: "AQF-6601-q1",
        value: "Answer on version one",
        explanation: "",
        naReason: "",
        evidence: [],
      },
    ],
  })
  state = command(state, "p-dr", {
    kind: "reviseChecklist",
    auditId,
    checklistId: "AQF-6601",
    id: "AQF-6602",
    reason: "New version.",
  })
  await installState(
    page,
    state,
    "p-dr",
    `/audits/${auditId}/results?form=AQF-6601`,
  )
  await expect(
    page.getByRole("region", { name: "Questionnaire responses", exact: true }),
  ).toContainText("Answer on version one")
  await expect(
    page.getByRole("combobox", { name: "Form results", exact: true }),
  ).toHaveValue("AQF-6601")
  await expect(
    page.getByRole("button", { name: "Complete form", exact: true }),
  ).toHaveCount(0)
  await page.goto(`/audits/${auditId}/results?form=unavailable`)
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: false }),
  ).toBeVisible()
})

test("withdrawing or superseding a form cannot hide its nonconformity results from the report", async ({
  page,
}) => {
  let state = addForm(await auditFixture(page), "ACL-6901")
  state.auditChecklists.find(
    (c) => c.id === "ACL-6901",
  )!.sections[0].items[0].askedBy = "Kim Dela Cruz"
  state = releaseForm(state, "ACL-6901")
  state = command(state, "p-kd", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6901",
    questionId: "ACL-6901-q1",
    draft: assessment,
  })
  state = command(state, "p-dr", {
    kind: "withdrawAuditForm",
    auditId,
    checklistId: "ACL-6901",
    reason: "The form was replaced; its nonconformity still needs corrective action.",
  })
  state = releaseForm(addForm(state, "ACL-6902", "Checklist", { ...formSettings("Replacement checklist"), members: [] }), "ACL-6902")
  state = command(state, "p-dr", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6902",
    questionId: "ACL-6902-q1",
    draft: { ...assessment, result: "Conforms" },
  })
  state = command(state, "p-dr", {
    kind: "completeAuditForm",
    auditId,
    checklistId: "ACL-6902",
  })
  state = command(state, "p-dr", { kind: "saveAuditReport", auditId, draft })
  state = command(state, "p-dr", {
    kind: "saveAuditContribution",
    auditId,
    summary: "Both versions reviewed.",
    conclusion: "The original nonconformity is retained.",
    followUp: "Track its corrective action.",
  })
  state = command(state, "p-dr", {
    kind: "saveFindingsPaper",
    auditId,
    references: [paper],
  })
  const reportId = state.auditReports.at(-1)!.id
  expect(() =>
    command(state, "p-dr", { kind: "issueAuditReport", auditId, reportId }),
  ).toThrow(/Ask Kim Dela Cruz/)
  await installState(page, state, "p-kd", `/audits/${auditId}/report`)
  await expect(page.getByText(/full report contains forms outside your access/)).toBeVisible()
  await page.locator("#contribution-summary").fill("Reviewed the original form before replacement.")
  await page.locator("#contribution-conclusion").fill("The original gap remains attributable.")
  await page.getByRole("button", { name: "Save contribution", exact: true }).click()
  state = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
  expect(() =>
    command(state, "p-dr", { kind: "issueAuditReport", auditId, reportId }),
  ).toThrow(/withdrawn form/)
  await installState(page, state, "p-dr", `/audits/${auditId}`)
  await expect(page.getByText(/withdrawn form/).first()).toBeVisible()
  state = command(state, "p-dr", {
    kind: "raiseResultNc",
    auditId,
    checklistId: "ACL-6901",
    questionId: "ACL-6901-q1",
    id: "NC-2026-6901",
    title: "A real historical gap",
    details: "The synthetic record was incomplete.",
    owner: "Rosa Tan",
    containment: "",
    dueDate: "2027-01-10",
  })
  expect(() =>
    command(state, "p-kd", {
      kind: "saveAssessment",
      auditId,
      checklistId: "ACL-6901",
      questionId: "ACL-6901-q1",
      draft: { ...assessment, result: "Conforms" },
    }),
  ).toThrow()
  state = command(state, "p-dr", {
    kind: "issueAuditReport",
    auditId,
    reportId,
  })
  expect(
    state.auditReports
      .at(-1)
      ?.snapshot?.checklists?.some((c) => c.id === "ACL-6901" && c.withdrawnAt),
  ).toBe(true)
  expect(
    state.auditReports
      .at(-1)
      ?.snapshot?.assessments.some(
        (a) => a.checklistId === "ACL-6901" && a.ncId === "NC-2026-6901",
      ),
  ).toBe(true)
})
