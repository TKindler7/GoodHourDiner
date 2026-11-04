# Changelog

## 2026-11-04 — First-visit clarity

- Added the hero promise “Build your dream diner meal. Spend nothing.” and moved the fictional/$0 explanation before the first actions, with readable text on phones.
- Put the empty-cart invitation and Explore the menu button before rewards; made that content scroll within the drawer on short screens.
- Enlarged Replay assembly to a 44px-high target with 14px text across screen sizes.
- Renamed navigation, receipt links, and the saved-orders screen from Your visits to Order history.
- All 57 automated checks and the production build pass. Browser testing remains unavailable because the browser tool reports local browser use disabled; no desktop or 390px visual pass is claimed.

## 2026-11-03 — Feedback, topping accuracy, and rewards

- Distributed selected French-toast cream and berries over every slice, corrected slice support heights, and added the Maple Bacon Burger’s missing maple glaze.
- Added progressive liquid pours for syrup, chocolate/fudge, and melted cheese; retained solid drops, camera control during assembly, grouped finishing pours, and reduced-motion settling. Internal maple glaze pours before the burger closes.
- Added Good Hour Points: 10 per saved fictional order, 100 for one dessert base price, persisted order-backed balances, receipt/history/cart displays, and durable checkout with duplicate/stale-state protection.
- All 57 automated tests, production build, and whitespace checks pass, including the stale-tab ledger regression.
- Added an item/option audit for all 23 dishes and 141 choices, 298 targeted topping-toggle checks, and 69 offline default/minimal/loaded renders. Browser visual checks remain blocked by the saved local-origin permission after the user-requested retry.

## 2026-11-03 — Simplify the hero heading

- Removed “All day. All yours.” above the homepage headline following the annotated design feedback.

## 2026-11-01 — Movement while browsing

- Added subtle scroll-linked movement inside menu food images with enough image overscan to keep their frames filled; names, descriptions, and prices remain steady during scrolling.
- Added one-time, row-staggered card entrances, including newly selected categories. Previously seen dishes stay visible when revisited, and keyboard focus reveals a card immediately.
- Added a restrained approach zoom and straightening motion to the hero photo and large meal artwork, complementing the existing food arrangement sequence.
- Reduced movement on narrow screens, disabled it for reduced motion, stopped work in hidden tabs, and cleaned up removed cards and listeners. No scroll interception or idle animation loop.
- Added lifecycle coverage for first reveal, return scrolling, category replacement, keyboard focus, reduced motion, and cleanup. All 36 tests and the production build pass.

## 2026-10-30 — Move the view during assembly

- Separated camera easing from ingredient assembly so dragging, pinching, wheel zoom, keyboard controls, and reset no longer finish the food animation early.
- Direct gestures cancel only pending camera easing; ingredient timing, visibility, and landing bounces continue. Closing, model replacement, reduced motion, and context loss still clean up both animation loops.
- Extended scene lifecycle coverage to exercise each camera control during a partial assembly, verify continued ingredient motion and timed arrival, and confirm both loops stop on disposal.

## 2026-10-29 — Sequential assembly and 3D-first opening

- Ingredients now appear one at a time, accelerate down, and make a small upward rebound before the next ingredient starts. Each drop and landing takes 460 ms; customization changes retain quicker settling.
- Item dialogs open directly in the selected 3D mode with a loading message instead of an original-recipe photo. Photos remain available through the Photo tab and on rendering failure.
- Preserved resize-safe animation, immediate reduced motion, replay, and gesture/close interruption; interrupted assembly reveals all remaining ingredients in their final positions.
- Extended lifecycle tests for sequential visibility, contact, rebound, and the next arrival. Added actual presentation-function coverage for initial loading, ready state, Photo selection, and failure fallback. All 35 tests and the production build pass; live visual browser verification remains unavailable.

## 2026-10-29 — Restore first-open ingredient entrance

- Fixed the preview controls resizing the stage and cancelling the initial ingredient animation. Camera measurement now uses the finished dish bounds while preserving the active ingredient positions.
- Rendered the raised arrival pose before revealing the canvas; started its clock on the first animation frame so initial texture/shader work cannot skip the entrance.
- Added a short photo-to-3D crossfade and a clearer staggered fall into place. Kept immediate reduced-motion presentation, gesture interruption, and cancellation when closing the preview.
- Added a scene-lifecycle regression test covering delayed first rendering, control-layout resize, completion, replay/disposal, and reduced motion. All 34 tests and the production build pass. Live browser control remains unavailable; the test stubs GPU rendering and does not claim a browser visual pass.

