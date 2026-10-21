# ADR-033: Profile photos, from Microsoft 365 or uploaded

21 October 2026. Danica found there was no way to add a profile photo and chose both options: use each person's Microsoft 365 photo by default, and let them upload their own.

## Decision

- **Default: the Microsoft 365 photo.** At sign-in the backend fetches the person's photo from Microsoft Graph (`/me/photo/$value`) and keeps a re-encoded 256 × 256 JPEG. It refreshes at the next sign-in. With no Microsoft photo, initials show.
- **Optional: upload a photo.** In Profile and security, the person can upload a JPG, PNG or WebP up to 5 MB. The server crops it to a square and re-encodes it to a 256 × 256 JPEG through the Cloudflare Images binding, like logos. The original file is never kept, and neither is its metadata.
- People can switch back to the Microsoft photo or remove their photo (initials).
- A photo that can't load falls back to initials.
- Photos show wherever initials show today.

This is the second exception to D12 (links only), after logos. Profile photos are stored in R2 `iqms-brand` beside logos, under the same type, size and re-encoding rules.

The preview can't call Microsoft Graph, so it shows initials for "Microsoft 365 photo". It re-encodes uploads in the browser and keeps them with the sample data.

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence, upload endpoint or production authorization. No deployment is authorized by this decision.
