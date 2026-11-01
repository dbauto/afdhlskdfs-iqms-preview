# ADR-047: Microsoft Entra ID as a future sign-in provider in the console

Date: 1 Nov 2026 · Status: Accepted (front end); backend Pending

## Context
Plan v3 D7 chooses direct OpenID Connect with Microsoft Entra ID, one multi-tenant app registration per environment and a per-client tenant allow-list; D8–D9 keep WorkOS for people without Microsoft accounts and for platform staff. Nothing about Entra is configured yet, and Danica asked for the console to show this honestly without asking for credentials or subscriptions.

## Decision
- Console › Settings gains a **Sign-in providers** card (existing Card, Badge and KeyFacts; no new menu, no Settings redesign).
- **WorkOS: Available.** It stays the development sign-in.
- **Microsoft Entra ID: Not configured**, per environment (Sandbox, Staging, Production), with "Microsoft sign-in can be set up later".
- The card has no inputs and no connect or test buttons. Client IDs, certificates and secrets live only in the server's secret store; nothing goes in front-end code or browser storage.
- Status comes only from a backend validation record (`lib/identity-providers.ts`). The preview has no backend, so it always shows Not configured. **Connected** is shown only after the server has checked the app registration, signing keys and redirect addresses. Microsoft sign-in stays off unless Connected.
- Accounts are never created or linked by matching email (plan §5); linking needs both sign-ins in one flow.
- Client Settings › Integrations (Microsoft 365) and Sign-in and security are unchanged; this card does not repeat them.

## Backend (Pending)
Change management in thryvems-backend: platform-level provider configuration per environment (secret references only), per-client tenant authorization, a validation job and API that returns the record this card reads, audit events, permissions and tests. Linked from the frontend PR; not implemented here.
