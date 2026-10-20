import { test, expect, type Page } from "@playwright/test"

const viewAs = async (page: Page, id: string) => {
  await page.goto("/")
  await page.evaluate((p) => localStorage.setItem("iqms.viewAs", p), id)
}
const taskRows = (page: Page) => page.locator('ul[aria-label="Overdue"], ul[aria-label="Due this week"], ul[aria-label="Later or no date"]').locator(":scope > li")

test("My tasks lists what is waiting on you, by whose turn it is, and drops a task once you have done your part", async ({ page }) => {
  // NC-2026-005 is at verification: the step is Maria's (verifier), not Paolo's (owner)
  await viewAs(page, "p-ms")
  await page.goto("/")
  const preview = page.getByRole("list", { name: "My tasks", exact: true })
  await expect(preview).toBeVisible()
  const seeAll = page.getByRole("link", { name: /^See all \d+$/ })
  const total = Number((await seeAll.textContent())!.replace(/\D/g, ""))

  await page.getByRole("navigation").getByRole("link", { name: /^My tasks/ }).first().click()
  await expect(page.getByRole("heading", { name: "My tasks", level: 1 })).toBeVisible()
  await expect(taskRows(page)).toHaveCount(total)
  const verify = page.getByRole("link", { name: "Verify: Torque wrenches used past their calibration date", exact: true })
  await expect(verify).toBeVisible()
  // a quality manager no longer gets every open nonconformity: Ana Cruz's step stays Ana's
  await expect(page.getByText("Wrong label revision shipped to customer", { exact: true })).toHaveCount(0)

  // filter by type
  await page.getByRole("button", { name: /^Corrective action/ }).click()
  await expect(taskRows(page).filter({ hasText: "Nonconformity ·" })).toHaveCount(await taskRows(page).count())
  await page.getByRole("button", { name: /^All/ }).click()

  // the owner sees it as waiting on someone else, not as a task
  await viewAs(page, "p-pr")
  await page.goto("/my-tasks")
  await expect(page.getByRole("heading", { name: "My tasks", level: 1 })).toBeVisible()
  await expect(taskRows(page).filter({ hasText: "Torque wrenches" })).toHaveCount(0)
  await page.getByRole("button", { name: /Waiting on others/ }).click()
  const waiting = page.getByRole("list", { name: "Waiting on others", exact: true })
  await expect(waiting.getByRole("listitem").filter({ hasText: "Torque wrenches used past their calibration date" })).toContainText("Maria Santos to verify the action")

  // Maria verifies, and the task leaves her list; Paolo now has the effectiveness check
  await viewAs(page, "p-ms")
  await page.goto("/corrective-action/NC-2026-005")
  await page.getByRole("button", { name: "Record verification", exact: true }).click()
  await page.locator("#step-note").fill("All six wrenches recalibrated; certificates checked.")
  await page.getByRole("dialog").getByRole("button", { name: "Record verification", exact: true }).click()
  await page.goto("/my-tasks")
  await expect(page.getByRole("heading", { name: "My tasks", level: 1 })).toBeVisible()
  await expect(page.getByRole("link", { name: "Verify: Torque wrenches used past their calibration date", exact: true })).toHaveCount(0)
  await expect(taskRows(page)).toHaveCount(total - 1)

  await viewAs(page, "p-pr")
  await page.goto("/my-tasks")
  await expect(page.getByRole("link", { name: "Open: Torque wrenches used past their calibration date", exact: true })).toBeVisible()
  await expect(page.getByText("Your step: check the action worked")).toBeVisible()
})
