# ThryveMS guided onboarding and walkthrough implementation plan

**Status:** Proposed; owner review required. **Date:** 21 Oct 2026 (Asia/Manila). **Scope:** Planning and acceptance criteria only; this document does not authorize implementation, merging or deployment.

**Baseline:** Existing client navigation in `app/src/components/app/nav.ts`, Settings navigation in `app/src/pages/settings/layout.tsx`, platform navigation in `app/src/pages/platform/shell.tsx`, routes in `app/src/App.tsx`, and current workflows. Apply `AGENTS.md`, `app/UI-GUIDELINES.md` (currently also proposed in separate PR #14), and the normative `plan/iQMS-Consolidated-Backend-Plan-v3.md`. Existing UI is the reference. Do not introduce a new top-level menu, rename a menu, redesign cards, add a color/font, weaken access, or add general file uploads.

Companion acceptance contract: [Success metrics and release gates](./guided-walkthrough-success-metrics.md).

## 1. Outcomes and boundaries

Provide one unified guidance system with **three distinct experiences**:

1. **Organization onboarding:** A role-restricted setup checklist of real configuration tasks, shared at organization level; completion is based on persisted authoritative records, not user clicks. It is not ISO certification/readiness.
2. **Page walkthroughs:** Explain all current navigation pages and meaningful actions with anchored, contextual steps.
3. **Workflow guidance:** Support end-to-end business tasks, including alternate paths, task handoffs, rejected/blocked states, external links, and immutable approval/issuance steps.

The walkthrough is *not* an alternative UI for changing data and is *not* a replacement for the existing workflow controls or task indicators. No tutorial may auto-submit, auto-approve, publish, issue a report, change roles, or fabricate a completed record.

**Proposed but not existing:** Bulk process import and Google sign-in. The guide may disclose those capabilities as unavailable until separately designed, implemented, authorized and tested. It must not present their controls as operational. Excel migration follows D12 links-only (authorized SharePoint/OneDrive/other approved HTTPS spreadsheet link and a deliberate import/preview process, **not an Excel file-upload control**); use standardized templates, no free-form column mapping in the initial release. Existing process groups remain **Management**, **Core**, **Support**. The existing process model has no Draft/Published state; an import can have a *staged validation state* without creating an invented process lifecycle.

## 2. Mandatory on-demand Play walkthrough control

**Owner requirement:** Every eligible **menu page** has a clearly identifiable **Play walkthrough** action that a user can activate **at any time**, including after the guide was completed, skipped, or dismissed.

- A Play icon and the accessible visible label **Play walkthrough** (proposed exact copy) appears in an existing page-header action area or an equivalent existing Settings header. Use the existing secondary/outline/quiet button component and preserve **one primary button per page**. If a compact icon-only form is needed on small screens, it must still have the accessible name and tooltip **Play walkthrough**.
- Do not add a sidebar menu item for tutorials or change the existing menu structure. A future shared contextual help menu can link to all guides, but it **does not replace the per-page Play action**.
- Activating Play always starts or restarts the **current page's** walkthrough from its first eligible step. The action stays available after completion; replay does **not** erase completed business records or organization setup. On workflow pages the user may separately choose an applicable **Guide this workflow** journey.
- Never auto-play on navigation or first sign-in. First-run help can offer a dismissible, nonblocking invitation. The user expressly starts the tour.
- Provide Back, Next (only when allowed), Skip step when safe, Close, Resume, and Start again. Closing or navigating must not make unsaved changes, bypass required work, or falsely mark a guide complete.
- Guidance uses existing React/shadcn-style UI components and tokens. Use a focus-managed, keyboard-accessible anchored popover or sheet designed within UI-GUIDELINES; do not block the actual application unless necessary for focus accessibility. Reduced-motion, scrolling containers, collapsed sidebar, responsive layout, dark/light, zoomed display, and touch targets must work.
- Highlight a real, stable control in the **current authorized** view; account for conditional buttons, tabs, expandable sections, modal/sheet content, loading and virtual/scrolling tables. When a target is missing, changed, inaccessible, or in an unavailable workflow state, show a safe explanation or skip according to guide rules. Never point to an invented button.
- Re-evaluate membership, area permission, process scope, record classification, assignment and workflow state **at every step and transition**. A restricted viewer sees neither forbidden records nor instructions that reveal them. Do not let guides open forbidden routes by deep link.
- Following a workflow may move between permitted routes. Respect the current new-tab behavior of review/audit record links and continue only in an authorized, correctly identified tab; never silently resume on another person's record.
- Instrument **Play control availability, activation, repeat play, completion, early dismissal, target-resolution failures** with minimal event metadata; do not log confidential titles, record contents, personal identifiers or external evidence links. Product usage analytics are subordinate to privacy and data-retention choices.

## 3. Inventory that must be fully traced

The below is the **starting scope**, not a claim that every dynamic route or button has been inventoried. In Phase 1 enumerate every reachable screen, authorized role variant, tab, form, sheet, dialog, significant action, validation and business transition from source and browser. Freeze the resulting register with stable IDs and counts *before* measuring percent coverage.

### 3.1 Client navigation (all existing leaf destinations)

| Existing menu / submenu | Page tour and workflow families |
|---|---|
| Overview | Readiness and figures, open urgent items, drill down to permitted supporting records |
| My tasks | Current turn, overdue, waiting on others, completing or handing off real work |
| QMS → Organization & Scope | QMS scope/revision, context, interested parties, roles and responsibilities |
| QMS → Policies | Find policies, document controls, review and approval relationships |
| QMS → Processes | Process groups, owner/members, process details, documents/risks/KPIs/audits, manage structure |
| QMS → Objectives & KPIs | Create objectives, target/frequency, periods/results, evidence and management-review inputs |
| Documents → Register | Register external document links, revisions, classifications, sharing, publication/archive |
| Documents → Reviews | Author/reviewer/approver/publisher turns, requested changes, periodic review/no-change |
| Risks & Opportunities | Create/assess, treatments and ownership, reviews, opportunity paths |
| Evidence | Register HTTPS evidence links, clause and process mapping, currency and visibility |
| Audits | Programme, auditors, checklists/templates, questionnaires, response, assessments, results, NC corrective actions, findings paper, report issuance |
| Management Review | Planning, inputs, checks, pack, evaluation, decisions, change requests, signatures, actions, closure |
| Corrective Action | NCs, containment/root cause, corrective actions, verification/effectiveness, improvement ideas, customer complaints |

Every entry requires both an **on-demand Play walkthrough** and an explicit disposition of its workflow families.

### 3.2 Settings (all existing destinations)

**Workspace:** Organization profile; Users and access; Roles and permissions; Sign-in and security; Integrations; Branding; Activity log.

**Quality system:** Process structure; Certification; QMS rules; Document numbering; Review and approval; Record retention.

**Account:** Profile and security; Appearance; Notifications; Data export; Billing; Privacy; Legal and agreements; Contact support; About.

Every permitted Settings destination gets its own Play walkthrough, including no-op/read-only pages. "No applicable mutation" is a valid documented disposition, not an excuse to omit the page. Do not show administrator-only tours to users without Settings permissions.

### 3.3 Platform administration (separate authority)

Organisations; Requests; Logs; Background jobs; Support reports; Support access; Platform team. Platform-only routes have their own Play controls and guide catalog; never expose platform operations through a client workspace guide.

### 3.4 Reachable subpages and flows

Phase 1 must enumerate deep links and route parameters, including process/objective/context details; document detail and revisions; risk and evidence detail; audit detail, checklist and questionnaire builders, invitations/assignments, audit conduct, results and report; management-review detail, record review, pack and actions; nonconformity, improvement and complaint detail; readiness, notifications, remarks, search and eligible support/authentication journeys. These may use context-specific walkthroughs rather than a separate top-level menu action, but all must receive a documented coverage disposition. Inaccessible and external-only routes must be explicitly excluded with reasons.

## 4. Guided organization onboarding

A single resumable checklist for first-time tenant setup, with steps that link to real existing screens and save only real business settings:

1. Organization profile, relevant locations and branding (authorized administrator).
2. Identity, invitations, users and roles; explicitly validate process-limited access.
3. Process structure: individual creation and, **once separately delivered**, standardized-template bulk import using external HTTPS links.
4. QMS scope, internal/external context, interested parties and responsibilities.
5. Policies, QMS rules, classification and record control configuration.
6. Document numbering, default review/approval routes, retention and certification settings as applicable.
7. Register available document/evidence links, objectives and risks, as relevant; don't fabricate missing ISO evidence.
8. Review missing configuration, owners, access restrictions, linked records and pending decisions.

Define each setup requirement as **Required / Optional / Not applicable / Pending / Verified** with justification. A user may defer steps; mandatory skipped tasks cannot count as verified. Show completion per task, not a fabricated global readiness %. Display "No data" when the underlying information is unavailable. Do not issue ISO conformity conclusions.

Distinguish per-organization verified configuration from per-person tutorial progress; multiple administrators must not overwrite one another's tutorial position. Re-evaluate the organization's setup after related settings/data change. Existing records should satisfy relevant setup prerequisites without rerunning the tutorial.

## 5. Content and walkthrough specification schema (design contract)

Every page/flow guide must define the following before development:

| Field | Required contents |
|---|---|
| Stable guide ID, version, owner | Supported route(s), review date and accountable owner |
| User goal | Observable business outcome, not click-count |
| Entry and eligibility | Permissions, organization/membership, assignment, classification, module entitlement |
| Preconditions | Record state, required supporting records, role separation, relevant configuration |
| Steps and UI targets | Exact visible label, stable target anchor, content, mobile fallback, allowed next action |
| Branches | All valid role/state paths and rejection/return-for-change paths |
| Side effects | Real actions explicitly taken by user; separate from informative tours |
| Completion evidence | Server-authoritative workflow state, or viewed steps for navigation-only tours |
| Recovery | Invalid input, missing target, unsupported provider, offline, refresh, tab, timeout, revoked access |
| Data protection | Allowed read scope, log redaction, no unauthorized counts/titles/links |
| Tests | Acceptance IDs, positive/negative fixtures, screenshot and accessibility cases |
| Disposition | Covered / Not applicable (reason) / Blocked (reason); never quietly omitted |

Workflow guides should *explain* but not duplicate authoritative buttons or approval/routing engines. For cross-module journeys, link existing records and respect their current lifecycle.

## 6. Delivery plan and dependencies

| Gate | Implementation phase | Concrete deliverables | Entry dependency |
|---|---|---|---|
| G1 | Source and workflow inventory | Frozen route/menu/action/state/role register, baseline refs, exclusion rationale, dependencies and numbered guides | Read latest front + backend main, open PRs and ADRs |
| G2 | Interaction and content specification | Approved page Play control behavior, UX copy, precise targets, branching scripts, permission rules, responsive/a11y specification | G1 approved |
| G3 | Shared guide engine | Versioned guide registry, per-page Play trigger, target resolution, authorized navigation, progress/restart/recovery; telemetry redaction | G2 plus backend design |
| G4 | Organization onboarding | Role-restricted organization checklist, state predicates, resume, validation and honest incomplete states | G3 plus business settings APIs |
| G5 | Full client and platform content | Release A: Overview/My tasks/QMS. B: Objectives/Documents/Risks/Evidence. C: Audits/Management Review/Corrective Action. D: Settings/platform, plus subpage paths. | G3 and related backend functions |
| G6 | Integration and acceptance | 100% traceability, real workflow E2E, isolation/permission negatives, responsive snapshots, accessibility, approved backend synchronization and owner review | G1–G5 |

Each release must include its *complete approved* workflows, not a partial tooltip subset. Partial progress is labeled **In progress**. Implement on branches with separate PRs; no pushes to main, force-push, unapproved merge or production deploy. Keep `plan/progress.md` accurate, with its last commit after actual checks. Never claim tests were run without evidence.

## 7. Backend impact assessment and cross-repository synchronization

**This PR is documentation-only, with no present runtime/backend impact:** it does not modify UI code, database schemas/relationships, APIs, permissions, security, integrations, events, or executable tests. **Future implementation does have backend impact**, and must not start without approved planning amendments in the separate backend architecture repo `dbauto/thryvems-backend`:

- **Database/relationships:** Organization setup requirements and verified-state snapshots; person + organization + guide version progress; de-duplication, optimistic concurrency, retention and invalidation.
- **APIs:** Authorized listing of eligible guides, current progress, replay/resume/skip, completion predicates and optional aggregate setup; never accept a client assertion that a privileged business step was completed.
- **Workflows/events:** Subscribe to or read only authoritative audit/review/document/process state changes, permission revocations, current membership and classification; invalidate stale accomplishments.
- **Permissions/security:** Cross-tenant denial, process-scoped records and classification filtering, administrator vs quality-manager vs process-owner vs consultant vs platform authority; prevent hidden metadata leaks through guide names/counts/target resolution.
- **Integrations:** No added file-upload endpoint. Excel bulk process import via separately approved link-only design; Google OAuth a separate identity/tenant admission ADR, not enabled by this plan.
- **Tests/operations:** Isolation, negative permissions, replay/idempotency, races, guide version drift, cross-tab resume, privacy-safe telemetry, export/retention impact, integration and E2E tests; review legal/DPA impacts before launch.

Before implementation, create a **linked backend change-management branch/PR** and update architecture and traceability by relevant stages. Reconcile open backend audit/process amendment PR #9 and older PR #3; do not claim either approved/synchronized. No backend functionality is authorized by this planning PR. **Backend synchronization: Pending.**

## 8. User acceptance and non-goals

The owner accepts the roadmap and metric definitions before engineering begins. All applicable G1–G6 gates must pass, backed by actual proofs as defined in the companion scorecard. A passing compilation, a functional Play icon, or a few example tours does **not** meet the completion contract.

Non-goals of this planning PR: implementation of onboarding, UI Play controls, import engine, Google authentication, changing ISO audit/business rules, adding menu entries, enabling analytics, database migrations or production changes.
