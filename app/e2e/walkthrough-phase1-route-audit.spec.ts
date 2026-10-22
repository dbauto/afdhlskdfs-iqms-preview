import { expect, test } from "@playwright/test"

// Phase 1 evidence only: these are the existing routes, not implemented walkthroughs.
// The Play walkthrough UI is deliberately not asserted here (it belongs to Phase 3).
const clientRoutes = [
  "/", "/my-tasks", "/qms/organization", "/qms/policies", "/qms/processes",
  "/qms/procedures", "/qms/objectives", "/documents", "/documents/reviews", "/risks", "/evidence",
  "/audits", "/management-review", "/corrective-action",
]

// Owner decision, 22 Oct 2026: retain Management Review in the raw route census,
// but do not author or claim walkthrough coverage while that feature is finalized.
const walkthroughEligibleClientRoutes = clientRoutes.filter((route) => route !== "/management-review")

const settingsRoutes = [
  "/settings/organization", "/settings/users", "/settings/roles",
  "/settings/security", "/settings/integrations", "/settings/branding", "/settings/activity",
  "/settings/process-structure", "/settings/certification", "/settings/qms-rules",
  "/settings/numbering", "/settings/review", "/settings/retention",
  "/settings/profile", "/settings/appearance", "/settings/notifications",
  "/settings/data-export", "/settings/billing", "/settings/privacy",
  "/settings/legal", "/settings/support", "/settings/about",
]

const platformRoutes = [
  "/platform", "/platform/requests", "/platform/logs", "/platform/jobs",
  "/platform/reports", "/platform/support", "/platform/team",
]

const qualityOnlySettings = [
  "/settings/process-structure", "/settings/certification", "/settings/qms-rules",
  "/settings/numbering", "/settings/review", "/settings/retention", "/settings/data-export",
]

const adminOnlySettings = [
  "/settings/organization", "/settings/users", "/settings/roles",
  "/settings/security", "/settings/integrations", "/settings/branding",
  "/settings/activity", "/settings/billing",
]

async function asUser(page: import("@playwright/test").Page, id: string, theme = "Light") {
  await page.goto("/")
  await page.evaluate(({ id, theme }) => {
    localStorage.setItem("iqms.viewAs", id)
    localStorage.setItem("iqms.appearance", theme)
  }, { id, theme })
}

test("G1: every current client and Settings menu destination is a reachable authorized route", async ({ page }) => {
  expect(clientRoutes).toHaveLength(14)
  expect(settingsRoutes).toHaveLength(22)
  await asUser(page, "p-al")
  for (const route of [...clientRoutes, ...settingsRoutes]) {
    await page.goto(route)
    await expect(page.locator("h1").first(), `Missing page heading at ${route}`).toBeVisible()
    await expect(page.getByText("This page or record doesn’t exist"), `Unexpected NotFound at ${route}`).toHaveCount(0)
    await expect(page.getByText("Only administrators can open"), `Unexpected access denial at ${route}`).toHaveCount(0)
  }
})

test("G1: existing platform menu routes are reachable in the prototype (authorization is separately pending)", async ({ page }) => {
  expect(platformRoutes).toHaveLength(7)
  for (const route of platformRoutes) {
    await page.goto(route)
    await expect(page.locator("h1").first(), `Missing platform heading: ${route}`).toBeVisible()
    await expect(page.getByText("This page or record doesn’t exist")).toHaveCount(0)
  }
})

test("G1: a contributor is denied all Settings administrator and quality-only routes, including deep links", async ({ page }) => {
  await asUser(page, "p-bc")
  for (const route of [...adminOnlySettings, ...qualityOnlySettings]) {
    await page.goto(route)
    await expect(page.getByText(/^Only administrators can open /), `Restricted Settings route exposed: ${route}`).toBeVisible()
    await expect(page.locator("h1")).toHaveCount(1)
  }
  for (const route of ["/settings/profile", "/settings/appearance", "/settings/notifications", "/settings/privacy", "/settings/legal", "/settings/support", "/settings/about"]) {
    await page.goto(route)
    await expect(page.locator("h1").first()).toBeVisible()
    await expect(page.getByText("Only administrators can open")).toHaveCount(0)
  }
})


