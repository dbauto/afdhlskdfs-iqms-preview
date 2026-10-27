import { test, expect, type Page } from "@playwright/test"

// ADR-038: problem reports need a screenshot and a description; the console shows them and follows the client sidebar.

// a real 2×2 PNG
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==", "base64")

async function quiet(page: Page) {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
  const errors: string[] = []
  page.on("pageerror", (e) => errors.push(e.message))
  return errors
}

test("a problem report can't be sent without a screenshot and the screenshot check", async ({ page }) => {
  const errors = await quiet(page)
  await page.goto("/settings/support")
  await page.getByLabel("In a few words").fill("Upload stops at 100%")
  await page.getByLabel("What happened").fill("I chose the Excel file, the bar reached 100% and nothing happened.")
  await page.getByRole("button", { name: "Send report" }).click()
  await expect(page.getByText("Add a screenshot of the problem.")).toBeVisible()

  await page.getByLabel("Choose screenshot files").setInputFiles({ name: "stuck.png", mimeType: "image/png", buffer: PNG })
  await expect(page.getByRole("img", { name: /Screenshot 1, stuck\.jpg/ })).toBeVisible()
  await page.getByRole("button", { name: "Send report" }).click()
  await expect(page.getByText("Confirm you checked the screenshots before sending.")).toBeVisible()

  await page.getByText("I checked my screenshots").click()
  await page.getByRole("button", { name: "Send report" }).click()
  await expect(page.getByText(/Report SR-\d+ sent/)).toBeVisible()
  await expect(page.getByText(/1 screenshot/)).toBeVisible()
  expect(errors).toEqual([])
})

test("non-pictures and questions are handled", async ({ page }) => {
  await quiet(page)
  await page.goto("/settings/support")
  await page.getByLabel("Choose screenshot files").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") })
  await expect(page.getByText("notes.txt isn’t a picture.")).toBeVisible()
  await page.getByLabel("What is it about").selectOption("Question")
  await expect(page.getByText("Screenshots (optional)")).toBeVisible()
})

test("console uses the client sidebar layout and shows report screenshots", async ({ page }) => {
  const errors = await quiet(page)
  await page.goto("/platform")
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible()
  const nav = page.getByRole("navigation", { name: "Platform" })
  await expect(nav.getByRole("button", { name: "Collapse sidebar" })).toBeVisible()
  await expect(nav.getByRole("link", { name: "Settings" })).toBeVisible()
  await expect(page.getByText("Required reports")).toBeVisible()

  await nav.getByRole("link", { name: /Security scans/ }).click()
  await expect(page.getByRole("heading", { name: "Security scans" })).toBeVisible()
  await nav.getByRole("link", { name: "AI assistants" }).click()
  await expect(page.getByRole("heading", { name: "AI assistants" })).toBeVisible()
  await expect(page.getByText("••••••••••••3f9a")).toBeVisible()

  await nav.getByRole("link", { name: /Support reports/ }).click()
  await page.getByRole("button", { name: /SR-1042/ }).click()
  await expect(page.getByRole("button", { name: /Open screenshot 1/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "Draft a reply" })).toBeDisabled()
  await page.getByRole("button", { name: "Mark as checked" }).click()
  await page.getByRole("button", { name: "Draft a reply" }).click()
  await expect(page.getByLabel("Reply")).not.toHaveValue("")

  await page.goto("/platform/organisations/arden")
  await expect(page.getByRole("heading", { name: "Arden & Co." })).toBeVisible()
  await expect(page.getByText("Needs client OK").first()).toBeVisible()
  expect(errors).toEqual([])
})

for (const width of [390, 768, 1280, 1920]) {
  test(`no horizontal scroll on console overview and support at ${width}px`, async ({ page }) => {
    await quiet(page)
    await page.setViewportSize({ width, height: 900 })
    for (const path of ["/platform", "/platform/ai", "/platform/scans", "/settings/support"]) {
      await page.goto(path)
      await page.waitForLoadState("networkidle")
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, path).toBeLessThanOrEqual(1)
    }
  })
}
