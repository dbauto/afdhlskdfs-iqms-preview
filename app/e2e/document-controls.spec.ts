import { test, expect, type Page } from "@playwright/test"
import {
  applyDocumentCommand,
  controlledRevision,
  INITIAL_SCOPE,
} from "../src/lib/document-control"
import { clauseCoverage } from "../src/lib/record-figures"
import type { State } from "../src/lib/store"
import type { DocRecord } from "../src/data/types"

const manual = "QMS-MAN-001"
async function state(page: Page): Promise<State> {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state,
  )
}
async function as(page: Page, id: string) {
  await page.evaluate((id) => localStorage.setItem("iqms.viewAs", id), id)
  await page.reload()
}
async function storedDoc(page: Page) {
  return (await state(page)).documents.find((d) => d.id === manual)!
}

test("scope revision edits real content, persists drafts, reviews and publishes without overwriting the earlier scope", async ({
  page,
}) => {
  await page.goto("/qms/organization")
  const original = await storedDoc(page)
  await page.getByRole("button", { name: "Revise scope", exact: true }).click()
  await expect(page.locator("#scope-statement")).toHaveValue(
    INITIAL_SCOPE.statement,
  )
  await page
    .locator("#scope-statement")
    .fill(
      "Synthetic revised scope covering the head office and production plant.",
    )
  await page
    .locator("#scope-products")
    .fill("Synthetic component design and assembly.")
  await page.locator("#rv-note").fill("Add the assembly service to the scope.")
  await page
    .getByRole("button", { name: "Start revision 08", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await expect(
    page.getByText(
      "Synthetic revised scope covering the head office and production plant.",
      { exact: true },
    ),
  ).toBeVisible()
  await page.reload()
  let doc = await storedDoc(page)
  expect(doc.stage).toBe("Draft")
  expect(doc.rev).toBe("08")
  expect(controlledRevision(doc)?.rev).toBe("07")
  expect(controlledRevision(doc)?.scopeContent?.statement).toBe(
    INITIAL_SCOPE.statement,
  )
  expect(controlledRevision(doc)?.link).toBe(original.link)
  await page.getByRole("button", { name: "Revise scope", exact: true }).click()
  await page
    .locator("#scope-sites")
    .fill(
      "Synthetic head office and production plant, including the new assembly area.",
    )
  await page.getByRole("button", { name: "Save changes", exact: true }).click()
  await page.getByRole("button", { name: "Revise scope", exact: true }).click()
  await expect(page.locator("#scope-sites")).toHaveValue(/new assembly area/)
  await page
    .getByRole("button", { name: "Submit for review", exact: true })
    .click()
  await page.goto(`/documents/${manual}`)
  await as(page, "p-nf")
  await page
    .getByRole("button", { name: "Complete technical review", exact: true })
    .click()
  await as(page, "p-en")
  await page
    .getByRole("button", { name: "Approve revision", exact: true })
    .click()
  await expect(
    page.getByText("Ready to publish", { exact: true }).first(),
  ).toBeVisible()
  await as(page, "p-al")
  await page.getByRole("button", { name: "Publish", exact: true }).click()
  doc = await storedDoc(page)
  expect(doc.stage).toBe("Published")
  expect(doc.publishedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(doc.publishedBy).toBe("Aaron Lim")
  expect(doc.revisions?.find((r) => r.rev === "07")?.effectivity).toBe(
    "Superseded",
  )
  expect(
    doc.revisions?.find((r) => r.rev === "07")?.scopeContent?.statement,
  ).toBe(INITIAL_SCOPE.statement)
  await page.reload()
  await expect(page.getByText("Published on", { exact: true })).toBeVisible()
  await page
    .getByRole("button", { name: "View more revision updates", exact: true })
    .click()
  await expect(
    page.getByRole("dialog", { name: "Revision history" }),
  ).toBeVisible()
  await page.getByText("Scope content", { exact: true }).last().click()
  await expect(
    page.getByText(INITIAL_SCOPE.statement, { exact: true }),
  ).toBeVisible()
})

test("effectivity suspension and resumption retain dates, record reasons, and operate on the published revision during a draft", async ({
  page,
}) => {
  await page.goto(`/documents/${manual}`)
  expect((await storedDoc(page)).publishedOn).toBeUndefined()
  await expect(page.getByText("Published on", { exact: true })).toBeVisible()
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    saved.state.documents.find(
      (d: DocRecord) => d.id === "QMS-MAN-001",
    ).publishedOn = "2026-03-13"
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(saved))
  })
  await page.reload()
  await page
    .getByRole("button", { name: "Suspend effectivity", exact: true })
    .click()
  const dialog = page.getByRole("dialog", {
    name: "Suspend effectivity",
    exact: true,
  })
  await expect(
    dialog.getByRole("button", { name: "Suspend effectivity", exact: true }),
  ).toBeDisabled()
  await page
    .locator("#effectivity-reason")
    .fill("Synthetic: confirm the new equipment limits before use.")
  await dialog
    .getByRole("button", { name: "Suspend effectivity", exact: true })
    .click()
  await page.reload()
  let doc = await storedDoc(page)
  expect(doc.stage).toBe("Published")
  expect(doc.effectivity).toBe("Suspended")
  expect(doc.publishedOn).toBe("2026-03-13")
  expect(
    doc.events?.filter((e) => e.kind === "Effectivity suspended"),
  ).toHaveLength(1)
  await page
    .getByRole("button", { name: "View more revision updates", exact: true })
    .click()
  await expect(
    page.getByText("Synthetic: confirm the new equipment limits before use.", {
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Done", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Resume effectivity", exact: true })
    .click()
  await page
    .locator("#effectivity-reason")
    .fill("Synthetic: limits verified and release authorized.")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Resume effectivity", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Start new revision", exact: true })
    .click()
  await page.locator("#rv-note").fill("Synthetic scope clarification.")
  await page
    .getByRole("button", { name: "Start revision 08", exact: true })
    .click()
  await page
    .getByRole("button", { name: "Suspend effectivity", exact: true })
    .click()
  await page
    .locator("#effectivity-reason")
    .fill("Synthetic temporary hold while the draft is reviewed.")
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Suspend effectivity", exact: true })
    .click()
  doc = await storedDoc(page)
  expect(doc.stage).toBe("Draft")
  expect(doc.rev).toBe("08")
  expect(controlledRevision(doc)?.rev).toBe("07")
  expect(controlledRevision(doc)?.effectivity).toBe("Suspended")
})

