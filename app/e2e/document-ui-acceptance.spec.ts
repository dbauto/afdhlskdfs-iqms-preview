import { test, expect, type Page } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"

const views = [
  { width: 1440, height: 900, scale: 1, label: "1440" },
  // A 1280x650 content area at 150% browser zoom has an 853x433 CSS viewport.
  { width: 853, height: 433, scale: 1.5, label: "1280-zoom150" },
  { width: 768, height: 1024, scale: 1, label: "768" },
  { width: 390, height: 844, scale: 1, label: "390" },
]
async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true)
  for (const dialog of await page.getByRole("dialog").all()) {
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true)
    const box = await dialog.boundingBox()
    expect(box?.x).toBeGreaterThanOrEqual(-1)
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 0) + 1,
    )
  }
}
async function accessLabelsFit(page: Page) {
  const radios = page.getByRole("radiogroup", { name: "Access", exact: true })
  for (const label of await radios.locator("label").all()) {
    const text = await label.locator(":scope > span").boundingBox(),
      button = await label.boundingBox()
    expect(text!.x).toBeGreaterThanOrEqual(button!.x)
    expect(text!.x + text!.width).toBeLessThanOrEqual(button!.x + button!.width)
    expect(text!.y + text!.height).toBeLessThanOrEqual(
      button!.y + button!.height,
    )
  }
}

test("document UI: before/after wide/narrow roles, appearances and responsive comparisons", async ({
  browser,
}, info) => {
  test.setTimeout(180_000)
  const directory = path.resolve(
    "../plan/verification/document-controls-screens",
  )
  await fs.mkdir(directory, { recursive: true })
  const sources = [
    { name: "after", url: "http://localhost:5173" },
    ...(process.env.BASELINE_APP
      ? [{ name: "before", url: "http://localhost:5174" }]
      : []),
  ]
  const matrix: object[] = []
  for (const source of sources)
    for (const who of ["p-ms", "p-ja"])
      for (const theme of ["Light", "Dark"])
        for (const v of views) {
          const context = await browser.newContext({
            viewport: { width: v.width, height: v.height },
            deviceScaleFactor: v.scale,
          })
          const page = await context.newPage(),
            errors: string[] = []
          page.on("pageerror", (e) => errors.push(e.message))
          await page.goto(source.url)
          await page.evaluate(
            ({ who, theme }) => {
              localStorage.setItem("iqms.viewAs", who)
              localStorage.setItem("iqms.appearance", theme)
            },
            { who, theme },
          )
          const capture = async (
            name: string,
            route: string,
            action?: () => Promise<void>,
          ) => {
            await page.goto(source.url + route)
            await expect(
              page
                .locator("h1")
                .or(
                  page.getByText("This page or record doesn’t exist", {
                    exact: true,
                  }),
                ),
            ).toBeVisible()
            await page.evaluate(() => document.fonts.ready)
            expect(
              await page.evaluate(async () =>
                (await document.fonts.load('400 14px "Public Sans"')).some(
                  (f) => f.status === "loaded",
                ),
              ),
            ).toBe(true)
            if (action) await action()
            await fits(page)
            const file = `${source.name}-${name}-${who}-${theme.toLowerCase()}-${v.label}.jpg`
            await page.screenshot({
              path: path.join(directory, file),
              fullPage: false,
              type: "jpeg",
              quality: 48,
            })
            matrix.push({
              source: source.name,
              name,
              who,
              theme,
              viewport: v,
              file,
              pageOverflow: false,
            })
          }
          await capture("scope", "/qms/organization")
          await capture("scope-editor", "/qms/organization", async () => {
            const revise = page.getByRole("button", {
              name: "Revise scope",
              exact: true,
            })
            if (await revise.count()) await revise.click()
          })
          // A process-local public record lets both roles inspect the same share controls.
          await capture("share", "/documents/PUR-PRO-002", async () => {
            await page
              .getByRole("button", { name: "Share", exact: true })
              .click()
            if (source.name === "after") await accessLabelsFit(page)
          })
          await capture("document", "/documents/PUR-PRO-002")
          await capture("revisions", "/documents/PUR-PRO-002", async () => {
            const more = page.getByRole("button", {
              name: "View more revision updates",
              exact: true,
            })
            if (await more.count()) await more.click()
            else
              await page
                .getByText("Revisions", { exact: true })
                .scrollIntoViewIfNeeded()
          })
          await capture("effectivity", "/documents/QMS-MAN-001", async () => {
            const suspend = page.getByRole("button", {
              name: "Suspend effectivity",
              exact: true,
            })
            if (source.name === "after" && (await suspend.count()))
              await suspend.click()
          })
          expect(errors).toEqual([])
          await context.close()
        }
  await fs.writeFile(
    path.join(
      directory,
      process.env.BASELINE_APP ? "comparison-matrix.json" : "after-matrix.json",
    ),
    JSON.stringify(matrix, null, 2) + "\n",
  )
  await info.attach("document-layout-matrix", {
    body: JSON.stringify(matrix),
    contentType: "application/json",
  })
})

test("sharing supports keyboard choice and 80/125/150/200 percent desktop zoom equivalents", async ({
  browser,
}) => {
  for (const zoom of [0.8, 1.25, 1.5, 2]) {
    const context = await browser.newContext({
      viewport: {
        width: Math.round(1280 / zoom),
        height: Math.round(650 / zoom),
      },
      deviceScaleFactor: zoom,
    })
    const page = await context.newPage()
    await page.goto("http://localhost:5173/documents/QMS-MAN-001")
    await page.getByRole("button", { name: "Share", exact: true }).click()
    await page.getByRole("radio", { name: "Can view", exact: true }).focus()
    await page.keyboard.press("ArrowRight", { delay: 50 })
    await expect(
      page.getByRole("radio", { name: "Can comment", exact: true }),
    ).toBeChecked()
    await accessLabelsFit(page)
    await fits(page)
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Done", exact: true })
      .click()
    await page
      .getByRole("button", { name: "Suspend effectivity", exact: true })
      .click()
    await fits(page)
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await page.goto("http://localhost:5173/qms/organization")
    await page
      .getByRole("button", { name: "Revise scope", exact: true })
      .click()
    await fits(page)
    await context.close()
  }
  for (const width of [390, 768, 1280, 1920]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    })
    await context.addInitScript(() =>
      localStorage.setItem("iqms.viewAs", "p-ms"),
    )
    const page = await context.newPage()
    await page.goto("http://localhost:5173/documents/PUR-FRM-004")
    await page.getByRole("button", { name: "Share", exact: true }).click()
    await expect(
      page.getByRole("radio", { name: "Can edit", exact: true }),
    ).toBeDisabled()
    await fits(page)
    await accessLabelsFit(page)
    await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click()
    await page.goto("http://localhost:5173/qms/organization")
    await page.getByRole("button", { name: "Revise scope", exact: true }).click()
    await fits(page)
    await page.getByRole("button", { name: "Cancel", exact: true }).click()
    await page.goto("http://localhost:5173/documents/QMS-MAN-001")
    await page.getByRole("button", { name: "View more revision updates", exact: true }).click()
    await fits(page)
    await page.getByRole("dialog").getByRole("button", { name: "Done", exact: true }).click()
    await page.getByRole("button", { name: "Suspend effectivity", exact: true }).click()
    await fits(page)
    await context.close()
  }
})
