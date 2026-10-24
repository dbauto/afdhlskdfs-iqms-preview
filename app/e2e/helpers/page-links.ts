import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Follow actual app navigation. Cross-menu links open browser popups; same-menu
 * links navigate in place. For older independent-record test scenarios, the
 * latter gets a separate *test-owned* inspector page after verifying the real
 * in-place navigation and restoring the source route.
 */
export async function openPageLink(page: Page, link: Locator): Promise<Page> {
  const original = page.url()
  const target = await link.getAttribute("target")
  if (target === "_blank") {
    await expect(link).toHaveAttribute("rel", /noopener/)
    const [next] = await Promise.all([page.waitForEvent("popup"), link.click()])
    await next.waitForLoadState("domcontentloaded")
    expect(page.url()).toBe(original)
    return next
  }
  const destination = await link.getAttribute("href")
  expect(destination, "In-page navigation has an href").toBeTruthy()
  await link.click()
  await expect(page).toHaveURL(new URL(destination!, original).toString())
  // This page is for inspecting the destination in tests only, not an app popup.
  const inspector = await page.context().newPage()
  await inspector.goto(page.url())
  await page.goBack()
  await expect(page).toHaveURL(original)
  return inspector
}
