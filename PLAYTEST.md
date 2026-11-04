# Good Hour Diner — Playtest record

**Design claim:** “My site makes people feel excited and rewarded when they browse delicious diner food, build their perfect meal, and place an order without spending real money.”

Human playtesting is **pending**. No participant reactions or usability results have been invented. Collect observations by **November 3, 2026**, then document revisions before the November 4 submission. Technical checks establish that features work; they do not establish the emotional claim.

## Session protocol

Use anonymous labels such as Tester A, B, and C. Record device/browser and observation date, not names or contact details. Aim for at least three people from the intended teenage/young-adult audience, including a mobile session. Let each participant explore before explaining the design claim.

1. “Explore the diner and put together an order you would enjoy.” Observe first action, menu discovery, and whether the fictional nature is understood.
2. “Customize one dish and make a combo.” Observe whether options, 3D changes, and prices agree with the person's expectations.
3. “Review your order, change a quantity, and remove something.” Observe whether cart actions are discoverable and reversible.
4. “Refresh the page and continue.” Check restoration of cart and meal choices.
5. “Finish the order.” Observe expectations about payment, kitchen feedback, the ready moment, and the receipt. Do not coach the participant through the controls.
6. “Find your earlier order and explain the money-not-spent amount.” Refresh again and check that the order and total appear once.
7. Ask the participant to identify anything that encouraged them to order sooner and anything that helped them avoid spending real money.

## Neutral follow-up questions

- What did the experience make you feel, if anything?
- Which moment was most satisfying? Which moment felt slow or confusing?
- At any point did you expect to pay or receive food? What created that expectation?
- Did the special change what you chose or how quickly you chose it?
- What does “money not spent” mean to you here?
- After sharing the design claim: how closely did it match your experience, from 1 (not at all) to 5 (very closely), and why?

## Observation log

| Session | Device and browser | Tasks completed without help | Exact reaction or observed behavior | Friction | Revision to consider |
| --- | --- | --- | --- | --- | --- |
| November 3, 2026 | User supplied feedback: cream and berries missing from all French-toast slices; drizzle behaves as a solid; add rewards points. Participant identity and session date were not supplied. | Implemented per-slice garnish, separate liquid pours, and persistent fictional rewards; see TOPPING_AUDIT.md. | Follow-up human reaction not yet collected. | — | — |

Do not replace observations with guesses about motivation. Keep quotations exact, and mark paraphrases as paraphrases.

## Behavioral mechanics to evaluate

**Purchasing pressure:** the openly fictional time-limited special. Check that people notice its time boundary, that it never implies a real transaction, and that expiry behaves as described. The ordinary menu must remain usable after the special ends.

**Self-binding:** completed fictional orders produce a receipt and cumulative money-not-spent total. Check that it invites reflection on ordering without spending, and that people do not mistake it for a bank balance or a claim about actual savings. An unfinished cart must not change this total.

## Technical verification record

This record distinguishes observed results from checks still pending. Required checks: all 23 items and category counts; configured prices and combo rules; cart reload/migration; one-time checkout; history and cumulative totals after refresh; kitchen completion and skip; no-WebGL fallback; keyboard operation and focus return; reduced motion; sound preference; mobile layout; and a live Vercel smoke test.

| Date | Check | Evidence and result |
| --- | --- | --- |
| October 27, 2026 | Original food asset preparation | Inspected a contact sheet of all 23 item crops and the hero. Each crop maps to the intended dish; drink grid seams are excluded. 24 WebP files total 1,287,164 bytes. Original PNGs preserved. |

## Implementation verification — October 27, 2026

