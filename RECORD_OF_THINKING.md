# Good Hour Diner — Record of Thinking

## October 22–27, 2026: prototype and direction

The initial prototype demonstrated a browser-saved cart with three original diner items. The user wanted an American diner that felt like Apple's website and repeatedly found the early visual presentation insufficiently close to that ambition. Later revisions established the Good Hour name, large sans-serif product headlines, restrained action color, and an animated ingredient entrance. The product-page structure was useful, but illustrated food limited the impression of a premium diner menu.

## October 27, 2026: PRD and takeover

The supplied PRD expands the prototype into a full simulated ordering experience: 23 items, relevant customization, combos, a procedural 3D builder, fictional checkout and preparation, receipts, order history, optional sound, and both behavioral mechanics. The user first asked for a handoff plan and preservation of generated work, then authorized implementation with “Let's go.” `ASTRA_ULTRA_HANDOFF.md` records the handoff. `PRD.md` preserves the product requirements from the DOCX.

The central design decision is to make the food and the act of choosing carry the experience. Original realistic photography supports browsing; procedural models make ingredient changes visible while customizing. The two representations have different jobs. Product imagery should remain appetizing and consistent, while the builder should honestly reflect supported options. No external 3D food assets or real brands are needed.

## Original imagery

Six original AI-generated PNGs were produced on October 27: a standalone hero and five category contact sheets. The source files are preserved in `assets/food-drafts/`. During the authorized implementation, the sheets were cropped into 23 individual item images, with small insets to exclude grid boundaries, then encoded as WebP. The hero was also encoded as WebP. All 24 display assets total approximately 1.29 MB, compared with approximately 14 MB of source PNGs. A visual overview confirmed the dish mapping and absence of visible contact-sheet seams.

The three established menu items retain their IDs and names. The other names are implementation defaults from the approved handoff; the PRD specifies the categories and counts rather than every name. Images portray the default food presentation. Price-changing options belong in the configuration summary and procedural preview.

## Behavior and agency

The purchasing-pressure feature is an explicitly fictional special with a visible time boundary. Its purpose is to let the assignment examine urgency without charging money or creating a real scarcity claim. It should never block ordinary ordering after expiry or silently reset a countdown. The playtest must ask whether participants noticed pressure and how it affected their choices.

The self-binding feature is a receipt and cumulative **money not spent** total for completed fictional orders. That amount is a simulation of the displayed menu prices, not a statement about a visitor's bank balance or actual financial savings. An unfinished cart does not contribute to it. The receipt should close the loop by showing the imagined cost and the actual charge of zero.

The kitchen sequence builds anticipation through clearly named fictional stages. People need a way to skip the sequence and reach the result. Reduced motion, keyboard access, and muted sound must preserve the same information and ability to order. A WebGL failure must affect only the visual preview, never pricing or checkout.

## Data integrity decisions

Prices use integer cents so option and combo arithmetic stays exact. Configured cart lines are distinct when their selected options differ. Saved data is versioned and validated; the three-item prototype's stored cart must migrate. A completed order has a stable identifier, and checkout must be idempotent so repeated clicks or a refresh cannot add the same order twice. The cumulative total is derived from completed orders rather than maintained as an unrelated counter.

## What evidence is still needed

Automated and browser checks can verify feature behavior, arithmetic, persistence, and access. They cannot establish the design claim that people feel excited and rewarded. Human reactions are still pending and will be recorded in `PLAYTEST.md` by November 3. Do not represent generated imagery review or agent QA as a human playtest. Use observed confusion and exact reactions to decide what changes before the November 4 submission.

## Implementation review and tradeoffs

The completed menu uses realistic food photos for browsing and a deliberately stylized procedural preview for customization. Combo previews explicitly identify the entrée and show the chosen side and drink as supporting photos. The kitchen features one configured dish while listing every ordered dish below, so the visual never implies that a single model is the entire order.

A review caught that a countdown with a permanently renewed discount would not create an actual time boundary. The daily special now opens at 8 a.m. and closes at midnight in the visitor's local time. It is inactive overnight, while the full-price menu remains available. Prices already added to the cart stay locked. This makes the school mechanic observable without introducing a real purchase.

The ordering model protects exact prices and completed receipts. A later review also added Undo invalidation after subsequent cart changes, storage-clear handling across tabs, and a guarded checkout that reloads and compares the reviewed cart before recording the order. Browsers with Web Locks serialize concurrent checkouts; other browsers retain the fresh-state comparison and stable order identifier.

Human testing will still need to establish whether the ready reveal and receipt create the intended feeling. The current technical record distinguishes automated/data checks, isolated 3D observations, and integrated browser checks that remain pending rather than treating them as interchangeable evidence.


## November 3 — topping accuracy, liquid motion, and rewards

The user supplied playtest feedback and then expanded the request to every item's toppings. Structural recipe uniqueness did not catch French-toast garnish placed on only one slice. This revision adds explicit placement/support expectations and a separate visual audit. A pancake stack still gets a top garnish, while separate French-toast slices each receive the selected cream and berries.

Liquids need their own finishing motion after the food is supported, rather than sharing the solid ingredient drop/bounce. Camera input must remain independent. Rewards use the proposed 10 points per fictional order and 100 points for a dessert base price, with extras itemized. This gives the rewards an explicit rule without tying earning to a larger fictional bill. The points are saved locally with order evidence; the existing money-not-spent reflection remains.

Browser verification was initially blocked by the saved local-origin permission. That is a verification limitation, not evidence of correct visual behavior. Offline renders and automated tests are recorded separately from browser checks and human responses.
