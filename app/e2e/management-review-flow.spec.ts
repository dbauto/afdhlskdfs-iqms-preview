import { test, expect, type Page } from "@playwright/test"
import type { State } from "../src/lib/store"

const data = (p: Page): Promise<State> => p.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
async function install(p: Page, state: State, who: string, route: string) {
  await p.evaluate(
    ({ state, who }) => {
      const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
      localStorage.setItem("thryvems.preview.v1", JSON.stringify({ ...saved, state }))
      localStorage.setItem("iqms.viewAs", who)
    },
    { state, who },
  )
  await p.goto(route)
}
async function as(p: Page, who: string) {
  await p.evaluate((who) => localStorage.setItem("iqms.viewAs", who), who)
  await p.reload()
}
async function fresh(p: Page) {
  await p.goto("/")
  await p.waitForFunction(() => !!localStorage.getItem("thryvems.preview.v1"))
  return data(p)
}

test("the review can't be recorded before the pack, freezes the pack figures, and only offers people with access", async ({ page }) => {
  let state = await fresh(page)
  await install(page, state, "p-ms", "/management-review")
  await page.getByRole("button", { name: "Use ISO 9001 template", exact: true }).click()
  await page.fill("#mr-title", "December 2026 management review")
  await page.fill("#mr-date", "2026-12-15")
  await page.getByRole("dialog").getByRole("button", { name: "Save as draft", exact: true }).click()
  await expect(page).toHaveURL(/MR-2026-04$/)
  await expect(page.getByRole("link", { name: "Record the review", exact: true })).toHaveCount(0)
  await expect(page.getByText(/You can record the review once top management has the pack/)).toBeVisible()
  state = await data(page)
  expect(state.reviews.find((r) => r.id === "MR-2026-04")?.stage).toBe("Planned")
  expect(state.reviews.find((r) => r.id === "MR-2026-04")?.reviewers).toEqual(["Eric Navarro"])
  await page.goto("/management-review/MR-2026-04/record")
  await expect(page).toHaveURL(/\/management-review\/MR-2026-04$/)
  // hand-to lists only people who can open Management Review (inside the topic pop-up)
  await page.locator("button[aria-pressed]", { hasText: "Actions from previous reviews" }).click()
  await page.getByRole("button", { name: "Hand to someone", exact: true }).click()
  await expect(page.locator("#hand-to option", { hasText: "Ben Castillo" })).toHaveCount(0)
  await expect(page.locator("#hand-to option", { hasText: "Joy Aquino" })).toHaveCount(1)
  await page.getByRole("button", { name: "Hand over", exact: true }).click()
  expect((await data(page)).reviews.find((r) => r.id === "MR-2026-04")?.stage).toBe("Preparing")

  // MR-2026-02: the pack was sent. Without a meeting, an answer is needed before locking.
  state = await data(page)
  state.reviewEvaluations = state.reviewEvaluations.filter((e) => e.reviewId !== "MR-2026-02")
  await install(page, state, "p-ms", "/management-review/MR-2026-02/record")
  for (const q of ["Is the QMS still suitable?", "Is it adequate?", "Is it effective?", "Is it in line with the company’s direction?"])
    await page.locator(`[role=radiogroup][aria-label="${q}"]`).getByText("Yes", { exact: true }).click()
  await page.fill("#mr-sum", "The QMS works.")
  await expect.poll(async () => (await data(page)).reviews.find((r) => r.id === "MR-2026-02")?.recordDraft?.summary).toBe("The QMS works.")
  await page.reload()
  await expect(page.locator("#mr-sum")).toHaveValue("The QMS works.")
  await page.getByRole("button", { name: "Finish and lock", exact: true }).click()
  await expect(page.getByText(/Top management hasn’t evaluated any input yet/)).toBeVisible()
  await expect(page.getByText(/no confirmed analysis/)).toBeVisible()

  // with an evaluation and every input prepared, the lock keeps the figures that were sent
  state = await data(page)
  const review = state.reviews.find((r) => r.id === "MR-2026-02")!
  review.inputs = review.inputs.map((i) => (i.notApplicable || (i.analysis?.summary && !i.draft) ? i : { ...i, draft: false, handedTo: undefined, analysis: { summary: `Reviewed ${i.ref}.`, observations: "", attention: "", recommendations: "" } }))
  state.reviewEvaluations.push({ id: "EVL-900", reviewId: "MR-2026-02", ref: "c2", by: "Eric Navarro", comment: "Agreed.", at: "2026-10-20T08:00:00" })
  // mark the figure as sent so the lock can be told apart from a live recount
  review.packSnapshot!.figures.c2 = { ...review.packSnapshot!.figures.c2, value: "7 of 9 (as sent)" }
  await install(page, state, "p-ms", "/management-review/MR-2026-02/record")
  await expect(page.locator("#mr-sum")).toHaveValue("The QMS works.")
  await page.getByRole("button", { name: "Finish and lock", exact: true }).click()
  await expect(page).toHaveURL(/\/management-review\/MR-2026-02$/)
  const locked = (await data(page)).reviews.find((r) => r.id === "MR-2026-02")!
  expect(locked.stage).toBe("Reviewed")
  expect(locked.recordDraft).toBeUndefined()
  expect(locked.inputs.find((i) => i.ref === "c2")?.frozen?.value).toBe("7 of 9 (as sent)")
  expect(locked.inputs.find((i) => i.ref === "c2")?.frozen?.liveAtLock?.value).toBeTruthy()
})

