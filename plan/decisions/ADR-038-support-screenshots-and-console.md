# ADR-038: Required screenshots on support reports, AI support, and the platform console redesign

27 October 2026. Requested and approved in writing by Danica (design approved on the console canvas, 27 Oct 2026): (1) people who report a problem must send a screenshot and a description; (2) the support process must line up between the client app and the platform console; (3) the console follows the client UI (same sidebar), with an Overview of finance, performance and required reports, AI assistant settings (API keys, system prompt, knowledge, model, effort, tokens and cost in pesos), security scans with an audit report, and per-organisation control of deployment, subscription and features.

This revises decision **D12** (no upload for support), plan v3 **§24** ("no default screenshots") and **D20** (AI never sees client data) for support reports only. Backend synchronization stays **Pending** until this change is approved through change management. The broader Developer/Business Console backend synchronization stays on hold.

## 1. Screenshots on support reports (revises D12 for support)

- **Required** for problem reports ("Something isn’t working", "Data looks wrong", "Access or sign-in"). Optional for "Question" and "Idea". A description is always required.
- People paste (Ctrl+V), drop or choose up to **3** images: **PNG, JPEG or WebP, up to 5 MB each**.
- The browser re-encodes each image to JPEG, at most 1600 px on the long side, which drops hidden photo data. The server re-checks type (from content) and size, scans for malware and stores it under a server-generated key in R2 `iqms-support-<env>` (platform-owned, not in the client database).
- Before sending, the person ticks **I checked my screenshots** (no passwords; confidential records and other people’s details cropped out).
- Screenshots are kept with the report: **12 months after closing**, then deleted. They are never attached to emails.
- The error screen shows a reference (`ER-…`). "Report this problem" opens Contact support with the reference, technical details ticked, and asks for a screenshot. The reference is logged with the server error so support can match them.

## 2. AI support (revises D20 for support only)

- Per client, off by default. The client’s Owner or Administrator turns it on; the AI Features Addendum covers it and Anthropic is listed as a subprocessor for it.
- A ThryveMS staff member first marks a report’s screenshots as **checked** (no client records or personal details beyond the reporter). Only then can AI support read them.
- AI support reads the report text, the chosen technical details and checked screenshots. It never reads workspace records.
- It drafts a reply; a staff member edits and sends it. Each draft records model, prompt version, tokens and cost.

## 3. AI assistants in the console

- Providers: Anthropic (Claude) and OpenAI. A pasted API key is stored in the secret vault and never shown again (last four characters only); test, replace.
- Two assistants: **AI support** (automatic, drafts replies) and **AI vulnerability scanner** (manual, started from Security scans). Each has provider, model, effort (Low, Medium, High), system prompt (versioned), knowledge, and a monthly peso budget that pauses the assistant when reached.
- Usage shows tokens in and out, cost in US$ and pesos (BSP reference rate of the day), cost per report or review, and daily use.
- Changes to keys, prompts, models or budgets need a second platform admin.

## 4. Security scans and audit report

- **Bot scans run automatically**: Dependabot, CodeQL, secret scanning; a weekly live-site check on staging when set up. The penetration test is external.
- **AI reviews are manual**: Claude and/or OpenAI, a scope and a reason; code only, never client data. Findings count only after a person confirms them.
- Findings have POL-07 fix dates (critical 72 h, high 7 days, medium 30 days, low 90 days); a finding closes only after the fix is released and the scan passes again. Exceptions expire within 6 months.
- **Security scan report** per quarter: summary, fix times against POL-07, scans run (bot automatic, AI manual), open findings and exceptions, sign-off. Fixed when created, kept 7 years, SHA-256 fingerprint.

## 5. Console layout and pages

- Sidebar uses the client sidebar’s building blocks: collapse button beside the logo, groups that open and close (Operations: Logs, Background jobs, Security scans; Support: Support reports, Support access), Settings pinned at the bottom. The top bar says "Platform console" and shows the environment.
- **Overview**: revenue, uptime against the 99.5% contract target, AI spend, unpaid invoices; revenue and costs by month; page speed and failed requests; database load per organisation; required reports (NPC Annual Security Incident Report, breach notices within 72 hours, BIR returns, monthly service reports, subprocessor and DPA review, SEC filings). Dates are reminders to confirm with the lawyer and accountant.
- **Organisation page**: deployment (release, next release, channel, database, backup check; deploy and rollback need Danica’s approval), subscription (plan, seats, monthly amount and VAT, contract versions; reminders for unpaid invoices), features (switches marked In plan, Add-on or Needs client OK; Google sign-in, personal Gmail and AI support need the client’s approval).
- The console still shows accounts, health, money and code, never client records.

## Backend impact (Pending)

| Area | Change | Status |
|---|---|---|
| Schema (platform DB) | `support_screenshots` (report, storage key, size, dimensions, checked_by/at, deleted_at); `ai_providers` (provider, secret reference, last4, tested_at); `ai_assistants` + `ai_prompt_versions` + `ai_knowledge`; `ai_usage` (assistant, day, tokens in/out, usd, php_rate); `ai_reviews`; `security_findings`; `scan_reports` (frozen JSON, sha256); `org_features`; billing references | New |
| API | `POST /support-reports` accepts screenshots (multipart, ≤ 3 × 5 MB); `POST /support-reports/:id/screenshots/check`; `POST /support-reports/:id/ai-draft`; platform routes for providers, assistants, reviews, findings, reports, organisation features, deployments | New / changed |
| Storage | R2 `iqms-support-<env>`, 12-month lifecycle after closing, malware scan before viewing | New |
| Security | secrets in the vault only; second-admin approval for AI settings and scan schedules; AI never gets workspace DB access | New |
| Privacy and legal | Privacy Notice, Subprocessors (Anthropic for AI support) and AI Features Addendum updated in this pull request; legal review before release | Changed |
| Tests | screenshot rules, required-screenshot flow, console navigation and pages | New (this PR adds e2e) |
