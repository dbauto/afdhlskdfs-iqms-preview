> **SUPERSEDED REFERENCE. Do not implement from this file.** The normative specification is `plan/iQMS-Consolidated-Backend-Plan-v3.md`. Review findings on this version are in `plan/REVIEW_v2.1.md`.

# iQMS consolidated backend plan — version 2.1

14 October 2026 · Product owner: Danica Marie Boton

## 1. Status, sources and precedence

This is a reconciled development baseline, not an implementation or a certification claim. It combines the preserved Architecture and Development Specification v1.3, Claude's BACKEND_PLAN v1.0, current repository evidence and Danica's KPI clarification. Original documents are preserved as reference appendices below. This controlling reconciliation supersedes conflicting appendix statements; non-conflicting enterprise controls in v1.3 continue to apply. New proposals remain proposals until recorded in ADRs.

Source repository: https://github.com/dbauto/afdhlskdfs-iqms-preview
Current source tree checked: 54384b6766f7717dde072768978a4d9c31b42bd1.
Earlier specification inspected f6129e6; that inventory is now stale.

The v2.1 review retrieved and inventoried all 119 application source files at the full commit above, reconciled feature behavior and inspected every live route family with focused form, validation, role-control and recovery checks. Section 15 and its companion review package contain the findings. This is not exhaustive execution of every workflow or role/data/state combination. The implementation/security qualification in section 3 remains required before final acceptance.

Requirement precedence: explicit user decisions → reviewed product decision register → this reconciliation → non-conflicting v1.3 requirements → proposed details from Claude's plan → prototype behavior as evidence. Prototype behavior cannot override authorization, integrity or links-only requirements silently.

## 2. Conflicts resolved and decisions retained

| Topic | Reconciled direction | Status |
|---|---|---|
| Client topology | Separate client deployment and database, one shared codebase, separate platform control plane | Retain earlier agreed direction |
| Shared multi-tenant DB | Do not adopt implicitly from Claude's plan; a change needs cost/security ADR and product decision | Alternative, not baseline |
| Stack | TypeScript Worker, modular domain services; Hono/Zod/Drizzle/TanStack Query are reasonable candidates | Proposed, prove compatibility |
| Database vendor | Neon Singapore is a candidate alongside earlier managed-PostgreSQL options | Open; verify region, isolation, backups, costs |
| Identity vendor | Managed identity preferred; compare Entra plus fallback, broker, and WorkOS-like options against exact requirements | Open; no automatic self-built fallback |
| Controlled documents/evidence | External links and internal record references; no general uploads or file-presign API | Confirmed earlier requirement |
| Branding files | Narrow dedicated image exception with safe re-encoding or controlled provisioning | Proposed implementation |
| Support attachments | Separate product decision; start with text and protected references | Deferred |
| KPI | Client enters final result; iQMS compares target and links result-specific evidence | Confirmed user clarification |
| Consultant access | Client-approved local membership; platform may coordinate an invitation but cannot confer content authority alone | Proposed safe extension |
| Public classification | Workspace classification, not anonymous publication | Retain baseline |
| Restricted counts | No 'N hidden records' disclosure without an explicitly approved aggregation permission | Retain baseline |
| Support access | Default read-only, bounded scope, confidential data excluded; propose maximum 4 hours, renewable | Proposal; reject silent 72-hour change |
| Sessions | Propose 30-minute idle/8-hour absolute, client-policy review and step-up for sensitive actions | Proposal; no 7-day default adoption |
| AI operations | Optional isolated coding workflow after core launch; no production credentials or client content | New optional extension |
| Client AI | Separate optional product capability from the maintenance agent | Deferred, core-independent |
| Retention | Client/category policy and holds; no universal seven-year rule or maximum-age evidence rule | Retain baseline |
| Service targets | Earlier 24-hour RPO/8-hour RTO are proposals; stronger targets require paid capability and demonstrated exercises | Open commercial decision |
| Delivery duration | No fixed 1–3 week phase promises before inventory, proof of concepts and sizing | Re-estimate after Phase 0 |

