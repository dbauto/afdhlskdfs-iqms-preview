import { test, expect, type Page } from "@playwright/test"

const viewAs = async (page: Page, id: string) => {
  await page.goto("/")
  await page.evaluate((p) => localStorage.setItem("iqms.viewAs", p), id)
}
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)

test("improvements and customer complaints are real records with owners, steps and a nonconformity link", async ({ page }) => {
  await viewAs(page, "p-ms")
  await page.goto("/corrective-action?tab=imp")
  await page.getByRole("button", { name: "Add improvement" }).click()
  await page.locator("#imp-title").fill("Pre-start guard check card")
  await page.locator("#imp-proc").selectOption("Operations")
  await expect(page.locator("#imp-owner")).toHaveValue("Carlos Mendoza")
  await page.getByRole("button", { name: "Add improvement", exact: true }).last().click()
  const imp = (await saved(page)).improvements.find((i: { title: string }) => i.title === "Pre-start guard check card")
  expect(imp).toMatchObject({ process: "Operations", owner: "Carlos Mendoza", state: "Proposed" })

  await viewAs(page, "p-cm")
  await page.goto("/my-tasks")
  await expect(page.getByText("Pre-start guard check card")).toBeVisible()
  await page.goto(`/corrective-action/improvements/${imp.id}`)
  await page.getByRole("button", { name: "Plan it" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  await page.getByRole("button", { name: "Mark done" }).click()
  await page.locator("#imp-note").fill("Cards in use on all three lines since 1 Nov.")
  await page.getByRole("dialog").getByRole("button", { name: "Mark done" }).click()
  await expect(page.getByText("Cards in use on all three lines since 1 Nov.")).toBeVisible()

  // complaint: log it, raise a nonconformity from it, respond, close
  await viewAs(page, "p-ms")
  await page.goto("/corrective-action?tab=cc")
  await page.getByRole("button", { name: "Log customer complaint" }).click()
  await page.locator("#cc-customer").fill("Pacific Freight")
  await page.locator("#cc-title").fill("Burr on mounting holes")
  await page.locator("#cc-proc").selectOption("Inspection & release")
  await page.getByRole("button", { name: "Log complaint" }).click()
  const cc = (await saved(page)).complaints.find((c: { title: string }) => c.title === "Burr on mounting holes")
  expect(cc).toMatchObject({ owner: "Ana Cruz", state: "New" })
  await page.goto(`/corrective-action/complaints/${cc.id}`)
  await page.getByRole("button", { name: "Raise nonconformity" }).click()
  const sheet = page.getByRole("dialog")
  await expect(page.locator("#nc-title")).toHaveValue(`Customer complaint ${cc.id}: Burr on mounting holes`)
  await page.locator("#nc-details").fill("Burr found on 12 of 50 parts.")
  await sheet.getByRole("button", { name: "Add nonconformity" }).click()
  const after = await saved(page)
  const nc = after.ncs.find((n: { title: string }) => n.title === `Customer complaint ${cc.id}: Burr on mounting holes`)
  expect(nc).toMatchObject({ source: "Customer complaint", process: "Inspection & release" })
  expect(after.complaints.find((c: { id: string }) => c.id === cc.id).ncId).toBe(nc.id)
  await page.getByRole("button", { name: "Record response" }).click()
  await page.locator("#cc-response").fill("Replacement parts shipped; deburring added to the final check.")
  await page.getByRole("dialog").getByRole("button", { name: "Record response" }).click()
  await page.getByRole("button", { name: "Close", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Close complaint" }).click()
  expect((await saved(page)).complaints.find((c: { id: string }) => c.id === cc.id)).toMatchObject({ state: "Closed", satisfied: "Yes" })

  // corrective actions are the real tasks on nonconformities
  await page.goto("/corrective-action?tab=cas")
  await expect(page.getByRole("link", { name: "NC-2026-005" }).first()).toBeVisible()
})

test("the verifier is chosen with a quality manager by default, and effectiveness waits for the rule", async ({ page }) => {
  await viewAs(page, "p-bc")
  await page.goto("/corrective-action")
  await page.getByRole("button", { name: "Add nonconformity" }).click()
  await expect(page.locator("#nc-owner")).toHaveValue("Carlos Mendoza")
  await expect(page.locator("#nc-verifier")).toHaveValue("Maria Santos")
  await page.locator("#nc-title").fill("Guard interlock taped")
  await page.locator("#nc-details").fill("Seen on line 3.")
  await page.locator("#nc-verifier").selectOption("Nina Flores")
  await page.getByRole("dialog").getByRole("button", { name: "Add nonconformity" }).click()
  const nc = (await saved(page)).ncs.find((n: { title: string }) => n.title === "Guard interlock taped")
  expect(nc.verifier).toBe("Nina Flores")

  // verified today: closing as effective waits for the QMS rules' days
  await page.evaluate((id) => {
    const raw = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    raw.state.ncs = raw.state.ncs.map((n: { id: string }) => (n.id === id ? { ...n, stage: 5, verifiedDate: new Date().toISOString().slice(0, 10) } : n))
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(raw))
  }, nc.id)
  await viewAs(page, "p-cm")
  await page.goto(`/corrective-action/${nc.id}`)
  await expect(page.getByRole("button", { name: "Close as effective" })).toBeDisabled()
  await expect(page.getByText(/You can check effectiveness from/)).toBeVisible()
})

test("a scheduled document review can be recorded with no change, and publishing restarts the review clock", async ({ page }) => {
  await viewAs(page, "p-cm")
  await page.goto("/my-tasks")
  await expect(page.getByText("Tool change")).toBeVisible()
  await page.goto("/documents/OPS-WI-017")
  await page.getByRole("button", { name: "Reviewed, no change" }).click()
  await page.locator("#doc-review-note").fill("Checked against the current setup sheets.")
  await page.getByRole("button", { name: "Record review" }).click()
  const doc = (await saved(page)).documents.find((d: { id: string }) => d.id === "OPS-WI-017")
  expect(doc.events.at(-1)).toMatchObject({ kind: "Reviewed, no change", reason: "Checked against the current setup sheets." })
  await page.goto("/my-tasks")
  await expect(page.getByRole("heading", { name: "My tasks", level: 1 })).toBeVisible()
  await expect(page.getByText("Tool change")).toHaveCount(0)
})

test("settings save, survive a reload and take effect", async ({ page }) => {
  await viewAs(page, "p-al")
  await page.goto("/settings/qms-rules")
  await page.locator("#r-rep").fill("14")
  await page.getByRole("button", { name: "Save rules" }).click()
  await page.reload()
  await expect(page.locator("#r-rep")).toHaveValue("14")

  await page.goto("/settings/numbering")
  await page.locator("#n-sep").selectOption(".")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.reload()
  await expect(page.locator("#n-sep")).toHaveValue(".")

  await page.goto("/settings/organization")
  await page.locator("#o-name").fill("Arden Precision")
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.reload()
  await expect(page.locator("#o-name")).toHaveValue("Arden Precision")
  await expect(page.getByText("Arden Precision").first()).toBeVisible()

  await page.goto("/settings/security")
  const sw = page.locator("#sec-appr")
  const before = await sw.getAttribute("aria-checked")
  await sw.click()
  await page.getByRole("button", { name: "Save changes" }).click()
  await page.reload()
  await expect(page.locator("#sec-appr")).not.toHaveAttribute("aria-checked", before!)

  // notification preferences are applied: Carlos turns off "waiting on you", then gets nothing for a new nonconformity
  await viewAs(page, "p-cm")
  await page.goto("/settings/notifications")
  await page.getByRole("checkbox", { name: "Something is waiting on you, in ThryveMS" }).click()
  await page.getByRole("button", { name: "Save changes" }).click()
  await viewAs(page, "p-ms")
  await page.goto("/corrective-action")
  await page.getByRole("button", { name: "Add nonconformity" }).click()
  await page.locator("#nc-proc").selectOption("Operations")
  await page.locator("#nc-title").fill("Quiet test nonconformity")
  await page.locator("#nc-details").fill("Checking notification preferences.")
  await page.getByRole("dialog").getByRole("button", { name: "Add nonconformity" }).click()
  const notes = (await saved(page)).notifications.filter((n: { to: string; title: string }) => n.to === "Carlos Mendoza" && n.title.includes("Quiet test"))
  expect(notes).toHaveLength(0)

  // inviting a process owner asks which processes
  await viewAs(page, "p-al")
  await page.goto("/settings/users")
  await page.getByRole("button", { name: "Invite people" }).click()
  await page.locator("#inv-e").fill("new.owner@arden.example")
  await page.locator("#inv-r").selectOption("owner")
  await page.getByRole("button", { name: "Send invitations" }).click()
  await expect(page.getByText("Choose at least one process, or they won’t see anything.")).toBeVisible()
  await page.getByRole("dialog").getByText("Operations", { exact: true }).click()
  await page.getByRole("button", { name: "Send invitations" }).click()
  await page.reload()
  await page.getByRole("tab", { name: /Invitations/ }).click()
  await expect(page.getByText("new.owner@arden.example")).toBeVisible()
  await expect(page.getByText(/Will work in Operations/).first()).toBeVisible()
})

test("people can upload a profile photo, which shows in place of their initials", async ({ page }) => {
  await viewAs(page, "p-cm")
  await page.goto("/settings/profile")
  const png = await page.evaluate(() => {
    const c = document.createElement("canvas")
    c.width = 320
    c.height = 200
    const x = c.getContext("2d")!
    x.fillStyle = "#3a6"
    x.fillRect(0, 0, 320, 200)
    return c.toDataURL("image/png").split(",")[1]
  })
  await page.locator('input[type="file"][aria-label="Choose a profile photo"]').setInputFiles({ name: "me.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") })
  await expect(page.getByRole("button", { name: "Upload a different photo" })).toBeVisible()
  const photo = (await saved(page)).people.find((p: { id: string }) => p.id === "p-cm").photo
  expect(photo.source).toBe("upload")
  expect(photo.url).toMatch(/^data:image\/jpeg;base64,/)
  await expect(page.locator("header img").first()).toBeVisible()
  await page.getByRole("button", { name: "Remove photo" }).click()
  await expect(page.locator("header img")).toHaveCount(0)
})
