# iQMS backend specification, version 3.0

14 October 2026. Product owner: Danica Marie Boton.
Status: **normative**. This is the only document a coding agent implements from.

## 0. How to use this document

1. Read this file, `plan/REVIEW_v2.1.md` and `AGENTS.md`.
2. Precedence: Danica’s written decisions → this file → the v1.3 sections listed in §15 (as amended here) → the front end in `app/` as evidence of behaviour. Nothing in `plan/reference/` applies unless §15 names it.
3. "Must" is required for launch. "Should" is expected unless a decision record (`plan/decisions/ADR-nnn.md`) says otherwise.
4. The front end is the behaviour specification for screens and wording, except where this file or the review says the prototype is wrong.

## 1. Decisions

| # | Topic | Decision | Rejected and why |
|---|---|---|---|
| D1 | Client isolation | One Cloudflare Worker and one PostgreSQL database per client, one shared codebase, a separate platform control plane | Shared multi-tenant DB: cheaper at scale but a cross-client bug exposes everyone; clients in audited industries prefer separation |
| D2 | Database | **Neon PostgreSQL**, region `aws-ap-southeast-1` (Singapore). One Neon project per client. **Scale plan** for production (99.95% SLA, 30-day restore window, SOC 2, IP allow), **Launch plan** organisation for sandbox and staging | Supabase: PITR is USD 100/month per project and compute USD 10/project minimum, too expensive per client. PlanetScale Postgres: cheapest fixed node but no published Singapore region or restore window. AWS RDS: USD 18+ per instance per month, ops burden, no scale-to-zero |
| D3 | DB connection from Workers | **Neon serverless driver** (`@neondatabase/serverless`) `Pool` over WebSocket, created, used and closed inside each request or queue batch; Drizzle ORM on top | Hyperdrive allows only 25 configurations per account (paid), not enough for per-client databases. Use Hyperdrive only for the platform DB |
| D4 | Hosting of the UI | The client Worker serves the built React app as **Workers static assets**. UI and API share one origin per client (`https://<client>.iqms.ph` or the client’s custom domain) | Separate Pages project: second origin, CORS, more config per client |
| D5 | API framework | Hono + zod + `@hono/zod-openapi`, prefix **`/api/v1`**, OpenAPI at `/api/v1/openapi.json` | — |
| D6 | Background work | One **Cloudflare Queue per client** consumed by the same client Worker. **No per-client Cron Triggers**: the platform `scheduler` Worker runs crons and enqueues signed, bounded commands to each client queue | Per-client crons hit the 250-per-account limit |
| D7 | Microsoft sign-in | **Direct OpenID Connect with Microsoft Entra ID**, one multi-tenant app registration per environment, per-client tenant allow-list, redirect URI registered per client host by the provisioning runbook | Brokers hide `tid`/`oid` claims that we need for tenant checks |
| D8 | Email, password, MFA, passkeys | **WorkOS AuthKit** for people without Microsoft accounts (consultants, outside auditors, guests). Free up to 1M monthly active users. Data stored in the United States (WorkOS DPA, Exhibit B): disclosed as a cross-border transfer | Building password, MFA and recovery ourselves; Supabase Auth (would add a Supabase project per client) |
| D9 | Platform console access | Cloudflare **Access** (Zero Trust, free up to 50 users) in front of the platform hostname, plus WorkOS sign-in with passkey for platform admins | App sign-in alone |
| D10 | Outbound email | **Amazon SES**, region `ap-southeast-1`, dedicated sending domain with SPF, DKIM, DMARC `p=quarantine`. Emails never carry confidential titles | Resend/Postmark: fine, but US-only processing and higher price |
| D11 | Inbound support email | Cloudflare Email Routing → Email Worker on `support@iqms.ph`, text only, attachments dropped | Reading a personal inbox (prompt-injection and privacy risk) |
| D12 | Files | **Links only** for controlled documents, evidence, signed records, notes, certificates and support. One exception: **logo images** (PNG, JPEG, WebP ≤ 500 KB), re-encoded to PNG through the Cloudflare Images binding, stored in R2 | General uploads: storage, malware scanning, retention and breach surface |
| D13 | Temporary exports | R2 bucket `iqms-exports-<env>`, objects expire after 24 hours, downloaded through an authenticated Worker route (not bare presigned URLs) | — |
| D14 | Backups and audit checkpoints | Neon point-in-time restore (30 days on Scale) **plus** nightly encrypted logical dumps and daily audit-log checkpoints to **AWS S3 `ap-southeast-1` with Object Lock (compliance mode)** in a separate AWS account | R2: location is best effort and no compliance-mode lock |
| D15 | Session policy | Idle timeout set by the client: 15, 30 (default) or 60 minutes. Absolute limit 8 hours (default) or 12 hours. Re-authentication within 10 minutes for owner transfer, role changes, exports and support grants | 7-day sessions |
| D16 | MFA | Always required for client Owners, Administrators, Quality managers and platform admins. Client chooses for other roles. Microsoft users: enforced through the client’s Entra Conditional Access; iQMS checks the `amr` claim for privileged roles and falls back to a WorkOS TOTP step-up when it’s absent | Optional for administrators |
| D17 | Support access | Granted by a client Owner or Administrator for 1, 2 or 4 hours, renewable, read-only, tied to a support report number, excludes Confidential and Highly confidential records, revocable at once | 24 or 72 hours |
| D18 | Consultant access | The platform sends an **assignment request**; the client Owner or Administrator approves it in Users and access, which creates the local consultant membership. Consultants: Public and Internal records; Confidential only when named; **Highly confidential never**; never approvers, never top management. Clients see "Your consultant" instead of the name in remarks and review notes; the real identity stays in the activity log and in Users and access | Platform-only assignment |
| D19 | Service targets (contractual) | Availability 99.5% monthly, RPO 24 hours, RTO 8 hours. Internal targets: RPO 1 hour (PITR), RTO 4 hours. Revisit after two quarters of measurements | 99.9%/15-minute RPO before any measurement |
| D20 | AI | Off by default. The maintenance agent sees code, sanitised reports and synthetic data only; never client records; deploys need Danica’s approval. Client-facing AI is out of scope for release 1 | — |
| D21 | Payments | Out of scope for release 1. Billing page shows plan, seats and invoices sent by email | — |

