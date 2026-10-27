import { test, expect } from "@playwright/test"

// ADR-041: platform team roles. Co-admins see deployments but can't deploy; nobody gives a role above their own.
test.beforeEach(async ({ page }) => {
  await page.context().route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
})

test("developer can deploy; co-admin sees deployments without deploy controls", async ({ page }) => {
  await page.goto("/platform/deployments")
  await expect(page.getByRole("button", { name: "Create sandbox" }).first()).toBeVisible()
  await page.getByLabel("Preview, view as").selectOption({ label: "View as Leo Navarro (Co-admin)" })
  await expect(page.getByText(/kept for the Developer/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Create sandbox" })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Ask to promote" })).toHaveCount(0)
  await page.goto("/platform/organisations/arden")
  await expect(page.getByRole("heading", { name: "Arden & Co." })).toBeVisible()
  await expect(page.getByRole("button", { name: /Deploy release/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /Roll back/ })).toHaveCount(0)
  await page.goto("/platform/requests")
  await expect(page.getByRole("heading", { name: "Requests" })).toBeVisible()
  await page.goto("/platform/ai")
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
})

test("co-admin can't invite a Developer; admin support can't see finance", async ({ page }) => {
  await page.goto("/platform/team")
  await page.getByLabel("Preview, view as").selectOption({ label: "View as Leo Navarro (Co-admin)" })
  await page.getByRole("button", { name: "Add team member" }).click()
  await expect(page.getByRole("option", { name: "Developer (above your role)" })).toBeDisabled()
  await page.getByLabel("Name").fill("Mia Cruz")
  await page.getByLabel("Work email").fill("mia.cruz@iqms.example")
  await page.getByLabel("Role").selectOption("Co-admin")
  await page.getByRole("button", { name: "Send invitation" }).click()
  await expect(page.getByText("Invitation sent to mia.cruz@iqms.example")).toBeVisible()

  await page.getByLabel("Preview, view as").selectOption({ label: "View as Ria Gomez (Admin support)" })
  const nav = page.getByRole("navigation", { name: "Platform" })
  await expect(nav.getByRole("link", { name: "Finance" })).toHaveCount(0)
  await expect(nav.getByRole("link", { name: /Support reports/ })).toBeVisible()
  await expect(page.getByRole("button", { name: "Add team member" })).toHaveCount(0)
})