test("every reviewer signs; a change request waits for an amendment; amendments change the action; done needs evidence or a reason", async ({ page }) => {
  const state = await fresh(page)
  const r = state.reviews.find((x) => x.id === "MR-2026-02")!
  Object.assign(r, {
    stage: "Reviewed",
    reviewers: ["Eric Navarro", "Grace Lim"],
    lockedAt: "2026-10-20T08:00:00",
    recordedOn: "Today",
    conclusion: { suitable: "Yes", adequate: "Yes", effective: "Partly", aligned: "Yes", reasons: { effective: "Yield below target." }, summary: "The QMS works; yield needs a plan." },
    signOff: undefined,
    signOffs: undefined,
  })
  state.reviewActions.push({ id: "RA-90", reviewId: "MR-2026-02", text: "Yield recovery plan", type: "Improvement", owner: "Carlos Mendoza", due: "31 Dec 2026", dueDate: "2026-12-31", state: "Open" })
  await install(page, state, "p-gl", "/management-review/MR-2026-02")
  await expect(page.getByText(/Waiting for Eric Navarro and Grace Lim to sign off/).first()).toBeVisible()
  await page.getByRole("button", { name: "Request changes", exact: true }).click()
  await page.fill("#cr-reason", "The yield plan needs an owner in Operations and a January date.")
  await page.getByRole("button", { name: "Send request", exact: true }).click()
  await expect(page.getByText("Grace Lim asked for changes").first()).toBeVisible()
  await as(page, "p-en")
  await expect(page.getByRole("button", { name: "Sign off", exact: true })).toHaveCount(0)

  await as(page, "p-ms")
  await page.getByRole("button", { name: "Amend record", exact: true }).click()
  await page.locator("#am-kind").selectOption("action")
  await page.locator("#am-action").selectOption("RA-90")
  await expect(page.locator("#am-owner option", { hasText: "Ben Castillo" })).toHaveCount(0)
  await page.locator("#am-owner").selectOption("Daniel Reyes")
  await page.fill("#am-due", "2027-01-31")
  await page.fill("#am-reason", "Requested by Grace Lim.")
  await page.getByRole("button", { name: "Add amendment", exact: true }).click()
  let now = await data(page)
  expect(now.reviewActions.find((a) => a.id === "RA-90")).toMatchObject({ owner: "Daniel Reyes", dueDate: "2027-01-31" })
  const rev = now.reviews.find((x) => x.id === "MR-2026-02")!
  expect(rev.changeRequests?.[0].resolvedBy).toBe("Maria Santos")
  expect(rev.amendments?.at(-1)?.action?.before.owner).toBe("Carlos Mendoza")

  await as(page, "p-en")
  await page.getByRole("button", { name: "Sign off", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Sign off", exact: true }).click()
  await expect(page.getByText(/Waiting for Grace Lim to sign off/).first()).toBeVisible()
  await as(page, "p-ms")
  await expect(page.getByRole("button", { name: "Close review", exact: true })).toHaveCount(0)

  // changing the conclusion asks for sign-off again
  await page.getByRole("button", { name: "Amend record", exact: true }).click()
  await page.locator("#am-kind").selectOption("summary")
  await page.fill("#am-summary", "The QMS works; yield and supplier delivery need plans.")
  await page.fill("#am-reason", "Supplier delivery was left out.")
  await page.getByRole("button", { name: "Add amendment", exact: true }).click()
  await expect(page.getByText(/Waiting for Eric Navarro and Grace Lim to sign off/).first()).toBeVisible()
  for (const who of ["p-en", "p-gl"]) {
    await as(page, who)
    await page.getByRole("button", { name: "Sign off", exact: true }).click()
    await page.getByRole("dialog").getByRole("button", { name: "Sign off", exact: true }).click()
  }
  now = await data(page)
  expect(now.reviews.find((x) => x.id === "MR-2026-02")!.signOffs).toHaveLength(3)

  // RA-90 is still open and no later review exists, so the review stays open until it's done
  await as(page, "p-ms")
  await expect(page.getByRole("button", { name: "Close review", exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Done", exact: true }).first().click()
  await expect(page.getByRole("dialog").getByRole("button", { name: "Mark done", exact: true })).toBeDisabled()
  await page.locator('textarea[id^="done-note-"]').fill("Confirmed at the operations meeting.")
  await page.getByRole("dialog").getByRole("button", { name: "Mark done", exact: true }).click()
  now = await data(page)
  const done = now.reviewActions.find((a) => a.reviewId === "MR-2026-02" && a.state === "Done")
  expect(done?.doneNote).toBe("Confirmed at the operations meeting.")
  await page.goto("/management-review")
  await page.getByRole("button", { name: /Open actions/ }).click()
  await expect(page.getByRole("row", { name: /Re-evaluate all approved suppliers/ }).getByText("Overdue")).toBeVisible()
})

test("top management starts an internal review of what they choose, and only who may deletes it", async ({ page }) => {
  const state = await fresh(page)
  await install(page, state, "p-ms", "/management-review")
  await page.getByRole("button", { name: "Start a review", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("radio", { name: "Internal review" }).waitFor()
  await expect(dialog.getByText("How it’s held")).toHaveCount(0)
  await page.fill("#mr-title", "Late deliveries to Cebu")
  await page.fill("#mr-date", "2026-12-01")
  // a link needs a name and a full https address
  await dialog.getByRole("radio", { name: "Link", exact: true }).click()
  await page.fill("#ti-url", "https://arden.sharepoint.example/sites/Ops/report.xlsx")
  await dialog.getByRole("button", { name: "Add to review", exact: true }).click()
  await expect(dialog.getByText("Give the link a name, so top management knows what it is before opening it.")).toBeVisible()
  await page.fill("#ti-name", "Courier report")
  await dialog.getByRole("button", { name: "Add to review", exact: true }).click()
  await dialog.getByRole("radio", { name: "Own topic", exact: true }).click()
  await page.fill("#ti-name", "Should we change couriers?")
  await dialog.getByRole("button", { name: "Add to review", exact: true }).click()
  await dialog.getByRole("button", { name: "Create and open workspace", exact: true }).click()
  await expect(page).toHaveURL(/MR-2026-04$/)
  const r = (await data(page)).reviews.find((x) => x.id === "MR-2026-04")!
  expect(r.kind).toBe("Internal")
  expect(r.format).toBe("No meeting")
  expect(r.inputs.map((i) => i.item?.type)).toEqual(["Link", "Own topic"])
  await expect(page.getByText("Courier report").first()).toBeVisible()
  expect(r.requestedBy).toBe("Eric Navarro")
  // top management on the review can edit it; the quality manager can delete it while nothing is evaluated
  await as(page, "p-en")
  await page.goto("/management-review")
  await page.getByRole("button", { name: "Actions for MR-2026-04" }).click()
  await expect(page.getByRole("menuitem", { name: "Edit" })).toBeVisible()
  await page.keyboard.press("Escape")
  await as(page, "p-ms")
  await page.goto("/management-review")
  await page.getByRole("button", { name: "Actions for MR-2026-04" }).click()
  await page.getByRole("menuitem", { name: "Delete" }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: /^Delete/ }).click()
  await expect.poll(async () => (await data(page)).reviews.some((x) => x.id === "MR-2026-04")).toBe(false)
  // a signed review is kept: no delete
  await expect(page.getByRole("button", { name: "Actions for MR-2026-01" })).toHaveCount(0)
})

test("the reviews list filters by what is routed to you, what you asked for, open and completed; and there is no approvals list", async ({ page }) => {
  const state = await fresh(page)
  await install(page, state, "p-en", "/management-review")
  await expect(page.getByText("things for top management to approve between reviews")).toHaveCount(0)
  // top management asks for reviews, so they can start one
  await expect(page.getByRole("button", { name: "Start a review", exact: true })).toBeVisible()
  await page.getByRole("button", { name: /^Requested by me/ }).click()
  await expect(page.getByRole("link", { name: /MR-2026-03/ })).toBeVisible()
  await expect(page.getByRole("link", { name: /MR-2026-01/ })).toHaveCount(0)
  await page.getByRole("button", { name: /^Completed/ }).click()
  await expect(page.getByRole("link", { name: /MR-2026-03/ })).toHaveCount(0)
  await expect(page.getByRole("button", { name: /^Approvals between reviews/ })).toHaveCount(0)
  // a preparer of one topic sees the review under For me
  await as(page, "p-gl")
  await page.goto("/management-review")
  await page.getByRole("button", { name: /^For me/ }).click()
  await expect(page.getByRole("link", { name: /MR-2026-03/ })).toBeVisible()
})
