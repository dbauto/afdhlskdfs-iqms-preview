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
