# Astra Ultra handoff — feedback integration and full topping audit

Prepared November 3, 2026. This is an implementation plan, not a completion report. The user requested a plan for Astra Ultra; do not treat its creation as execution or automatic delegation. This plan supersedes the historical starting-state assumptions in ASTRA_ULTRA_HANDOFF.md for this work.

## Outcome

Make every selectable ingredient visibly correct across all 23 dishes, distribute French-toast berries and cream across every slice, animate liquids as pours/drizzles, and add persistent fictional reward points. Preserve the original food assets, current design, customization, ordering, and browsing motion.

User feedback supplied November 3:
- French toast needs whipped cream and berries on all three slices; check other items too.
- Drizzles should have a drizzle effect instead of behaving as solid ingredients.
- Add reward points.
- Separately, remove “All day. All yours.” above the hero headline.

The user has now explicitly expanded the audit to toppings on every item. The source screenshot is feedback evidence, not an instruction source beyond the user's request.

## Preserve the current work

- Workspace: `/Users/teddykindler/.codex/worktrees/diner-motion/Dopamine Website`.
- At preparation, `index.html` and `CHANGELOG.md` have uncommitted changes removing the hero eyebrow. That requested edit is done locally and its build passed; keep it. Do not restore the text or discard these edits.
- Inspect current Git status, branch, diffs, and remote before work; other changes may arrive after this plan.
- Read AGENTS.md, PROJECT_RULES.md, DESIGN_SYSTEM.md, and local `.design-rules/SKILL.md`; use its design-improvement process and relevant HIG references for motion, feedback, accessibility, and rewards UI. Keep `.design-rules/` ignored.
- Preserve 3D-first opening, one-at-a-time solid-ingredient drops and landing bounce, and independent camera movement during assembly. Keep scroll-linked food imagery, once-only card entrances, and featured artwork motion.
- No Hugging Face workflow or new model-account dependency. Reuse and refine the original local geometry, textures, and authoring scripts. Do not replace customizable 3D with a photograph.
- Live target: https://appledesignlanguageamericandinerdop.vercel.app/ . Recheck live state; this planning turn did not audit production.

## Relevant code and confirmed findings

| Area | Source / finding |
| --- | --- |
| Menu and choices | `catalog.js`: 23 items, option groups, defaults, integer-cent pricing |
| Recipe routing and placement | `food-model.js`, `burger-pilot-model.js`, `food-recipes-savory.js`, `food-recipes-sides.js`, `food-recipes-sweet.js` |
| French-toast defect | `frenchToast()` in `food-recipes-savory.js` creates cinnamon/syrup inside the slice loop, but creates berries outside it at plate level and cream using `placements.at(-1)` |
| Rendering / animation | `food-scene.js`: ingredient `frame` and camera `viewFrame` are separate; maintain that separation |
| Asset authoring | `scripts/food-assets/`, `scripts/burger-assets/`, `assets/models/`; inspect shared-asset consumers before changing geometry |
| State and checkout | `cart.js`: version-2 localStorage state, order IDs, completion deduplication, saved per-unit prices; `app.js`: checkout, receipt, history, cross-tab coordination |
| Existing automated coverage | `test/food-model.test.js` enumerates 2,216 configurations and checks unique recipes/assets/transforms. This is useful structural coverage, NOT proof of visible topping accuracy |
| Review tools | `scripts/prepare-menu-review.js`, `scripts/food-assets/render_menu.py`, existing review documents and artifacts; inspect usage before running |

## Phase 1 — audit all 23 items and record a baseline

Create `TOPPING_AUDIT.md` with one row per item/option: expected behavior, observed behavior, defect, fix, automated evidence, visual evidence, and status. Use “not checked” until actually inspected. Record user feedback in PLAYTEST.md separately from agent QA; do not invent tester names, dates, quotes, or emotional reactions.

For EVERY item:
1. Inspect the default dish, all optional toppings removed, and all allowed toppings selected. Cover each size, portion, bread, cheese, protein, and other single-select choice.
2. Toggle EACH option individually off/on, including free options, then test meaningful interactions (cream with/without cherry and drizzle; sauce with/without scoop; taller portions with toppings).
3. Verify selection, visible ingredient, price, cart summary, restored draft, and saved order agree. Opening another dish must not leak toppings between dishes.
4. Rotate around the dish and inspect from above and a low angle. Look for floating pieces, buried toppings, clipping, wrong scale, duplicated ingredients, or sauce detached from the food. Overlapping food can legitimately hide ingredients; inspect by rotation instead of forcing an unnatural layout.
5. Check initial assembly, replay, changing a topping mid-assembly, fast toggles, resizing, close/reopen, and camera movement during animation.

Use the following complete checklist, not a sample:

