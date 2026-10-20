import { openPageLink } from "./helpers/page-links"
import { test, expect, type Page } from "@playwright/test"
import type { State } from "../src/lib/store"
import type { AuditCommand } from "../src/lib/audit-workflow"
import type { AuditFormSettings } from "../src/lib/audit-form-commands"
import type { AuditFormRoute, AuditChecklist } from "../src/data/audit-types"
import { applyAuditCommand, latestChecklist, scopeAuditRecords } from "../src/lib/audit-workflow"
import { auditForms, formKey, formRights, latestFormApproval, formCompletionProblems, NO_FORM_ROUTE } from "../src/lib/audit-form-policy"
import { mayReadReference } from "../src/lib/audit-evidence"

import { auditId, auditFixture, command, addForm, releaseForm, formSettings, installState, viewAs } from "./helpers/audit-forms"

test("one audit keeps multiple checklists, questionnaire assignments and revision histories independent", async ({ page }) => {
  let state = await auditFixture(page)
  for (const [id, kind] of [["ACL-1001", "Checklist"], ["ACL-1002", "Checklist"], ["ACL-1003", "Questionnaire"], ["ACL-1004", "Questionnaire"]] as const) state = releaseForm(addForm(state, id, kind), id)
  expect(auditForms(state, auditId)).toHaveLength(4)
  for (const [id, assignment] of [["ACL-1003", "AQA-1001"], ["ACL-1004", "AQA-1002"]]) {
    state = command(state, "p-dr", { kind: "assignQuestionnaire", auditId, id: assignment, checklistId: id, respondent: "Joy Aquino", questionIds: [`${id}-q1`], dueDate: "2027-01-10" })
    state = command(state, "p-ja", { kind: "saveResponses", auditId, assignmentId: assignment, submit: true, responses: [{ questionId: `${id}-q1`, value: `Saved response for ${id}`, explanation: "", naReason: "", evidence: [] }] })
  }
  expect(state.auditeeResponses.filter(r => r.auditId === auditId)).toHaveLength(2)
  const respondent = state.people.find(p => p.id === "p-ja")!, respondentRole = state.roles.find(r => r.id === respondent.roleId)!
  const respondentScope = scopeAuditRecords(state, state, respondent, respondentRole)
  expect(respondentScope.auditChecklists.every(c => !c.ownerId && !c.preparationRoute && !c.approvals?.length)).toBe(true)
  const priorResponses = structuredClone(state.auditeeResponses)
  state = command(state, "p-dr", { kind: "reviseChecklist", auditId, checklistId: "ACL-1001", id: "ACL-1005", reason: "Update this checklist only." })
  expect(latestChecklist(state, auditId, false, "ACL-1001")?.id).toBe("ACL-1005")
  expect(latestChecklist(state, auditId, true, "ACL-1001")?.id).toBe("ACL-1001")
  expect(latestChecklist(state, auditId, false, "ACL-1002")?.version).toBe(1)
  expect(state.auditeeResponses).toEqual(priorResponses)
  await installState(page, state)
  await expect(page.getByRole("region", { name: "Saved audit forms", exact: true }).getByRole("row")).toHaveCount(6)
  await page.goto(`/audits/${auditId}/questionnaires`)
  await page.locator("#assignment-form").selectOption("ACL-1004")
  await expect(page.locator("#assignment-form")).toHaveValue("ACL-1004")
  await viewAs(page, "p-ja", `/audits/${auditId}`)
  await expect(page.getByRole("link", { name: /Open questionnaire/ })).toHaveCount(2)
})

