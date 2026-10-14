> **SUPERSEDED REFERENCE. Do not implement from this file.** The normative specification is `plan/iQMS-Consolidated-Backend-Plan-v3.md`.

# iQMS backend design plan

Version 1.0, 14 Oct 2026. Owner: Danica (platform admin and developer).
Audience: whoever builds the backend (Codex, Claude Code or a person). Read this whole file before writing code.

The front end in `app/` is the specification for behaviour. It is a clickable prototype with an in-memory store (`app/src/lib/store.tsx`) and sample data (`app/src/data/*.ts`). The backend must make every screen work with real, persisted, secured data without changing what people see.

---

## 0. Decisions at a glance

| Topic | Decision | Why |
|---|---|---|
| Runtime | Cloudflare Workers, TypeScript, **Hono** | Already on Cloudflare; global edge; cheap; one language with the front end |
| Database | **PostgreSQL** (Neon, region `ap-southeast-1` Singapore) through **Cloudflare Hyperdrive** | Relational data with many links; row-level security for tenant isolation; branching for sandbox |
| ORM and migrations | **Drizzle ORM** + drizzle-kit SQL migrations | Typed, works on Workers, plain SQL migrations reviewed in PRs |
| Validation and API contract | **zod** + `@hono/zod-openapi`, OpenAPI 3.1 published at `/v1/openapi.json` | One schema for validation, docs and the generated front-end client |
| Files | **Cloudflare R2** (private bucket, presigned URLs) plus "link only" records for SharePoint | Confidential files stay in the client’s SharePoint as links |
| Background work | **Cloudflare Queues** + **Cron Triggers** | Reminders, overdue checks, exports, retention, the error monitor |
| Email out | Transactional provider (Postmark or Resend) with SPF, DKIM, DMARC on the iQMS domain | Deliverability and bounce handling |
| Email in | **Cloudflare Email Routing → Email Worker** for `support@` | Turns support emails into support reports |
| Sign-in | Microsoft 365 (Entra ID, OpenID Connect) and email + password with MFA, **Turnstile** on public forms | Matches the sign-in screens |
| Auth implementation | Default: managed identity provider with SSO and MFA (WorkOS AuthKit or similar). Fallback: self-built with OIDC libraries. Decide in Phase 1 (section 6.6) | Auth is the riskiest part to build alone |
| Front-end data | **TanStack Query** replacing the in-memory store; keep the store’s function names (`add`, `update`, `remove`, `can`) as hooks | Pages change as little as possible |
| Environments | `local`, `sandbox`, `staging`, `production` | AI agent works only in `sandbox` |
| Deploys | GitHub Actions; production is a protected environment that needs Danica’s approval | Nothing reaches production without a person |
| Data residency | Singapore for database and R2 (R2 location hint `apac`) | Closest region to the Philippines; transfers covered by contract (section 7) |

---

## 1. Users and tenancy

### 1.1 Three kinds of user

| Kind | Who | Sees | Managed by |
|---|---|---|---|
| **Platform admin** | Danica and her team ("developer") | The platform console (`/platform`): organisations, requests, logs, jobs, support reports, support access, platform team. **Never** sees client records unless a client admin grants support access | Platform team page |
| **Consultant** | Outside ISO consultant (for example QualiPro Consulting) | Only the client organisations a platform admin assigned them to. Inside each: the QMS in read mode plus remarks, drafts, certification requirements. Confidential records only if named on them. Highly confidential never | Platform admin assigns consultants to organisations |
| **Client user** | People in a client company | Their own organisation only, by role | Their client admin |

Client roles (system roles, editable copies allowed): Administrator, Quality manager, Process owner, Contributor, Auditor, Viewer, plus custom roles. See `app/src/data/org.ts` `ROLES` and `app/src/pages/settings/roles.tsx`.

### 1.2 Tenancy model

- One **organisation** (`org`) per client company. Every client-owned row has `org_id`.
- One **person** (`user`) can belong to several organisations through **memberships**. Consultants always have several; client users usually one.
- A **consultant assignment** is a membership with `kind = 'consultant'`, created only by a platform admin, with an optional end date.
- Platform admins are not members of client organisations. They act on a client only through a **support access session** granted by that client’s admin (section 6.5).
- The org switcher in the user menu (consultant) lists the organisations from the person’s active memberships.

### 1.3 Tenant isolation, enforced twice

1. **Application layer.** Every request resolves `org_id` from the URL (`/v1/orgs/:orgId/...`) and checks the caller has an active membership. Repository functions take `orgId` as a required argument.
2. **Database layer.** PostgreSQL **row-level security** on every tenant table:
   ```sql
   alter table documents enable row level security;
   create policy tenant_isolation on documents
     using (org_id = current_setting('app.org_id')::uuid);
   ```
   Each request runs in a transaction that first calls `select set_config('app.org_id', $1, true)` and `set_config('app.user_id', $2, true)`. The app connects as a role **without** `BYPASSRLS`. Platform jobs that must cross tenants use a separate role, only from Queue consumers, and every cross-tenant read is logged.

An automated test suite (section 12.3) tries to read and write every table across organisations and must fail.