Region note for the Privacy Notice: client QMS data lives in Singapore (Neon on AWS, S3). Cloudflare processes requests at its edge (nearest data centre, usually Manila or Singapore). WorkOS sign-in data for non-Microsoft users is in the United States. Short-lived exports and logos in R2 have an Asia-Pacific location hint, not a guarantee.

## 2. Cost model (USD per month, list prices checked 14 Oct 2026; verify before buying)

| Item | Fixed | Per client (20–50 users) | Notes |
|---|---|---|---|
| Cloudflare Workers Paid | 5 | ~0–1 | Requests and queue operations mostly within included amounts |
| Cloudflare zone Pro (WAF managed rules, rate limiting rules) | 25 | — | One zone `iqms.ph`; client subdomains included. Custom client domains via Cloudflare for SaaS: first 100 hostnames free |
| Cloudflare Access, Turnstile, Email Routing | 0 | — | Free tiers |
| R2 (exports, logos) | <1 | <0.1 | USD 0.015/GB-month, no egress fees |
| Neon Scale (production) | — | ~10–14 | 0.25–0.5 CU autoscaling, suspend after 15 min idle: about 200 active hours ≈ 50 CU-hours × USD 0.222 + 2 GB × (0.35 + 0.20 restore history) |
| Neon Launch (sandbox, staging, platform DB) | ~10 | — | USD 0.106/CU-hour, scale to zero |
| Amazon SES | ~1 | <0.5 | USD 0.10 per 1,000 emails |
| AWS S3 Object Lock backups | ~2 | ~0.5 | Standard-IA, 35-day lock on dumps, 7-year lock on audit checkpoints (compressed) |
| WorkOS AuthKit | 0 | 0 | Under 1M monthly active users; custom auth domain USD 99 optional |
| Microsoft Entra app registration | 0 | 0 | |
| GitHub Team | 4 per seat | — | Branch protection and environments |
| **Total** | **~USD 50** | **~USD 12–16** | 10 clients ≈ USD 200/month |

