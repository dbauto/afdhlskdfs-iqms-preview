import { test, expect } from "@playwright/test"
import fs from "node:fs/promises"
import path from "node:path"

test("new-tab links keep readable wide/narrow layouts in both themes and all required viewports", async ({
  browser,
}, info) => {
  test.setTimeout(180_000)
  const output = process.env.NEW_TAB_SCREENSHOT_DIR
    ? path.resolve(process.env.NEW_TAB_SCREENSHOT_DIR)
    : info.outputPath("screenshots")
  await fs.mkdir(output, { recursive: true })
  const sources = [
    ...(process.env.BASELINE_APP
      ? [{ name: "before", url: "http://localhost:5174" }]
      : []),
    { name: "after", url: "http://localhost:5173" },
  ]
  const sizes = [
    { name: "1440", width: 1440, height: 900, scale: 1 },
    { name: "1280-150pct", width: 853, height: 433, scale: 1.5 },
    { name: "768", width: 768, height: 1024, scale: 1 },
    { name: "390", width: 390, height: 844, scale: 1 },
  ]
  const matrix = []
  for (const source of sources)
    for (const who of ["p-ms", "p-bc"])
      for (const theme of ["Light", "Dark"])
        for (const size of sizes) {
          const context = await browser.newContext({
            viewport: { width: size.width, height: size.height },
            deviceScaleFactor: size.scale,
          })
          await context.addInitScript(
            ({ who, theme }) => {
              localStorage.setItem("iqms.viewAs", who)
              localStorage.setItem("iqms.appearance", theme)
            },
            { who, theme },
          )
          const page = await context.newPage(),
            errors: string[] = []
          page.on("pageerror", (e) => errors.push(e.message))
          for (const [screen, route] of [
            ["overview", "/"],
            ["evidence", "/evidence/EV-0214"],
          ]) {
            await page.goto(source.url + route)
            await page.locator("main").waitFor()
      if (screen === "evidence") await expect(page.getByRole("heading", { name: "Production plan, week 41", exact: true })).toBeVisible()
            await page.evaluate(() => document.fonts.ready)
            expect(
              await page.evaluate(() =>
                document.fonts.check('14px "Public Sans"'),
              ),
            ).toBe(true)
            expect(
              await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
              ),
            ).toBe(true)
            if (source.name === "after" && screen === "overview")
              await expect(
                page.locator('main a[href="/documents/reviews"]'),
              ).toHaveAttribute("target", "_blank")
            const filename = `${source.name}-${screen}-${who}-${theme.toLowerCase()}-${size.name}.jpg`
            await page.screenshot({
              path: path.join(output, filename),
              type: "jpeg",
              quality: 74,
              fullPage: true,
            })
            matrix.push({
              source: source.name,
              screen,
              who,
              theme,
              viewport: [size.width, size.height],
              deviceScaleFactor: size.scale,
              filename,
            })
          }
          expect(errors).toEqual([])
          await context.close()
        }
  const wide = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    }),
    page = await wide.newPage()
  for (const route of ["/", "/documents", "/evidence/EV-0214"]) {
    await page.goto("http://localhost:5173" + route)
    await page.locator("main").waitFor()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true)
  }
  await wide.close()
  await fs.writeFile(
    path.join(output, "matrix.json"),
    JSON.stringify(
      {
        baseline: "66442d17fd449c424bf744274d94786f83244b6e",
        matrix,
        extraWidth: 1920,
      },
      null,
      2,
    ),
  )
})
