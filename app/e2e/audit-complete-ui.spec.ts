import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"
import {
  auditFixture,
  auditId,
  command,
  addForm,
  releaseForm,
  formSettings,
} from "./helpers/audit-forms"

async function fixture(page: import("@playwright/test").Page) {
  let state = await auditFixture(page)
  state.audits.find((a) => a.id === auditId)!.auditors = [
    "Kim Dela Cruz",
    "Ben Castillo",
  ]
  const members = [
    { personId: "p-kd", access: "Edit" as const },
    { personId: "p-bc", access: "View" as const },
  ]
  state = addForm(state, "AQF-6801", "Questionnaire", {
    ...formSettings("Competence questionnaire", "Questionnaire"),
    ownerId: "p-ms",
    members,
  })
  state = releaseForm(
    addForm(state, "AQF-6802", "Questionnaire", {
      ...formSettings("Submitted competence questions", "Questionnaire"),
      members,
    }),
    "AQF-6802",
  )
  state = command(state, "p-dr", {
    kind: "assignQuestionnaire",
    auditId,
    id: "AQA-6802",
    checklistId: "AQF-6802",
    respondent: "Joy Aquino",
    questionIds: ["AQF-6802-q1"],
    dueDate: "2027-01-10",
  })
  state = command(state, "p-ja", {
    kind: "saveResponses",
    auditId,
    assignmentId: "AQA-6802",
    submit: true,
    responses: [
      {
        questionId: "AQF-6802-q1",
        value: "Annual competence reviews are recorded in the approved matrix.",
        explanation: "Synthetic response used for layout verification.",
        naReason: "",
        evidence: [],
      },
    ],
  })
  state = command(state, "p-dr", {
    kind: "completeAuditForm",
    auditId,
    checklistId: "AQF-6802",
  })
  state = releaseForm(
    addForm(state, "ACL-6803", "Checklist", {
      ...formSettings("Independent auditor checks"),
      members,
    }),
    "ACL-6803",
  )
  state = command(state, "p-dr", {
    kind: "saveAssessment",
    auditId,
    checklistId: "ACL-6803",
    questionId: "ACL-6803-q1",
    draft: {
      result: "Observation",
      objectiveEvidence:
        "The sampled records were complete; review frequency could be clearer.",
      sampling: "Three synthetic records",
      interviewee: "Rosa Tan",
      notes:
        "An improvement opportunity is recorded separately from the respondent’s answer.",
      evidence: [],
      status: "Completed",
    },
  })
  state = command(state, "p-dr", {
    kind: "raiseAuditFinding",
    auditId,
    assessmentId: state.auditorAssessments.at(-1)!.id,
    title: "Make competence review frequency clearer",
    facts:
      "The three sampled records were complete; guidance did not state a consistent review interval.",
    requirement: "Maintain suitable competence review arrangements.",
    clause: "7.2",
    owner: "Rosa Tan",
    classification: "Opportunity",
  })
  const finding = state.auditFindings.at(-1)!
  state = command(state, "p-dr", {
    kind: "requestFindingReview",
    auditId,
    findingId: finding.id,
  })
  state = command(state, "p-rt", {
    kind: "respondToFinding",
    auditId,
    findingId: finding.id,
    decision: "Agreed",
    comment: "The guidance can be clarified at the next planned review.",
  })
  state = command(state, "p-dr", {
    kind: "finalizeAuditFinding",
    auditId,
    findingId: finding.id,
    reason: "The observation is agreed; no nonconformity is raised.",
  })
  state = command(state, "p-dr", {
    kind: "completeAuditForm",
    auditId,
    checklistId: "ACL-6803",
  })
  state = command(state, "p-dr", {
    kind: "saveAuditReport",
    auditId,
    draft: {
      objectives: "Assess the process and its competence review records.",
      scope: "People & competence, including the current review matrix.",
      criteria: "Clause 7.2 and the approved process requirements.",
      evidenceSummary:
        "Three synthetic records and a questionnaire response were reviewed independently.",
      summary:
        "The sampled records were complete. One opportunity for improvement was agreed.",
      conclusion: "The process conforms within the audited sample and scope.",
      followUp:
        "Clarify the review interval during the next planned process review.",
    },
  })
  state = command(state, "p-dr", {
    kind: "saveAuditContribution",
    auditId,
    summary: "I reviewed the synthetic sample and respondent’s submission.",
    conclusion: "The sample conforms; clearer review guidance would help.",
    followUp: "Monitor the agreed improvement.",
  })
  state = command(state, "p-dr", {
    kind: "decideReportFinding",
    auditId,
    findingId: finding.id,
    action: "Include",
    reason: "Retain the agreed opportunity as a separate finding.",
  })
  return { state, findingId: finding.id }
}

