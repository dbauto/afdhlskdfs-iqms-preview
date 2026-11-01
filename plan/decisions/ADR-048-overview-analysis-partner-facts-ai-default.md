# ADR-048: Overview analyzed on request; partners never see deployment facts; AI support off by default

Date: 1 Nov 2026 · Status: Accepted by Danica (front end); backend designs in thryvems-backend `architecture/amendments/decisions-20261101/designs.md`

## Context
Danica decided the Overview is not real time: it shows figures from an analysis the person runs with a button (backend COV-21). The backend review also found two preview defects: the console organisation page showed Deployment facts to business partners (UI29-12), and AI support defaulted on (UI29-13), against plan v3 D20 and the owner decision that partners are a separate principal type (backend ADR-004 D-5).

## Decision
- **Overview:** the header shows "Last analyzed <date>, <time>" and an **Analyze latest data** button (existing outline Button, refresh icon). The page, its readiness card, milestone strip and personal actions use the last analysis; later changes don't move them until the person analyzes again. One analysis per person and role. In the preview it is kept in memory only, and the sample workspace starts with one analysis taken when the preview opens. Links still open the live record. Other pages are unchanged.
- **Partners:** the organisation page hides the Deployment card (release, channel, database, backup check, health) for business partners; they see Subscription and the rest as before.
- **AI support:** off unless a platform admin turns it on.

No new menu items, colours or component styles.
