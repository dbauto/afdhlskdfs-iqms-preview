# Task 1: Groundwork

Management review needs four things the app doesn't have yet. Each is useful on its own, so land them first in one pull request (`mr/1-groundwork`).

## 1.1 A page for every record that review links to

The brief says each supporting record opens **its own page in a new tab**. Several records have only a list page today:

| Record | Today | Add |
|---|---|---|
| Objective / KPI | `/qms/objectives` (list) | `/qms/objectives/:id`: target, results by period, owner, process, evidence |
| Risk / opportunity | `/risks` (register; edit in a sheet) | `/risks/:id` |
| Evidence item | `/evidence` (list) | `/evidence/:id`: files and links, clauses, processes, "Used on" |
| Context issue, interested party | `/qms/organization` (tabs) | `/qms/organization/issues/:id` and `/qms/organization/parties/:id`, or one page per item using the existing tab layout |
| Review action | Table on `/management-review` | `/management-review/actions/:id` (or open the review with the action highlighted) |

These already have pages: documents `/documents/:id`, audits `/audits/:id`, nonconformities and corrective actions `/corrective-action/:id`, reviews `/management-review/:id`, processes `/qms/processes/:id`.

Rules for the new pages:
- Use the existing page building blocks (`PageHeader`, `RecordLayout`, `KeyFacts`, `Card`). Look at `app/src/pages/documents/detail.tsx` and `app/src/pages/improvement/detail.tsx` for the pattern.
- Read from `useStore().state`. It is already filtered by process access (D22), and classification is checked with `canSee`. A record the person can't see, or that doesn't exist, shows the existing `NotFound` page. Don't reveal whether a hidden record exists.
- Make the list rows link to the new pages. Keep the existing edit sheets.

## 1.2 One way to link to a record

Add `app/src/lib/record-links.ts` with `recordHref(kind, id)`. It returns the route for each record kind (document, objective, risk, evidence, audit, nonconformity, review, review action, process, issue, party). Add a small `RecordLink` component that:
- Opens internal records in a **new tab**, with `target="_blank" rel="noopener noreferrer"`, an external-link icon and an accessible label ("Open OBJ-2026-01 On-time delivery in a new tab").
- Opens SharePoint, OneDrive and other `https://` links in a new tab, with the same safe attributes. Only `https://` is accepted. Other schemes are shown as text with "Link not valid", never as a link.
- Builds internal URLs with React Router's `useHref`, so they work under any base path.

## 1.3 New tabs must work in the published preview

The app uses `BrowserRouter` with no base path (`app/src/main.tsx`). The GitHub Pages preview is a single `index.html` under `/afdhlskdfs-iqms-preview/` with no fallback for deep links, so a link opened in a new tab can land on a 404. Make deep links work there:
- either the preview build uses `HashRouter` (selected at build time, e.g. `import.meta.env.VITE_ROUTER === "hash"`),
- or add a `404.html` that redirects to `index.html` and restores the path.

Coordinate with the other kit's task 4.2 (preview build script). If that script already exists, extend it; don't add a second one.

## 1.4 Data the new tab can see

The store is in memory (`app/src/lib/store.tsx`). A new tab starts a fresh app, so a record added in the first tab is missing in the second, and so is a review being prepared. For the preview only:
- Save the store's collections to `localStorage` under one versioned key (e.g. `thryvems.preview.v1`). Load them on start, and listen for the `storage` event so open tabs stay in step. Wrap every read and write in `try/catch`, and fall back to the sample data if storage is empty, blocked or from an older version.
- Add "Reset sample data" in Settings › About (preview only).
- **"View as" is already shared between tabs**, because it is stored in `localStorage` (`iqms.viewAs`). Keep it that way, so a new tab opens as the same person.
- State the limit in `README.md`: preview data lives in one browser only. It isn't shared between people, isn't secure, and doesn't reflect server-side access control.

If the other kit's audit work (task 3) already added persistence, reuse it.

## 1.5 Real dates and reporting periods

Dates in sample data are display strings ("11 Oct", "Today", "30 Nov"), so nothing can be filtered by period. Objective results are an unlabelled array (`Objective.values`).
- Add machine dates (ISO `YYYY-MM-DD`) beside the display strings for the records review needs: nonconformities (raised, closed, due), audits (held, report issued), risks (last reviewed, next review), review actions (due, done), evidence (added), context issues and interested parties (last changed). Keep the existing display fields working, or derive them from the ISO date.
- Give objective results periods, as plan §17 describes. Each result records its period (`2026-07`, or `2026-Q3` for quarterly), value, date entered and evidence. Missing is "No data", never zero. Keep the Objectives page working.
- Add `app/src/lib/periods.ts` with helpers. You need to define a period by start and end date, test whether a date or result period falls in it, and format it ("1 July 2026 – 30 September 2026").

## Done when

- Every record kind in 1.1 has its own page, and the list pages link to them.
- `RecordLink` opens records in a new tab in `npm run dev` and in the built preview, and a link to a hidden or missing record shows Not found.
- A record added in one tab appears in a new tab.
- Records used by review have ISO dates, and objective results have periods.
- Check passes, and `plan/progress.md` is updated.
