# Good Hour design system

Good Hour pairs the hierarchy of a premium product page with an original American diner. Food carries the visual identity. Large headlines, concise copy, generous spacing, and restrained controls give the images room to work.

## Visual system

| Role | Light appearance | Dark appearance |
| --- | --- | --- |
| Warm stage | `#FAF7F0` | `#25231F` |
| Surface | `#FFFFFF` | `#1B1C20` |
| Primary text | `#202124` | `#F5F5F7` |
| Supporting text | `#646466` | `#B3B3BC` |
| Diner cherry | `#C62828` | `#F49D94` |
| Action blue | `#0066CC` | `#6AAEFF` |
| Chrome accent | `#B8BDC5` | Same material accent |

System sans-serif type gives controls a familiar feel. The hero grows to 102px on wide screens and reduces with available space; section headings, dish titles, descriptions, and utility labels have separate scales. Blue denotes actions. Cherry belongs to brand content and the featured special. Chrome, cream, ceramic plates, and the clock mark establish the diner character.

The homepage moves from one hero dish to a fictional special, category browsing, a meal builder invitation, and money-not-spent reflection. Photography is realistic and original. Menu photographs show the dish's original presentation; the builder's procedural model shows supported customization. The model is intentionally stylized and is identified as a 3D preview.

Glass is confined to the floating navigation and functional overlays. Large cream or white content surfaces remain quiet. Mobile layouts stack the builder preview above the options, keep its price and action together, and allow category navigation to scroll horizontally.

## Interaction and motion

A brief hero entrance introduces the page. Sections reveal once as they enter view; menu cards have a short stagger. Opening an order panel follows its direction of entry. Cart-count feedback and button presses acknowledge actions. Ingredient assembly explains the 3D model and can be replayed deliberately.

The fictional kitchen progresses through received, cooking, plating, and ready in about 6.4 seconds. The cloche opens at ready; a short confetti burst and optional chord mark completion. A skip action is available throughout. Reduced motion goes directly to the ready state and removes spatial animation. Sounds are brief, start muted, and have an accessible persistent toggle.

The standard ease is `cubic-bezier(.22,1,.36,1)`. Most interface motion uses transform and opacity. Three.js draws on demand and during finite assembly/interaction, limits pixel density, and disposes closed scenes. The 3D engine loads only when a preview is requested. Failure leaves the photograph, customization controls, and pricing usable.

## Accessibility and clarity

Native buttons, radio groups, checkboxes, selects, and dialogs provide familiar keyboard interaction. Focus indicators, names for icon buttons, status announcements, Escape dismissal, focus return, and rotation/zoom buttons support people who cannot use drag gestures. Controls target at least 44px where applicable. Pricing uses visible text, not color alone.

Reduced-motion, reduced-transparency, increased-contrast, and dark-appearance treatments are independent. Simulation notices appear in the homepage, checkout, kitchen, receipt, and footer. No personal or payment inputs exist. The fictional special openly describes its daily 8 a.m.–midnight window; the ordinary menu remains available. Money not spent is a sum of imagined order totals, not measured real-world savings.

## Design guidance

The local Apple Design Skill and its Human Interface Guidelines references informed hierarchy, typography, materials, motion, feedback, modality, entering data, cross-platform layout, and accessibility. This is a web interpretation with an original product identity. The guidance is intentionally local and excluded from Git.

Observed QA and remaining gaps belong in `PLAYTEST.md`; this document describes design intent and implementation, not a claim that every device has been tested.

## October 29 motion expansion

The opening photograph now has a gentle camera push and upward drift tied directly to scroll. The copy moves at a different rate. The meal showcase assembles its three framed food photographs through staggered scroll intervals; ordinary scrolling stays under the visitor's control and nothing is pinned. Compact layouts use about half the travel distance. These scenes update only on scroll, resize, or visibility changes, with one scheduled animation frame at a time.

Menu selection uses a moving pill and a short crossfade into staggered cards. Cart state updates immediately; the arriving photograph, quantities, and totals provide brief confirmation. Animated amounts expose their final value to assistive technology throughout. Drawer exit is approximately 230 ms and leaves no retained visual effect when reopened.

The 3D builder keeps departing ingredients for a 300 ms lift/fade before disposal, settles retained layers, and eases camera changes. Rapid toggles reverse cleanly; pointer gestures take over immediately. The fictional kitchen has distinct cooking and plating cues, then the existing ready reveal. Receipt paper arrives over 700 ms, and its money-not-spent amount counts to the saved total once. Historical receipts display their final amount immediately.

Reduced motion disables spatial effects and interpolation while preserving every action and final value. Changing the preference mid-animation settles the current state. Hidden tabs pause page work and cooking steam; closed 3D scenes release their resources. The local HIG `motion.md` sections “Best practices” and “Providing feedback,” and `feedback.md` “Best practices,” guide this treatment.


## November 3 feedback revision

Selected French-toast cream and berries belong on each slice. A whole pancake stack keeps one top garnish. Liquids reveal progressively on their actual surface beneath a thin moving stream; grouped finishing pours last about 1.05 seconds. The internal maple glaze pours before the burger closes. Camera movement remains independent.

Good Hour Points reuse the existing surface, text, action-blue, system type, and focus treatments. The compact balance and labeled meter live in Your visits and the cart; receipts state earned/spent points. Ten points per completed fictional order and 100 points toward one dessert base price are explicit, with extras itemized. The display has no perpetual animation and never hides the money-not-spent reflection. Status appears in context, following local HIG feedback.md Best practices and motion.md Providing feedback.
