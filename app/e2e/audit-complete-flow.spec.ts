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
import { scopeAuditRecords } from "../src/lib/audit-workflow"
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

async function findingsFixture(page: Page) {
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
      draft: { ...assessment, result: "Minor NC" },
    })
    state = command(state, actor, {
      kind: "raiseAuditFinding",
      auditId,
      assessmentId: state.auditorAssessments.at(-1)!.id,
      title: `Training review gap from ${actor}`,
      facts: "Two synthetic records lack a review.",
      requirement: "Keep competence review records.",
      clause: state.audits.find((a) => a.id === auditId)!.clauses[0],
      owner: "Rosa Tan",
      classification: "Minor NC",
    })
  }
  return state
}

test("auditee disagreement, corrective actions, two auditors, explicit duplicate consolidation and immutable report snapshots", async ({
  page,
}) => {
  let state = await findingsFixture(page)
  const second = state.auditFindings.find((f) => f.auditor === "Kim Dela Cruz")!
  const notice = state.notifications.find(
    (n) => n.eventKey === `finding:${second.id}` && n.to === "Daniel Reyes",
  )!
  expect(notice.href).toBe(`/audits/findings/${second.id}`)
  await installState(page, state, "p-dr", notice.href)
  await expect(
    page.getByRole("heading", { name: second.title, exact: true }),
  ).toBeVisible()
  for (const f of state.auditFindings.filter((f) => f.auditId === auditId)) {
    expect(() =>
      command(state, "p-dr", {
        kind: "completeAuditForm",
        auditId,
        checklistId: f.checklistId,
      }),
    ).toThrow(/finding/)
    state = command(state, "p-dr", {
      kind: "requestFindingReview",
      auditId,
      findingId: f.id,
    })
  }
  const first = state.auditFindings[0]
  await installState(page, state, "p-rt", `/audits/findings/${first.id}`)
  await page
    .locator("#finding-review-comment")
    .fill("One record was available; please retain the sampling limitation.")
  await page
    .getByRole("button", { name: "Dispute finding", exact: true })
    .click()
  state = await data(page)
  expect(() =>
    command(state, "p-dr", {
      kind: "finalizeAuditFinding",
      auditId,
      findingId: first.id,
      reason: "",
    }),
  ).toThrow(/resolution/)
  for (const [i, f] of state.auditFindings.entries()) {
    state = command(state, "p-dr", {
      kind: "createFindingNc",
      auditId,
      findingId: f.id,
      id: `NC-2026-61${i}`,
      title: f.title,
      details: f.facts,
      owner: "Rosa Tan",
      containment: "Check the remaining records.",
      dueDate: "2027-01-10",
    })
    if (i)
      state = command(state, "p-rt", {
        kind: "respondToFinding",
        auditId,
        findingId: f.id,
        decision: "Agreed",
        comment: "The sampling is accurate.",
      })
    state = command(state, "p-dr", {
      kind: "finalizeAuditFinding",
      auditId,
      findingId: f.id,
      reason:
        "The remaining sample still demonstrates the gap. Disagreement and limitation retained.",
    })
    state = command(state, "p-dr", {
      kind: "completeAuditForm",
      auditId,
      checklistId: f.checklistId,
    })
  }
  state = command(state, "p-dr", { kind: "saveAuditReport", auditId, draft })
  let report = state.auditReports.at(-1)!
  expect(() =>
    command(state, "p-dr", {
      kind: "issueAuditReport",
      auditId,
      reportId: report.id,
    }),
  ).toThrow(/contribution/)
  for (const actor of ["p-dr", "p-kd"])
    state = command(state, actor, {
      kind: "saveAuditContribution",
      auditId,
      summary: `Sample reviewed by ${actor}`,
      conclusion: "A training review gap remains.",
      followUp: "Track corrective actions.",
    })
  const findings = state.auditFindings
  state = command(state, "p-dr", {
    kind: "decideReportFinding",
    auditId,
    findingId: findings[0].id,
    action: "Include",
    reason: "Primary finding.",
  })
  state = command(state, "p-dr", {
    kind: "decideReportFinding",
    auditId,
    findingId: findings[1].id,
    action: "Merge",
    targetId: findings[0].id,
    reason: "Same requirement and sampled gap, reported by both auditors.",
  })
  report = state.auditReports.at(-1)!
  expect(
    reportProblems(
      state,
      state.audits.find((a) => a.id === auditId)!,
      report,
    ),
  ).toEqual([])
  const frozenFindings = structuredClone(state.auditFindings)
  state = command(state, "p-dr", {
    kind: "issueAuditReport",
    auditId,
    reportId: report.id,
  })
  expect(state.auditFindings).toEqual(frozenFindings)
  expect(state.auditReports.at(-1)?.snapshot?.findings).toHaveLength(2)
  expect(state.auditReports.at(-1)?.contributions).toHaveLength(2)
  expect(
    state.auditReports.at(-1)?.snapshot?.findings[0].discussion?.decision,
  ).toBe("Disputed")
  expect(
    command(state, "p-dr", {
      kind: "issueAuditReport",
      auditId,
      reportId: report.id,
    }),
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
  await expect(
    page.getByText(
      "Same requirement and sampled gap, reported by both auditors.",
      { exact: false },
    ),
  ).toBeVisible()
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
