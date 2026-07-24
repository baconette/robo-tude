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

## Supabase + Notion sync (built)

- `src/lib/supabase/client.ts` / `server.ts` — typed `SupabaseClient<Database>` factories (browser and server). No `@supabase/ssr`/cookie auth — visitors are anonymous, so a plain anon-key client is sufficient on both sides. `server.ts` is guarded with `server-only`.
- `src/lib/supabase/types.ts` — generated via `npx supabase gen types typescript --linked`; regenerate after any schema change.
- Content tables (`domains`, `use_cases`) already existed in the linked Supabase project before this work started — schema is **not** the uuid-surrogate-key design you might expect from a from-scratch design. Both tables are keyed directly by `notion_id` (the Notion page ID), and `use_cases.domain_id` is a text FK straight to `domains.notion_id` — no separate lookup/join table. `domains` has no publish gate (it's just a container; a domain with no published use cases simply has nothing to show). `use_cases.published` gates all visitor-facing visibility, enforced by the `"Public can read published use cases"` RLS policy (`using (published = true)`) — anon/authenticated grants are SELECT-only, tightened via migration.
- `supabase/functions/notion-sync/` — Deno Edge Function that pulls both Notion data sources (Domains, AI-use-cases), upserts into `domains`/`use_cases` by `notion_id`, mirrors domain images into the `domain-images` Storage bucket, and soft-deletes (`published = false`) rows that disappear from Notion — never a hard delete. Deployed with `npx supabase functions deploy notion-sync --use-api` (`--use-api` avoids needing Docker, which isn't installed locally).
- Scheduled via `pg_cron` + `pg_net` (`supabase/migrations/..._schedule_notion_sync_cron.sql`), daily at 06:00 UTC. Secrets (`NOTION_API_TOKEN`, `NOTION_DOMAINS_DATA_SOURCE_ID`, `NOTION_USE_CASES_DATA_SOURCE_ID`) are set via `npx supabase secrets set` — never in app env files. `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are auto-injected into the function by Supabase.
- Local dev has no Docker, so the standard `supabase start`/`functions serve` workflow doesn't work here — migrations go straight to the remote project via `npx supabase db push`, and the function is tested by invoking its deployed URL directly rather than serving locally. `supabase/functions logs` isn't available in this CLI version either; verify sync results by querying the tables directly instead.
- `supabase/functions/notion-sync/**` is excluded from both `tsconfig.json` and `eslint.config.mjs` — it's Deno code (uses `npm:`-specifier imports, `Deno.serve`, `Deno.env`) and isn't type-checked or linted by the Next.js app's tooling.

## Prototyping kit (`prototypes/`, isolated)

- `prototypes/` vendors [pendar/prototype-kit](https://github.com/pendar/prototype-kit) verbatim — a static, buildless HTML prototype viewer, unrelated to the Next.js app. It has its own `index.html` viewer, its own directory-scoped Claude skills (`prototypes/.claude/skills/{design-brainstorm,match-design,ux-writing}`), and no `package.json`.
- **Fully isolated from the app's tooling**: `prototypes/**` is excluded from both `tsconfig.json` and `eslint.config.mjs` (same pattern as `supabase/functions/notion-sync/**`), and it sits outside `src/app` so Next's router never sees it.
- Local dev: `cd prototypes && ./generate-manifest.sh && python3 -m http.server 8000` — separate port from `npm run dev` (3000), runs alongside it. Re-run `generate-manifest.sh` (and commit the updated `prototypes.json`) whenever a prototype is added or removed.
- **Hosted feedback link**: `.github/workflows/deploy-prototypes.yml` deploys `prototypes/` to GitHub Pages via GitHub Actions on every push to `main` touching `prototypes/**` (or manual dispatch). This is scoped to the subfolder deliberately — plain "deploy from branch" Pages only supports `/` or `/docs`, which would collide with the app at repo root. Requires the one-time repo setting Settings → Pages → Source: "GitHub Actions" (not yet flipped — do this before relying on the workflow). This is separate from, and does not affect, the app's own deferred Netlify deploy above.
- **Lifecycle**: expect many disposable prototypes here. When one is chosen, manually port its markup/styling into the `shad-DS` branch's shadcn component work (`src/components/ui/`) — that's a deliberate manual translation step (static HTML → typed React/shadcn), not scripted.

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