---

## 2. Architecture

```
Browser (React app, static on Cloudflare Pages)
   │  HTTPS, cookie session, CSRF token
   ▼
Cloudflare edge: WAF, rate limiting, Turnstile, bot management
   ▼
Worker "api" (Hono)  ── Hyperdrive ──►  Postgres (Neon, Singapore)  ◄── point-in-time restore
   │       │
   │       ├── R2 bucket "iqms-files" (private, per-org prefixes, presigned URLs)
   │       ├── Queue "jobs"      ─► Worker "jobs" (exports, emails, imports, virus scan calls)
   │       └── Queue "events"    ─► Worker "notify" (in-app + email notifications)
   │
Cron Triggers ─► Worker "scheduler" (overdue checks, reminders, digests, retention, monitor)
Email Routing  ─► Worker "inbound-mail" (support@ → support reports)
Workers Logs / Logpush ─► R2 "iqms-logs" + error monitor (section 10)
GitHub Actions ─► sandbox / staging / production deploys (approval gate on production)
```

Workers: `api`, `jobs`, `notify`, `scheduler`, `inbound-mail`, `ops-monitor`. They share one monorepo package `packages/core` (domain logic, schemas, permission checks) so rules are written once.

### 2.1 Repository layout (target)

```
app/                    existing React front end
backend/
  packages/core/        domain types, zod schemas, permission engine, numbering, rules
  packages/db/          drizzle schema, migrations, seed (synthetic only), RLS policies
  workers/api/          Hono routes per module
  workers/jobs/         queue consumers
  workers/notify/
  workers/scheduler/
  workers/inbound-mail/
  workers/ops-monitor/
  tests/                unit, integration (against a Neon branch), isolation, e2e (Playwright)
plan/                   this plan and decision records (ADR-0001…)
.github/workflows/      ci.yml, deploy-sandbox.yml, deploy-staging.yml, deploy-production.yml, agent-fix.yml
AGENTS.md               instructions for coding agents
```

---

## 3. Data model

Conventions:
- Primary keys `uuid` (v7, time-ordered). Human numbers (`NC-2026-007`, `QMS-MAN-001`, `MR-2026-02`, `EV-0214`, `SR-1043`) are separate columns, unique per org, generated by a `counters` table inside the same transaction (`select … for update`).
- Every tenant table: `org_id uuid not null`, `created_at`, `created_by`, `updated_at`, `updated_by`, `version int` (optimistic locking), `deleted_at` (soft delete where the UI says "Move to archive"; hard delete only for drafts and via retention).
- Enumerations are Postgres `text` with `check` constraints matching the TypeScript unions in `app/src/data/types.ts`. Keep the UI wording exactly (for example `'Add and edit'`).
- People are referenced by `user_id`, never by name. The API returns display names and applies the masking rules (section 5.4).
- Many-to-many links get their own tables (no arrays of ids for anything that needs integrity). Arrays are fine for plain values such as clause numbers.

### 3.1 Platform and identity

| Table | Key columns | Notes |
|---|---|---|
| `orgs` | id, name, domain, plan (`Business`/`Team`/`Trial`), seats, region, status, created_at | Platform › Organisations |
| `org_modules` | org_id, area, enabled | Per-client module switches (`app/src/lib/modules.ts`) |
| `org_settings` | org_id, branding jsonb, qms_rules jsonb, numbering jsonb, retention jsonb, security jsonb, route_defaults jsonb | Settings pages. Validate each jsonb with zod |
| `users` | id, email (citext unique), name, title, avatar_url, status, mfa_enabled, last_active_at | One row per human |
| `identities` | user_id, provider (`microsoft`/`password`), subject, tenant_id | Link to Entra ID or password credential |
| `memberships` | id, org_id, user_id, kind (`member`/`consultant`), role_id, scope, status (`Active`/`Guest`/`Deactivated`), starts_at, ends_at | Users and access |
| `roles` | id, org_id, name, purpose, system bool, scope, access jsonb (`{area: AccessLevel}`) | Roles and permissions |
| `invites` | id, org_id, email, role_id, invited_by, expires_at, accepted_at | |
| `access_requests` | id, org_id?, email, name, company, message, state | Request access page and Platform › Requests |
| `platform_admins` | user_id, level | Platform team |
| `consultant_assignments` | id, consultant_user_id, org_id, assigned_by (platform admin), starts_at, ends_at, note | Creates the consultant membership |
| `support_access_sessions` | id, org_id, ticket, granted_by, platform_user_id, starts_at, ends_at, ended_at | Section 6.5 |
| `sessions` | id, user_id, created_at, expires_at, ip_hash, user_agent, mfa_at | Server sessions (if self-built auth) |

### 3.2 QMS structure

