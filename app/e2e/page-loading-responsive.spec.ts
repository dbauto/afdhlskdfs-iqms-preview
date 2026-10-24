import { test, expect } from "@playwright/test"

/** Capture evidence from the real application, not invented mockup screens. */
test("route layout and product identity remain usable at supported widths", async ({ page }) => {
  for (const width of [390, 768, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    for (const route of ["/", "/risks"]) {
      await page.goto(route)
      await expect(page.locator("body")).toBeVisible()
      await expect(page.locator('[role="status"][aria-busy="true"]')).toHaveCount(0)
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth + 1
      )
      expect(overflow, `Horizontal page overflow at ${width}px on ${route}`).toBe(false)
      await page.screenshot({
        path: test.info().outputPath(`ui-${width}-${route === "/" ? "overview" : "risks"}.png`),
        fullPage: true,
        animations: "disabled",
      })
    }
    if (width === 1440 || width === 1920) {
      await expect(page.getByRole("link", { name: "ThryveMS overview" })).toBeVisible()
    }
  }
})