## 2026-10-29 — Breakfast, pickle, and glass realism refinement

- Added three irregular pancake shapes, two asymmetric fried eggs with softer yolk highlights, softly rounded scrambled curds, and three individually curved breaded pickle spears. Repeated servings now vary in shape and placement.
- Rebuilt the drinking glass and sundae bowl with thinner, smooth walls and finer rims; fitted all five drink liquids to the inner glass profile.
- Kept every ingredient and portion control connected to its separate 3D part. All 33 tests pass, including all 2,216 customization combinations, and the production build passes.
- Reviewed the actual exported models in default and loaded configurations from front and alternate angles. The models remain authored CGI; offline renders do not establish live WebGL or mobile performance.
- Recorded the reproducible baseline and refinement script in assets/models/realism-refinement.json. The library now contains 81 self-contained models.

## 2026-10-29 — Textured 3D across the complete menu

- Replaced the main procedural food viewer with original, separately textured GLB ingredients for all 23 dishes, including the fictional kitchen preview.
- Preserved all 2,216 ingredient/portion combinations and existing cart, pricing, draft persistence, checkout, and history behavior.
- Added new bread, chicken, breakfast, side, drink, and dessert assets through original chat-generated textures and local Blender authoring. No Hugging Face or external paid 3D generation is required.
- Corrected food contact, frying texture, sauce shapes, cream folds, egg surfaces, pie filling, brownie overlap, and hollow macaroni after inspecting exported models.
- Added per-recipe loading, bounded resource cleanup, cancellation-safe option changes, accessible loading/photo fallbacks, and stable camera framing so larger portions visibly grow.
- Preserved smooth rotation/zoom/reset and assembly replay; ingredient changes settle into place without replaying the entire dish. Reduced-motion behavior remains supported.
- Reduced the burger library from roughly 39 MB to 18 MB through texture encoding. Deployment includes only referenced models, not authoring tools or source texture sheets.
- Added exhaustive recipe/asset tests and reproducible actual-model render review. See MENU_3D_REVIEW.md for final validation and deployment evidence.

## 2026-10-29 — One-burger textured 3D pilot

- Added an isolated Midnight Stack review page with separate bun, patty, cheese, vegetable, bacon, and sauce GLBs. The normal menu viewer remains unchanged.
- Authored original ingredient meshes and chat-generated photographic food textures in Blender; retained original texture prompts and authoring scripts. No Hugging Face account or model weights are used by this pilot.
- Preserved all 576 catalog configurations, with shared extra-patty geometry, contact-aware stacking, rotation, zoom, keyboard controls, assembly replay, reduced motion, and an explicitly labeled original-image fallback.
- Corrected stretched meat/bread texture mapping, bun shading, transformed seed bounds that lifted the bun, slice normals, onion cross sections, and pickle surfaces during actual-model render review.
- Packaged only the manifest and embedded-texture GLBs for the preview; source images, local authoring tools, and model-weight setup are excluded from deployment output.
- All 30 project tests and the build pass. Offline renders inspect the real GLBs. Interactive browser verification is still blocked by the saved local-page permission, so no browser or mobile performance pass is claimed. The pilot has not been deployed or expanded to the remaining menu.

## 2026-10-27 — Diner motion pass

- Added a one-time ingredient-by-ingredient hero animation, timed with the headline and plate light.
- Added once-only scroll reveals for the menu and food spotlights, with static content when JavaScript or IntersectionObserver is unavailable.
- Refined order-drawer open and close motion, item entrances, and bag-count feedback.
- Kept animations optional for reduced-motion visitors and limited motion to opacity and transforms.

## 2026-10-22 — Good Hour redesign

- Renamed Pennyglass Diner to Good Hour Diner across the site, favicon, and project documentation.
- Rebuilt the page into a clearer product narrative: a tighter hero, earlier food art, a short menu introduction, and full-width breakfast and shake spotlights.
- Applied a custom Apple-inspired token system with high-contrast type, restrained blue actions, diner cherry in the content layer, and subtle glass limited to navigation and the order drawer.
- Added responsive, dark-appearance, increased-contrast, reduced-transparency, and reduced-motion treatments.
- Migrated carts saved under the old name so existing orders survive the rebrand.