| Table | Key columns |
|---|---|
| `processes` | id, org_id, number (`04`), name, band (`Management`/`Core`/`Support`), owner_id, clauses text[], purpose, inputs text[], activities text[], outputs text[], involved, feeds |
| `process_routes` | process_id, reviewers uuid[], approvers uuid[] (process review route) |
| `context_issues` | id, org_id, kind (`Internal`/`External`), issue, effect, climate bool |
| `interested_parties` | id, org_id, name, needs, how_monitored, review_due |
| `policies` | id, org_id, number, title, rev, state, owner_id, body, published_at |
| `policy_acknowledgements` | policy_id, rev, user_id, acknowledged_at |
| `glossary_terms` | id, org_id, term, meaning, source |
| `objectives` | id, org_id, number, name, process_id, frequency, target numeric, unit, owner_id, next_result_due |
| `objective_results` | id, objective_id, period, value numeric, entered_by, entered_at |
| `objective_evidence` | objective_id, evidence_id |

### 3.3 Documents

| Table | Key columns |
|---|---|
| `documents` | id, org_id, number (control number), title, type, process_id, owner_id, classification, description, link (SharePoint), clauses text[], next_review, approval_mode, current_rev, stage, imported_rev (for documents brought in with their own numbering) |
| `document_revisions` | id, document_id, rev, stage, change_note, started_by, file_id?, published_at, superseded_at |
| `document_route_members` | revision_id, user_id, step (`review`/`approve`), position, decision, decided_at, note |
| `document_viewers` | document_id, user_id (named viewers for confidential) |
| `document_shares` | id, document_id, user_id, level, reason, ends_at, granted_by, pending_owner_approval |
| `comments` | id, org_id, target_type, target_id, author_id, body, created_at |

Rules to implement from the prototype: review route defaults (`app/src/lib/routes.ts`): company default by document type → process route → revision proposal; author can’t approve; consultants can’t approve; required approver always included; confidential access checked for every route member.

### 3.4 Risks, nonconformities, evidence

| Table | Key columns |
|---|---|
| `risks` | id, org_id, number, kind (`Risk`/`Opportunity`), title, process_id, likelihood, impact, treatment, action, owner_id, review_due, source |
| `nonconformities` | id, org_id, number, title, process_id, clause, source, severity, stage (0–6), owner_id, verifier_id, due, details, containment, root_cause, raised_at, risk_check jsonb |
| `nc_tasks` | id, nc_id, name, accountable_id, due, done_at |
| `nc_task_helpers` | task_id, user_id |
| `nc_risks` | nc_id, risk_id (clause 10.2.1 e) |
| `evidence_items` | id, org_id, number, title, kind, classification, clauses text[], added_by, added_at |
| `evidence_processes` | evidence_id, process_id |
| `evidence_files` | id, evidence_id, name, kind (`File`/`Link`), file_id?, url?, size |
| `evidence_links` | evidence_id, target_type (`document`/`nc`/`review`/…), target_id (the "Used on" list) |
| `files` | id, org_id, r2_key, name, mime, size, sha256, scan_status (`pending`/`clean`/`infected`), uploaded_by |

### 3.5 Audits

| Table | Key columns |
|---|---|
| `auditors` | id, org_id, user_id? or external jsonb, level, training, trained_on, certificate_file_id, recheck_by, status |
| `auditor_exclusions` | auditor_id, process_id |
| `audits` | id, org_id, number, process_id, date, lead_id, kind, state, clauses text[], independence_override_reason |
| `audit_team` | audit_id, auditor_id |
| `checklist_templates`, `checklist_sections`, `checklist_questions` | as in `ChecklistSection`/`ChecklistQuestion` types |
| `audit_findings` | id, audit_id, kind, clause, statement, evidence, nc_id? |

Independence check (`app/src/lib/auditors.ts` `blockedReason`) runs on the server too: an auditor cannot audit a process they own, work in, or created records for, unless a reason is recorded.

### 3.6 Management review (clause 9.3)

| Table | Key columns |
|---|---|
| `management_reviews` | id, org_id, number, title, format (`Meeting`/`No meeting`/`Several meetings`), stage, date, place, prepared_by, pack_sent_at, recorded_at, conclusion jsonb, sign_off jsonb, notes_file_id, evidence_id, locked_at |
| `review_participants` | review_id, user_id, role (`top_management`/`other`), status |
| `review_inputs` | review_id, ref, name, source, note, note_by, draft, handed_to, covered_in, not_applicable, frozen jsonb |
| `review_comments` | review_id, ref, author_id, body, created_at |
| `review_actions` | id, org_id, review_id, number, text, type, owner_id, due, linked_type, linked_id, state, done_at |

Live figures (`app/src/lib/review-figures.ts`) become a server function `computeReviewFigures(orgId, reviewId)`. On "Finish and lock" the server freezes them into `review_inputs.frozen` in the same transaction that creates actions, NCs and the evidence record. After `locked_at`, updates are refused except sign-off and action progress.

### 3.7 Consultant and readiness

| Table | Key columns |
|---|---|
| `remarks` | id, org_id, target_type, target_id, target_label, area, author_id, body, status, resolved_by, created_at |
| `remark_replies` | remark_id, author_id, body, created_at |
| `requirements` | id, org_id, clause, title, owner_id, due, status, evidence_ref, note, added_by |
| `certification` | org_id, body, stage1_date, stage2_date |

### 3.8 Notifications, support, logs

