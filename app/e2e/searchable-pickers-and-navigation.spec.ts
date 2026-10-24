import { test, expect } from "@playwright/test"

test("certification evidence clauses can be expanded and collapsed", async ({ page }) => {
  await page.goto("/")
  const group = page.getByTestId("readiness-evidence-clauses")
  await expect(group).toBeVisible()
  await expect(group).not.toHaveAttribute("open", "")
  await group.locator("summary").click()
  await expect(group).toHaveAttribute("open", "")
  await expect(group.locator('li')).not.toHaveCount(0)
  await group.locator("summary").click()
  await expect(group).not.toHaveAttribute("open", "")
})

test("native dropdown keyword search chooses an ISO clause and keeps its actual form value", async ({ page }) => {
  await page.goto("/readiness")
  await page.getByRole("button", { name: "Add requirement" }).click()
  const clause = page.locator("#rq-c")
  await clause.locator("xpath=..").getByRole("button", { name: "Search dropdown options" }).click()
  const query = page.getByRole("searchbox", { name: "Search options" })
  await query.fill("4.1")
  await expect(page.getByRole("menuitem", { name: /4\.1/ })).toBeVisible()
  await page.getByRole("menuitem", { name: /4\.1/ }).first().click()
  await expect(clause).toHaveValue("4.1")
})

test("process multi-select filters available processes by a typed keyword", async ({ page }) => {
  await page.goto("/evidence")
  await page.getByRole("button", { name: "Add evidence" }).click()
  await page.getByRole("button", { name: "Processes", exact: true }).click()
  await page.getByRole("textbox", { name: "Search processes" }).fill("Purchasing")
  await expect(page.getByRole("menuitemcheckbox", { name: "Purchasing & suppliers" })).toBeVisible()
  await expect(page.getByRole("menuitemcheckbox", { name: "Operations", exact: true })).toHaveCount(0)
  await page.getByRole("menuitemcheckbox", { name: "Purchasing & suppliers" }).click()
  await expect(page.getByRole("list", { name: "Processes, chosen" })).toContainText("Purchasing & suppliers")
})

test("document details stay in their menu, but linked evidence opens a new tab", async ({ page }) => {
  await page.goto("/documents")
  const doc = page.locator('main a[href="/documents/QMS-MAN-001"]').first()
  await expect(doc).toBeVisible()
  await expect(doc).not.toHaveAttribute("target", "_blank")
  await doc.click()
  await expect(page).toHaveURL(/\/documents\/QMS-MAN-001$/)
  const evidence = page.locator('main a[href^="/evidence/"]').first()
  await expect(evidence).toBeVisible()
  await expect(evidence).toHaveAttribute("target", "_blank")
  await expect(evidence).toHaveAttribute("rel", /noopener/)
})