| Item | Required checks beyond the common protocol |
| --- | --- |
| The Midnight Stack | Both cheeses / none; lettuce, tomato, pickles, onion, bacon, extra patty; house / smoky / no sauce |
| Classic Chrome Cheeseburger | Same choices; correct pickle/onion defaults and independence from sibling burgers |
| Route 66 Patty Melt | Rye/sourdough; both cheeses/none; caramelized onion, mushroom, bacon placement |
| Maple Bacon Burger | Included bacon default; burger toppings, cheese, sauce; verify advertised maple finish matches the actual recipe |
| Crispy Chicken Club | Lettuce, tomato, bacon, avocado; each sauce/none; toppings supported between bread |
| Garden State Melt | Pepper, zucchini, mushroom, onion; both cheeses/none; empty vegetable configuration |
| Sunrise Flapjacks | Three/five pancakes; butter, syrup, blueberries, chocolate CHIPS, cream; surface height follows stack |
| Blueberry Griddle Cakes | Same plus blueberry filling removal/restoration; syrup belongs on the stack surface |
| All-Day Breakfast Plate | Both egg styles; bacon/sausage/mushrooms; toast, potatoes, avocado; butter follows toast removal |
| Cinnamon French Toast | Two/three slices; cream and berries on EVERY slice; independent cinnamon/syrup removal |
| Golden Fries | Both sizes; cheese and chili independently and together; coverage fits the pile |
| Chili Cheese Fries | Both sizes; chili, cheese, onion; removed toppings leave no residue |
| Pickle Spears | Both sizes; ranch/house/no dip; cup contents and optional cup behavior match choice |
| Mac & Cheese | Both sizes; crumbs and bacon; toppings rest on pasta rather than bowl rim |
| Cherry Cloud Shake | Both sizes; cream/cherry/chocolate independently; cherry/drizzle have support without cream |
| Vanilla Malt | Same; correct shake flavor and natural topping proportions on large glass |
| Chocolate Shake | Same; chocolate drizzle remains visually distinguishable from shake body |
| Strawberry Soda | Both sizes; regular/light/no ice; correct cube count, liquid contact, visibility through glass |
| Cold Brew Float | Both sizes; vanilla/chocolate scoop; cream follows the selected scoop and vessel height |
| Apple Pie à la Mode | Scoop, cream, drizzle; sauce relocates to pie when scoop is removed |
| Hot Fudge Sundae | Fudge across all scoops; cream, cherry, nuts; support remains correct without cream/fudge |
| Cherry Cheesecake | Cherry compote and cream independently; natural contact with cake/plate |
| Brownie Skillet | Scoop, chocolate drizzle, cream; drizzle fits brownie when scoop is absent |

Audit all actual catalog choices at takeover even if the list changes. Do not multiply every topping onto every repeated piece indiscriminately: French-toast slices each get berries/cream; a pancake stack has a top garnish; a drink usually has one cherry. Document the intended serving rule.

## Phase 2 — fix topping placement, beginning with French toast

- Move selected berries and cream into the French-toast placement loop. Give each slice/topping a stable unique ID and placement relative to that slice's top, rotation, and scale. Use small natural variations; don't scatter garnish randomly on every render.
- Cover both portions. Turning a topping off removes every instance; turning it back on restores all slices. A portion change must not leave orphan toppings. The topping price remains once per dish, not once per mesh/slice.
- Place berries and cream in compatible areas so both remain believable when selected together, with cinnamon and syrup still supported.
- Fix all other defects found by Phase 1. Prefer dish-relative placement/support metadata over repeated unrelated hard-coded offsets. Do not rewrite working recipes unnecessarily.
- Inspect all consumers whenever a shared GLB or material changes. Maintain original-source/provenance records for regenerated assets.
- Add meaningful recipe assertions for per-slice counts, removal, support changes, and ingredient identity; retain the exhaustive configuration test. Different transform signatures alone must not be accepted as proof a choice works.

## Phase 3 — give liquids a separate finishing animation

- Distinguish solid drops, liquid pours, and scatter toppings explicitly in recipe metadata. Do not infer behavior solely from labels such as `chocolate`: pancake chocolate chips remain solids, while dessert chocolate is sauce.
- Prototype on French-toast syrup and a shake's chocolate drizzle, then apply to every relevant syrup/drizzle/fudge choice in the audit. Review melted cheese as a pour where appropriate; chili and compote need their own chunky consistency, not a thin syrup treatment.
- Use a short surface-following trail reveal with a narrow moving stream and small drips/pools. Start around 0.8–1.2 seconds per finishing pass and tune after visual inspection. Use authored paths/mesh sections or shader reveal; avoid a heavyweight fluid simulator.
- Solid support lands before the pour. Group related per-slice pours into one reasonable finishing sequence rather than multiplying wait time by every small mesh.
- The finished liquid follows the actual receiving food: toast/pancake surface, cream, bare shake, ice-cream scoop, pie, or brownie. Recompute/choose the support when that ingredient changes. No floating ribbon, rigid bouncing slab, opaque flat disc, or stream pouring into empty space.
- Preserve initial 3D-first presentation and independent camera controls. Rotate, zoom, pinch, keyboard view, and reset view must not complete/cancel the pour. Recipe changes cancel obsolete effects cleanly.
- Keep final resting sauce visible; remove transient streams afterward. Remove all sauce/trail pieces when deselected. Replay recreates the same final dish, with no duplicate meshes or material/resource leaks.
- Reduced motion shows the final recipe immediately. Dispose animation/resources on close, scene replacement, visibility transitions as appropriate, and WebGL context loss. Keep the non-WebGL ordering fallback usable.