test("unsaved scope text is kept until explicitly discarded, and opening scope changes no data", async ({
  page,
}) => {
  await page.goto("/qms/organization")
  const before = await storedDoc(page)
  await page.getByRole("button", { name: "Revise scope", exact: true }).click()
  expect(await storedDoc(page)).toEqual(before)
  await page.locator("#scope-statement").fill("Unsaved synthetic text.")
  await page.getByRole("button", { name: "Cancel", exact: true }).click()
  await expect(
    page.getByText("Discard unsaved changes?", { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("dialog")).toHaveCount(1)
  await page.getByRole("button", { name: "Keep editing", exact: true }).click()
  await expect(page.locator("#scope-statement")).toHaveValue(
    "Unsaved synthetic text.",
  )
  await page.keyboard.press("Escape")
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click()
  await expect(page.getByRole("dialog")).toHaveCount(0)
  expect(await storedDoc(page)).toEqual(before)
})

test("document commands reject missing authority, process/classification access, inactive users and stale versions", async ({
  page,
}) => {
  await page.goto("/")
  const s = await state(page),
    person = (id: string) => s.people.find((p) => p.id === id)!
  const command = {
    kind: "effectivity" as const,
    id: manual,
    expectedRev: "07",
    revision: "07",
    suspend: true,
    reason: "Synthetic hold.",
  }
  for (const id of ["p-ja", "p-bc", "p-ro", "p-pre", "missing"])
    expect(() =>
      applyDocumentCommand(s, person(id) ?? { ...person("p-al"), id }, command),
    ).toThrow()
  expect(() =>
    applyDocumentCommand(s, person("p-al"), { ...command, expectedRev: "06" }),
  ).toThrow(/revision changed/)
  const locked = structuredClone(s)
  const d = locked.documents.find((d) => d.id === manual)!
  d.classification = "Highly confidential"
  d.viewers = ["Maria Santos"]
  d.owner = "Maria Santos"
  expect(() => applyDocumentCommand(locked, person("p-al"), command)).toThrow(
    /not available/,
  )
  const inactive = structuredClone(s)
  inactive.people.find((p) => p.id === "p-al")!.status = "Deactivated"
  expect(() => applyDocumentCommand(inactive, person("p-al"), command)).toThrow(
    /not available/,
  )
  const expired = structuredClone(s)
  expired.people.find((p) => p.id === "p-al")!.accessEndsOn = "2020-01-01"
  expect(() => applyDocumentCommand(expired, person("p-al"), command)).toThrow(
    /not available/,
  )
  const coverageState = {
    ...s,
    documents: [s.documents.find((d) => d.id === manual)!],
    evidence: [],
  }
  expect(clauseCoverage(coverageState, () => true).current).toBeGreaterThan(0)
  const suspended = applyDocumentCommand(coverageState, person("p-al"), command)
  expect(clauseCoverage(suspended, () => true).current).toBe(0)
  const updated = applyDocumentCommand(s, person("p-al"), command)
  expect(() => applyDocumentCommand(updated, person("p-al"), command)).toThrow(
    /already changed/,
  )
  await as(page, "p-ja")
  await page.goto("/documents/PUR-PRO-002")
  await expect(
    page.getByRole("button", { name: "Suspend effectivity", exact: true }),
  ).toHaveCount(0)
  // a Public document outside Joy's processes offers an access request, without its title or controls
  await page.goto(`/documents/${manual}`)
  await expect(
    page.getByText(`You don’t have access to ${manual}`, { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("button", { name: "Suspend effectivity", exact: true })).toHaveCount(0)
  await page.goto("/qms/organization")
  await expect(
    page.getByRole("button", { name: "Revise scope", exact: true }),
  ).toHaveCount(0)
})

test("history shows only saved authorized versions and never invents dates or prior revisions", async ({
  page,
}) => {
  await page.goto("/")
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!)
    const d = saved.state.documents.find(
      (d: DocRecord) => d.id === "PUR-PRO-002",
    )
    d.revisions = [
      {
        ...d,
        rev: "01",
        stage: "Published",
        effectivity: "Effective",
        publishedOn: "2026-04-23",
        publishedBy: "Maria Santos",
        changeNote: "Synthetic initial published version.",
      },
      {
        ...d,
        rev: "00",
        stage: "Published",
        effectivity: "Superseded",
        classification: "Highly confidential",
        viewers: ["Aaron Lim"],
        owner: "Aaron Lim",
        changeNote: "RESTRICTED_SYNTHETIC_HISTORY",
      },
    ]
    localStorage.setItem("thryvems.preview.v1", JSON.stringify(saved))
  })
  await as(page, "p-ja")
  await page.goto("/documents/PUR-PRO-002")
  await page
    .getByRole("button", { name: "View more revision updates", exact: true })
    .click()
  const dialog = page.getByRole("dialog", { name: "Revision history" })
  await expect(
    dialog.getByText("Published on: 23 Apr 2026", { exact: true }),
  ).toBeVisible()
  await expect(dialog.getByText("RESTRICTED_SYNTHETIC_HISTORY")).toHaveCount(0)
  await expect(dialog.getByText(/22 Apr 2026, approved by/)).toHaveCount(0)
})

test("withdrawal retains the controlled version and a withdrawn revision, and later revision numbers stay unique", async ({
  page,
}) => {
  await page.goto("/")
  const s = await state(page),
    actor = s.people.find((p) => p.id === "p-al")!
  const original = s.documents.find((d) => d.id === manual)!
  let next = applyDocumentCommand(s, actor, {
    kind: "startRevision",
    id: manual,
    expectedRev: "07",
    note: "Synthetic draft.",
    reviewers: ["Nina Flores"],
    approvers: ["Eric Navarro"],
    scopeContent: INITIAL_SCOPE,
  })
  next = applyDocumentCommand(next, actor, {
    kind: "withdraw",
    id: manual,
    expectedRev: "08",
  })
  const restored = next.documents.find((d) => d.id === manual)!
  expect(restored.stage).toBe("Published")
  expect(restored.link).toBe(original.link)
  expect(restored.revisions?.find((r) => r.rev === "08")?.withdrawn).toBe(true)
  next = applyDocumentCommand(next, actor, {
    kind: "startRevision",
    id: manual,
    expectedRev: "07",
    note: "Synthetic replacement draft.",
    reviewers: ["Nina Flores"],
    approvers: ["Eric Navarro"],
    scopeContent: INITIAL_SCOPE,
  })
  expect(next.documents.find((d) => d.id === manual)?.rev).toBe("09")
})


test("archived scope stays read-only and is never described as a draft or in-force scope", async ({ page }) => {
  await page.goto("/documents/QMS-MAN-001")
  await page.getByRole("button", { name: "Move to archive", exact: true }).click()
  await page.getByRole("alertdialog").getByRole("button", { name: "Move to archive", exact: true }).click()
  await page.goto("/qms/organization")
  await expect(page.getByText("The scope document is archived and is no longer in force.", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Revise scope", exact: true })).toHaveCount(0)
  await expect(page.getByText("This is the proposed scope.", { exact: false })).toHaveCount(0)
  await page.goto("/documents/QMS-MAN-001")
  await expect(page.getByRole("button", { name: "Start new revision", exact: true })).toHaveCount(0)
  await expect(page.getByRole("button", { name: "Suspend effectivity", exact: true })).toHaveCount(0)
})
