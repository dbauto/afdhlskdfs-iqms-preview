import { test, expect, type Page } from '@playwright/test'
const figure = (p: Page, label: string) => p.getByText(label, { exact: true }).locator('..').locator('span').first()

test('record-driven figures respect process scope and update after adding clause evidence', async ({ page }) => {
  await page.goto('/evidence')
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('thryvems.preview.v1')!).state)
  const expected = raw.evidence.filter((e: any) => !e.processes.length || e.processes.includes('Operations')).length
  await page.evaluate(() => localStorage.setItem('iqms.viewAs', 'p-bc'))
  await page.reload()
  await expect(figure(page, 'Evidence items linked')).toHaveText(String(expected))
  await page.getByRole('tab', { name: /^All evidence/ }).click()
  await expect(page.getByText('Supplier evaluations 2025', { exact: true })).toHaveCount(0)
  await page.goto('/')
  await expect(page.getByText('Approved supplier list not re-evaluated for 2026', { exact: true })).toHaveCount(0)
  await page.evaluate(() => localStorage.setItem('iqms.viewAs', 'p-ms'))
  await page.goto('/evidence')
  await page.reload()
  await expect(figure(page, 'Evidence items linked')).toHaveText(String(raw.evidence.length))
  console.log(`Visibility: Ben evidence=${expected}; Maria evidence=${raw.evidence.length}`)
  for (const [name, id] of [['Ben', 'p-bc'], ['Maria', 'p-ms']]) {
    await page.evaluate(id => localStorage.setItem('iqms.viewAs', id), id)
    await page.goto('/')
    await page.reload()
    const counts: Record<string, string | null> = {}
    for (const label of ['Overdue items', 'Open nonconformities', 'Documents in review', 'Next internal audit']) counts[label] = await figure(page, label).textContent()
    await page.goto('/evidence')
    for (const label of ['Requirements with current evidence', 'Requirements with no evidence', 'Evidence older than 12 months', 'Evidence items linked']) counts[label] = await figure(page, label).textContent()
    await page.goto('/readiness')
    counts['Readiness by clause'] = await page.locator('[role="img"]').allTextContents().then(() => page.locator('[role="img"]').evaluateAll(es => es.map(e => e.getAttribute('aria-label')).join('; ')))
    console.log(`${name} figures: ${JSON.stringify(counts)}`)
  }
  await page.goto('/evidence')

  const before = await figure(page, 'Requirements with current evidence').textContent()
  await page.getByRole('button', { name: 'Add evidence', exact: true }).click()
  await page.locator('#ev-title').fill('Communication briefing evidence')
  await page.getByRole('button', { name: 'Remove clause 8.5.1' }).click()
  await page.locator('#ev-clause').click()
  await page.getByRole('menuitemcheckbox', { name: /7\.4 Communication/ }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: 'Link address' }).fill('https://example.com/briefing')
  await page.getByRole('button', { name: 'Add link', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Add evidence', exact: true }).click()
  await expect(figure(page, 'Evidence items linked')).toHaveText(String(raw.evidence.length + 1))
  await expect(figure(page, 'Requirements with current evidence')).not.toHaveText(before!)
  await page.reload()
  await expect(figure(page, 'Evidence items linked')).toHaveText(String(raw.evidence.length + 1))
})

for (const width of [390, 768, 1440]) test(`changed pages stay within ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  for (const route of ['/', '/evidence', '/readiness', '/qms/processes']) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
    await page.screenshot({ path: `../../deliverables/followup-${route.replaceAll('/', '-') || 'overview'}-${width}.png`, fullPage: true })
  }
})
