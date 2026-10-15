# Audit stage 3a

- ✅ Typed collections for versioned checklists, assignments, responses/history, assessments, evidence verifications, clarification, findings and reports.
- ✅ Older checklists gain audit/version/mode fields and question defaults without losing edits. Missing collections initialize safely; guest expiry migrates from legacy profile data.
- ✅ Builder creates no record on open. Real edits persist and survive reload.
- ✅ Released versions are immutable through workflow commands. Revision requires a reason and creates another version; the old body stays unchanged.
- ✅ Response routing, respondent, evidence rules, configurable choices, N/A reasons, assessment requirement and conditional question visibility are configurable.
- ✅ Audit plans copy template content/version; new records use all-ID numbering. Auditor independence checks use explicit process membership and exclusions.
- ✅ Audit data follows assignments/process scope. Guest access expires and unrelated collections are narrowed. Ordinary CRUD cannot alter protected audit history.
- ✅ Local install, TypeScript, production and single-file preview builds pass.
- ✅ Seven focused/regression tests pass: builder recovery/version stability, figures/classification, navigation and responsive checks. Builder screenshot captured.

The preview stores synthetic data in this browser. Cross-device, transaction, tenant-isolation and real identity enforcement remain backend work; these are not represented as production security tests.