## 3. Mandatory UI-to-backend coverage gate

Maintain UI-to-backend traceability at the pinned commit. The v2.1 package supplies ui-backend-coverage.csv with 42 semantic feature contracts, source-file-coverage.csv with every application source file, and separate control, state and route indexes. Together these provide the source/design baseline. Before implementation acceptance, expand each consequential command and dynamic role/state variant into a specific contract and test record: a lexical control entry linked to a domain contract alone does not prove its execution. Inspect disabled/role-specific actions through synthetic identities in an isolated environment. Avoid making real external changes during review.

Columns: requirement_id, source_path, route, control_or_display, actor, input_fields, validation, query_or_command, entities, relationships, permission, scope, classification, transition, transaction, event, notification_or_job, UI_result, failure_state, test_id, evidence, status, open_decision.

Statuses: source observed / visually observed / interaction exercised / specified / implemented / tested / blocked. Navigation alone does not establish interaction verification. Keep prototype defects in a separate gap register rather than reproducing them as requirements.

Required route families at the checked tree:

| Family | Coverage needed |
|---|---|
| Authentication | Microsoft, fallback login, access requests, invitations, recovery, MFA and session controls |
| Overview/search | Personal actions, deadlines, coming up, counts, clause evidence, KPI summaries, search visibility |
| Organization | Scope, context issues, interested parties, departments/locations, glossary and change history |
| Processes | Structure, owners, participants, connections, clauses, review routes, 12-week health and details |
| Policies | Exact revisions, audiences, acknowledgements, due dates and authorized publishing |
| Objectives | Definition, final-result entry, periods, targets, evidence and trend display |
| Documents | Register, reviews, details, create/edit, revisions, routes, decisions, sharing, comments and publication |
| Risks | Assessments, treatments, reviews, source relationships and history |
| Evidence | Packs of links, internal records, classification, clauses, process mapping, reuse and unlink/archive |
| Audits | Programme/calendar, planning, auditor register, qualifications/exclusions, templates, checklists, answers, findings and reports |
| Corrective action | Containment, root cause, tasks/helpers, verification, effectiveness, risk check, reopen and close |
| Management review | List/detail/record; Meeting/No meeting/Several meetings; drafts, pack, participants, figures, actions, sign-off and locking |
| Consultant/readiness | Remarks/replies/resolution, requirements, evidence, confirmation and certification metadata |
| Notifications | Inbox, unread/read-all behavior, preferences, delivery and revoked-record handling |
| Settings | Every profile, branding, appearance, user, role, security, integration, numbering, route, QMS-rule, privacy, retention, export, billing and support control |
| Platform | Organizations, entitlements, requests, team, sanitized logs, jobs, support reports, access grants and deployment state |

Release gate: 100% of inventoried controls have a backend mapping or explicit deferred/removed decision. Deferred modules are hidden and server-denied. Do not invent survey, employee KPI aggregation, PDCA boards or payments as launched features merely because they were previously discussed.

## 4. Runtime and client isolation

Use a modular monolith with portable domain logic. A client API Worker and queue/cron entrypoints can share packages; deploy separate services only for a real boundary. Platform API/UI/database are distinct from client business APIs. Keep inbound support email and AI runner optional.

The client Worker selects its database using a trusted immutable deployment binding. If an orgId appears in an API path, it must match the deployment; it never selects a database. Every client table still carries organization_id. Reject host/environment/organization mismatches. Separate deployments do not imply dedicated hardware or separate provider outage domains.

Cross-client consultants authenticate at the selected client deployment and receive a local authorized session. A platform selector may show approved workspace addresses and minimum metadata, not aggregate QMS content. Do not share browser cookies across client hosts. Final identity topology must establish how one provider principal maps to independently approved local memberships.

