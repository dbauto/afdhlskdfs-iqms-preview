import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"
import { auditId, auditFixture, addForm, releaseForm, command, formSettings } from "./helpers/audit-forms"

const views = [
  { width: 1440, height: 900, scale: 1, label: "1440" },
  { width: 853, height: 433, scale: 1.5, label: "1280-zoom150" },
  { width: 768, height: 1024, scale: 1, label: "768" },
  { width: 390, height: 844, scale: 1, label: "390" },
]
test("questionnaire builder: before/after layouts, types and readable settings for wide/narrow access", async ({ page, browser }, info) => {
  test.setTimeout(240_000)
  let state = await auditFixture(page)
  state = addForm(state, "AQF-4001", "Questionnaire", { ...formSettings("Competence review questionnaire", "Questionnaire"), ownerId: "p-ms" })
  const form = state.auditChecklists.find(c => c.id === "AQF-4001")!, sections = structuredClone(form.sections)
  sections[0].items[0] = { ...sections[0].items[0], text: "How do you review competence and retain supporting records?", type: "Multiple choice", choices: ["At each quarterly review, with links to the current records", "During the annual management review and follow-up audit"], guidance: "Select the method used by your team." }
  state = command(state, "p-ms", { kind: "saveChecklist", auditId, id: form.id, sections, usesQuestionnaire: true })
  state = releaseForm(addForm(state, "AQF-4002", "Questionnaire"), "AQF-4002")
  state = command(state, "p-dr", { kind: "assignQuestionnaire", auditId, id: "AQA-4002", checklistId: "AQF-4002", respondent: "Joy Aquino", questionIds: ["AQF-4002-q1"], dueDate: "2027-01-10" })
  const sources = [{ name: "after", url: "http://localhost:5173" }, ...(process.env.BASELINE_APP ? [{ name: "before", url: "http://localhost:5174" }] : [])]
  const directory = info.outputPath("screenshots"), matrix: object[] = []
  await fs.mkdir(directory, { recursive: true })
  for (const source of sources) for (const who of ["p-ms", "p-bc"]) for (const theme of ["Light", "Dark"]) for (const view of views) {
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, deviceScaleFactor: view.scale }), p = await context.newPage(), errors: string[] = []
    p.on("pageerror", e => errors.push(e.message))
    await p.goto(source.url)
    await p.waitForFunction(() => !!localStorage.getItem("thryvems.preview.v1"))
    await p.evaluate(({ state, who, theme }) => {
      const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
      localStorage.setItem("thryvems.preview.v1", JSON.stringify({ ...saved, state }))
      localStorage.setItem("iqms.viewAs", who); localStorage.setItem("iqms.appearance", theme)
    }, { state, who, theme })
    const capture = async (name: string, route: string, action?: () => Promise<void>) => {
      await p.goto(source.url + route); await p.locator("main").waitFor(); await p.evaluate(() => document.fonts.ready)
      if (action) await action()
      expect(await p.locator("html").evaluate(el => el.classList.contains("dark"))).toBe(theme === "Dark")
      expect(await p.locator("body").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Public Sans")
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
      for (const dialog of await p.getByRole("dialog").all()) {
        const box = await dialog.boundingBox(); expect(box!.x).toBeGreaterThanOrEqual(-1); expect(box!.x + box!.width).toBeLessThanOrEqual(view.width + 1)
      }
      const file = `${source.name}-${name}-${who}-${theme.toLowerCase()}-${view.label}.jpg`
      await p.screenshot({ path: path.join(directory, file), type: "jpeg", quality: 75 })
      matrix.push({ source: source.name, name, who, theme, view, file, pageOverflow: false })
    }
    const builder = `/audits/${auditId}/${source.name === "after" ? "questionnaire-builder" : "checklist"}?version=AQF-4001`
    await capture("forms", `/audits/${auditId}`)
    await capture("builder", builder)
    if (source.name === "after") {
      await expect(p.getByRole("heading", { name: "Questionnaire builder", exact: true })).toBeVisible()
      await expect(p.locator('select[id^="q-type-inline-"]')).toHaveValue("Multiple choice")
      if (who === "p-bc") await expect(p.locator('textarea[id^="q-text-"]')).toHaveAttribute("readonly", "")
    }
    await capture("question-settings", builder, async () => { await p.getByRole("button", { name: "Question 1 settings", exact: true }).click() })
    await capture("assignments", `/audits/${auditId}/questionnaires?form=AQF-4002`)
    expect(errors).toEqual([]); await context.close()
  }
  await page.evaluate(state => { const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!); localStorage.setItem("thryvems.preview.v1", JSON.stringify({ ...saved, state })); localStorage.setItem("iqms.viewAs", "p-ms") }, state)
  // Additional CSS viewport widths represent wide desktop and 80/125/200% zoom equivalents.
  for (const width of [1280, 1920, 1600, 1024, 640]) {
    await page.setViewportSize({ width, height: 700 })
    await page.goto(`/audits/${auditId}/questionnaire-builder?version=AQF-4001`)
    await expect(page.locator('select[id^="q-type-inline-"]')).toHaveValue("Multiple choice")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await fs.writeFile(path.join(directory, "comparison-matrix.json"), JSON.stringify(matrix, null, 2) + "\n")
  await info.attach("questionnaire-builder-matrix", { body: JSON.stringify(matrix), contentType: "application/json" })
})
