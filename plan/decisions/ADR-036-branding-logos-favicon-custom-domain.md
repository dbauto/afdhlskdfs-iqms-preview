# ADR-036: Branding logos for light and dark surfaces, browser icon, and custom domains

25 October 2026. Requested by Danica: ThryveMS is the default identity; a client's own logo replaces it once set in Settings › Branding. Clients upload a logo for light backgrounds, a logo for dark backgrounds and a browser icon (favicon). Danica also asked whether clients can use their own domain.

## Decision

- **Default identity is ThryveMS.** The sidebar shows the ThryveMS logo and no company name row. The version (light-surface or dark-surface artwork) follows the sidebar's own fill, not the page view, so it stays readable on a dark Brand sidebar in light view.
- **Company logos replace ThryveMS** at the top of the sidebar (expanded and the mobile menu). Three branding images, all optional:
  - Logo for light backgrounds.
  - Logo for dark backgrounds (dark sidebar and dark view). If only one logo is set, it is used on both.
  - Browser icon: square, at least 32 × 32 pixels. Used in the browser tab and the collapsed sidebar; without it the ThryveMS icon is used.
- **Same rules as the existing logo exception (D12):** PNG, JPEG or WebP up to 500 KB; SVG refused; re-encoded to PNG through the Cloudflare Images binding (the browser icon also to 32, 180 and 512 px squares); stored in R2 `iqms-brand` under the client prefix; only Owners and Administrators can change branding; each change is an audited branding version.
- **The shared sign-in page keeps the ThryveMS logo** (plan v3 §38: one sign-in serves every client). A client on its own custom domain may show its logo on sign-in later; that is a separate decision.

This extends the logo exception in D12 from one image to three branding images. It adds no general upload capability: controlled documents, evidence and records remain links only.

## Custom domains (answer to the question, no change)

Already in the approved architecture: D4 serves each client's UI and API from `https://<client>.iqms.ph` **or the client's custom domain**, and §3 budgets Cloudflare for SaaS custom hostnames (first 100 free). Per domain the work is: the client adds a CNAME (and a TXT record for certificate validation); provisioning registers the hostname, issues the certificate, adds the hostname to the deployment manifest, and registers the Entra redirect URI for that host. Session cookies are host-only (`__Host-`), so a custom domain gets its own sign-in. Effort: moderate, mostly in the provisioning runbook and a Settings page showing DNS status; not built in this change.

## Boundary

Browser-local preview only: images are kept as data URLs in the preview store. No server persistence, upload endpoint, R2 object or domain is created. No deployment is authorized by this decision.
