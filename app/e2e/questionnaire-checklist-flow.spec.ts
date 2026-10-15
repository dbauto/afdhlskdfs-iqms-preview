import { test, expect, type Page } from "@playwright/test"
import type { State } from "../src/lib/store"
import { applyAuditCommand, scopeAuditRecords } from "../src/lib/audit-workflow"
import { applyInvitationCommand, invitedPreview, saveInvitedPreview } from "../src/lib/questionnaire-invitations"
import { applyExecutionCommand } from "../src/lib/audit-execution"
import { PEOPLE, ROLES } from "../src/data/org"

test.setTimeout(90_000)

async function as(page: Page, id: string) {
  await page.evaluate((id) => localStorage.setItem("iqms.viewAs", id), id)
  await page.reload()
}
async function data(page: Page): Promise<State> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
}
async function build(page: Page) {
  await page.goto("/")
  await as(page, "p-dr")
  await page.goto("/audits/IA-2026-10/checklist")
  await page.getByRole("switch", { name: "Use pre-audit questionnaire" }).click()
  const questions = [
    { text: "Describe the competence review process", type: "Text notes", evidence: "Not required" },
    { text: "Choose the review frequency", type: "Multiple choice", choices: "Monthly\nQuarterly", evidence: "Optional" },
    {
      text: "Select the records you keep",
      type: "Multiple select",
      choices: "Training matrix\nInduction log\nReview notes",
      evidence: "Required",
    },
  ]
  for (const q of questions) {
    await page.getByRole("button", { name: "Add question", exact: true }).click()
    await page.locator("#q-text").fill(q.text)
    await page.locator("#q-type").selectOption(q.type)
    if (q.choices) await page.locator("#q-choices").fill(q.choices)
    await page.locator("#q-evidence-rule").selectOption(q.evidence)
  }
  await page.getByRole("button", { name: "Mark checklist ready" }).click()
  await expect(page.getByRole("link", { name: "Conduct audit", exact: true })).toBeVisible()
  await page.getByRole("link", { name: "Questionnaires", exact: true }).click()
}
async function assign(page: Page, name: string) {
  await page.locator("#qa-person").selectOption(name)
  await page.getByRole("button", { name: "Assign questionnaire", exact: true }).click()
}
async function fill(page: Page) {
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("We review competence every quarter.\nRecords are maintained by the process owner.")
  await expect(page.getByRole("textbox", { name: "Evidence URL", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: /2\. Choose the review frequency/ }).click()
  await page.getByRole("radio", { name: "Quarterly", exact: true }).check()
  await page.getByRole("radio", { name: "Monthly", exact: true }).check()
  await expect(page.getByRole("radio", { name: "Quarterly", exact: true })).not.toBeChecked()
  await page.getByRole("button", { name: /3\. Select the records you keep/ }).click()
  await page.getByRole("checkbox", { name: "Training matrix", exact: true }).check()
  await page.getByRole("checkbox", { name: "Induction log", exact: true }).check()
  await page.reload()
  await page.getByRole("button", { name: /3\. Select the records you keep/ }).click()
  await expect(page.getByRole("checkbox", { name: "Training matrix", exact: true })).toBeChecked()
  await expect(page.getByRole("checkbox", { name: "Induction log", exact: true })).toBeChecked()
}

test("form controls, separate respondents, exact submitted evidence and auditor completion", async ({ page, context }) => {
  await build(page)
  await assign(page, "Joy Aquino")
  await assign(page, "Ben Castillo")
  await page.getByRole("link", { name: /AQA-0001/ }).click()
  const joyUrl = page.url()
  await as(page, "p-ja")
  await fill(page)
  await page.getByRole("button", { name: "Submit questionnaire", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission", exact: true }).click()
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText("Link the required supporting evidence")
  await page.getByRole("button", { name: "Keep working", exact: true }).click()
  await page.getByRole("textbox", { name: "Evidence title", exact: true }).fill("Synthetic competence evidence")
  await page.getByRole("textbox", { name: "Evidence URL", exact: true }).fill("https://example.com/competence")
  await page.getByRole("button", { name: "Add evidence link", exact: true }).click()
  await page.getByRole("button", { name: "Submit questionnaire", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission" }).click()
  await expect(page.getByRole("checkbox", { name: "Training matrix", exact: true })).toBeDisabled()
  await as(page, "p-bc")
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
  await page.goto("/audits/IA-2026-10/questionnaires/AQA-0002")
  await expect(page.getByRole("textbox", { name: "Your answer", exact: true })).toHaveValue("")
  await as(page, "p-dr")
  await page.goto("/audits/IA-2026-10/conduct")
  await expect(page.getByText("Joy Aquino · Submitted")).toBeVisible()
  await page.getByRole("checkbox", { name: "Checklist item completed", exact: true }).click()
  await expect(page.getByRole("alert").filter({ hasText: "Choose the auditor assessment result" })).toBeVisible()
  await expect(page.getByRole("checkbox", { name: "Checklist item completed" })).not.toBeChecked()
  await page.locator("#aa-result").selectOption("Conforms")
  await page.locator("#aa-evidence").fill("Compared the submitted explanation against the sampled records.")
  await page.getByRole("button", { name: "Use response as evidence", exact: true }).click()
  await page.getByRole("checkbox", { name: "Checklist item completed" }).check()
  await page.reload()
  await expect(page.getByRole("checkbox", { name: "Checklist item completed" })).toBeChecked()
  await page.getByRole("textbox", { name: "Auditor clarification request", exact: true }).fill("Please explain the review owner.")
  await page.getByRole("button", { name: "Request evidence from Joy Aquino", exact: true }).click()
  await page.goto(joyUrl)
  await as(page, "p-ja")
  await page
    .getByRole("textbox", { name: "Your answer", exact: true })
    .fill("The process owner reviews competence and the quality manager checks completion.")
  await page.getByRole("textbox", { name: "Reply to ACR-0001", exact: true }).fill("The process owner performs the review.")
  await page.getByRole("button", { name: "Send clarification reply", exact: true }).click()
  await page.getByRole("button", { name: "Submit questionnaire", exact: true }).click()
  await page.getByRole("button", { name: "Confirm submission" }).click()
  await as(page, "p-dr")
  await page.goto("/audits/IA-2026-10/conduct")
  const oldLink = page.getByRole("link", { name: /Questionnaire response ARS-00001.*submission 1/ }).first()
  const [responseTab] = await Promise.all([context.waitForEvent("page"), oldLink.click()])
  await responseTab.waitForLoadState()
  await expect(responseTab.getByRole("heading", { name: /Questionnaire response/ })).toBeVisible({ timeout: 15_000 })
  await expect(responseTab.getByText("We review competence every quarter.", { exact: false })).toBeVisible()
  await expect(
    responseTab.getByText("The process owner reviews competence and the quality manager checks completion.", { exact: true }),
  ).toHaveCount(0)
  const state = await data(page),
    completed = state.auditorAssessments.find((a) => a.status === "Completed")!
  expect(completed.evidence.find((r) => r.kind === "response")?.responseRevision).toBe(1)
  expect(state.auditeeResponses.find((r) => r.id === "ARS-00001")?.submissions).toHaveLength(2)
  const outsider = PEOPLE.find((p) => p.id === "p-bc")!,
    role = ROLES.find((r) => r.id === outsider.roleId)!
  expect(() =>
    applyExecutionCommand(state, outsider, role, {
      kind: "saveAssessment",
      auditId: completed.auditId,
      checklistId: completed.checklistId,
      questionId: completed.questionId,
      draft: completed,
    }),
  ).toThrow(/only that auditor/)
})

test("invited respondent isolation, expiry, revocation and interview attribution", async ({ page }) => {
  await build(page)
  await page.locator("#invite-name").fill("Synthetic Respondent")
  await page.locator("#invite-email").fill("respondent@example.test")
  await page.getByRole("button", { name: "Prepare respondent invitation", exact: true }).click()
  await page.getByRole("link", { name: "Open respondent preview", exact: true }).click()
  const previewUrl = page.url()
  await expect(page.getByText("Email identity is unverified.", { exact: false })).toBeVisible()
  await expect(page.getByRole("link", { name: "Overview", exact: true })).toHaveCount(0)
  await fill(page)
  await expect(page.getByRole("button", { name: "Link existing document or evidence", exact: true })).toHaveCount(0)
  await page.getByRole("textbox", { name: "Evidence URL", exact: true }).fill("https://example.com/records")
  await page.getByRole("button", { name: "Add evidence link", exact: true }).click()
  await page.getByRole("button", { name: "Submit questionnaire", exact: true }).click()
  await expect(page.getByText("Submitted answers are read-only until clarification is requested.")).toBeVisible()
  let state = await data(page)
  const actor = PEOPLE.find((p) => p.id === "p-dr")!,
    role = ROLES.find((r) => r.id === actor.roleId)!
  const outsider = PEOPLE.find((p) => p.id === "p-bc")!,
    outsiderRole = ROLES.find((r) => r.id === outsider.roleId)!
  expect(() =>
    applyInvitationCommand(state, outsider, outsiderRole, {
      kind: "revokeRespondentInvitation",
      auditId: "IA-2026-10",
      invitationId: "AQI-0001",
    }),
  ).toThrow(/Only the lead/)
  const invitation = state.questionnaireInvitations[0]
  const collision = structuredClone(state)
  collision.questionnaireAssignments[0].respondent = outsider.name
  collision.auditeeResponses.forEach((r) => (r.respondent = outsider.name))
  expect(scopeAuditRecords(collision, collision, outsider, outsiderRole).auditeeResponses).toHaveLength(0)
  const expired = structuredClone(state)
  expired.questionnaireInvitations[0].expiresOn = "2020-01-01"
  expect(invitedPreview(expired, invitation.id)).toBeUndefined()
  expect(() => saveInvitedPreview(expired, invitation.id, [], true)).toThrow(/unavailable or has expired/)
  await page.goto("/audits/IA-2026-10/questionnaires")
  await page.getByRole("button", { name: "Revoke invitation", exact: true }).click()
  await page.goto(previewUrl)
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
  await page.goto("/audits/IA-2026-10/questionnaires")
  await page.locator("#invite-mode").selectOption("Interview")
  await page.locator("#invite-name").fill("Synthetic Interviewee")
  await page.getByRole("button", { name: "Prepare interview questionnaire", exact: true }).click()
  await page.getByRole("link", { name: "Record interview answers", exact: true }).click()
  await expect(page.getByText(/Interview response recorded on behalf of Synthetic Interviewee by Daniel Reyes/)).toBeVisible()
  await page.getByRole("textbox", { name: "Your answer", exact: true }).fill("The interviewee explained their procedure.")
  state = await data(page)
  expect(state.auditeeResponses.find((r) => r.respondent === "Synthetic Interviewee")?.recordedBy).toBe(actor.name)
  expect(state.auditeeResponses.find((r) => r.respondent === "Synthetic Interviewee")?.identity).toBe(
    "Interview recorded by auditor",
  )
})
