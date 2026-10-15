# Task 3: Audit checklist, auditee questionnaire and audit execution

Part A says how the requirements map onto this repository. Part B is the product owner's brief, word for word. **Where they differ, Part A and `AGENTS.md` win**, because they reflect decisions already made in this codebase.

---

## Part A: notes for this repository

### What exists today

| File | What it does now |
|---|---|
| `app/src/pages/audits/programme.tsx` | Audit programme (year grid, by process) |
| `app/src/pages/audits/plan-sheet.tsx` | Plan an audit: process, clauses, lead, auditors. Greys out auditors who aren't independent |
| `app/src/pages/audits/auditor-sheet.tsx` | Auditor list: competence, certificate link, exclusions (`extraExclusions`) |
| `app/src/pages/audits/templates.tsx` | Checklist templates |
| `app/src/pages/audits/checklist-builder.tsx` | Route `/audits/:id/checklist`. Builds sections and questions with type, clause, `askedBy` (auditor), required, evidence to look at and guidance. Warns when the person judging an item owns, reviews or approves the documents it looks at (line ~38) |
| `app/src/pages/audits/detail.tsx` | Route `/audits/:id`. Stepper `Planned → Checklist ready → Audit held → Findings agreed → Report issued`, report readiness list, report editors, Issue report |
| `app/src/data/types.ts` | `Audit`, `AuditState`, `ChecklistQuestion`, `ChecklistSection`, `Auditor`, `EvidenceItem`, `Nonconformity` |
| `app/src/data/records.ts` | `AUDITS`, `CHECKLIST` (one sample checklist, for IA-2026-05), `CHECKLIST_TEMPLATES` |

**Known gaps:**
- **The checklist isn't stored.** `ChecklistBuilder` keeps sections in local React state (`useState` at line ~29), seeded from `CHECKLIST` only for IA-2026-05. Edits are lost when you leave the page. Move checklists into the store first.
- **Readiness is hard-coded.** `detail.tsx` builds `readiness` from a `rich` flag and sample text ("6 days late", "Kim Dela Cruz can edit the draft"). Replace it with values worked out from records.
- **"Report late" is a stored state**, but plan §19 says late and overdue are computed conditions, not lifecycle stages. Compute it from the report due date, and keep the badge.
- **There is no "My Tasks" page.** Personal work shows in Overview's "Needs your attention" list (`app/src/pages/overview.tsx`) and in Notifications. Put questionnaire and assessment tasks there, plus an entry on the audit page. Don't add a new top-level menu item. If a list of a person's audit tasks is needed, add it under Audits.
- **There is no "Lead auditor" role.** "Lead" is per audit (`audit.lead`), and "auditee" is per questionnaire assignment. Combine `can("Audits", level)` with these assignments; don't add roles for them.

### Data model

Add store collections next to the existing ones in `app/src/lib/store.tsx`. Keep `ChecklistQuestion` and `ChecklistSection` working, migrating them into the new shape. Suggested names follow plan §12 (`audit_checklists, sections, questions, answers, findings`):

| Collection | Holds |
|---|---|
| `auditChecklists` | One per audit: `auditId`, `version`, `status` (Draft, Released, Revised), `releasedAt`/`releasedBy`, `usesQuestionnaire` (workflow A or B), and sections and questions as released. A revision makes a new version and keeps the old one |
| `questionnaireAssignments` | Audit, respondent (person), question IDs, due date, status (Not started, In progress, Submitted, Clarification requested, Resubmitted) |
| `auditeeResponses` | Question (with checklist version), respondent, typed value, explanation, N/A justification, evidence references, status, history of changes |
| `auditorAssessments` | Question (with checklist version), auditor, result (Conforms, Observation, Minor NC, Major NC, Not applicable), objective evidence, sampling, interviewee, notes, Draft/Completed, timestamp. A reassessment adds a record and never edits the old one |
| `evidenceVerifications` | Evidence reference (an `EvidenceItem` ID, a document ID or a link), question, status (Pending review, Verified, Insufficient, Not applicable), verifier, time, notes |
| `clarificationRequests` | Question, from (auditor), to (respondent), kind (clarification or more evidence), text, reply, status |
| `auditFindings` | Audit, question, assessment, classification, requirement, clause, process, facts, evidence, owner, status (Draft, Agreed, Final), `ncId` (unique: one finding links to at most one NC) |
| `auditReports` | Audit, version, structured fields (objectives, scope, criteria, auditors, auditees, dates, processes, evidence summary, conclusion, follow-up), issued by and when. Changes after issue make an amendment |

