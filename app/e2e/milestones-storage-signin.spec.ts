import { expect, test } from "@playwright/test"

test("milestones show in Certification readiness and list by stage", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-al"))
  await page.goto("/")
  const strip = page.getByRole("region", { name: "Milestones" })
  await expect(strip).toContainText(/\d+ of 19/)
  await expect(strip).toContainText("Next:")
  await page.goto("/readiness?tab=milestones")
  for (const s of ["Getting set up", "Building the system", "Running it", "Certification"]) await expect(page.getByText(s, { exact: true })).toBeVisible()
  await expect(page.getByText("Stage 1 audit passed")).toBeVisible()
})

test("Settings › Storage shows usage, status and the largest files to admins only", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-al"))
  await page.goto("/settings/storage")
  await expect(page.getByRole("heading", { name: "Storage", level: 1 })).toBeVisible()
  await expect(page.getByText("Healthy").first()).toBeVisible()
  await expect(page.getByText(/of 25\.00 GB/)).toBeVisible()
  await expect(page.getByRole("table", { name: "Largest files" }).or(page.getByText("Largest files")).first()).toBeVisible()
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-bc"))
  await page.goto("/settings")
  await expect(page.getByRole("link", { name: "Storage", exact: true })).toHaveCount(0)
})

test("sign-in shows the product preview from the website", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto("/sign-in")
  await expect(page.getByText("Quality, made workable.")).toBeVisible()
  await expect(page.getByText("ISO 9001 readiness")).toBeVisible()
})

test("sign-in offers Google; Google never creates an account", async ({ page }) => {
  await page.goto("/sign-in")
  await page.getByRole("link", { name: "Continue with Google" }).click()
  await expect(page.getByRole("heading", { name: "Signing in with Google" })).toBeVisible()
  await page.getByRole("button", { name: /Google account has no ThryveMS account/ }).click()
  await expect(page.getByRole("heading", { name: "You don’t have a ThryveMS account yet" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Request access" })).toBeVisible()
})

test("every part of the readiness gauge shows its value on hover, including Done and Ready to confirm", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-al"))
  await page.goto("/")
  for (const name of [/^Done: /, /^Ready to confirm: /]) {
    await page.getByRole("img", { name }).hover()
    await expect(page.getByRole("tooltip")).toContainText(/requirements/)
    await page.mouse.move(0, 0)
  }
})
