# Independent audit forms: before and after

16 October 2026. Baseline: main `efbc82799b9506d6a798d759f99806f66e803288`; final source: `feat/audit-forms-collaboration`. Synthetic fixtures only.

192 screenshots cover six screens, Maria Santos (quality manager) / Joy Aquino (narrower process owner and assigned respondent), light/dark and the four required viewports: 1440×900; 1280×650 at 150% zoom equivalent (853×433 CSS pixels, DPR 1.5); 768×1024; 390×844. All captures assert loaded Public Sans, requested theme, no page overflow and contained dialogs. Wide tables retain internal scrolling.

The after fixture has four independent forms (two draft/review checklists, one released questionnaire, one released checklist). Main supports one checklist family: the baseline retains the common questionnaire and respondent assignment. New settings/copy/review controls are absent on main. For restricted roles, captures intentionally show actual denied pages or only assigned responses. Counts reflect authorized records. The review capture scrolls to the new Review and completion panel; baseline shows the existing builder.

[Machine-readable comparison matrix](comparison-matrix.json). The test also checks widths 390/768/1280/1920 and desktop zoom-equivalent widths 1600/1024/640 with unsaved Sheet-text recovery. No application zoom/root-font/transform override is introduced.

| Screen | Person | Theme | View | Before | After |
|---|---|---|---|---|---|
| audit | Maria | light | 1440 | [Before](before-audit-p-ms-light-1440.jpg) | [After](after-audit-p-ms-light-1440.jpg) |
| audit | Maria | light | 1280-zoom150 | [Before](before-audit-p-ms-light-1280-zoom150.jpg) | [After](after-audit-p-ms-light-1280-zoom150.jpg) |
| audit | Maria | light | 768 | [Before](before-audit-p-ms-light-768.jpg) | [After](after-audit-p-ms-light-768.jpg) |
| audit | Maria | light | 390 | [Before](before-audit-p-ms-light-390.jpg) | [After](after-audit-p-ms-light-390.jpg) |
| audit | Maria | dark | 1440 | [Before](before-audit-p-ms-dark-1440.jpg) | [After](after-audit-p-ms-dark-1440.jpg) |
| audit | Maria | dark | 1280-zoom150 | [Before](before-audit-p-ms-dark-1280-zoom150.jpg) | [After](after-audit-p-ms-dark-1280-zoom150.jpg) |
| audit | Maria | dark | 768 | [Before](before-audit-p-ms-dark-768.jpg) | [After](after-audit-p-ms-dark-768.jpg) |
| audit | Maria | dark | 390 | [Before](before-audit-p-ms-dark-390.jpg) | [After](after-audit-p-ms-dark-390.jpg) |
| audit | Joy | light | 1440 | [Before](before-audit-p-ja-light-1440.jpg) | [After](after-audit-p-ja-light-1440.jpg) |
| audit | Joy | light | 1280-zoom150 | [Before](before-audit-p-ja-light-1280-zoom150.jpg) | [After](after-audit-p-ja-light-1280-zoom150.jpg) |
| audit | Joy | light | 768 | [Before](before-audit-p-ja-light-768.jpg) | [After](after-audit-p-ja-light-768.jpg) |
| audit | Joy | light | 390 | [Before](before-audit-p-ja-light-390.jpg) | [After](after-audit-p-ja-light-390.jpg) |
| audit | Joy | dark | 1440 | [Before](before-audit-p-ja-dark-1440.jpg) | [After](after-audit-p-ja-dark-1440.jpg) |
| audit | Joy | dark | 1280-zoom150 | [Before](before-audit-p-ja-dark-1280-zoom150.jpg) | [After](after-audit-p-ja-dark-1280-zoom150.jpg) |
| audit | Joy | dark | 768 | [Before](before-audit-p-ja-dark-768.jpg) | [After](after-audit-p-ja-dark-768.jpg) |
| audit | Joy | dark | 390 | [Before](before-audit-p-ja-dark-390.jpg) | [After](after-audit-p-ja-dark-390.jpg) |
| settings | Maria | light | 1440 | [Before](before-settings-p-ms-light-1440.jpg) | [After](after-settings-p-ms-light-1440.jpg) |
| settings | Maria | light | 1280-zoom150 | [Before](before-settings-p-ms-light-1280-zoom150.jpg) | [After](after-settings-p-ms-light-1280-zoom150.jpg) |
| settings | Maria | light | 768 | [Before](before-settings-p-ms-light-768.jpg) | [After](after-settings-p-ms-light-768.jpg) |
| settings | Maria | light | 390 | [Before](before-settings-p-ms-light-390.jpg) | [After](after-settings-p-ms-light-390.jpg) |
| settings | Maria | dark | 1440 | [Before](before-settings-p-ms-dark-1440.jpg) | [After](after-settings-p-ms-dark-1440.jpg) |
| settings | Maria | dark | 1280-zoom150 | [Before](before-settings-p-ms-dark-1280-zoom150.jpg) | [After](after-settings-p-ms-dark-1280-zoom150.jpg) |
| settings | Maria | dark | 768 | [Before](before-settings-p-ms-dark-768.jpg) | [After](after-settings-p-ms-dark-768.jpg) |
| settings | Maria | dark | 390 | [Before](before-settings-p-ms-dark-390.jpg) | [After](after-settings-p-ms-dark-390.jpg) |
| settings | Joy | light | 1440 | [Before](before-settings-p-ja-light-1440.jpg) | [After](after-settings-p-ja-light-1440.jpg) |
| settings | Joy | light | 1280-zoom150 | [Before](before-settings-p-ja-light-1280-zoom150.jpg) | [After](after-settings-p-ja-light-1280-zoom150.jpg) |
| settings | Joy | light | 768 | [Before](before-settings-p-ja-light-768.jpg) | [After](after-settings-p-ja-light-768.jpg) |
| settings | Joy | light | 390 | [Before](before-settings-p-ja-light-390.jpg) | [After](after-settings-p-ja-light-390.jpg) |
| settings | Joy | dark | 1440 | [Before](before-settings-p-ja-dark-1440.jpg) | [After](after-settings-p-ja-dark-1440.jpg) |
| settings | Joy | dark | 1280-zoom150 | [Before](before-settings-p-ja-dark-1280-zoom150.jpg) | [After](after-settings-p-ja-dark-1280-zoom150.jpg) |
| settings | Joy | dark | 768 | [Before](before-settings-p-ja-dark-768.jpg) | [After](after-settings-p-ja-dark-768.jpg) |
| settings | Joy | dark | 390 | [Before](before-settings-p-ja-dark-390.jpg) | [After](after-settings-p-ja-dark-390.jpg) |
| approval | Maria | light | 1440 | [Before](before-approval-p-ms-light-1440.jpg) | [After](after-approval-p-ms-light-1440.jpg) |
| approval | Maria | light | 1280-zoom150 | [Before](before-approval-p-ms-light-1280-zoom150.jpg) | [After](after-approval-p-ms-light-1280-zoom150.jpg) |
| approval | Maria | light | 768 | [Before](before-approval-p-ms-light-768.jpg) | [After](after-approval-p-ms-light-768.jpg) |
| approval | Maria | light | 390 | [Before](before-approval-p-ms-light-390.jpg) | [After](after-approval-p-ms-light-390.jpg) |
| approval | Maria | dark | 1440 | [Before](before-approval-p-ms-dark-1440.jpg) | [After](after-approval-p-ms-dark-1440.jpg) |
| approval | Maria | dark | 1280-zoom150 | [Before](before-approval-p-ms-dark-1280-zoom150.jpg) | [After](after-approval-p-ms-dark-1280-zoom150.jpg) |
| approval | Maria | dark | 768 | [Before](before-approval-p-ms-dark-768.jpg) | [After](after-approval-p-ms-dark-768.jpg) |
| approval | Maria | dark | 390 | [Before](before-approval-p-ms-dark-390.jpg) | [After](after-approval-p-ms-dark-390.jpg) |
| approval | Joy | light | 1440 | [Before](before-approval-p-ja-light-1440.jpg) | [After](after-approval-p-ja-light-1440.jpg) |
| approval | Joy | light | 1280-zoom150 | [Before](before-approval-p-ja-light-1280-zoom150.jpg) | [After](after-approval-p-ja-light-1280-zoom150.jpg) |
| approval | Joy | light | 768 | [Before](before-approval-p-ja-light-768.jpg) | [After](after-approval-p-ja-light-768.jpg) |
| approval | Joy | light | 390 | [Before](before-approval-p-ja-light-390.jpg) | [After](after-approval-p-ja-light-390.jpg) |
| approval | Joy | dark | 1440 | [Before](before-approval-p-ja-dark-1440.jpg) | [After](after-approval-p-ja-dark-1440.jpg) |
| approval | Joy | dark | 1280-zoom150 | [Before](before-approval-p-ja-dark-1280-zoom150.jpg) | [After](after-approval-p-ja-dark-1280-zoom150.jpg) |
| approval | Joy | dark | 768 | [Before](before-approval-p-ja-dark-768.jpg) | [After](after-approval-p-ja-dark-768.jpg) |
| approval | Joy | dark | 390 | [Before](before-approval-p-ja-dark-390.jpg) | [After](after-approval-p-ja-dark-390.jpg) |
| responses | Maria | light | 1440 | [Before](before-responses-p-ms-light-1440.jpg) | [After](after-responses-p-ms-light-1440.jpg) |
| responses | Maria | light | 1280-zoom150 | [Before](before-responses-p-ms-light-1280-zoom150.jpg) | [After](after-responses-p-ms-light-1280-zoom150.jpg) |
| responses | Maria | light | 768 | [Before](before-responses-p-ms-light-768.jpg) | [After](after-responses-p-ms-light-768.jpg) |
| responses | Maria | light | 390 | [Before](before-responses-p-ms-light-390.jpg) | [After](after-responses-p-ms-light-390.jpg) |
| responses | Maria | dark | 1440 | [Before](before-responses-p-ms-dark-1440.jpg) | [After](after-responses-p-ms-dark-1440.jpg) |
| responses | Maria | dark | 1280-zoom150 | [Before](before-responses-p-ms-dark-1280-zoom150.jpg) | [After](after-responses-p-ms-dark-1280-zoom150.jpg) |
| responses | Maria | dark | 768 | [Before](before-responses-p-ms-dark-768.jpg) | [After](after-responses-p-ms-dark-768.jpg) |
| responses | Maria | dark | 390 | [Before](before-responses-p-ms-dark-390.jpg) | [After](after-responses-p-ms-dark-390.jpg) |
| responses | Joy | light | 1440 | [Before](before-responses-p-ja-light-1440.jpg) | [After](after-responses-p-ja-light-1440.jpg) |
| responses | Joy | light | 1280-zoom150 | [Before](before-responses-p-ja-light-1280-zoom150.jpg) | [After](after-responses-p-ja-light-1280-zoom150.jpg) |
| responses | Joy | light | 768 | [Before](before-responses-p-ja-light-768.jpg) | [After](after-responses-p-ja-light-768.jpg) |
| responses | Joy | light | 390 | [Before](before-responses-p-ja-light-390.jpg) | [After](after-responses-p-ja-light-390.jpg) |
| responses | Joy | dark | 1440 | [Before](before-responses-p-ja-dark-1440.jpg) | [After](after-responses-p-ja-dark-1440.jpg) |
| responses | Joy | dark | 1280-zoom150 | [Before](before-responses-p-ja-dark-1280-zoom150.jpg) | [After](after-responses-p-ja-dark-1280-zoom150.jpg) |
| responses | Joy | dark | 768 | [Before](before-responses-p-ja-dark-768.jpg) | [After](after-responses-p-ja-dark-768.jpg) |
| responses | Joy | dark | 390 | [Before](before-responses-p-ja-dark-390.jpg) | [After](after-responses-p-ja-dark-390.jpg) |
| conduct | Maria | light | 1440 | [Before](before-conduct-p-ms-light-1440.jpg) | [After](after-conduct-p-ms-light-1440.jpg) |
| conduct | Maria | light | 1280-zoom150 | [Before](before-conduct-p-ms-light-1280-zoom150.jpg) | [After](after-conduct-p-ms-light-1280-zoom150.jpg) |
| conduct | Maria | light | 768 | [Before](before-conduct-p-ms-light-768.jpg) | [After](after-conduct-p-ms-light-768.jpg) |
| conduct | Maria | light | 390 | [Before](before-conduct-p-ms-light-390.jpg) | [After](after-conduct-p-ms-light-390.jpg) |
| conduct | Maria | dark | 1440 | [Before](before-conduct-p-ms-dark-1440.jpg) | [After](after-conduct-p-ms-dark-1440.jpg) |
| conduct | Maria | dark | 1280-zoom150 | [Before](before-conduct-p-ms-dark-1280-zoom150.jpg) | [After](after-conduct-p-ms-dark-1280-zoom150.jpg) |
| conduct | Maria | dark | 768 | [Before](before-conduct-p-ms-dark-768.jpg) | [After](after-conduct-p-ms-dark-768.jpg) |
| conduct | Maria | dark | 390 | [Before](before-conduct-p-ms-dark-390.jpg) | [After](after-conduct-p-ms-dark-390.jpg) |
| conduct | Joy | light | 1440 | [Before](before-conduct-p-ja-light-1440.jpg) | [After](after-conduct-p-ja-light-1440.jpg) |
| conduct | Joy | light | 1280-zoom150 | [Before](before-conduct-p-ja-light-1280-zoom150.jpg) | [After](after-conduct-p-ja-light-1280-zoom150.jpg) |
| conduct | Joy | light | 768 | [Before](before-conduct-p-ja-light-768.jpg) | [After](after-conduct-p-ja-light-768.jpg) |
| conduct | Joy | light | 390 | [Before](before-conduct-p-ja-light-390.jpg) | [After](after-conduct-p-ja-light-390.jpg) |
| conduct | Joy | dark | 1440 | [Before](before-conduct-p-ja-dark-1440.jpg) | [After](after-conduct-p-ja-dark-1440.jpg) |
| conduct | Joy | dark | 1280-zoom150 | [Before](before-conduct-p-ja-dark-1280-zoom150.jpg) | [After](after-conduct-p-ja-dark-1280-zoom150.jpg) |
| conduct | Joy | dark | 768 | [Before](before-conduct-p-ja-dark-768.jpg) | [After](after-conduct-p-ja-dark-768.jpg) |
| conduct | Joy | dark | 390 | [Before](before-conduct-p-ja-dark-390.jpg) | [After](after-conduct-p-ja-dark-390.jpg) |
| copy | Maria | light | 1440 | [Before](before-copy-p-ms-light-1440.jpg) | [After](after-copy-p-ms-light-1440.jpg) |
| copy | Maria | light | 1280-zoom150 | [Before](before-copy-p-ms-light-1280-zoom150.jpg) | [After](after-copy-p-ms-light-1280-zoom150.jpg) |
| copy | Maria | light | 768 | [Before](before-copy-p-ms-light-768.jpg) | [After](after-copy-p-ms-light-768.jpg) |
| copy | Maria | light | 390 | [Before](before-copy-p-ms-light-390.jpg) | [After](after-copy-p-ms-light-390.jpg) |
| copy | Maria | dark | 1440 | [Before](before-copy-p-ms-dark-1440.jpg) | [After](after-copy-p-ms-dark-1440.jpg) |
| copy | Maria | dark | 1280-zoom150 | [Before](before-copy-p-ms-dark-1280-zoom150.jpg) | [After](after-copy-p-ms-dark-1280-zoom150.jpg) |
| copy | Maria | dark | 768 | [Before](before-copy-p-ms-dark-768.jpg) | [After](after-copy-p-ms-dark-768.jpg) |
| copy | Maria | dark | 390 | [Before](before-copy-p-ms-dark-390.jpg) | [After](after-copy-p-ms-dark-390.jpg) |
| copy | Joy | light | 1440 | [Before](before-copy-p-ja-light-1440.jpg) | [After](after-copy-p-ja-light-1440.jpg) |
| copy | Joy | light | 1280-zoom150 | [Before](before-copy-p-ja-light-1280-zoom150.jpg) | [After](after-copy-p-ja-light-1280-zoom150.jpg) |
| copy | Joy | light | 768 | [Before](before-copy-p-ja-light-768.jpg) | [After](after-copy-p-ja-light-768.jpg) |
| copy | Joy | light | 390 | [Before](before-copy-p-ja-light-390.jpg) | [After](after-copy-p-ja-light-390.jpg) |
| copy | Joy | dark | 1440 | [Before](before-copy-p-ja-dark-1440.jpg) | [After](after-copy-p-ja-dark-1440.jpg) |
| copy | Joy | dark | 1280-zoom150 | [Before](before-copy-p-ja-dark-1280-zoom150.jpg) | [After](after-copy-p-ja-dark-1280-zoom150.jpg) |
| copy | Joy | dark | 768 | [Before](before-copy-p-ja-dark-768.jpg) | [After](after-copy-p-ja-dark-768.jpg) |
| copy | Joy | dark | 390 | [Before](before-copy-p-ja-dark-390.jpg) | [After](after-copy-p-ja-dark-390.jpg) |
