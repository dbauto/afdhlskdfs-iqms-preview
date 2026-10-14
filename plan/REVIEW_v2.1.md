# Review of "iQMS consolidated backend plan — version 2.1"

Reviewed 14 October 2026 against the repository at commit 54384b6 and later front-end commits in this session.
Outcome: the plan’s security thinking is strong, but it can’t be handed to a coding agent as it is. It has two contradictory normative sources in one file, leaves every vendor undecided, misses Cloudflare account limits that break the chosen per-client topology, and the app itself still contradicts several agreed rules. All findings below are fixed or decided in `plan/iQMS-Consolidated-Backend-Plan-v3.md`, the legal pack in `app/src/legal/`, the policies in `policies/`, and front-end changes in the same commit.

Severity: **Critical** blocks a safe build or would ship a legal or security defect. **High** would cause rework or a failed launch gate. **Medium** creates ambiguity or cost. **Low** is editorial.

## A. Structure of the document

| # | Severity | Finding | Fix |
|---|---|---|---|
| A1 | Critical | Two full normative plans are embedded verbatim (Appendix A, 45 sections; Appendix B, my v1.0) and the rule is "non-conflicting v1.3 requirements continue to apply". The coding agent has to decide, line by line, which of ~1,600 lines conflict. Appendix B contains rejected decisions (shared multi-tenant DB, R2 file uploads and presign API, 72-hour support access, 7-day sessions, consultant assignment without client approval) written as instructions. | One normative spec (v3). Older plans moved to `plan/reference/` with a "superseded, do not implement" banner. v3 merges every surviving v1.3 and v2.1 requirement into one text. |
| A2 | High | Section 15 depends on a companion zip (`iQMS-UI-Backend-Review-v2.1.zip`, `ui-backend-coverage.csv`, a 38-gap register) that is not in the repository. The agent cannot read or verify it. | Coverage file and gap register become repository files (`plan/coverage/`), generated in Phase 0 and kept in git. |
| A3 | High | Nearly every material choice is "proposed" or "open" (database, identity, email, topology costs, session values, support duration, service targets, upload exceptions). Phase 0 can’t exit without decisions the agent is not authorised to make. | v3 §2 records decisions with costs. The remaining items are business decisions with a default. |
| A4 | Medium | Section numbers repeat (main text 1–15, Appendix A 1–45, Appendix B 0–15). References such as "section 3", "sections 28 and 40" are ambiguous. | v3 uses one numbering throughout and does not refer to the archived plans. |
| A5 | Medium | Phase 0 asks for UI coverage of 1,172 control declarations plus ~40 documents before any code. That’s a risk of analysis without delivery. | v3 Phase 0 has a fixed, shorter deliverable list and proofs of concept on the decided stack; coverage is built per module as each module is implemented. |
| A6 | Low | File name says v2, heading says 2.1. v1.3 still references `pages/review/management-review.tsx`, which was replaced by `list.tsx`, `detail.tsx` and `record.tsx`. | Fixed in v3. |

## B. Architecture and Cloudflare limits

| # | Severity | Finding | Fix |
|---|---|---|---|
| B1 | Critical | Separate database per client through Hyperdrive: Hyperdrive allows **25 configurations per account on Workers Paid** (limits page checked 14 Oct 2026). With sandbox and staging databases, the topology stops at roughly 20 clients. Not mentioned anywhere. | Per-client database connections use Neon’s serverless driver (WebSocket pool, supports interactive transactions inside a request) or Neon’s pooled endpoint; Hyperdrive only where a limit increase is granted. |
| B2 | High | Per-client deployment counts against **500 Workers per account** and **250 Cron Triggers per account**. One API Worker + one jobs Worker + crons per client caps the business at roughly 120–200 clients, unplanned. | One Worker per client (API, static assets and queue consumer in the same script). No per-client crons: the platform scheduler enqueues per-client commands. Growth path above ~300 clients: Workers for Platforms. |
| B3 | High | Per-client hostnames and separate sign-in for consultants: every client host needs its own OIDC redirect URI (Microsoft Entra allows 256 per app registration) and the consultant re-authenticates per client. Left open ("final identity topology must establish…"). | Central identity provider sessions make switching client hosts a silent redirect; local session cookie per host. Redirect URIs are registered by the provisioning runbook. Above 200 clients, a second app registration. |
| B4 | Medium | Same-origin UI and API is preferred but the front end’s hosting isn’t decided (Pages vs Worker). | The client Worker serves the built front end as static assets; UI and API share one origin per client. |
| B5 | Medium | R2 location hints are best effort (the plan says so) yet backups, audit checkpoints and exports have no decided store. | Backups and audit checkpoints go to AWS S3 `ap-southeast-1` with Object Lock (compliance mode, real residency and immutability). R2 is used only for short-lived exports and branding assets. |
| B6 | Medium | No cost model, although cost was a stated requirement. | v3 §3 cost model: about USD 50 per month fixed plus about USD 12–16 per client per month at 20–50 users. |

## C. Conflicts between the plan and the current app (the app was wrong)