| Table | Key columns |
|---|---|
| `notifications` | id, org_id, user_id, kind, title, body, href, from_user_id, created_at, read_at |
| `notification_prefs` | user_id, org_id, kind, in_app bool, email bool, digest |
| `support_reports` | id, number, org_id?, source (`Person`/`Error monitor`), reporter_id?, category, impact, title, details, page, diagnostics jsonb, state, agent jsonb, fingerprint, github_issue, github_pr |
| `support_report_updates` | report_id, who, text, created_at |
| `support_attachments` | report_id, file_id |
| `activity_log` | see section 9 |
| `dsar_requests` | id, org_id, subject_email, type (access/correct/delete/portability), state, due_at |
| `jobs` | id, type, org_id?, state, attempts, last_error, started_at, finished_at |

---

## 4. API

- Base path `/v1`. Client routes are nested: `/v1/orgs/:orgId/...`. Platform routes `/v1/platform/...` (platform admins only).
- JSON, camelCase, ISO dates. Lists use cursor pagination `?cursor=&limit=` (max 100) and return `{ items, nextCursor }`; the table footer’s rows-per-page maps to `limit`.
- Writes accept `If-Match: <version>`; mismatch returns `409` with the current record so the UI can show "Someone changed this".
- `Idempotency-Key` header on create endpoints (stored 24 h).
- Errors: `{ error: { code, message, fields? } }`. `message` is written for the person using the app (the front end shows it), for example `"Choose a lead auditor."`.
- Generate the TypeScript client from OpenAPI into `app/src/api/` and use it from TanStack Query hooks.

### 4.1 Endpoint map (first version)

```
Auth        POST /v1/auth/password/start | /verify-mfa | /logout
            GET  /v1/auth/microsoft/start  → redirect; GET /v1/auth/microsoft/callback
            POST /v1/auth/forgot-password, /reset-password
            GET  /v1/me   (user, memberships, active org, permissions, prefs)
Org         GET/PATCH /orgs/:orgId/settings/{profile,branding,security,qms-rules,numbering,review-routes,retention,modules}
People      GET/POST/PATCH /orgs/:orgId/members, /invites, /roles
Processes   CRUD /orgs/:orgId/processes (+ /:id/route)
Context     CRUD /orgs/:orgId/context-issues, /interested-parties, /glossary
Policies    CRUD /orgs/:orgId/policies, POST /policies/:id/acknowledge
Objectives  CRUD /orgs/:orgId/objectives, POST /objectives/:id/results, PUT /objectives/:id/evidence
Documents   CRUD /orgs/:orgId/documents
            POST /documents/:id/revisions (start), /revisions/:rev/submit|approve|request-changes|publish
            POST /documents/:id/shares, DELETE /shares/:shareId, GET /documents/:id/access-history
Risks       CRUD /orgs/:orgId/risks
NCs         CRUD /orgs/:orgId/ncs, POST /ncs/:id/advance, /ncs/:id/tasks, PUT /ncs/:id/risks, POST /ncs/:id/risk-check
Evidence    CRUD /orgs/:orgId/evidence, POST /evidence/:id/files (presign), PUT /evidence/:id/links
Audits      CRUD /orgs/:orgId/audits, /auditors, /checklist-templates, /audits/:id/findings, POST /audits/:id/issue-report
Review      CRUD /orgs/:orgId/reviews, GET /reviews/:id/figures, POST /reviews/:id/send-pack|record|sign-off|close
            PATCH /reviews/:id/inputs/:ref, POST /reviews/:id/comments, PATCH /review-actions/:id
Consultant  CRUD /orgs/:orgId/remarks (+ replies, resolve), /requirements
Search      GET /orgs/:orgId/search?q=
Notify      GET /me/notifications, POST /me/notifications/read, GET/PUT /me/notification-prefs
Files       POST /orgs/:orgId/files/presign, GET /files/:id/download (short-lived URL)
Support     POST /v1/support/reports, GET /v1/support/reports/mine
Exports     POST /orgs/:orgId/exports (queued), GET /exports/:id
Privacy     POST /orgs/:orgId/dsar, GET /me/data-export
Platform    /v1/platform/orgs, /requests, /logs, /jobs, /support-reports, /support-access, /team, /consultant-assignments
```

---

## 5. Permissions

### 5.1 Model

Exactly as the prototype: each role has an access level per **area** (`None < View < Add and edit < Approve < Manage`) and a **scope** (`All processes`, `Processes they own`, `Not their own process` for auditors). Implement one function in `packages/core`:

```ts
can(actor: Actor, action: "view"|"create"|"edit"|"approve"|"manage"|"delete", resource: ResourceRef): Decision
```

`Decision` = `{ allowed: boolean, reason?: string }`. Every route calls it. The same function is exported to the front end (through `/v1/me` permissions) so buttons show and hide consistently. Never trust the front end’s decision.

### 5.2 Classification rules

| Classification | Who can open |
|---|---|
| Public | Anyone in the org, and public links if enabled |
| Internal | Members with View on the area |
| Confidential | Members with View on the area **and** (named viewer, owner, route member, or role Quality manager/Administrator). Consultants only if named |
| Highly confidential | Named people only, plus the owner. Sharing needs the owner’s approval. Hidden during support access sessions. Consultants only if named |

