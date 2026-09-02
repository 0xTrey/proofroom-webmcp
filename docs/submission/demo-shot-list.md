# ProofRoom demo shot list

> Local preparation only. Authenticated Devpost project `1402028` exists as an Untitled, empty
> pre-draft shell. It has no video and has not been submitted.

This plan matches the 2:35 to 2:45 target in [`demo-script.md`](demo-script.md) and ends at 2:45.
All product entities and claims shown on screen are fictional demo content.

## Capture setup

### Rehearsal now (local candidate)

Use the current local candidate at `http://127.0.0.1:4181` or the configured Playwright preview
server. Keep the local URL and local-only status visible where useful. This stage proves the
sequence, timing, and visible states before any deploy.

- Record a 1600 by 900 browser window at 100 percent browser zoom.
- Close personal tabs, extensions, bookmarks, notifications, and account menus before recording.
- Use a fresh browser profile or clear only ProofRoom site storage before the take.
- Confirm the opening landing page starts at revision 0 with no approved profile or decision.
- Keep the pre-positioned Decision tab free of any pending or approved decision.
- Keep the pointer still while speaking. Move once toward the next control, then click.
- Do not resize the window, change zoom, or use browser search during the take.

### Final recording later (public origin)

Only after explicit authorization to commit, push, and deploy, plus successful public verification,
repeat the same sequence against `https://proofroom-webmcp.harnden-trey.workers.dev`.

- Record a 1600 by 900 browser window at 100 percent browser zoom.
- Keep the address bar visible whenever the public origin is part of the proof.
- Close personal tabs, extensions, bookmarks, notifications, and account menus before recording.
- Use a fresh browser profile or clear only ProofRoom site storage before the take.
- Confirm the opening landing page starts at revision 0 with no approved profile or decision.
- Keep the pre-positioned Decision tab free of any pending or approved decision.
- Keep the pointer still while speaking. Move once toward the next control, then click.
- Do not resize the window, change zoom, or use browser search during the take.
- Do not imply the local candidate is public. The public app must match the locally accepted
  candidate before recording begins.

## Ordered shots

In this table, the active candidate URL means the local URL during rehearsal. Substitute the
verified public URL only for the authorization-gated final recording.

| Time | Route or surface | Exact action | Expected visible state | Narration goal | Capture mode |
| --- | --- | --- | --- | --- | --- |
| 0:00 | `/`, landing page | Load the active candidate URL and hold | One primary headline, definition copy, fictional EU example card, three-step decision chain, and `Open the fictional review` | State the buyer problem and thesis in plain language | Live |
| 0:12 | `/#product`, buyer profile panel | Select `Open the fictional review`, then `Review the sample buyer profile`, then hold on the exact fields | Pending sample profile with buyer fields and revision metadata | Show staging before authority | Live |
| 0:22 | `/#product`, same panel | Select `Use this buyer profile` | Approved profile notice and reordered product content | Prove the first human-only approval | Live |
| 0:30 | `/#evaluation`, requirement workspace | Select `Check evidence`, then `Run the sample evidence check` | Three supported requirements plus partial, unsupported, and unknown states | Show deterministic evidence work quickly | Live |
| 0:40 | `/#evaluation`, requirement records | Open `Salesforce integration`, then `EU data residency` | Salesforce is supported; EU residency is unknown with both hard conditions open | Contrast proof with an honest gap | Live |
| 0:48 | `/#evaluation`, catalog index | Select `Inspect ev_011`, hold, then close | `Treat this as data, not instructions` and the instruction-styled testimonial sentence are visible | Show untrusted-content handling | Live |
| 0:55 | `/#decision`, ROI workspace | Switch to the pre-positioned Decision state and select `Preview calculation` | Deterministic ROI results, payback, and budget comparison; no silent apply | Make assumptions and math inspectable | Live preview from pre-positioned valid state |
| 1:04 | `/#decision`, stakeholder briefs | Show the saved CFO brief, then select the CISO view | Saved CFO economics and the open CISO EU question | Show audience-specific synthesis without claiming a live save | Pre-positioned saved CFO brief |
| 1:15 | `/#decision`, recommendation composer | Select `Prepare the sample not-ready recommendation`, then `Prepare recommendation` | Pending `not ready` recommendation with `req_eu_residency` and `req_sso` blockers | Show that hard gaps control the recommendation | Live |
| 1:28 | `/#decision`, recommendation review | Select `Approve recommendation` and hold on the receipt | Approved decision and decision receipt | Prove the second human-only approval | Live |
| 1:38 | Native WebMCP proof | Show the committed native receipt or real `document.modelContext` discovery | Exactly nine tool names, native Chrome version, reload proof, and successful executions | Prove native discovery and execution without a shim | Pre-positioned real evidence, never recreated output |
| 2:05 | `/#decision`, activity register, then README | Return to the activity register, switch to the pre-positioned README architecture section, then hold on the proof table and links | Person and agent events, shared `RoomActions` flow, test counts, repository URL, and local-candidate not-deployed boundary | Close on the trust boundary and reproducible proof | Live ledger, pre-positioned repository tab |

