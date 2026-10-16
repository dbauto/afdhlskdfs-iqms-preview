# ADR-025: Distinct questionnaire authoring

16 October 2026. Danica reported that Add questionnaire opened a checklist and the system appeared confused.

## Decision

A questionnaire has its own Questionnaire builder route and authoring language. Add questionnaire creates a Questionnaire with an AQF number and opens that builder. New checklists retain their checklist editor. Both use the same versioning, permission, approval and response commands so their history and isolation rules cannot drift.

Show answer type beside each questionnaire question. Provide text, single choice, multiple select, Yes/No/N/A, number, date and instructions; retain inline choices, answer preview, required-answer/evidence rules, conditions, respondent guidance and optional independent auditor assessment. Questionnaire questions collect auditee answers by default, with assessment off. Hide the checklist's questionnaire-enable switch and auditor response routing. Fixed form type and command checks prevent a questionnaire being disabled or released with auditor-only question types. A previously saved incompatible draft can be corrected explicitly; released data is not rewritten.

Open questionnaire / Edit questions, questionnaire version, Mark questionnaire ready and Start questionnaire revision consistently identify the object. Mark ready leads to assignments for that exact questionnaire. The assignments page can also create a questionnaire. Approval notifications use the correct builder route. Old questionnaire URLs redirect with their selected version and read-only mode preserved; old IDs, assignments and submissions stay intact. Legacy combined checklist/questionnaire data keeps its existing workflow.

Eligible creators already on the audit team default to owning the form, so they can author it immediately. Quality managers outside that team keep oversight access and receive a clear handoff message before creation and in the builder. This does not add them to the team or grant extra permissions. Unlinked evidence text requires explicit discard; other question edits save automatically. Narrow section headers wrap so titles and actions remain usable.

No backend, deployment, file upload or report-issuance change is included. Shared persistence and real cross-device sharing remain future backend work. This decision records the correction and does not authorize a production deployment.
