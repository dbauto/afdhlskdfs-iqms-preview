# Subprocessors

These companies process personal data on our behalf to run ThryveMS. Each has a contract with data protection and security obligations no less protective than our Data Processing Agreement. We give at least 30 days’ notice before adding or replacing a subprocessor.

| Company | What they do for ThryveMS | Personal data involved | Where |
|---|---|---|---|
| **Cloudflare, Inc.** | Runs the ThryveMS application and web traffic, security filtering, the human check on sign-in, background jobs, temporary exports and logos, uploaded Public and Internal documents and evidence, inbound support email | All workspace data in transit; uploaded Public and Internal files for as long as their record is kept; logos; exports for up to 24 hours | Global edge network, usually Manila or Singapore; storage with an Asia-Pacific location hint |
| **Neon (Databricks, Inc.)** | Hosts each customer’s separate PostgreSQL database and its 30-day restore history | All stored workspace data | Singapore (Amazon Web Services `ap-southeast-1`) |
| **Amazon Web Services, Inc.** | Sends notification emails (Amazon SES); keeps encrypted backups and activity-log checkpoints (Amazon S3) | Names and email addresses in emails; encrypted backups | Singapore (`ap-southeast-1`) |
| **WorkOS, Inc.** | Email-and-password sign-in, two-step sign-in and passkeys for people who don’t use Microsoft 365 | Name, email, sign-in events | United States |

**Not subprocessors.** Microsoft processes sign-ins for people who use their company’s Microsoft 365 account. That relationship is between your company and Microsoft; ThryveMS only receives the sign-in result. Documents and evidence you link to stay in your own SharePoint or OneDrive; Confidential ones are always links.

**Optional, only if your company turns it on.**

| Company | What they do for ThryveMS | Personal data involved | Where |
|---|---|---|---|
| **Anthropic, PBC** | AI support: drafts replies to support reports from your people, which a ThryveMS staff member checks and sends | Support report text, technical details and screenshots a staff member has checked first; never workspace records | United States |

Other ThryveMS AI features are covered by the AI Features Addendum; their provider is added here before they’re turned on. Our AI security reviews read our own source code only and involve no personal data.

Last updated: 27 October 2026. Questions: privacy@iqms.ph.