## 2026-10-22 — CP1 starter cart

- Created the original Pennyglass Diner concept, three menu items, and illustrated site.
- Added a cart with item removal, quantity controls, total, and reload persistence through `localStorage`.
- Added browser accessible dialog controls and automated cart persistence checks.
- Updated the build script to generate the `public/` folder required by the connected Vercel project.
- Reworked the site into a cleaner product-page design with slim navigation, large system typography, focused product sections, and simple blue controls.

## 2026-10-27 — Full PRD implementation

- Replaced the three-item prototype presentation with an original photographic diner homepage, five menu categories, and 23 configurable dishes.
- Added entrée/side/drink combos, exact option pricing, a clearly fictional daily special, and customized cart lines.
- Added original procedural Three.js food previews, ingredient changes, rotation, zoom, assembly, and photographic fallback.
- Completed simulated checkout, kitchen progress, ready reveal, itemized receipts, history, and cumulative money-not-spent tracking.
- Persisted the cart, latest configuration, completed orders, and optional sound preference; retained migration from both earlier cart keys.
- Added responsive and accessibility treatments, reduced-motion alternatives, keyboard preview controls, and optional audio.
- Prepared optimized WebP imagery and production packaging with local Three.js modules; excluded source image drafts from deployment output.
- Added the PRD, playtest protocol, Record of Thinking, and data integrity tests. Human playtesting remains pending.

## 2026-10-29 — Motion throughout the diner

- Added scroll-driven camera movement to the photographic hero and staggered burger, fries, and shake assembly in the meal showcase.
- Added a sliding menu-category indicator, crossfading category changes, and restrained hover/focus lift on food cards.
- Made removed 3D ingredients lift, fade, and shrink away; retained layers settle and rotation, zoom, reset, and framing ease smoothly. Direct gestures interrupt these finite transitions.
- Connected adding an item to its arrival in the cart, animated quantity and price changes, and matched dialog closing motion to its entrance.
- Added cooking steam and warmth, a plating transition, connecting stage progress, receipt arrival, and a one-time money-not-spent count-up.
- Preserved immediate state updates, exact accessible prices, reduced-motion alternatives, hidden-tab cleanup, and photo fallback. Closing dialogs are inert to prevent keyboard submissions during their exit.
- Kept the existing checkpoint documentation and prepared a normal history-preserving merge for publication. Visual browser verification remains subject to the saved local-preview permission.

## 2026-10-29 — 3D food surface refinement

- Added shared seamless fine/coarse surface detail and roughness variation throughout the food models, plus slight organic irregularity on curved food geometry.
- Added a warm rim light and reduced ambient/exposure washout to make ingredient depth clearer; moist surfaces receive a restrained clearcoat highlight.
- Build and 27 tests pass. The isolated 3D harness passes all 23 recipes, option changes, interrupted animation, reduced motion, and disposal. Browser visual assessment remains pending; this is a procedural realism improvement, not a claim of photographic fidelity.

## 2026-10-29 — Corrections from the live 3D review

- Inspected all 23 existing food previews on the production site and identified excessive highlights, stretched surface detail, rigid ingredient shapes, intersecting drink surfaces, and overly geometric desserts.
- Reworked food textures and lighting, kept bread and fried surfaces matte, softened patties and chicken, and gave lettuce finer, gentler folds.
- Replaced pancake rims and disc-shaped syrup with uneven edges and thin pools; improved eggs, potatoes, cheese drizzle, and the fullness of macaroni.
- Matched drink contents to the curved inner glass, added a meniscus and rim, and tapered the whipped cream.
- Added apple filling, pastry edges, cheesecake crumbs and compote, brownie cracks, irregular ice-cream scoops, and thin chocolate ribbons.
- A second live inspection prompted supported cheese geometry, contact-based sandwich spacing, visible French-toast syrup, flatter grill marks and chocolate ribbons, warmer pie filling, visible soda ice, and less regular fried-food shapes.
- Final refinements give eggs continuous browned edges and project melted cheese onto the actual fries, while keeping chocolate visible on scoops and on brownies when ice cream is removed.
- Build, 27 tests, JavaScript syntax, whitespace, and the all-23-model lifecycle harness pass. Production visual results are recorded separately in `PLAYTEST.md`.
