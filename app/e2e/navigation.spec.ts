import { test, expect } from '@playwright/test'
test('workspace navigation does not return a scroll promise as an effect cleanup', async ({ page, context }) => {
  await context.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('/')
  await page.getByRole('link', { name: 'Management Review', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Management Review', exact: true })).toBeVisible()
  expect(errors).toEqual([])
})