for (const mode of ["All", "Any", "Sequential"] as const) test(`preparation approvals enforce ${mode}, ordering, exact content and immutable versions`, async ({ page }) => {
  let state = await auditFixture(page)
  const settings = formSettings("Reviewed checklist")
  settings.preparationRoute = { mode, approverIds: ["p-kd", "p-ms"] }
  state = addForm(state, "ACL-1101", "Checklist", settings)
  expect(() => releaseForm(state, "ACL-1101")).toThrow(/approval route/)
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-1101", phase: "Preparation" })
  const form = state.auditChecklists.find(c => c.id === "ACL-1101")!, cycle = latestFormApproval(form, "Preparation")!
  expect(() => command(state, "p-dr", { kind: "saveChecklist", auditId, id: form.id, sections: form.sections, usesQuestionnaire: false })).toThrow(/locked/)
  expect(() => command(state, "p-dr", { kind: "decideFormApproval", auditId, checklistId: form.id, cycleId: cycle.id, decision: "Approved", comment: "" })).toThrow(/not assigned/)
  if (mode === "Sequential") expect(() => command(state, "p-ms", { kind: "decideFormApproval", auditId, checklistId: form.id, cycleId: cycle.id, decision: "Approved", comment: "" })).toThrow(/not assigned/)
  state = command(state, "p-kd", { kind: "decideFormApproval", auditId, checklistId: form.id, cycleId: cycle.id, decision: "Approved", comment: "Questions reviewed." })
  if (mode !== "Any") {
    expect(latestFormApproval(state.auditChecklists.find(c => c.id === form.id)!, "Preparation")?.status).toBe("Pending")
    state = command(state, "p-ms", { kind: "decideFormApproval", auditId, checklistId: form.id, cycleId: cycle.id, decision: "Approved", comment: "Coverage reviewed." })
  }
  const approved = state.auditChecklists.find(c => c.id === form.id)!
  const changed = structuredClone(approved.sections); changed[0].items[0].text = "Unreviewed replacement"
  expect(() => command(state, "p-dr", { kind: "releaseChecklist", auditId, id: form.id, sections: changed, usesQuestionnaire: false })).toThrow(/exact approved content/)
  state = releaseForm(state, form.id)
  const frozen = structuredClone(state.auditChecklists.find(c => c.id === form.id)!)
  state = command(state, "p-dr", { kind: "reviseChecklist", auditId, checklistId: form.id, id: "ACL-1102", reason: "A new controlled version." })
  expect(state.auditChecklists.find(c => c.id === form.id)).toEqual(frozen)
  expect(state.auditChecklists.find(c => c.id === "ACL-1102")?.approvals).toEqual([])
})

test("return, cancellation, resubmission and completion approvals preserve decisions and assessment history", async ({ page }) => {
  let state = await auditFixture(page), settings = formSettings("Controlled completion")
  settings.preparationRoute = { mode: "All", approverIds: ["p-kd"] }
  settings.completionRoute = { mode: "All", approverIds: ["p-kd"] }
  state = addForm(state, "ACL-1201", "Checklist", settings)
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-1201", phase: "Preparation" })
  let cycle = latestFormApproval(state.auditChecklists.find(c => c.id === "ACL-1201")!, "Preparation")!
  expect(() => command(state, "p-kd", { kind: "decideFormApproval", auditId, checklistId: "ACL-1201", cycleId: cycle.id, decision: "Changes requested", comment: "" })).toThrow(/reason/)
  state = command(state, "p-kd", { kind: "decideFormApproval", auditId, checklistId: "ACL-1201", cycleId: cycle.id, decision: "Changes requested", comment: "Clarify the question." })
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-1201", phase: "Preparation" })
  state = command(state, "p-dr", { kind: "reopenAuditForm", auditId, checklistId: "ACL-1201", phase: "Preparation", reason: "Reviewer unavailable; withdraw this request." })
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-1201", phase: "Preparation" })
  cycle = latestFormApproval(state.auditChecklists.find(c => c.id === "ACL-1201")!, "Preparation")!
  state = command(state, "p-kd", { kind: "decideFormApproval", auditId, checklistId: "ACL-1201", cycleId: cycle.id, decision: "Approved", comment: "" })
  state = releaseForm(state, "ACL-1201")
  expect(formCompletionProblems(state, state.auditChecklists.find(c => c.id === "ACL-1201")!)).not.toEqual([])
  const draft = { result: "Conforms" as const, objectiveEvidence: "Sampled three synthetic records.", sampling: "Three records", interviewee: "", notes: "", evidence: [], status: "Completed" as const }
  state = command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: "ACL-1201", questionId: "ACL-1201-q1", draft })
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-1201", phase: "Completion" })
  expect(() => command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: "ACL-1201", questionId: "ACL-1201-q1", draft: { ...draft, objectiveEvidence: "Changed" } })).toThrow(/awaiting approval/)
  cycle = latestFormApproval(state.auditChecklists.find(c => c.id === "ACL-1201")!, "Completion")!
  state = command(state, "p-kd", { kind: "decideFormApproval", auditId, checklistId: "ACL-1201", cycleId: cycle.id, decision: "Approved", comment: "Evidence and responses reviewed." })
  const original = structuredClone(state.auditorAssessments)
  expect(state.auditChecklists.find(c => c.id === "ACL-1201")?.completedAt).toBeTruthy()
  state = command(state, "p-dr", { kind: "reopenAuditForm", auditId, checklistId: "ACL-1201", phase: "Completion", reason: "Correct the sampling note." })
  state = command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: "ACL-1201", questionId: "ACL-1201-q1", draft: { ...draft, sampling: "Four records" } })
  expect(state.auditorAssessments.slice(0, original.length)).toEqual(original)
  expect(state.auditorAssessments.at(-1)?.supersedes).toBe(original.at(-1)?.id)
})