- `npm test`: **19 passing**. Coverage includes all category counts, option normalization, exact cents pricing, combo eligibility, special discounts, distinct configurations, quantity bounds, saved state and legacy migrations, damaged/unavailable storage, idempotent completion, immutable receipt prices, duplicate saved IDs, and daily-special boundaries.
- `npm run build`: **passed**, resolving 33 HTML/catalog asset references and packaging the app plus local Three.js modules. Output is approximately 4.2 MB; draft source images are excluded.
- JavaScript syntax and Git whitespace checks passed.
- An isolated 3D harness switched through all 23 models without runtime errors. Representative burger, pancakes, shake, pie, and brownie renders were inspected; selected ingredient changes and keyboard rotation/zoom/reset were exercised. Final chocolate/vegetable refinements have only a static check so far.
- Source review found and corrected an Undo path that could replace later cart changes, handling of storage-clear events, and simultaneous-checkout risk. Checkout now reloads and compares the reviewed cart inside a Web Lock where supported. These integration fixes still require browser confirmation.
- The special now runs from local 08:00 until midnight, becomes inactive overnight, and preserves discounts already added to the cart. Its clock boundaries are tested independently.
- Three.js initialization failure injection (Node-only): simulated missing motion/resize APIs returned the photo fallback and released the renderer/canvas/listeners; syntax and whitespace checks passed. This does not establish real GPU context-loss behavior.
- **Earlier publication verified:** Vercel served HTTP 200 with byte-identical HTML, CSS, all app modules, both Three.js modules, and all 24 display images. The October 29 motion release preserves both the published history and the revised checkpoint history through a normal merge; no force-push is needed. Live URL: https://appledesignlanguageamericandinerdop.vercel.app/
- **Integrated browser checks pending:** the saved or managed browser permission continued to block the local preview after the user explicitly approved access and reported changing the setting. Desktop/mobile visual inspection, real cart-to-receipt interaction, real WebGL failure, reduced motion, sound, focus return, and a production interaction smoke test are not claimed as passed. Static deployment-file verification is not a substitute for these checks.

## Motion verification — October 29, 2026

- Implemented scroll-linked hero movement, staggered meal assembly, menu transitions and a sliding category indicator, smooth 3D ingredient and camera changes, cart feedback and dialog exits, and kitchen/receipt motion.
- `npm test`: **27 passing**, including eight new motion checks for immediate accessible totals, exact final values, rapid replacement, reduced-motion changes, hidden pages, disconnected elements, scoped cancellation, and unavailable animation APIs.
- `npm run build`: **passed**, resolving 35 local HTML/catalog references and packaging both new motion modules and stylesheets. JavaScript syntax and Git whitespace checks also passed.
- A Node harness using real Three.js geometry and a stub renderer passed all 23 recipes, interrupted ingredient removal/reselection, shared-material cleanup, finite camera rotation/zoom/reset, direct drag/pinch interruption, live and initial reduced motion, and disposal. These checks do not establish visual quality or real GPU behavior.
- A mocked page-motion lifecycle check covered restored scroll, one pending frame per update, settled meal positions, reduced-motion changes, offscreen/hidden-page suspension, and cleanup.
- Source review corrected retained exit-animation styles that could hide a reopened dialog and disabled interactions while a dialog closes. Cart and order values update immediately; decorative counters expose the final value to assistive technology immediately.
- **Publication verified:** release commit `7bf9855f4ce055a3be085399ccd4043bac067f84` is on GitHub `main`. Vercel returned HTTP 200 with exact byte matches for 13 files: the HTML, three stylesheets, seven application modules, and both Three.js modules. The release preserves both earlier histories without a force-push.
- **Visual and integrated interaction checks remain pending:** the authorized local preview was blocked by the saved or managed browser permission. No new desktop/mobile visual, keyboard, screen-reader, or complete ordering-flow pass is claimed. Production file verification does not replace browser checks or human playtesting.

## Live food-model review — October 29, 2026

