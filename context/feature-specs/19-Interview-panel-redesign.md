### Interview Panel Redesign — Split Layout

UI-only change. No backend logic, no Server Action signatures, no database schema,
and no AI prompt logic in `lib/ai/` may change as part of this feature-spec. If
implementing this reveals a need to change any of those, stop and flag it rather
than doing it silently — see `ai-workflow-rules.md`.

**Goal**: make the mock interview the primary, always-reachable action on
`/prep/[id]`, not something scrolled past. Three states — hero CTA, an
expanded side panel, and a full-screen focus mode — replacing the current
bottom-of-page chat placement.

---

#### New files

- `components/InterviewPanel.tsx` — the panel itself, all three states
- `components/InterviewHeroCTA.tsx` — the top-of-page entry point
- `lib/panel-state.ts` — tiny `localStorage` read/write helpers for panel UI
  state (open/closed, width) — **UI state only, not interview data**; interview
  turns still come from the database exactly as already built

#### Modified files

- `app/prep/[id]/page.tsx` — layout restructure to host the split view: the
  ready-state `<main>` drops its own `max-w-3xl mx-auto` (moved down into
  `PrepGuideView`'s own wrapper, see below) so the panel's fixed-position math
  has the true full viewport width to work against, not an already-centered
  768px box; `PrepBreadcrumb` gets its own `max-w-3xl mx-auto` wrapper so its
  appearance is pixel-identical to before
- `components/PrepGuideView.tsx` — **added to this list (resolved ambiguity,
  edited in this step):** the original draft didn't name this file, but it's
  the only existing client component that already owns all guide/interview
  render state and already mounted `MockInterviewChat` at the bottom — it's
  the natural (and lowest-footprint) owner of the new panel-open/focus-mode/
  mobile-tab state, the Hero CTA placement, and the prep-content
  hide/reflow logic. `app/prep/[id]/page.tsx` is a Server Component and can't
  hold `localStorage`-derived UI state itself.
- `components/MockInterviewChat.tsx` — becomes a child rendered *inside*
  `InterviewPanel.tsx` instead of a standalone bottom-of-page block; its own
  props/behavior (start/send/turn history) do not change. Two purely
  cosmetic/accessibility additions that touch neither: `aria-live="polite"` on
  the existing messages container (see Accessibility below), and the reserved
  empty mic-icon slot next to the send button (see Explicitly Cut below).
- `context/ui-context.md` — add the one new token below (do this in the same
  step, not as an afterthought)

---

**Resolved before implementation (edited in this step):** this spec predates
`18-uiux-enhancement.md`'s semantic-token theme system and emoji-free icon
convention (`ui-context.md`'s Colors/Icons sections, `code-standards.md`'s
Styling section — raw Tailwind palette classes like `bg-neutral-900`/
`bg-blue-600` are banned since they don't repaint on theme change, and every
icon in the app is `lucide-react`, never emoji). Below, every raw-palette
class and emoji is replaced with its semantic-token / `lucide-react`
equivalent; behavior is unchanged.

#### State 1 — Hero CTA

Lives at the top of `/prep/[id]`, above the research summary card.

- Not started: `Start AI Interview` (`Rocket` icon) — primary `Button` variant
  (`bg-accent hover:bg-accent-hover`, via `components/ui/Button.tsx`)
- In progress (`turns.length > 0`, interview not explicitly ended):
  `Resume Interview — Question {n} of {total}` with a small `bg-success` dot
  in place of 🟢 — reuse the existing question-count logic already available
  from `guide.questions.length` and `turns` count. Since `MockInterviewChat`'s
  own turn state is intentionally left untouched (see Modified Files below),
  this count is computed from the server-loaded `initialTurns` snapshot, the
  same one `MockInterviewChat` itself starts from — it does not live-update
  turn-by-turn while the panel stays open in the same session, only on next
  load/navigation. Acceptable since the panel's own in-progress bar (already
  built, `ui-context.md`'s Chat section) is the live source of truth once
  open.
- Clicking either: opens `InterviewPanel` in **expanded** state (not focus
  mode — see below) and writes `open: true` to `localStorage` via
  `lib/panel-state.ts`
- This is the *only* trigger that opens the panel. Do not add a second
  "collapsed panel" affordance elsewhere on the page — one clear entry point.

#### State 2 — Expanded (side panel)

- Renders as a fixed-position panel docked to the right edge of the viewport,
  `bg-surface`, `border-l border-border`, `shadow-lg` (see new token below for
  why `shadow-lg` specifically, not a heavier shadow) — same semantic surface
  token as every other card, per the resolved-ambiguity note above
- Width: resizable via a drag handle on the panel's left edge —
  `min-width: 360px`, `max-width: 45vw`, default `34vw`. Persist the chosen
  width to `localStorage` on drag-end (debounced, not on every pixel of drag)
- Contents, top to bottom: mini header (`Bot` icon + "Interview", question
  progress, an expand-to-focus-mode icon button, a close icon button), then
  the existing `MockInterviewChat` content unchanged
- Preparation content (research summary, concepts, questions list) remains
  fully visible and scrollable in the remaining viewport width to its left —
  this is the actual point of the split layout, don't let the panel become a
  full overlay at this state
- Animate width changes (open/close, not user drag) with Framer Motion,
  250-350ms, `ease-in-out`

#### State 3 — Focus mode

- Triggered by the expand icon in the panel header, or programmatically never
  triggered directly from the hero CTA (per the single-entry-point rule above)
- Panel animates from its current width to `100vw`, same 250-350ms transition
- Preparation content is hidden entirely while focus mode is active (not just
  scrolled off — actually unmounted or `display: none`, to keep it out of the
  tab order, see accessibility below)
- Header shows `← Back to Preparation` (returns to expanded state, not closed)
  plus the same question progress indicator
- Chat area maximized, same message/input components as expanded state, just
  more vertical room

#### Accessibility (implement exactly this, not a generic "add ARIA")

- On entering focus mode: trap keyboard focus within the panel (standard focus
  trap — first/last focusable element wraps); pressing `Escape` returns to
  expanded state
- On the panel opening from any state: move focus to the panel's first
  interactive element (the answer input, once an interview is in progress, or
  the "start" button if not)
- On the panel closing (from any state, back to Hero CTA only): return focus
  to the hero CTA button — never leave focus in a removed/hidden element
- New interviewer messages appear in a container with `aria-live="polite"` so
  screen readers announce new AI responses without interrupting the user mid-typing
- The drag-resize handle has `role="separator"` and `aria-orientation="vertical"`,
  and is operable via arrow keys (left/right) in addition to mouse drag — do
  not ship a mouse-only resize control

#### Mobile (< 768px, matching Tailwind's `md` breakpoint)

- No split layout, no side panel at any width
- Bottom tab bar with two tabs: `Preparation` / `Interview` — switching tabs
  swaps the full-viewport content, it does not overlay or drawer in
- The Hero CTA still appears on the Preparation tab; tapping it switches to
  the Interview tab directly (skips the concept of "opening a panel" on
  mobile entirely — there's only one interview view here, equivalent to
  desktop's focus mode)

#### State persistence

- `localStorage` keys: `interview-panel-open` (boolean), `interview-panel-width`
  (number, px). Both pure UI preference, read on mount, written on change.
- Interview turn history is **not** part of this persistence — that already
  works via the database per the existing spec; do not duplicate it into
  `localStorage`
- On page load, if `interview-panel-open` is `true`, restore the panel in
  expanded state (never restore directly into focus mode — that's a jarring
  first paint) at the last saved width

#### Explicitly cut from the original design doc (say why, don't just drop silently)

- **Collapsed panel state removed** — redundant with the Hero CTA, per the
  single-entry-point decision above
- **Voice/microphone icon**: reserve the layout space next to the send button
  (a fixed-width empty slot) but do not render an actual icon or any handler —
  a real placeholder would invite someone to think it's functional.
  **Superseded**: implemented in a later session as `18-uiux-enhancement.md`
  section 2 — the reserved slot now hosts a working mic button
  (`SpeechRecognition`-backed voice input, disabled-with-tooltip fallback
  when unsupported). See `ui-context.md`'s Chat section.
- **Practice Questions section behavior unchanged** — it stays exactly as
  currently built, always visible in the preparation column. Not collapsing
  or hiding it dynamically when the interview starts is a deliberate scope cut
  for time, not an oversight — revisit post-hackathon if it feels redundant
  in practice

---

#### New design token — add to `context/ui-context.md`

| Role | Tailwind class |
|---|---|
| Interview panel surface (elevated) | `bg-surface border-l border-border shadow-lg` |

This is deliberately the *same* surface color as existing cards
(`bg-surface`) — elevation here comes from the shadow and the fixed
positioning over the content, not a different color, to stay consistent with
the theme system rather than introducing a new "panel" color that doesn't
exist anywhere else in the app. (Updated from the original draft's raw
`bg-neutral-900`/`border-neutral-800` to the semantic tokens `18` introduced —
same visual intent, theme-reactive.)

---

**Verify**

1. Opening the interview from the hero CTA lands in expanded state, prep
   content still visible and scrollable to its left
2. Dragging the resize handle changes panel width live, persists across a
   page refresh
3. Expand-to-focus-mode hides prep content entirely, `Escape` returns to
   expanded state, focus never gets lost or stuck
4. On a real screen reader (or the accessibility tree in devtools), a new
   interviewer message triggers an announcement without stealing focus from
   the input while typing
5. At a mobile viewport width, no split layout ever renders — only the tab
   bar pattern
6. Refreshing the page with the panel previously open restores it open, at
   the previously saved width, in expanded (not focus) state
7. No file under `lib/ai/`, `lib/db/`, or `app/actions.ts` has a diff — if
   `git diff` shows changes there, something went out of scope

**Status: done** — see `progress-tracker.md` for implementation notes and verification.