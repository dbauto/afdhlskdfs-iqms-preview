import { test, expect } from "@playwright/test"

test("process covers are gone: no cover on the process page and no covers layout", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-ms"))
  await page.goto("/settings/appearance")
  await expect(page.getByRole("radio", { name: /Cards with covers/ })).toHaveCount(0)
  await expect(page.getByRole("radio", { name: /Cards with actions/ })).toBeVisible()
  await page.goto("/qms/processes/operations")
  await expect(page.getByRole("heading", { name: "Operations", level: 1 })).toBeVisible()
  await expect(page.getByRole("button", { name: "Change cover" })).toHaveCount(0)
})

test("the Processes page has two layouts, chosen in Appearance; cards with actions is the default", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-cm"))
  await page.goto("/qms/processes")
  // default: cards with actions, with figures and quick links
  const card = page.getByRole("article", { name: "Operations", exact: true })
  await expect(card).toBeVisible()
  await expect(card.getByText("Open NCs")).toBeVisible()
  await expect(card.getByText("Next audit")).toBeVisible()
  await card.getByRole("button", { name: "More actions for Operations" }).click()
  await page.getByRole("menuitem", { name: "Nonconformities" }).click()
  await expect(page).toHaveURL(/\/qms\/processes\/operations\?tab=ncs/)
  await expect(page.getByRole("tab", { name: /Nonconformities/, selected: true })).toBeVisible()

  await page.goto("/qms/processes")
  await page.getByRole("searchbox", { name: "Search processes" }).fill("zzz")
  await expect(page.getByText("No processes match “zzz”.")).toBeVisible()

  // grouped list
  // "Change layout" opens Appearance in a new tab, like every content link (ADR-027)
  await expect(page.getByRole("link", { name: /Change layout/ })).toHaveAttribute("href", /\/settings\/appearance$/)
  await page.goto("/settings/appearance")
  await page.getByRole("radio", { name: /Grouped list/ }).click()
  await expect(page.getByRole("radio", { name: /Grouped list/ })).toHaveAttribute("aria-checked", "true")
  await page.reload()
  await expect(page.getByRole("radio", { name: /Grouped list/ })).toHaveAttribute("aria-checked", "true")
  await page.goto("/qms/processes")
  await expect(page.getByRole("list", { name: "Core processes" }).getByRole("link", { name: /^Operations,/ })).toBeVisible()
  await expect(page.getByRole("article")).toHaveCount(0)
})