Client jobs use local DB bindings and roles. Platform scheduling distributes bounded commands to clients; no universal production BYPASSRLS job role. Migrations and emergency infrastructure access remain separate audited paths.

Hyperdrive caching is disabled initially for business/auth/config reads. Prove driver transaction behavior and context cleanup under pooling. RLS includes USING and WITH CHECK as applicable; absent context fails closed. Runtime role is neither table owner nor BYPASSRLS. Test insert, update, delete and indirect links, not reads alone.

Prefer same-origin client UI/API. Choose one API prefix (proposed /api/v1) consistently and generate OpenAPI/client artifacts. Platform has an independent API origin and issuer/audience policy. Browser origin checks supplement identity; they do not prove that a caller used the platform console.

## 5. Data conventions and omissions to correct

Use UUIDs for durable identity and separate unique human codes. References use membership/actor IDs rather than staff names. Preserve stable machine status codes separately from UI labels. Use UTC timestamps, local date deadlines and configured IANA timezones. Use numeric for final KPI values. Enforce organization-consistent foreign keys and restrict deletion of historical relationships.

Claude's table list is a useful inventory, but not final DDL. Restore the following omitted or insufficiently modeled entities:

| Domain | Required correction |
|---|---|
| Identity | Issuer/subject uniqueness, token-hash sessions, assurance/epoch/revocation, verified account linking; no email-only identity merge |
| Access | Multiple roles/scopes, record grants, permission ceilings, last-owner protection and classification policy |
| Structure | Versioned scope/process configuration, typed process relationships, normalized clause edition/mappings |
| Policies | Policy revisions and revision-specific audience acknowledgements |
| Documents | Revision-specific external references, definition versions, workflow instances/cycles, steps, assignments and immutable decisions |
| Audit | Template versions, copied audit checklist/questions, typed answers/edit history, report versions, contributors and amendments |
| NC | Verification/effectiveness/closure/reopening records; task helpers and risk assessment/check history |
| Review | Meeting occurrences for Several meetings, input coverage links, frozen source versions, pack versions, sign-off history and amendments |
| Evidence | Versioned references, typed record joins, restricted access inheritance and result-specific joins |
| Operations | Transactional outbox, deduplication, idempotency, attempts, delivery state, legal holds and deletion/export jobs |
| Customization | Versioned settings/branding, custom field definitions, module compatibility and deployment/release manifests |
| Support | Local support grants, scoped events, minimal platform reports, separately protected attachments if later approved |

Replace reviewer/approver UUID arrays with relational assignments. Generic target_type/target_id links require an enforced entity registry or typed foreign-key joins; arbitrary identifiers are insufficient. An email can be a contact attribute, not proof that two identities are the same person.

## 6. Simple KPI contract — authoritative clarification

Client computes performance externally. Initial input is a final numeric value, not employee or production raw data. iQMS validates the value, compares it with the applicable target, retains history and lets the user attach supporting evidence. No department composite score or raw-data aggregation engine in the first release.

The current UI is process-centered. Do not invent a department KPI relationship from a process name. If department reporting is desired, explicitly link objectives to department IDs or versioned process/department mappings. Otherwise label reporting by process.

Minimum entities:
- objectives: ID, organization, title, process, optional explicit department scope, accountable owner, unit, frequency, status.
- objective_definition_versions: effective dates, target comparison rule, unit/precision and permitted bounds.
- objective_target_versions: effective dates and target. Initial UI supports 'at least'; at-most/range are extensions requiring UI coverage.
- measurement_periods: exact start/end, monthly/quarterly identifier, due date and timezone context.
- objective_results: objective, period, final numeric value, definition/target versions, submitter/time, row_version and optional source note.
- objective_result_corrections: previous/new value, reason, actor/time; no silent historical overwrite.
- objective_result_evidence: result ID plus evidence/reference version and organization-consistent foreign keys.
- objective_evidence: separate definition-level measurement-method evidence; never used as a substitute for result proof.

