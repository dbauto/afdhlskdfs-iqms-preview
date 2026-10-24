import { test, expect } from "@playwright/test"

test("navigation stays in same tab within a menu and uses a new tab across menus", async ({ page, context }) => {
  await page.goto("/documents")
  const document = page.locator('a[href^="/documents/"]').first()
  await expect(document).toBeVisible()
  await expect(document).not.toHaveAttribute("target", "_blank")
  const href = await document.getAttribute("href")
  await document.click()
  await expect(page).toHaveURL(new RegExp((href ?? "").replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&") + "$"))
  await page.goto("/documents")
  const cross = page.locator('a[href^="/evidence/"]').first()
  if (await cross.count()) {
    await expect(cross).toHaveAttribute("target", "_blank")
    await expect(cross).toHaveAttribute("rel", /noopener/)
  }
  expect(context.pages().length).toBe(1)
})

test("certification evidence can be folded and opened", async ({ page }) => {
  await page.goto("/")
  const summary = page.locator("summary", { hasText: "Evidence by ISO 9001 clause" })
  await expect(summary).toBeVisible()
  const disclosure = summary.locator("..")
  await expect(disclosure).toHaveAttribute("open", "")
  await summary.click()
  await expect(disclosure).not.toHaveAttribute("open", "")
  await summary.click()
  await expect(disclosure).toHaveAttribute("open", "")
})

test("native dropdown searches option labels while preserving the selected value", async ({ page }) => {
  await page.goto("/readiness")
  await page.getByRole("button", { name: "Add requirement" }).click()
  const select = page.locator("#rq-c")
  const before = await select.inputValue()
  await page.getByRole("button", { name: "Search dropdown options" }).first().click()
  const search = page.getByRole("textbox", { name: "Search options" })
  await expect(search).toBeVisible()
  await search.fill("leadership")
  const options = page.getByRole("listbox", { name: "Matching options" }).getByRole("option")
  await expect(options.first()).toBeVisible()
  await options.first().click()
  await expect(select).not.toHaveValue(before)
})

test("actual certification overview is responsive in both themes and both role scopes", async ({ page }, info) => {
  test.setTimeout(120_000)
  for (const size of [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1280, h: 650 }, { w: 1440, h: 900 }, { w: 1920, h: 1080 }]) {
    await page.setViewportSize({ width: size.w, height: size.h })
    for (const appearance of ["Light", "Dark"]) {
      for (const userId of ["p-al", "p-bc"]) {
        await page.goto("/")
        await page.evaluate(({ theme, who }) => {
          localStorage.setItem("iqms.appearance", theme)
          localStorage.setItem("iqms.viewAs", who)
        }, { theme: appearance, who: userId })
        await page.reload()
        await expect(page.getByRole("main")).toBeVisible()
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `Page overflow at ${size.w}, ${appearance}, ${userId}`).toBeLessThanOrEqual(1)
        await page.screenshot({
          path: info.outputPath(`certification-${size.w}-${appearance.toLowerCase()}-${userId}.png`),
          fullPage: true,
          animations: "disabled",
        })
      }
    }
  }
})
