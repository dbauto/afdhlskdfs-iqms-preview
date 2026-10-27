import { test, expect } from "@playwright/test"

// ADR-039: Finance page, AI support switch, Messenger alerts.
test("finance, AI support switch and Messenger alerts", async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))

  await page.goto("/platform")
  const nav = page.getByRole("navigation", { name: "Platform" })
  await nav.getByRole("link", { name: "Finance" }).click()
  await expect(page.getByRole("heading", { name: "Finance", exact: true })).toBeVisible()
  await expect(page.getByText("Output VAT 12% to report")).toBeVisible()
  await page.getByRole("button", { name: /Not paid/ }).click()
  await expect(page.getByRole("button", { name: "Send reminder" }).first()).toBeVisible()

  await nav.getByRole("link", { name: /Support reports/ }).click()
  await expect(page.getByText("AI support is on")).toBeVisible()
  await page.getByRole("switch").first().click()
  await expect(page.getByText("AI support is off")).toBeVisible()
  await page.getByRole("button", { name: /SR-1042/ }).click()
  await expect(page.getByText("AI support is turned off for everyone.")).toBeVisible()
  await page.keyboard.press("Escape")

  await page.goto("/platform/settings")
  await page.getByRole("button", { name: "Connect Messenger" }).click()
  await expect(page.getByText(/Paste the whole Page access token/)).toBeVisible()
  await page.getByLabel("Page access token").fill("EAAG" + "x".repeat(40) + "9f2c")
  await page.getByLabel("Facebook Page ID").fill("104857362918274")
  await page.getByLabel("Your Messenger ID for this Page").fill("6283015749261840")
  await page.getByRole("button", { name: "Connect Messenger" }).click()
  await expect(page.getByText("••••••••••••9f2c")).toBeVisible()
  await expect(page.getByRole("button", { name: "Send test message" })).toBeVisible()
  expect(errors).toEqual([])
})

for (const width of [390, 768, 1280, 1920]) {
  test(`no horizontal scroll on finance and settings at ${width}px`, async ({ page }) => {
    await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
    await page.setViewportSize({ width, height: 900 })
    for (const path of ["/platform/finance", "/platform/settings", "/platform/reports"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1)
    }
  })
}