Lists filter at query level (RLS policy plus a classification predicate), not after fetching. Counts shown in figures must respect the same filter, or say "you don’t have access to N more".

### 5.3 Consultant rules

- View on all QMS areas of assigned organisations; Add and edit only for remarks, readiness requirements and draft notes (for example management review input drafts, marked `draft = true` until the quality manager confirms).
- Never an approver, never a document route member, never top management on a review.
- Assignment ends → membership deactivated, sessions for that org revoked, notifications stop.

### 5.4 Display masking

The client must not see the consultant’s name. The API serialises any author or actor whose membership `kind = 'consultant'` as `{ display: "Your consultant", isConsultant: true }` when the viewer is not a consultant. Client admins still see the consultant’s identity in Users and access (they manage the account) and in the Activity log. Apply this in one serializer used by remarks, replies, notifications, review notes and comments.

### 5.5 Separation of duties enforced on the server

- Author or reviser of a document revision cannot approve it.
- An auditor cannot audit their own process or work without an override reason (stored, shown to the certification body).
- The NC owner cannot verify their own action.
- A management review is locked after "Finish and lock"; changes need a new version with a reason.

---

## 6. Authentication and sessions

### 6.1 Sign-in methods
- **Microsoft 365**: OpenID Connect with Entra ID, multi-tenant app registration, `openid profile email` scopes only at sign-in. Match on `tid` + `oid`, not on email alone. Optional per org: "Only allow Microsoft sign-in" (Settings › Sign-in and security).
- **Email and password**: minimum 12 characters, checked against a breached-password list (k-anonymity range API), Argon2id or the provider’s equivalent. Lockout with increasing delay; never reveal whether an email exists.
- **MFA**: TOTP and passkeys (WebAuthn). Required for platform admins, client administrators and quality managers; orgs can require it for everyone.
- **Turnstile** on sign-in, forgot password, request access and support forms.

### 6.2 Sessions
- HttpOnly, Secure, SameSite=Lax cookie with an opaque session id; server-side session row. 12 h idle timeout, 7 day absolute (org-configurable shorter). Rotate the id on sign-in and on MFA.
- CSRF: double-submit token header `X-CSRF-Token` on all writes.
- "Sign out of all devices" and admin-forced sign-out revoke session rows.

### 6.3 Forgot password
Link valid 30 minutes, single use, hashed in the database; sign-in notification email after reset.

### 6.4 Platform admin accounts
Separate from any client membership. Hardware-key or passkey MFA required. Access to `/v1/platform/*` from the platform console only; every action logged to the platform audit log.

### 6.5 Support access ("let the iQMS team in")
A client admin grants a time-boxed session (max 72 h) tied to a support report number. During it, the platform admin can view the client org as a read-only Administrator, except highly confidential records. Everything opened is logged on both sides and the client admin can end it at any time. No write access unless the grant explicitly allows it.

### 6.6 Build or buy
Default: use a managed identity provider that supports Entra ID SSO, MFA, passkeys and session management, and keep our own `users`/`memberships`/`roles` tables for authorisation. Write ADR-0001 with the choice before Phase 1 ends. If self-building, use maintained OIDC and WebAuthn libraries; never hand-roll crypto.

---

## 7. Data privacy (Philippines Data Privacy Act, RA 10173, its IRR and NPC issuances)

### 7.1 Roles under the law
- **Each client company is the Personal Information Controller (PIC)** for its staff and records in iQMS.
- **iQMS (Danica’s company) is a Personal Information Processor (PIP)** for client data, and a PIC for its own account data (platform admins, billing contacts, support reports).
- Sign an **outsourcing (data processing) agreement** with each client that covers: processing only on the client’s instructions, confidentiality, security measures, sub-processors list (Cloudflare, Neon, email provider, identity provider, AI provider for support), breach notification to the client without undue delay, return or deletion at the end, and audits.

### 7.2 Obligations to build into the product and operations
| Requirement | How |
|---|---|
| Data Protection Officer | Name a DPO for iQMS; show contact in Settings › Privacy and the privacy notice. Register with the NPC if the registration thresholds apply |
| Privacy notice and consent | Privacy notice and Terms on the sign-in page (already linked). Record acceptance version per user |
| Proportionality | Collect only what the screens need. Diagnostics in support reports are opt-in and exclude record contents (already in the UI) |
| Data subject rights | Access, correction, erasure/blocking, portability: `dsar_requests` workflow for the client admin, `/me/data-export` for a person’s own data. Respond within the client’s deadline |
| Retention | Per-org retention rules (Settings › Record retention). Scheduler purges or anonymises expired records and logs what was removed |
| Breach management | Incident runbook (section 11.6). Help clients notify the NPC and affected people **within 72 hours** of knowledge when a breach is notifiable |
| Cross-border transfer | Data stored in Singapore. Covered by the outsourcing agreement and sub-processor contracts (accountability principle) |
| Privacy impact assessment | Write one before launch (template in `plan/PIA.md`, to be created) and review yearly |
| Sensitive personal information | Avoid storing it. Where a record might contain it (for example HR competence files), it must be classified Confidential or Highly confidential |

