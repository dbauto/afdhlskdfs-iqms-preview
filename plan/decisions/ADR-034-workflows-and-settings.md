# ADR-034: Improvements, customer complaints, document review and settings that take effect

21 October 2026. Danica's decisions on the UX audit (`claude/review-ux-audit-2026-10-21.md`):
- build improvements and customer complaints properly (item 7);
- allow "reviewed, no change" for documents (item 8);
- let people choose the nonconformity verifier, with a default (item 9);
- fix the settings found not to save or not to take effect (S5–S8).

## Decision

**Corrective Action page**
- **Corrective actions** are the tasks planned on nonconformities. They're no longer a separate fixed list.
- **Improvements** (clause 10.3) are records with an owner, process, source, target date and benefit. They move Proposed → Planned → In progress → Done (with what they achieved) or Not going ahead (with the reason).
- **Customer complaints** (clauses 8.2.1, 9.1.2) are records with:
  - customer, reference, owner and process;
  - received and respond-by dates.

  They move New → Investigating → Responded (with the response) → Closed, recording whether the customer accepted the response. A nonconformity can be raised from a complaint; it's prefilled and linked back.
- The page figures are worked out from these records.
- Owners see improvements and complaints in My tasks, and the deactivation handover includes them.

**Documents**
- People who can revise a published document can record **Reviewed, no change**. It needs a note of what was checked, sets the next review from the document's interval, and is kept in the document's history.
- Publishing a revision now restarts the review clock. Before, a re-published document stayed overdue.
- The review interval is saved on each document, and the default comes from Settings › Review and approval.

**Nonconformities**
- The **verifier** is chosen when raising or editing. The default is an active quality manager who isn't the owner, otherwise the person raising it. The verifier can't be the owner.
- Verification records its date. **Close as effective** waits until the QMS rules' effectiveness period has passed since verification.

**Settings**
- These now save, survive a reload and take effect:
  - organization profile, which also sets the company name across the app;
  - document numbering, which sets new document numbers;
  - record retention and sign-in and security;
  - integrations (connections apply at once);
  - review and approval: approval mode, reminders, keeping the previous revision visible, and the review interval;
  - QMS rules and review routes;
  - invitations;
  - notification preferences per person. `notify` skips kinds the person turned off.
- Billing details are managed by the ThryveMS team, so the page asks for a change instead of pretending to save one.
- **Data export** downloads CSV (one file per register) or JSON, built from only what the person can see. Excel and PDF are made by the live service. Exports expire after 24 hours (D13).
- **All QMS rules apply:**
  - risk review intervals by rating (Mark reviewed today, and new risks);
  - containment and action days (My tasks and new nonconformities);
  - the effectiveness wait;
  - audit frequency (the programme's coverage figure);
  - the KPI period (the default for new objectives).
- **Inviting a process owner or contributor** asks which processes they'll work in.

**Smaller fixes**
- My tasks opens a certification task straight to its item, and a remark on a risk opens the risk.
- Overview formats the next audit date.
- The "only administrators" settings notice has a heading.
- The QMS rules number fields have labels.
- Sample people have unique names.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence or production authorization. No deployment is authorized by this decision.