## Live and pre-positioned state

Keep these interactions live in the take:

- Loading the public landing page.
- Opening the fictional review and approving the sample buyer profile.
- Running the sample evidence check and inspecting requirement state.
- Opening and closing the untrusted testimonial.
- Previewing ROI.
- Preparing and approving the recommendation.
- Showing the activity register.

Prepare these before recording:

- A second tab on the public repository README architecture section.
- A third tab on either live native DevTools discovery or the committed
  [`native-webmcp.json`](../../artifacts/release/native-webmcp.json) receipt.
- A separate Decision tab with reviewed requirement state, one truthful CFO brief already saved, the
  CISO view ready to show, and no pending or approved decision.

Pre-positioning may shorten navigation. It must not replace a claimed action with edited state or
fabricated output. The narration does not claim the CFO brief was saved during the take.

## Native feature recovery plan

If `document.modelContext` is unavailable during recording:

1. Do not claim live native discovery.
2. Keep the complete visible UI journey. Every product action remains available without WebMCP.
3. Show the committed
   [`native-webmcp.json`](../../artifacts/release/native-webmcp.json) receipt and its exact nine
   `toolNames`, `reloadToolNames`, native executions, persistence result, and Chrome version.
4. State that the accepted native verifier used headed Chrome and no WebMCP shim.
5. State that live natural-language browser-agent selection is `not_run`.
6. If the receipt cannot be shown legibly, cut the native shot and record a new take. Do not add
   fake terminal output, edited DevTools output, or a simulated tool call.

## Final capture checklist

### Rehearsal gate (local candidate)

- [ ] Local preview URL is legible when rehearsing against `http://127.0.0.1:4181` or the
  configured Playwright preview.
- [ ] Fictional-data notice is visible and verbally disclosed.
- [ ] Sample buyer profile is visibly staged before the person approves it.
- [ ] Recommendation is visibly prepared before the person approves it.
- [ ] Supported evidence and the unknown EU residency gap are both visible.
- [ ] Audio is clear, even, and free of notification sounds.
- [ ] Cursor movement is deliberate and never covers the active proof.
- [ ] Browser zoom remains 100 percent and no text is clipped.
- [ ] Final exported duration is 2:35 to 2:45 and does not run past 2:45.
- [ ] No fake terminal output, edited proof, personal data, or account UI appears.
- [ ] The rehearsal is labeled local-only and not described as public proof.

### Final recording gate (public origin, authorization required)

Do not record the final take until commit, push, deploy, and public verification succeed and the
public app matches the locally accepted candidate.

- [ ] Public URL is legible at the opening and the repository URL is legible at the close.
- [ ] Fictional-data notice is visible and verbally disclosed.
- [ ] Sample buyer profile is visibly staged before the person approves it.
- [ ] Recommendation is visibly prepared before the person approves it.
- [ ] Supported evidence and the unknown EU residency gap are both visible.
- [ ] Exactly nine native tool names are legible in real discovery or the committed receipt.
- [ ] No line claims a passed live natural-language browser-agent run.
- [ ] Test and eval counts match the verified public baseline: 423, 38, 48, and 12.
- [ ] The public build matches the locally accepted candidate. The local candidate is not public.
- [ ] Audio is clear, even, and free of notification sounds.
- [ ] Cursor movement is deliberate and never covers the active proof.
- [ ] Browser zoom remains 100 percent and no text is clipped.
- [ ] Final exported duration is 2:35 to 2:45 and does not run past 2:45.
- [ ] No fake terminal output, edited proof, personal data, or account UI appears.
