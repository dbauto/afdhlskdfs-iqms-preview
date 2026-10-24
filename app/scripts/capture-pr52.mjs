import { chromium } from "@playwright/test"
import { createServer } from "node:http"
import { mkdir, readFile } from "node:fs/promises"
import assert from "node:assert/strict"

const html = await readFile("dist/index.html")
const server = createServer((req, res) => {
  if (req.url.split("?")[0] !== "/afdhlskdfs-iqms-preview/") {
    res.writeHead(404)
    return res.end()
  }
  res.setHeader("Content-Type", "text/html")
  res.end(html)
})
await new Promise(resolve => server.listen(4176, "127.0.0.1", resolve))
const browser = await chromium.launch()
const sizes = [[390, 844], [768, 1024], [1280, 650], [1440, 900], [1920, 1080]]
const roles = [{ name: "Aaron Lim", slug: "admin" }, { name: "Ben Castillo", slug: "contributor" }]
const routes = [{ hash: "/", slug: "overview" }, { hash: "/risks", slug: "risks" }]
const out = "test-results/pr52-screenshots"
await mkdir(out, { recursive: true })
let shots = 0
try {
  for (const [width, height] of sizes) {
    for (const theme of ["Light", "Dark"]) {
      for (const role of roles) {
        const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
        try {
          await page.goto("http://127.0.0.1:4176/afdhlskdfs-iqms-preview/#/", { waitUntil: "networkidle" })
          let userTrigger = page.locator("header button").last()
          await userTrigger.click()
          await page.getByRole("menuitemradio", { name: theme, exact: true }).click()
          await page.keyboard.press("Escape")
          if (role.slug !== "admin") {
            userTrigger = page.locator("header button").last()
            await userTrigger.click()
            await page.getByRole("menuitem", { name: /Ben Castillo/ }).click()
          }
          for (const route of routes) {
            await page.goto("http://127.0.0.1:4176/afdhlskdfs-iqms-preview/#" + route.hash, { waitUntil: "networkidle" })
            await page.locator("#main").waitFor()
            await page.getByRole("status", { name: /^Loading / }).waitFor({ state: "hidden", timeout: 15000 }).catch(() => {})
            const x = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth, dark: document.documentElement.classList.contains("dark") }))
            assert(x.scroll <= x.width + 1, `Page overflow ${route.slug} ${role.slug} ${theme} ${width}: ${JSON.stringify(x)}`)
            assert.equal(x.dark, theme === "Dark", `Theme not applied for ${theme}`)
            if (width >= 768 && width > 1340) {
              assert(await page.getByRole("link", { name: "ThryveMS overview" }).count() > 0, "Product wordmark missing from expanded sidebar")
            }
            if (width < 768) {
              await page.getByRole("button", { name: "Open menu" }).click()
              assert(await page.getByText("ThryveMS", { exact: true }).count() > 0, "Mobile menu missing product wordmark")
              await page.getByRole("button", { name: "Close menu" }).click()
            }
            await page.screenshot({ path: `${out}/${route.slug}-${role.slug}-${theme.toLowerCase()}-${width}x${height}.png`, fullPage: true })
            shots++
          }
        } finally {
          await page.close()
        }
      }
    }
  }
  console.log(`PR52 verified: ${shots} screenshots, 2 roles, 2 appearances, 5 viewport sizes, 2 routes; no horizontal overflow`)
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
