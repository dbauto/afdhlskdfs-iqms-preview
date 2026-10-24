import { expect, test } from "@playwright/test"

const sizes = [
  { label: "wide", width: 1920, height: 1080 },
  { label: "desktop", width: 1440, height: 900 },
  { label: "compact", width: 1280, height: 650 },
  { label: "tablet", width: 768, height: 1024 },
  { label: "mobile", width: 390, height: 844 },
] as const

const areas = [
  "Overview", "QMS", "Organization & Scope", "Policies", "Processes",
  "Objectives & KPIs", "Documents", "Risks & Opportunities", "Evidence",
  "Audits", "Management Review", "Corrective Action", "Settings",
]

for (const size of sizes) {
  for (const appearance of ["Light", "Dark"] as const) {
    test(`Role rows, edit actions and process scopes at ${size.label} in ${appearance.toLowerCase()} mode`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: size.width, height: size.height })
      await page.goto("/")
      await page.evaluate((theme) => {
        localStorage.setItem("iqms.viewAs", "p-al")
        localStorage.setItem("iqms.appearance", theme)
      }, appearance)
      await page.goto("/settings/roles")

      const region = page.getByRole("region", { name: "Role permissions matrix" })
      const matrix = region.getByRole("table")
      const scopeCard = page.locator('section[data-slot="card"]').filter({
        has: page.getByRole("heading", { name: "Applies to", exact: true }),
      })

      await expect(matrix).toBeVisible()
      await expect(matrix.getByRole("columnheader")).toHaveCount(areas.length + 1)
      await expect(matrix.getByRole("rowheader")).toHaveCount(9)
      await expect(matrix.getByRole("columnheader", { name: "Roles", exact: true })).toBeVisible()
      for (const area of areas) {
        await expect(matrix.getByRole("columnheader", { name: area, exact: true })).toHaveCount(1)
      }
      const firstRole = matrix.getByRole("row").nth(1)
      await expect(firstRole.getByRole("rowheader")).toContainText("Viewer")
      await expect(firstRole.getByRole("cell")).toHaveCount(areas.length)
      await expect(firstRole.getByRole("cell").first()).toHaveText("View")
      await expect(matrix.getByRole("link", { name: /^Edit .+ permissions$/ })).toHaveCount(9)
      // Names do not navigate by themselves; only the explicitly labeled edit links do.
      await expect(firstRole.locator("th a")).toHaveCount(1)
      await expect(firstRole.getByRole("link", { name: "Edit Viewer permissions" })).toContainText("Edit permissions")
      await expect(scopeCard).toBeVisible()
      await expect(scopeCard.locator("dt")).toHaveCount(9)
      await expect(scopeCard).toContainText("Processes they are assigned to")
      await expect(scopeCard).toContainText("Not their own process")

      // The role name remains fixed and readable when the wide matrix scrolls sideways.
      const hasScroll = await region.evaluate((element) => {
        element.scrollLeft = element.scrollWidth
        return element.scrollLeft > 0
      })
      expect(hasScroll).toBe(true)
      const stickyLeft = await firstRole.getByRole("rowheader").evaluate((element) => element.getBoundingClientRect().left)
      const regionLeft = await region.evaluate((element) => element.getBoundingClientRect().left)
      expect(Math.abs(stickyLeft - regionLeft)).toBeLessThanOrEqual(2)

      // Horizontal scrolling stays inside the matrix rather than stretching the page.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(1)
      await region.evaluate((element) => { element.scrollLeft = 0 })
      await page.screenshot({
        path: testInfo.outputPath(`roles-scopes-after-${size.label}-${appearance.toLowerCase()}-admin.png`),
        fullPage: true,
      })

      if (size.label === "desktop" && appearance === "Light") {
        await matrix.getByRole("link", { name: "Edit Process owner permissions" }).click()
        await expect(page).toHaveURL(/\/settings\/roles\/owner/)
        await expect(page.getByRole("heading", { name: "Edit Process owner" })).toBeVisible()
        await expect(page.getByRole("button", { name: "Save role" })).toBeVisible()
        await page.goBack()
        await expect(page).toHaveURL(/\/settings\/roles/)
      }

      // A narrower role must not gain access to the permissions matrix.
      await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-bc"))
      await page.reload()
      await expect(page.getByText("Only administrators can open Roles and permissions")).toBeVisible()
      await expect(page.getByRole("table")).toHaveCount(0)
      await page.screenshot({
        path: testInfo.outputPath(`roles-scopes-after-${size.label}-${appearance.toLowerCase()}-narrow.png`),
        fullPage: true,
      })
    })
  }
}
