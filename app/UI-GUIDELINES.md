# ThryveMS UI guidelines (binding)

These rules keep the front end looking and behaving as one product. They apply to every change in `app/`, including redesigns. `AGENTS.md` points here; if a task or kit asks for something that breaks a rule below, follow this file and say so in the pull request.

**The existing UI is the reference.** Before changing a screen, open the closest existing screen and copy its structure, components and spacing. Improve within this system; never introduce a second one.

---

## 1. Never change without written approval from Danica

- The **sidebar menu**: items, order, names (`components/app/nav.ts`, `sidebar.tsx`). No new top-level items. New pages go under an existing area.
- **Design tokens** in `app/src/index.css` (colours, radius 8px, fonts). Don't add colours, don't use raw hex or Tailwind palette colours (`teal-600`, `blue-500`, `gray-*`) in components. Use the tokens: `primary`, `foreground`, `muted-foreground`, `background`, `card`, `border`, `rule-soft`, `input`, `hover`, `highlight`, and the status tokens below.
- **Typeface** (Public Sans) and the type scale in section 4.
- **Card style B** for figures (`FigureCard` / `FigureGrid` in `components/app/page.tsx`): icon tile, status badge, big value, small label.
- **Wording already on screen.** Keep existing labels, button names and messages unless the task is to change that text.
- The client's **white-label branding** (Settings › Branding) and the ThryveMS **product mark** are separate. Don't mix them.

## 2. Use the existing building blocks

| Need | Use | Don't |
|---|---|---|
| Page title, breadcrumbs, actions | `PageHeader`, `MetaLine` | Custom headers |
| Record page (main + side column) | `RecordLayout` (main + 340px side) | New grid layouts per page |
| Figures at the top of a list page | `FigureGrid` (max 4 cards) | Hand-made stat tiles |
| Lists of records | `DataTable` (10 rows in view, internal scroll, rows-per-page footer 10/50/100) | Plain `<table>` or new table components |
| Short lists inside a card | `ScrollList` (4 rows, then scrolls, with footer) | Cards that grow without limit |
| Key/value facts | `KeyFacts` | Ad-hoc definition lists |
| Progress of a record | `LifecycleTrack`, `MiniTrack` | Custom steppers |
| Status | `Badge` with a status tone, `StateBadge`, `NcStage`, `RiskLevel`, `ClassificationTag` | Coloured text or new pill styles |
| Filters above a table | `ViewChips` | Dropdown filters for 2–6 views |
| Empty states | `EmptyState` (page) or `EmptyLine` (inside a card) | Blank areas, "No data" alone |
| "Your turn" callout | `YourStep` | Custom banners |
| Messages | `Alert` (info, warning, danger), `toast` (sonner) for confirmations | `window.alert`, custom toasts |
| Forms | `Field`, `Input`, `Textarea`, `NativeSelect`, `Checkbox`, `ChipChoice`, `PeoplePicker`, `ProcessPicker`, `ClausePicker`, `EvidencePicker`, `RecordPicker` | Unlabelled inputs, placeholder-as-label |
| Add/edit a record | `Sheet` (side panel) | Full-page forms for simple records |
| Confirm, short choice | `Dialog` / `AlertDialog`; delete, withdraw, archive via `ConfirmRemove` / `RowActions` | Nested dialogs (never open a dialog from a dialog) |
| Links to records | `RecordLink` (new tab only from review/audit workspaces; `newTab={false}` elsewhere), `OutsideLink` (https only) | Raw `<a href>` to outside URLs |
| Evidence on a record | `LinkedEvidence`, `SupportingRecords` | New evidence widgets |
| Remarks | `RemarkBanner`, `RemarksPanel`, `RemarkMarker` | — |

If something truly isn't covered, build it in `components/app/` from the `components/ui/` primitives, in the same style, and use it everywhere it applies.

## 3. Layout

- Page content is a vertical stack with `gap-6` between sections; inside cards, `px-5 py-3`/`py-4` rows separated by `border-t border-rule-soft`.
- Card header: `CardHeader` with `CardTitle` on the left and a short muted note or one action on the right.
- **One primary button per page**, top right in `PageHeader`. Everything else is `outline`, `ghost`, `quiet` or a link.
- Don't overcrowd: use progressive disclosure (collapsed sections, tabs, a side panel) rather than showing every control at once.
- No horizontal page scroll at any width. Wide tables scroll inside `DataTable`.
- **Responsive without overriding the user's display scaling.** Never set `zoom`, fixed root font sizes or `transform: scale`. Use container queries (`@container`) where a block sits in columns of varying width, and the `short:` variant for low-height laptop screens.
- The sidebar collapses to icons; the mobile menu replaces it below 768px. Don't change this behaviour.
- Scrollbars appear while scrolling and fade after 300ms (`lib/scrollbars.ts`). Don't style scrollbars elsewhere.

