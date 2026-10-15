# Task 2: Management review workflow and supporting records

Part A says how the brief maps onto this repository. Part B is the product owner's brief, word for word. **Where they differ, Part A and `AGENTS.md` win**, because they reflect decisions already made in the spec and the code. Do task 1 (groundwork) first.

---

## Part A: notes for this repository

### What exists today

| File | What it does now |
|---|---|
| `app/src/pages/review/list.tsx` | Reviews list, "Plan review" dialog (format, date, reviewers, others, preparer), the actions tracker (`ActionsTable`, `ActionState`) |
| `app/src/pages/review/detail.tsx` | Route `/management-review/:id`. Input list plus a right-hand panel per input (`InputPanel`): live figure, "Note for top management", consultant draft and confirm, hand to someone, comments. Header: Review pack, Send pack, Close review. Sign-off |
| `app/src/pages/review/record.tsx` | Route `/management-review/:id/record`, "Finish and lock". Conclusion (suitable, adequate, effective, aligned), decisions become `reviewActions` (optionally raising an NC), freezes figures, saves the record as evidence (EV-…, clause 9.3) |
| `app/src/pages/review/shared.tsx` | Shared bits |
| `app/src/lib/review-figures.ts` | `liveFigure(ref, state, review)`: one headline per input |
| `app/src/data/reviews.ts` | `REVIEWS` (MR-2026-02 preparing, MR-2026-01 reviewed, MR-2025-01 closed), `REVIEW_ACTIONS`, frozen past figures |
| `app/src/data/types.ts` | `ManagementReviewRecord`, `ReviewInput`, `ReviewComment`, `ReviewAction`, `ReviewStage`, `ReviewFormat`, `Verdict` |

### Problems to fix (all confirmed in the code)

- **The Review pack button shows a fake toast** (`detail.tsx`, around line 250). It says a PDF is being prepared, but nothing is generated. Replace it with a real pack page, `/management-review/:id/pack`, built from the review's data and formatted for printing. Its button is "Open review pack" and it opens in a new tab. Saving as a PDF is done with the browser's print, so don't claim a PDF was made. Send pack stays: it sets `packSentOn` and notifies people with `notify()`.
- **Some figures are wrong in kind:**
  - **c3** counts processes from `PROCESS_FLAG`, a fixed sample table in `app/src/pages/qms/processes.tsx`.
  - **c5** counts objectives and calls them "KPIs measured".
  - **c1 and c7** find an objective by matching its name with a regular expression.
  - **b** counts issues and parties, not changes.
  - **No figure uses a reporting period.** Replace all of them (see the figure engine below).
- **The frozen snapshot is too thin.** `ReviewInput.frozen` holds only `{ value, detail }`. Finish and lock must also keep the period, the calculation method, the source record IDs with their version or `updatedAt`, and the time it was calculated.
- **Input (a) only looks at the previous review.** Open actions from any earlier review that are still open must be included (plan §22: open actions become input a of the next review).

### Stages: keep the spec's lifecycle, show the brief's seven steps

Plan §22 stores four stages: Planned → Preparing → Reviewed → Closed. Keep `ReviewStage` as it is. Work out the brief's seven guided steps from the data and show them as a stepper, with the current step and the next action:

| Guided step | When it is current |
|---|---|
| 1 Plan review | `stage = Planned` |
| 2 Prepare inputs | `stage = Preparing`, pack not sent |
| 3 Distribute review pack | Every input prepared or marked not applicable, pack not sent |
| 4 Management evaluation | Pack sent, not yet finished and locked |
| 5 Record decisions | On the Finish and lock page |
| 6 Finalize and sign off | `stage = Reviewed`, sign-off missing |
| 7 Monitor actions | Signed off, actions open (then Close when all are done) |

If you find you must store more stages, update plan §22 in the same pull request and explain why.

### ISO edition

The brief says ISO 9001:2015, but the app is built for **ISO 9001:2026** (`ISO_EDITION` in `app/src/data/iso.ts`). Clause numbers 9.3, 9.3.2 and 9.3.3 are the same. Use `ISO_EDITION` and never print "2015".

