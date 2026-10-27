# ADR-039: Console Finance page, AI support on/off switch, alerts to Facebook Messenger

27 October 2026. Requested by Danica after ADR-038 merged: (1) a Finance view in the console; (2) a button in Support to turn AI support on and off; (3) error alerts to her through Facebook Messenger using an API key.

## 1. Finance (console menu › Finance)
- Figures: invoiced this month (before VAT), profit and margin, not yet paid (incl. VAT, with overdue count), output VAT 12% to report.
- Revenue, costs and profit by month with the margin; costs this month by provider; invoices table (amount, VAT, total, due, state, reminder for unpaid ones).
- "Create report for accountant" exports invoices, payments, costs, profit and VAT for the month.
- Sample figures in the preview. Production reads the billing system and provider invoices; it never reads client QMS records. Provider invoices in US$ remain the accounting record; pesos use the BSP reference rate.

## 2. AI support switch
- A platform-wide switch at the top of Support reports and on the AI support card in AI assistants.
- Off: no new AI drafts for any organisation; staff write replies. On: AI support drafts for organisations that turned it on (ADR-038 rules unchanged: screenshots checked first, a person sends every reply).
- Production: platform setting, changed by a platform admin, logged; takes effect on the next report.

## 3. Alerts to Facebook Messenger
- Console › Settings: Page access token (stored in the secret vault, shown as last four), Facebook Page ID, the admin's Messenger ID for that Page (PSID), and which events send a message: critical errors (always on), error monitor reports, "I can't work" support reports, overdue security findings, overdue invoices. "Send test message".
- Sent through the Messenger Send API from the platform scheduler. Messages carry reference numbers, organisation names and severity only, never client records, report text or screenshots.
- Meta allows a Page to message a person only within 24 hours of their last message unless the app is approved for a message tag. Email and phone alerts stay the guaranteed channel; Messenger is in addition.
- Meta isn't a subprocessor of client personal data under this design (no client records or report text sent). Recorded in the operator's internal supplier list.

## Backend impact (Pending)
| Area | Change | Status |
|---|---|---|
| Platform DB | `billing_invoices` view from the billing system, `provider_costs`, `platform_settings.ai_support_enabled`, `alert_channels` (type messenger, secret reference, page id, recipient id, events), `alert_deliveries` log | New |
| API | `GET /platform/finance`, `POST /platform/finance/report`, `PUT /platform/settings/ai-support`, `PUT/POST /platform/alerts/messenger` (+ test) | New |
| Jobs | scheduler sends Messenger alerts with retry and 24-hour-window handling; falls back to email | New |
| Security | token in vault only; outbound host allow-list graph.facebook.com; alert payload allow-list (no record text) | New |
| Tests | e2e for Finance, switch and Messenger form (this PR) | New |
