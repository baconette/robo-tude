---
name: match-design
description: Visual iteration loop for prototypes. Screenshots the running prototype, compares it against a Figma link or reference screenshot, and refines until a human would perceive them as the same design. Use when the user provides a Figma URL or an image as the design to match, either while building a prototype or to check an already-built one.
argument-hint: "[Figma link or screenshot to match, and which prototype/option]"
---

# Match a Prototype to a Visual Reference

Close the loop between what you built and the design you were given. Build → screenshot the running prototype → compare against the reference → refine → repeat, until a human would perceive the two as the same design.

The goal is **human-perceived equivalence, not pixel-perfection**. Implementations are usually responsive while a Figma frame is fixed-width, so exact dimensions will differ — that is expected and fine. The question is always "would a designer call this the same design?", never "do these overlap pixel-for-pixel?"

## Step 0 — Gate: is there a visual reference?

This loop only makes sense when there is something to diff against.

- **Figma URL, or a screenshot/image** → proceed.
- **Text description only, no image** → stop. Tell the user this loop needs a Figma link or a screenshot to compare against, and that you'll build to the description instead. Do not fabricate a reference.

## Step 1 — Get the reference image

- **Figma URL:** if the Figma plugin/MCP is available, use it (`get_screenshot` for the visual, `get_design_context` / `get_variable_defs` for exact colors, sizes, and layout). Capture the specific frame the user pointed at, not the whole file. If Figma isn't connected, ask the user for a screenshot of the frame instead.
- **Screenshot / pasted image:** use it directly.

Note the reference's **approximate width** (e.g. a ~1440px desktop frame, a ~520px modal, a ~375px mobile screen). You'll render the prototype at roughly this width so you're not comparing a wide design against a narrow render. Approximate is enough — don't fuss over exact pixels.

## Step 2 — Serve and screenshot the prototype

1. **Serve the kit locally** — option files may reference shared assets via relative paths, so serve over HTTP rather than opening as `file://`:
   ```
   python3 -m http.server 8000
   ```
2. **Screenshot the bare option file**, not the chrome wrapper — e.g. `http://localhost:8000/<prototype-folder>/option-1.html`. Screenshotting the wrapper (`index.html`) would include the navigation header and pollute the comparison. Render at roughly the reference's width.
3. **Capturing the screenshot is tool-agnostic — use whatever is available, and never get stuck:**
   - Prefer `agent-browser` if it's installed (`agent-browser open <url> && agent-browser screenshot`, then `agent-browser close`). Note: `agent-browser` is not part of this kit and may not be on the PATH for everyone — don't assume it exists.
   - Otherwise use any available headless-browser / screenshot tool (e.g. a Playwright or Chrome-based MCP).
   - **If no screenshot tool is available at all, do not loop blindly or give up silently.** Tell the user which tool to install (e.g. `agent-browser`) to enable the automatic loop, or ask them to paste a screenshot of the running prototype so you can still compare manually.

## Step 3 — Compare against the rubric

Put your screenshot next to the reference and write down **concrete, specific gaps** under each heading. Don't say "looks close" — name what's off.

- **Layout & spacing** — element positions, alignment, gaps, padding, overall structure.
- **Typography** — font size, weight, line height, and hierarchy.
- **Color** — background, text, border, and accent colors match the reference. If the reference is a Figma frame, pull exact values from it rather than eyeballing.
- **Component fidelity** — buttons, inputs, cards, and other UI elements match the reference's shape, size, and states — not rough approximations.
- **Icons & images** — the correct icon glyph, at the right size, not an approximation. Any images, avatars, or illustrations present in the reference are present and correctly placed.
- **Content** — labels, text, states, and any elements shown in the reference are all present.

Static appearance only — don't chase hover/interaction states in this loop.

## Step 4 — Refine

Fix the biggest gaps first (layout and structure before fine spacing and color). Then re-screenshot (back to Step 2).

## Step 5 — Stop condition

Stop when **either**:
- The remaining gaps are trivial — anti-aliasing, sub-pixel spacing, negligible differences a human wouldn't notice — i.e. a designer would call it the same design; **or**
- You have completed **4 iterations**. Do not keep looping past this.

## Step 6 — Report honestly

Give the user:
1. A short summary of what you changed across iterations.
2. A final side-by-side: your latest prototype screenshot next to the reference.
3. **Any remaining known discrepancies** you couldn't resolve (especially if you hit the 4-iteration cap). Be honest — don't claim a perfect match when there are known gaps. If you stopped at the cap, say what still differs and why it was hard to close.
