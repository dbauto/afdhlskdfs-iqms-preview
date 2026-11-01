import { test, expect } from "@playwright/test"

// ADR-047: Microsoft Entra ID shown as a future sign-in provider, not configured, with WorkOS kept.
test.beforeEach(async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
})

for (const who of ["View as Danica (Developer)", "View as Ria Gomez (Admin support)"]) {
  test(`console settings show Entra as not configured and WorkOS as available (${who})`, async ({ page }) => {
    await page.goto("/platform/settings")
    await page.getByLabel("Preview, view as").selectOption({ label: who })
    const card = page.locator('section[aria-label="Sign-in providers"]')
    await expect(card).toBeVisible()
    const entra = card.locator('section[aria-label="Microsoft Entra ID"]')
    await expect(entra).toContainText("Not configured")
    await expect(entra).toContainText("Microsoft sign-in can be set up later")
    await expect(entra).not.toContainText("Connected")
    // nothing to type: no client ID, secret or certificate fields, and no connect button
    await expect(card.locator("input, textarea")).toHaveCount(0)
    await expect(card.getByRole("button")).toHaveCount(0)
    await expect(card.locator('section[aria-label="WorkOS"]')).toContainText("Available")
    // nothing about Entra is kept in browser storage
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }).toLowerCase())
    expect(stored).not.toContain("entra")
    expect(stored).not.toContain("client_secret")
  })
}

test("client settings keep the single Microsoft 365 card and no Entra provider section", async ({ page }) => {
  await page.goto("/settings/integrations")
  await expect(page.getByText("Microsoft 365", { exact: true }).first()).toBeVisible()
  await expect(page.getByText("Microsoft Entra ID")).toHaveCount(0)
})
