# Baseline visual audit

These captures record the reset-state Product, Evaluation, and Decision surfaces for work order
003. `tests/e2e/baselineVisual.spec.ts` recreates every image and checks page overflow at the same
viewport.

| Viewport | Product | Evaluation | Decision |
| --- | --- | --- | --- |
| 390 x 900 | `product-390.png` | `evaluation-390.png` | `decision-390.png` |
| 768 x 900 | `product-768.png` | `evaluation-768.png` | `decision-768.png` |
| 1280 x 900 | `product-1280.png` | `evaluation-1280.png` | `decision-1280.png` |
| 1600 x 900 | `product-1600.png` | `evaluation-1600.png` | `decision-1600.png` |

All captures are full-page PNG files. The app content is deterministic; browser-local WebMCP
availability remains an honest environment-dependent status.