Cold start: a suspended Neon compute wakes in under a second; the first request after 15 minutes idle is slower. Clients who want no cold starts get an always-on minimum (≈ USD 40/month at 0.25 CU).

## 3. Topology and Cloudflare resources

```
iqms.ph zone (WAF, rate limits, Turnstile)
├── platform.iqms.ph ── Cloudflare Access ── Worker "platform" (UI + /papi/v1) ── Hyperdrive ── Neon "platform" (Singapore)
│                                              └── Cron Triggers → enqueue signed commands per client
├── <client>.iqms.ph ── Worker "client-<id>" (static UI + /api/v1 + queue consumer) ── Neon serverless driver ── Neon project "client-<id>"
│                         ├── Queue "q-<id>" (outbox dispatch, notifications, exports, reminders)
│                         ├── R2 iqms-exports (prefix <id>/), R2 iqms-brand (prefix <id>/)
│                         └── Images binding (logo re-encode)
├── support@iqms.ph ── Email Routing ── Worker "inbound-mail" → platform DB (minimal) → client queue (body)
└── Logs: Workers Logs (7 days) + Logpush to S3 (90 days, redacted)
```

Per client: 1 Worker, 1 Queue, 1 Neon project, 1 entry in the deployment manifest. Platform: 3 Workers (`platform`, `scheduler`, `inbound-mail`). Account limits allow about 450 clients; plan Workers for Platforms when passing 300.

**Deployment manifest** (`infra/clients/<id>.json`, validated by `infra/manifest.schema.json`): client id, hostname(s), environment, code version, Neon project and role (secret reference only), queue name, Entra tenant allow-list, enabled modules, branding version, release channel. The Worker reads its client id from a build-time binding; any request whose host, path or token names another client is rejected with 404.

## 4. Identity and sessions

- Microsoft: authorization code + PKCE + state + nonce. Validate `iss`, `aud`, signature, `exp`, `nbf`, and `tid` against the client allow-list. Identify a person by (`iss`, `tid`, `oid`). Personal Microsoft accounts are rejected unless the client enables them.
- WorkOS: hosted AuthKit, code exchange server-side, identify by WorkOS user id. MFA (TOTP) and passkeys enabled.
- **Sign-in never creates access**: the person needs an accepted invitation or approved access request and an active membership in this client database.
- **Account linking**: never by matching email. Linking a Microsoft identity and a WorkOS identity needs both sign-ins in one flow.
- Session: random 256-bit token in cookie `__Host-iqms_session` (Secure, HttpOnly, SameSite=Lax, Path=/, no Domain). Database stores SHA-256 of the token, membership, assurance level, created, last seen, idle and absolute expiry, authorisation epoch. Rotate on sign-in and on privilege change.
- CSRF: synchroniser token in `X-CSRF-Token` for every non-GET; Origin header must equal the client host.
- Deactivation, role change or support-grant revocation increments the membership’s authorisation epoch; sessions with an older epoch are refused on the next request.
- Consultant switching clients: the user menu lists approved workspaces from the platform (hostnames only). Opening one redirects to that host’s sign-in, which completes silently when the IdP session is still valid.

## 5. Authorisation

v1.3 §8 applies (explicit permissions, multiple roles, scopes, grant ceilings, last-owner protection) with these decisions:

- The role editor’s None/View/Add and edit/Approve/Manage per area maps to permission sets in `packages/authorization/templates.ts`. "Approve" grants decision rights on assigned workflow steps only; it never implies edit, publish or share.
- Classification:
  - **Public**: everyone in the workspace (not the internet).
  - **Internal**: members with View on the area.
  - **Confidential**: named viewers, the owner, route members, and roles granted `classification.confidential.read`.
  - **Highly confidential**: named viewers and the owner only. Sharing needs the owner’s approval. Hidden during support access. Never consultants.