### Data model changes

Extend the types; don't replace them. Existing reviews must still open, so migrate old fields when loading.

| Where | Add |
|---|---|
| `ManagementReviewRecord` | `period: { start: string; end: string }` (ISO dates), chosen when planning. It defaults to the day after the previous review's period up to the planned date. `contributors?: string[]`. `packSnapshot?` (figures as sent in the pack). Per input and overall evaluations (below) |
| `ReviewInput` | `analysis?: { summary; observations; attention; recommendations }`. Old `note` becomes `analysis.summary`. Also `preparedBy`, `updatedAt`, `confirmedBy`. Keep `draft`, `handedTo`, `notApplicable` and `coveredIn` as they are |
| New `reviewRecordChecks` collection | `{ id, reviewId, ref, kind, recordId?, url?, title, addedBy ("auto" or a person), status: "Not reviewed" or "Reviewed" or "Needs clarification" or "Insufficient evidence", by, at, notes }`. Automatic records are worked out live, so store a row only once someone acts on one or adds a manual reference |
| New `reviewEvaluations` collection | `{ id, reviewId, ref ("overall" for the whole review), by, status: "Satisfactory" or "Needs improvement" or "Requires management action", comment, clarification?, at }`. Existing `comments` stay |
| `ReviewAction` | `inputRef?`, `sourceRecords?: { kind; id }[]`, `evaluationId?`, `completionEvidence?: string[]`. Keep the three types: Improvement, Change to the QMS, Resource need |
| `ReviewInput.frozen` | `{ value, detail, status, period, method, sources: { kind; id; version }[], computedAt }` |

Number new records with `nextId(takenIds("…"), prefix)`.

### Figure engine

Rewrite `app/src/lib/review-figures.ts` as `computeInput(ref, state, period)`. It returns:
- `status`, one of:
  - `"valid"`: a calculated result.
  - `"zero"`: the query ran and found no matching records.
  - `"not-collected"`: the source exists but has no data for the period, e.g. no objective result entered.
  - `"no-source"`: the app has no module for this, e.g. complaints.
- `value`, `target`, `previous` (the same figure for the previous period) and `trend` when history exists.
- `method`: one plain sentence saying how it was calculated.
- `sources`: the record list, which Supporting records displays.
- `computedAt`.

Don't use regular expressions on names. Tag objectives with the inputs they feed: add `reviewInputs?: string[]` to `Objective`, settable in the objective form, and tag the sample objectives.

