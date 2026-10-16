import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"
import { auditId, auditFixture, addForm, releaseForm, command, formSettings, installState } from "./helpers/audit-forms"
import type { State } from "../src/lib/store"

async function comparisonFixture(state: State) {
  state = addForm(state, "ACL-2001", "Checklist", { ...formSettings("Record checks"), ownerId: "p-ms" })
  state = addForm(state, "ACL-2002", "Checklist", { ...formSettings("Sampling review"), preparationRoute: { mode: "All", approverIds: ["p-kd", "p-ms"] } })
  state = command(state, "p-dr", { kind: "requestFormApproval", auditId, checklistId: "ACL-2002", phase: "Preparation" })
  state = releaseForm(addForm(state, "ACL-2003", "Questionnaire", formSettings("Competence interview", "Questionnaire")), "ACL-2003")
  state = releaseForm(addForm(state, "ACL-2004", "Checklist", { ...formSettings("Training observations"), ownerId: "p-kd" }), "ACL-2004")
  state = command(state, "p-dr", { kind: "assignQuestionnaire", auditId, id: "AQA-2003", checklistId: "ACL-2003", respondent: "Joy Aquino", questionIds: ["ACL-2003-q1"], dueDate: "2027-01-10" })
  return state
}
const views = [
  { width: 1440, height: 900, scale: 1, label: "1440" },
  { width: 853, height: 433, scale: 1.5, label: "1280-zoom150" },
  { width: 768, height: 1024, scale: 1, label: "768" },
  { width: 390, height: 844, scale: 1, label: "390" },
]
test("independent audit forms: role/theme/viewport before-after screenshots and contained controls", async ({ browser, page }, info) => {
  test.setTimeout(240_000)
  const state = await comparisonFixture(await auditFixture(page))
  const before = structuredClone(state)
  // Main supports one form. Keep the common questionnaire/assignment for the baseline.
  before.auditChecklists = before.auditChecklists.filter(c => c.auditId !== auditId || c.id === "ACL-2003")
  before.audits.find(a => a.id === auditId)!.state = "Checklist ready"
  const sources = [{ name: "after", url: "http://localhost:5173", state }, ...(process.env.BASELINE_APP ? [{ name: "before", url: "http://localhost:5174", state: before }] : [])]
  const directory = info.outputPath("screenshots")
  await fs.mkdir(directory, { recursive: true })
  const matrix: object[] = []
  for (const source of sources) for (const who of ["p-ms", "p-ja"]) for (const theme of ["Light", "Dark"]) for (const view of views) {
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.scale })
    const p = await context.newPage(), errors: string[] = []
    p.on("pageerror", e => errors.push(e.message))
    await p.goto(source.url)
    await p.waitForFunction(() => !!localStorage.getItem("thryvems.preview.v1"))
    await p.evaluate(({ state, who, theme }) => {
      const envelope = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
      localStorage.setItem("thryvems.preview.v1", JSON.stringify({ ...envelope, state }))
      localStorage.setItem("iqms.viewAs", who); localStorage.setItem("iqms.appearance", theme)
    }, { state: source.state, who, theme })
    const capture = async (name: string, route: string, action?: () => Promise<void>) => {
      await p.goto(source.url + route)
      await p.locator("main").waitFor()
      await p.evaluate(() => document.fonts.ready)
      expect(await p.locator("html").evaluate(el => el.classList.contains("dark"))).toBe(theme === "Dark")
      expect(await p.locator("body").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Public Sans")
      if (action) await action()
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      for (const dialog of await p.getByRole("dialog").all()) {
        const box = await dialog.boundingBox()
        expect(box).toBeTruthy(); expect(box!.x).toBeGreaterThanOrEqual(-1); expect(box!.x + box!.width).toBeLessThanOrEqual(view.width + 1)
      }
      const file = `${source.name}-${name}-${who}-${theme.toLowerCase()}-${view.label}.jpg`
      await p.screenshot({ path: path.join(directory, file), type: "jpeg", quality: 75, fullPage: false })
      matrix.push({ source: source.name, name, who, theme, view, file, pageOverflow: false })
    }
    const commonBuilder = source.name === "after" ? "ACL-2001" : "ACL-2003"
    await capture("audit", `/audits/${auditId}`)
    await capture("settings", `/audits/${auditId}/checklist?version=${commonBuilder}`, async () => { const button = p.getByRole("button", { name: "Form settings", exact: true }); if (await button.count()) await button.click() })
    await capture("approval", `/audits/${auditId}/checklist?version=${source.name === "after" ? "ACL-2002" : "ACL-2003"}`, async () => {
      const panel = p.getByText("Review and completion", { exact: true })
      if (await panel.count()) await panel.evaluate(el => el.scrollIntoView({ block: "start" }))
    })
    await capture("responses", `/audits/${auditId}/questionnaires/AQA-2003`)
    await capture("conduct", `/audits/${auditId}/conduct?form=${source.name === "after" ? "ACL-2004" : "ACL-2003"}`)
    await capture("copy", `/audits/${auditId}`, async () => { const button = p.getByRole("button", { name: "Copy to another process", exact: true }); if (await button.count()) await button.click() })
    expect(errors).toEqual([])
    await context.close()
  }
  await fs.writeFile(path.join(directory, "comparison-matrix.json"), JSON.stringify(matrix, null, 2) + "\n")
  await info.attach("audit-forms-layout-matrix", { body: JSON.stringify(matrix), contentType: "application/json" })
})

test("audit forms support desktop zoom equivalents, wide layouts and unsaved-text recovery", async ({ browser, page }) => {
  const state = await comparisonFixture(await auditFixture(page))
  for (const width of [390, 768, 1280, 1920, 1600, 1024, 640]) {
    const context = await browser.newContext({ viewport: { width, height: 700 } }), p = await context.newPage()
    await p.goto("http://localhost:5173")
    await p.waitForFunction(() => !!localStorage.getItem("thryvems.preview.v1"))
    await installState(p, state, "p-ms")
    await p.getByRole("button", { name: "Copy to another process", exact: true }).click()
    await p.locator("#copy-process").selectOption("Purchasing & suppliers")
    await p.getByRole("button", { name: "Cancel", exact: true }).click()
    await expect(p.getByText("Discard unsaved changes?", { exact: true })).toBeVisible()
    await p.getByRole("button", { name: "Keep editing", exact: true }).click()
    await expect(p.locator("#copy-process")).toHaveValue("Purchasing & suppliers")
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
    await p.getByRole("button", { name: "Cancel", exact: true }).click()
    await p.getByRole("button", { name: "Discard changes", exact: true }).click()
    await expect(p.getByRole("dialog")).toHaveCount(0)
    await context.close()
  }
})
