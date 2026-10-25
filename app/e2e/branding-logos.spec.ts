import { test, expect, type Page } from "@playwright/test"

// 1×1 and 2×1 PNGs (synthetic images, no real company logos)
const PNG_SQUARE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAL0lEQVR4nO3OIQEAAAgDMPrQgLBUhRg3E/Ornr2kEhAQEBAQEBAQEBAQEBAQSAcem0IIeXyKto4AAAAASUVORK5CYII=", "base64")
const PNG_WIDE = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAAXElEQVR4nO3QMREAIBDAsPeDA8RiFWRkoEP2Xmftc382OkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAK0BOkBrgA7QGqADtAboAO0BvlwQ8aUsj+gAAAAASUVORK5CYII=", "base64")
const upload = (page: Page, id: string, buf: Buffer) => page.getByTestId(`${id}-input`).setInputFiles({ name: id + ".png", mimeType: "image/png", buffer: buf })
const sidebar = (page: Page) => page.getByRole("navigation", { name: "Main" })

test("ThryveMS logo by default, readable on a dark Brand sidebar, and replaced by the company's logos", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto("/")
  // Default: the ThryveMS logo, and no company name row under it.
  await expect(sidebar(page).getByRole("img", { name: "ThryveMS" }).first()).toBeVisible()
  await expect(sidebar(page).getByText("Arden & Co.")).toHaveCount(0)

  // A Brand sidebar in light view is dark, so the dark-surface ThryveMS logo is the visible one.
  await page.goto("/settings/branding")
  await page.getByRole("radio", { name: /Brand/ }).click()
  await expect(page.locator("html")).toHaveAttribute("data-sidebar-tone", "dark")
  const visibleSrc = await sidebar(page).locator("img:visible").first().getAttribute("src")
  expect(visibleSrc).toMatch(/dark/)

  // The browser icon must be square.
  await upload(page, "favicon", PNG_WIDE)
  await expect(page.getByText("The browser icon must be square. This one is 64 by 32 pixels.")).toBeVisible()
  await upload(page, "favicon", PNG_SQUARE)
  await upload(page, "logo-light", PNG_WIDE)
  await upload(page, "logo-dark", PNG_WIDE)
  await page.getByRole("button", { name: "Save branding" }).click()

  // Settings collapses the sidebar to icons: the company browser icon is shown there, and in the tab.
  await page.reload()
  await expect(sidebar(page).getByRole("img", { name: "Company logo" })).toHaveCount(1)
  expect(await page.locator('link[rel="icon"]').getAttribute("href")).toMatch(/^data:image\/png/)
  // The expanded sidebar shows the company logo instead of ThryveMS.
  await page.goto("/")
  await expect(sidebar(page).locator('img[alt="Company logo"]:visible')).toHaveCount(1)
  await expect(sidebar(page).getByRole("img", { name: "ThryveMS" })).toHaveCount(0)

  // Removing the logos brings ThryveMS back.
  await page.goto("/settings/branding")
  await page.getByRole("button", { name: "Remove logo for light backgrounds" }).click()
  await page.getByRole("button", { name: "Remove logo for dark backgrounds" }).click()
  await page.getByRole("button", { name: "Save branding" }).click()
  await page.goto("/")
  await expect(sidebar(page).locator('img[alt="ThryveMS"]:visible')).toHaveCount(1)
})
