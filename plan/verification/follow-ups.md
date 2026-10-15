# Record-driven figures and single-file preview

Starting main: c0f9a1c1bf2d8f0eaae8c8a24e890d7e89bdb8f5 (PR #9 merged).

The shared record-figures helper filters classification before aggregating scoped store records. Evidence and active document clause links feed the same coverage on Overview, Evidence, Readiness and Processes. Leaf requirements avoid double counting parent headings. A parent link supports its child clauses. Current linked references do not establish ISO conformity. Empty sources show No data. Process weekly health comes from dated NC, audit and KPI records; no invented earlier green history. Objective-period selection is shared with management review.

Verified synthetic identities:

| Figure | Ben Castillo (Operations) | Maria Santos (all processes) |
|---|---:|---:|
| Evidence items | 2 | 15 |
| Evidence coverage | 7% (4/59) | 56% (33/59) |
| Requirements with no linked references | 54 | 22 |
| Evidence older than 12 months | 0 | 2 |
| Open nonconformities | 1 | 7 |
| Documents in review | 1 | 7 |
| Personal overdue work | No data | 8 |
| Next visible audit | 21 Oct 2026 | 21 Oct 2026 |

Evidence added for clause 7.4 immediately changes coverage and survives reload. Ben cannot see the Purchasing evidence or attention item. Restricted-only evidence yields No data and no hidden counts in a calculation test.

Build: `npm run build:preview` writes exactly one dist/index.html and copies it to both preview locations. It embeds code, CSS, fonts, favicon and product mark. `verify:preview` opens it from disk and under the Pages subpath, follows an objective deep link in a new tab, and asserts no external dependencies or page errors. No hosting settings or production configuration changed.

Browser checks include 390, 768 and 1440 px for Overview, Evidence, Readiness and Processes. Screenshots captured at each size. A visual check caught clipped mobile clause badges; badges now wrap below the clause description.

Final validation: `npm install`, TypeScript, production build, single-file build and both preview delivery checks passed. `npm run e2e`: **7 passed (1.4m)**, including management review A–G, navigation, classification/no-data, record-driven figures and all three responsive sizes. Generated HTML is verified as one file and copied automatically.
