# Using questionnaires and auditor checklists

The checklist is the auditor's work plan. The questionnaire collects auditees' answers. They share versioned questions, while auditee responses and auditor assessments are separate records.

1. Open **Audits**, plan or open an audit, then open **Checklist**. The lead and assigned audit team can prepare it; administrators and quality managers can help prepare it. Only that audit's lead can mark it ready.
2. Add sections and questions. Edit question text and choices directly in the main column. Open the question’s **⋯** button for **Question settings**. **Text notes** is a multiline open-ended answer. **Multiple choice** and **Yes / No / N/A** use radio buttons. **Multiple select** uses checkboxes; enter one choice per line. **Answer required** is separate from evidence requirements.
3. Turn on **Use pre-audit questionnaire**. For each question people should answer, choose **Auditee** or **Both** under **Who should respond?**. Set **Allow evidence links** off, or set links to Optional, Required or When No. The answer preview shows the actual answer control.
4. The lead selects **Mark checklist ready**. A released version is read-only; **Start checklist revision** retains it and makes a separate version. Released questions and their settings remain readable. **Open checklist** opens the chosen saved version read-only; **Edit draft** opens only the latest editable draft.
5. Open **Questionnaires**. Choose a workspace respondent, questions and deadline, then select **Assign questionnaire**. Repeat for other respondents. Each person's answers and progress stay separate. Their Overview and notification link open their own assignment, including when it is outside their usual process scope.
6. Respondents answer, add allowed HTTPS evidence links and submit. Required answers/evidence and N/A reasons are checked. Submitted answers are read-only; auditors can request clarification and respondents can revise only the requested questions. Earlier submitted versions remain available.
7. The assigned auditor opens **Conduct audit**, selects a checklist question, reads relevant responses and records an assessment, objective evidence, sampling/interview details and notes. **Use response as evidence** links the exact submitted version. The response can be opened in a new tab without losing the assessment draft. Verification of the response or its links is a separate deliberate decision.
8. Tick **Checklist item completed** after recording the assessment, or select **Complete assessment**. A checked box means the examination is complete. Conforms, Observation, Minor nonconformity, Major nonconformity and Not applicable describe its result. Invalid completion remains unchecked with an explanation. Reassessment appends history rather than replacing another contribution.
9. Raise an observation or nonconformity finding from the completed assessment. **Raise corrective action** opens the existing nonconformity form; creation links one durable case to the finding. Retrying cannot create another case. Findings appear in the audit, the Findings tab and management review sources.

## Respondents without workspace accounts

The lead can prepare a **Questionnaire-only invitation** or an **Interview recorded by auditor** from the questionnaire page. An interview visibly records both the respondent and the person entering their answers.

**Open respondent preview** demonstrates the invitation journey with synthetic data in the same browser. It has no workspace navigation or evidence-library picker, accepts HTTPS links only, and is revoked/expired when the invitation is. Its identity is labelled **Unverified preview**. It sends no email or code and does not provide a secure, cross-device invitation. Name and email alone are not proof of identity.

Production invitations require the provider-backed verification, restricted membership/session and server enforcement described in ADR-023. That integration and the unfinished versioned report/consolidation workflow remain separate backend/audit-stage work. Report issuance is disabled rather than displaying a false successful issue.

## Reusable checklist templates

Open **Audits → Checklist templates**. Each row has **Open checklist** to read its saved questions and **Edit questions** for people with Add and edit permission on Audits. The existing **Edit** action still edits the name, process and keeper. A new template starts empty; open **Edit questions**, then **Add section** and **Add question**.

Template questions use the same inline editor and **⋯ Question settings** as audit checklists. The question count comes from the saved questions. Template edits and duplicates retain their content. Planning an audit copies the template’s questions, version and questionnaire setting; later template changes leave that audit’s copy unchanged.

On an audit, the **Checklist** card lists saved versions. **Open checklist** opens that exact version, and **Edit draft** is available for the current draft when permitted. A missing version link shows the existing not-found screen instead of silently opening a different version. Only the lead can start or release a revision; administrators can help edit permitted drafts.
