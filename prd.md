# PRD: AI Use Case Sentiment Explorer
**Status:** Draft v0.6 — Early Exploration
**Audience:** Millennials & Gen Z consumers (U.S.)
**Stage:** Prototyping

---

## Problem Statement

As AI tooling becomes more prevalent across creative, professional, and personal domains, consumer attitudes toward AI vary widely — but there is no engaging, interactive way for people to articulate, explore, and compare their own opinions. Visitors to this app lack a structured way to understand where *they* personally draw the line between human creativity and AI-generated output, and how their views relate to those of their peers. Without this, conversations about AI's role in society remain abstract and polarized rather than nuanced and personal.

---

## Goals

1. **Educate through exposure** — visitors who complete the experience can name at least 3 AI use cases they hadn't previously considered (validated via optional post-experience prompt).
2. **Prompt meaningful self-reflection** — at least 70% of visitors complete the full rating exercise (not just one or two domains).
3. **Deliver a personalized insight** — every visitor receives a unique, shareable summary of their own AI attitude profile upon completion.
4. **Make aggregate data legible** — visitors can compare their ratings to the broader pool in a way that surfaces genuine surprise or validation ("I'm more skeptical than most people my age").
5. **Drive social sharing** — at least 20% of completers share their individual results or the aggregate visualization externally.

---

## Non-Goals

1. **Not a research or survey platform** — this is a consumer experience product, not an academic data collection tool. Rigorous sampling, demographic weighting, and longitudinal tracking are out of scope for v1. Lightweight optional demographic self-report (age range, gender, region) is in scope as a P1 feature to enable filtered aggregate views.
2. **Not a debate or opinion platform** — no comments, discussion threads, or social reactions between visitors. This is a reflective individual experience, not a forum.
3. **Not a product recommendation engine** — the app will not suggest AI tools to try based on ratings. That would shift the experience from exploratory to commercial.
4. **Not account-based** — v1 does not require sign-up or login. All data is anonymous; visitor identity is not persisted across sessions.
5. **Not a mobile-native app** — this is a web app; native iOS/Android builds are out of scope for v1.

---

## User Stories

### First-time Visitor

- As a first-time visitor, I want to understand what this experience is about within 10 seconds so that I decide whether it's worth my time.
- As a first-time visitor, I want to rate AI use cases across domains that feel relevant to my life so that I can see where I actually stand on AI.
- As a first-time visitor, I want my ratings to feel consequential and expressive — not like a boring survey — so that I stay engaged through the full experience.
- As a first-time visitor, I want to immediately see how my individual results look across rated domains so that I feel the experience was worth completing.
- As a first-time visitor, I want to see how my individual results compare to others like me, how we agree or disagree most, so that I feel the experience was worth completing.
- *As a first-time visitor who completes the optional demographic self-report, I want to see how my ratings compare specifically to people who share my age range, gender, and region so that the comparison feels personally relevant rather than generic.*
- *As a first-time visitor who skips demographic self-report, I want to still see a meaningful aggregate comparison against all visitors so that skipping does not diminish my results experience.*

### Returning / Sharing Visitor

- As a visitor arriving via a shared link, I want to see someone else's AI attitude profile alongside my own so that I can compare how we agree or disagree most, and feel motivated to complete my own rating.
- As a visitor who completed the experience, I want a visually distinctive shareable artifact so that I can post it and invite others to compare theirs.

### Curious Explorer

- As someone unfamiliar with AI use cases, I want brief, jargon-free phrasing of each use case so that I can form an opinion without needing prior knowledge.
- As someone unfamiliar with AI use cases, I can provide feedback about a use case phrasing by clicking a button to say "I don't understand this use case"
- As someone interested in the "human vs. AI" debate, I want a visualization that helps me articulate my own intuitions so that I can engage more confidently in that conversation.

---

## Requirements

### P0 — Must Have

**1. AI Use Case Rating Module**
- Visitors rate each AI use case on a scale. Rating scale roughly describes who should perform a given use case, a human or an AI robot: **Never (1) · Some (2) · Neutral (3) · Most (4) · Always (5), midpoint 3**. This framing produces meaningfully different data and a different emotional experience for visitors than the alternatives previously considered.
- Use cases are organized into discrete **domains**, each with one or more **subdomains**. (103 use cases total.) Additional use cases may be added in future epics via new Notion database records — no schema changes required. Notion database is connected to a remote database for the app.
- The app must support incremental use case addition without requiring a full re-deploy.
- If a visitor doesn't understand a use case as written, the visitor can request that an explanation be added to it. This is a lightweight flag/request action, not a live AI-generated explanation — requests are queued for the content team to address.
- If a visitor wants to change their previous use case rating, they can go back by clicking a back button.
- Since use cases are organized into domains, the visitor will see them labeled that way. The visitor is served **10 use cases per bundle**, drawn without regard to domain or subdomain, so the rating experience feels like a continuous stream rather than a category-by-category survey.
- A first-time visitor is served the ten featured use cases from 5 specific domains, so 2 per domain. This should be flagged in the database as featured first-time visitor use cases.
- After finishing each 10-use-case bundle, the visitor can view their results visualization (see Requirement 2) before deciding whether to continue rating another bundle. Results reflect all bundles completed so far, not just the most recent one.
- Acceptance criteria:
  - [ ] A visitor can complete all ratings in a single session without account creation
  - [ ] Each use case is presented with its domain badge visible
  - [ ] Use case phrasing is jargon-free and requires no prior AI knowledge to understand
  - [ ] A visitor can request a better phrasing be added to a use case
  - [ ] The interaction is touch and mouse compatible
  - [ ] Use cases are served in randomized bundles of 10, drawn across domains and subdomains, with a visible badge labeling the domain they belong to
  - [ ] Progress is visible so visitors know how far along they are within the current 10-use-case bundle
  - [ ] After completing a bundle, the visitor is presented with a clear choice to view results or continue to another bundle
  - [ ] The results visualization reflects the visitor's cumulative ratings across all bundles completed so far
  - [ ] New domains and subdomains can be added to the underlying data without breaking existing use cases or visitor flows