### 7.3 AI providers and personal data
The support AI agent must never receive client records. It works from: the report text, opted-in diagnostics, code, logs with personal data redacted, and synthetic data in the sandbox. Use an API plan where inputs are not used for model training, and list the provider as a sub-processor.

---

## 8. Security

Target: OWASP ASVS (current version, 5.0) Level 2 for the API and web app; align with ISO/IEC 27001 controls so clients’ certification auditors are comfortable.

### 8.1 Application
- Validate every input with zod at the edge of each route; reject unknown fields.
- Parameterised queries only (Drizzle); no string-built SQL.
- Output encoding by React; rich text stored as sanitised markdown, never raw HTML.
- Security headers on Pages and API: strict CSP (no inline scripts), HSTS (preload), `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`.
- CORS: only the app origins per environment.
- Rate limits (Cloudflare rate limiting binding): sign-in 10/min/IP and 5/min/account; API 600/min/user; exports 5/hour/org; support reports 10/hour/user.
- Uploads: max size per type (show the limit in the UI, see SR-1042), MIME sniffing, store under random keys, virus scan before `clean` (files stay unavailable until scanned), presigned URLs valid 5 minutes, `Content-Disposition: attachment`.
- Confidential and highly confidential: link-only by default (SharePoint), as the UI says. If files are uploaded, encrypt with a per-org data key (envelope encryption, key in Cloudflare Secrets Store) on top of R2 encryption at rest.

### 8.2 Infrastructure
- Least-privilege Cloudflare API tokens per environment and per workflow; the AI agent’s tokens can only touch `sandbox`.
- Secrets in Cloudflare Secrets Store / Worker secrets and GitHub environment secrets, never in the repo. Secret scanning on.
- Database: TLS required; separate roles for app, migrations, read-only analytics, cross-tenant jobs. Point-in-time restore 7–30 days; daily logical backup to a separate R2 bucket in another account; monthly restore drill.
- Dependency scanning (Dependabot), CodeQL, `npm audit` in CI; lockfile required.
- WAF managed rules on; bot fight mode on for sign-in.

### 8.3 Testing
- Tenant isolation tests (section 12.3) on every PR.
- Permission matrix tests generated from roles × areas × actions.
- External penetration test before the first paying client goes live, then yearly.

---

## 9. Activity log and audit trail

Two logs:

1. **Activity log (per org)**, shown in Settings › Activity log and on records: who did what, when, on which record, with before/after for important fields. Table `activity_log(id, org_id, at, actor_id, actor_kind, action, target_type, target_id, summary, changes jsonb, ip_hash, request_id)`.
2. **Platform audit log**: platform admin actions, support access, cross-tenant jobs, deploy approvals.

Integrity:
- Append-only: the app role has `insert` and `select` only; no `update`/`delete`.
- Hash chain per org: `hash = sha256(prev_hash || canonical_json(row))`. A nightly job verifies the chain and alerts on a break.
- Daily export to R2 (`iqms-audit` bucket with a retention lock where available). Keep 7 years or the client’s retention rule, whichever is longer.

Never log passwords, tokens, file contents or full record bodies. Log record ids and changed field names; values only for non-personal fields.

---

## 10. Background jobs, monitoring and the AI ops agent

### 10.1 Scheduled jobs (Cron Triggers → scheduler → Queue)
| Job | When | Does |
|---|---|---|
| Overdue scan | Daily 06:00 Asia/Manila | NCs, actions, document reviews, risk reviews, review actions → `Overdue` notifications |
| Reminders | Daily 07:00 | Due in 7 days and 1 day; KPI results due; audit reports due; review inputs due |
| Digest | Daily or weekly per user pref | Summary email |
| Evidence ageing | Weekly | Flags evidence older than 12 months per clause |
| Retention | Nightly | Purge or anonymise per rules; write activity log entries |
| Audit log verify and export | Nightly | Hash-chain check, export to R2 |
| Backup check | Weekly | Restores the latest backup to a scratch branch and runs smoke queries |
| Monitor sweep | Every 5 minutes | Section 10.2 |

Each job is idempotent, records a row in `jobs`, retries with backoff up to 5 times, then goes to a dead-letter queue and raises a monitor alert. Platform › Background jobs reads this table.

### 10.2 Error monitor ("ops-monitor" worker)
Sources: Workers Logs (exceptions, 5xx), the `jobs` table (failed runs), the activity log (failed actions such as failed sign-ins, failed exports, failed imports), front-end error beacons (opt-in diagnostics), and inbound support email.

1. Normalise each failure into `{ fingerprint, service, org_id?, message (redacted), count, first_seen, last_seen }`. Fingerprint = service + error class + route/job + top stack frame.
2. Thresholds (configurable): any failed background job after its last retry; 5xx rate above 1% for 5 minutes; same fingerprint 3 times in an hour; any sign-in failure spike; any audit-log chain break (critical).
3. On threshold: create or update a `support_reports` row with `source = 'Error monitor'`, email the platform alert address, and open a GitHub issue labelled `monitor` with the redacted details. Critical items also send a push/SMS through the alerting provider.
4. De-duplicate by fingerprint; reopen if it recurs after a deploy.

