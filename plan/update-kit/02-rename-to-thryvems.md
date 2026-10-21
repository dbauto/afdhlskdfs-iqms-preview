# Task 2: Rename the product to ThryveMS

The client chose **ThryveMS** as the product name and brand. It replaces "iQMS" everywhere people read the product name. The logo will be supplied separately.

## Rules

- Spelling is exactly **ThryveMS** (capital T, capital M and S, no space).
- **Rename what people read:** UI text, page titles, the sign-in page, emails and notifications text, the legal documents, policies, README and the plan's prose.
- **Don't rename technical identifiers in this task.** They need a separate decision (domains are a business purchase). Leave these unchanged and list them in the pull request:
  - Domains: `iqms.ph`, `platform.iqms.ph`, `*.iqms.ph`, `iqms.example`, `sandbox.iqms.example`
  - The session cookie `__Host-iqms_session`
  - Browser storage keys `iqms.*` (`iqms.viewAs`, `iqms.brand`, `iqms.sidebar`, `iqms.modules`, `iqms.appearance`, `iqms.lastPage`)
  - Bucket and resource names (`iqms-exports`, `iqms-brand`)
  - The repository name and the file names `plan/iQMS-Consolidated-Backend-Plan-v3.md` and `policies/PIA-iQMS.md` (other files link to them)
- Don't change the client's own branding (Settings › Branding, `brand.logo` in the sidebar). That is each client company's logo, not the product's.
- Leave `plan/reference/` alone (superseded documents kept for traceability).
- Don't edit `index.html` or `docs/index.html` by hand.

## Where the name appears

About 260 mentions in total. Most are in:

| Place | Notes |
|---|---|
| `app/src/pages/settings/` (15 files) | Settings text |
| `app/src/legal/` (`*.md` and `index.ts`) | Terms, Privacy Notice, DPA, Subprocessors, Security, Acceptable Use, Cookies, Service Levels, AI Addendum |
| `policies/` (13 files) | POL-01 to POL-15 and the Privacy Impact Assessment |
| `app/src/pages/auth/` | Sign-in pages. `auth-layout.tsx` shows the product mark and "iQMS for ISO 9001:2026" |
| `app/src/pages/platform/` | Platform console |
| `app/src/data/`, `app/src/components/app/`, `app/index.html` (`<title>`) | Sample data, building blocks, page title |
| `README.md`, `AGENTS.md`, `plan/iQMS-Consolidated-Backend-Plan-v3.md`, `plan/REVIEW_v2.1.md` | Prose only, not file names |

Find them with: `grep -rn "iQMS" --include=*.ts --include=*.tsx --include=*.md --include=*.html . | grep -v node_modules | grep -v "plan/reference"`

## Logo

- Add a product mark component, e.g. `app/src/components/app/product-mark.tsx`, used on the sign-in pages and in the platform console. Until the logo file arrives, render the text "ThryveMS" in the existing style.
- Expect the logo as an SVG at `app/public/thryvems-logo.svg` (plus `app/public/favicon.svg`). Make the mark use it when the file exists, with `alt="ThryveMS"`. It must work in light and dark appearance.

## Legal documents

The service name changes in Terms, DPA and the Privacy Notice. **Don't change version numbers or effective dates, and don't trigger re-acceptance.** In the pull request, flag that the legal pack needs review by Danica before release: a name change may need a new version (plan §12: new versions require fresh acceptance by an Owner). Keep the operator's legal entity names unchanged.

## Done when
- No "iQMS" remains in what people read, apart from the identifiers listed above.
- The sign-in page and the browser tab say ThryveMS.
- Check passes, and `plan/progress.md` is updated, including the list of identifiers left for a later decision.
