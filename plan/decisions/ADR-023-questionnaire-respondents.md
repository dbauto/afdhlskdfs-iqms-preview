# ADR-023: Questionnaire responses and auditor checklist evidence

15 October 2026. Product decision: Danica approved implementation in the project conversation after reviewing the form controls, completion checkbox, separate responses and questionnaire-only invitations.

## Decision

- Keep the existing UI, routes, design tokens and menu. The checklist builder also prepares the questionnaire; its help text and the questionnaire page explain the relationship.
- Text notes are multiline open-ended answers. Multiple choice and Yes / No / N/A use radio buttons. Multiple select uses checkboxes with an explicit array of selected values. Evidence links can be disabled, optional, required or conditional on No; answer-required is independent.
- Each auditee has a version-pinned assignment and independent responses. Identity is a stable respondent or membership ID, never a typed name or matching email. A respondent cannot read another respondent's answers, assessments, findings or reports.
- Submission freezes an append-only numbered response snapshot. Clarification can revise only requested answers; resubmission creates another snapshot. Auditor evidence references bind a response ID and submission revision, not the mutable latest answer. A response is supporting evidence, not an automatic conformity decision.
- Auditor assessments remain separate and attributable. The completion checkbox saves a validated Completed assessment; clearing it adds a Draft assessment and preserves prior history. Completion means the check was performed; Conforms/Observation/Minor NC/Major NC/Not applicable is a separate result. Assignment, independence, module, classification and expiry checks still apply.
- People without full workspace accounts receive questionnaire-only invitations. Verified production access uses the existing identity adapter and WorkOS (D8), an active restricted local membership, and the exact assignment scope. No password or general workspace access is required. Email/name alone is not verified identity. Revocation/expiry blocks the next read or write.
- An auditor may record interview answers on behalf of a named respondent. Store respondent identity and the recording auditor separately and visibly label the provenance. Never represent an interview as a verified self-submission.

## Security and production boundary

Production requires server-managed invitations, email verification through the configured identity provider, rate limits, hashed single-use random invitation tokens, short-lived secure sessions, server-side authorization and durable transactions/history. No bearer credential belongs in localStorage or a long-lived URL. Verification never activates an unapproved membership or widens process/classification access. Confidential content still needs an explicit permitted grant; Highly confidential sharing still needs the owner's approval. Invitation pages reveal no questions or metadata until identity and invitation checks pass. Evidence selectors must not reveal the library, restricted document names or other answers to invited respondents. Files remain external HTTPS links; there are no uploads or arbitrary URL fetches.

## What this repository implements

This repository remains the synthetic browser-only preview described in plan §5. It implements the builder, separate submissions and immutable response versions, auditor assessment/checkbox, evidence references, interview attribution, invitation expiry/revocation and an isolated **Open respondent preview** route. The latter has no workspace shell, accepts HTTPS evidence links only, and projects only the invitation's question set and responses. It displays **Unverified preview** and never claims to send an email, check a code or verify an identity. Invitation IDs in the preview are sample record identifiers, not security credentials. The preview works in one browser's sample data, not across real recipients/devices.

Actual external delivery, email verification, server sessions and persistent cross-user access are blocked on plan phases 0–1/4. Do not expose the preview route or its browser-local storage as a production authentication mechanism. When the API is connected, remove the preview adapter and require the verified server capability; fail closed while unavailable. This decision does not authorize a merge or production deployment.