- Lists, search, counts, figures, notifications, review snapshots and exports filter before counting. **No "N hidden items" messages.**
- Separation of duties enforced on the server: authors and revisers can’t approve their revision; NC owners can’t verify their own action; auditors can’t audit processes they own or work in unless an authorised override with a reason is recorded; consultants can’t approve or sign off.
- Masking: one serializer (`packages/domain/people/display.ts`) returns `{ display: "Your consultant", isConsultant: true }` for consultant actors when the viewer isn’t a consultant. Activity log and Users and access show the real identity to Owners and Administrators.

## 6. Data model

v1.3 §10–11 and v2.1 §5 apply. Use the prototype types in `app/src/data/types.ts` as the field inventory. Decisions and additions:

### 6.1 Conventions
UUID v7 keys; human codes from per-client counters; `organization_id` on every business table with a `CHECK (organization_id = deployment_org())` where `deployment_org()` reads a one-row `deployment` table set at provisioning; RLS policies keyed on the session context as defence in depth; runtime role is not owner and has no BYPASSRLS; migrations run as a separate role. Status codes are machine values (`technical_review`) with UI labels kept in the front end.

### 6.2 Cross-record links
- Evidence: `evidence_links` with one nullable foreign key per target type (`document_revision_id`, `nonconformity_id`, `management_review_id`, `objective_result_id`, `audit_finding_id`, `risk_id`) and a `CHECK` that exactly one is set.
- Comments and remarks: `record_refs (id, kind, document_id, process_id, risk_id, audit_id, evidence_id, nonconformity_id, management_review_id)` with the same exactly-one check; comments and remarks reference `record_ref_id`.

### 6.3 Objectives and KPI results
As v2.1 §6: `objectives`, `objective_definition_versions`, `objective_target_versions`, `measurement_periods`, `objective_results` (unique per objective + period), `objective_result_corrections`, `objective_result_evidence`, `objective_evidence` (method evidence). Missing result = "No data". New objectives have no history. The UI’s "Add result" gets a period label (auto-selected current period, changeable) when the API lands.

### 6.4 Management review
`management_reviews`, `review_participants` (top management or other, status: not opened, opened, commented, signed off, present, apologies), `review_inputs` (ref, note, note_by, draft, handed_to, not_applicable reason), `review_sessions` (for "Several meetings": date, title), `review_input_coverage` (input → session), `review_comments`, `review_snapshots` (frozen figures + source record versions, written at Finish and lock), `review_signoffs` (append-only ledger: method in-app or linked signed record, actor, time), `review_actions`, `review_amendments`. "Opened" means the person opened the pack, not that they read or accepted it.

### 6.5 Legal and consent
Platform DB: `legal_documents (id, code, version, title, effective_date, body_hash, published_at)`.
Client DB: `agreement_acceptances (id, organization_id, document_code, version, accepted_by_membership, role, accepted_at, ip_hash, user_agent)` and `policy_notice_views` for the Privacy Notice shown at first sign-in. New versions require fresh acceptance by an Owner before the effective date; the app shows a banner to Owners until accepted.

### 6.6 Support and error reports
Platform DB keeps `support_reports_min (number, client_id, source, category, impact, state, created_at, platform_assignee)`. The client DB keeps the full report (`support_reports`, `support_report_updates`, `diagnostic_bundles` with payload hash and consent record). Platform staff read the body only under an active support grant or when the reporter chose "Share with the iQMS team" on submit (default on for reports from people, since they’re writing to us; diagnostics separately opt-in).

## 7. Links-only rule

- A link record stores: provider (SharePoint, OneDrive, Google Drive, other HTTPS), URL, display name, optional version label, who added it, when, and for approved document revisions the version identifier the client asserts (Option A in v1.3 §15). Microsoft Graph verification is a later module.
- URLs must be `https:`; `javascript:`, `data:` and private-network hosts are rejected. The server never fetches a pasted URL.
- The UI never says a link was verified unless Graph verification exists.

## 8. Commands, outbox, jobs and notifications

