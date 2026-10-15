# Audit stage 3b

- ✅ Lead-only assignment from released questionnaire version; active respondent and question/deadline validation; overlapping duplicate assignment is idempotent.
- ✅ Dedicated questionnaire page: own task, audit header, deadline, completion, question navigation, immediate save/reload recovery, typed values, evidence rules and N/A reasons.
- ✅ Submit confirmation validates all visible assigned questions, locks submitted answers and notifies responsible auditors once.
- ✅ Clarification/more-evidence request, own reply, controlled requested-question edits, resubmission and explicit resolution; prior responses remain in edit history.
- ✅ Existing record picker/EvidenceSheet and safe new-tab evidence links; no upload/fetch/preview. HTTPS, no credentials or private hosts; each internal reference is permission checked.
- ✅ Joy can answer an assignment outside her usual process without seeing auditor findings/assessments; Ben gets Not found on her questionnaire.
- ✅ Overview and notifications link to tasks; lead page performs deduplicated preview-only due reminders.
- ✅ Local install, TypeScript, production and single-file build pass; questionnaire end-to-end scenario passed (8.8s); screenshot captured.

The preview remains browser-local, synthetic and not production authorization/persistence. The server must enforce these domain commands and schedule reminders; no infrastructure or production configuration changed.

Regression run: **8 passed (18.2s)**. Final focused questionnaire run: **1 passed (9.4s)** after tightening submitted-reply locking. Production/preview builds pass; disk/subpath preview verification passes. Preview build now explicitly cleans its output before building so it cannot retain old production assets.
