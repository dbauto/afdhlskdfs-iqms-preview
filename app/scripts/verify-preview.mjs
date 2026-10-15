import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import assert from 'node:assert/strict'
const html = await readFile('dist/index.html')
const server = createServer((req, res) => { if (req.url.split('?')[0] !== '/afdhlskdfs-iqms-preview/') { res.writeHead(404); return res.end() }; res.setHeader('Content-Type', 'text/html'); res.end(html) })
await new Promise(r => server.listen(4175, '127.0.0.1', r))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
try {
  for (const base of ['http://127.0.0.1:4175/afdhlskdfs-iqms-preview/', pathToFileURL(resolve('dist/index.html')).href]) {
    const context = await browser.newContext()
    const page = await context.newPage()
    const errors = []
    context.on('page', p => p.on('pageerror', e => errors.push(e.message)))
    context.on('request', r => { if (!r.url().startsWith(base.split('#')[0]) && !r.url().startsWith('data:')) errors.push(`External dependency: ${r.url()}`) })
    await page.goto(base + '#/qms/objectives/OBJ-2026-01')
    await page.locator('h1').waitFor()
    assert.ok(!(await page.textContent('body')).includes('This page or record doesn’t exist'))
    await page.goto(base + '#/management-review/MR-2026-02')
    await page.getByRole('button', { name: /Quality objectives/ }).click()
    const link = page.locator('a[aria-label^="Open OBJ-2026-01"]').first()
    const [popup] = await Promise.all([context.waitForEvent('page'), link.click()])
    await popup.locator('h1').waitFor()
    assert.ok(popup.url().endsWith('#/qms/objectives/OBJ-2026-01'))
    assert.deepEqual(errors, [])
    console.log(`PASS single HTML, no external dependencies, direct deep link and new tab: ${base.startsWith('file:') ? 'disk' : 'Pages subpath'}`)
    await context.close()
  }
} finally { await browser.close(); await new Promise(r => server.close(r)) }