One current result per objective/period/scope; enforce uniqueness. A correction creates history, not a second contradictory current result. Target edits never retroactively change prior period assessments. Missing result is No data, never zero; new objectives have no fabricated history. Reject NaN/infinity and invalid ranges; zero is valid where permitted.

Current source app/src/pages/qms/objectives.tsx shifts a six-value array and merges result evidence into objective evidence. It also creates target-filled sample values for new objectives. Replace this behavior with period records and result evidence. Preserve simple entry; add a period selector or explicit auto-selected period label with an authorized correction route. Evidence remains optional unless the client's configured rule makes it required. The default submission is a saved result, not a new mandatory approval workflow. Optional verification is client-configured later.

Flow: select objective/period → enter final result → select evidence → validate authorization/value/period/version → transaction writes result, evidence joins, history and outbox → return authoritative comparison → refresh objectives, process health and relevant overview. Notify only under explicit rules. Below-target does not automatically create an NC.

## 7. Evidence and external-document guarantees

Evidence stores proof references, not proof correctness. Support multiple external links in a pack and links to internal records. Access checks apply to the evidence, its references and each linked record; permission to one record does not reveal all other uses.

The current EvidenceSheet permits file entry for less-restricted classes. This conflicts with the earlier links-only policy. Initial backend must not implement general file uploads; the UI needs a focused adjustment or a separately approved change of product scope. Classification cannot determine whether the no-upload policy applies.

Signed scans, auditor certificates and review notes are SharePoint references. Approved documents bind exact retrievable external versions and provenance, not one mutable URL on the parent document. Select the manually asserted durable-version or scoped Graph strategy before publication is enabled. eTag/change detection alone does not establish retained approved content.

Changing a referenced version cannot alter historical decisions. Evidence withdrawal/archive retains historical references and shows availability status under authorization. No arbitrary backend URL fetching; future verification needs HTTPS/host controls, SSRF/redirect protection and no credential forwarding.

Branding assets, temporary generated exports and protected backups are separate storage purposes. Support screenshots/attachments are deferred until their own authorization, retention, redaction and safe-ingestion design exists. Presigned URLs are bearer access until expiry; use authenticated export download for revocation-sensitive cases.

Evidence freshness depends on type, period, client rules and assessment, not a universal 12-month threshold. Clause coverage needs versioned requirements, applicable scope, accepted evidence links and assessment rules. Counts are filtered before aggregation. Do not present missing data as proof that a clause is noncompliant or claim certification from the percentage.

## 8. Authorization, consultants and support

The visible None/View/Add and edit/Approve/Manage controls can remain a role-editor abstraction. Backend translates reviewed templates into explicit permissions. Approve must not automatically imply edit, publish, delete or grant access. Every command evaluates membership + action + entitlement + scope + classification + workflow assignment/state + independence.

Platform consultant assignment becomes a proposed invitation or assignment request requiring client approval, unless a reviewed client contract/configuration explicitly delegates that authority. Client API owns membership activation/revocation. Deactivation stops access, notifications and downloads without destroying attribution.

Claude's consultant rules conflict: one section says Highly confidential never, another permits named consultants; masking also has multiple exceptions. Safe initial proposal: no Highly confidential consultant access; Confidential only explicit local grant. Resolve final policy in an ADR. If identity display is masked, retain real attribution in protected audit records and define every audience explicitly. Masking is display policy, not security/anonymity.

Support grants identify real platform principal, purpose/ticket, actions, record/process scope, classification ceiling, time window and revocation. Default read-only; no business approvals, privilege changes or bulk exports. Propose four-hour maximum renewable grants; client can revoke immediately. Cloud infrastructure privileges must be documented separately because app support restrictions cannot eliminate provider-admin access.