**2. Individual Results Visualization**
- Upon completing a 10-use-case bundle (or choosing to stop after any bundle), the visitor sees a personalized visualization of their results, reflecting all ratings submitted so far.
- The visualization must make the visitor's overall "AI attitude profile" legible at a glance — not just a list of scores.
- Visualization type consists of two parts:
  - An archetype based on the defined archetype logic
  - A graph/visualization demonstrating per-domain rating. When ideating this, generate at least 3 different suggestions.
- Acceptance criteria:
  - [ ] Results appear immediately after the final rating, with no loading state > 2 seconds
  - [ ] The visualization is readable with minimal explanation copy
  - [ ] The visitor can see their rating for each domain within the visualization or on demand

**3. Comparison Visualization**
- After viewing individual results:
  - Visitors can see how their ratings compare to the friend that shared the link with them (default view)
  - Visitors can see how their ratings compare to an aggregate of all previous visitors.
- All ratings are stored anonymously server-side in **Supabase**. This is the confirmed architecture — no PII is collected or stored.
- Aggregate data updates in real time (or near-real time) as new visitors complete the experience.
- A minimum response threshold of 25 respondents must be met before aggregate data is surfaced, to ensure social proof is meaningful rather than misleading.
- The Supabase schema must treat domains and use cases as configurable records, not hardcoded structures. This ensures new domains can be added at the data layer without schema migrations or breaking changes to existing domain data.
- Acceptance criteria:
  - [ ] Anonymous ratings are written to Supabase on submission
  - [ ] Aggregate data is visible after individual results, not before (to prevent anchoring bias)
  - [ ] The comparison view shows both the visitor's data and aggregate data simultaneously
  - [ ] If the response threshold has not been met, a designed placeholder state is shown instead of aggregate data
  - [ ] Adding a new domain and its use cases requires no schema changes — only new records

**4. Shareable Results Artifact**
- Visitors can share their individual results as a unique URL.
- The shared URL encodes or retrieves the visitor's result profile and prompts the viewer to take the experience themselves.
- The shared encoded URL is used to compare a new visitor's results with the results from the encoded URL that led them to the app.
- The shared artifact must be visually self-contained and interpretable without context.
- Acceptance criteria:
  - [ ] A "Share" or "Copy link" action is available on the results screen
  - [ ] The shared link renders a meaningful preview on major platforms (Twitter/X, Instagram, iMessage) via OG meta tags
  - [ ] The shared link loads the sharer's results profile and prompts the viewer to take the experience themselves

---

### P1 — Nice to Have

**5. AI Impact Explainer — contextual consequence layer**
- After rating a bundle of use cases, visitors can optionally dive deeper into the real-world consequences of that AI application across some dimensions: **jobs/labor**, **economy**, **health**, and **industry/sector**.
- Recommended format: a **scrollable, card-based explainer panel** that surfaces after rating — not before, to avoid priming responses. Each impact card is brief (2–3 sentences + a key stat), scannable, and editorially curated. Think less "Wikipedia article," more "what your informed friend would tell you."
- Alternative formats to explore:
  - Inline tooltip on hover (lighter lift, lower engagement)
  - A dedicated "impact" tab on the results screen
  - Or a full-screen contextual drawer. Format is a **design decision**.
- This feature turns the app from a pure sentiment tool into something with lasting educational value — a meaningful differentiator.
- Acceptance criteria:
  - [ ] Impact content is optional and never shown before the visitor submits their rating (no priming)
  - [ ] Each use case has at least one impact card across at least two dimensions (jobs, economy, health, or industry)
  - [ ] Content is written in plain language appropriate for a general Millennial/Gen Z audience
  - [ ] The explainer is skippable — visitors can proceed to results without engaging with it

*The following P1 items are deprioritized relative to #5 above, per latest Notion review:*

**6. Domain-level filtering in aggregate view**
- *Visitors can filter the aggregate comparison by domain (e.g., "how do my creative AI ratings compare to others' creative ratings").*

