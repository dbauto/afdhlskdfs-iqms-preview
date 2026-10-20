# ADR-030: Process cards with a cover (emoji by default, or a photo link)

20 October 2026. Danica asked for the Processes page to show processes as cards, each with a cover like a course website, and for an emoji to be the default when no photo is set. She chose the design ("A with covers") and approved this change.

## Decision

The Processes page shows one card per process instead of a table. A card has a cover, the status badge, the owner, band and clauses, a plain sentence about the last 12 weeks ("Overdue for 3 weeks", "No open issues for 12 weeks or more") with one square per week, and counts of documents and open nonconformities. Cards can be filtered by band.

Every process has a cover. A cover is one of:

- **Emoji:** one of 20 offered emojis on one of 6 background tints (each has a light and a dark value). Each process has a default emoji and tint, so no card is ever blank.
- **Photo link:** a full https:// link to an image, for example on SharePoint. ThryveMS stores the link only, never the image (D12). If the image can't load, the default emoji is shown instead of a broken picture.

The cover also shows as a banner at the top of the process page. People with Add and edit on Processes can change it from there; "Use the default" clears the choice. Changing a cover is logged as a process change.

Storage: `processes.cover` holds `{kind: "emoji", emoji, tint}` or `{kind: "photo", url}`, or nothing for the default. The server validates the emoji and tint against the offered lists and the URL with the same https link rules as other links.

## Not decided

Uploading a cover photo is not allowed: D12 permits stored files only for re-encoded logos. Allowing uploaded covers would need a new decision treating them like logos (type and size limits, re-encoding, R2 storage).

## Boundary

This changes the synthetic, browser-local preview and the matching backend specification text. It adds no server persistence, upload endpoint or production authorization. No deployment is authorized by this decision.
