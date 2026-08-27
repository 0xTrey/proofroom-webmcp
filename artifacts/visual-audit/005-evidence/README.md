# Item 7 requirement and evidence workspace

These captures are generated from the built preview with:

```text
npm run capture:visual:evidence
```

Normal `npm run test:e2e` runs the same visual-state assertions without writing artifact files.
Northstar and Meridian Bank are fictional demonstration entities.

| Capture | Dimensions | State proved |
| --- | --- | --- |
| `evaluation-initial-1600.png` | 1600 by 6223 | Wide initial dossier with all six requirements unknown, the invariant, disclosure, selected detail, search, notes, and catalog. |
| `evaluation-initial-390.png` | 390 by 10700 | Narrow initial dossier rendered as stacked semantic records without horizontal overflow. |
| `evaluation-populated-1600.png` | 1600 by 6453 | Wide canonical review set with the exact six derived statuses and authoritative attachment feedback. |
| `evaluation-populated-390.png` | 390 by 11173 | Narrow canonical review set with readable status marks, counts, and selected proof detail. |
| `evidence-inspector-ev-011-1600.png` | 1600 by 900 | The portal-owned layer equals the wide viewport. The panel begins in the viewport, contains the complete testimonial sentence inside quarantine, and scrolls internally without a trailing route canvas. |
| `evidence-inspector-ev-011-390.png` | 390 by 900 | The portal-owned layer equals the narrow viewport. The visible close control and readable quarantine begin in the viewport, with remaining content available through internal panel scrolling and no trailing route canvas. |
| `eu-unknown-detail-1600.png` | 1598 by 1203 | Wide EU detail after `ev_007` and `ev_008`, with unknown status and both open hard conditions. |
| `eu-unknown-detail-390.png` | 390 by 1940 | Narrow EU detail after canonical attachment, with both evidence records and both gaps visible. |

The captures are evidence for the current milestone only. They do not mark checklist acceptance.
