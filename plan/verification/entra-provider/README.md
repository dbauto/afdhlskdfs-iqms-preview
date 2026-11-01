# ADR-047 UI-GUIDELINES §10 checklist

Console › Settings › Sign-in providers. Screenshots taken from the built preview (`docs/index.html`) with Playwright, 1 Nov 2026.

- [x] `npm run typecheck`, `npm run build` (build:preview), `npm run e2e`: passed in CI on the branch (154 passed), then the GitHub Check workflow on the PR head.
- [x] No raw hex or Tailwind palette colours added (`git diff main -- app/src | grep …` returns nothing).
- [x] No new top-level menu item; console menu (`pages/platform/shell.tsx`) and `nav.ts` unchanged.
- [x] No horizontal scroll at 390, 768, 1280 and 1920 px (measured `scrollWidth - clientWidth = 0` for all 16 captures).
- [x] Light and dark checked (`*-light-*.png`, `*-dark-*.png`).
- [x] Wording follows section 6: sentence case, plain language; no "iQMS", no "2015", no "N hidden".
- [x] Access checked with View as for a wide role (Danica, Developer: `wide-*`) and a narrow role (Ria Gomez, Admin support: `narrow-*`). Both see the same read-only card; there is nothing to change.
- [x] `plan/progress.md` updated (last commit, after checks).

Before and after: `before-settings-1280.png`, `after-settings-1280.png`.
Every capture shows Microsoft Entra ID "Not configured" for all three environments and WorkOS "Available"; none shows Connected.
