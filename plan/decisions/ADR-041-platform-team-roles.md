# ADR-041: Platform team roles and permissions

27 October 2026. Requested by Danica: when the developer invites a team member there must be roles and permissions. A co-admin sees clients and requests but has no deploy button; deploying is regulated by the developer. Co-admins can't add members above their own privilege. There is also an admin support role.

## Roles (fixed templates)
| Permission | Developer | Co-admin | Admin support |
|---|---|---|---|
| See organisations | ✓ | ✓ | ✓ |
| Change plans and features | ✓ | ✓ | — |
| Decide requests | ✓ | ✓ | — |
| **Deploy and roll back** (sandboxes, promote, deploy, roll back, approve AI-agent fixes) | ✓ | — | — |
| See finance | ✓ | ✓ | — |
| Government reports | ✓ | ✓ | — |
| See security scans / start AI reviews | ✓ | ✓ | — |
| Handle support reports / ask for support access | ✓ | ✓ | ✓ |
| See logs and jobs | ✓ | ✓ | ✓ |
| Manage AI assistants (keys, models, prompts, budgets, AI support switch) | ✓ | — | — |
| Add and change team members | ✓ | ✓ (up to Co-admin) | — |

- Rank Developer > Co-admin > Admin support. A member can only give roles up to their own and can only change or remove members at or below their own role, never themselves.
- Controls a role lacks are not shown (no disabled deploy buttons for co-admins); pages a role lacks answer "not found", like hidden records.
- Preview: "View as" in the console top bar switches the signed-in member. Production: the server checks the permission on every request; role changes advance the member's authorisation epoch so open sessions refresh; invitations expire after 7 days; sign-in stays WorkOS passkey behind Cloudflare Access (D9).

## Backend impact (Pending)
| Area | Change | Status |
|---|---|---|
| Platform DB | `platform_principals.role`, `platform_role_permissions` (fixed seed), `platform_invitations` (role, expiry, invited_by), audit events for invite, role change, removal | New / changed |
| API | permission middleware on every platform route; deploy, promote, rollback and fix-approval routes require `deploy`; invite/role change enforce the rank ceiling | New |
| Tests | rank ceiling, self-change refused, co-admin deploy routes 403, admin support finance 404; e2e in this PR | New |
