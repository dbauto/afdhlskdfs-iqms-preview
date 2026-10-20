# ADR-029: Management review records what top management actually reviewed

20 October 2026. Danica asked for the management review flow to be reviewed end to end and approved the fixes. The review found that Finish and lock could skip the pack and top management's evaluation, froze recalculated figures rather than those sent, treated one signature as final, and allowed only text amendments.

## Decision

- **Order is enforced.** Record the review (Finish and lock) is available only after the pack is sent. Without a meeting, at least one evaluation by top management is required. Open clarification questions must be answered first.
- **The lock freezes what was reviewed.** Locked figures are the pack snapshot. The live value at lock is kept beside it only when it differs, and shown as such.
- **Changes after sending are visible.** Analysis or applicability changed after the pack was sent is flagged with its time on the input and in the pack, and top management is notified.
- **Every reviewer signs.** The record is final only when every top management reviewer has signed, in ThryveMS or on a linked signed record that names who signed. A reviewer can request changes with a reason; sign-off waits until an amendment answers it.
- **Amendments change the record.** An amendment is a note, an action's wording/owner/due date, or the conclusion summary, with before and after, reason, author and time. Changing the conclusion invalidates earlier signatures so top management signs again. The locked figures and supporting records never change.
- **Access is checked when choosing people.** Top management, pack recipients, contributors, hand-over and action owners are chosen only from people with Management Review access. Notifications link to the exact action.
- **Actions.** A due date is required. Overdue is computed from the due date. Marking done needs completion evidence or a reason. A review can close once all actions are done or a later review exists to carry them in input a.
- **Smaller fixes.** The Record page saves a draft. New reviews start as Planned. Default top management comes from the Top management role. Nonconformities raised from decisions use the current year and the source record's process. The schedule tile compares the last review with the configured interval.

## Boundary

This changes the synthetic browser-local preview and the matching specification text (plan v3 management review steps 2–7). It adds no server persistence or production authorization. No deployment is authorized by this decision.