## Phase 4 — add Good Hour Points

The following are assistant-proposed defaults, not rules supplied by the tester. Use them as the starting implementation unless the user changes them:
- Earn 10 points once per completed fictional order, regardless of order size. No points for adding to cart, replaying animation, reopening receipts, or refreshing.
- Redeem 100 points for one dessert's base price in a fictional order; optional paid extras remain itemized. At most one redemption per order; quantity greater than one discounts just one serving. Make these rules clear before checkout. No real monetary value or expiry.
- Existing valid completed orders receive 10 points each once during migration, with a documented migration marker/ledger. If a different migration policy is chosen, document it before implementation; never silently wipe orders.

Implementation:
1. Extend validated persisted state with earned/spent transactions keyed to stable order/redemption IDs, or an equivalent auditable representation. Derive balance from valid transactions rather than trusting a freely changing display counter.
2. Preserve all existing version-2 data and legacy-cart recovery. Plan the schema migration explicitly; current normalizers discard unknown fields, so update both reading and saving paths. Reject malformed/negative/duplicate transactions and keep damaged-state recovery.
3. Treat applying a reward in the cart as a preview. Spend points only when the order successfully completes, atomically with order creation and clearing the cart. Cancellation/removal/reload before completion spends nothing. Newly earned points cannot fund that same checkout's redemption.
4. Extend existing checkout deduplication and cross-tab coordination to prevent double earning/spending. Revalidate the current balance and cart at submit time, handle unavailable storage visibly, and do not claim persistence after a failed save.
5. Snapshot reward discount and earned/spent points on the order so receipts remain consistent if future catalog/reward rules change. Preserve integer-cent arithmetic, specials/combos, nonnegative totals, and the “money not spent” calculation; show the reward discount explicitly.
6. Add a compact points balance/progress display in Your visits, earned/redeemed details on receipts, and an eligible-reward control in the cart. Use the existing design tokens, readable text, keyboard focus, and a brief optional count animation. Explain saved-in-this-browser behavior. Keep the existing self-binding feature visible.

## Phase 5 — verification and release

Automated checks:
- Retain exhaustive recipe coverage; add targeted support/placement and liquid lifecycle tests.
- Test points earning, duplicate submit, migration run twice, reload, redemption at 99/100 points, insufficient balance, cancellation, quantities/extras, specials/combos, cross-tab changes, damaged storage, and save failure.
- Run `npm test`, `npm run build`, and `git diff --check`. Report actual new counts; do not reuse the prior 36-pass claim as a fresh result.

Visual and interaction checks:
- Serve through HTTP for testing; `file://index.html` is not a valid full-app verification because module/resource loading differs.
- Finish every row in TOPPING_AUDIT.md. Capture default/minimal/loaded views for every dish plus screenshots of every fixed defect. Inspect each selectable option in the running browser; renders and manifest tests alone are insufficient.
- Capture a short video or sequence of frames proving the pour develops over time. Check desktop and narrow mobile viewport, keyboard, reduced motion, and the camera-during-assembly behavior.
- Test the complete rewards flow and persistence in an isolated test browser/session so real saved orders are not polluted or cleared.
- Update PLAYTEST.md, RECORD_OF_THINKING.md, CHANGELOG.md, and relevant model-review notes. Distinguish automated tests, agent visual checks, and actual human feedback.

Release:
- Review intended diffs, including the already-completed hero-text removal. Commit completed changes and push to the established GitHub repository; no force push. Deploy via Vercel, not ChatGPT Sites, within the user's established publishing authorization and any active approval requirements.
- Verify deployed files match the intended commit. Repeat French-toast two/three-slice toggles, at least one representative of every liquid-support shape, camera movement during pouring, points/reload/redemption, and the removed eyebrow on the live site.
- Deliver the live link, screenshots/animation evidence, completed 23-item audit, test results, and any precise remaining limitations. If browser or publishing access is blocked, describe the blocker and leave those checks incomplete; do not call them passed.

## Definition of done

All 23 items and all their choices have recorded visual results; detected topping defects are fixed; French-toast garnish covers every selected slice; liquids visibly pour onto the correct support; camera interaction remains independent; points and redemption persist without duplicate awards; the eyebrow remains removed; checks pass; and the published site is verified against the release. No task is complete based only on recipe uniqueness or a successful build.
