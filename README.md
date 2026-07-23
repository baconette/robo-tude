# AI Use Case Sentiment Explorer

An interactive web experience where visitors rate real-world AI use cases — "should a human or an AI do this?" — and get back a personalized "AI attitude profile" they can compare against friends and the broader visitor pool.

## What this project does

Visitors rate AI use cases (103 at launch, organized into domains and subdomains) on a 1–5 scale from *Never* to *Always* a human should do it instead of AI. Ratings are served in randomized bundles of 10 so the experience feels like a continuous stream rather than a category-by-category survey. After each bundle, visitors see a personalized results visualization, can compare it against a friend's shared results or an aggregate of all visitors, and can share their own results as a unique link.

## Why this project is useful

Conversations about AI's role in creative, professional, and personal life tend to stay abstract and polarized. This app gives people a structured, low-friction way to articulate where *they* personally draw the line between human and AI-performed work, see how that compares to their peers, and discover AI use cases they hadn't considered before — turning an abstract debate into something personal and shareable.

Full product requirements, goals, and acceptance criteria live in [prd.md](prd.md).

## Getting started

This is a [Next.js](https://nextjs.org) app (App Router, TypeScript, Tailwind CSS) backed by Supabase, with use case content synced in from Notion.

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Other useful commands:

```bash
npm run build   # production build
npm run start   # run a production build
npm run lint     # lint
```

You'll need Supabase project credentials (ask a maintainer) to run anything beyond the default scaffolded page — see [CLAUDE.md](CLAUDE.md) for the current architecture and stack decisions.

## Where to find help

- [prd.md](prd.md) — product requirements, user stories, and acceptance criteria
- [CLAUDE.md](CLAUDE.md) — architecture, confirmed tech stack, and conventions for this repo

## Maintainers

This project does not yet have a public contribution process; reach out to the repository owner directly with questions.
