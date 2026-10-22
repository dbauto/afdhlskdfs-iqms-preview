import { expect, test, type Page } from "@playwright/test"
import { ROLES } from "../src/data/org"
import { classificationAllows } from "../src/lib/classification"
import type { DocRecord, Person } from "../src/data/types"
import type { State } from "../src/lib/store"
import { documentRights } from "../src/lib/document-control"

// Synthetic fixtures exercise the current preview. They are not server/tenant proof.
const actorName = "G1 synthetic reviewer"
const cases: { key: string; classification: DocRecord["classification"]; grant?: "named" | "owner" | "route" }[] = [
  { key: "public", classification: "Public" },
  { key: "internal", classification: "Internal" },
  { key: "confidential", classification: "Confidential" },
  { key: "confidential-named", classification: "Confidential", grant: "named" },
  { key: "confidential-owner", classification: "Confidential", grant: "owner" },
  { key: "confidential-route", classification: "Confidential", grant: "route" },
  { key: "high", classification: "Highly confidential" },
  { key: "high-named", classification: "Highly confidential", grant: "named" },
  { key: "high-owner", classification: "Highly confidential", grant: "owner" },
  { key: "high-route", classification: "Highly confidential", grant: "route" },
]

function expected(roleId: string, item: typeof cases[number]) {
  if (["Public", "Internal"].includes(item.classification)) return true
  if (roleId === "consultant") return item.classification === "Confidential" && item.grant === "named"
  if (item.classification === "Highly confidential") return item.grant === "named" || item.grant === "owner"
  return !!item.grant || ["admin", "quality", "top"].includes(roleId)
}

async function fixture(page: Page, roleId: string): Promise<State> {
  await page.goto("/")
  await expect(page.locator("h1")).toBeVisible()
  return page.evaluate(({ roleId, actorName, cases }) => {
    const envelope = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    const state = envelope.state
    const actor = { ...state.people[0], id: "g1-synthetic-actor", name: actorName, email: "g1-reviewer@example.invalid", roleId, status: "Active", accessEndsOn: "2099-12-31" }
    state.people.push(actor)
    state.processes.find((p: { name: string }) => p.name === "Operations").members.push(actorName)
    const original = state.documents.find((d: { id: string }) => d.id === "QMS-MAN-001")
    for (const item of cases) state.documents.push({
      ...original, id: `G1CASE-${item.key}`, title: `Synthetic G1 ${item.key} record`, description: "Synthetic policy fixture",
      process: "Operations", classification: item.classification, stage: "Published", revisions: [], events: [],
      owner: item.grant === "owner" ? actorName : "G1 synthetic custodian",
      viewers: item.grant === "named" ? [actorName] : [], reviewers: item.grant === "route" ? [actorName] : [], approvers: [],
    })
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(envelope))
    localStorage.setItem("iqms.viewAs", actor.id)
    return state
  }, { roleId, actorName, cases })
}

for (const role of ROLES) {
  test(`G1-POL-${role.id}: classification, named grants and direct/search visibility`, async ({ page }) => {
    await fixture(page, role.id)
    // The oracle above is explicit policy, not a call back into the implementation.
    for (const item of cases) {
      const classificationAllowed = expected(role.id, item)
      // This synthetic guest has no audit assignment or audit-linked documents.
      const allowed = classificationAllowed && role.id !== "guest-auditor"
      expect(classificationAllows(item.classification, {
        viewers: item.grant === "named" ? [actorName] : [],
        owner: item.grant === "owner" ? actorName : "Other synthetic actor",
        route: item.grant === "route" ? [actorName] : [],
      }, { name: actorName }, role), `${role.id}/${item.key} policy`).toBe(classificationAllowed)
      await page.goto(`/documents/G1CASE-${item.key}`)
      if (allowed) {
        // Current detail has a second, stricter gate than classificationAllows:
        // privileged/route-only Confidential access shows a locked ID-only view.
        // Characterize that source variant for G1; do not call it policy conformance.
        const lockedDetail = item.classification === "Confidential" && item.grant !== "named" && item.grant !== "owner"
        await expect(page.getByRole("heading", { name: lockedDetail ? `G1CASE-${item.key}` : `Synthetic G1 ${item.key} record`, exact: true })).toBeVisible()
        if (lockedDetail) {
          await expect(page.getByText("This record is confidential", { exact: true })).toBeVisible()
          await expect(page.getByText(`Synthetic G1 ${item.key} record`, { exact: true })).toHaveCount(0)
        }
      } else {
        await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
        await expect(page.getByText(`Synthetic G1 ${item.key} record`, { exact: true })).toHaveCount(0)
      }
    }
    await page.goto("/search?q=G1CASE-")
    for (const item of cases) {
      await expect(page.locator(`a[href="/documents/G1CASE-${item.key}"]`)).toHaveCount(expected(role.id, item) && role.id !== "guest-auditor" ? 1 : 0)
    }
    await expect(page.getByText(/\d+ hidden (items|records)/i)).toHaveCount(0)
  })
}

test("G1-POL-scope: process membership removal revokes direct links and search", async ({ page }) => {
  await fixture(page, "contributor")
  await page.goto("/documents/G1CASE-public")
  await expect(page.getByRole("heading", { name: "Synthetic G1 public record", exact: true })).toBeVisible()
  await page.evaluate(name => {
    const envelope = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    for (const p of envelope.state.processes) p.members = p.members.filter((n: string) => n !== name)
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(envelope))
  }, actorName)
  await page.reload()
  await expect(page.getByText("This page or record doesn’t exist")).toBeVisible()
  await page.goto("/search?q=G1CASE-")
  await expect(page.getByText("0 results.")).toBeVisible()
})

test("G1-POL-module: a disabled Documents module denies direct links and search", async ({ page }) => {
  await fixture(page, "admin")
  await page.evaluate(() => localStorage.setItem("iqms.modules", JSON.stringify({ arden: { Documents: false } })))
  await page.goto("/documents/G1CASE-public")
  await expect(page.getByText("Documents isn’t turned on for Arden & Co.", { exact: true })).toBeVisible()
  await page.goto("/search?q=G1CASE-")
  await expect(page.getByText("0 results.")).toBeVisible()
})

test("G1-POL-lifecycle: document access rejects deactivation and expiry for every role", async ({ page }) => {
  const state = await fixture(page, "admin")
  const doc = state.documents.find(d => d.id === "G1CASE-public")!
  for (const role of ROLES) {
    const actor = state.people.find(p => p.id === "g1-synthetic-actor")!
    for (const mode of ["active", "deactivated", "expired"] as const) {
      const person: Person = { ...actor, roleId: role.id, status: mode === "deactivated" ? "Deactivated" : "Active", accessEndsOn: mode === "expired" ? "2000-01-01" : "2099-12-31" }
      const current = { ...state, people: state.people.map(p => p.id === person.id ? person : p) }
      expect(documentRights(current, person, doc).view, `${role.id}/${mode}`).toBe(mode === "active")
    }
  }
})