Auditor independence checks use explicit assignments and involvement IDs, not string inclusion/name matching. Override needs permission, reason, authorized approval and history; a text box alone does not establish objective/impartial audit suitability. NC verification defaults to someone independent of the action owner.

## 9. Transaction and workflow implementation

Shared command pattern: authenticate → fixed deployment check → authorize → validate schema/references → transaction rechecks state/version and locks necessary records → write change + business event + outbox atomically → commit → respond → idempotent dispatcher/consumer performs side effects.

Idempotency applies to consequential transitions as well as creation. Key scope includes organization, actor/context and operation; payload mismatch is conflict. Approval/workflow uniqueness lasts independently of a 24-hour request-key TTL. Outbox dispatch tolerates publish/mark crashes. Notification dispatch rechecks recipient access and sends minimal protected links.

Document submit locks the reference/route definition for that cycle. Review, request-changes, approve, publish, withdraw and archive are distinct commands. At most one ongoing document approval under the retained rule; decisions are tied to exact revision/cycle/assignment. ALL/ANY/SEQUENTIAL require explicit concurrent-decision tests.

Audit report issuance requires complete permitted answers, finding disposition and authorized lead. Multiple contributions remain attributable. Finding→NC uses a unique durable relationship. No-NC audits can issue. Late is a computed condition, not a lifecycle transition.

NC commands separately record containment, action completion, verification, effectiveness and closure. Reopening/failure retains prior decisions. Risk register links and 'checked, no change' statements retain actor/date/note.

Management review supports all three current formats. Finish-and-lock atomically captures source versions, figures, conclusion, actions and internal evidence reference. Subsequent source edits cannot rewrite the pack. Later sign-off is appended to a defined sign-off ledger; it does not modify the frozen business body. Amendments create a new version/reason. Sending a pack does not prove reading or acceptance.

Use row_version/If-Match and safe 409 errors. Do not return a newly restricted current record in a conflict response. Include request_id in the error envelope. Avoid optimistic UI approvals/publication; wait for server confirmation. Generic store add/update/remove may remain a transitional facade for simple CRUD, but cannot become a generic authorization-bypassing status patch API.

## 10. Enterprise operations and optional AI maintenance

Retain all applicable v1.3 security, policy, privacy, release and launch requirements. No automatic procurement, deployment, push or live-data change is authorized by this document.

Local/sandbox/staging contain synthetic data. Production-derived database branches must not be used by agents or routine tests, even if the provider makes branching easy. Sanitized fixtures require a verified process. CI builds once, signs/records provenance, validates real PostgreSQL and Worker runtime behavior, scans and promotes to staging then explicitly selected clients.

AI maintenance is optional: sanitized issue → unprivileged reproduction → isolated branch/fix/tests → sandbox preview → review → trusted CI staging/production promotion. Client AI and maintenance AI have separate identities, budgets, data policies and kill switches. Neither inherits business approval authority.

Separate the untrusted coding runner from the trusted deployment runner. Do not give it production secrets, auth/dashboard access, GitHub Actions-secret access or unrestricted network egress. Protect workflow files and deployment policy with explicit review. Fine-grained GitHub permission text alone does not guarantee branch-only writes; verify actual rules and bypass behavior. Verify Cloudflare token resource granularity; use a separate sandbox account where necessary rather than assuming token scopes can isolate Worker names/bindings.

Report text/attachments may already contain confidential data despite user opt-in. Minimize and redact before platform replication, GitHub issues or AI processing; use private destinations and review sensitive reports. Inbound email sender alone cannot grant identity/membership or trigger deployment. Bound size, rate and deduplication; isolate attachments and abuse handling.

Critical security alerts go to responsible humans immediately, not an unattended fix queue. Automated 'Fixed' messages require validated deployment on the affected client version and monitoring, not merely a merged PR. Worker rollback does not revert schema, queued effects, config or Git safely. Document a compatibility-aware rollback runbook; do not advertise one-click PR revert as recovery.