v1.3 §13 and §21 and v2.1 §9 apply as written. Additions: the outbox dispatcher runs in the client Worker’s queue consumer and on each command commit (`ctx.waitUntil` as an accelerator only); a platform cron enqueues a "dispatch sweep" every minute as the guarantee. Reminders and overdue checks run in client time zone `Asia/Manila` by default.

Notification email template: subject and body name the record type and number only ("Document QMS-MAN-001 needs your approval"), never the title of Confidential or Highly confidential records, and link to the record.

## 9. Error reporting, support and AI maintenance

- Browser: captures error messages and the page path locally. Nothing is sent unless the person opens Contact support, ticks "Include technical details" (unticked by default) and sends. The exact bundle is shown first.
- Server monitoring: Workers exceptions and failed jobs are logged with ids only (no record bodies) and grouped by fingerprint in the platform DB; thresholds from v1.0 §10.2 apply. Critical security alerts page a person; they never enter the AI queue.
- AI maintenance (optional, off until Danica enables it): GitHub issue with sanitised text → isolated runner with no secrets → branch, failing test, fix → sandbox deploy with synthetic data → PR → Danica approves → trusted pipeline deploys to staging, then selected clients. The runner has no production credentials, no Actions secrets and no write access to workflow files.

## 10. Security baseline (must)