test("audit workspaces keep usable layouts, correct roles and readable results in both themes and required screen sizes", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(240_000)
  const { state, findingId } = await fixture(page)
  const output = process.env.UI_SCREENSHOT_DIR
    ? path.resolve(process.env.UI_SCREENSHOT_DIR)
    : info.outputPath("screenshots")
  await fs.mkdir(output, { recursive: true })
  const screens = [
    ["audit", `/audits/${auditId}`],
    ["builder", `/audits/${auditId}/questionnaire-builder?version=AQF-6801`],
    ["questionnaires", `/audits/${auditId}/questionnaires`],
    ["results", `/audits/${auditId}/results`],
    ["finding", `/audits/findings/${findingId}`],
    ["report", `/audits/${auditId}/report`],
  ]
  const sizes = [
    { name: "1440", width: 1440, height: 900, scale: 1 },
    { name: "1280-150pct", width: 853, height: 433, scale: 1.5 },
    { name: "768", width: 768, height: 1024, scale: 1 },
    { name: "390", width: 390, height: 844, scale: 1 },
  ]
  const sources = [
    ...(process.env.BASELINE_APP
      ? [{ label: "before", url: "http://localhost:5174" }]
      : []),
    { label: "after", url: "http://localhost:5173" },
  ]
  const matrix: object[] = []
  for (const source of sources)
    for (const who of ["p-ms", "p-bc"])
      for (const theme of ["Light", "Dark"])
        for (const size of sizes) {
          const context = await browser.newContext({
            viewport: { width: size.width, height: size.height },
            deviceScaleFactor: size.scale,
          })
          await context.addInitScript(
            ({ state, who, theme }) => {
              localStorage.setItem(
                "thryvems.preview.v1",
                JSON.stringify({ version: 1, state }),
              )
              localStorage.setItem("iqms.viewAs", who)
              localStorage.setItem("iqms.appearance", theme)
            },
            { state, who, theme },
          )
          const p = await context.newPage(),
            errors: string[] = []
          p.on("pageerror", (e) => errors.push(e.message))
          for (const [name, route] of screens) {
            await p.goto(source.url + route)
            await p.locator("main").waitFor()
            await p.evaluate(() => document.fonts.ready)
            if (source.label === "after") {
              await expect(
                p.getByText("This page or record doesn’t exist", {
                  exact: false,
                }),
              ).toHaveCount(0)
              if (name === "builder") {
                if (who === "p-ms")
                  await expect(
                    p.locator('textarea[id^="q-text-"]'),
                  ).toBeEditable()
                else
                  await expect(
                    p.locator('textarea[id^="q-text-"]'),
                  ).toHaveAttribute("readonly", "")
              }
              if (name === "results")
                await expect(
                  p.getByRole("region", {
                    name: "Questionnaire responses",
                    exact: true,
                  }),
                ).toContainText("Annual competence reviews")
              if (name === "report") {
                await expect(
                  p.getByRole("button", { name: "Issue report", exact: true }),
                ).toHaveCount(0)
                await expect(
                  p.getByRole("button", {
                    name: "Save contribution",
                    exact: true,
                  }),
                ).toHaveCount(0)
              }
              expect(
                await p.evaluate(() =>
                  document.fonts.check('14px "Public Sans"'),
                ),
              ).toBe(true)
              expect(
                await p.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth + 1,
                ),
                `${name} ${who} ${theme} ${size.name}`,
              ).toBe(true)
            }
            const filename = `${source.label}-${name}-${who}-${theme.toLowerCase()}-${size.name}.jpg`
            await p.screenshot({
              path: path.join(output, filename),
              type: "jpeg",
              quality: 74,
              fullPage: true,
            })
            matrix.push({
              source: source.label,
              screen: name,
              who,
              theme,
              viewport: [size.width, size.height],
              deviceScaleFactor: size.scale,
              screenshot: filename,
              pageErrors: errors.length,
            })
          }
          expect(errors).toEqual([])
          await context.close()
        }
  // Extra widths test actual builder and report reflow without applying CSS zoom/scaling.
  for (const width of [640, 1024, 1280, 1600, 1920]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    })
    await context.addInitScript((state) => {
      localStorage.setItem(
        "thryvems.preview.v1",
        JSON.stringify({ version: 1, state }),
      )
      localStorage.setItem("iqms.viewAs", "p-dr")
    }, state)
    const p = await context.newPage()
    for (const route of [screens[1][1], screens[3][1], screens[5][1]]) {
      await p.goto("http://localhost:5173" + route)
      await p.locator("main").waitFor()
      expect(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      ).toBe(true)
    }
    await context.close()
  }
  let issued = command(state, "p-dr", {
    kind: "withdrawAuditForm",
    auditId,
    checklistId: "AQF-6801",
    reason: "This draft is not part of the completed audit.",
  })
  issued = command(issued, "p-dr", {
    kind: "issueAuditReport",
    auditId,
    reportId: issued.auditReports.at(-1)!.id,
  })
  const printContext = await browser.newContext()
  await printContext.addInitScript((state) => {
    localStorage.setItem(
      "thryvems.preview.v1",
      JSON.stringify({ version: 1, state }),
    )
    localStorage.setItem("iqms.viewAs", "p-dr")
  }, issued)
  const printPage = await printContext.newPage()
  await printPage.goto(`http://localhost:5173/audits/${auditId}/report`)
  await expect(
    printPage.getByRole("button", { name: "Print report", exact: true }),
  ).toBeVisible()
  await printPage.emulateMedia({ media: "print" })
  const pdf = await printPage.pdf({
    format: "A4",
    printBackground: false,
    path: path.join(output, "issued-report.pdf"),
  })
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
  expect(
    await printPage
      .locator(".audit-report-print")
      .evaluate((el) => getComputedStyle(el).visibility),
  ).toBe("visible")
  await printContext.close()
  await fs.writeFile(
    path.join(output, "comparison-matrix.json"),
    JSON.stringify(
      {
        baseline: "4e0845864849cfa3aef0d69c03ee5adddb6e10c1",
        matrix,
        extraWidths: [640, 1024, 1280, 1600, 1920],
      },
      null,
      2,
    ),
  )
})
