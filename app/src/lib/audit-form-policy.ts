import type { State } from "./store";
import type { Audit, Person, Role } from "@/data/types";
import type {
  AuditChecklist,
  AuditFormApproval,
  AuditFormRoute,
} from "@/data/audit-types";
import { todayIso } from "./periods";

export const NO_FORM_ROUTE: AuditFormRoute = { mode: "None", approverIds: [] };
export const formKey = (c: AuditChecklist) =>
  c.formId ?? `${c.auditId}:checklist`;
export const formTitle = (c: AuditChecklist) => c.title ?? (c.kind === "Questionnaire" ? "Audit questionnaire" : "Audit checklist");
export const formBuilderPath = (c: Pick<AuditChecklist, "auditId" | "id" | "kind">) =>
  `/audits/${c.auditId}/${c.kind === "Questionnaire" ? "questionnaire-builder" : "checklist"}?version=${c.id}`;
export const activePerson = (p?: Person) =>
  !!p &&
  p.status !== "Deactivated" &&
  (!p.accessEndsOn || p.accessEndsOn >= todayIso());
export function auditTeam(state: State, a: Audit) {
  return state.people.filter(
    (p) =>
      activePerson(p) &&
      [a.lead, ...a.auditors].includes(p.name) &&
      !["consultant"].includes(p.roleId),
  );
}
/** Form preparation is separate from independently conducting an audit. */
export function formOwners(state: State, a: Audit) {
  return state.people.filter(p => activePerson(p) &&
    (auditTeam(state, a).some(t => t.id === p.id) || ["admin", "quality"].includes(p.roleId)) &&
    (p.name === a.lead || ["Add and edit", "Manage"].includes(state.roles.find(r => r.id === p.roleId)?.access.Audits ?? "None")))
}
export function auditForms(state: Pick<State, "auditChecklists">, auditId: string, released = false) {
  const groups = new Map<string, AuditChecklist>();
  for (const c of state.auditChecklists.filter(
    (c) =>
      c.auditId === auditId &&
      !c.withdrawnAt &&
      (!released || c.status === "Released"),
  )) {
    const key = formKey(c);
    if (!groups.has(key) || groups.get(key)!.version < c.version)
      groups.set(key, c);
  }
  return [...groups.values()];
}
export function selectedForm(
  state: State,
  auditId: string,
  id?: string | null,
  released = false,
) {
  const exact =
    id &&
    state.auditChecklists.find(
      (c) => c.auditId === auditId && (c.id === id || formKey(c) === id),
    );
  return auditForms(state, auditId, released).find(
    (c) => !id || (exact ? formKey(c) === formKey(exact) : formKey(c) === id),
  );
}
export function formRights(
  state: State,
  c: AuditChecklist,
  p: Person,
  r: Role,
) {
  const a = state.audits.find((a) => a.id === c.auditId);
  const policy =
    state.auditChecklists
      .filter((x) => x.auditId === c.auditId && formKey(x) === formKey(c))
      .sort((a, b) => b.version - a.version)[0] ?? c;
  const active =
    activePerson(p) && r.access.Audits !== "None" && r.id !== "consultant";
  const lead = !!a && active && a.lead === p.name;
  const manage = active && ["admin", "quality"].includes(r.id);
  const team = !!a && active && [a.lead, ...a.auditors].includes(p.name);
  const owner = active && (team || manage) && policy.ownerId === p.id;
  const member = policy.members?.find((m) => m.personId === p.id);
  const reviewer =
    team &&
    [policy.preparationRoute, policy.completionRoute].some((route) =>
      route?.approverIds.includes(p.id),
    );
  const view =
    !!a &&
    (lead ||
      manage ||
      (team &&
        (policy.members === undefined || owner || !!member || reviewer)));
  const edit =
    view &&
    (lead ||
      (policy.members === undefined && team) ||
      (["Add and edit", "Manage"].includes(r.access.Audits) &&
        (owner ||
          (policy.members === undefined && manage) ||
          (team && member?.access === "Edit"))));

  return { view, edit, lead, manage, configure: lead || owner, reviewer };
}
export const latestFormApproval = (
  c: AuditChecklist,
  phase: AuditFormApproval["phase"],
) => c.approvals?.filter((x) => x.phase === phase).at(-1);
export function formWorkLocked(c: AuditChecklist) {
  return (
    !!c.withdrawnAt ||
    !!c.completedAt ||
    ["Pending", "Approved"].includes(
      latestFormApproval(c, "Completion")?.status ?? "",
    )
  );
}
/** Corrective action can still be linked to a result on a withdrawn or earlier form, until the form is completed. */
export function resultNcLocked(c: AuditChecklist) {
  return (
    !!c.completedAt ||
    ["Pending", "Approved"].includes(
      latestFormApproval(c, "Completion")?.status ?? "",
    )
  );
}
export function formContentLocked(c: AuditChecklist) {
  return (
    !!c.withdrawnAt ||
    c.status === "Released" ||
    ["Pending", "Approved"].includes(
      latestFormApproval(c, "Preparation")?.status ?? "",
    )
  );
}
export function formSnapshot(
  state: State,
  c: AuditChecklist,
  phase: AuditFormApproval["phase"],
) {
  const body: unknown[] = [
    c.id,
    formKey(c),
    c.version,
    c.title,
    c.kind,
    c.ownerId,
    c.members,
    c.sections,
    c.usesQuestionnaire,
    c.preparationRoute,
    c.completionRoute,
  ];
  if (phase === "Completion")
    body.push(
      state.questionnaireAssignments.filter((x) => x.checklistId === c.id),
      state.auditeeResponses.filter((x) => x.checklistId === c.id),
      state.auditorAssessments.filter((x) => x.checklistId === c.id),
      state.evidenceVerifications.filter((x) => x.checklistId === c.id),
      state.clarificationRequests.filter((x) => x.checklistId === c.id),
    );
  return JSON.stringify(body);
}
export function nextFormApprovers(cycle: AuditFormApproval) {
  if (cycle.status !== "Pending") return [];
  const pending = cycle.route.approverIds.filter(
    (id) => !cycle.decisions.some((d) => d.personId === id),
  );
  return cycle.route.mode === "Sequential" ? pending.slice(0, 1) : pending;
}
export function formCompletionProblems(
  state: State,
  c: AuditChecklist,
): string[] {
  const issues: string[] = [];
  const all = c.sections
    .flatMap((s) => s.items)
    .filter((q) => q.type !== "Instruction");
  if (c.status !== "Released" || !all.length)
    return ["Release a form with at least one question first."];
  const assignments = state.questionnaireAssignments.filter(
    (a) => a.checklistId === c.id,
  );
  const assessments = state.auditorAssessments.filter(
    (a) => a.checklistId === c.id,
  );
  const responses = state.auditeeResponses.filter(
    (r) => r.checklistId === c.id,
  );
  const auditorValues = Object.fromEntries(
    assessments.map((a) => [a.questionId, a.selectedValues ?? a.answer ?? ""]),
  );
  const values = [
    auditorValues,
    ...assignments.map((a) =>
      Object.fromEntries(
        responses
          .filter((r) => r.assignmentId === a.id && r.status === "Submitted")
          .map((r) => [r.questionId, r.selectedValues ?? r.value]),
      ),
    ),
  ];
  const visible = (
    q: (typeof all)[number],
    values: Record<string, string | string[]>,
    seen = new Set<string>(),
  ): boolean => {
    if (!q.showWhen) return true;
    if (seen.has(q.id)) return false;
    const parent = all.find((p) => p.id === q.showWhen!.questionId);
    if (!parent) return false;
    const next = new Set(seen);
    next.add(q.id);
    const value = values[parent.id];
    return (
      visible(parent, values, next) &&
      (Array.isArray(value)
        ? value.includes(q.showWhen.equals)
        : value === q.showWhen.equals)
    );
  };
  const questions = all.filter((q) => values.some((v) => visible(q, v)));
  if (assignments.some((a) => !["Submitted", "Resubmitted"].includes(a.status)))
    issues.push("Wait for every assigned questionnaire to be submitted.");
  if (
    questions.some(
      (q) =>
        q.respondBy !== "Auditor" &&
        (q.auditeeRequired || q.required) &&
        !assignments.some((a) => a.questionIds.includes(q.id)),
    )
  )
    issues.push("Assign every required auditee question to a respondent.");
  if (
    state.clarificationRequests.some(
      (r) => r.checklistId === c.id && r.status !== "Resolved",
    )
  )
    issues.push("Resolve the outstanding clarification requests.");
  const key = (r: {
    kind: string;
    id?: string;
    url?: string;
    responseRevision?: number;
  }) => `${r.kind}:${r.id ?? r.url}:${r.responseRevision ?? ""}`;
  const verification = new Map<
    string,
    State["evidenceVerifications"][number]
  >();
  for (const v of state.evidenceVerifications.filter(
    (v) => v.checklistId === c.id,
  ))
    verification.set(`${v.questionId}:${key(v.reference)}`, v);
  // A questionnaire collects responses only; auditors record results on the checklist.
  if (c.kind === "Questionnaire") return [...new Set(issues)];
  for (const q of questions) {
    const assessment = assessments.filter((a) => a.questionId === q.id).at(-1);
    if (
      (q.assessmentRequired !== false ||
        (q.respondBy === "Auditor" && q.required)) &&
      assessment?.status !== "Completed"
    )
      issues.push(`Record the checklist result for “${q.text}”.`);
    if (
      assessment?.status === "Completed" &&
      ["Minor NC", "Major NC"].includes(assessment.result) &&
      !assessment.ncId
    )
      issues.push(
        `Raise or link corrective action for the ${assessment.result === "Major NC" ? "major" : "minor"} nonconformity on “${q.text}”.`,
      );
    const answers = responses.filter(
      (r) => r.questionId === q.id && r.status === "Submitted",
    );
    const no =
      assessment?.answer === "No" ||
      answers.some((r) => r.value === "No" || r.selectedValues?.includes("No"));
    const required =
      q.evidenceEnabled !== false &&
      (q.evidenceRule === "Required" ||
        (q.evidenceRule === "When No" && no) ||
        ["Evidence review", "Document reference"].includes(q.type));
    if (required) {
      const refs = [
        ...(assessment?.evidence ?? []),
        ...answers.flatMap((r) => r.evidence),
        ...q.evidence.map((text) => {
          const id = text.split(" ")[0];
          return id.startsWith("https://")
            ? { kind: "link", url: id }
            : {
                kind: state.evidence.some((e) => e.id === id)
                  ? "evidence"
                  : "document",
                id,
              };
        }),
      ];
      const unavailable = [...verification.values()].some(
        (v) =>
          v.questionId === q.id &&
          v.unavailable &&
          v.status === "Not applicable" &&
          v.notes.trim(),
      );
      if (!refs.length && !unavailable)
        issues.push(
          `Link the required evidence for “${q.text}” or record why it is unavailable.`,
        );
      if (
        refs.some(
          (ref) =>
            !["Verified", "Not applicable"].includes(
              verification.get(`${q.id}:${key(ref)}`)?.status ?? "",
            ),
        )
      )
        issues.push(`Verify the required evidence for “${q.text}”.`);
    }
  }
  if (
    [...verification.values()].some((v) =>
      ["Pending review", "Insufficient"].includes(v.status),
    )
  )
    issues.push("Resolve evidence marked pending or insufficient.");
  return [...new Set(issues)];
}
