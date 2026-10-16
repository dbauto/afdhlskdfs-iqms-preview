import { openPageLink } from "./helpers/page-links"
import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"
import { applyAuditCommand } from "../src/lib/audit-workflow"
import { PEOPLE, ROLES } from "../src/data/org"
import type { State } from "../src/lib/store"

async function data(page: Page): Promise<State> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
}
async function as(page: Page, id: string) {
  await page.evaluate((id) => localStorage.setItem("iqms.viewAs", id), id)
  await page.reload()
}
const texts = (page: Page) => page.locator('textarea[id^="q-text-"]')
const choices = (page: Page) => page.locator('textarea[id^="q-choices-"]')
const settings = (page: Page) =>
  page.getByRole("button", { name: /Question \d+ settings/ })

// This journey begins with the actual template list that previously had no question workspace.
test("administrator opens a saved template, edits questions inline, and reuses an independent snapshot", async ({
  page,
}) => {
  await page.goto("/audits/templates")
  const before = (await data(page)).templates.find((t) => t.id === "CT-02")!
  const row = page.getByRole("row").filter({
    has: page.getByRole("link", {
      name: "Purchasing & suppliers",
      exact: true,
    }),
  })
  page = await openPageLink(page, row.getByRole("link", { name: "Open checklist", exact: true }))
  await expect(texts(page).first()).toHaveValue(
    before.sections![0].items[0].text,
  )
  await expect(texts(page).first()).toHaveAttribute("readonly", "")
  expect((await data(page)).templates.find((t) => t.id === before.id)).toEqual(
    before,
  )
  await page
    .getByRole("button", { name: "Edit questions", exact: true })
    .click()
  await texts(page).first().fill("Which supplier records do you check?")
  await settings(page).first().click()
  await page.locator("#q-type").selectOption("Multiple select")
  await page.locator("#q-respond").selectOption("Auditee")
  await page.locator("#q-evidence-rule").selectOption("Required")
  await page
    .getByRole("switch", { name: "Answer required", exact: true })
    .click()
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await choices(page).first().fill("Approved supplier list")
  await choices(page).first().press("End")
  await choices(page).first().press("Enter")
  await choices(page).first().pressSequentially("Supplier review")
  await expect(choices(page).first()).toHaveValue(
    "Approved supplier list\nSupplier review",
  )
  await page
    .getByRole("switch", { name: "Use pre-audit questionnaire", exact: true })
    .check()
  await page.reload()
  await expect(texts(page).first()).toHaveValue(
    "Which supplier records do you check?",
  )
  await expect(choices(page).first()).toHaveValue(
    "Approved supplier list\nSupplier review",
  )
  await settings(page).first().click()
  await expect(page.locator("#q-evidence-rule")).toHaveValue("Required")
  await expect(
    page.getByRole("switch", { name: "Answer required", exact: true }),
  ).not.toBeChecked()
  await page
    .getByRole("switch", { name: "Allow evidence links", exact: true })
    .uncheck()
  await expect(page.locator("#q-evidence-rule")).toBeDisabled()
  await page
    .getByRole("switch", { name: "Allow evidence links", exact: true })
    .check()
  await expect(page.locator("#q-evidence-rule")).toHaveValue("Optional")
  await page.getByRole("button", { name: "Done", exact: true }).click()
  const template = (await data(page)).templates.find((t) => t.id === before.id)!
  await page.goto("/audits")
  await page.getByRole("button", { name: "Plan audit", exact: true }).click()
  await page.locator("#pa-proc").selectOption("Purchasing & suppliers")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Plan audit", exact: true })
    .click()
  await expect(page).toHaveURL(/\/audits\/IA-2026-\d+$/)
  await page.getByRole("button", { name: "Add checklist", exact: true }).click()
  await page.locator("#af-title").fill("Supplier audit checks")
  await page.getByRole("button", { name: "Add form", exact: true }).click()
  await expect(texts(page).first()).toHaveValue(
    "Which supplier records do you check?",
  )
  await expect(
    page.getByRole("switch", {
      name: "Use pre-audit questionnaire",
      exact: true,
    }),
  ).toBeChecked()
  const audit = (await data(page)).audits.find(
    (a) => a.templateSnapshot?.id === template.id,
  )!
  const snapshot = structuredClone(audit.templateSnapshot)
  expect(snapshot?.version).toBe(template.version)
  await page.goto(`/audits/templates/${template.id}`)
  await texts(page).first().fill("Later template edit")
  expect(
    (await data(page)).audits.find((a) => a.id === audit.id)?.templateSnapshot,
  ).toEqual(snapshot)
})

