import { openPageLink } from "./helpers/page-links"
import { test, expect, type Page } from "@playwright/test"
import type { State } from "../src/lib/store"
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
import { scopeAuditRecords, applyAuditCommand } from "../src/lib/audit-workflow"
import { reportProblems } from "../src/lib/audit-report-policy"
const draft = {
  objectives: "Check competence records.",
  scope: "People & competence",
  criteria: "Clause 7.2",
  evidenceSummary: "Synthetic records sampled.",
  summary: "The audit covered the planned scope.",
  conclusion: "The process conforms.",
  followUp: "None required.",
}
const assessment = {
  result: "Conforms" as const,
  objectiveEvidence: "Three synthetic records checked.",
  sampling: "Three records",
  interviewee: "",
  notes: "",
  evidence: [],
  status: "Completed" as const,
}
const data = async (p: Page): Promise<State> =>
  p.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
async function switchActor(page: Page, from: string, to: string) {
  await page
    .getByRole("button", { name: new RegExp(from) })
    .first()
    .click()
  await page.getByRole("menuitem", { name: new RegExp(to) }).click()
}
async function completeChecklist(state: State, id: string, by = "p-dr") {
  state = command(state, by, {
    kind: "saveAssessment",
    auditId,
    checklistId: id,
    questionId: `${id}-q1`,
    draft: assessment,
  })
  return command(state, "p-dr", {
    kind: "completeAuditForm",
    auditId,
    checklistId: id,
  })
}