test("questionnaire completion waits for submissions and locks subsequent response changes", async ({ page }) => {
  let state = releaseForm(addForm(await auditFixture(page), "ACL-1301", "Questionnaire"), "ACL-1301")
  expect(() => command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: "ACL-1301" })).toThrow(/Assign every required/)
  state = command(state, "p-dr", { kind: "assignQuestionnaire", auditId, id: "AQA-1301", checklistId: "ACL-1301", respondent: "Joy Aquino", questionIds: ["ACL-1301-q1"], dueDate: "2027-01-10" })
  expect(() => command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: "ACL-1301" })).toThrow(/submitted/)
  const response = { questionId: "ACL-1301-q1", value: "The recorded answer.", explanation: "", naReason: "", evidence: [] }
  state = command(state, "p-ja", { kind: "saveResponses", auditId, assignmentId: "AQA-1301", responses: [response], submit: true })
  state = command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: "ACL-1301" })
  expect(() => command(state, "p-ja", { kind: "saveResponses", auditId, assignmentId: "AQA-1301", responses: [{ ...response, value: "Replacement" }], submit: false })).toThrow(/completed/)
  expect(state.auditeeResponses.find(r => r.assignmentId === "AQA-1301")?.submissions?.[0].value).toBe(response.value)
})

test("selected collaborators, current grants, classification and expired access apply to every form and history", async ({ page }) => {
  let state = addForm(await auditFixture(page), "ACL-1401")
  const privateSettings = { ...formSettings("Private form"), members: [] }
  state = addForm(state, "ACL-1402", "Checklist", privateSettings)
  const kim = state.people.find(p => p.id === "p-kd")!, ben = state.people.find(p => p.id === "p-bc")!, kimRole = state.roles.find(r => r.id === kim.roleId)!, benRole = state.roles.find(r => r.id === ben.roleId)!
  expect(formRights(state, state.auditChecklists.find(c => c.id === "ACL-1401")!, ben, benRole).edit).toBe(false)
  const scoped = scopeAuditRecords(state, state, kim, kimRole)
  expect(scoped.auditChecklists.some(c => c.id === "ACL-1402")).toBe(false)
  expect(() => command(state, "p-kd", { kind: "saveChecklist", auditId, id: "ACL-1402", sections: [], usesQuestionnaire: false })).toThrow(/edit access/)
  state = releaseForm(state, "ACL-1401")
  state = command(state, "p-dr", { kind: "reviseChecklist", auditId, checklistId: "ACL-1401", id: "ACL-1403", reason: "Restrict current collaboration." })
  state = command(state, "p-dr", { kind: "configureAuditForm", auditId, checklistId: "ACL-1403", settings: { ...formSettings("Restricted revision"), members: [] } })
  expect(scopeAuditRecords(state, state, kim, kimRole).auditChecklists.some(c => c.id === "ACL-1401")).toBe(false)
  const secret = state.documents.find(d => d.classification === "Highly confidential")!
  expect(mayReadReference(state, kim, kimRole, { kind: "document", id: secret.id, title: secret.title, addedAt: "", addedBy: "" }, state.audits.find(a => a.id === auditId)!.process)).toBe(false)
  const expired = { ...kim, accessEndsOn: "2020-01-01" }
  expect(formRights(state, state.auditChecklists.find(c => c.id === "ACL-1403")!, expired, kimRole).view).toBe(false)
  await installState(page, state, "p-kd", `/audits/${auditId}/checklist?version=ACL-1401`)
  await expect(page.getByText("This page or record doesn’t exist", { exact: false })).toBeVisible()
})