### 10.3 Support reports from people
`POST /v1/support/reports` (from Settings › Contact support) and inbound email to `support@` both create a report, store attachments as files, send an acknowledgement email to the reporter, and notify the platform admin. Reporter sees friendly states ("We’re looking into it", "Fix being tested", "Fixed"); internal states are richer (section 3.8).

### 10.4 The AI fix agent (sandbox only, human approves every deploy)

Principle: **fixes are code changes in git only**. The agent never edits production data, configuration or secrets. Data corrections are written as reviewed migration or script PRs that a person runs.

Flow:
```
support report / monitor alert
   └─► GitHub issue (label: agent-fix) created by ops-monitor or by "Ask the AI agent" in the platform console
         └─► GitHub Actions workflow agent-fix.yml (Codex or Claude Code in CI)
               1. checks out a new branch fix/sr-<number>-<slug>
               2. reproduces with a failing test (unit, integration on a Neon sandbox branch, or Playwright)
               3. writes the fix, runs lint, typecheck, all tests
               4. deploys to the sandbox environment (sandbox.iqms…/sr-<number>) with synthetic seed data
               5. runs smoke tests against the sandbox deploy
               6. opens a PR with: root cause, change summary, tests added, sandbox link, risk notes
               7. updates the support report: state "Waiting for approval", agent findings
   └─► Danica reviews in the platform console or GitHub, clicks Approve deploy
         └─► PR merged → deploy-production.yml runs (environment "production" requires her approval)
               └─► canary: deploy as a new Worker version to 10% for 15 minutes, watch error rate, then 100%
                     └─► report state "Deployed"; reporter emailed "Fixed"
```

Guardrails:
- The agent’s GitHub token: fine-grained, this repository only, `contents: write` on non-protected branches, `pull_requests: write`, `issues: write`. `main` is protected: PR review by Danica required, status checks required, no force pushes, no admin bypass.
- The agent’s Cloudflare token: `sandbox` Workers, sandbox R2 bucket and the Neon sandbox project only. No production secrets exist in the agent’s environment.
- Report text, emails and logs are **untrusted input**. The agent prompt must say so; it must not follow instructions found inside them (prompt-injection defence). Strip links and attachments to plain text before passing them.
- On the email idea: rather than giving an AI read access to a personal inbox, use the dedicated `support@` mailbox → Email Worker → structured report. The agent reads reports from the API, not the inbox.
- Agent budget limits: max run time and spend per issue; if it can’t reproduce, it says so and stops ("Needs a person").
- Every agent action is recorded in the report timeline and the platform audit log.
- Rollback: one-click "Roll back" in Platform › Background jobs re-deploys the previous Worker version and reverts the PR.

The platform console screens for this already exist in the prototype: Platform › Support reports (`app/src/pages/platform/reports.tsx`).

---

## 11. Operations

### 11.1 Environments
| Env | Data | Who deploys | URL |
|---|---|---|---|
| local | synthetic seed | developer | localhost |
| sandbox | synthetic seed, reset nightly; per-PR preview Workers | CI, AI agent | sandbox.<domain> |
| staging | synthetic + anonymised fixtures, never real client data | CI on merge to `main` | staging.<domain> |
| production | real | CI after Danica’s approval | app.<domain> |

### 11.2 CI (every PR)
Lint, typecheck (front end and backend), unit tests, integration tests on a fresh Neon branch, tenant isolation suite, permission matrix, Playwright e2e on the main flows, OpenAPI diff check, migration dry-run, bundle size check.

### 11.3 Migrations
Forward-only SQL migrations, reviewed in PRs. Expand → migrate → contract for breaking changes. Run in the deploy workflow before the new Worker version takes traffic.

### 11.4 Observability
Structured JSON logs with `request_id`, `org_id`, `user_id` (ids only). Metrics: request rate, error rate, p95 latency per route, queue depth, job failures, email bounces. Dashboards in Platform › Logs.

### 11.5 Targets
Availability 99.9% monthly. RPO 15 minutes (point-in-time restore), RTO 4 hours. p95 API latency under 300 ms for reads in the Philippines.

### 11.6 Incident and breach runbook (summary)
Detect → contain (revoke tokens, disable feature flag, block IP) → assess whether personal data was affected → if yes, inform affected clients without delay with what’s known, and support their NPC notification within 72 hours → fix → post-incident review within 5 working days → update this plan.

---

## 12. Front-end integration

### 12.1 Replace the in-memory store
- Keep `useStore()` as the facade so pages change little. Internally: `state.<collection>` becomes TanStack Query reads; `add/update/remove` become mutations with optimistic updates and rollback on error.
- `can()` uses permissions from `/v1/me`.
- Toast messages stay; on error show the API’s `message`.
- Sample data files stay for Storybook-style previews and the sandbox seed (convert them to the seed script in `backend/packages/db/seed`).