test("a real default-user journey edits questionnaire text, hands it to the lead, collects a response, and issues and amends a no-NC report", async ({
  page,
}) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  await page.goto(`/audits/${auditId}`)
  await page
    .getByRole("button", { name: "Add questionnaire", exact: true })
    .click()
  await expect(page.locator("#af-owner")).toHaveValue("p-al")
  await page.locator("#af-title").fill("Competence review questions")
  await page
    .getByRole("button", { name: "Create questionnaire", exact: true })
    .click()
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  const question = page.locator('textarea[id^="q-text-"]')
  await question.fill("")
  await question.pressSequentially("How is competence reviewed?")
  await page.reload()
  await expect(question).toHaveValue("How is competence reviewed?")
  await expect(
    page.getByRole("button", { name: "Mark questionnaire ready", exact: true }),
  ).toBeDisabled()
  await page
    .getByRole("button", { name: "Ask lead to mark ready", exact: true })
    .click()
  await expect(
    page.getByRole("button", { name: "Waiting for Daniel Reyes", exact: true }),
  ).toBeDisabled()
  await switchActor(page, "Aaron Lim", "Daniel Reyes")
  await expect(
    page.getByRole("button", { name: "Mark questionnaire ready", exact: true }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Mark questionnaire ready", exact: true })
    .click()
  await page.locator("#qa-person").selectOption("Joy Aquino")
  await page
    .getByRole("button", { name: "Assign questionnaire", exact: true })
    .click()
  const saved = await data(page),
    form = saved.auditChecklists.find(
      (c) => c.title === "Competence review questions",
    )!,
    assignment = saved.questionnaireAssignments.find(
      (a) => a.checklistId === form.id,
    )!
  await switchActor(page, "Daniel Reyes", "Joy Aquino")
  await page.goto(`/audits/${auditId}`)
  page = await openPageLink(page, page.getByRole("link", { name: /Open questionnaire/ }))
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("We review competence annually.")
  await page
    .getByRole("button", { name: "Submit questionnaire", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Confirm submission", exact: true })
    .click()
  await switchActor(page, "Joy Aquino", "Daniel Reyes")
  await page.goto(`/audits/${auditId}`)
  page = await openPageLink(page, page
    .getByRole("link", { name: "Responses and results", exact: true }))
  await expect(
    page.getByRole("region", { name: "Questionnaire responses", exact: true }),
  ).toContainText("We review competence annually.")
  await page.getByRole("button", { name: "Complete form", exact: true }).click()
  const current = await data(page)
  current.audits.find((a) => a.id === auditId)!.auditors = [
    "Kim Dela Cruz",
    "Ben Castillo",
  ]
  let withChecklist = await completeChecklist(
    releaseForm(addForm(current, "ACL-6050"), "ACL-6050"),
    "ACL-6050",
  )
  withChecklist = command(withChecklist, "p-dr", {
    kind: "saveAuditContribution",
    auditId,
    summary: "Questionnaire and checklist reviewed.",
    conclusion: "Conforms.",
    followUp: "",
  })
  await installState(page, withChecklist, "p-dr", `/audits/${auditId}`)
  await page
    .getByRole("textbox", { name: "Findings paper title", exact: true })
    .fill("Competence audit findings")
  await page
    .getByRole("textbox", { name: "Findings paper URL", exact: true })
    .fill("https://example.com/competence-findings")
  await page
    .getByRole("button", { name: "Add findings paper link", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Save findings paper", exact: true })
    .click()
  await expect(page.getByText(/Last saved by Daniel Reyes/)).toBeVisible()
  page = await openPageLink(page, page.getByRole("link", { name: "Audit report", exact: true }))
  await expect(
    page.getByRole("button", { name: "Issue report", exact: true }),
  ).toBeDisabled()
  for (const [key, value] of Object.entries(draft))
    await page.locator(`#report-${key}`).fill(value)
  await page.locator("#report-summary").fill("")
  await page
    .locator("#report-summary")
    .pressSequentially("The planned questionnaire was completed.")
  await page.reload()
  await expect(page.locator("#report-summary")).toHaveValue(
    "The planned questionnaire was completed.",
  )
  await expect(
    page.getByRole("button", { name: "Issue report", exact: true }),
  ).toBeEnabled()
  await page.getByRole("button", { name: "Issue report", exact: true }).click()
  await page
    .getByRole("button", { name: "Confirm issuance", exact: true })
    .click()
  const issued = (await data(page)).auditReports.find(
    (r) => r.auditId === auditId,
  )!
  expect(
    issued.snapshot?.responses.find((r) => r.assignmentId === assignment.id)
      ?.value,
  ).toBe("We review competence annually.")
  await expect(
    page.getByRole("button", { name: "Print report", exact: true }),
  ).toBeVisible()
  await page
    .getByRole("button", { name: "Start report amendment", exact: true })
    .click()
  await page.locator("#report-amendment").fill("Clarify the conclusion.")
  await page
    .getByRole("button", { name: "Create amendment draft", exact: true })
    .click()
  await page
    .locator("#report-conclusion")
    .fill("The sampled competence review conforms.")
  await page.getByRole("button", { name: "Issue report", exact: true }).click()
  await page
    .getByRole("button", { name: "Confirm issuance", exact: true })
    .click()
  const final = await data(page)
  expect(final.auditReports.find((r) => r.id === issued.id)).toEqual(issued)
  expect(
    final.auditReports
      .filter((r) => r.auditId === auditId)
      .map((r) => r.version)
      .sort(),
  ).toEqual([1, 2])
  await page
    .getByRole("combobox", { name: "Report version", exact: true })
    .selectOption(issued.id)
  await expect(
    page.getByText("The planned questionnaire was completed.", { exact: true }),
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("an existing draft has a governed editing takeover; unrelated viewers and frozen versions stay protected", async ({
  page,
}) => {
  const state = addForm(await auditFixture(page), "AQF-6001", "Questionnaire")
  state.audits.find((a) => a.id === auditId)!.auditors = [
    "Kim Dela Cruz",
    "Ben Castillo",
  ]
  await installState(
    page,
    state,
    "p-ms",
    `/audits/${auditId}/questionnaire-builder?version=AQF-6001&mode=view`,
  )
  await page
    .getByRole("button", { name: "Edit questions", exact: true })
    .click()
  await expect(
    page.getByRole("heading", {
      name: "Take over form preparation",
      exact: true,
    }),
  ).toBeVisible()
  await page
    .locator("#takeover-reason")
    .fill("The quality manager is preparing these questions.")
  await page
    .getByRole("button", { name: "Take over and edit", exact: true })
    .click()
  await page
    .locator('textarea[id^="q-text-"]')
    .fill("The updated draft question")
  const next = await data(page)
  expect(
    next.auditChecklists.find((c) => c.id === "AQF-6001")?.ownershipHistory?.[0]
      .to,
  ).toBe("p-ms")
  const released = releaseForm(next, "AQF-6001")
  expect(() =>
    command(released, "p-ms", {
      kind: "takeOverAuditForm",
      auditId,
      checklistId: "AQF-6001",
      reason: "Overwrite release",
    }),
  ).toThrow(/editable draft/)
  expect(() =>
    command(state, "p-bc", {
      kind: "takeOverAuditForm",
      auditId,
      checklistId: "AQF-6001",
      reason: "Read-only collaborator",
    }),
  ).toThrow(/quality manager/)
})

const paper = [
  {
    kind: "link" as const,
    url: "https://example.com/synthetic-findings-paper",
    title: "Synthetic findings paper",
    addedBy: "Daniel Reyes",
    addedAt: "",
  },
]

async function resultsFixture(page: Page) {
  let state = await auditFixture(page)
  for (const [id, actor] of [
    ["ACL-6101", "p-dr"],
    ["ACL-6102", "p-kd"],
  ]) {
    state = addForm(state, id)
    const c = state.auditChecklists.find((c) => c.id === id)!
    c.sections[0].items[0].askedBy = state.people.find(
      (p) => p.id === actor,
    )!.name
    state = releaseForm(state, id)
    state = command(state, actor, {
      kind: "saveAssessment",
      auditId,
      checklistId: id,
      questionId: `${id}-q1`,
      draft: {
        ...assessment,
        result: "Minor NC",
        objectiveEvidence: `Two synthetic records lack a review (${actor}).`,
      },
    })
  }
  return state
}

test("nonconformity results raise one corrective action each, survive reassessment, and the report freezes the findings paper", async ({
  page,
}) => {
  let state = await resultsFixture(page)
  for (const id of ["ACL-6101", "ACL-6102"])
    expect(() =>
      command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: id }),
    ).toThrow(/corrective action/)
  const raise = (s: State, actor: string, checklistId: string, id: string) =>
    command(s, actor, {
      kind: "raiseResultNc",
      auditId,
      checklistId,
      questionId: `${checklistId}-q1`,
      id,
      title: `Training review gap in ${checklistId}`,
      details: "Two synthetic records lack a review.",
      owner: "Rosa Tan",
      containment: "Check the remaining records.",
      dueDate: "2027-01-10",
    })
  expect(() => raise(state, "p-kd", "ACL-6101", "NC-2026-6100")).toThrow(
    /Only the auditor who recorded this result/,
  )
  const kim = state.people.find((p) => p.id === "p-kd")!
  const viewOnly = {
    ...state.roles.find((r) => r.id === kim.roleId)!,
    access: {
      ...state.roles.find((r) => r.id === kim.roleId)!.access,
      "Corrective Action": "View" as const,
    },
  }
  expect(() =>
    applyAuditCommand(state, kim, viewOnly, {
      kind: "raiseResultNc",
      auditId,
      checklistId: "ACL-6102",
      questionId: "ACL-6102-q1",
      id: "NC-2026-6199",
      title: "Not allowed",
      details: "Not allowed",
      owner: "Rosa Tan",
      containment: "",
      dueDate: "",
    }),
  ).toThrow(/Add and edit access/)
  expect(() =>
    command(state, "p-dr", {
      kind: "linkResultNc",
      auditId,
      checklistId: "ACL-6101",
      questionId: "ACL-6101-q1",
      ncId: "NC-0000-000",
    }),
  ).toThrow(/existing nonconformity/)
  state = raise(state, "p-dr", "ACL-6101", "NC-2026-6101")
  state = raise(state, "p-kd", "ACL-6102", "NC-2026-6102")
  const ncCount = state.ncs.length
  expect(raise(state, "p-kd", "ACL-6102", "NC-2026-6103").ncs).toHaveLength(ncCount)
  expect(
    state.notifications.some(
      (n) => n.to === "Rosa Tan" && n.href === "/corrective-action/NC-2026-6102",
    ),
  ).toBe(true)
  state = command(state, "p-kd", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6102",
    questionId: "ACL-6102-q1",
    draft: {
      ...assessment,
      result: "Minor NC",
      objectiveEvidence: "Two synthetic records lack a review; a third was late.",
    },
  })
  const latest = state.auditorAssessments.filter((a) => a.checklistId === "ACL-6102").at(-1)!
  expect(latest.ncId).toBe("NC-2026-6102")
  expect(state.ncs).toHaveLength(ncCount)
  for (const id of ["ACL-6101", "ACL-6102"])
    state = command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: id })
  state = command(state, "p-dr", { kind: "saveAuditReport", auditId, draft })
  for (const actor of ["p-dr", "p-kd"])
    state = command(state, actor, {
      kind: "saveAuditContribution",
      auditId,
      summary: `Sample reviewed by ${actor}`,
      conclusion: "A training review gap remains.",
      followUp: "Track corrective actions.",
    })
  let report = state.auditReports.at(-1)!
  expect(() =>
    command(state, "p-dr", { kind: "issueAuditReport", auditId, reportId: report.id }),
  ).toThrow(/findings paper/)
  expect(() =>
    command(state, "p-kd", {
      kind: "saveFindingsPaper",
      auditId,
      references: [{ ...paper[0], url: "http://example.com/insecure" }],
    }),
  ).toThrow(/https/)
  state = command(state, "p-kd", { kind: "saveFindingsPaper", auditId, references: paper })
  report = state.auditReports.at(-1)!
  expect(report.findingsPaper?.[0].url).toBe(paper[0].url)
  expect(report.findingsPaperBy).toBe("Kim Dela Cruz")
  expect(reportProblems(state, state.audits.find((a) => a.id === auditId)!, report)).toEqual([])
  state = command(state, "p-dr", { kind: "issueAuditReport", auditId, reportId: report.id })
  const issued = state.auditReports.at(-1)!
  expect(issued.status).toBe("Issued")
  expect(issued.findingsPaper?.[0].url).toBe(paper[0].url)
  expect(issued.snapshot?.assessments.filter((a) => a.ncId)).toHaveLength(3)
  expect(() =>
    command(state, "p-kd", { kind: "saveFindingsPaper", auditId, references: [] }),
  ).toThrow(/read-only/)
  expect(
    command(state, "p-dr", { kind: "issueAuditReport", auditId, reportId: report.id }),
  ).toEqual(state)
  expect(() =>
    command(state, "p-dr", {
      kind: "reopenAuditForm",
      auditId,
      checklistId: "ACL-6101",
      phase: "Completion",
      reason: "Change frozen work",
    }),
  ).toThrow(/read-only/)
  await installState(page, state, "p-dr", `/audits/${auditId}/report`)
  await expect(page.getByRole("link", { name: /Synthetic findings paper/ }).first()).toBeVisible()
  await expect(page.getByText("Question for ACL-6101", { exact: true })).toBeVisible()
  await expect(page.locator('a[aria-label^="Open NC-2026-6102"]').first()).toBeVisible()
  await expect(
    page.getByRole("button", { name: "Start report amendment", exact: true }),
  ).toBeVisible()
})

test("report gates reject missing submissions, unfinished approvals and unauthorized issue or amendment; snapshots respect current grants and classification", async ({
  page,
}) => {
  let state = releaseForm(
    addForm(await auditFixture(page), "ACL-6201"),
    "ACL-6201",
  )
  state = await completeChecklist(state, "ACL-6201")
  state = command(state, "p-dr", { kind: "saveAuditReport", auditId, draft })
  state = command(state, "p-dr", {
    kind: "saveAuditContribution",
    auditId,
    summary: "Records checked.",
    conclusion: "Conforms.",
    followUp: "",
  })
  state = command(state, "p-dr", { kind: "saveFindingsPaper", auditId, references: paper })
  const report = state.auditReports.at(-1)!
  expect(() =>
    command(state, "p-kd", {
      kind: "issueAuditReport",
      auditId,
      reportId: report.id,
    }),
  ).toThrow(/Only the lead/)
  const extra = formSettings("Not complete yet")
  extra.completionRoute = { mode: "All", approverIds: ["p-kd"] }
  state = releaseForm(
    addForm(state, "ACL-6202", "Checklist", extra),
    "ACL-6202",
  )
  state = command(state, "p-dr", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6202",
    questionId: "ACL-6202-q1",
    draft: assessment,
  })
  state = command(state, "p-dr", {
    kind: "requestFormApproval",
    auditId,
    checklistId: "ACL-6202",
    phase: "Completion",
  })
  expect(() =>
    command(state, "p-dr", {
      kind: "issueAuditReport",
      auditId,
      reportId: report.id,
    }),
  ).toThrow(/approval route/)
  const cycle = state.auditChecklists
    .find((c) => c.id === "ACL-6202")!
    .approvals!.at(-1)!
  state = command(state, "p-kd", {
    kind: "decideFormApproval",
    auditId,
    checklistId: "ACL-6202",
    cycleId: cycle.id,
    decision: "Approved",
    comment: "The evidence is sufficient.",
  })
  state = command(state, "p-dr", {
    kind: "issueAuditReport",
    auditId,
    reportId: report.id,
  })
  const frozen = structuredClone(state.auditReports.at(-1)!)
  const kim = state.people.find((p) => p.id === "p-kd")!,
    role = state.roles.find((r) => r.id === kim.roleId)!
  state.auditChecklists.find((c) => c.id === "ACL-6201")!.members = []
  const projection = scopeAuditRecords(state, state, kim, role)
  expect(projection.auditReports[0].restricted).toBe(true)
  expect(projection.auditReports[0].snapshot).toBeUndefined()
  expect(projection.auditReports[0].contributions).toEqual([])
  expect(() =>
    command(state, "p-kd", {
      kind: "amendAuditReport",
      auditId,
      reportId: report.id,
      reason: "Unauthorized",
    }),
  ).toThrow(/Only the lead/)
  state = command(state, "p-dr", {
    kind: "amendAuditReport",
    auditId,
    reportId: report.id,
    reason: "Correct the sampling note.",
  })
  state = command(state, "p-dr", {
    kind: "reopenAuditForm",
    auditId,
    checklistId: "ACL-6201",
    phase: "Completion",
    reason: "Recheck sample.",
  })
  state = command(state, "p-dr", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6201",
    questionId: "ACL-6201-q1",
    draft: { ...assessment, sampling: "Four records" },
  })
  expect(state.auditReports.find((r) => r.id === frozen.id)).toEqual(frozen)
  const secret = state.documents.find(
    (d) => d.classification === "Highly confidential",
  )!
  const issued = state.auditReports.find((r) => r.id === frozen.id)!
  issued.snapshot!.assessments[0].evidence = [
    {
      kind: "document",
      id: secret.id,
      title: secret.title,
      addedBy: "Test",
      addedAt: "2026-10-16",
    },
  ]
  const maria = state.people.find((p) => p.id === "p-ms")!,
    mariaRole = state.roles.find((r) => r.id === maria.roleId)!
  const scoped = scopeAuditRecords(state, state, maria, mariaRole)
  if (!secret.viewers.includes(maria.name) && secret.owner !== maria.name)
    expect(
      scoped.auditReports.find((r) => r.id === frozen.id)!.snapshot!
        .assessments[0].evidence[0].title,
    ).toBe("Not available")
})