test("cross-process copies reset answers, approvals, evidence and assignments and require destination authority", async ({ page }) => {
  let state = releaseForm(addForm(await auditFixture(page), "ACL-1501"), "ACL-1501")
  state = addForm(state, "ACL-1502", "Questionnaire")
  const source = structuredClone(state.auditChecklists.filter(c => c.auditId === auditId))
  const copy = { kind: "copyAuditPlan" as const, auditId, id: "IA-2027-20", process: "Purchasing & suppliers", leadId: "p-dr", auditorIds: ["p-kd"], date: "2027-02-20", formIds: ["ACL-1501", "ACL-1502"] }
  expect(() => command(state, "p-dr", copy)).toThrow(/permission to plan/)
  state = command(state, "p-ms", copy)
  const copied = auditForms(state, copy.id)
  expect(copied).toHaveLength(2)
  for (const c of copied) {
    expect(c.status).toBe("Draft"); expect(c.version).toBe(1); expect(c.approvals).toBeUndefined(); expect(c.completedAt).toBeUndefined(); expect(c.members).toEqual([]); expect(c.preparationRoute?.mode).toBe("None"); expect(c.sections.flatMap(s => s.items.flatMap(q => q.evidence))).toEqual([])
    expect(c.copiedFrom?.auditId).toBe(auditId)
  }
  expect(state.questionnaireAssignments.filter(a => a.auditId === copy.id)).toEqual([])
  expect(state.auditeeResponses.filter(a => a.auditId === copy.id)).toEqual([])
  expect(state.auditorAssessments.filter(a => a.auditId === copy.id)).toEqual([])
  expect(state.auditChecklists.filter(c => c.auditId === auditId)).toEqual(source)
  expect(() => command(state, "p-ms", { ...copy, id: "IA-2027-21", leadId: "p-rt", process: "People & competence" })).toThrow(/qualified|independent|lead/)
})

