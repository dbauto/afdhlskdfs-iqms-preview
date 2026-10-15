# ThryveMS web

The ThryveMS front end: an ISO 9001 quality management system for Philippine businesses.
React, TypeScript, Tailwind CSS v4 and shadcn/ui (Radix). Every page is clickable with sample
data and no backend yet. Adding, editing and deleting work, and are kept in your browser (see
"Preview data" below).

## Just want to look at it?

Open the live preview: **https://dbauto.github.io/afdhlskdfs-iqms-preview/**

It is the whole app in one page (`index.html` at the top of this repo), with sample data, for
checking the design before backend work. You can also download that file and double-click it.

The source code is in **`app/`**.

## Run it

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run build:hash # same, with hash routing (#/path) for a single-page host such as GitHub Pages
npm run typecheck  # TypeScript check
```

Node 20 or newer.

## Where to start

| Page | Path |
| --- | --- |
| Sign in, password reset, Cloudflare check | `/sign-in` |
| Microsoft 365 sign-in outcomes (prototype) | `/sign-in/microsoft` |
| Request access | `/request-access` |
| Overview | `/` |
| QMS: Organization & Scope, Policies, Processes, Objectives & KPIs | `/qms/...` |
| Documents register, reviews, a record | `/documents`, `/documents/reviews`, `/documents/OPS-WI-014` |
| Objectives & KPIs, an objective with results by period | `/qms/objectives`, `/qms/objectives/OBJ-2026-04` |
| Context issue, interested party | `/qms/organization/issues/ci-2`, `/qms/organization/parties/ip-3` |
| Risks & Opportunities, a risk | `/risks`, `/risks/R-031` |
| Evidence, an evidence item | `/evidence`, `/evidence/EV-0206` |
| Audits, a report, the checklist workspace, templates | `/audits`, `/audits/IA-2026-06`, `/audits/IA-2026-05/checklist`, `/audits/templates` |
| Management Review, a review, a review action | `/management-review`, `/management-review/MR-2026-02`, `/management-review/actions/RA-04` |
| Corrective Action, a nonconformity | `/corrective-action`, `/corrective-action/NC-2026-005` |
| Settings (client admin) | `/settings` |
| Platform admin console (your team) | `/platform` |

**See it as different people.** The menu under your name has *Prototype: view as*. Switch between
Maria Santos (Quality manager), Aaron Lim (Administrator), Joy Aquino (Process owner),
Kim Dela Cruz (Auditor) and Elena Cruz (Guest auditor). The menu, buttons and Settings pages change
with each role. Remove this switcher when real sign-in is connected.

## Preview data

Changes you make in the preview are saved in this browser (`localStorage`, key `thryvems.preview.v1`),
so a record opened in a new tab shows the same data, and open tabs stay in step. This is for the
preview only:

- the data lives in one browser on one device and isn’t shared with anyone else;
- it isn’t secure, and anyone using the browser can read or change it;
- access checks and figures are worked out in the browser and only imitate the server rules in
  plan v3 §9 and §22.

**Settings › About › Reset sample data** puts the original sample records back in every open tab.
The person chosen in *View as* is also kept in the browser, so a new tab opens as the same person.

## How the code is organised

```
app/src/
  index.css            design tokens (colours, radii, type) for Tailwind v4 and shadcn
  App.tsx              all routes
  lib/store.tsx        data store (saved in the browser for the preview), permissions (can), sidebar state
  lib/periods.ts       ISO dates and reporting periods (months, quarters, review periods)
  lib/record-links.ts  recordHref(kind, id): the page of every record kind
  data/                sample data and types
  components/ui/       shadcn-style primitives (button, badge, dialog, sheet, dropdown-menu, tabs, ...)
  components/app/      ThryveMS building blocks
    app-shell.tsx      sidebar + top bar + mobile menu
    sidebar.tsx        the client's menu, collapsible to icons
    data-table.tsx     register table: 10 rows in view, scrolls inside, 10/50/100 rows per page
    page.tsx           page header, figure cards (style B), lifecycle track, view chips, key facts
    status.tsx         stage and status badges
    record-actions.tsx row menu and ISO-aware delete / withdraw / archive
    form.tsx           field layout, chip choice, people picker (several people)
    record-link.tsx    RecordLink (a record in a new tab) and OutsideLink (https:// only)
  pages/               one folder per menu area, plus auth, settings and platform
```

## Rules the UI follows

- **Menu wording** matches the client’s menu exactly, in the same order.
- **One primary button per page.** Everything else is outline, ghost or a link.
- **Status colours mean status only:** green done, indigo in progress, amber due soon, red overdue, grey draft.
- **Removing records follows ISO 9001:** drafts are deleted, records in a workflow are withdrawn,
  published or closed records are archived. See `components/app/record-actions.tsx`.
- **Classification:** Public, Internal, Confidential, Highly confidential. Confidential records keep a
  link and a description only, never the file, and show a warning about SharePoint sharing.
- **Several people per step:** reviews and approvals (everyone, any one, one after another), tasks
  (one accountable plus helpers), audit reports (editors and readers).
- **Permissions:** each role has a level per menu area (None, View, Add and edit, Approve, Manage).
  `can(area, level)` in `lib/store.tsx` hides menu items and buttons. **The backend must enforce the
  same rules**; the UI only reflects them.

## Connecting the backend

Replace `lib/store.tsx` with API calls (TanStack Query works well) and keep the same function
names in the pages. Search the code for these to find the places that need a real service:

| What | Where | Notes |
| --- | --- | --- |
| Microsoft 365 sign-in | `pages/auth/sign-in.tsx`, `pages/auth/microsoft.tsx` | Microsoft Entra ID with OpenID Connect. Use MSAL (`@azure/msal-browser`, `@azure/msal-react`) or Auth.js. Multi-tenant app; map the `tid` claim to an organisation. Ask only for `openid profile email`. |
| Email and password | `pages/auth/sign-in.tsx` | Hash with Argon2id or bcrypt. Reset links single-use, 30 minutes. Same message whether or not the email exists. |
| Human check | `HumanCheck` in `pages/auth/auth-layout.tsx` | Replace the placeholder with Cloudflare Turnstile (`@marsidev/react-turnstile`) and verify the token on the server. |
| Access requests | `pages/auth/request-access.tsx`, `pages/settings/users.tsx`, `pages/platform/requests.tsx` | Goes to the client admin; only escalations go to the platform team. |
| Support access | `pages/settings/users.tsx` (Activity log tab), `pages/platform/support.tsx` | Time-limited, granted by the client admin, every view logged. |
| Document links | `pages/documents/doc-sheet.tsx` | Store link and description. Never fetch confidential files. |
| Logs | `pages/platform/logs.tsx` | Log record IDs only, never descriptions or content. |

## Not real yet

- Prices, invoices, hosting region, subprocessors and data protection officer details are placeholders.
- The Microsoft screens are a prototype of the outcomes. Microsoft shows its own sign-in page.
- Exports, emails and file uploads only show a confirmation.

## Libraries

shadcn/ui component patterns (new-york style), Radix UI primitives, lucide icons, sonner toasts,
React Router, Tailwind CSS v4, class-variance-authority, tailwind-merge. All open source (MIT or ISC).
