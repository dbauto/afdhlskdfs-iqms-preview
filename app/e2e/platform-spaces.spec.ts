import { test, expect, type Page } from "@playwright/test"

// Developer console (/platform) and business space (/business): who gets in, and what a new account means.
// All of this is a preview simulation; nothing is deployed.

async function viewAs(page: Page, label: RegExp) {
  await page.getByLabel("Preview, view console as").selectOption({ label: (await page.getByLabel("Preview, view console as").locator("option").allTextContents()).find((t) => label.test(t))! })
}

test.beforeEach(async ({ page, context }) => {
  await context.route("https://fonts.googleapis.com/**", (r) => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
  await page.goto("/platform")
  await page.evaluate(() => {
    localStorage.removeItem("thryvems.platform.v1")
    localStorage.removeItem("thryvems.platform.viewAs")
  })
  await page.goto("/platform")
})

test("a client user can open neither the console nor the business space", async ({ page }) => {
  await viewAs(page, /A client user/)
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Platform" })).toHaveCount(0)
  await page.goto("/business")
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
})

test("a partner can't open the developer console", async ({ page }) => {
  await viewAs(page, /Mara Villanueva/)
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
  await page.goto("/platform/team")
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
})

test("a partner sees only their own clients and is denied another partner's client", async ({ page }) => {
  await viewAs(page, /Mara Villanueva/)
  await page.goto("/business")
  const table = page.getByRole("table")
  await expect(table.getByRole("link", { name: "Arden & Co." })).toBeVisible()
  await expect(table.getByRole("link", { name: "Harbor Labs" })).toBeVisible()
  await expect(table.getByText("Pacific Freight")).toHaveCount(0)
  await expect(table.getByText("Northwind Foods")).toHaveCount(0)
  // No technical detail in the business space
  await expect(page.getByText("Health, last 24 h")).toHaveCount(0)
  await expect(page.getByRole("link", { name: "Logs" })).toHaveCount(0)

  await page.goto("/business/clients/pacfreight")
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
  await page.goto("/business/clients/arden")
  await expect(page.getByRole("heading", { name: "Arden & Co." })).toBeVisible()

  await viewAs(page, /Tomas Aguilar/)
  await expect(page.getByRole("heading", { name: "This page or record doesn’t exist" })).toBeVisible()
  await page.goto("/business")
  await expect(page.getByRole("table").getByRole("link", { name: "Pacific Freight" })).toBeVisible()
  await expect(page.getByRole("table").getByText("Arden & Co.")).toHaveCount(0)
})

test("creating an organisation creates an account only, not a deployment, and survives a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Create organisation" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("It doesn’t deploy anything")).toBeVisible()
  await dialog.getByLabel("Company name").fill("Sample Widgets")
  await dialog.getByLabel("Email domain").fill("samplewidgets.example")
  await dialog.getByLabel("Client admin email").fill("admin@samplewidgets.example")
  await dialog.getByLabel("Business partner").selectOption({ label: "Mara Villanueva" })
  await dialog.getByRole("button", { name: "Create organisation" }).click()
  await expect(page.getByText("Sample Widgets account created")).toBeVisible()
  await expect(page.getByText(/No workspace or database has been deployed/)).toBeVisible()

  await page.reload()
  const row = page.getByRole("row").filter({ hasText: "Sample Widgets" })
  await expect(row.getByText("Not provisioned")).toBeVisible()
  await expect(row.getByText("Not checked")).toBeVisible()
  await expect(row.getByText("Invited when live")).toBeVisible()
  await expect(row.getByText("Healthy")).toHaveCount(0)

  // Same domain twice is refused with a reason
  await page.getByRole("button", { name: "Create organisation" }).click()
  await page.getByRole("dialog").getByLabel("Company name").fill("Duplicate")
  await page.getByRole("dialog").getByLabel("Email domain").fill("samplewidgets.example")
  await page.getByRole("dialog").getByRole("button", { name: "Create organisation" }).click()
  await expect(page.getByRole("dialog").getByText("already exists")).toBeVisible()
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click()

  // The assigned partner now sees it, marked not live
  await viewAs(page, /Mara Villanueva/)
  await page.goto("/business")
  await expect(page.getByRole("row").filter({ hasText: "Sample Widgets" }).getByText("Not live yet")).toBeVisible()
})

test("plan and seat changes need a reason and are kept after reload", async ({ page }) => {
  await page.getByRole("button", { name: "Actions for Pacific Freight" }).click()
  await page.getByRole("menuitem", { name: "Change plan or seats" }).click()
  const sheet = page.getByRole("dialog")
  await sheet.getByLabel("Seats").fill("60")
  await sheet.getByRole("button", { name: "Save plan and seats" }).click()
  await expect(sheet.getByText("Say why the plan or seats change.")).toBeVisible()
  await sheet.getByLabel("Seats").fill("10")
  await sheet.getByLabel("Reason").fill("Client asked for more seats")
  await sheet.getByRole("button", { name: "Save plan and seats" }).click()
  await expect(sheet.getByText(/can’t be lower than the 44 people/)).toBeVisible()
  await sheet.getByLabel("Seats").fill("60")
  await sheet.getByRole("button", { name: "Save plan and seats" }).click()
  await page.reload()
  await expect(page.getByRole("row").filter({ hasText: "Pacific Freight" }).getByText("44 of 60")).toBeVisible()
})

test("platform team changes are real and keep at least one platform admin", async ({ page }) => {
  await page.goto("/platform/team")
  await page.getByRole("button", { name: "Add team member" }).click()
  await page.getByRole("dialog").getByLabel("Name").fill("Sample Engineer")
  await page.getByRole("dialog").getByLabel("Email").fill("sample.engineer@platform.example")
  await page.getByRole("dialog").getByRole("button", { name: "Add team member" }).click()
  await expect(page.getByRole("row").filter({ hasText: "Sample Engineer" })).toBeVisible()

  await page.getByRole("button", { name: "Actions for Leo Navarro" }).click()
  await page.getByRole("menuitem", { name: "Remove access" }).click()
  await page.getByRole("dialog").getByLabel("Reason").fill("Test")
  await page.getByRole("dialog").getByRole("button", { name: "Remove access" }).click()
  await expect(page.getByRole("dialog").getByText("You can’t remove your own access.")).toBeVisible()
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click()

  await page.reload()
  await expect(page.getByRole("row").filter({ hasText: "Sample Engineer" })).toBeVisible()
  await expect(page.getByRole("row").filter({ hasText: "Mara Villanueva" }).getByText("Arden & Co., Harbor Labs")).toBeVisible()
})

test("requests stay decided after reload and a declined one can be reopened", async ({ page }) => {
  await page.goto("/platform/requests")
  await page.getByRole("button", { name: "Approve 20 seats" }).click()
  await page.getByRole("button", { name: "Decline" }).first().click()
  await page.reload()
  await expect(page.getByText("Seats raised to 240")).toBeVisible()
  await expect(page.getByText("Declined")).toBeVisible()
  await page.getByRole("button", { name: "Undo" }).click()
  await expect(page.getByText("Declined")).toHaveCount(0)
  await page.goto("/platform")
  await expect(page.getByRole("row").filter({ hasText: "Northwind Foods" }).getByText("212 of 240")).toBeVisible()
})