## 4. Typography

| Use | Class |
|---|---|
| Page title | `text-[1.75rem] font-semibold` (in `PageHeader`) |
| Section heading | `text-[0.9375rem] font-semibold` |
| Card title | `CardTitle` |
| Body | `text-sm` |
| Secondary, labels in rows | `text-[0.8125rem] text-muted-foreground` |
| Meta, timestamps | `text-xs text-muted-foreground` |
| Big figure | `text-[1.75rem] font-semibold tracking-[-0.02em]` |

No new sizes. No all-caps labels. No italics for emphasis.

## 5. Colour means status only

- Green `done` = done or on target. Indigo `progress` = in progress. Amber `soon` = due soon or needs a look. Red `overdue` = overdue, below target, failed. Grey `draft` = draft, not started, no data.
- Use these through `Badge tone` and the `*-tint`, `*-border` tokens. Don't use colour for decoration.
- Primary (indigo) is for actions and links, not for status.
- Check both **light and dark** appearance (Settings › Appearance) for every changed screen.

## 6. Wording

- Plain language, sentence case, short sentences. Write for a quality manager in a Philippine SME, not for an auditor or developer.
- Buttons say exactly what happens: "Save analysis", "Send review pack", "Issue report". The toast repeats the action: "Analysis saved".
- Errors say what's wrong and how to fix it, in one sentence: "Paste a full https:// link, for example from SharePoint’s Copy link." No "Error:", no apologies, no codes.
- Empty states say what goes here and how to add it.
- Clients never see the consultant's name: use `useAuthorName()` ("Your consultant").
- Missing data is **"No data"**, never 0. Never show "N hidden" or anything that reveals records a person can't see.
- The product is **ThryveMS**. Use `ISO_EDITION` (ISO 9001:2026); never print "2015".
- Dates: "4 Nov 2026" (use `formatDate` / `formatPeriod` from `lib/periods.ts`). Periods: "1 July 2026 – 30 September 2026".

## 7. Behaviour that must be preserved

- **Access:** pages read `useStore().state` (already filtered by process access) and check `can(area, level)` and `canSee(classification, viewers)`. A record a person can't see shows the existing `NotFound`, except a Public or Internal document or evidence item outside their processes, which shows `NoAccess` (number only, Request access; ADR-037). Never weaken this to make a screen work.
- **Uploads:** only for Public and Internal documents and evidence (`lib/uploads.ts`: 25 MB, no videos or .exe; evidence in folders through `FileTree`), plus Settings › Branding and the profile photo. Confidential and Highly confidential records stay links only. No other upload controls.
- Every table: 10 rows in view, internal scroll, rows-per-page footer.
- Everything a person can add, they can edit and delete (or withdraw or archive, per `record-actions.tsx`). Several people can be assigned where a task has helpers.
- Classifications are exactly Public, Internal, Confidential, Highly confidential.
- Notifications through `notify()`, one per event.
- Unsaved typed text: warn before leaving (pattern in `pages/review/detail.tsx`).
- Double-submit guard on every submit button.
- Preview data persists in `localStorage` (`thryvems.preview.v1`); new collections must be added to `initial` and migrated in `lib/store.tsx`.

## 8. Accessibility

- Every input has a visible label (`Field`), every icon-only button an `aria-label`.
- Visible keyboard focus (don't remove outlines). Tab order follows the visual order.
- Text contrast at least 4.5:1 in both appearances. Never rely on colour alone: badges carry words.
- Touch targets at least 32px high on mobile (36px for primary actions).

## 9. Redesigning a screen

A redesign is allowed only when the task asks for it. Then:

1. Write in the pull request what is wrong with the current screen and what changes. Keep everything not mentioned.
2. Keep the route, the data it shows, the actions and their names, and the permission checks.
3. Rebuild with the blocks in section 2. No new design language, no gradients, no shadows beyond the existing `Card`, no illustrations or decorative icons.

## 10. Checks before a UI pull request is ready

- [ ] `npm run typecheck`, `npm run build`, `npm run e2e` pass.
- [ ] No raw hex or Tailwind palette colours added: `git diff main -- app/src | grep -E "#[0-9a-fA-F]{3,6}|(red|blue|green|teal|gray|slate|zinc|amber|emerald|indigo)-[0-9]{2,3}"` returns nothing.
- [ ] No new top-level menu item; `nav.ts` unchanged unless approved.
- [ ] No horizontal scroll at 390, 768, 1280 and 1920 px.
- [ ] Light and dark checked.
- [ ] Wording follows section 6; no "iQMS", no "2015", no "N hidden".
- [ ] Access checked with View as for a wide and a narrow role.
- [ ] `plan/progress.md` updated.
