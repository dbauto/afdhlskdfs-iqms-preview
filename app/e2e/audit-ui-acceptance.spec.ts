import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"
import type { State } from "../src/lib/store"
import type { ChecklistQuestion } from "../src/data/types"
import { applyAuditCommand } from "../src/lib/audit-workflow"
import { PEOPLE, ROLES } from "../src/data/org"

test("audit UI acceptance: roles, themes, responsive layouts and screenshots", async ({ browser, page }, testInfo) => {
  test.setTimeout(720_000)
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /Good .*Aaron/ })).toBeVisible()
  let state: State = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
  const lead = PEOPLE.find((p) => p.id === "p-dr")!,
    leadRole = ROLES.find((r) => r.id === lead.roleId)!
  const respondent = PEOPLE.find((p) => p.id === "p-ja")!,
    respondentRole = ROLES.find((r) => r.id === respondent.roleId)!
  const base: ChecklistQuestion = {
    id: "ui-text",
    text: "Describe the competence review process",
    type: "Text notes",
    askedBy: lead.name,
    required: true,
    clause: "7.2",
    respondBy: "Auditee",
    evidence: [],
    guidance: "",
    evidenceRule: "Optional",
  }
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "releaseChecklist",
    auditId: "IA-2026-10",
    id: "ACL-UI",
    usesQuestionnaire: true,
    sections: [
      {
        id: "ui-section",
        title: "Competence checks",
        clause: "7.2",
        items: [
          base,
          {
            ...base,
            id: "ui-radio",
            text: "Choose the review frequency",
            type: "Multiple choice",
            choices: ["Monthly", "Quarterly"],
          },
          {
            ...base,
            id: "ui-multi",
            text: "Select the records you keep",
            type: "Multiple select",
            choices: ["Training matrix", "Induction log", "Review notes"],
            evidenceRule: "Required",
          },
        ],
      },
    ],
  })
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "assignQuestionnaire",
    auditId: "IA-2026-10",
    id: "AQA-UI",
    checklistId: "ACL-UI",
    respondent: respondent.name,
    questionIds: ["ui-text", "ui-radio", "ui-multi"],
    dueDate: "2099-01-01",
  })
  state = applyAuditCommand(state, respondent, respondentRole, {
    kind: "saveResponses",
    auditId: "IA-2026-10",
    assignmentId: "AQA-UI",
    submit: true,
    responses: [
      {
        questionId: "ui-text",
        value: "The process owner reviews competence each quarter and links the review records.",
        explanation: "",
        naReason: "",
        evidence: [],
      },
      { questionId: "ui-radio", value: "Quarterly", explanation: "", naReason: "", evidence: [] },
      {
        questionId: "ui-multi",
        value: "Training matrix, Induction log",
        selectedValues: ["Training matrix", "Induction log"],
        explanation: "Records for the sampled review period.",
        naReason: "",
        evidence: [
          {
            kind: "link",
            title: "Synthetic competence records",
            url: "https://example.com/competence",
            addedBy: respondent.name,
            addedAt: "",
          },
        ],
      },
    ],
  })
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "prepareRespondentInvitation",
    auditId: "IA-2026-10",
    id: "AQI-UI",
    assignmentId: "AQA-GUEST-UI",
    checklistId: "ACL-UI",
    name: "Synthetic Respondent",
    email: "respondent@example.test",
    department: "Synthetic department",
    questionIds: ["ui-text", "ui-radio", "ui-multi"],
    dueDate: "2099-01-01",
    interview: false,
  })
  const response = state.auditeeResponses.find((r) => r.questionId === "ui-text")!
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "saveAssessment",
    auditId: "IA-2026-10",
    checklistId: "ACL-UI",
    questionId: "ui-text",
    draft: {
      result: "Conforms",
      objectiveEvidence: "Compared the response against three sampled competence records.",
      sampling: "Three records",
      interviewee: respondent.name,
      notes: "The checked item meets the requirement.",
      evidence: [
        {
          kind: "response",
          id: response.id,
          responseRevision: 1,
          title: "Submitted questionnaire response",
          addedBy: lead.name,
          addedAt: "",
        },
      ],
      status: "Completed",
    },
  })
  state = applyAuditCommand(state, lead, leadRole, {
    kind: "reviseChecklist",
    auditId: "IA-2026-10",
    id: "ACL-UI-2",
    reason: "Show the form builder controls in a controlled draft revision.",
  })
  const output = process.env.UI_SCREENSHOT_DIR ? path.resolve(process.env.UI_SCREENSHOT_DIR) : testInfo.outputPath("screenshots")
  await fs.mkdir(output, { recursive: true })
  const pages = [
    ["builder", "/audits/IA-2026-10/checklist"],
    ["questionnaire", "/audits/IA-2026-10/questionnaires/AQA-UI"],
    ["audit", "/audits/IA-2026-10"],
    ["assignments", "/audits/IA-2026-10/questionnaires"],
    ["conduct", "/audits/IA-2026-10/conduct"],
    ["response", `/audits/responses/${response.id}?revision=1`],
    ["programme", "/audits"],
  ]
  const sizes = [
    { width: 1440, height: 900 },
    { width: 1280, height: 650 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 1920, height: 1080 },
  ]
  const results: object[] = []
  const sources = [
    { name: "after", origin: "http://localhost:5173" },
    ...(process.env.BASELINE_URL ? [{ name: "before", origin: process.env.BASELINE_URL }] : []),
  ].filter((source) => !process.env.UI_SOURCE || source.name === process.env.UI_SOURCE)
  for (const source of sources)
    for (const who of ["p-ms", "p-ja"])
      for (const theme of ["Light", "Dark"])
        for (const viewport of sizes) {
          const context = await browser.newContext({ viewport, deviceScaleFactor: viewport.width === 1280 ? 1.5 : 1 })
          await context.addInitScript(
            ({ state, who, theme }) => {
              localStorage.setItem("thryvems.preview.v1", JSON.stringify({ version: 1, state }))
              localStorage.setItem("iqms.viewAs", who)
              localStorage.setItem("iqms.appearance", theme)
            },
            { state, who, theme },
          )
          const view = await context.newPage(),
            errors: string[] = []
          view.on("pageerror", (e) => errors.push(e.message))
          for (const [name, route] of pages) {
            if (source.name === "before" && ["conduct", "response"].includes(name)) continue
            await view.goto(source.origin + route)
            await view.locator("h1").or(view.getByText("This page or record doesn’t exist", { exact: true })).first().waitFor()
            await view.evaluate(() => document.fonts.ready)
          expect(await view.evaluate(async () => (await document.fonts.load('400 14px "Public Sans"')).some(font => font.status === "loaded"))).toBe(true)
            if (name === "builder") {
              const question = view.locator("button[aria-pressed]").filter({ hasText: "Select the records you keep" })
              if (await question.isEnabled()) await question.click()
            }
            if (name === "questionnaire") await view.getByRole("button", { name: /3\. Select the records you keep/ }).click()
            await view.evaluate(() => window.scrollTo(0, 0))
            const overflow = await view.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
            if (source.name === "after") {
              expect(overflow, `${name} ${who} ${theme} ${viewport.width}px overflows`).toBe(false)
              if (name === "conduct" && who === "p-ja")
                await expect(view.getByText("This page or record doesn’t exist")).toBeVisible()
            }
            const filename = `${source.name}-${name}-${who}-${theme.toLowerCase()}-${viewport.width}.jpg`
            if (viewport.width !== 1920)
              await view.screenshot({ path: path.join(output, filename), fullPage: true, type: "jpeg", quality: 78 })
            results.push({
              source: source.name,
              page: name,
              who,
              theme,
              viewport,
              displayScale: viewport.width === 1280 ? 1.5 : 1,
              overflow,
              screenshot: viewport.width !== 1920 ? filename : undefined,
            })
          }
          if (source.name === "after") expect(errors).toEqual([])
          await context.close()
        }
  if (process.env.UI_SOURCE !== "before")
    for (const theme of ["Light", "Dark"])
      for (const viewport of sizes.slice(0, 4)) {
        const context = await browser.newContext({ viewport })
        await context.addInitScript(
          ({ state, theme }) => {
            localStorage.setItem("thryvems.preview.v1", JSON.stringify({ version: 1, state }))
            localStorage.setItem("iqms.appearance", theme)
          },
          { state, theme },
        )
        const view = await context.newPage()
        await view.goto("http://localhost:5173/respond-preview/AQI-UI")
        await expect(view.getByRole("link", { name: "Overview", exact: true })).toHaveCount(0)
        expect(await view.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false)
        await view.screenshot({
          path: path.join(output, `after-invited-${theme.toLowerCase()}-${viewport.width}.jpg`),
          fullPage: true,
          type: "jpeg",
          quality: 78,
        })
        await context.close()
      }
  const matrix = path.join(output, `${process.env.UI_SOURCE || "after"}-matrix.json`)
  await fs.writeFile(matrix, JSON.stringify(results, null, 2))
  await testInfo.attach("UI matrix", { path: matrix, contentType: "application/json" })
})