- Headers on every response: `Content-Security-Policy: default-src 'self'; img-src 'self' data: https://*.iqms.ph; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Rate limits (Cloudflare rules + Worker checks): sign-in 10/min per IP and 5/min per account; invitation and access request 5/hour per IP; API 600/min per session; exports 5/hour per client; support reports 10/hour per person.
- Turnstile on sign-in, forgot password, request access and Contact support.
- Secrets in Worker secrets; per-client Neon role passwords rotated every 90 days and on staff change; no global Cloudflare API key anywhere; deploy tokens scoped per environment.
- Dependencies pinned with lockfile; Dependabot, CodeQL, secret scanning; actions pinned by commit SHA.
- Encryption: TLS 1.2+ everywhere; Neon and S3 encryption at rest; nightly dumps encrypted with an `age` public key whose private key is held offline by Danica and one named backup person.
- OWASP ASVS 5.0 Level 2 mapping in `security/asvs-l2.csv` before launch; external penetration test before the first paying client.

## 11. Privacy and legal

- Roles: each client is the **Personal Information Controller (PIC)** for its workspace data; the operator is the **Personal Information Processor (PIP)** for that data and a PIC for its own account, billing, support and marketing data.
- Documents (drafts in `app/src/legal/`, shown in the app at `/legal/*` and in Settings › Legal and agreements): Terms of Service, Privacy Notice, Data Processing Agreement, Subprocessors, Security Overview, Acceptable Use Policy, Cookie Notice, Service Levels and Support, AI Features Addendum. Operator internal policies POL-01 to POL-15 in `policies/`.
- Acceptance: an Owner accepts the Terms and the DPA for the client before go-live (§6.5). Every user sees the Privacy Notice at first sign-in.
- Breach handling: internal escalation within 1 hour of detection; notice to the client’s DPO without undue delay and no later than 24 hours after confirming a personal-data breach affecting their data, so the client can notify the NPC and affected people within 72 hours where required (NPC Circular 16-03).
- Rights requests: the client’s DPO decides; iQMS provides export, correction and deletion tools; deletion keeps quality records required as evidence with minimal attribution (documented in the DPA).
- Retention: client-configured per category; screens show suggested periods labelled "suggested".
- Before launch: DPO appointed and published; NPC registration assessed under NPC Circular 2022-04; Privacy Impact Assessment `policies/PIA-iQMS.md` completed; all legal drafts reviewed by Philippine counsel.

## 12. Backups, recovery and targets

Neon PITR 30 days (production). Nightly `pg_dump` per client, encrypted, to S3 with 35-day Object Lock. Quarterly restore drill of one client into an isolated project, measuring RPO and RTO; before restore cutover, re-apply current membership revocations, legal holds and completed deletions (v1.3 §23).

## 13. Environments and delivery

`local` (Neon branch from a synthetic seed), `sandbox` (synthetic, nightly reset, AI runner allowed), `staging` (synthetic + anonymised fixtures), `production` (per client). Trunk-based with protected `main`; CI: typecheck, lint, unit, integration against a real Neon branch, isolation suite, permission matrix, Playwright e2e, OpenAPI diff, migration dry run, SBOM. Release: build once → staging → pilot client → remaining clients by release channel, using Worker gradual deployments (10% → 100% over 30 minutes, automatic halt on error-rate rise). Production deploy requires Danica’s approval in the GitHub `production` environment.

## 14. Phases and exit gates

| Phase | Scope | Exit gate |
|---|---|---|
| 0 Foundations (proofs) | Repo layout, manifest schema, Neon + driver transaction proof in a Worker, Entra and WorkOS sign-in proof, provisioning script for one client, CI skeleton | Two synthetic clients provisioned; a cross-client request fails; a transaction rolls back cleanly in a Worker |
| 1 Identity and access | Memberships, invitations, access requests, roles and permissions, sessions, CSRF, MFA rules, support grants, consultant assignment requests, legal acceptance | Isolation, revocation, CSRF, session fixation and last-owner tests pass |
| 2 Documents | Organisation and scope, processes, policies with acknowledgements, documents with revisions, routes, decisions, shares, comments, links-only evidence | Exact-version approval and publication with concurrency tests |
| 3 QMS operations | KPI periods and evidence, risks, auditors and audits with checklists and findings, NCs with tasks and risk links, management review (all formats), remarks and readiness | Audit → NC → review and KPI → evidence → overview traces pass end to end |
| 4 Operations | Notifications and email, platform scheduler, exports, retention and holds, rights requests, branding, Contact support, error monitor | Second-client provisioning and a restore drill pass |
| 5 Launch qualification | ASVS mapping, pen test, load test (50 active users per client), incident tabletop, legal sign-off | All v1.3 §38 gates evidenced |
| 6 Optional | AI maintenance runner, Graph verification, imports, client AI | Separate scope and approval |

## 15. v1.3 sections that remain in force

From `plan/reference/ARCH_SPEC_v1.3.md`, as amended by this file: §7 (except topology choices, decided in D7–D8), §8, §9, §10, §11, §13, §14, §15 (Option A for release 1), §16, §17, §18 (as narrowed by v2.1 §6), §19, §20 (prefix `/api/v1`), §21, §22, §23, §24, §27, §31–§40, §45 (logo exception per D12). Not in force: §5 stack proposals (decided here), §25 open decisions (decided here), §26 phases (replaced by §14), §41–§44 (deferred to Phase 6).

## 16. Remaining business decisions (defaults apply if not changed)

| Decision | Default |
|---|---|
| Product domain | `iqms.ph` (placeholder until registered) |
| Operator legal entity, address, TIN, DPO | Placeholders in the legal drafts, marked `[ ]` |
| Governing venue | Courts of Makati City |
| Support hours | Monday to Friday, 09:00–18:00 Philippine time, excluding public holidays |
| Pricing and seat counting | Per active user per month; Billing page reads seats from memberships |

## 17. Task list (Phase 0 and 1)

- [ ] `infra/`: manifest schema, provisioning script (Neon project via API, Worker deploy, queue, DNS, Entra redirect URI), deprovisioning script
- [ ] `packages/database`: Drizzle schema for §6.1, §6.5 and identity tables; migrations; `deployment` table and checks; RLS policies; synthetic seed from `app/src/data`
- [ ] `services/client`: Hono app, static assets, session middleware, CSRF, deployment binding check, `/api/v1/me`
- [ ] Entra OIDC and WorkOS adapters with the tests in v1.3 §27 items 2, 3, 18
- [ ] `packages/authorization`: templates, `can()`, classification filter, tests generated from the role matrix
- [ ] Support grants, consultant assignment requests, agreement acceptance APIs
- [ ] Isolation suite: two clients, every table, every endpoint, queue messages with the wrong client id
- [ ] Front end: API client from OpenAPI, `useStore` facade backed by TanStack Query for Users and access, Roles, Security, Legal