test("a user prepares, shares, approves, answers and copies independent forms through the UI", async ({ page }) => {
  test.setTimeout(180_000)
  await installState(page, await auditFixture(page))
  await page.getByRole("button", { name: "Add checklist", exact: true }).click()
  await page.locator("#af-title").fill("Competence record sampling")
  await page.locator("#member-p-kd").selectOption("Edit")
  for (const label of ["Before use", "After completion"]) {
    const route = page.getByRole("group", { name: label, exact: true })
    await route.getByRole("combobox").selectOption("All")
    await route.getByRole("checkbox", { name: "Kim Dela Cruz", exact: true }).check()
  }
  await page.getByRole("button", { name: "Add form", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Competence record sampling", exact: true })).toBeVisible()
  const first: AuditChecklist = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state.auditChecklists.find((c: any) => c.title === "Competence record sampling"))
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await page.locator('textarea[id^="q-text-"]').first().fill("Are competence records available?")
  await page.getByRole("button", { name: "Submit for preparation approval", exact: true }).click()
  await expect(page.locator('textarea[id^="q-text-"]').first()).toHaveAttribute("readonly", "")
  await viewAs(page, "p-kd", `/audits/${auditId}/checklist?version=${first.id}`)
  await page.getByRole("button", { name: "Approve preparation", exact: true }).click()
  await viewAs(page, "p-dr", `/audits/${auditId}/checklist?version=${first.id}`)
  await page.getByRole("button", { name: "Mark checklist ready", exact: true }).click()
  await page.goto(`/audits/${auditId}/conduct?form=${formKey(first)}`)
  await page.locator("#aa-result").selectOption("Conforms")
  await page.locator("#aa-evidence").fill("Three synthetic records were sampled.")
  await page.getByRole("button", { name: "Record result", exact: true }).click()
  await page.getByRole("button", { name: "Submit completed form for approval", exact: true }).click()
  await viewAs(page, "p-kd", `/audits/${auditId}/conduct?form=${formKey(first)}`)
  await page.getByRole("button", { name: "Approve completion", exact: true }).click()
  await expect(page.getByText(/Completed on/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Record result", exact: true })).toBeDisabled()
  await viewAs(page, "p-dr", `/audits/${auditId}`)
  await page.getByRole("button", { name: "Add questionnaire", exact: true }).click()
  await page.locator("#af-title").fill("Competence interview")
  await page.getByRole("button", { name: "Create questionnaire", exact: true }).click()
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await page.locator('textarea[id^="q-text-"]').first().fill("How do you review competence?")
  await page.getByRole("button", { name: "Mark questionnaire ready", exact: true }).click()
  await page.goto(`/audits/${auditId}/questionnaires`)
  await page.locator("#qa-person").selectOption({ label: "Joy Aquino" })
  await page.getByRole("button", { name: "Assign questionnaire", exact: true }).click()
  const assignment = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state.questionnaireAssignments.find((a: any) => a.auditId === "IA-2026-10"))
  await viewAs(page, "p-ja", `/audits/${auditId}/questionnaires/${assignment.id}`)
  await page.locator("#aq-answer").fill("We review synthetic competence records each quarter.")
  await page.getByRole("button", { name: "Submit questionnaire", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Confirm submission", exact: true }).click()
  await expect(page.getByText("Submitted answers are read-only until an auditor requests clarification.", { exact: false })).toBeVisible()
  await viewAs(page, "p-ms", `/audits/${auditId}`)
  await page.getByRole("button", { name: "Copy to another process", exact: true }).click()
  await page.locator("#copy-process").selectOption("Purchasing & suppliers")
  await page.locator("#copy-lead").selectOption("p-dr")
  await page.getByRole("button", { name: "Copy audit plan", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Purchasing & suppliers audit", exact: true })).toBeVisible()
  const copied = await page.evaluate(() => { const s = JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state; const a = s.audits.find((a: any) => a.copiedFrom?.auditId === "IA-2026-10"); return { audit: a, forms: s.auditChecklists.filter((c: any) => c.auditId === a.id), responses: s.auditeeResponses.filter((r: any) => r.auditId === a.id) } })
  expect(copied.forms).toHaveLength(2); expect(copied.responses).toEqual([])
})

test("completion requires verified evidence and skips nested questions whose conditions are hidden", async ({ page }) => {
  let state = addForm(await auditFixture(page), "ACL-1601")
  const form = state.auditChecklists.find(c => c.id === "ACL-1601")!, sections = structuredClone(form.sections), question = sections[0].items[0]
  question.evidenceRule = "Required"
  sections[0].items.push({ ...question, id: "parent", text: "Does the special case apply?", type: "Yes / No / N/A", evidenceRule: "Optional", showWhen: undefined }, { ...question, id: "hidden", text: "Hidden follow-up", evidenceRule: "Optional", showWhen: { questionId: "parent", equals: "Yes" } }, { ...question, id: "nested", text: "Nested follow-up", evidenceRule: "Optional", showWhen: { questionId: "hidden", equals: "Yes" } })
  state = command(state, "p-dr", { kind: "saveChecklist", auditId, id: form.id, sections, usesQuestionnaire: false })
  state = releaseForm(state, form.id)
  const draft = { result: "Conforms" as const, objectiveEvidence: "Reviewed the synthetic sample.", sampling: "One record", interviewee: "", notes: "", evidence: [], status: "Completed" as const }
  state = command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: form.id, questionId: question.id, draft })
  state = command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: form.id, questionId: "parent", draft: { ...draft, answer: "No" } })
  expect(() => command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: form.id })).toThrow(/Link the required evidence/)
  const ref = { kind: "link" as const, url: "https://example.com/synthetic-record", title: "Synthetic sample", addedAt: "", addedBy: "" }
  state = command(state, "p-dr", { kind: "saveAssessment", auditId, checklistId: form.id, questionId: question.id, draft: { ...draft, evidence: [ref] } })
  expect(() => command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: form.id })).toThrow(/Verify the required evidence/)
  state = command(state, "p-dr", { kind: "verifyAuditEvidence", auditId, checklistId: form.id, questionId: question.id, reference: ref, status: "Insufficient", notes: "Sample does not cover the period." })
  expect(() => command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: form.id })).toThrow(/pending or insufficient/)
  state = command(state, "p-dr", { kind: "verifyAuditEvidence", auditId, checklistId: form.id, questionId: question.id, reference: ref, status: "Verified", notes: "Period confirmed." })
  state = command(state, "p-dr", { kind: "completeAuditForm", auditId, checklistId: form.id })
  expect(state.auditChecklists.find(c => c.id === form.id)?.completedAt).toBeTruthy()
  expect(state.auditorAssessments.some(a => ["hidden", "nested"].includes(a.questionId))).toBe(false)
})