| # | Severity | Finding | Fix in this commit |
|---|---|---|---|
| C1 | Critical | Links-only rule vs upload controls in the UI: Evidence form ("Upload files"), NC sheet attachments, Record the review ("Upload signed record", "Upload notes"), Contact support ("Add screenshots"), Organization profile logo, Branding logo with SVG. | Evidence, NC, review and support now take SharePoint or OneDrive links only. Logo upload stays as the one approved exception, PNG/JPEG/WebP only, re-encoded server-side; SVG removed. |
| C2 | Critical | Settings › Privacy says data is hosted on "Microsoft Azure, Southeast Asia" and that iQMS tells the client "within 24 hours". Neither matches the architecture or the DPA. A client would approve a false statement. | Text now matches the subprocessor list and the DPA (initial notice without undue delay and at most 24 hours from confirming a personal-data breach, so the client can meet the 72-hour NPC deadline). |
| C3 | High | Support access button says "Allow for 24 hours". Plan says at most 4 hours, renewable, read-only, no confidential records. | Grant dialog with purpose, ticket number and 1, 2 or 4 hours; read-only; renewable. |
| C4 | High | Sign-in settings offer "Sign people out after 7 days" and allow two-step sign-in to be off for everyone, including administrators. | Idle timeout 15/30/60 minutes, absolute limit 8 or 12 hours; two-step sign-in is always required for administrators and quality managers. |
| C5 | High | "Include technical details" in Contact support is ticked by default; the agreed rule is unticked by default with explicit consent. | Unticked by default; the exact bundle is shown before sending. |
| C6 | High | The Evidence card says "N more items you don’t have access to". The plan forbids disclosing hidden counts. | Line removed. |
| C7 | High | The prototype lets a consultant open a Highly confidential record if named. The plan says never. | Consultants: Public and Internal; Confidential only when named; Highly confidential never. |
| C8 | High | New objectives get six fabricated results equal to the target; result evidence merges into objective-level evidence. | New objectives start with no data. Period records and result-specific evidence are specified for the backend (v3 §17); UI period picker lands with the API. |
| C9 | Medium | Platform assigns consultants directly in the prototype; plan requires client approval. | Spec: platform sends an assignment request; the client admin approves it in Users and access. UI change listed for Phase 1. |
| C10 | Medium | "Evidence getting old" uses a fixed 12 months; retention screen shows fixed defaults as if decided. | Spec: both become client settings with suggested defaults labelled as suggestions. |
| C11 | Medium | Billing page exists, but payments are out of scope for the first release. | Spec: Billing shows plan, seats and invoices sent by email; no card payments in release 1. |
| C12 | Medium | Legal links on sign-in, request access and Privacy point to `#`. No Terms, Privacy Notice, DPA or subprocessor list exist. | Legal centre added (public pages + Settings › Legal and agreements with versioned acceptance). |
| C13 | Low | Audit IA-2026-06 shows eight answers in the detail page while its checklist editor shows none (sample data). | Recorded in the gap register; sample data only. |
| C14 | Low | Intermittent "u is not a function" render error reported on the GitHub Pages preview, recovered on reload. Not reproduced in this session. | Gap register; the error boundary now records it for the support report. |

## D. Security and privacy gaps in the plan

| # | Severity | Finding | Fix |
|---|---|---|---|
| D1 | High | v1.3 §35 requires POL-01 to POL-15 drafts and a contract package. None exist. | Drafts in `policies/` and `app/src/legal/`. |
| D2 | High | Email provider, its region and its role as subprocessor are undecided; notification emails carry names and record titles. | Amazon SES in Singapore; emails carry no confidential titles (already in the plan) and are listed as a subprocessor. |
| D3 | High | Identity provider undecided, so the privacy notice can’t name where sign-in data goes. | Microsoft Entra ID (client’s own tenant) for Microsoft users; WorkOS for email sign-in, MFA and passkeys. WorkOS stores data in the United States: disclosed as a cross-border transfer. |
| D4 | Medium | Platform console protection relies on app sign-in only. | Cloudflare Access (Zero Trust) in front of the platform console, plus the app’s own MFA. |
| D5 | Medium | Tamper-evident audit checkpoints need an "independently protected retention location" that isn’t chosen. | S3 Object Lock bucket in a separate AWS account, write-only role for the exporter. |
| D6 | Medium | Breach timeline: plan says one hour internal escalation "proposed", app said 24 hours, DPA had nothing. | DPA: notify the client without undue delay and within 24 hours of confirming a personal-data breach affecting their data; internal escalation within one hour of detection. |
| D7 | Medium | NPC registration: the operator’s own obligation isn’t assessed (only "assess"). | POL-02 and the Privacy Notice include the DPO and a registration check under NPC Circular 2022-04 before launch. |
| D8 | Low | Error monitor and AI maintenance appear in the platform UI while the plan makes AI optional after launch. | Legal pack says AI maintenance is off unless the client is told; AI never receives client records. |

## E. Data model gaps

| # | Severity | Finding | Fix |
|---|---|---|---|
| E1 | High | Polymorphic links (`target_type`, `target_id`) in remarks, comments, evidence links and support reports have no enforced integrity. The plan says so but gives no pattern. | v3 §12: typed join tables for evidence and comments; remarks use a registry table `record_refs` with a foreign key per type. |
| E2 | Medium | Management review "Several meetings" needs meeting occurrences and per-input coverage; v2.1 lists it but the table isn’t defined. | `review_sessions` and `review_input_coverage` in v3 §12. |
| E3 | Medium | Support reports and the error monitor live in the platform database, but reports contain client staff names and emails. | Platform keeps a minimal report (number, client, category, state); the body and diagnostics stay in the client database and are opened under a support grant. |
| E4 | Low | Human numbers per client are generated in the browser in the prototype. | Server counters per client database (already in v1.3 §10). |

## F. What the plan gets right and v3 keeps

Fixed per-client bindings that never come from the request; deny-by-default authorisation with explicit permissions; exact-version document approval; transactional outbox; KPI as final-result entry with period-specific evidence; no hidden counts; support access as a local, revocable grant; AI with no production credentials and human-approved deploys; conservative service targets until measured. These carry into v3 unchanged.
