# Privacy Impact Assessment: ThryveMS service

| | |
|---|---|
| Version | 1.0 draft, 14 October 2026 |
| Prepared by | [DPO name] with Danica Marie Boton |
| Approved by | Managing Director |
| Review | Before launch, yearly, and after major changes |

## 1. Description

ThryveMS is an online ISO 9001 quality management system for Philippine companies. Each customer has its own deployment and database in Singapore. Users sign in with Microsoft 365 or with email and password (WorkOS). The service stores records about the customer’s quality system and links to documents kept in the customer’s own SharePoint or OneDrive.

## 2. Personal data flows

| Flow | Data | From → to | Location |
|---|---|---|---|
| Sign-in (Microsoft) | Name, email, tenant and object ids | Microsoft Entra → client Worker | Edge (Manila/Singapore) |
| Sign-in (email) | Name, email, password (WorkOS only), MFA factors | User → WorkOS → client Worker | United States, then Singapore |
| Workspace records | Names, roles, records, comments, activity log | Browser → client Worker → Neon | Singapore |
| Notifications | Name, email, record type and number | Client Worker → Amazon SES → user | Singapore |
| Backups | Whole database, encrypted | Neon → S3 Object Lock | Singapore |
| Support report | Text written by the user; diagnostics only if opted in | Browser → client DB; summary → platform DB | Singapore |
| Support access | Records the engineer opens (read-only, no confidential) | Client DB → engineer’s browser | Philippines (staff) |

## 3. Risks and controls

| Risk | Likelihood | Impact | Controls | Residual |
|---|---|---|---|---|
| One customer sees another’s data | Low | High | Separate database and deployment; fixed binding; organisation checks; isolation tests on every change | Low |
| Account takeover of an administrator | Medium | High | Mandatory MFA; Microsoft Conditional Access; lockout; session limits; re-authentication for sensitive actions | Low |
| ThryveMS staff misuse | Low | High | Support grants only; read-only; logged under real name; monthly review | Low |
| Personal data in record titles reaches emails or counts | Medium | Medium | Emails show type and number only; no hidden-count messages; classification guidance in the Acceptable Use Policy | Low |
| Transfer to the United States (WorkOS) | Certain for email users | Low | Only sign-in data; WorkOS DPA; disclosed in Privacy Notice; Microsoft users don’t use WorkOS | Low |
| Over-retention | Medium | Medium | Customer retention rules with nightly deletion; backups expire in 35 days | Low |
| Sensitive personal information entered by users | Low | High | Acceptable Use Policy; guidance in forms; customer DPO responsibility | Medium (accepted, monitored) |
| Support diagnostics leak data | Low | Medium | Opt-in, unticked by default, exact bundle shown, no record contents | Low |

## 4. Data subject rights

Self-service in Settings › Privacy (download, correct, delete request); DPO workflow for the customer; ThryveMS forwards direct requests within 5 working days.

## 5. Conclusion

Processing is proportionate to running a quality management system. Remaining actions before launch: appoint and publish the DPO, complete NPC registration assessment, legal review of the customer documents, penetration test, and the first restore test.
