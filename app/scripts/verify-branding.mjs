import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'

const prefix = '/afdhlskdfs-iqms-preview/'
const root = resolve('dist')
const server = createServer(async (req, res) => {
  try {
    if (!req.url.startsWith(prefix)) throw new Error('Outside preview')
    const path = resolve(root, decodeURIComponent(req.url.slice(prefix.length).split('?')[0]) || 'index.html')
    if (!path.startsWith(root + '/')) throw new Error('Outside build')
    const bytes = await readFile(path)
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(path)] || 'application/octet-stream')
    res.end(bytes)
  } catch { res.writeHead(404); res.end('Not found') }
})
await new Promise(r => server.listen(4174, '127.0.0.1', r))
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const failures = []
  page.on('pageerror', e => failures.push(e.message))
  page.on('response', r => { if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`) })
  for (const appearance of ['Light', 'Dark']) {
    for (const [name, route] of [['sign-in', '/sign-in'], ['platform', '/platform'], ['legal', '/legal'], ['about', '/settings/about']]) {
      await page.goto(`http://127.0.0.1:4174${prefix}#${route}`)
      await page.evaluate(a => localStorage.setItem('iqms.appearance', a), appearance)
      await page.reload()
      await page.locator('svg[aria-label="ThryveMS"]').first().waitFor()
      assert.equal(await page.title(), 'ThryveMS')
      assert.ok(await page.locator('svg[aria-label="ThryveMS"]').first().isVisible())
      await page.screenshot({ path: `${process.env.SHOTS_DIR || '../../deliverables'}/rename-${name}-${appearance.toLowerCase()}.png`, fullPage: true })
      console.log(`PASS ${name} ${appearance}: inline mark visible under ${prefix}`)
    }
  }
  assert.deepEqual(failures, [])
  console.log('PASS no page errors or HTTP failures')
} finally { await browser.close(); await new Promise(r => server.close(r)) }