| Input | Sources in this app | Missing today: show "no source" and allow manual references |
|---|---|---|
| a | Open and done `reviewActions` from earlier reviews, their linked records, completion evidence | — |
| b | `issues` and `parties` changed in the period (needs the dates from task 1.5) | Change history. Show only records changed in the period, and never call a record "changed" just because it exists |
| c1 | Objectives tagged c1, NCs whose source is a customer complaint | Survey and complaint register |
| c2 | All objectives: result for the period vs target, owner, trend | — |
| c3 | Processes, their objectives' results, NCs by process in the period | Product conformity records |
| c4 | NCs open, raised and closed in the period, overdue, major/minor, recurring (same process and clause), effectiveness checks | — |
| c5 | Objective results entered in the period (count measurements, not definitions) | Inspection data beyond objectives |
| c6 | Audits held in the period, reports issued or pending, findings (from the other kit's `auditFindings` when it lands), audit NCs | — |
| c7 | Objectives tagged c7, NCs in Purchasing & suppliers, supplier evidence | Supplier register and evaluations |
| d | Documents and evidence in People & competence and Infrastructure & equipment, related NCs and risks | Resource module. Mostly manual; never invent use or capacity data |
| e | Risks and opportunities with treatment, due and overdue reviews, linked NCs | Effectiveness assessment. Show "action exists" and "effectiveness checked" separately; until a check field exists, say it isn't recorded |

### Access

- **Work out figures and records from `useStore().state`.** It is already filtered for the viewer (D22), and you must apply `canSee(classification, viewers)` to each supporting record.
- **Show summary figures only to people whose role covers all processes**, such as the quality manager and top management. Someone given one input (`handedTo`) whose role is narrower sees the supporting records they are allowed to see, and the line "The quality manager prepares the summary figure". This follows plan §9: filter before counting, and never show "N hidden".
- **Consultants:** they can draft analysis (confirmed by the quality manager), but they can't evaluate as top management, sign off or finish and lock (plan D18, §22).
- **Plan §22 says figures are computed on the server from authorised data.** State that the browser preview only imitates this.

### Supporting records component

Build `app/src/components/app/supporting-records.tsx` on `RecordLink` from task 1.2. It shows:
- title, ID, source module, date, status, short description and evidence type;
- the review status control, with notes, by and when.

It also needs an empty state, a "no source" state, and a responsive layout. It takes generic props so audits and corrective actions can use it later, but don't change those modules now.

- Opening a record never changes its review status. A record is marked reviewed only by a deliberate click.
- A record that was deleted or is no longer visible shows "Not available" with its ID, not a broken link.

### Input workspace

The two-panel layout in `detail.tsx` stays. Give the right panel more room when an input is open (a wider panel or a resizable split), and use these sections:
1. **About this input:** what it means, why management reviews it and where the data comes from. Keep each to one or two sentences, written in `app/src/data/reviews.ts`.
2. **Performance summary:** the figure engine output. Label it Live, Prepared or Finalized.
3. **Supporting records.**
4. **Analysis for top management:** the four short fields, plus prepared by, status, last updated, handed to, and confirmed. Keep "hand to" and consultant drafts.
5. **Evaluation:** shown once the pack is sent, to top management. They give a status and comment and can ask for clarification, which notifies the preparer.
6. **Decisions:** for this input, they link to the review action list.

Warn before leaving a page with unsaved text. Saving goes to the store, and task 1.4 keeps it across tabs.

### Decisions, actions and finalize

- Decisions are still made on the Finish and lock page (`record.tsx`), and can now also be proposed from an input or an evaluation. Each carries `inputRef` and `sourceRecords`.
- When a decision raises a corrective action, link an existing NC if the decision came from one. Create a new NC only when none is linked, so retries don't make two.
- Owners are notified with `notify()`, and actions show in the actions tracker on `/management-review`.
- Finish and lock (plan §22): in one step, freeze every input's figure and its sources, the supporting record checks, the evaluations, the conclusion and the actions. Save the evidence record (this already exists), then set the stage to Reviewed. After that, edits need an amendment with a reason. Sign-off is added to a ledger and never changes the frozen content.

### Notifications

Use `notify(to, …)` for these events:
- input handed to someone;
- clarification requested and answered;
- pack sent;
- evaluation added (to the preparer);
- action assigned;
- action due soon or overdue;
- review recorded;
- sign-off needed.

Send one per event.

### Also update

- Plan v3 §22 and the Management review tables in §12, to cover periods, analysis fields, record checks, evaluations, snapshot contents, the pack page and the guided steps.
- `plan/progress.md`.
- Sample data: give MR-2026-02 a period (1 May 2026 – 31 October 2026), some record checks, analysis on a few inputs and one evaluation, so every state can be seen. Keep it synthetic.

### Tests

Write the brief's scenarios A–G as Playwright tests. If the other kit has already added Playwright under `app/`, reuse it; otherwise add `@playwright/test` and `npm run e2e`. For new tabs, use `context.waitForEvent("page")` and check that the first page kept its state. Add the suite to the Check workflow once it is stable.

### Suggested pull requests

1. Figure engine, periods on reviews, supporting records component, the input workspace's summary and records sections.
2. Analysis fields, hand-to, the pack page and Send pack.
3. Evaluation, decision traceability, monitoring actions across reviews.
4. Finish and lock snapshots, amendments, tests A–G.

### Preview limits to state in the pull requests

Data lives in one browser (task 1.4). Access checks and figure calculations happen in the browser and only imitate the server rules in plan §9 and §22. The pack is printed by the browser; no PDF is generated on a server.

---

## Part B: product owner's brief (verbatim)

# CLAUDE IMPLEMENTATION PROMPT
## ThryveMS — Management Review Workflow & Supporting Records Integration

### ROLE

Act as a Senior Enterprise SaaS Architect, ISO 9001 Quality Management Systems Specialist, Senior Full-Stack Developer, and Senior UI/UX Designer.

Your task is to enhance the existing **ThryveMS Management Review Module** by implementing a complete, evidence-backed management review workflow compliant with the intent of ISO 9001:2015 Clause 9.3.

**Repository:**
https://github.com/dbauto/afdhlskdfs-iqms-preview

**Live UI preview:**
https://dbauto.github.io/afdhlskdfs-iqms-preview/

Inspect the existing source code and application architecture before implementation.

The existing Management Review module already includes:
- Management review planning
- Meeting, no-meeting, and multiple-meeting formats
- Eleven ISO 9001 management-review input categories
- Automatically calculated performance figures
- Input preparation notes
- Assignment of preparation responsibilities
- Management comments
- Decisions and action items
- Review recording and sign-off
- Evidence records

Preserve these features and improve their functionality and user experience.

**This is an enhancement, not a complete redesign.**

Do not replace the existing design system, typography, spacing, navigation, sidebar, components, or overall visual identity.

---

# 1. CURRENT PROBLEM

When users create a Management Review Plan, the application automatically generates eleven ISO 9001 review inputs.

For example:

- a — Actions from previous reviews
- b — Changes in issues and interested parties
- c1 — Customer satisfaction and feedback
- c2 — Quality objectives
- c3 — Process performance and product/service conformity
- c4 — Nonconformities and corrective actions
- c5 — Monitoring and measurement results
- c6 — Audit results
- c7 — Performance of external providers
- d — Adequacy of resources
- e — Effectiveness of actions addressing risks and opportunities

The application currently displays summary figures such as:

- 5 / 7 quality objectives on target
- 7 open corrective actions
- 8 / 9 audit reports issued
- 88.5% supplier on-time performance

However, these figures are insufficient for meaningful management evaluation.

Users cannot clearly determine:
1. Which source records contributed to the figures.
2. Which documents or evidence support the results.
3. Which reporting period the figures represent.
4. How the figures were calculated.
5. Which records require management attention.
6. Whether the source information has been reviewed.
7. What management decided based on the evidence.

The current interface relies heavily on a single **Note for top management** field.

The application needs an evidence-backed review workspace rather than a collection of unexplained statistics.

---

# 2. TARGET MANAGEMENT REVIEW WORKFLOW

Implement the following guided lifecycle:

**Plan Review → Prepare Inputs → Distribute Review Pack → Management Evaluation → Record Decisions → Finalize & Sign Off → Monitor Actions**

Each stage must have clear responsibilities, statuses, and next actions.

### Stage 1 — Plan Review

The Quality Manager or authorized user:
- Creates the management review.
- Chooses the review format.
- Defines the date or deadline.
- Defines the reporting period.
- Assigns top management participants.
- Assigns the review preparer.
- Optionally assigns departmental contributors.

Support the existing:
- Meeting
- No meeting
- Several meetings

Do not require a formal meeting when the organization uses a documented management review process.

### Stage 2 — Prepare Inputs

The application automatically collects relevant QMS information.

The Quality Manager:
- Reviews automatically generated figures.
- Opens supporting records.
- Verifies available information.
- Requests missing information.
- Adds management-review analysis.
- Assigns specific preparation tasks where needed.

### Stage 3 — Distribute Review Pack

Once preparation is complete, authorized users distribute a review pack containing:
- Reporting period
- Management review inputs
- Performance summaries
- Supporting record references
- Prepared analysis
- Items requiring management attention

Ensure the review pack is generated from actual review data.

Do not display a fake success notification for a PDF or export that was not generated.

### Stage 4 — Management Evaluation

Top management:
- Reviews performance information.
- Opens supporting records.
- Adds comments.
- Evaluates QMS performance.
- Identifies improvement opportunities.
- Determines required management decisions.

### Stage 5 — Record Decisions

Record decisions concerning:
- Opportunities for improvement
- Changes needed to the QMS
- Resource needs

Create assigned actions where necessary.

### Stage 6 — Finalize & Sign Off

Generate the final management review record.

Preserve:
- Inputs considered
- Performance figures
- Evidence references
- Management evaluation
- Decisions
- Assigned actions
- Review participants
- Review dates
- Sign-off information

### Stage 7 — Monitor Actions

Track outstanding management decisions.

Carry unresolved actions forward for consideration in subsequent reviews.

---

# 3. MANAGEMENT REVIEW INPUT WORKSPACE

Preserve the existing eleven ISO 9001 input categories.

Improve the right-hand input detail panel or use an appropriately sized workspace within the established UI design system.

When the user selects an input, display four clearly differentiated sections.

## Section A — System-Generated Performance Summary

Display:
- Input name
- ISO clause reference
- Reporting period
- Actual performance
- Target, when applicable
- Comparison against previous periods
- Trend, where historical data exists
- Calculation method
- Data source
- Last updated timestamp
- Data availability status

Figures must be calculated using relevant records and the selected reporting period.

Do not present historical or outdated data as current.

Do not interpret zero records as zero problems unless the query successfully verified that no relevant records exist.

Distinguish:
- No records available
- Records not yet collected
- Zero records meeting the condition
- Valid calculated result

## Section B — Supporting Records

This is a critical requirement.

Every applicable management review input must provide direct access to the underlying records used to prepare its performance summary.

Each supporting record should display:
- Record title
- Record ID
- Source module
- Relevant date
- Record status
- Brief description
- Evidence type
- Open record action

Support internal and approved external document links.

**IMPORTANT NAVIGATION REQUIREMENT:**

ALL supporting record links that navigate to another page must open in a NEW BROWSER TAB.

The current Management Review page must remain open and retain its state.

Examples:

- Document → Open the specific Document Library record in a new tab.
- SharePoint document → Open the original SharePoint URL in a new tab.
- OneDrive document → Open the original OneDrive URL in a new tab.
- Evidence → Open the specific Evidence Library record in a new tab.
- Internal Audit → Open the specific Audit Detail or Audit Report in a new tab.
- Quality Objective → Open the specific Objective record in a new tab.
- KPI → Open the specific KPI record in a new tab.
- Corrective Action → Open the specific Corrective Action record in a new tab.
- Nonconformity → Open the specific nonconformity in a new tab.
- Risk → Open the specific risk record in a new tab.
- Previous Management Review → Open the specific previous management review in a new tab.

### Navigation Requirements

- Use actual record-specific routes.
- Do not redirect to generic module landing pages when a detail route exists.
- Use the existing router and route structure.
- Use `target="_blank"` and `rel="noopener noreferrer"` where appropriate.
- Show an external-link icon.
- Provide accessible link labels.
- Respect record-level access permissions.
- Handle missing, restricted, or deleted records.
- Preserve the current review's unsaved work through its established state-management approach.
- Opening a record must not automatically mark it as reviewed.

Do not open records in the same tab.

Do not use decorative links that do nothing.

### Supporting Record Review Status

Allow authorized users to explicitly mark supporting records as:
- Not reviewed
- Reviewed
- Needs clarification
- Insufficient evidence

Store:
- Reviewed by
- Reviewed at
- Review notes
- Relevant evidence reference

These statuses are review workflow controls, not automatic ISO conformity decisions.

A record should only be marked reviewed through deliberate user action.

### Additional References

Allow users to link:
- Existing application records
- SharePoint documents
- OneDrive documents
- Other approved evidence references

Validate external URLs.

Avoid introducing local file uploads unless already supported and explicitly appropriate to the existing document architecture.

---

# 4. MAP SUPPORTING RECORDS TO ALL 11 INPUTS

Implement record-source mapping for each review input.

### a — Actions from Previous Reviews

Automatically retrieve:
- Previous management reviews
- Previous review decisions
- Action owners
- Due dates
- Completion status
- Outstanding actions
- Evidence of completion

Allow opening previous review records and individual linked actions.

### b — Changes in Issues and Interested Parties

Automatically retrieve:
- Organizational context issues
- Internal and external issues
- Interested party register
- Relevant changed requirements
- Documented context changes

Show actual changes within the review period where historical data supports comparison.

Do not imply change merely because a record exists.

### c1 — Customer Satisfaction and Feedback

Retrieve:
- Customer satisfaction objectives and measurements
- Survey results
- CSAT records
- Customer complaints
- Feedback summaries
- Relevant corrective actions

Only display data from modules that actually exist.

For unavailable integrations, show a clear missing-source state and allow approved manual evidence references.

### c2 — Quality Objectives

Retrieve:
- Quality objectives
- Objective owners
- Performance targets
- Actual results
- KPI measurements
- Measurement dates
- Trends
- Underperforming objectives

Provide direct record links.

### c3 — Process Performance and Product/Service Conformity

Retrieve:
- Process records
- Relevant process KPIs
- Performance measurements
- Product/service conformity records where supported
- Process-related nonconformities
- Process-specific supporting evidence

Do not rely solely on predefined visual status flags as the source of truth.

### c4 — Nonconformities and Corrective Actions

Retrieve:
- Open nonconformities
- Closed nonconformities during the reporting period
- Corrective actions
- Overdue actions
- Major and minor findings
- Recurring issues
- Effectiveness verification

Make individual records accessible.

### c5 — Monitoring and Measurement Results

Retrieve:
- KPI measurement records
- Quality monitoring results
- Relevant inspection or measurement results
- Targets
- Trends
- Performance history

Do not use the number of KPI definitions as a substitute for actual measurement results.

### c6 — Audit Results

Retrieve:
- Internal audit records
- Completed audit reports
- Audit findings
- Open audit-related nonconformities
- Pending audit reports
- Audit-related corrective actions

Display important findings and recurring issues, not just the number of reports issued.

### c7 — Performance of External Providers

Retrieve:
- Supplier performance indicators
- Supplier evaluations, when available
- Delivery performance
- Supplier nonconformities
- Relevant supplier-related corrective actions

Display supplier-level detail where available.

### d — Adequacy of Resources

Support:
- Staffing information
- Competence records
- Training needs
- Infrastructure issues
- Equipment needs
- Resource requests
- Supporting documents

Allow manual preparation when no structured resource-management module exists.

Do not invent resource utilization data.

### e — Effectiveness of Actions Addressing Risks and Opportunities

Retrieve:
- Risk register entries
- Opportunities
- Treatment actions
- Outstanding risk actions
- Effectiveness assessments
- Overdue reviews
- Supporting evidence

Distinguish between actions that exist and actions whose effectiveness has actually been evaluated.

---

# 5. MANAGEMENT REVIEW ANALYSIS

Replace the ambiguous single-field experience with a more understandable preparation section.

Recommended label:

**Analysis for Top Management**

Provide fields for:

1. Performance summary.
2. Important observations.
3. Issues requiring management attention.
4. Proposed recommendations.

Avoid forcing unnecessary lengthy explanations.

Allow the preparer to provide a concise analysis.

Preserve the existing ability to delegate preparation of an input to another person.

Display:
- Prepared by
- Preparation status
- Last updated
- Assigned contributor
- Confirmation status

Use existing role and approval conventions.

Do not automatically generate conclusions claiming conformity or effectiveness from summary statistics.

---

# 6. TOP MANAGEMENT EVALUATION

Create a distinct evaluation section that becomes available when the review pack is ready.

Top management must be able to:
- View the prepared analysis.
- Open supporting records.
- Examine relevant evidence.
- Add evaluation comments.
- Request clarification.
- Record conclusions.
- Propose management decisions.

Provide optional evaluation statuses:
- Satisfactory
- Needs improvement
- Requires management action

These labels are internal application workflow aids, not prescribed ISO 9001 response choices.

Allow evaluation across individual topics and consolidated conclusions.

Avoid requiring a separate action for every input.

---

# 7. MANAGEMENT DECISIONS AND ACTIONS

Preserve the existing decision and action management system.

Extend traceability so a decision may be linked to:
- Management review
- Relevant input category
- Supporting record
- Management evaluation
- Assigned action
- Responsible owner
- Due date
- Completion evidence

Use the existing decision types:
- Improvement
- Change to the QMS
- Resource need

Allow management to:
- Record decisions against individual topics.
- Review all proposed decisions.
- Consolidate related decisions.
- Finalize the action plan.

Do not duplicate corrective-action records unnecessarily.

---

# 8. REPORTING PERIOD AND DATA INTEGRITY

Management-review figures must have an explicit reporting period.

Example:

July 1, 2026 – September 30, 2026.

Apply the reporting period consistently wherever applicable.

Track:
- Source record identifiers
- Data calculation logic
- Data extraction time
- Reporting period
- Source reference
- Snapshot values

During preparation, calculated figures may update when underlying records change.

When the review is finalized, freeze its reviewed figures and preserve the associated supporting-record snapshot or versioned references.

Do not allow subsequent changes in the live system to silently modify finalized management review evidence.

Support a clear distinction between:
- Live data
- Prepared data
- Finalized review data

---

# 9. GUIDED USER EXPERIENCE

Make the workflow understandable to someone unfamiliar with ISO 9001.

Use a guided progression:

1. Plan Review
2. Prepare Inputs
3. Distribute Review Pack
4. Management Evaluation
5. Record Decisions
6. Finalize & Sign Off
7. Monitor Actions

Display the current stage and next required action.

Do not clutter the page with all workflow controls simultaneously.

Use progressive disclosure.

For each review input, clearly show:

- What this topic means.
- Why management reviews it.
- Where the data comes from.
- Which supporting records are available.
- What information is missing.
- Who is responsible for preparation.
- What management needs to evaluate.

Include concise contextual guidance.

Preserve the current two-panel design where practical, but ensure the Supporting Records section has enough room to display records clearly.

Consider a resizable split view or a dedicated detail workspace when necessary.

Do not introduce nested modal experiences that make navigation difficult.

---

# 10. REUSABLE SUPPORTING RECORDS COMPONENT

Create a reusable Supporting Records component using the existing application component library.

It must support:
- Multiple record types
- Internal record links
- External document links
- New-tab navigation
- Review statuses
- Evidence notes
- Record metadata
- Empty states
- Missing sources
- Permission-aware rendering
- Responsive layouts

Design it for reuse in:
- Management Review
- Internal Audit
- Corrective Action
- Risk Management
- Other QMS modules

However, do not redesign unrelated modules as part of this task.

---

# 11. SECURITY AND PERMISSIONS

Preserve existing user and tenant access controls.

Ensure:
- Review participants only access authorized content.
- Source records respect their original permissions.
- Record references cannot bypass tenant isolation.
- External links are validated.
- Supporting record review actions are attributable to a user.
- Finalized records cannot be silently edited.
- Appropriate audit history is maintained.

Production security must ultimately be enforced server-side.

Do not represent client-side role checks or browser storage as enterprise-grade authorization.

---

# 12. FUNCTIONAL REQUIREMENTS

All newly introduced controls must perform real application actions.

Do not implement:
- Fake PDF exports
- Static placeholder hyperlinks
- Hard-coded success messages
- Nonfunctional buttons
- Fake review confirmations
- Placeholder source records presented as real evidence

Where the current preview architecture cannot support a production feature, implement the best legitimate preview behavior and explicitly document the limitation.

Avoid silently inventing data.

Reuse existing state-management patterns without compromising the planned backend architecture.

---

# 13. TESTING

Verify the complete workflow.

### Scenario A — Quality Objectives

Create a management review.

Open c2 — Quality Objectives.

Verify that:
- The summary is calculated from objective records.
- The reporting period is visible.
- Individual supporting objectives appear.
- A specific objective opens in a new browser tab.
- The original management review remains open.
- The preparer can record an analysis.

### Scenario B — Audit Results

Open c6 — Audit Results.

Verify that:
- Related audits are listed.
- Audit findings are visible.
- A specific audit opens in a new tab.
- Supporting evidence can be accessed.
- Relevant issues can be evaluated.

### Scenario C — Corrective Actions

Open c4 — Nonconformities and Corrective Actions.

Verify that:
- Actual relevant records are retrieved.
- Status and overdue conditions are accurate.
- Record-specific links work.
- Authorized users can mark supporting records as reviewed.

### Scenario D — Missing Evidence

Select an input without supporting records.

Verify that:
- The UI shows a meaningful missing-data state.
- No fake evidence is presented.
- The preparer can link an approved reference.
- Management can request additional information.

### Scenario E — Management Decisions

Review an underperforming KPI.

Record a management decision.

Assign an owner and due date.

Verify that:
- The decision is saved.
- It links to the relevant management review.
- The owner receives an appropriate notification.
- The action appears in the action tracker.

### Scenario F — Review Finalization

Finalize a completed management review.

Verify that:
- Reviewed performance figures are frozen.
- Supporting references remain traceable.
- Decisions and actions are preserved.
- The finalized record appears in the evidence system.
- Subsequent underlying data updates do not rewrite historical review results.

### Scenario G — Navigation

Test every supporting record link type.

Verify that:
- It opens the intended specific record.
- It opens in a new tab.
- It displays appropriate unavailable/access-denied states.
- The original review retains its state.
- External links use safe browser attributes.

Also test responsive layouts, type checking, builds, and existing management-review functionality.

---

# 14. IMPLEMENTATION EXECUTION

Perform the following:

1. Inspect the latest repository.
2. Review the Management Review module.
3. Review `app/src/lib/review-figures.ts`.
4. Review the relevant data types and state-management implementation.
5. Identify all relevant record routes.
6. Identify data relationships and source-record availability.
7. Extend the data model as needed.
8. Implement reusable supporting record resolution.
9. Enhance all eleven review-input sections.
10. Implement record-specific new-tab navigation.
11. Add evidence review status and analysis.
12. Implement management evaluation.
13. Integrate decisions and action tracking.
14. Fix misleading or nonfunctional review-pack functionality.
15. Implement reporting-period handling.
16. Implement finalization snapshots.
17. Run automated tests and build checks.
18. Fix regressions.

You have authority to make reasonable design and implementation decisions without requesting approval.

Do not pause for routine confirmations.

Preserve existing functionality.

Do not push directly to the production `main` branch. Use a dedicated feature branch for this implementation.

---

# 15. ACCEPTANCE CRITERIA

The task is complete when:

- All eleven ISO 9001 management-review inputs have meaningful preparation interfaces.
- Available system records are automatically associated with relevant inputs.
- Users can inspect the underlying data behind calculated figures.
- Supporting documents, evidence, audits, KPIs, risks, and corrective actions open their specific records in new tabs.
- The original Management Review page remains open.
- Evidence can be deliberately marked as reviewed.
- Missing information is clearly identified.
- Quality Managers can prepare analyses and recommendations.
- Top management can evaluate the inputs.
- Management decisions can be linked to relevant evidence and review topics.
- Decisions become tracked actions when appropriate.
- The reporting period is consistently handled.
- Finalized figures and references remain historically traceable.
- All controls are functional within the limitations of the preview.
- The current ThryveMS design remains visually consistent.
- Existing functionality continues to work.
- Relevant tests pass.

## FINAL INSTRUCTION

Implement this as a complete enhancement of the existing Management Review module.

The primary objective is to transform the current screen from a list of automatically generated statistics and notes into a **traceable, evidence-backed management decision workspace**.

The final experience must clearly connect:

**ISO Review Input → Actual QMS Records → Supporting Evidence → Quality Manager Analysis → Management Evaluation → Management Decision → Assigned Action → Final Review Record**

Prioritize accuracy, usability, record traceability, and consistency with the existing enterprise UI.

Proceed with implementation and provide a concise implementation summary, test results, known limitations, and changed-file list.
