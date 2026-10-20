# ADR-032: One access rule everywhere, safe renames, and handing over work on deactivation

21 October 2026. Danica asked for a full user experience audit and approved fixing what it found (items 1–6, and Settings S1–S4 in `claude/review-ux-audit-2026-10-21.md`).

## Decision

**One classification rule.** Lists, counts, search, figures, links and record pages use the same check (plan v3 §9), in `lib/classification.ts`:
- **Public and Internal:** everyone in the workspace.
- **Confidential:**
  - named viewers;
  - the owner (for evidence, the person who added it);
  - reviewers and approvers on its route;
  - roles with **Can open Confidential records** (the preview's form of `classification.confidential.read`).
- **Consultants:** Confidential only when named (D18).
- **Highly confidential:** named viewers and the owner only; never consultants.

The grant is a switch in the role editor. It's on by default for quality manager, administrator and top management, and off for the other built-in roles. Before this, lists showed Confidential records to every role except consultants, while record pages allowed only the owner and named viewers. People saw rows they couldn't open, and confidential titles leaked into lists and search.

**Sections are checked on every page, not only in the menu.** A role with None for a section gets "not found" by direct link too. Before this, the Management Review register opened for contributors, viewers and guest auditors.

**Links never lead to "not found".** A record the person can't open shows only its number and "not available to you", with no link and no title. This covers:
- supporting records;
- links between records;
- action and evidence links.

**Access levels add up for documents, as the roles page says.** Approve includes Add and edit, so process owners and top management can revise their own documents. Before this, the document rules allowed editing only at Add and edit or Manage.

**New risks and nonconformities never default to a hidden process.** The form starts on the first process the person can see. The owner follows the process until someone picks an owner, and the risk source starts empty.

**Renames reach every record.** Records point to people and processes by name in the preview. A rename now updates every place the exact old name is stored, and refuses a name that's already used. The backend uses membership and process IDs, so a rename there is one update.

**A process in use can't be deleted.** "In use" means any document, risk, nonconformity, audit, objective or evidence uses it.

**Deactivating someone hands over their open work.** The dialog lists everything they own or are waiting on:
- processes, documents, document review or approval steps;
- nonconformities as owner or verifier;
- risks, objectives, review actions;
- management reviews as preparer or reviewer;
- certification tasks.

The administrator gives everything to one person or chooses per item, and deactivation waits until every item has someone. New owners are notified. Past work, sign-offs and history keep the original name. Open audit questionnaires are pointed out for the audit lead to reassign.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence or production authorization. No deployment is authorized by this decision.