**Rules:**
- An auditee response and an auditor assessment are separate records. One never overwrites the other.
- Number new records with `nextId(takenIds("…"), prefix)`, never from `state`. Process access may hide records, and numbers must not clash.
- Guard every submit button against double clicks (disable while saving; make the action idempotent).
- Records follow their audit's process for visibility. Extend `scopeState()` in `store.tsx` to cover the new collections, and test with View as.

### Access

- **Auditee:** sees their own questionnaire assignments and their own responses, even when the audit's process is outside their process scope. That access covers only the assigned questions, the audit header and evidence they submitted. It does not widen `scopeState` for anything else, and they never see other respondents' answers, auditor assessments, findings or the draft report.
- **Auditor:** sees audits they are assigned to. They assess only the questions assigned to them (`askedBy`). They can read auditee responses for those questions.
- **Lead (`audit.lead`):** sees everything in the audit, releases checklists, assigns questionnaires, consolidates results and issues the report.
- **Guest auditor:** only audits they are assigned to, until the access end date.
- **Consultant:** can't approve, issue or sign off (plan D18).
- **Independence:** reuse the existing checks in `plan-sheet.tsx` and `checklist-builder.tsx`. Block an auditor from assessing a question where they aren't independent, and show the reason. The backend checks assignments, not names (plan §9).

### Evidence

- **Links only** (plan D12–D13, `AGENTS.md` rule 2): existing documents, evidence library items (`EvidenceItem`), SharePoint or OneDrive links, and other `https://` links. No file upload.
- Validate links the same way as `doc-sheet.tsx` (must start with `https://`). Show SharePoint and OneDrive links as trusted sources; show others as "external link, not checked". Never fetch or preview a link in the browser.
- Reuse `EvidenceSheet` and `RecordPicker`. One evidence item can support several questions; verification belongs to the question link, not to the evidence item.
- Respect classification: `canSee(classification, viewers)` applies to evidence shown in audits.

### Findings and nonconformities

- Raise a finding from the assessment panel, inline, without leaving the page.
- For Minor or Major NC, create or link a `Nonconformity` through the existing flow (`app/src/pages/improvement/nc-sheet.tsx`): set `source` to the audit and question, and store `ncId` on the finding. If `ncId` is already set, open it instead of creating another.
- Observations and opportunities never create an NC.

### Notifications

Use `notify(to, { kind, title, body, href })` from `useStore()`. It already skips the person acting. Send one notification per event, and don't repeat one for the same event.

### Also update

- Plan v3: the Audits row in §12, and §19 (questionnaire, responses, assessments, verifications, clarifications, finding → NC link, report versions). The plan is the normative spec.
- `plan/progress.md`.
- Sample data in `app/src/data/records.ts`: give at least one audit a released checklist, a questionnaire with responses, two auditors' assessments and findings, so the screens show real states. Keep it synthetic.
- Product name: by now it is **ThryveMS** (task 2). Use it in any new text.

### Tests

