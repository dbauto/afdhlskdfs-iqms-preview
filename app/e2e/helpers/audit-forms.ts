import type { Page } from "@playwright/test"
import type { State } from "../../src/lib/store"
import type { AuditCommand } from "../../src/lib/audit-workflow"
import type { AuditFormSettings } from "../../src/lib/audit-form-commands"
import { applyAuditCommand } from "../../src/lib/audit-workflow"
import { NO_FORM_ROUTE } from "../../src/lib/audit-form-policy"
export const auditId = "IA-2026-10"
export async function auditFixture(page: Page): Promise<State> {
  await page.goto("/")
  await page.waitForFunction(() => !!localStorage.getItem("thryvems.preview.v1"))
  const state: State = await page.evaluate(() => JSON.parse(localStorage.getItem("thryvems.preview.v1")!).state)
  const audit = state.audits.find(a => a.id === auditId)!
  audit.auditors = ["Kim Dela Cruz", "Maria Santos", "Ben Castillo"]
  return state
}
export function command(state: State, actorId: string, c: AuditCommand) {
  const person = state.people.find(p => p.id === actorId)!
  return applyAuditCommand(state, person, state.roles.find(r => r.id === person.roleId)!, c)
}
export function formSettings(title: string, kind: AuditFormSettings["kind"] = "Checklist"): AuditFormSettings {
  return { title, kind, ownerId: "p-dr", members: [{ personId: "p-kd", access: "Edit" }, { personId: "p-bc", access: "View" }], preparationRoute: structuredClone(NO_FORM_ROUTE), completionRoute: structuredClone(NO_FORM_ROUTE) }
}
export function addForm(state: State, id: string, kind: AuditFormSettings["kind"] = "Checklist", settings = formSettings(id, kind)) {
  let next = command(state, "p-dr", { kind: "createAuditForm", auditId, id, settings })
  const sections = [{ id: `${id}-s1`, title: "Audit questions", clause: next.audits.find(a => a.id === auditId)!.clauses[0], items: [{ id: `${id}-q1`, text: `Question for ${settings.title}`, type: kind === "Checklist" ? "Audit assessment" as const : "Text notes" as const, askedBy: "Daniel Reyes", respondBy: kind === "Checklist" ? "Auditor" as const : "Auditee" as const, required: true, auditeeRequired: kind === "Questionnaire", assessmentRequired: kind === "Checklist", evidenceRule: "Optional" as const, evidence: [], guidance: "" }] }]
  return command(next, "p-dr", { kind: "saveChecklist", auditId, id, sections, usesQuestionnaire: kind === "Questionnaire" })
}
export function releaseForm(state: State, id: string) {
  const c = state.auditChecklists.find(c => c.id === id)!
  return command(state, "p-dr", { kind: "releaseChecklist", auditId, id, sections: c.sections, usesQuestionnaire: c.usesQuestionnaire })
}
export async function installState(page: Page, state: State, who = "p-dr", route = `/audits/${auditId}`) {
  await page.evaluate(({ state, who }) => { const saved = JSON.parse(localStorage.getItem("thryvems.preview.v1")!); localStorage.setItem("thryvems.preview.v1", JSON.stringify({ ...saved, state })); localStorage.setItem("iqms.viewAs", who) }, { state, who })
  await page.goto(route)
}
export async function viewAs(page: Page, who: string, route: string) {
  await page.evaluate(who => localStorage.setItem("iqms.viewAs", who), who)
  await page.goto(route)
}