### 12.2 Things the prototype fakes that the backend must provide
- Overview figures and lists ("Needs your attention", "Coming up", Evidence by clause) → `/orgs/:orgId/overview`.
- Process health flags (`PROCESS_FLAG`, `PROCESS_WEEKS`) → computed from NCs, KPIs, audits and actions.
- Readiness checks ("Before Stage 1") → computed.
- Evidence-by-clause percentages → computed from evidence items, clauses and age.
- Notifications → real events (section 10.1 and the `notify()` calls already placed in the pages show exactly where).
- Branding, appearance, modules → persisted per org/user instead of localStorage.

### 12.3 Isolation test sketch
For each tenant table T: create two orgs A and B with a record each; as a user of A, list/get/update/delete B’s record through the API and directly through a DB connection with `app.org_id = A`. Every attempt must return nothing or 404, never B’s data.

---

## 13. Build phases and acceptance criteria

Each phase ends with: all CI green, deployed to staging, a short demo note in `plan/progress.md`.

**Phase 0, foundations (1 week)**
- Monorepo layout, Workers, Hyperdrive, Neon projects (sandbox, staging, prod), R2 buckets, GitHub environments with protection, CI skeleton.
- ADR-0001 auth choice, ADR-0002 email provider.
- Done when: `GET /v1/health` deployed to all environments through CI, production needs approval.

**Phase 1, identity and tenancy (2 weeks)**
- Orgs, users, memberships, roles, invites, sign-in (Microsoft + password + MFA), sessions, Turnstile, `/v1/me`, RLS on all tables, isolation suite, platform console: organisations, requests, team, consultant assignments.
- Done when: a consultant assigned to two orgs can switch between them and sees nothing of a third; isolation suite passes.

**Phase 2, QMS core (3 weeks)**
- Processes, context, parties, policies + acknowledgements, objectives + results + evidence links, risks, documents with revisions/routes/shares/comments, evidence with files and reuse, files with scanning, search.
- Done when: every QMS and Documents screen works on real data; separation-of-duties rules enforced server-side.

**Phase 3, audits, NCs, review, consultant (3 weeks)**
- Auditors and independence, audits, checklists, findings → NCs, NC workflow with tasks and risk links, management review (all three formats, figures, lock, actions), remarks with masking, readiness.
- Done when: a full audit → NC → review cycle runs end to end in Playwright.

**Phase 4, notifications, jobs, privacy (2 weeks)**
- Notification events, prefs, email, digests; scheduler jobs; retention; data export; DSAR workflow; activity log with hash chain and export.
- Done when: overdue and reminder emails arrive in staging; retention purge is logged; chain verification passes.

**Phase 5, support and AI ops (2 weeks)**
- Support reports API and inbound email, ops-monitor, GitHub issue creation, agent-fix workflow on sandbox, approval-gated production deploy with canary and rollback.
- Done when: a seeded failing job produces a report, the agent opens a PR with a sandbox link, and production deploy waits for approval.

**Phase 6, hardening and launch (2 weeks)**
- Pen test and fixes, PIA, outsourcing agreement template, privacy notice final, load test (200 concurrent users per org, 50 orgs), restore drill, runbooks, status page.
- Done when: pen test has no high findings open; restore drill meets RPO/RTO.

---

## 14. Open questions for Danica

1. Managed identity provider or self-built auth (ADR-0001)? Budget per active user matters.
2. Email provider and the sending domain.
3. Do any clients require data stored in the Philippines? (Changes the region choice.)
4. Billing: which payment provider, and is billing per seat (prototype shows seats)?
5. AI agent provider (Codex or Claude) for `agent-fix.yml`, and monthly spend cap.
6. Who besides Danica can approve production deploys?

---

## 15. Task list for the coding agent

Work top to bottom. One PR per checkbox group. Update this list as you go.

- [ ] P0 Create `backend/` monorepo (pnpm workspaces), shared tsconfig, eslint, vitest
- [ ] P0 `wrangler.toml` per worker and per environment; Hyperdrive bindings; R2 bindings; Queue bindings
- [ ] P0 GitHub Actions: `ci.yml`, `deploy-sandbox.yml`, `deploy-staging.yml`, `deploy-production.yml` (environment protection)
- [ ] P1 Drizzle schema for section 3.1; migrations; RLS policies; seed script from `app/src/data/*`
- [ ] P1 Auth per ADR-0001; sessions; CSRF; Turnstile; `/v1/me`
- [ ] P1 Permission engine `can()` in `packages/core` with tests generated from roles × areas
- [ ] P1 Isolation test suite
- [ ] P1 Platform console APIs: orgs, requests, team, consultant assignments, modules
- [ ] P2 Schemas and routes for sections 3.2–3.4; numbering counters; files + presign + scan
- [ ] P2 Document workflow with route rules from `app/src/lib/routes.ts`
- [ ] P2 Generate OpenAPI client into `app/src/api/`; swap store collections one module at a time
- [ ] P3 Audits, auditors, independence; NC workflow; management review; remarks + masking; readiness
- [ ] P4 Notifications + email + prefs; scheduler jobs; retention; exports; DSAR; activity log chain
- [ ] P5 Support reports API + inbound email; ops-monitor; agent-fix workflow; canary + rollback
- [ ] P6 Security headers, rate limits, pen-test fixes, PIA, load test, restore drill