## 11. Provider facts and targets

Verified official Cloudflare guidance on 14 October 2026:
- R2 location hints are best effort, not a Singapore residency guarantee: https://developers.cloudflare.com/r2/reference/data-location/
- Fresh auth/session/permission/config and read-after-write queries require cache-disabled Hyperdrive configuration: https://developers.cloudflare.com/hyperdrive/concepts/query-caching/

Other choices remain validation tasks, not verified procurement facts: Neon region/project topology and recovery windows; identity costs/features; Cloudflare WAF/Access/logging/Queues availability; CI review protection; image re-encoding service; email routing/attachments; AI commercial eligibility. Record actual subscriptions, quotas and transfer locations in the standards/provider register. Do not equate a Singapore DB with whole-system residency.

Proposed qualification workload: 20–50 registered users per client, typical active concurrency plus separate 50-active-user burst; multiple-client scheduling without noisy-neighbor leakage. Record years/record volumes and external dependency latency. Initial proposals from v1.3: list/detail p95 <1 second, commands <2 seconds excluding exports/login; RPO <=24 hours/RTO <=8 hours. Claude's 300ms/99.9%/15-minute RPO/4-hour RTO require explicit budget, contract and measurement before adoption. No fixed SLA promised here.

Test steady load, burst, soak, pagination/search, concurrent decisions, DB timeout, queue duplicate/backlog, provider failure, revocation, migration, export and single-client restore. A successful nightly smoke restore is not a full recovery exercise. Restores reconcile current revocations, deletion obligations and holds before cutover.

## 12. Development sequence and acceptance gates

| Phase | Scope | Exit gate |
|---|---|---|
| 0 Reconcile/inventory | Full UI coverage, final decisions, threat model, API/DDL/permission/state designs, provider POCs | No unmapped UI controls; critical assumptions proven or explicitly blocked |
| 1 Foundation | Separate environments/client bindings, managed identity, sessions, memberships, explicit permissions, history/outbox | Two-client isolation/revocation/CSRF/transaction tests pass |
| 2 First document release | Organization/processes, policy/document revisions/routes, links-only evidence, comments/shares | Exact-version approval/publication, history and concurrency validated |
| 3 QMS operations | Simple period KPIs/evidence, risks, auditors/checklists/answers/reports, NC/tasks, all review formats | Audit→NC→review and KPI→evidence→overview traceability proven |
| 4 Client/platform operations | Readiness/consultants, notifications/jobs, settings/branding, local support grants, exports/privacy | Second-client provisioning, configuration isolation, restoration and customization upgrade pass |
| 5 Qualification | UAT, load/security/restore/incident exercises, actual policy/runbook adoption | Reviewed evidence against v1.3 launch gates; no undocumented blockers |
| 6 Optional extensions | AI maintenance, client AI, surveys/imports/other integrations | Separate scope, eligibility, threat model and acceptance package |

Security tests belong to every phase. Document management can launch separately with other modules hidden/server-denied. Estimate after Phase 0; each work package has dependencies, acceptance tests, migration and rollback behavior. Use one bounded implementation prompt per work package, not a predetermined arbitrary prompt count.

## 13. ADRs and concrete deliverables

Resolve: topology/cost; PostgreSQL provider and isolation; identity/session assurance and cross-client consultant login; external approved version strategy; client consultant approval/masking/classification; support duration; upload exceptions; department/process reporting; KPI evidence-required/verification policy; clause coverage/history rules; service targets/regions; supported release window; operator/client-owned deployment; optional AI execution/eligibility.

Required outputs: ui-backend-coverage.csv, prototype-gap-register.md, decisions/ADR-*.md, architecture-overview.md, final client/platform schema and migrations, data-dictionary.md, openapi.yaml, permission matrix, workflow transitions, event catalogue, frontend integration plan, deployment manifest schema, customization contract, release compatibility policy, branding token/asset design, threat models, security-controls.csv, policies POL-01–15, exercised operating runbooks, test plan/results, capacity-cost scenarios, phased backlog and launch-readiness register.

