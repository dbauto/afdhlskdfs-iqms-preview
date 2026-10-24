import { expect, type Locator, type Page } from "@playwright/test"

/**
 * Inspect a record in another tab. Cross-section links do this by default;
 * for same-section links tests deliberately use the browser's Ctrl-click
 * gesture to preserve independent-tab/persistence coverage.
 */
export async function openPageLink(page: Page, link: Locator): Promise<Page> {
  const original = page.url()
  const defaultNewTab = await link.getAttribute("target") === "_blank"
  if (defaultNewTab) await expect(link).toHaveAttribute("rel", /noopener/)
  const [next] = await Promise.all([
    page.context().waitForEvent("page"),
    link.click(defaultNewTab ? {} : { modifiers: ["Control"] }),
  ])
  await next.waitForLoadState("domcontentloaded")
  expect(page.url()).toBe(original)
  return next
}
