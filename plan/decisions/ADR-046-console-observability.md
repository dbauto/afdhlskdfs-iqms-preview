# ADR-046: Console observability: usage, capacity, errors, alerts and health

Date: 1 Nov 2026 · Status: Accepted (front end); backend Pending

## Context
The platform console showed one 30-day speed line, a weekly database load per organisation, logs and six jobs. Developers could not see who is using ThryveMS, whether we are near a limit, which services are busiest, which errors are new, or the health of integrations, backups and releases.

## Decision
Three pages under Operations, approved by Danica on 1 Nov 2026 (design "Developer observability"), adding three menu items under Operations:
- **Usage and capacity** (`/platform/usage`): active now, peak, daily, weekly and monthly active users; active users per hour against the 4-week average and tested capacity; capacity and bottlenecks against the plan's targets and limits; most used services; busiest organisations against the 50-person load test.
- **Errors and alerts** (`/platform/errors`): open alerts with acknowledge and snooze, alert rules, server errors per hour with releases marked, error groups (new, recurring, resolved) and a request trace.
- **Health** (`/platform/health`): health by organisation, integrations, backups, restore tests and migrations, sign-in failures and permission denials, releases and health.

Same permission as Logs (`logs.view`); acknowledge and snooze need `deploy`. Counts and IDs only, never record contents.

## Backend (Pending)
A platform `metrics_minute` table filled once a minute from each client deployment (sessions active in the last 5 minutes, request counts and latency by service, queue delay, dead letters, export counts, rate-limit hits), Workers analytics and Neon metrics; error fingerprints and alert events in the platform database; integration checks every 5 minutes; kept 13 months.
