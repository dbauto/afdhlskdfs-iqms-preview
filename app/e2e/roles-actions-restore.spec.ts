import { expect, test, type Page } from "@playwright/test"

async function viewAs(page: Page, id: string) {
  await page.goto("/")
  await page.evaluate((v) => localStorage.setItem("iqms.viewAs", v), id)
}

test("top management can start a management review; switching the action off removes it", async ({ page }) => {
  await viewAs(page, "p-en")
  await page.goto("/management-review")
  await expect(page.getByRole("button", { name: /Start a review|Start an ISO 9001 review/ }).first()).toBeVisible()

  await viewAs(page, "p-al")
  await page.goto("/settings/roles/top")
  await page.getByRole("navigation", { name: "Parts of ThryveMS" }).getByRole("button", { name: /Management Review/ }).click()
  const start = page.getByRole("switch", { name: "Start a review" })
  await expect(start).toBeChecked()
  await start.click()
  await expect(page.getByText("Custom").first()).toBeVisible()
  await page.getByRole("button", { name: "Save role" }).click()

  await viewAs(page, "p-en")
  await page.goto("/management-review")
  await expect(page.getByRole("button", { name: /Start a review|Start an ISO 9001 review/ })).toHaveCount(0)
})

test("roles can only be given up to your own access", async ({ page }) => {
  await viewAs(page, "p-al")
  await page.goto("/settings/roles/quality")
  await page.getByRole("checkbox", { name: "Users and access" }).click()
  await page.getByRole("button", { name: "Save role" }).click()

  await viewAs(page, "p-ms")
  await page.goto("/settings/users")
  await expect(page.getByRole("heading", { name: "Users and access", level: 1 })).toBeVisible()
  await page.getByPlaceholder("Filter by name or email").fill("Ben Castillo")
  const role = page.getByRole("combobox", { name: "Role for Ben Castillo" })
  await expect(role).toBeVisible()
  await expect(role.locator("option", { hasText: "Administrator" })).toHaveCount(0)
  await page.getByPlaceholder("Filter by name or email").fill("Aaron Lim")
  await expect(page.getByRole("combobox", { name: "Role for Aaron Lim" })).toBeDisabled()
})

test("a file deleted in Storage waits in Deleted and can be restored", async ({ page }) => {
  await viewAs(page, "p-al")
  await page.goto("/settings/storage")
  await page.getByRole("button", { name: "More actions for Calibration certificates 2026.pdf" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("button", { name: "Delete", exact: true }).click()
  await expect(page.getByRole("button", { name: "More actions for Calibration certificates 2026.pdf" })).toHaveCount(0)
  await page.getByRole("button", { name: /^Deleted/ }).click()
  await expect(page.getByText("Calibration certificates 2026.pdf", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Restore" }).click()
  await page.getByRole("button", { name: /^All/ }).first().click()
  await expect(page.getByRole("button", { name: "More actions for Calibration certificates 2026.pdf" })).toBeVisible()
})