**7. Lightweight Demographic Self-Report**
- *After completing all ratings and before results are shown, visitors are presented with an optional self-report screen collecting three fields: **age range**, **gender**, and **region** (U.S. state or broad region).*
- *The screen is explicitly optional and skippable — visitors who skip proceed directly to their individual results with no penalty.*
- *Visitors who complete self-report unlock a **filtered aggregate view**, allowing them to compare their ratings against peers who share their demographic profile rather than the full visitor pool.*
- *Demographic data is stored anonymously in Supabase alongside the visitor's ratings, with no PII attached.*
- *Acceptance criteria:*
  - [ ] *Self-report screen appears after final rating submission and before the results visualization*
  - [ ] *All three fields (age range, gender, region) are presented on a single screen — no multi-step flow*
  - [ ] *The screen is skippable via a clearly labeled action (e.g., "Skip to results")*
  - [ ] *Visitors who complete self-report see a filtered aggregate view segmented by their demographic profile*
  - [ ] *Visitors who skip self-report see the standard unfiltered aggregate view*
  - [ ] *Demographic fields are stored anonymously in Supabase alongside ratings — no PII collected*

**8. Animated / progressive reveal of results**
- *Results visualization builds progressively as the visitor completes ratings, creating anticipation and engagement.*

**9. "Human vs. AI creativity" narrative summary**
- *After completing ratings, visitors receive a one-line characterization of their overall stance (e.g., "You're a skeptical pragmatist" or "You're an early adopter with creative guardrails") — framing TBD and is a **content/design decision**.*

---

### P2 — Future Considerations

*Deprioritized — see Notion for current status.*

**10. Facilitated group / cohort mode**
- *Organizations (schools, companies, conferences) can run a facilitated version where a group completes the experience simultaneously and results are aggregated live for the group.*

**11. Revisit & compare over time**
- *Visitors can optionally save their results (via a generated unique URL) and return to see how their views change over time or after new AI developments.*

**12. Curator / editorial layer**
- *A curated editorial experience that adds context to outlier data points — e.g., "People who work in creative fields rated AI music generation 30% lower than the general population."*

---

## Success Metrics

### Leading Indicators (measure at 1 week and 1 month post-launch)

| Metric | Target | Measurement |
|---|---|---|
| Completion rate | ≥70% of visitors who start finish all ratings in a domain | Analytics: session funnel |
| Time to complete | Median session 4–8 min | Analytics: session duration for completers |
| Share rate | ≥20% of completers click share | Analytics: share action event |
| Drop-off point | No single use case causes >15% abandonment | Analytics: per-step drop-off |

### Lagging Indicators (measure at 1 and 3 months)

| Metric | Target | Measurement |
|---|---|---|
| Referral-driven new visitors | ≥30% of visitors arrive via shared link | Analytics: referral source |
| Return visit rate | ≥10% of completers return within 30 days | Analytics: returning session rate |
| Social impressions | Shared artifacts generate measurable organic reach | Social listening / UTM tracking |

---

## Inspiration & Reference Apps

Comparable interactive experiences worth studying for UX patterns, visual language, rating mechanics, and results presentation:

| App | URL | What to study |
|---|---|---|
| **thredUP Fashion Footprint Calculator** | [thredup.com/fashionfootprint](https://www.thredup.com/fashionfootprint/) | Step-by-step input flow, personal results reveal, strong visual identity tied to the brand mission |
| **Carbon Crux Total Calculator** | [carboncrux.com/calculators/total](https://carboncrux.com/calculators/total) | Domain-by-domain input structure, aggregate benchmarking, how complex data is made feel personal |
| **Quartz AI Jobs Calculator** | [Image reference](https://buzzsumo.com/wp-content/themes/brandwatch/src/core/endpoints/resize.php?image=uploads/2018/08/quartz-calcuator.png&width=0) | Slider-based rating mechanic, sector-by-sector framing, how labor/economy impact is visualized accessibly |
| **Quartz At Work Reactions** | [Image reference](https://buzzsumo.com/wp-content/themes/brandwatch/src/core/endpoints/resize.php?image=uploads/2022/01/quartz-at-work-reactions-buzzsumo.jpg&width=0) | Emotional/attitudinal response framing, aggregate sentiment display, tone for a professional-but-accessible audience |
| **Player Motivation** | [apps.quanticfoundry.com/profiles/gamerprofile/LKBuFs8rhb7bnefdnbWMvE](https://apps.quanticfoundry.com/profiles/gamerprofile/LKBuFs8rhb7bnefdnbWMvE/) | Radar chart showing six facets of player motivations/interest, option to see additional facets w/ click of a button, link to motivations explainer, in-page explainer of the components of each facet, link to video game recos |
| **Bill the Patriarchy** | [billthepatriarchy.com](https://www.billthepatriarchy.com/) | |

---

## Timeline Considerations

- Recommended sequencing:
- **Epic 1:** Rating module + individual results viz + aggregate + share link for Domain 1. Engineering must deliver a domain-agnostic Supabase schema in this epic — domains and use cases as configurable records, not hardcoded structures. This is a prerequisite for all subsequent epics.
  - **Epic 2–N:** Additional domains, each adding use cases to an established, working system.
  - **Phase 2:** P1 features layered in after two or more domains are live and aggregate data is meaningful.
