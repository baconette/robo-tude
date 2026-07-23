# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

The Next.js app is scaffolded (App Router, TypeScript, Tailwind) with Supabase, Recharts, and Framer Motion installed. No product features are built yet — `src/app/` still holds the default `create-next-app` starter page. [prd.md](prd.md) is the product requirements document.

**Important — Next.js version note (from the scaffold's own `AGENTS.md`):** this project is on Next.js 16, which has breaking changes vs. older Next.js APIs/conventions that may appear in training data. Check `node_modules/next/dist/docs/` for current API shape before writing App Router code (routing, data fetching, metadata) you're not certain about.

## Commands

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — ESLint (flat config, `eslint.config.mjs`)

There is no test suite configured yet.

## Confirmed tech stack

- **Next.js (App Router) + TypeScript** — server-rendered pages are required so shared results URLs can set per-visitor OG meta tags (Twitter/X, Instagram, iMessage previews), which a pure client-rendered SPA can't do.
- **Supabase** — storage/backend. **A Supabase project already exists for this app** (not something to provision from scratch) — get connection details from the user before writing any Supabase client code or migrations.
- **Notion → Supabase sync** — use cases/domains/subdomains are authored in Notion, not entered directly into Supabase. A scheduled job must poll the Notion database **every 24 hours** and upsert changes into Supabase. Supabase is the system of record the app reads from at request time; the app must never call the Notion API live on the request path.
- **Tailwind CSS** — styling.
- **Recharts** — per-domain result visualizations (radar-style charts, per the Player Motivation reference in the PRD).
- **Framer Motion** — animation/transitions (rating interactions, results reveal, etc.).
- **Netlify** — deployment target. **Do not deploy to production** — deployment is explicitly deferred until later; local dev only for now.

## Product context (from prd.md)

The product is the **AI Use Case Sentiment Explorer**: a web app where visitors rate AI use cases ("should a human or an AI do this?") on a 1–5 scale, get a personalized "AI attitude profile" visualization, compare their results against a friend or an aggregate of all visitors, and share a unique results link.

Architectural constraints from the PRD that any implementation must respect:

- **Domain-agnostic data model**: domains, subdomains, and use cases (103 at launch) must be configurable Supabase records sourced from Notion — new domains/use cases must be addable without schema migrations, redeploys, or code changes.
- **Anonymous by default**: no accounts, no PII. Ratings are written to Supabase anonymously. Optional demographic self-report (age range, gender, region) is a deprioritized P1 feature, also PII-free.
- **Bundled rating flow**: use cases are served in randomized bundles of 10, drawn across domains/subdomains — not grouped by domain in the UI — except the first-time-visitor bundle, which pulls 2 use cases each from 5 flagged "featured" domains.
- **Results before aggregate**: individual results must be shown before aggregate comparison data, to avoid anchoring bias. Aggregate data is withheld until a 25-respondent minimum threshold is met.
- **Shareable results**: results are exposed via a unique URL that both re-renders the sharer's profile (with OG meta tags for link previews) and is used to compare a new visitor's results against the sharer's.

Feature priority order (P0 → P1 → P2) and full acceptance criteria live in [prd.md](prd.md) — read the relevant section there before implementing a given feature rather than relying on a summary here.
