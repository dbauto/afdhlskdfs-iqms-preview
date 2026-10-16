import type { State } from "./store";
import type { Audit, ChecklistSection, Person, Role } from "@/data/types";
import type {
  AuditChecklist,
  AuditFormApproval,
  AuditFormMember,
  AuditFormRoute,
} from "@/data/audit-types";
import {
  activePerson,
  auditForms,
  auditTeam,
  formContentLocked,
  formKey,
  formRights,
  formSnapshot,
  formCompletionProblems,
  latestFormApproval,
  nextFormApprovers,
  NO_FORM_ROUTE,
} from "./audit-form-policy";
import { auditRights } from "./audit-workflow";
import { blockedReason } from "./auditors";
import { nextId } from "./ids";
import { isIsoDate, nowIso } from "./periods";
import { notifyAudit } from "./questionnaire-workflow";

export interface AuditFormSettings {
  title: string;
  kind: "Checklist" | "Questionnaire";
  ownerId: string;
  members: AuditFormMember[];
  preparationRoute: AuditFormRoute;
  completionRoute: AuditFormRoute;
}
export type AuditFormCommand =
  | {
      kind: "createAuditForm";
      auditId: string;
      id: string;
      settings: AuditFormSettings;
    }
  | {
      kind: "configureAuditForm";
      auditId: string;
      checklistId: string;
      settings: AuditFormSettings;
    }
  | {
      kind: "requestFormApproval";
      auditId: string;
      checklistId: string;
      phase: AuditFormApproval["phase"];
    }
  | {
      kind: "decideFormApproval";
      auditId: string;
      checklistId: string;
      cycleId: string;
      decision: "Approved" | "Changes requested";
      comment: string;
    }
  | { kind: "completeAuditForm"; auditId: string; checklistId: string }
  | {
      kind: "reopenAuditForm";
      auditId: string;
      checklistId: string;
      phase: AuditFormApproval["phase"];
      reason: string;
    }
  | {
      kind: "withdrawAuditForm";
      auditId: string;
      checklistId: string;
      reason: string;
    }
  | {
      kind: "copyAuditPlan";
      auditId: string;
      id: string;
      process: string;
      leadId: string;
      auditorIds: string[];
      date: string;
      formIds: string[];
    };
export const AUDIT_FORM_COMMANDS = new Set([
  "createAuditForm",
  "configureAuditForm",
  "requestFormApproval",
  "decideFormApproval",
  "completeAuditForm",
  "reopenAuditForm",
  "withdrawAuditForm",
  "copyAuditPlan",
]);

