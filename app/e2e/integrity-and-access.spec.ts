import { test, expect, type Page } from "@playwright/test"

const viewAs = async (page: Page, id: string) => {
  await page.goto("/")
  await page.evaluate((p) => localStorage.setItem("iqms.viewAs", p), id)
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
const notFound = (page: Page) => page.getByText("This page or record doesn’t exist")
const taskCount = async (page: Page) => {
  await page.goto("/my-tasks")
  await expect(page.getByRole("heading", { name: "My tasks", level: 1 })).toBeVisible()
  const tasks = page.locator('ul[aria-label="Overdue"] > li, ul[aria-label="Due this week"] > li, ul[aria-label="Later or no date"] > li')
  await expect.poll(() => tasks.count()).toBeGreaterThan(0)
  return tasks.count()
}

test("new risks and nonconformities save the process shown, and the owner follows the process", async ({ page }) => {
  await viewAs(page, "p-cm")
  await page.goto("/risks")
  await page.getByRole("button", { name: "Add risk or opportunity" }).click()
  await expect(page.locator("#r-proc")).toHaveValue("Operations")
  await expect(page.locator("#r-owner")).toHaveValue("Carlos Mendoza")
  await expect(page.locator("#r-src")).toHaveValue("")
  await page.locator("#r-title").fill("Changeover guard check missed")
  await page.getByRole("button", { name: "Add risk", exact: true }).click()
  const risk = (await saved(page)).risks.find((r: { title: string }) => r.title === "Changeover guard check missed")
  expect(risk).toMatchObject({ process: "Operations", owner: "Carlos Mendoza" })
  await page.goto(`/risks/${risk.id}`)
  await expect(page.getByRole("heading", { name: "Changeover guard check missed" })).toBeVisible()

  await viewAs(page, "p-bc")
  await page.goto("/corrective-action")
  await page.getByRole("button", { name: "Add nonconformity" }).click()
  await expect(page.locator("#nc-proc")).toHaveValue("Operations")
  await expect(page.locator("#nc-owner")).toHaveValue("Carlos Mendoza")
  await page.locator("#nc-title").fill("Press guard left open during changeover")
  await page.locator("#nc-details").fill("Interlock bypassed with tape on line 3.")
  await page.getByRole("dialog").getByRole("button", { name: "Add nonconformity" }).click()
  const nc = (await saved(page)).ncs.find((n: { title: string }) => n.title === "Press guard left open during changeover")
  expect(nc).toMatchObject({ process: "Operations", owner: "Carlos Mendoza" })

  // with every process to choose from, the owner follows the process until someone picks one
  await viewAs(page, "p-ms")
  await page.goto("/corrective-action")
  await page.getByRole("button", { name: "Add nonconformity" }).click()
  await page.locator("#nc-proc").selectOption("Purchasing & suppliers")
  await expect(page.locator("#nc-owner")).toHaveValue("Joy Aquino")
  await page.locator("#nc-owner").selectOption("Maria Santos")
  await page.locator("#nc-proc").selectOption("Operations")
  await expect(page.locator("#nc-owner")).toHaveValue("Maria Santos")
})

test("process owners can revise their documents; Approve includes Add and edit", async ({ page }) => {
  await viewAs(page, "p-cm")
  await page.goto("/documents/OPS-WI-017")
  await expect(page.getByRole("button", { name: "Start new revision" })).toBeVisible()
  await viewAs(page, "p-dr")
  await page.goto("/documents/DES-PRO-001")
  await expect(page.getByRole("heading", { name: "Design and development control" })).toBeVisible()
  await expect(page.getByRole("button", { name: /^(Edit|Edit draft|Revise)/ }).first()).toBeVisible()
})

test("sections and Confidential records follow one access rule in menus, lists, search and links", async ({ page }) => {
  // no Management Review access: the register answers not found by direct link too
  await viewAs(page, "p-bc")
  await page.goto("/management-review")
  await expect(notFound(page)).toBeVisible()
  await expect(page.getByText("Open actions from past reviews")).toHaveCount(0)

  // an auditor without the Confidential grant doesn't see Joy's Confidential register anywhere
  await viewAs(page, "p-kd")
  await page.goto("/documents")
  await expect(page.getByRole("heading", { name: "Documents", level: 1 })).toBeVisible()
  await expect(page.getByText("PUR-FRM-004")).toHaveCount(0)
  await page.goto("/search?q=PUR-FRM-004")
  await expect(page.getByText("0 results.")).toBeVisible()
  // the administrator has the grant, so what the list shows also opens
  await viewAs(page, "p-al")
  await page.goto("/documents/PUR-FRM-004")
  await expect(page.getByRole("heading", { name: "PUR-FRM-004", level: 1 })).toBeVisible()
  await expect(notFound(page)).toHaveCount(0)

  // records outside your processes show as a number only, never as a dead link or a title
  await viewAs(page, "p-cm")
  await page.goto("/management-review/MR-2026-01")
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  await expect(page.locator('a[href*="/risks/R-031"]')).toHaveCount(0)
  await expect(page.getByText("Single source for packaging material")).toHaveCount(0)
})

test("renaming a person or a process keeps their records; deactivating hands open work to someone", async ({ page }) => {
  await viewAs(page, "p-cm")
  const before = await taskCount(page)
  expect(before).toBeGreaterThan(0)
  await page.goto("/settings/profile")
  await page.locator("#pf-name").fill("Carlos M. Mendoza")
  await page.getByRole("button", { name: "Save profile" }).click()
  expect(await taskCount(page)).toBe(before)
  expect((await saved(page)).processes.find((p: { id: string }) => p.id === "operations").owner).toBe("Carlos M. Mendoza")

  await viewAs(page, "p-al")
  await page.goto("/settings/process-structure")
  await page.getByRole("button", { name: "Actions for Operations" }).click()
  await page.getByRole("menuitem", { name: /Edit/ }).click()
  await page.locator("#ps-n").fill("Production")
  await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click()
  const s = await saved(page)
  expect(s.documents.filter((d: { process: string }) => d.process === "Operations")).toHaveLength(0)
  expect(s.documents.filter((d: { process: string }) => d.process === "Production").length).toBeGreaterThan(0)
  expect(s.people.find((p: { id: string }) => p.id === "p-bc").scope).toBe("Production")
  // a process still used by records can't be deleted
  await page.getByRole("button", { name: "Actions for Production" }).click()
  await expect(page.getByRole("menuitem", { name: /Delete/ })).toHaveCount(0)
  await page.keyboard.press("Escape")

  await page.goto("/settings/users")
  await page.getByRole("button", { name: "Actions for Joy Aquino" }).click()
  await page.getByRole("menuitem", { name: "Deactivate" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("list", { name: "Open work" }).getByRole("listitem").filter({ hasText: "NC-2026-007" }).first()).toBeVisible()
  await expect(dialog.getByRole("button", { name: /Choose who takes over/ })).toBeDisabled()
  await dialog.locator("#reassign-all").selectOption("Maria Santos")
  await dialog.getByRole("button", { name: "Reassign and deactivate" }).click()
  const after = await saved(page)
  expect(after.people.find((p: { id: string }) => p.id === "p-ja").status).toBe("Deactivated")
  expect(after.ncs.find((n: { id: string }) => n.id === "NC-2026-007").owner).toBe("Maria Santos")
  expect(after.processes.find((p: { name: string }) => p.name === "Purchasing & suppliers").owner).toBe("Maria Santos")
  expect(after.ncs.filter((n: { owner: string; stage: number }) => n.owner === "Joy Aquino" && n.stage < 6)).toHaveLength(0)
})