New acceptance tests supplement v1.3:
1. KPI result evidence stays attached to its exact period after later entries/corrections.
2. A target edit preserves historical assessment; new KPI has No data until entered.
3. General evidence/doc upload APIs do not exist in links-only release.
4. Platform consultant request alone cannot activate client-content access.
5. Restricted records leak neither counts nor labels via remarks/notifications/review snapshots.
6. Several-meeting review preserves input coverage and frozen figures; late sign-off cannot rewrite locked content.
7. User/host/org/database binding mismatches and RLS write-context leaks fail.
8. Agent-authored workflow changes cannot acquire production secrets or deploy without trusted review.
9. Wrong client/account migration and incompatible customized release are blocked.
10. Rollback and restoration preserve current permissions, held data and historical workflow meaning.

## 14. Coding-agent handoff

Read this controlling reconciliation and both appendices. Pin the current repository commit and complete UI coverage before implementation. Preserve established visual design except focused changes needed to satisfy approved behavior (period label, links-only controls, safe errors). Separate observed prototype behavior from agreed requirements. Do not reproduce synthetic data or insecure defaults in production.

Produce Phase 0 artifacts and proofs first. Use fixed per-client bindings, explicit action/scope/classification checks, exact-version workflows, transactional outbox and period-specific KPI evidence. Keep provider choices and numerical targets proposed until validated. Mark blocked features. Work in an isolated branch/worktree and deliver reviewable changes; no remote push, production deployment or live client mutation without authorization.

## 15. Complete UI alignment and user-approved error reporting — v2.1

This revision follows Danica’s instruction to cover the complete application behavior, data flows, UX, security and errors. The review pinned commit 54384b6766f7717dde072768978a4d9c31b42bd1, retrieved all 119 app source files, indexed 1,172 control declarations and 1,083 state/query/write expressions, and inspected all live route families with focused forms, validation, role controls and error recovery. Counts are lexical source evidence, not rendered feature counts or passing tests.

The companion iQMS-UI-Backend-Review-v2.1.zip contains the full UI behavior contract, data architecture, error-reporting contract, 38-gap register, verification/acceptance catalogue and source evidence inventories. These companion contracts control new details in this revision; earlier non-conflicting enterprise requirements continue to apply. Source scan and UI observations do not prove backend identity, persistence, isolation, transactions or production security. All role/data/state combinations still need implementation tests.

Key additions: visible Improvements and Customer complaints tabs now have explicit entity/source requirements; audit checklists/typed answers and report contribution sources are unified; management-review input/source bindings and sign-offs are structured; derived figures/statuses, every settings action, platform operations, authorized pickers, failure feedback and record disposition are mapped. Process-centered KPI remains final-result entry with specific period proof. No new raw KPI collection requirement is introduced.

Error detector MUST capture locally using allowlisted fields; optional browser diagnostics MUST NOT leave the browser or create a support report until the user reviews and explicitly sends the exact bundle. Include technical details starts unchecked. No default screenshots/session replay/raw logs/record bodies. Consent binds selected payload hash/destination/purpose/schema/notice/actor/time. Cancel transmits nothing; approved retry cannot add new data. User report approval does not grant support access, approve deployment or permit AI processing. Minimal internal server/security monitoring follows its separately adopted policy and does not bypass optional browser-report consent.

Observed defects include intermittent render TypeError 'u is not a function', recovered on reload; exact cause unknown. Live audit detail IA-2026-06 shows eight questions/answers while the checklist editor opens zero questions/one instruction. These and source-level integrity/security gaps are documented. Do not claim every workflow passed or copy broken prototype behavior into production. The source/design baseline is available with an explicit gap/decision register; the implementation coverage gate remains open for command-level execution, dynamic variants and security qualification.

