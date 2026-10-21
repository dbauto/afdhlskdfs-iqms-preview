# ADR-035: The certification cycle is set in Settings, and pages animate in

21 October 2026. Danica found the Stage 1 and Stage 2 dates could not be set anywhere. She asked for:
- a mock audit;
- recertification without Stage 1;
- an entrance animation for pages.

## Decision

**Settings › Certification** (quality manager and administrator) holds:
- the certification body;
- the kind of audit coming next: initial certification, surveillance year 1, surveillance year 2, or recertification;
- the dates.

The dates are:
- an optional **mock audit**: a practice audit by the consultant or an outside auditor;
- **Stage 1**: for initial certification, and for recertification only when "Stage 1 needed" is on because of significant changes (ISO/IEC 17021-1);
- the **main audit**: Stage 2, surveillance, or recertification;
- **certificate expiry**, after the first certification.

What reads these settings:
- The Overview's readiness highlight shows today and these dates, and its badge counts down to the next audit, including the mock audit.
- Certification readiness shows the next two dates and names the certification body.
- Organization profile links here instead of keeping its own certification fields.
- The hard-coded sample dates and company name are gone.

**Page entrance.** When a page opens, from the menu or on refresh, its sections fade in and rise slightly, one after another, over about 300 ms. The readiness bar grows in from the left. With reduced motion on, nothing animates.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence or production authorization. No deployment is authorized by this decision.
