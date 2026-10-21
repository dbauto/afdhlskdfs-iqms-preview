import { test, expect } from "@playwright/test"

test("processes show as cards with covers; a cover can be an emoji or a photo link, and falls back to the default", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-ms"))
  // covers are one of three layouts; choose it in Appearance
  await page.goto("/settings/appearance")
  await page.getByRole("radio", { name: /Cards with covers/ }).click()
  await page.goto("/qms/processes")
  const cards = page.getByRole("list", { name: "Processes", exact: true }).getByRole("listitem")
  await expect(cards).toHaveCount(9)
  // every card has a cover, even though nobody chose one
  await expect(cards.first().getByRole("img", { name: "Compass", exact: true })).toBeVisible()
  await expect(page.getByRole("link", { name: "Purchasing & suppliers, Overdue work", exact: true })).toContainText(/Overdue for \d+ weeks?/)
  await page.getByRole("button", { name: /^Support/ }).click()
  await expect(cards).toHaveCount(2)
  await page.getByRole("button", { name: /^All/ }).click()

  await page.goto("/qms/processes/operations")
  await page.getByRole("button", { name: "Change cover", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Test tube", exact: true }).click()
  await dialog.getByRole("button", { name: "Rose", exact: true }).click()
  await dialog.getByRole("button", { name: "Save cover", exact: true }).click()
  await expect(page.getByRole("img", { name: "Test tube", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Change cover", exact: true }).click()
  await dialog.getByRole("tab", { name: "Photo link", exact: true }).click()
  await dialog.locator("#cover-url").fill("http://intranet/line.jpg")
  await dialog.getByRole("button", { name: "Save cover", exact: true }).click()
  await expect(dialog.getByText("Use a full https:// link to the image.")).toBeVisible()
  await dialog.locator("#cover-url").fill("https://example.com/does-not-exist.jpg")
  await dialog.getByRole("button", { name: "Save cover", exact: true }).click()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state.processes.find((p: { id: string }) => p.id === "operations").cover)
  expect(saved).toEqual({ kind: "photo", url: "https://example.com/does-not-exist.jpg" })
  // a photo that can't load shows the default emoji instead of a broken image
  await expect(page.getByRole("img", { name: "Factory", exact: true })).toBeVisible()

  await page.getByRole("button", { name: "Change cover", exact: true }).click()
  await dialog.getByRole("button", { name: "Use the default", exact: true }).click()
  await page.goto("/qms/processes")
  await expect(page.getByRole("link", { name: /^Operations,/ }).getByRole("img", { name: "Factory", exact: true })).toBeVisible()

  // people who can't edit processes see the cover but can't change it
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-bc"))
  await page.goto("/qms/processes/operations")
  await expect(page.getByRole("button", { name: "Change cover", exact: true })).toHaveCount(0)
})

test("the Processes page has three layouts, chosen in Appearance; cards with actions is the default", async ({ page }) => {
  await page.goto("/")
  await page.evaluate(() => localStorage.setItem("iqms.viewAs", "p-cm"))
  await page.goto("/qms/processes")
  // default: cards with actions, with figures and quick links
  const card = page.getByRole("article", { name: "Operations", exact: true })
  await expect(card).toBeVisible()
  await expect(card.getByText("Open NCs")).toBeVisible()
  await expect(card.getByText("Next audit")).toBeVisible()
  await card.getByRole("button", { name: "More actions for Operations" }).click()
  await page.getByRole("menuitem", { name: "Nonconformities" }).click()
  await expect(page).toHaveURL(/\/qms\/processes\/operations\?tab=ncs/)
  await expect(page.getByRole("tab", { name: /Nonconformities/, selected: true })).toBeVisible()

  await page.goto("/qms/processes")
  await page.getByRole("searchbox", { name: "Search processes" }).fill("zzz")
  await expect(page.getByText("No processes match “zzz”.")).toBeVisible()

  // grouped list
  // "Change layout" opens Appearance in a new tab, like every content link (ADR-027)
  await expect(page.getByRole("link", { name: /Change layout/ })).toHaveAttribute("href", /\/settings\/appearance$/)
  await page.goto("/settings/appearance")
  await page.getByRole("radio", { name: /Grouped list/ }).click()
  await expect(page.getByRole("radio", { name: /Grouped list/ })).toHaveAttribute("aria-checked", "true")
  await page.reload()
  await expect(page.getByRole("radio", { name: /Grouped list/ })).toHaveAttribute("aria-checked", "true")
  await page.goto("/qms/processes")
  await expect(page.getByRole("list", { name: "Core processes" }).getByRole("link", { name: /^Operations,/ })).toBeVisible()
  await expect(page.getByRole("article")).toHaveCount(0)
})