The repo has no test files yet (earlier Playwright checks weren't committed). Add `@playwright/test` to `app/` with `npm run e2e`, and write the scenarios A–H from Part B §14 as end-to-end tests. Use View as to switch people. Add the suite to `.github/workflows/check.yml` once it is stable.

### Suggested pull requests

1. Store and data model: checklists, versions and release, migrate `ChecklistQuestion`/`ChecklistSection`; the builder saves to the store. Builder extensions (who responds, evidence rules, configurable choices, N/A justification).
2. Auditee questionnaire: assignment, the questionnaire page, drafts, submit, clarifications.
3. Conduct audit: the auditor workspace, assessments, evidence verification, findings and NC link.
4. Multiple auditors, the audit page's progress and readiness from records, and the report (fields, consolidation, issue, amendment).
5. End-to-end tests A–H.

### Preview limits to state in the pull requests

The prototype keeps everything in memory in one browser. Nothing is shared between people or kept after reload, and View as only imitates other people. None of it is secure or multi-user; the backend enforces access on every request (plan §9).

---

## Part B: product owner's brief (verbatim)

# CLAUDE IMPLEMENTATION PROMPT
## ThryveMS — Audit Checklist, Auditee Questionnaire & Audit Execution Workflow

### ROLE

Act as a Senior Enterprise SaaS Architect, Senior UI/UX Designer, ISO 9001 QMS Process Specialist, and Senior Full-Stack Developer.

Your task is to enhance the existing ThryveMS Audit Module by implementing a complete, cohesive workflow that allows:

1. Audit planning and preparation.
2. Auditor checklist and questionnaire creation.
3. Assignment of questions to auditees.
4. Auditee responses and evidence submission.
5. Auditor verification and assessment.
6. Audit findings and nonconformity management.
7. Consolidation of multiple auditors' results.
8. Audit report preparation, review, and issuance.

**IMPORTANT: This is an enhancement of the existing application, not a redesign.**

Repository:
`https://github.com/dbauto/afdhlskdfs-iqms-preview`

Current preview:
`https://dbauto.github.io/afdhlskdfs-iqms-preview/`

Inspect the current implementation thoroughly before making any changes.

Preserve the current design system, visual hierarchy, page layouts, typography, spacing, components, sidebar, navigation, and existing functionality wherever possible.

Do not introduce an unrelated design style.

---

# 1. CURRENT PROBLEM

The existing Audit Checklist page primarily functions as a Checklist Builder.

It allows users to:
- Define audit questions.
- Select answer types.
- Assign auditors.
- Specify evidence to review.
- Add auditor guidance.
- Mark a checklist ready.

However, the user journey is incomplete.

There is no sufficiently developed workflow for:
- Auditees to receive assigned questions.
- Auditees to enter answers.
- Auditees to submit supporting evidence.
- Auditors to conduct assessments.
- Auditors to record objective evidence and observations per question.
- Auditors to raise findings directly from a checklist response.
- Multiple auditors to consolidate their results.
- Lead auditors to review completion and prepare an audit report.

Implement these capabilities using the existing Audit Module.

---

# 2. TARGET WORKFLOW

The complete audit lifecycle should follow:

**Audit Plan → Checklist Preparation → Questionnaire Assignment → Auditee Response → Audit Execution → Evidence Verification → Findings Review → Report Preparation → Report Issuance → Corrective Action Follow-Up**

Not every audit needs an auditee questionnaire.

Support two approaches:

### Workflow A: Audit with Pre-Audit Questionnaire

1. Lead Auditor creates an audit plan.
2. Auditors prepare checklist questions.
3. Selected questions are assigned to auditees.
4. Auditees answer questions and provide evidence.
5. Auditors review preliminary responses.
6. Auditors conduct interviews, observations, and evidence verification.
7. Auditors record conformity assessments.
8. Findings are consolidated.
9. Lead Auditor reviews and issues the report.

### Workflow B: Direct Auditor-Led Audit

1. Lead Auditor prepares the audit plan.
2. Auditors create the checklist.
3. No questionnaire is distributed.
4. Auditors conduct the audit directly.
5. Auditors record interview responses, observations, and evidence.
6. Findings are consolidated.
7. Lead Auditor issues the report.

Both workflows must operate within the same Audit Module.

The audit plan should specify whether a pre-audit questionnaire is used, without creating duplicate audit records.

---

# 3. ENHANCE THE EXISTING CHECKLIST BUILDER

Preserve the current Checklist Builder layout.

Extend the question editor with the following capabilities.

### Question Definition

Each question should support:

- Question ID.
- Question text.
- Audit section.
- Applicable ISO clause.
- Process or department.
- Question type.
- Instructions or guidance.
- Responsible auditor.
- Assigned auditee or respondent.
- Whether an auditee response is required.
- Whether supporting evidence is required.
- Whether an auditor assessment is required.
- Required or optional status.
- Evidence guidance.
- Expected evidence references.
- Question order.
- Conditional visibility, where configured.

### Supported Question Types

Maintain and enhance the current types:

1. Audit assessment.
2. Yes / No / N/A.
3. Text response.
4. Multiple choice.
5. Numeric input.
6. Date.
7. Evidence review.
8. Document reference.
9. Instruction.

Multiple-choice options must be configurable, rather than permanently limited to placeholder options.

N/A responses should support a required justification when configured.

Evidence requirements should support:

- Not required.
- Optional.
- Required.
- Conditionally required based on the answer.

For example, an answer of "No" may require the auditee to provide an explanation or supporting document.

### Question Response Routing

Add a clear setting:

**Who should respond?**

Options:

- Auditee.
- Auditor.
- Both.

When Both is selected, the application must maintain separate auditee and auditor responses.

An auditor's evaluation must never overwrite an auditee's original response.

### Checklist Versions

Once a checklist is released for execution:

- Preserve the released version.
- Prevent unauthorized editing.
- Allow controlled revisions where necessary.
- Preserve responses against their original question version.
- Maintain a revision history.

---

# 4. AUDITEE QUESTIONNAIRE WORKSPACE

Create a dedicated Auditee Questionnaire interface within the existing Audit Module.

This should be a task-oriented interface, not another checklist configuration page.

### Navigation

An auditee should access the questionnaire through:

**My Tasks → Assigned Audit Questionnaire → Open Questionnaire**

Also provide an entry point from the relevant Audit Detail page for authorized users.

### Questionnaire Header

Display:

- Audit title.
- Audit reference number.
- Process or department.
- Audit date.
- Lead auditor.
- Assigned respondent.
- Response deadline.
- Questionnaire status.
- Completion progress.

### Question Interface

Each assigned question should appear as a clearly readable form item.

Example:

**Clause 7.5.3 — Document Control**

Question:

"How does your department ensure employees are using the latest approved work instructions?"

Response type:

Yes / No / N/A.

Explanation:

Multiline text field.

Evidence:

Link existing evidence or add a SharePoint/OneDrive document reference.

Help text:

"Provide the document control procedure and a sample approved work instruction."

Actions:

- Save Draft.
- Next Question.
- Previous Question.
- Submit Questionnaire.

### Questionnaire Behaviors

Implement:

- Autosave where technically supported.
- Manual Save Draft.
- Field validation.
- Required-question indicators.
- Evidence validation.
- Progress tracking.
- Unanswered-question navigation.
- Resume later.
- Submission confirmation.
- Read-only submitted state.
- Request clarification.
- Respond to clarification.
- Controlled resubmission when requested.

A question should indicate whether it is:

- Not started.
- In progress.
- Answered.
- Needs clarification.
- Submitted.

### Important

Do not use the same input field for both the auditee's answer and the auditor's assessment.

They are different records with different purposes.

---

# 5. EVIDENCE COLLECTION

Some audit questions require evidence, while others do not.

Implement question-level evidence handling.

### Supported Evidence Sources

Prioritize the project's existing document-storage approach:

- Existing ThryveMS document references.
- Existing evidence library records.
- SharePoint links.
- OneDrive links.
- Other approved external document links.
- Structured references to records already in the application.

Do not introduce binary file uploads as the default workflow.

Respect the application's current document-link architecture.

### Evidence Information

Each linked evidence record should support:

- Evidence ID.
- Title or description.
- Source.
- URL or internal reference.
- Related question.
- Related audit.
- Submitted by.
- Submitted date.
- Evidence type.
- Verification status.
- Verified by.
- Verification timestamp.
- Verification notes.

### Evidence Verification

An auditor should be able to mark evidence as:

- Pending review.
- Verified.
- Insufficient.
- Not applicable.

Evidence may be reused across multiple questions without unnecessary duplication.

An auditor must be able to request additional evidence.

A submitted document link must not automatically mean that evidence is verified.

### Security

Validate external URLs.

Do not automatically treat arbitrary URLs as trusted.

Enforce tenant-scoped document and evidence access.

Ensure that an auditee cannot access evidence belonging to another organization or an unrelated audit.

---

# 6. AUDITOR EXECUTION WORKSPACE

Create a dedicated **Conduct Audit** interface.

This must be distinct from the Checklist Builder.

### Dynamic Actions

Use the audit lifecycle to display the appropriate action:

Before checklist release:
**Edit Checklist**

After checklist release:
**Conduct Audit**

During execution:
**Continue Audit**

After completion:
**View Completed Checklist**

Authorized users may have a separate Edit Checklist action when permitted.

### Layout

Reuse the current application's established page and card components.

Recommended structure:

**Header**
- Audit title.
- Audit ID.
- Department.
- Date.
- Audit status.
- Overall completion.

**Question Navigation**
- All Questions.
- My Questions.
- Unanswered.
- Needs Review.
- Findings.

**Main Question Panel**
- ISO clause.
- Question.
- Guidance.
- Auditee response, if applicable.
- Submitted evidence.
- Auditor assessment.
- Observation notes.
- Verified evidence.
- Findings.
- Save and Next.

### Auditor Assessment

For Audit Assessment questions, support:

- Conforms.
- Observation.
- Minor Nonconformity.
- Major Nonconformity.
- Not Applicable, where appropriate.

These must be recorded as the auditor's assessment rather than the auditee's response.

### Auditor Inputs

Each assessed question should support:

- Assessment result.
- Objective evidence observed.
- Verification notes.
- Interviewee or auditee.
- Sampling details.
- Evidence references.
- Additional evidence requests.
- Finding creation.
- Auditor identity.
- Assessment timestamp.
- Draft or completed status.

### Assessment Behavior

Do not automatically calculate conformity from Yes/No answers.

A "Yes" response from an auditee does not establish conformity.

Auditors must be able to independently verify information and record an assessment.

Allow auditors to save partially completed work.

---

# 7. FINDINGS & NONCONFORMITY INTEGRATION

Findings should be created directly from the corresponding checklist assessment.

When an auditor selects Observation, Minor Nonconformity, or Major Nonconformity, offer a contextual finding creation interface.

The interface should capture:

- Finding title.
- Finding description.
- Applicable requirement or criterion.
- Objective evidence.
- ISO clause.
- Process.
- Related checklist question.
- Related audit.
- Classification.
- Responsible auditor.
- Relevant auditee or process owner.

For nonconformities, connect the finding to the existing Nonconformity / Corrective Action workflow.

Maintain the relationship:

**Audit → Question → Response → Evidence → Auditor Assessment → Finding → Nonconformity → Corrective Action**

Do not create duplicate nonconformity records if one is already linked.

The auditor should be able to save an assessment without creating a finding when the result is Conforms.

Observations and opportunities for improvement should not automatically be treated as nonconformities.

Ensure findings have appropriate review and finalization states.

---

# 8. MULTIPLE AUDITORS

An audit may have more than one auditor.

The checklist builder already allows questions to be assigned to individual auditors.

Extend this into actual execution.

Each auditor should have:

- My Assigned Questions.
- My Completed Questions.
- My Pending Questions.
- My Findings.
- My Evidence Requests.

The Lead Auditor should see combined progress.

Example:

**Production Audit**

Overall: 12 / 16 questions completed.

Daniel Reyes — 6 / 6 complete.

Kim Dela Cruz — 4 / 6 complete.

Eric Navarro — 2 / 4 complete.

The lead auditor can review the individual findings and consolidate them into one audit report.

Do not overwrite individual auditor contributions during consolidation.

Preserve each auditor's identity, assessment, and evidence.

### Auditor Independence

Respect the application's existing auditor independence controls.

An auditor must not be permitted to assess their own work when a conflict of independence applies.

Maintain applicable permission controls and conflict warnings.

---

# 9. AUDIT REVIEW & REPORT

Enhance the existing Audit Detail page to reflect the real execution data.

### Checklist Progress

Replace hard-coded checklist completion statements with values calculated from actual assessment records.

Display:

- Total questions.
- Required questions.
- Completed questions.
- Pending assessments.
- Outstanding evidence requests.
- Questions requiring clarification.
- Findings raised.

### Report Readiness

The report readiness indicators should reflect actual completion conditions.

Examples:

- Required auditor assessments completed.
- Required evidence resolved or documented as unavailable.
- Findings reviewed.
- Nonconformity records created where applicable.
- Audit summary completed.
- Audit conclusion completed.
- Lead Auditor approval recorded.

Prevent report issuance when blocking requirements remain incomplete.

### Audit Report

Provide structured fields for:

- Audit objectives.
- Audit scope.
- Audit criteria.
- Auditors.
- Auditees.
- Audit dates.
- Processes reviewed.
- Summary of evidence.
- Overall conclusions.
- Findings.
- Nonconformities.
- Opportunities for improvement.
- Follow-up actions.

The report must preserve traceability back to individual checklist questions and evidence.

Only authorized users should issue the final report.

---

# 10. ROLE-BASED ACCESS

Maintain strict separation of permissions.

### Quality Manager / Authorized Administrator

Can:

- Configure audit settings.
- Manage audit programmes.
- Manage templates.
- Assign auditors.
- Review audit progress according to access policies.

### Lead Auditor

Can:

- Prepare and release checklists.
- Assign audit questions.
- Assign auditee questionnaires.
- Review audit progress.
- Consolidate findings.
- Prepare and issue audit reports.

### Auditor

Can:

- View assigned audits.
- Answer assigned auditor assessment questions.
- Review authorized auditee responses.
- Verify evidence.
- Record observations.
- Create findings.

### Auditee

Can:

- View assigned questionnaires.
- Answer assigned questions.
- Provide evidence links.
- Save drafts.
- Submit responses.
- Respond to clarification requests.

The auditee should not be able to change the auditor's assessment, finding classification, or final report conclusion.

### External Auditors

Preserve the existing guest-auditor concept.

Restrict access to specifically assigned audits and permitted records.

All authorization must ultimately be enforced server-side in the production architecture.

---

# 11. DATA ARCHITECTURE

Review the existing data structures before extending them.

Current structures such as `ChecklistQuestion` and `ChecklistSection` should be preserved or migrated safely.

Avoid storing every audit activity as an unstructured field on the question record.

Separate the main entities conceptually into:

- Audit.
- Checklist.
- Checklist Version.
- Checklist Section.
- Question.
- Questionnaire Assignment.
- Auditee Response.
- Auditor Assessment.
- Evidence Reference.
- Evidence Verification.
- Finding.
- Audit Report.

Support multiple respondents where appropriate.

Support multiple assessments or reassessments where controlled review is needed.

Prevent duplicate submissions caused by repeated clicks.

Include timestamps, ownership, lifecycle states, and audit history.

Since the current preview may use client-side state, implement a working preview using the established data-store patterns while keeping the structure suitable for later integration with the production backend.

Do not claim that client-side demo persistence is secure, multi-user, or production-ready.

---

# 12. UI/UX REQUIREMENTS

Preserve the existing ThryveMS visual identity.

Do not rebuild the Audit Module from scratch.

Do not introduce a different design system.

Use existing components wherever possible.

### Important UX Principles

1. Each role should see the work relevant to them.
2. Checklist preparation and checklist answering must be visually distinct.
3. The user should always know what to do next.
4. Evidence requirements should appear beside the relevant question.
5. Required fields should be clearly marked.
6. Saving should have clear feedback.
7. Validation should explain what is missing.
8. Status indicators should reflect actual data.
9. Navigation should preserve unsaved work or warn before leaving.
10. Mobile and tablet layouts must be usable for on-site auditing.

### Do Not

- Overcrowd the Audit Detail page.
- Open unnecessarily nested modals.
- Force auditors to navigate away just to raise a finding.
- Mix auditee and auditor responses into one editable form.
- Make the auditor manually recreate information already captured in the checklist.
- Replace the existing UI with generic dashboard templates.
- Add decorative elements without functional value.

---

# 13. NOTIFICATIONS

Integrate with the existing notification system.

Trigger appropriate in-app notifications for:

- Questionnaire assigned.
- Questionnaire approaching deadline.
- Questionnaire overdue.
- Auditee response submitted.
- Additional evidence requested.
- Clarification requested.
- Clarification completed.
- Auditor assessment assigned.
- Assigned assessment completed.
- Audit ready for lead review.
- Report issued.

Avoid unnecessary duplicate notifications.

---

# 14. TESTING

Validate complete end-to-end user journeys.

### Test Scenario A

Create an audit plan, prepare a questionnaire, assign it to an auditee, submit responses and evidence, conduct auditor verification, then issue an audit report.

### Test Scenario B

Create an audit without an auditee questionnaire, complete the checklist through direct auditor assessments, and generate the report.

### Test Scenario C

Use multiple auditors with separate assigned questions, then consolidate their completed assessments and findings.

### Test Scenario D

Submit a nonconforming answer with insufficient evidence. Verify that the auditor can request clarification or additional evidence.

### Test Scenario E

Create a minor nonconformity from an audit question and verify that it links to the Corrective Action module without duplication.

### Test Scenario F

Verify that an auditee cannot modify auditor assessments or access another auditee's unauthorized records.

### Test Scenario G

Verify that unanswered required questions and unresolved blocking conditions prevent inappropriate audit completion or report issuance.

### Test Scenario H

Verify checklist version stability, draft recovery, navigation, and responsive behavior.

Use existing project testing tools and conventions.

Fix relevant build errors, type errors, and regressions.

---

# 15. IMPLEMENTATION GUIDELINES

Before coding:

1. Inspect the existing Audit Module.
2. Inspect the Checklist Builder.
3. Inspect the Audit Detail page.
4. Inspect current data types and store.
5. Inspect the Tasks, Evidence, Documents, Nonconformity, and Notifications modules.
6. Identify reusable components and existing data relationships.
7. Identify current limitations and integration points.

Then implement the features.

Do not ask for approval for ordinary design or implementation decisions. You are authorized to make reasonable implementation decisions consistent with the existing architecture and requirements.

Prefer cohesive, incremental changes over large unrelated rewrites.

Do not modify unrelated modules except where a necessary integration requires it.

Do not overwrite existing user records.

Do not push directly to the production branch. Implement on a dedicated feature branch and prepare the changes for review.

---

# 16. ACCEPTANCE CRITERIA

The implementation is complete when:

- An auditor can create a checklist.
- An auditor can define who answers each question.
- An auditor can configure evidence requirements.
- An auditee can receive an assigned questionnaire.
- An auditee can save, answer, and submit a questionnaire.
- Evidence can be linked to individual responses.
- An auditor can review auditee responses.
- An auditor can conduct a checklist assessment independently.
- Assessment results and observations are recorded per question.
- Findings can be generated from assessments.
- Nonconformities are linked to corrective actions.
- Multiple auditors can complete their assigned work.
- A lead auditor can consolidate results.
- Audit report readiness uses actual data.
- An authorized lead auditor can issue a completed report.
- Role-based restrictions are respected.
- The interface remains consistent with the existing design.
- Existing audit features continue functioning.
- Testing verifies the intended workflows.

## FINAL DELIVERABLE

Provide:

1. Implemented source code.
2. Summary of the new workflows.
3. List of new or modified components.
4. Data-model changes.
5. Updated navigation behavior.
6. Completed testing results.
7. Known limitations, especially any preview-only behavior.
8. Feature branch and commit references.

**Priority: Complete the missing operational workflow of the existing Audit Module while preserving the professional ThryveMS UI/UX design.**

Do not treat a visual mockup alone as completion. The auditee questionnaire and auditor execution interfaces must have working interactions, state transitions, validations, and traceable relationships.

Proceed with implementation.