test("an independent lead can review another owner's form; stale decisions and withdrawn forms stay read-only", async ({ page }) => {
  let state = await auditFixture(page)
  const settings = { ...formSettings("Kim's independent checklist"), ownerId: "p-kd", preparationRoute: { mode: "All" as const, approverIds: ["p-dr"] } }
  state = command(state, "p-kd", { kind: "createAuditForm", auditId, id: "ACL-1701", settings })
  const sections = [{ id: "s1", title: "Checks", clause: state.audits.find(a => a.id === auditId)!.clauses[0], items: [{ id: "q1", text: "Were synthetic records sampled?", type: "Audit assessment" as const, askedBy: "Kim Dela Cruz", respondBy: "Auditor" as const, required: true, evidenceRule: "Optional" as const, evidence: [], guidance: "" }] }]
  state = command(state, "p-kd", { kind: "saveChecklist", auditId, id: "ACL-1701", sections, usesQuestionnaire: false })
  state = command(state, "p-kd", { kind: "requestFormApproval", auditId, checklistId: "ACL-1701", phase: "Preparation" })
  const cycle = latestFormApproval(state.auditChecklists.find(c => c.id === "ACL-1701")!, "Preparation")!
  const lead = state.people.find(p => p.id === "p-dr")!, role = state.roles.find(r => r.id === lead.roleId)!
  expect(scopeAuditRecords(state, state, lead, role).auditChecklists.find(c => c.id === "ACL-1701")?.approvals?.[0].snapshot).toBe("")
  await installState(page, state, "p-dr", `/audits/${auditId}/checklist?version=ACL-1701`)
  await page.locator("#approval-comment-Preparation").fill("Retain this review comment.")
  const overview = await openPageLink(page, page.getByRole("link", { name: "Back to audit", exact: true }))
  await overview.close()
  await page.goto(`/audits/${auditId}/checklist?version=ACL-1701`)
  await expect(page.locator("#approval-comment-Preparation")).toHaveValue("Retain this review comment.")
  await page.getByRole("button", { name: "Approve preparation", exact: true }).click()
  expect(await page.evaluate(() => sessionStorage.getItem("thryvems.form-review:p-dr:ACL-1701"))).toBeNull()
  state = command(state, "p-dr", { kind: "decideFormApproval", auditId, checklistId: "ACL-1701", cycleId: cycle.id, decision: "Approved", comment: "Independent lead review." })
  expect(() => command(state, "p-dr", { kind: "decideFormApproval", auditId, checklistId: "ACL-1701", cycleId: cycle.id, decision: "Approved", comment: "Duplicate" })).toThrow(/no longer active/)
  state = releaseForm(state, "ACL-1701")
  const approvals = structuredClone(state.auditChecklists.find(c => c.id === "ACL-1701")!.approvals)
  state = command(state, "p-kd", { kind: "withdrawAuditForm", auditId, checklistId: "ACL-1701", reason: "No longer applicable to this audit." })
  expect(auditForms(state, auditId)).toEqual([])
  expect(state.auditChecklists.find(c => c.id === "ACL-1701")?.approvals).toEqual(approvals)
  for (const kind of ["saveChecklist", "releaseChecklist"] as const) expect(() => command(state, "p-dr", { kind, auditId, id: "ACL-1701", sections, usesQuestionnaire: false })).toThrow(/withdrawn and read-only/)
  const foreign = { ...state.auditChecklists.find(c => c.id === "ACL-1701")!, id: "ACL-foreign", auditId: "IA-2026-05", withdrawnAt: undefined }
  state = { ...state, auditChecklists: [...state.auditChecklists, foreign] }
  expect(() => command(state, "p-dr", { kind: "saveChecklist", auditId, id: foreign.id, sections, usesQuestionnaire: false })).toThrow(/number is already used/)
  expect(() => command(state, "p-dr", { kind: "reviseChecklist", auditId, checklistId: "ACL-1701", id: "ACL-1702", reason: "Bypass withdrawal" })).toThrow()
})
