import { openPageLink } from "./helpers/page-links"
/**
 * Management review scenarios A–G (update kit, task 2). Run with `npm run e2e`, which starts the dev
 * server. The same steps were run in the agent sandbox against a bundled build; this file is the
 * repository copy for CI once @playwright/test is installed.
 */
import { test, expect, type Page, type BrowserContext } from "@playwright/test"

const IDS: Record<string, string> = { "Aaron Lim": "p-al", "Maria Santos": "p-ms", "Eric Navarro": "p-en", "Joy Aquino": "p-ja", "Rafael Ong": "p-ro", "Ben Castillo": "p-bc", "Carlos Mendoza": "p-cm" }
const U = ""

test("management review scenarios A–G", async ({ page: p, context: ctx }) => {
  test.setTimeout(180_000)
  await ctx.route("https://fonts.googleapis.com/**", r => r.fulfill({ status: 200, contentType: "text/css", body: "" }))
  const errs: string[] = []
  p.on("pageerror", (e) => errs.push(e.message))
  const check = (cond: boolean, msg: string) => expect.soft(cond, msg).toBe(true)
  const viewAs = async (pg: Page, name: string) => { await pg.evaluate((id) => localStorage.setItem("iqms.viewAs", id), IDS[name]); await pg.reload(); await pg.waitForTimeout(400) }
  // topics open in a centred pop-up; close it before picking another topic or using the page behind it
  const closeTopic = async () => { for (let k = 0; k < 3 && await p.locator("[role=dialog]").count(); k++) { await p.keyboard.press("Escape"); await p.waitForTimeout(150) } }
  const sel = async (name: string) => { await closeTopic(); await p.getByRole("tab", { name: /^Topics/ }).click(); await p.click(`button[aria-pressed]:has-text("${name}")`); await p.waitForTimeout(250) }
  const newTab = async (locator: ReturnType<Page["locator"]>) => { const [t] = await Promise.all([(ctx as BrowserContext).waitForEvent("page"), locator.click()]); await t.waitForLoadState(); await t.waitForTimeout(400); return t }
  await p.goto("/")
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("iqms.viewAs", "p-ms") })
  await p.reload()

  await test.step("A: create a review, c2 from objective records, period, new tab, analysis", async () => {
    await p.goto(U + "/management-review"); await p.waitForTimeout(300)
    await p.click('button:has-text("Plan review")'); await p.waitForTimeout(300)
    await p.fill("#mr-date", "2026-12-15"); check(await p.inputValue("#mr-start") === "2026-04-01", "A: period starts the day after MR-2026-01's period")
    await p.click('[role=dialog] button:has-text("Plan review")'); await p.waitForTimeout(500)
    check(/MR-2026-03$/.test(p.url()), "A: review MR-2026-03 created")
    check(await p.locator("text=Reporting period 1 April 2026 – 15 December 2026").count() === 1, "A: reporting period visible")
    await sel("Quality objectives")
    check(await p.locator("text=objectives on target").count() > 0, "A: summary worked out from objectives")
    check(await p.locator('a[aria-label^="Open OBJ-2026-01"]').count() === 1, "A: individual objectives listed")
    await p.fill("#an-summary", "Unsaved text stays")
    const tA = await newTab(p.locator('a[aria-label^="Open OBJ-2026-03"]'))
    check(/\/qms\/objectives\/OBJ-2026-03$/.test(tA.url()) && await tA.locator("h1", { hasText: "First-pass yield" }).count() === 1, "A: objective opens in a new tab")
    check(await p.inputValue("#an-summary") === "Unsaved text stays", "A: original review kept its unsaved text")
    await tA.close()
    await p.fill("#an-summary", "Two objectives below target."); await p.click('button:has-text("Save analysis")'); await p.waitForTimeout(300)
    check(await p.locator("dd", { hasText: "Two objectives below target." }).count() === 1, "A: preparer recorded an analysis")
  })

  await test.step("B: audit results on MR-2026-02", async () => {
    await p.goto(U + "/management-review/MR-2026-02"); await p.waitForTimeout(500); await sel("Audit results")
    check(await p.locator('a[aria-label^="Open IA-2026-04"]').count() === 1, "B: related audits listed")
    check(await p.locator('a[aria-label^="Open NC-2026-007"]').count() === 1, "B: audit findings (audit nonconformities) visible")
    const tB = await newTab(p.locator('a[aria-label^="Open IA-2026-06"]'))
    check(/\/audits\/IA-2026-06$/.test(tB.url()), "B: audit opens in a new tab"); await tB.close()
    check(await p.locator("text=Which findings from IA-2026-06 are still open").count() === 1, "B: evaluation with clarification shown")
  })

  await test.step("C: nonconformities, overdue and deliberate review status", async () => {
    await sel("Nonconformities and corrective actions")
    check(await p.locator("text=Root cause and action, overdue").count() >= 1, "C: overdue condition shown")
    check(await p.locator('a[aria-label^="Open NC-2026-011"]').count() === 1, "C: open NCs retrieved")
    await p.selectOption('select[aria-label="Review status of NC-2026-009"]', "Reviewed"); await p.waitForTimeout(300)
    check(await p.locator("text=Reviewed by Maria Santos").count() >= 2, "C: marked reviewed with name")
  })

  await test.step("D: missing evidence", async () => {
    await sel("Adequacy of resources")
    check(await p.locator("text=No source in ThryveMS.").count() >= 1, "D: missing-source state")
    await p.click('button:has-text("Add reference")'); await p.fill("#ref-url", "http://intranet/staffing.xlsx"); await p.fill("#ref-title", "Staffing plan 2027"); await p.click('button:has-text("Add reference") >> nth=-1'); await p.waitForTimeout(200)
    check(await p.locator("text=Paste a full https:// link").count() === 1, "D: unsafe link refused")
    await p.fill("#ref-url", "https://arden.sharepoint.example/sites/HR/staffing-2027.xlsx"); await p.click('button:has-text("Add reference") >> nth=-1'); await p.waitForTimeout(300)
    const ext = p.locator('a[aria-label*="Staffing plan 2027"]')
    check(await ext.count() === 1 && await ext.getAttribute("target") === "_blank" && (await ext.getAttribute("rel")) === "noopener noreferrer", "D: approved link added, opens safely")
    await viewAs(p, "Eric Navarro"); await sel("Adequacy of resources")
    await p.fill('textarea[aria-label="Evaluation of d Adequacy of resources"]', "Not enough on staffing.")
    await p.click('label:has-text("Ask the preparer to clarify")'); await p.fill('input[aria-label="Question for the preparer"]', "How many CMM operators will we have in Q1?")
    await p.click('button:has-text("Save evaluation") >> nth=0'); await p.waitForTimeout(300)
    await viewAs(p, "Maria Santos"); await p.goto(U + "/notifications"); await p.waitForTimeout(300)
    await expect(p.getByText("Eric Navarro asks for clarification on d Adequacy of resources")).toBeVisible()
    check(await p.locator("text=Eric Navarro asks for clarification on d Adequacy of resources").count() === 1, "D: preparer notified of the clarification request")
  })

  await test.step("E: decision on an underperforming KPI", async () => {
    await p.goto(U + "/management-review/MR-2026-02"); await p.waitForTimeout(400); await sel("Quality objectives")
    await p.click('button:has-text("Confirm analysis")'); await p.waitForTimeout(200)
    await p.click('button:has-text("Propose a decision")'); await p.waitForTimeout(200)
    await p.fill("#pd-text", "First-pass yield recovery plan"); check(await p.locator('[id="pd-objective:OBJ-2026-03"]').getAttribute("aria-checked") === "true" || await p.locator('[id="pd-objective:OBJ-2026-03"]').getAttribute("data-state") === "checked", "E: records needing attention preselected")
    await p.click('[role=dialog] button:has-text("Propose decision")'); await p.waitForTimeout(300)
    for (const name of ["Audit results", "Performance of external providers", "Actions on risks and opportunities"]) {
      await sel(name); await p.fill("#an-summary", `Reviewed: ${name}.`); await p.click('button:has-text("Save analysis")'); await p.waitForTimeout(200)
    }
    // open questions from top management must be answered before the review is recorded
    await sel("Audit results"); await p.fill('textarea[aria-label="Answer Eric Navarro"]', "Two findings are open; the report is issued by 30 October."); await p.click('button:has-text("Send answer")'); await p.waitForTimeout(300)
    await sel("Adequacy of resources"); await p.fill('textarea[aria-label="Answer Eric Navarro"]', "Two CMM operators from January."); await p.click('button:has-text("Send answer")'); await p.waitForTimeout(300)
    await closeTopic()
    p = await openPageLink(p, p.getByRole("link", {name: "Record the review", exact: true})); await p.waitForTimeout(500)
    check(await p.inputValue('input[aria-label="Decision 1"]') === "First-pass yield recovery plan", "E: proposed decision carried to Finish and lock")
    check(await p.inputValue('select[aria-label="Input"] >> nth=0') === "c2", "E: decision linked to input c2")
    await p.selectOption('select[aria-label="Owner"]', "Carlos Mendoza"); await p.fill('input[aria-label="Due"]', "2026-12-31")
    for (const q of ["Is the QMS still suitable?", "Is it adequate?", "Is it effective?", "Is it in line with the company’s direction?"]) await p.click(`[role=radiogroup][aria-label="${q}"] >> text=Yes`)
    await p.fill("#mr-sum", "The QMS works. Yield and supplier delivery need plans.")
    await p.click('button:has-text("Finish and lock")'); await p.waitForTimeout(700)
    check(await p.locator("text=Before you finish").count() === 0, "E/F: finished without problems")
    await p.goto(U + "/management-review"); await p.waitForTimeout(300); await p.click('button:has-text("Open actions")'); await p.waitForTimeout(300)
    check(await p.locator("text=First-pass yield recovery plan").count() === 1, "E: action in the tracker")
    p = await openPageLink(p, p.getByRole("link", {name: "First-pass yield recovery plan", exact: true})); await p.waitForTimeout(300)
    await expect(p.locator("text=c2 Quality objectives")).toBeVisible()
    await expect(p.locator('a[href="/qms/objectives/OBJ-2026-03"]')).toBeVisible()
    check(await p.locator("text=c2 Quality objectives").count() === 1 && await p.locator('a[href="/qms/objectives/OBJ-2026-03"]').count() === 1, "E: action traces to input and record")
    await viewAs(p, "Carlos Mendoza"); await p.goto(U + "/notifications"); await p.waitForTimeout(300)
    check(await p.locator("text=Action from MR-2026-02: First-pass yield recovery plan").count() === 1, "E: owner notified")
  })

  await test.step("F: frozen figures, evidence, later changes don't rewrite", async () => {
    await viewAs(p, "Maria Santos"); await p.goto(U + "/management-review/MR-2026-02"); await p.waitForTimeout(400); await sel("Quality objectives")
    const before = await p.locator("text=Finalized").count();
    check(before >= 1, "F: figures labelled Finalized")
    const fig1 = await p.locator("span.text-\\[1\\.75rem\\]").first().textContent()
    check(await p.locator('a[aria-label^="Open OBJ-2026-03"]').count() === 1, "F: supporting references still traceable")
    const evId = (await p.locator('a[href^="/evidence/EV-"]').first().textContent()) ?? ""
    await p.goto(U + "/evidence/" + evId.trim()); await p.waitForTimeout(300)
    await expect(p.locator("h1", { hasText: "Management review record MR-2026-02" })).toBeVisible()
    check(await p.locator("h1", { hasText: "Management review record MR-2026-02" }).count() === 1, "F: record in Evidence")
    for (const id of ["OBJ-2026-03", "OBJ-2026-04"]) { await p.goto(U + "/qms/objectives/" + id); await p.waitForTimeout(300); await p.click('button:has-text("Add result")'); await p.waitForTimeout(200); await p.selectOption("#kpi-p", "2026-10"); await p.fill("#kpi-v", "99"); await p.click('[role=dialog] button:has-text("Save result")'); await p.waitForTimeout(200) }
    await p.goto(U + "/management-review/MR-2026-02"); await p.waitForTimeout(400); await sel("Quality objectives")
    const fig2 = await p.locator("span.text-\\[1\\.75rem\\]").first().textContent()
    check(fig1 === fig2, `F: frozen figure unchanged after new results (${fig1} = ${fig2})`)
    await closeTopic(); await viewAs(p, "Eric Navarro"); await p.click('main button:has-text("Sign off")'); await p.waitForTimeout(200); await p.click('[role=dialog] button:has-text("Sign off")'); await p.waitForTimeout(300)
    check(await p.locator("text=Eric Navarro, Today, in ThryveMS").count() === 1, "F: sign-off in the ledger")
    await p.screenshot({ path: "shots/kit_F.png", fullPage: true })
  })

  await test.step("G: every link type, new tabs, unavailable records", async () => {
    await viewAs(p, "Maria Santos")
    const kinds = { "/management-review/MR-2026-03": [["Actions from previous reviews", "RA-04", "/management-review/actions/RA-04"], ["Actions from previous reviews", "MR-2026-01", "/management-review/MR-2026-01"], ["Changes in issues and interested parties", "ip-3", "/qms/organization/parties/ip-3"], ["Changes in issues and interested parties", "ci-3", "/qms/organization/issues/ci-3"], ["Process performance and product conformity", "purchasing", "/qms/processes/purchasing"], ["Actions on risks and opportunities", "R-031", "/risks/R-031"], ["Performance of external providers", "EV-0200", "/evidence/EV-0200"], ["Adequacy of resources", "EQP-WI-007", "/documents/EQP-WI-007"]] }
    for (const [path, list] of Object.entries(kinds)) {
      await p.goto(U + path); await p.waitForTimeout(400)
      for (const [input, id, route] of list) {
        await sel(input)
        const a = p.locator(`a[aria-label^="Open ${id}"]`).first()
        if (!(await a.count())) { check(false, `G: link for ${id}`); continue }
        const crossMenu = !route.startsWith("/management-review")
        check(crossMenu ? await a.getAttribute("target") === "_blank" && await a.getAttribute("rel") === "noopener noreferrer" : await a.getAttribute("target") !== "_blank", `G: ${id} correct same-menu/cross-menu navigation`)
        const t = await openPageLink(p, a); check(t.url().endsWith(route) && await t.locator("text=This page or record doesn’t exist").count() === 0, `G: ${id} opens ${route}`); await t.close()
      }
    }
    check(await p.locator('button[aria-pressed="true"]:has-text("Adequacy of resources")').count() === 1, "G: original review kept the selected input")
    // a reference to a confidential record shows Not available for the consultant
    await sel("Customer satisfaction and feedback"); await p.click('button:has-text("Add reference")'); await p.click('[role=radio]:has-text("Record in ThryveMS")'); await p.selectOption("#ref-kind", "evidence"); await p.fill("#ref-id", "EV-0211"); await p.click('button:has-text("Add reference") >> nth=-1'); await p.waitForTimeout(300)
    await viewAs(p, "Rafael Ong"); await sel("Customer satisfaction and feedback")
    check(await p.locator("text=Not available. The record was deleted, or you don’t have access to it.").count() === 1 && await p.locator('a[aria-label^="Open EV-0211"]').count() === 0, "G: restricted record shows Not available, no link")
    await viewAs(p, "Joy Aquino"); const tJ = await ctx.newPage(); await tJ.goto(U + "/risks/R-008"); await tJ.waitForTimeout(400)
    check(await tJ.locator("text=This page or record doesn’t exist").count() === 1, "G: access-denied record shows Not found in the new tab"); await tJ.close()
  })

  await test.step("pack page", async () => {
    await viewAs(p, "Maria Santos"); await p.goto(U + "/management-review/MR-2026-03"); await p.waitForTimeout(300)
    const tP = await openPageLink(p, p.locator('a:has-text("Open review pack")'))
    await expect(tP.locator("h1", { hasText: "management review" })).toBeVisible()
    await expect(tP.getByText("Your browser makes the PDF")).toBeVisible()
    check(await tP.locator("h1", { hasText: "management review" }).count() === 1 && await tP.locator("text=Your browser makes the PDF").count() === 1, "Pack page built from review data, no PDF claim"); await tP.close()
    await closeTopic(); await p.click('button:has-text("Send review pack")'); await p.waitForTimeout(300); await sel("Quality objectives")
    check(await p.locator("text=As sent in the review pack").count() === 1, "Pack: figures labelled Prepared after sending")
  })

  expect(errs).toEqual([])
})