function validSettings(
  state: State,
  audit: Audit,
  settings: AuditFormSettings,
) {
  const team = auditTeam(state, audit);
  const eligible = (id: string) =>
    team.some(
      (p) =>
        p.id === id &&
        (p.name === audit.lead ||
          ["Add and edit", "Manage"].includes(
            state.roles.find((r) => r.id === p.roleId)?.access.Audits ?? "None",
          )),
    );
  if (
    !settings.title.trim() ||
    !["Checklist", "Questionnaire"].includes(settings.kind)
  )
    throw Error("Give the form a name and choose its type.");
  if (!eligible(settings.ownerId))
    throw Error(
      "Choose an active audit team member who can edit as the form owner.",
    );
  if (
    settings.members.some(
      (m) =>
        !team.some((p) => p.id === m.personId) ||
        !["View", "Edit"].includes(m.access) ||
        (m.access === "Edit" && !eligible(m.personId)),
    )
  )
    throw Error(
      "Choose active collaborators from this audit team with the required access.",
    );
  if (
    new Set(settings.members.map((m) => m.personId)).size !==
    settings.members.length
  )
    throw Error("List each collaborator once.");
  for (const route of [settings.preparationRoute, settings.completionRoute]) {
    if (!["None", "All", "Any", "Sequential"].includes(route.mode))
      throw Error("Choose a valid approval rule.");
    if (route.mode === "None") {
      if (route.approverIds.length)
        throw Error("Remove approvers when approval is turned off.");
      continue;
    }
    if (
      !route.approverIds.length ||
      new Set(route.approverIds).size !== route.approverIds.length
    )
      throw Error("Choose each approver once, in the required order.");
    if (
      route.approverIds.some(
        (id) =>
          !team.some(
            (p) =>
              p.id === id &&
              (p.name === audit.lead ||
                ["Add and edit", "Approve", "Manage"].includes(
                  state.roles.find((r) => r.id === p.roleId)?.access.Audits ??
                    "None",
                )),
          ),
      )
    )
      throw Error("Choose active approvers from this audit team.");
    if (route.approverIds.includes(settings.ownerId))
      throw Error("Choose an approver other than the form owner.");
  }
  return { ...structuredClone(settings), title: settings.title.trim() };
}
export function validateFormQuestions(state: State, c: AuditChecklist) {
  const audit = state.audits.find((a) => a.id === c.auditId)!;
  const qs = c.sections
    .flatMap((s) => s.items)
    .filter((q) => q.type !== "Instruction");
  if (!qs.length || qs.some((q) => !q.text.trim()))
    throw Error(
      "Write at least one question and complete every question’s text.",
    );
  const ids = c.sections.flatMap((s) => s.items.map((q) => q.id));
  if (new Set(ids).size !== ids.length)
    throw Error("Each question needs a unique identifier.");
  const allowed = auditTeam(state, audit)
    .filter(
      (p) =>
        p.name === audit.lead ||
        p.id === c.ownerId ||
        c.members === undefined ||
        c.members.some((m) => m.personId === p.id && m.access === "Edit"),
    )
    .map((p) => p.name);
  if (qs.some((q) => !allowed.includes(q.askedBy)))
    throw Error(
      "Assign every question to an editor of this form in the audit team.",
    );
  if (
    qs.some(
      (q, i) =>
        q.showWhen &&
        !qs.slice(0, i).some((parent) => parent.id === q.showWhen!.questionId),
    )
  )
    throw Error("Choose an earlier question for each visibility condition.");
  if (
    qs.some(
      (q) =>
        ["Multiple choice", "Multiple select"].includes(q.type) &&
        ((q.choices?.filter((x) => x.trim()).length ?? 0) < 2 ||
          new Set(q.choices?.map((x) => x.trim())).size !== q.choices?.length),
    )
  )
    throw Error("Give each choice question at least two different choices.");
  if (
    c.copiedFrom &&
    c.sections.some(
      (s) =>
        s.items.some((q) => q.type !== "Instruction") &&
        !audit.clauses.includes(s.clause),
    )
  )
    throw Error(
      "Review each copied section and choose a clause applicable to the destination process.",
    );
}
function updateForm(state: State, c: AuditChecklist) {
  return {
    ...state,
    auditChecklists: state.auditChecklists.map((x) => (x.id === c.id ? c : x)),
  };
}
function canPlan(state: State, person: Person, role: Role, process: string) {
  const target = state.processes.find((p) => p.name === process);
  return (
    activePerson(person) &&
    !["consultant", "guest-auditor"].includes(role.id) &&
    ["Add and edit", "Manage"].includes(role.access.Audits) &&
    !!target &&
    (["All processes", "Not their own process"].includes(role.scope) ||
      target.owner === person.name ||
      target.members?.includes(person.name))
  );
}
function copyPlan(
  state: State,
  person: Person,
  role: Role,
  source: Audit,
  command: Extract<AuditFormCommand, { kind: "copyAuditPlan" }>,
) {
  if (
    !canPlan(state, person, role, command.process) ||
    (!["admin", "quality"].includes(role.id) &&
      !auditRights(source, person, role).assigned)
  )
    throw Error(
      "You need access to this audit and permission to plan audits in the destination process.",
    );
  if (state.audits.some((a) => a.id === command.id))
    throw Error("This audit number is already used. Refresh before copying.");
  if (!isIsoDate(command.date)) throw Error("Choose a valid audit date.");
  const target = state.processes.find((p) => p.name === command.process)!;
  const ids = [command.leadId, ...command.auditorIds];
  if (new Set(ids).size !== ids.length)
    throw Error("Choose each auditor once.");
  const people = ids.map((id) => state.people.find((p) => p.id === id));
  for (const p of people) {
    const qualification = state.auditors.find(
      (a) => a.name === p?.name && a.status === "Active",
    );
    if (
      !activePerson(p) ||
      !qualification ||
      p!.roleId === "consultant" ||
      (state.roles.find((r) => r.id === p!.roleId)?.access.Audits ?? "None") ===
        "None"
    )
      throw Error("Choose active, qualified auditors with audit access.");
    if (
      blockedReason(qualification, target.name, state.processes, state.people)
    )
      throw Error(
        `${p!.name} is not independent of ${target.name}; choose another auditor.`,
      );
  }
  if (
    state.auditors.find((a) => a.name === people[0]!.name)?.level !==
    "Lead auditor"
  )
    throw Error("Choose a qualified lead auditor.");
  if (
    !command.formIds.length ||
    new Set(command.formIds).size !== command.formIds.length
  )
    throw Error("Choose at least one form to copy, once each.");
  const forms = command.formIds.map((id) =>
    auditForms(state, source.id).find((c) => c.id === id),
  );
  if (forms.some((c) => !c || !formRights(state, c, person, role).view))
    throw Error(
      "A selected form is unavailable. Refresh and choose accessible forms.",
    );
  const lead = people[0]!,
    now = nowIso();
  const audit: Audit = {
    id: command.id,
    process: target.name,
    lead: lead.name,
    auditors: people.slice(1).map((p) => p!.name),
    auditee: target.owner,
    date: command.date,
    plannedDate: command.date,
    month: new Date(command.date).getUTCMonth(),
    state: "Planned",
    kind: "Planned",
    clauses: [...target.clauses],
    copiedFrom: { auditId: source.id, by: person.id, at: now },
  };
  const taken = state.auditChecklists.map((c) => c.id);
  const copied = forms.map((original) => {
    const c = original!,
      id = nextId(taken, "ACL-", 4);
    taken.push(id);
    const qIds = new Map(
      c.sections
        .flatMap((s) => s.items)
        .map((q, i) => [q.id, `${id}-q${i + 1}`]),
    );
    const sections: ChecklistSection[] = c.sections.map((s, i) => ({
      ...s,
      id: `${id}-s${i + 1}`,
      clause: target.clauses.includes(s.clause) ? s.clause : "",
      items: s.items.map((q) => ({
        ...structuredClone(q),
        id: qIds.get(q.id)!,
        evidence: [],
        askedBy: lead.name,
        respondent: undefined,
        showWhen: q.showWhen
          ? { ...q.showWhen, questionId: qIds.get(q.showWhen.questionId)! }
          : undefined,
      })),
    }));
    return {
      id,
      auditId: audit.id,
      formId: id,
      title: c.title,
      kind: c.kind ?? "Checklist",
      ownerId: lead.id,
      members: [],
      preparationRoute: NO_FORM_ROUTE,
      completionRoute: NO_FORM_ROUTE,
      sections,
      usesQuestionnaire: c.usesQuestionnaire,
      status: "Draft" as const,
      version: 1,
      preparedBy: person.id,
      copiedFrom: {
        auditId: source.id,
        formId: formKey(c),
        version: c.version,
      },
    };
  });
  return notifyAudit(
    {
      ...state,
      audits: [...state.audits, audit],
      auditChecklists: [...state.auditChecklists, ...copied],
    },
    `audit-copy:${audit.id}`,
    person.name,
    people.map((p) => p!.name),
    `Audit ${audit.id} copied for ${target.name}`,
    `/audits/${audit.id}`,
    "Review clauses, collaborators, approvers and questions before release.",
  );
}
export function applyAuditFormCommand(
  state: State,
  person: Person,
  role: Role,
  command: AuditFormCommand,
): State {
  const a = state.audits.find((a) => a.id === command.auditId);
  if (
    !a ||
    !activePerson(person) ||
    role.access.Audits === "None" ||
    role.id === "consultant"
  )
    throw Error("This audit is not available.");
  if (command.kind === "copyAuditPlan")
    return copyPlan(state, person, role, a, command);
  const rights = auditRights(a, person, role);
  if (!rights.assigned && !rights.manage)
    throw Error("This audit is not available.");
  if (
    a.state === "Report issued" ||
    state.auditReports.some((r) => r.auditId === a.id && r.status === "Issued")
  )
    throw Error("The issued audit is read-only.");
  if (command.kind === "createAuditForm") {
    if (
      !rights.edit ||
      (!rights.lead && !["Add and edit", "Manage"].includes(role.access.Audits))
    )
      throw Error("You don’t have permission to add an audit form.");
    if (state.auditChecklists.some((c) => c.id === command.id))
      throw Error("This form number is already used. Refresh before adding.");
    const settings = validSettings(state, a, command.settings);
    const c: AuditChecklist = {
      ...settings,
      id: command.id,
      auditId: a.id,
      formId: command.id,
      version: 1,
      status: "Draft",
      usesQuestionnaire: settings.kind === "Questionnaire",
      sections: [
        {
          id: `${command.id}-s1`,
          clause: a.clauses[0] ?? "Start",
          title: "Questions",
          items: [],
        },
      ],
      approvals: [],
      preparedBy: person.id,
    };
    return { ...state, auditChecklists: [...state.auditChecklists, c] };
  }
  const c = state.auditChecklists.find(
    (c) => c.id === command.checklistId && c.auditId === a.id,
  );
  if (
    !c ||
    c.withdrawnAt ||
    auditForms(state, a.id).find((x) => formKey(x) === formKey(c))?.id !== c.id
  )
    throw Error(
      "Use the current form version; earlier versions remain read-only.",
    );
  const access = formRights(state, c, person, role);
  if (!access.view) throw Error("This form is not available.");
  if (command.kind === "configureAuditForm") {
    if (!access.configure || formContentLocked(c))
      throw Error(
        "Only the lead or form owner can configure an editable draft.",
      );
    const settings = validSettings(state, a, command.settings);
    return updateForm(state, {
      ...c,
      ...settings,
      usesQuestionnaire:
        settings.kind === "Questionnaire" || c.usesQuestionnaire,
      preparedBy: person.id,
    });
  }
  if (command.kind === "withdrawAuditForm") {
    if (!access.configure || !command.reason.trim())
      throw Error(
        "The lead or form owner must give a reason to withdraw this form.",
      );
    return {
      ...state,
      auditChecklists: state.auditChecklists.map((x) =>
        formKey(x) === formKey(c) && x.auditId === a.id
          ? {
              ...x,
              withdrawnAt: nowIso(),
              withdrawalReason: command.reason.trim(),
            }
          : x,
      ),
    };
  }
  if (command.kind === "reopenAuditForm") {
    if (!access.configure || !command.reason.trim())
      throw Error(
        "The lead or form owner must give a reason to reopen the form.",
      );
    const previous = latestFormApproval(c, command.phase);
    if (command.phase === "Preparation" && c.status === "Released")
      throw Error("Start a controlled revision to change released questions.");
    if (
      !["Pending", "Approved"].includes(previous?.status ?? "") &&
      !(command.phase === "Completion" && c.completedAt)
    )
      throw Error("This form has no approval or completion to reopen.");
    const event: AuditFormApproval = {
      id: nextId(
        state.auditChecklists.flatMap(
          (c) => c.approvals?.map((x) => x.id) ?? [],
        ),
        "AFA-",
        5,
      ),
      phase: command.phase,
      route: structuredClone(previous?.route ?? NO_FORM_ROUTE),
      status: "Cancelled",
      reason: command.reason.trim(),
      requestedBy: person.id,
      requestedAt: nowIso(),
      snapshot: formSnapshot(state, c, command.phase),
      decisions: [],
    };
    return updateForm(state, {
      ...c,
      approvals: [...(c.approvals ?? []), event],
      ...(command.phase === "Completion"
        ? { completedAt: undefined, completedBy: undefined }
        : {}),
    });
  }
  const phase =
    command.kind === "completeAuditForm"
      ? "Completion"
      : command.kind === "requestFormApproval"
        ? command.phase
        : c.approvals?.find((x) => x.id === command.cycleId)?.phase;
  if (!phase) throw Error("This approval request is not available.");
  const route =
    (phase === "Preparation" ? c.preparationRoute : c.completionRoute) ??
    NO_FORM_ROUTE;
  if (command.kind !== "decideFormApproval") {
    if (!access.configure)
      throw Error(
        "Only the lead or form owner can submit this form for review.",
      );
    if (phase === "Preparation") {
      if (c.status === "Released")
        throw Error("This form is already released.");
      validateFormQuestions(state, c);
    } else {
      const problems = formCompletionProblems(state, c);
      if (problems.length) throw Error(problems.join("\n"));
      if (c.completedAt) return state;
    }
    if (command.kind === "completeAuditForm") {
      if (route.mode !== "None")
        throw Error("Submit the completed form through its approval route.");
      return updateForm(state, {
        ...c,
        completedAt: nowIso(),
        completedBy: person.id,
      });
    }
    if (route.mode === "None")
      throw Error("Configure an approval route before requesting approval.");
    if (
      ["Pending", "Approved"].includes(
        latestFormApproval(c, phase)?.status ?? "",
      )
    )
      throw Error("This form already has an ongoing or completed approval.");
    const team = auditTeam(state, a);
    const contributors =
      phase === "Preparation"
        ? [c.ownerId, c.preparedBy]
        : [
            c.ownerId,
            ...state.auditorAssessments
              .filter((x) => x.checklistId === c.id)
              .map((x) => state.people.find((p) => p.name === x.auditor)?.id),
          ];
    if (
      route.approverIds.some(
        (id) =>
          !team.some(
            (p) =>
              p.id === id &&
              (p.name === a.lead ||
                ["Add and edit", "Approve", "Manage"].includes(
                  state.roles.find((r) => r.id === p.roleId)?.access.Audits ??
                    "None",
                )),
          ) || contributors.includes(id),
      )
    )
      throw Error(
        "Choose active approvers who did not prepare or complete this form.",
      );
    const cycle: AuditFormApproval = {
      id: nextId(
        state.auditChecklists.flatMap(
          (c) => c.approvals?.map((x) => x.id) ?? [],
        ),
        "AFA-",
        5,
      ),
      phase,
      route: structuredClone(route),
      status: "Pending",
      requestedBy: person.id,
      requestedAt: nowIso(),
      snapshot: formSnapshot(state, c, phase),
      decisions: [],
    };
    const next = updateForm(state, {
      ...c,
      approvals: [...(c.approvals ?? []), cycle],
    });
    return notifyAudit(
      next,
      `form-approval:${cycle.id}`,
      person.name,
      nextFormApprovers(cycle).map(
        (id) => state.people.find((p) => p.id === id)!.name,
      ),
      `${phase} approval requested`,
      `/audits/${a.id}/checklist?version=${c.id}`,
      c.title ?? "Audit checklist",
    );
  }
  const cycle = latestFormApproval(c, phase);
  if (
    !cycle ||
    cycle.id !== command.cycleId ||
    !nextFormApprovers(cycle).includes(person.id) ||
    !auditTeam(state, a).some((p) => p.id === person.id) ||
    (!rights.lead &&
      !["Add and edit", "Approve", "Manage"].includes(role.access.Audits))
  )
    throw Error(
      "This approval step is not assigned to you or is no longer active.",
    );
  if (cycle.snapshot !== formSnapshot(state, c, phase))
    throw Error(
      "The reviewed content changed. Return it for a new approval request.",
    );
  if (
    !["Approved", "Changes requested"].includes(command.decision) ||
    (command.decision === "Changes requested" && !command.comment.trim())
  )
    throw Error("Give a reason when returning the form for changes.");
  const decisions = [
    ...cycle.decisions,
    {
      personId: person.id,
      decision: command.decision,
      comment: command.comment.trim(),
      at: nowIso(),
    },
  ];
  const approved =
    command.decision === "Approved" &&
    (cycle.route.mode === "Any" ||
      cycle.route.approverIds.every((id) =>
        decisions.some((d) => d.personId === id && d.decision === "Approved"),
      ));
  const updated: AuditFormApproval = {
    ...cycle,
    decisions,
    status:
      command.decision === "Changes requested"
        ? "Changes requested"
        : approved
          ? "Approved"
          : "Pending",
  };
  const next = updateForm(state, {
    ...c,
    approvals: c.approvals!.map((x) => (x.id === cycle.id ? updated : x)),
    ...(approved && phase === "Completion"
      ? { completedAt: nowIso(), completedBy: person.id }
      : {}),
  });
  const recipients =
    updated.status === "Pending"
      ? nextFormApprovers(updated)
      : [c.ownerId, cycle.requestedBy].filter((id): id is string => !!id);
  return notifyAudit(
    next,
    `form-decision:${cycle.id}:${person.id}`,
    person.name,
    recipients
      .map((id) => state.people.find((p) => p.id === id)?.name)
      .filter((x): x is string => !!x),
    `${phase} ${updated.status.toLowerCase()}`,
    `/audits/${a.id}/checklist?version=${c.id}`,
    command.comment,
  );
}
