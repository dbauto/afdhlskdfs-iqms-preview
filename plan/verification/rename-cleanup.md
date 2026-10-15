# PR #9 rename verification

Starting head: `ee3ee4aff1b6769057e070ad911fea0c7449dbf0`.

- Product-name scan: only retained technical filenames and the legacy `"In iQMS"` storage enum remain. No visible legacy product label.
- Badge scan: no `>iQ<` remains.
- Broken-reference scan: no missing renamed plan or PIA references.
- `npm install`: passed (144 packages); committed lockfile makes this reproducible.
- `npm run typecheck`: passed.
- `npm run build`: passed (1,905 modules). Vite's existing large-chunk advisory remains non-blocking.
- `npm run build:hash`: passed. Fixed relative assets for the Pages subpath.
- `node scripts/verify-branding.mjs`: 8 screen/theme checks passed under `/afdhlskdfs-iqms-preview/`; no page errors or HTTP failures. Sign-in, platform, legal and About captured in Light and Dark appearance. Mark is inline with an accessible name; favicon is a data URI.

The verification script supports `CHROMIUM_PATH` for an installed browser. In this session, the standard Playwright CDN returned HTML instead of a browser archive, so the same Playwright API used packaged Chromium 153. No browser executable is committed.

A navigation regression exposed a pre-existing React effect returning the browser's scroll result. The effect now returns nothing; a navigation regression test covers it.

Legal drafts keep their versions/effective dates. Danica's review of the product-name change and any renewed acceptance remains a production release gate; this work publishes a synthetic preview only.
