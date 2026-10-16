import { expect, type Locator, type Page } from "@playwright/test"

/** Follow the actual new tab while proving the source workspace stays open. */
export async function openPageLink(page: Page, link: Locator): Promise<Page> {
  const original = page.url()
  await expect(link).toHaveAttribute("target", "_blank")
  await expect(link).toHaveAttribute("rel", /noopener/)
  const [next] = await Promise.all([page.waitForEvent("popup"), link.click()])
  await next.waitForLoadState("domcontentloaded")
  expect(page.url()).toBe(original)
  return next
}