test("new template opens its own questions; add, reorder, remove and duplicate preserve content", async ({
  page,
}) => {
  await page.goto("/audits/templates")
  await page.getByRole("button", { name: "New template", exact: true }).click()
  await page.locator("#t-name").fill("Synthetic checklist")
  await page
    .getByRole("button", { name: "Create template", exact: true })
    .click()
  const row = page.getByRole("row").filter({
    has: page.getByRole("link", { name: "Synthetic checklist", exact: true }),
  })
  page = await openPageLink(page, row.getByRole("link", { name: "Edit questions", exact: true }))
  await page.getByRole("button", { name: "Add section", exact: true }).click()
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await texts(page).last().fill("First check")
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await texts(page).last().fill("Second check")
  await settings(page).last().click()
  await page.getByRole("button", { name: "Move up", exact: true }).click()
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await expect(texts(page).first()).toHaveValue("Second check")
  await settings(page).last().click()
  await page
    .getByRole("button", { name: "Delete question", exact: true })
    .click()
  await expect(page.getByRole("alertdialog")).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete", exact: true })
    .click()
  await expect(texts(page)).toHaveCount(1)
  page = await openPageLink(page, page
    .getByRole("link", { name: "Back to checklist templates", exact: true }))
  await page.getByRole("row").filter({ has: page.getByRole("link", { name: "Synthetic checklist", exact: true }) })
    .getByRole("button", {
      name: "Actions for Synthetic checklist",
      exact: true,
    })
    .click()
  await page.getByRole("menuitem", { name: "Duplicate", exact: true }).click()
  const copies = (await data(page)).templates.filter((t) =>
    t.name.startsWith("Synthetic checklist"),
  )
  expect(copies).toHaveLength(2)
  expect(copies[0].id).not.toBe(copies[1].id)
  expect(copies[0].sections).toEqual(copies[1].sections)
})

async function versioned(page: Page) {
  let state = await data(page)
  const person = PEOPLE.find((p) => p.id === "p-dr")!,
    role = ROLES.find((r) => r.id === person.roleId)!
  state = applyAuditCommand(state, person, role, {
    kind: "releaseChecklist",
    auditId: "IA-2026-10",
    id: "ACL-USABILITY-1",
    usesQuestionnaire: true,
    sections: [
      {
        id: "test-section",
        title: "Competence checks",
        clause: "7.2",
        items: [
          {
            id: "test-question",
            text: "Original released check",
            type: "Text notes",
            askedBy: person.name,
            required: true,
            evidence: [],
            guidance: "",
            respondBy: "Auditee",
          },
        ],
      },
    ],
  })
  state = applyAuditCommand(state, person, role, {
    kind: "reviseChecklist",
    auditId: "IA-2026-10",
    id: "ACL-USABILITY-2",
    reason: "Clarify the audit question.",
  })
  state.auditChecklists.find(
    (c) => c.id === "ACL-USABILITY-2",
  )!.sections[0].items[0].text = "Current draft check"
  return state
}

