# Item 9 recovery visual audit

Capture only this milestone with:

```text
npm run capture:visual:recovery
```

Screenshot writes occur only when `UPDATE_VISUAL_AUDIT=1`, which the package script sets. Normal
end-to-end and accessibility commands do not write artifacts.

## Captured states

| File | Dimensions | Literal visible state |
| --- | --- | --- |
| `populated-ledger-1600.png` | 1600 by 900 | Desktop authoritative activity register after buyer-context approval and the six-action fictional review set. |
| `populated-ledger-390.png` | 390 by 900 | Mobile stacked activity records from the same populated authoritative ledger. |
| `reset-confirmation-1600.png` | 1600 by 900 | Desktop in-app reset dialog with the complete removed and retained state lists. |
| `reset-confirmation-390.png` | 390 by 900 | Mobile in-app reset dialog with the same consequences and confirmation controls. |
| `invalid-state-recovery-1600.png` | 1600 by 900 | Desktop invalid-state recovery panel showing the canonical fixture, typed notice code, UTC detection time, and explicit continue action. |
| `invalid-state-recovery-390.png` | 390 by 900 | Mobile invalid-state recovery panel with the same safe recovery state. |
| `successful-reset-receipt-1600.png` | 1600 by 900 | Desktop non-authoritative reset confirmation with receipt metadata, six requirements, twelve evidence records, and revision zero. |
| `successful-reset-receipt-390.png` | 390 by 900 | Mobile non-authoritative reset confirmation with the same canonical counts and receipt metadata. |
