# Wireframes v01 — Core rating → results flow

First-iteration, mid-fi annotated wireframes for the screens that carry a visitor from arrival through their individual results and into a comparison, per [prd.md](../../prd.md) P0 requirements, [docs/archetype-logic.md](../archetype-logic.md)'s scoring model, and the two flow diagrams ([flow-rating-module.svg](../flow-rating-module.svg), [flow-results-visualization.svg](../flow-results-visualization.svg)).

Convention: grayscale only, `∿` runs stand in for placeholder text (headline/body copy not yet finalized), X-boxes are images, numbered circle callouts tie each screen to its annotation legend (content priority, source, interaction/behavior, responsive/accessibility notes) baked into the bottom of each SVG.

**Design decisions (this iteration):**
- There is no intermediate "bundle complete" decision screen. Finishing the last use case in a bundle routes straight to the results screen — the results screen's own CTA row carries a "Rate more use cases" secondary action for the continue-rating path, rather than forcing a choice before the visitor sees anything.
- The **Archetype Card** (icon + archetype name + one-line summary) is one shared component reused in three places: the shared-link landing (as the friend's preview), the results screen (as the visitor's own), and the comparison screen (compact, one per person). Its name/summary copy and computation logic both come from [docs/archetype-logic.md](../archetype-logic.md) — it is never a personal photo or a real name, since visitors are anonymous by default.
- **The spectrum concept (05b) is the chosen visualization for the Individual Results screen** — 05a (radar) and 05c (gauge cards) are kept as earlier alternates for reference, not carried forward. Everything downstream (06, 07) builds on 05b's Archetype Card and per-domain spectrum track.
- **Feature 3 (Comparison Visualization) is in scope**, built on the chosen spectrum concept from 05b: see [06-comparison-spectrum.svg](06-comparison-spectrum.svg).
- **Feature 4 (Shareable Results Artifact) is in scope**, triggered from 05b's "Share my results": see [07-share-results.svg](07-share-results.svg).
- Both 05b and 06 now carry a prominent, full-width **"Learn more about AI's impact →" CTA** into the P1 Impact Explainer (Requirement 5) — placed after the rating/comparison content, before the compare/share/back actions, so it never primes ratings. The explainer screen itself isn't wireframed yet, just the entry point.

## Screens

| # | File | Covers |
|---|---|---|
| 1 | [01-landing-first-time.svg](01-landing-first-time.svg) | Organic/direct arrival landing — explains the concept in <10s; order is headline → subhead → microcopy → primary "Start rating" CTA → secondary "enter a code" link |
| 2 | [02-landing-shared-link.svg](02-landing-shared-link.svg) | Shared-link arrival — leads with the friend's Archetype Card ("your friend's," never a name) and an empty-state spectrum teaser (friend's marker plus an open slot for the visitor's own), same CTA destination, includes expired-link fallback |
| 3 | [03-rating-card.svg](03-rating-card.svg) | The core rating interaction — domain badge, use case text, request-explanation (now directly under the use case text), a 10-section segmented progress bar (one section per card in the bundle), the 1-5 scale, and a "Next" button (disabled until a segment is picked) so a visitor can skip the auto-advance wait instead of only being able to wait it out. Shows default, selected (auto-advance + enabled Next), and error states |
| 4a–c | [05a-results-radar.svg](05a-results-radar.svg), [05b-results-spectrum.svg](05b-results-spectrum.svg), [05c-results-gauge-cards.svg](05c-results-gauge-cards.svg) | Three visualization concepts explored for the Individual Results screen (per PRD's "generate at least 3 different suggestions"). **05b (spectrum) is the chosen concept going forward** — Archetype Card header (with a computing/skeleton state), markers with no value printed inside, tap-to-expand one-line domain summaries (not use-case lists), a prominent "Learn more about AI's impact" CTA, and a CTA stack of one primary ("See how you compare") plus two secondary actions side by side ("Share my results" / "Rate more use cases"). 05a/05c are retained as rejected alternates for reference and have not been updated to match these latest patterns |
| 5 | [06-comparison-spectrum.svg](06-comparison-spectrum.svg) | Feature 3, Comparison Visualization — top-left "← Back" (same pattern as 03), "You + your friend" (default) / "Everyone" tabs, an agree/diverge insight line, a sort control (default: most-agreement domains first, reversible to most-disagreement first), two-marker spectrum rows ordered by that sort, a "Learn more about AI's impact" CTA, and the 25-respondent aggregate threshold placeholder state |
| 6 | [07-share-results.svg](07-share-results.svg) | Feature 4, Shareable Results Artifact — the "Share my results" bottom sheet: the self-contained shareable artifact preview, native share targets (Messages/X/Instagram/More), copy-link fallback, the link-copied confirmation, and the cross-platform OG-preview state |

## What's deliberately out of scope here

- **The Impact Explainer screen itself (P1 Requirement 5)** — 05b and 06 now link to it prominently, but the explainer content/layout isn't wireframed.
- **Other P1 items** (demographic self-report, filtered aggregate) are not shown; none block the P0 flow.

## Open questions for the next pass

- 05b (spectrum) is decided as the visualization concept — 05a/05c are no longer being pursued and can move to a "rejected concepts" reference rather than staying in the active set once this moves past wireframes.
- Exact auto-advance timing/interruption behavior on the rating card (annotated as ~400ms, needs a design call).
- The "agree most / diverge most" insight on 06-comparison-spectrum.svg uses a simple per-domain average-difference metric that is **not** defined in docs/archetype-logic.md (that doc only covers the single-visitor archetype computation) — needs a decision from whoever owns that logic before build.
- Skipping the bundle-complete decision screen means the PRD's Requirement 1 acceptance criterion ("clear choice to view results or continue") is now satisfied by the results screen's own CTA row rather than a dedicated screen — worth confirming this still reads as a "clear choice" once in front of users.
- Giving "Learn more about AI's impact" the same full-width visual weight as the primary "See how you compare" CTA on 05b is a deliberate prominence choice per this instruction — worth validating it doesn't out-compete the P0 compare/share actions for attention once tested.
