import { test, expect, type Page } from "@playwright/test"
import { openPageLink } from "./helpers/page-links"

const data = (page: Page) =>
  page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
async function as(page: Page, who: string) {
  await page.goto("/")
  await page.evaluate((who) => localStorage.setItem("iqms.viewAs", who), who)
  await page.reload()
}

test("Overview cards and attention links open real new tabs and keep the original query and page", async ({
  page,
}) => {
  await as(page, "p-ms")
  await page
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("Keep this unfinished search")
  const card = page.locator('main a[href="/documents/reviews"]')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute("title", /Opens in a new tab/)
  const next = await openPageLink(page, card)
  await expect(
    next.getByRole("heading", { name: "Reviews", exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole("searchbox", { name: "Search", exact: true }),
  ).toHaveValue("Keep this unfinished search")
  expect(await next.evaluate(() => window.opener === null)).toBe(true)
  await next.close()
  const attention = page
    .getByRole("list", { name: "Needs your attention", exact: true })
    .locator("a")
    .first()
  await expect(attention).toBeVisible()
  const record = await openPageLink(page, attention)
  await expect(record.locator("h1")).toBeVisible()
})

test("content links across every module use safe new tabs; sidebar, breadcrumbs and page filters stay usable", async ({
  page,
}) => {
  test.setTimeout(120_000)
  await as(page, "p-ms")
  const state = await data(page)
  const routes = [
    "/",
    "/documents",
    "/documents/reviews",
    "/evidence",
    "/risks",
    "/audits",
    "/audits/templates",
    "/management-review",
    "/corrective-action",
    "/qms/organization",
    "/qms/processes",
    "/qms/objectives",
    "/readiness",
    "/remarks",
    "/search?q=review",
    "/settings/roles",
    "/settings/legal",
    "/notifications",
    `/documents/${state.documents[0].id}`,
    `/evidence/${state.evidence[0].id}`,
    `/risks/${state.risks[0].id}`,
    `/qms/processes/${state.processes[0].id}`,
    `/qms/objectives/${state.objectives[0].id}`,
    `/management-review/${state.reviews[0].id}`,
    `/corrective-action/${state.ncs[0].id}`,
    "/audits/IA-2026-10",
    "/audits/IA-2026-10/results",
    "/audits/IA-2026-10/report",
  ]
  let checked = 0
  for (const who of ["p-ms", "p-bc"]) {
    await as(page, who)
    for (const route of routes) {
      await page.goto(route)
      await page.locator("main").waitFor()
      if (
        await page
          .getByText("This page or record doesn’t exist", { exact: true })
          .count()
      )
        continue
      const links = await page.locator("main a[href]").evaluateAll((nodes) =>
        nodes.flatMap((node) => {
          const a = node as HTMLAnchorElement,
            u = new URL(a.href)
          if (
            a.closest("nav") ||
            a.hasAttribute("download") ||
            u.origin !== location.origin ||
            u.pathname === location.pathname
          )
            return []
          return [
            {
              text: a.textContent?.trim(),
              target: a.target,
              rel: a.rel,
              hint:
                a.title +
                " " +
                a.getAttribute("aria-label") +
                " " +
                a.getAttribute("aria-description"),
            },
          ]
        }),
      )
      for (const link of links) {
        expect(link.target, `${who} ${route}: ${link.text}`).toBe("_blank")
        expect(link.rel).toContain("noopener")
        expect(link.rel).toContain("noreferrer")
        expect(link.hint.toLowerCase()).toContain("new tab")
        checked++
      }
    }
  }
  expect(checked).toBeGreaterThan(100)
  await as(page, "p-bc")
  await page.goto("/documents/QMS-MAN-001")
  await expect(page.getByText("This page or record doesn’t exist", { exact: true })).toBeVisible()
  await as(page, "p-ms")
  const before = page.context().pages().length
  await page
    .getByRole("link", { name: "Management Review", exact: true })
    .first()
    .click()
  await expect(page).toHaveURL(/\/management-review$/)
  expect(page.context().pages()).toHaveLength(before)
  await page.goto("/audits/IA-2026-10/results")
  await page.getByRole("button", { name: "Checklist results", exact: true }).click()
  await expect(page).toHaveURL(/\/results$/)
  expect(page.context().pages()).toHaveLength(before)
  const crumb = page
    .getByRole("navigation", { name: "Breadcrumb", exact: true })
    .getByRole("link", { name: "Audits", exact: true })
  await crumb.click()
  await expect(page).toHaveURL(/\/audits$/)
  expect(page.context().pages()).toHaveLength(before)
})

test("register Open and notification links open the exact record and mark notifications read without replacing the inbox", async ({
  page,
}) => {
  await page.goto("/documents")
  const row = page
    .getByRole("region", { name: "Document register", exact: true })
    .getByRole("row")
    .nth(1)
  const target = await row
    .locator('a[href^="/documents/"]')
    .first()
    .getAttribute("href")
  await row.getByRole("button", { name: /Actions for/ }).click()
  const record = await openPageLink(
    page,
    page.getByRole("menuitem", { name: "Open", exact: true }),
  )
  expect(new URL(record.url()).pathname).toBe(target)
  await record.close()
  await page.goto("/notifications")
  const state = await data(page),
    person = state.people.find((p: any) => p.id === "p-al")
  const notification = state.notifications.find(
    (n: any) => n.to === person.name && !n.read,
  )
  expect(notification).toBeTruthy()
  const link = page
    .locator(`main a[href="${notification.href}"]`)
    .filter({ hasText: notification.title })
    .first()
  const destination = await openPageLink(page, link)
  expect(
    new URL(destination.url()).pathname + new URL(destination.url()).search,
  ).toBe(notification.href)
  expect(
    (await data(page)).notifications.find((n: any) => n.id === notification.id)
      .read,
  ).toBe(true)
  await expect(
    page.getByRole("heading", { name: "Notifications", exact: true }),
  ).toBeVisible()
})

test("saved work is synchronized between tabs while the source draft and independent form identities stay intact", async ({
  page,
}) => {
  await page.goto("/audits/IA-2026-10")
  await page
    .getByRole("button", { name: "Add questionnaire", exact: true })
    .click()
  await page.locator("#af-title").fill("Questions kept in the original tab")
  await page
    .getByRole("button", { name: "Create questionnaire", exact: true })
    .click()
  await page.getByRole("button", { name: "Add question", exact: true }).click()
  await page
    .locator('textarea[id^="q-text-"]')
    .fill("The original question remains editable.")
  const draftUrl = page.url()
  const overview = await openPageLink(
    page,
    page.getByRole("link", { name: "Back to audit", exact: true }),
  )
  await expect(
    overview.getByRole("region", { name: "Saved audit forms", exact: true }),
  ).toContainText("Questions kept in the original tab")
  await overview
    .getByRole("button", { name: "Add checklist", exact: true })
    .click()
  await overview
    .locator("#af-title")
    .fill("A separate form from the second tab")
  await overview.getByRole("button", { name: "Add form", exact: true }).click()
  await overview
    .getByRole("button", { name: "Add question", exact: true })
    .click()
  await overview
    .locator('textarea[id^="q-text-"]')
    .fill("A separate saved check.")
  await expect
    .poll(
      async () =>
        (await data(page)).auditChecklists.filter(
          (c: any) => c.auditId === "IA-2026-10",
        ).length,
    )
    .toBe(2)
  await page.locator('textarea[id^="q-text-"]').fill("")
  await page
    .locator('textarea[id^="q-text-"]')
    .pressSequentially("The original question has a later clarification.")
  await expect
    .poll(async () =>
      (await data(overview)).auditChecklists.some((c: any) =>
        c.sections.some((s: any) =>
          s.items.some(
            (q: any) =>
              q.text === "The original question has a later clarification.",
          ),
        ),
      ),
    )
    .toBe(true)
  await page.reload()
  await overview.reload()
  expect(page.url()).toBe(draftUrl)
  await expect(page.locator('textarea[id^="q-text-"]')).toHaveValue(
    "The original question has a later clarification.",
  )
  await expect(overview.locator('textarea[id^="q-text-"]')).toHaveValue(
    "A separate saved check.",
  )
})