test("saved audit versions open exactly, administrator edits a draft, and release stays with the lead", async ({
  page,
}) => {
  await page.goto("/")
  const state = await versioned(page)
  await page.evaluate(
    (state) =>
      localStorage.setItem(
        "thryvems.preview.v1",
        JSON.stringify({ version: 1, state }),
      ),
    state,
  )
  await page.goto("/audits/IA-2026-10")
  const versions = page.getByRole("region", {
    name: "Saved audit forms",
    exact: true,
  })
  await expect(versions.getByRole("row")).toHaveCount(3)
  page = await openPageLink(page, versions
    .getByRole("link", { name: "Open checklist", exact: true })
    .last())
  await expect(texts(page).first()).toHaveValue("Original released check")
  await expect(texts(page).first()).toHaveAttribute("readonly", "")
  await expect(
    page.getByRole("button", { name: "Start checklist revision", exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole("combobox", { name: "Checklist version", exact: true })
    .selectOption("ACL-USABILITY-2")
  await expect(texts(page).first()).toHaveValue("Current draft check")
  await expect(texts(page).first()).toHaveAttribute("readonly", "")
  await page.getByRole("button", { name: "Edit draft", exact: true }).click()
  await texts(page).first().fill("Administrator edits the current draft")
  await expect(
    page.getByRole("button", { name: "Mark checklist ready", exact: true }),
  ).toBeDisabled()
  expect(
    (await data(page)).auditChecklists.find((c) => c.id === "ACL-USABILITY-1")
      ?.sections[0].items[0].text,
  ).toBe("Original released check")
  await page.reload()
  await expect(texts(page).first()).toHaveValue(
    "Administrator edits the current draft",
  )
  await page.goto("/audits/IA-2026-10/checklist?version=missing")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await page.goto("/audits/IA-2026-05/checklist")
  await expect(texts(page).first()).not.toHaveValue(
    "Administrator edits the current draft",
  )
})

test("template and builder routes respect narrow scope, read-only roles, expired access and hidden evidence", async ({
  page,
}) => {
  await page.goto("/")
  await as(page, "p-ja")
  await page.goto("/audits/templates")
  await expect(
    page.getByRole("link", { name: "Operations", exact: true }),
  ).toHaveCount(0)
  page = await openPageLink(page, page
    .getByRole("link", { name: "Purchasing & suppliers", exact: true }))
  await expect(texts(page).first()).toHaveAttribute("readonly", "")
  await expect(
    page.getByRole("button", { name: "Edit questions", exact: true }),
  ).toHaveCount(0)
  await settings(page).first().click()
  await expect(page.locator("#q-type")).toBeDisabled()
  await page.getByRole("button", { name: "Done", exact: true }).click()
  await page.goto("/audits/templates/CT-01")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await page.goto("/audits/IA-2026-10/checklist")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await as(page, "p-ec")
  await page.goto("/audits/templates/CT-01")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await as(page, "p-pre")
  await page.goto("/audits/templates")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await as(page, "p-al")
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    saved.state.people.find((p: any) => p.id === "p-ec").accessEndsOn =
      "2020-01-01"
    const doc = saved.state.documents[0]
    doc.title = "Restricted synthetic record"
    doc.classification = "Highly confidential"
    doc.owner = saved.state.templates.find(
      (t: any) => t.id === "CT-01",
    ).sections[0].items[0].askedBy
    saved.state.templates.find(
      (t: any) => t.id === "CT-01",
    ).sections[0].items[0].evidence = [`${doc.id} ${doc.title}`]
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(saved))
  })
  await as(page, "p-ec")
  await page.goto("/audits/templates")
  await expect(
    page.getByText("This page or record doesn’t exist", { exact: true }),
  ).toBeVisible()
  await as(page, "p-ro")
  await page.goto("/audits/templates/CT-01")
  await expect(
    page
      .locator("section[data-question-id]")
      .first()
      .getByText(/Not independent:/),
  ).toHaveCount(0)
  await settings(page).first().click()
  expect(
    await page
      .locator("#doc-ids option")
      .evaluateAll((options) =>
        options.map((option) => option.getAttribute("value")),
      ),
  ).not.toEqual(
    expect.arrayContaining([
      expect.stringContaining("Restricted synthetic record"),
    ]),
  )
  await expect(
    page.getByRole("dialog").getByText("Not available", { exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText("Restricted synthetic record", { exact: false }),
  ).toHaveCount(0)
})

// Screenshots use the pre-change commit when INLINE_BASELINE_URL and BASELINE_APP are provided.
test("checklist usability screenshots: wide and narrow roles, light/dark and responsive layouts", async ({
  browser,
  page,
}, testInfo) => {
  test.setTimeout(360_000)
  await page.goto("/")
  const state = await versioned(page)
  const output =
    process.env.INLINE_SCREENSHOT_DIR ?? testInfo.outputPath("screenshots")
  await fs.mkdir(output, { recursive: true })
  const matrix: object[] = []
  const sizes = [
    { width: 1440, height: 900 },
    { width: 1280, height: 650 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 1920, height: 1080 },
  ]
  const sources = [
    { name: "after", url: "http://localhost:5173" },
    ...(process.env.INLINE_BASELINE_URL
      ? [{ name: "before", url: process.env.INLINE_BASELINE_URL }]
      : []),
  ]
  for (const source of sources)
    for (const who of ["p-ms", "p-ja"])
      for (const theme of ["Light", "Dark"])
        for (const viewport of sizes) {
          const context = await browser.newContext({
            viewport,
            deviceScaleFactor: viewport.width === 1280 ? 1.5 : 1,
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
          const view = await context.newPage(),
            errors: string[] = []
          view.on("pageerror", (e) => errors.push(e.message))
          const routes = [
            ["templates", "/audits/templates"],
            [
              "template-editor",
              source.name === "after"
                ? "/audits/templates/CT-02"
                : "/audits/templates",
            ],
            ["builder", "/audits/IA-2026-10/checklist"],
            ["saved-versions", "/audits/IA-2026-10"],
          ]
          for (const [name, route] of routes) {
            await view.goto(source.url + route)
            await view
              .locator("h1")
              .or(
                view.getByText("This page or record doesn’t exist", {
                  exact: true,
                }),
              )
              .first()
              .waitFor()
            await view.evaluate(() => document.fonts.ready)
            expect(
              await view.evaluate(async () =>
                (await document.fonts.load('400 14px "Public Sans"')).some(
                  (font) => font.status === "loaded",
                ),
              ),
            ).toBe(true)
            if (
              name === "template-editor" &&
              source.name === "before" &&
              who === "p-ms"
            ) {
              await view
                .getByRole("button", {
                  name: "Actions for Purchasing & suppliers",
                  exact: true,
                })
                .click()
              await view
                .getByRole("menuitem", { name: "Edit", exact: true })
                .click()
              expect(
                await view.getByRole("dialog").locator("textarea").count(),
              ).toBe(0)
            }
            const overflow = await view.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            )
            if (source.name === "after")
              expect(
                overflow,
                `${name} ${who} ${theme} ${viewport.width}`,
              ).toBe(false)
            const filename = `${source.name}-${name}-${who}-${theme.toLowerCase()}-${viewport.width}.jpg`
            if (viewport.width !== 1920)
              await view.screenshot({
                path: path.join(output, filename),
                type: "jpeg",
                quality: 74,
                fullPage: true,
              })
            matrix.push({
              source: source.name,
              page: name,
              who,
              theme,
              viewport,
              overflow,
              screenshot: viewport.width !== 1920 ? filename : undefined,
            })
            if (name === "template-editor" && source.name === "after") {
              await view
                .getByRole("button", {
                  name: "Question 1 settings",
                  exact: true,
                })
                .click()
              expect(
                await view.evaluate(
                  () => document.documentElement.scrollWidth > innerWidth + 1,
                ),
              ).toBe(false)
              if (viewport.width !== 1920)
                await view.screenshot({
                  path: path.join(
                    output,
                    filename.replace("template-editor", "question-settings"),
                  ),
                  type: "jpeg",
                  quality: 74,
                  fullPage: false,
                })
              await view
                .getByRole("button", { name: "Done", exact: true })
                .click()
            }
          }
          if (source.name === "after") expect(errors).toEqual([])
          await context.close()
        }
  const filename = path.join(output, "matrix.json")
  await fs.writeFile(filename, JSON.stringify(matrix, null, 2))
  await testInfo.attach("Checklist usability matrix", {
    path: filename,
    contentType: "application/json",
  })
})