- Opened every one of the 23 default 3D previews on the production Vercel site in the in-app browser. This was an implementation review, not a participant playtest of the design claim.
- The first visual review found plastic-like highlights, stretched textures, hard ingredient silhouettes, a jagged liquid/glass intersection on all drinks, flat syrup, and geometric desserts. Corrected those issues and inspected all 23 published models again.
- That second review exposed cheese intersecting burger patties, hidden French-toast syrup, rigid grill marks, bead-like pie filling, and overly regular chocolate drizzle. These prompted a further correction pass rather than relying on the successful geometry harness as proof of appearance.
- Rechecked all 23 default previews on release `cf659e3`: the doubled-patty appearance, stretched bun bands, jagged glass band, and hidden toast syrup are resolved. Tested brownie rotation, zoom, ice-cream removal/restoration, reset, and assembly replay; no browser console errors were reported. A final targeted refinement improves egg-white edges and sauce contact on fries and ice cream, including chocolate placement when ice cream is removed.
- The build, 27 automated tests, and isolated all-23-model/option/motion/disposal harness pass after the final refinements. The food remains deliberately lightweight procedural geometry; it looks more natural but is not photographic food scanning.
- Verification covers the preview presentation at the browser's current desktop-sized viewport. It does not establish photographic fidelity, mobile GPU performance, screen-reader behavior, or a complete cart-to-receipt flow. The earlier local-preview permission failures remain part of the historical record; production browser access worked for this review.

## Revisions after human testing (participant log)

| Date | Evidence from session | Change made | Follow-up result |
| --- | --- | --- | --- |
| November 3, 2026 | User supplied feedback: cream and berries missing from all French-toast slices; drizzle behaves as a solid; add rewards points. Participant identity and session date were not supplied. | Implemented per-slice garnish, separate liquid pours, and persistent fictional rewards; see TOPPING_AUDIT.md. | Follow-up human reaction not yet collected. |

## Submission evidence

Before submission, include the deployed URL, final commit, dated participant observations, at least one documented revision based on testing (or a reason none was needed), and a short evaluation of the design claim. Report untested conditions explicitly.


## November 3 feedback revision — agent QA

- Audited 23 dishes and 141 option values in TOPPING_AUDIT.md. Focused recipe tests exercise 298 individual topping changes across single-choice combinations; exhaustive structural coverage retains 2,216 full configurations.
- Rendered and inspected all 69 default/minimal/loaded configurations offline using exact application recipe placements. Contact sheets are in artifacts/feedback-review/. Higher-resolution inspection confirmed cream/berries on all three French-toast slices and visible, supported mac-and-cheese and sundae garnish.
- Added actual checkout-function tests for shared-lock submission, durable-save-before-success, save failure retaining the cart/points, and another tab spending the selected reward. Real Three.js geometry tests verify liquid clipping plane orientation and cleanup; scene tests use a stub renderer and do not verify GPU appearance.
- Local browser access was rejected by a saved permission. The user said access was enabled; the authorized retry was rejected by the same policy. No alternate browser/port workaround was attempted. Every-option browser checks, mobile appearance, live pour footage, and interactive rewards verification remain incomplete.
- These are agent implementation checks, not new participant reactions. No follow-up human evaluation of the design claim has been collected.

- Final local verification: **57 tests passed**, production build passed, and Git whitespace checks passed. Ordinary saves now use the same shared checkout lock and re-read durable history; tests confirm stale tabs cannot restore spent points and denied reads cannot erase history.

## November 4 — Approved first-visit review fixes

- This was an assistant review of deployed source and planning files, not a human participant session or an interactive browser test. The user selected all five identified improvements.
- Made the hero promise specific, moved the fictional/$0 note ahead of the photo, prioritized the empty-cart menu action above rewards, enlarged Replay assembly, and renamed Your visits to Order history.
- Checked the changed source and responsive rules; all 57 automated checks and the production build pass. The empty-cart body can scroll at short heights, and phone/desktop replay rules specify a 44px target and 14px text.
- A fresh production-browser attempt returned “Local browser use is disabled in Work settings.” Desktop and 390px visual inspection, real clicks, and participant reactions remain unverified.

## November 4 — Phone navigation and target follow-up

- Replaced the phone's icon-only order-history control with a visible Orders button and enlarged the preview tabs, cart quantity/Remove controls, and dialog tools to at least 44px high.
- Verified source order, action wiring, media rules, the automated suite, and the production build. Browser interaction and visual inspection remain pending because the Browser tool still reports “Local browser use is disabled in Work settings.”
