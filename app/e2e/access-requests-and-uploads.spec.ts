import { test, expect, type Page } from "@playwright/test"

const viewAs = async (page: Page, id: string) => {
  await page.goto("/")
  await page.evaluate((p) => localStorage.setItem("iqms.viewAs", p), id)
}
const notFound = (page: Page) => page.getByText("This page or record doesn’t exist")

test("top management sees the Overview's certification readiness through a role grant", async ({ page }) => {
  await viewAs(page, "p-en")
  await page.goto("/")
  await expect(page.locator("#readiness-title")).toHaveText("Certification readiness")

  // the grant is a setting, not a fixed list of roles: turning it off hides the section
  await viewAs(page, "p-al")
  await page.goto("/settings/roles/top")
  const grant = page.getByRole("switch", { name: "Sees certification readiness" })
  await expect(grant).toBeChecked()
  await grant.click()
  await page.getByRole("button", { name: "Save role" }).click()
  await viewAs(page, "p-en")
  await page.goto("/")
  await expect(page.locator("#readiness-title")).toHaveCount(0)
})

test("a shared record outside your processes can be requested; the process owner ticks what to share", async ({ page }) => {
  // Ben covers Operations only. The Public quality manual belongs to Leadership & planning.
  await viewAs(page, "p-bc")
  await page.goto("/documents/QMS-MAN-001")
  await expect(page.getByText("You don’t have access to QMS-MAN-001", { exact: true })).toBeVisible()
  await expect(page.getByText("Quality manual and QMS scope")).toHaveCount(0)

  // Confidential records never offer a request: they stay "not found"
  await page.goto("/documents/PUR-FRM-004")
  await expect(notFound(page)).toBeVisible()
  await expect(page.getByRole("button", { name: "Request access" })).toHaveCount(0)

  await page.goto("/documents/QMS-MAN-001")
  await page.getByRole("button", { name: "Request access" }).click()
  await page.getByRole("radio", { name: /Shared records in Leadership & planning/ }).click()
  await page.locator("#ar-note").fill("Preparing the line 2 audit.")
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.getByText("You asked Eric Navarro for access.", { exact: false })).toBeVisible()

  // Eric owns the process: the request is in his tasks, and he ticks what to share
  await viewAs(page, "p-en")
  await page.goto("/my-tasks")
  await page.getByRole("link", { name: /Ben Castillo asks for the shared records of Leadership & planning/ }).first().click()
  await expect(page.getByRole("heading", { name: "Access to Shared records in Leadership & planning", level: 1 })).toBeVisible()
  await page.getByRole("checkbox", { name: "Select all" }).click()
  await page.getByRole("checkbox", { name: "Select all" }).click()
  await page.getByRole("checkbox", { name: "Share QMS-MAN-001" }).click()
  await page.getByRole("button", { name: "Share 1 record" }).click()
  await expect(page.getByText("Granted", { exact: true })).toBeVisible()

  // Ben now opens the manual, and only what was ticked
  await viewAs(page, "p-bc")
  await page.goto("/documents/QMS-MAN-001")
  await expect(page.getByRole("heading", { name: "Quality manual and QMS scope", level: 1 })).toBeVisible()
})

test("a record request goes to the record owner, who can decline with a reason", async ({ page }) => {
  await viewAs(page, "p-bc")
  await page.goto("/documents/QMS-MAN-001")
  await page.getByRole("button", { name: "Request access" }).click()
  await page.getByRole("button", { name: "Send request" }).click()
  await expect(page.getByText("You asked Maria Santos for access.", { exact: false })).toBeVisible()

  await viewAs(page, "p-ms")
  await page.goto("/my-tasks")
  await page.getByRole("link", { name: /Ben Castillo asks to view QMS-MAN-001/ }).first().click()
  await page.getByRole("button", { name: "Decline", exact: true }).click()
  await page.locator("#ar-reason").fill("Ask Eric for the scope summary instead.")
  await page.getByRole("button", { name: "Decline request" }).click()
  await expect(page.getByText("Declined", { exact: true })).toBeVisible()

  await viewAs(page, "p-bc")
  await page.goto("/documents/QMS-MAN-001")
  await expect(page.getByRole("button", { name: "Request access" })).toBeVisible()
})

test("evidence takes uploads in folders; videos, .exe and files over 25 MB are refused; Confidential stays links", async ({ page }) => {
  await viewAs(page, "p-ms")
  await page.goto("/evidence")
  await page.getByRole("button", { name: "Add evidence" }).first().click()
  await page.locator("#ev-title").fill("Calibration certificates, October")
  await page.getByLabel("Folder for the next files and links").fill("Calibration/2026/Q4")
  await page.getByTestId("ev-files-input").setInputFiles([
    { name: "torque-wrench-01.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 sample") },
    { name: "line-2-walkthrough.mp4", mimeType: "video/mp4", buffer: Buffer.from("not really a video") },
    { name: "setup.exe", mimeType: "application/octet-stream", buffer: Buffer.from("MZ") },
  ])
  await expect(page.getByText("2 files weren’t added.", { exact: false })).toBeVisible()
  const tree = page.getByRole("list", { name: "Files and links in this evidence" })
  await expect(tree.getByText("Calibration", { exact: true })).toBeVisible()
  await expect(tree.getByText("Q4", { exact: true })).toBeVisible()
  await expect(tree.getByText("torque-wrench-01.pdf")).toBeVisible()
  await expect(tree.getByText("line-2-walkthrough.mp4")).toHaveCount(0)

  await page.getByTestId("ev-files-input").setInputFiles({ name: "scan.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(25 * 1024 * 1024 + 1) })
  await expect(page.getByText("Files can be up to 25 MB", { exact: false })).toBeVisible()

  // Confidential evidence can't keep uploaded files
  await page.locator("#ev-cls").selectOption("Confidential")
  await expect(page.getByRole("button", { name: "Upload files" })).toHaveCount(0)
  await page.getByRole("button", { name: "Add evidence", exact: true }).last().click()
  await expect(page.getByText("Confidential evidence stays as links.", { exact: false })).toBeVisible()

  await page.locator("#ev-cls").selectOption("Internal")
  await page.getByRole("button", { name: "Add evidence", exact: true }).last().click()
  await expect(page.getByText(/EV-\d+ added/).first()).toBeVisible()
})

test("Public and Internal documents can be uploaded instead of linked; Confidential ones can't", async ({ page }) => {
  await viewAs(page, "p-ms")
  await page.goto("/documents")
  await page.getByRole("button", { name: "Add document" }).first().click()
  await page.getByRole("radio", { name: /Upload it/ }).click()
  await page.getByTestId("doc-file-input").setInputFiles({ name: "receiving-inspection.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4 sample") })
  await expect(page.getByText("receiving-inspection.pdf")).toBeVisible()
  await page.locator("#doc-title").fill("Receiving inspection")
  await page.locator("#doc-desc").fill("How incoming parts are checked before they are stored.")
  await page.getByRole("button", { name: "Save as draft" }).click()
  await expect(page.getByText(/saved as a draft/).first()).toBeVisible()

  await page.getByRole("button", { name: "Add document" }).first().click()
  await page.getByRole("radio", { name: /^Confidential/ }).click()
  await expect(page.getByRole("radio", { name: /Upload it/ })).toHaveCount(0)
  await expect(page.locator("#doc-link")).toBeVisible()
})
