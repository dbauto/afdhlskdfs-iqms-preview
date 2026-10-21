import { test, expect } from "@playwright/test"

test("certification dates are set in Settings; recertification skips Stage 1 unless needed; the Overview follows", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-ms"))
  await page.goto("/")
  const dates = page.getByRole("heading", { name: "Audit dates" }).locator("..")
  await expect(dates).toContainText("Mock audit")
  await expect(dates).toContainText("Stage 1 audit")
  await expect(dates).toContainText("Stage 2 audit")

  await page.goto("/settings/certification")
  await page.getByRole("radio", { name: /Recertification/ }).click()
  await expect(page.locator("#cert-stage1")).toHaveCount(0)
  await page.locator("#cert-main").fill("2027-03-10")
  await page.locator("#cert-expiry").fill("2027-04-30")
  await page.locator("#cert-body").fill("Example Registrar Ltd.")
  await page.getByRole("button", { name: "Save certification" }).click()
  await page.reload()
  await expect(page.getByRole("radio", { name: /Recertification/ })).toHaveAttribute("aria-checked", "true")

  await page.goto("/")
  await expect(dates).toContainText("Recertification audit")
  await expect(dates).toContainText("Certificate expires")
  await expect(dates).not.toContainText("Stage 1")

  // significant changes: Stage 1 comes back
  await page.goto("/settings/certification")
  await page.locator("#cert-s1").click()
  await page.locator("#cert-stage1").fill("2027-02-15")
  await page.getByRole("button", { name: "Save certification" }).click()
  await page.goto("/readiness")
  await expect(page.getByText("Example Registrar Ltd.").first()).toBeVisible()
  await expect(page.getByText("Stage 1 audit (significant changes)").first()).toBeVisible()
})
