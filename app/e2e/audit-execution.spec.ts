import { test, expect } from "@playwright/test"
import { applyExecutionCommand } from "../src/lib/audit-execution"
import { PEOPLE, ROLES } from "../src/data/org"
import fs from "node:fs/promises"
import path from "node:path"
test.setTimeout(90_000)

test("3c: direct independent result, evidence verification and one corrective action from the checklist", async ({ page, browser }, testInfo) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-dr"))
  await page.goto("/audits/IA-2026-10/checklist")
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await page.locator('textarea[id^="q-text-"]').last().fill("Are competence reviews recorded?")
  await page.getByRole("button", { name: "Mark checklist ready" }).click()
  await page.goto("/audits/IA-2026-10/conduct")
  await page.locator("#aa-result").selectOption("Minor NC")
  await page.locator("#aa-evidence").fill("No review records for the sampled training cycle.")
  await page.locator("#aa-sampling").fill("Three training records")
  await page.getByRole("textbox", { name: "Evidence URL", exact: true }).fill("https://example.com/training-sample")
  await page.getByRole("textbox", { name: "Evidence title", exact: true }).fill("Training sample")
  await page.getByRole("button", { name: "Add evidence link" }).click()
  await page.getByRole("button", { name: "Record result", exact: true }).click()
  await page.getByRole("combobox", { name: "Verification of Training sample", exact: true }).selectOption("Verified")
  await page
    .getByRole("textbox", { name: "Verification note for Training sample", exact: true })
    .fill("Compared all three sampled records.")
  await page.getByRole("button", { name: "Save verification", exact: true }).click()
  await expect(page.getByRole("button", { name: "Raise finding", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Raise corrective action", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Add nonconformity", exact: true }).click()
  await expect(page.locator('a[aria-label^="Open NC-"]').first()).toBeVisible()
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state),
    result = state.auditorAssessments.filter((a: any) => a.auditId === "IA-2026-10").at(-1),
    actor = PEOPLE.find((p) => p.id === "p-dr")!,
    role = ROLES.find((r) => r.id === actor.roleId)!
  expect(result.ncId).toMatch(/^NC-/)
  const nc = state.ncs.find((n: any) => n.id === result.ncId)
  expect(nc.severity).toBe("Minor")
  expect(nc.source).toBe(`Audit IA-2026-10, question ${result.questionId}`)
  const again = applyExecutionCommand(state, actor, role, {
    kind: "raiseResultNc",
    auditId: result.auditId,
    checklistId: result.checklistId,
    questionId: result.questionId,
    id: "NC-2026-999",
    title: "Duplicate",
    details: "Duplicate",
    owner: nc.owner,
    containment: "",
    dueDate: "",
  })
  expect(again.ncs.length).toBe(state.ncs.length)
  expect(() =>
    applyExecutionCommand(
      { ...state, auditorAssessments: state.auditorAssessments.map((a: any) => (a.id === result.id ? { ...a, ncId: undefined } : a)) },
      actor,
      { ...role, access: { ...role.access, "Corrective Action": "View" } },
      {
        kind: "raiseResultNc",
        auditId: result.auditId,
        checklistId: result.checklistId,
        questionId: result.questionId,
        id: "NC-2026-998",
        title: "Not allowed",
        details: "Not allowed",
        owner: nc.owner,
        containment: "",
        dueDate: "",
      },
    ),
  ).toThrow(/Add and edit access/)
  expect(state.auditeeResponses).toHaveLength(0)
  expect(state.auditorAssessments.filter((a: any) => a.auditId === result.auditId)).toHaveLength(1)
  await page.screenshot({ path: "../../deliverables/audit-3c-conduct.png", fullPage: true })
  const output = process.env.UI_SCREENSHOT_DIR ? path.resolve(process.env.UI_SCREENSHOT_DIR) : testInfo.outputPath("screenshots")
  await fs.mkdir(output, { recursive: true })
  for (const who of ["p-ms", "p-ja"]) for (const theme of ["Light", "Dark"]) for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 650 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 1920, height: 1080 }]) {
    const preview = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 1280 ? 1.5 : 1 })
    await preview.addInitScript(({ state, who, theme }) => {
      localStorage.setItem("thryvems.preview.v1", JSON.stringify({ version: 1, state }))
      localStorage.setItem("iqms.viewAs", who); localStorage.setItem("iqms.appearance", theme)
    }, { state, who, theme })
    const view = await preview.newPage()
    await view.goto(`http://localhost:5173/audits/IA-2026-10/conduct?question=${result.questionId}`)
    if (who === "p-ms") {
      await expect(view.getByText("Are competence reviews recorded?").first()).toBeVisible()
      await expect(view.locator(`a[aria-label^="Open ${result.ncId}"]`).first()).toBeVisible()
    } else await expect(view.getByText("This page or record doesn’t exist", { exact: true })).toBeVisible()
    await view.evaluate(() => document.fonts.ready)
    expect(await view.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
    if (viewport.width !== 1920) await view.screenshot({ path: path.join(output, `after-result-nc-${who}-${theme.toLowerCase()}-${viewport.width}.jpg`), fullPage: true, type: "jpeg", quality: 78 })
    await preview.close()
  }
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-ja"))
  await page.reload()
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
})
test("3c: Kim cannot assess her own process", async ({ page }) => {
  await page.goto("/")
  await page.goto("/audits/IA-2026-08/checklist")
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await page.getByRole("button", { name: /Question \d+ settings/ }).last().click()
  await page.locator("#q-by").selectOption("Maria Santos")
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-ms"))
  await page.reload()
  await page.getByRole("button", { name: "Mark checklist ready" }).click()
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    raw.state.audits.find((a: any) => a.id === "IA-2026-08").auditors = ["Kim Dela Cruz"]
    raw.state.auditChecklists
      .find((c: any) => c.auditId === "IA-2026-08")
      .sections.flatMap((s: any) => s.items)
      .find((q: any) => q.type !== "Instruction").askedBy = "Kim Dela Cruz"
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(raw))
    localStorage.setItem("iqms.viewAs", "p-kd")
  })
  await page.goto("/audits/IA-2026-08/conduct")
  await page.reload()
  await expect(page.getByText(/Not independent:/).first()).toBeVisible()
  await expect(page.locator("#aa-result")).toBeDisabled()
})