const currentClientRoleCases = [
  { person: "p-al", label: "Administrator", blocked: [] as string[] },
  { person: "p-ms", label: "Quality manager", blocked: [] as string[] },
  { person: "p-en", label: "Top management", blocked: [] as string[] },
  { person: "p-gl", label: "Process owner", blocked: [] as string[] },
  { person: "p-kd", label: "Auditor", blocked: [] as string[] },
  { person: "p-ec", label: "Guest auditor", blocked: [] as string[] },
  { person: "p-ro", label: "Consultant", blocked: [] as string[] },
  { person: "p-bc", label: "Contributor", blocked: [] as string[] },
]

test("G1: walkthrough-eligible client menu pages obey each active source role's area access", async ({ page }) => {
  for (const role of currentClientRoleCases) {
    await asUser(page, role.person)
    for (const route of walkthroughEligibleClientRoutes) {
      await page.goto(route)
      const denied = role.blocked.includes(route)
      if (denied) {
        await expect(page.getByText("This page or record doesn’t exist"), `${role.label} unexpectedly opened ${route}`).toBeVisible()
      } else {
        await expect(page.locator("h1").first(), `${role.label} could not see ${route}`).toBeVisible()
        await expect(page.getByText("This page or record doesn’t exist"), `${role.label} unexpectedly denied ${route}`).toHaveCount(0)
      }
    }
  }
})

test("G1: quality manager Settings access differs from administrator and contributor", async ({ page }) => {
  await asUser(page, "p-ms")
  for (const route of qualityOnlySettings) {
    await page.goto(route)
    await expect(page.getByText("Only administrators can open"), `Quality manager denied QMS Settings at ${route}`).toHaveCount(0)
    await expect(page.locator("h1").first()).toBeVisible()
  }
  for (const route of adminOnlySettings) {
    await page.goto(route)
    await expect(page.getByText(/^Only administrators can open /), `Quality manager gained administrator-only Settings at ${route}`).toBeVisible()
  }
})

test("G1: current Overview shows read-only gauge, clause evidence and links only to eligible roles", async ({ page }) => {
  await asUser(page, "p-ms")
  await page.goto("/")
  const card = page.locator("section").filter({ has: page.getByRole("heading", { name: "Certification readiness", exact: true }) }).first()
  await expect(page.getByRole("heading", { name: "Certification readiness", exact: true })).toBeVisible()
  await expect(page.getByRole("img", { name: /% of requirements done/i })).toHaveCount(1)
  await expect(page.getByRole("heading", { name: "Evidence by ISO 9001 clause" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Audit dates" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open certification readiness" })).toBeVisible()
  await expect(page.getByText("Overdue, part of to do")).toBeVisible()
  expect(await page.getByRole("img", { name: /% of requirements done/i }).locator("a, button").count()).toBe(0)
  await expect(card).toBeVisible()

  await asUser(page, "p-bc")
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Certification readiness", exact: true })).toHaveCount(0)
  await expect(page.getByRole("heading", { name: "Evidence by ISO 9001 clause" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open evidence" })).toBeVisible()
})

test("G1: entrance animations respect reduced motion and no Play control exists yet", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  await asUser(page, "p-ms")
  await page.goto("/")
  const svg = page.getByRole("img", { name: /% of requirements done/i })
  await expect(svg).toBeVisible()
  await expect(page.getByRole("button", { name: "Play walkthrough" })).toHaveCount(0)
  const animation = await page.locator(".sweep").evaluate((el) => getComputedStyle(el).animationName)
  expect(animation).toBe("none")
})

for (const width of [1920, 1440, 1280, 768, 390]) {
  for (const appearance of ["Light", "Dark"] as const) {
    test(`G1 Overview visual evidence ${width}px ${appearance}`, async ({ page }, testInfo) => {
      const height = width === 1920 ? 1080 : width === 1440 ? 900 : width === 1280 ? 650 : width === 768 ? 1024 : 844
      await page.setViewportSize({ width, height })
      for (const [id, label] of [["p-ms", "quality"], ["p-bc", "narrow"]] as const) {
        await asUser(page, id, appearance)
        await page.goto("/")
        await expect(page.locator("h1").first()).toBeVisible()
        // The existing page and Overview chart animate on entry. Capture the settled UI, not a translucent transition frame.
        await page.waitForTimeout(1900)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `Horizontal page overflow for ${label} at ${width}px ${appearance}`).toBeLessThanOrEqual(1)
        await page.screenshot({ path: testInfo.outputPath(`walkthrough-g1-overview-${label}-${width}-${appearance.toLowerCase()}.png`), fullPage: true })
      }
    })
  }
}
