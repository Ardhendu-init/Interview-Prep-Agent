# UI Context

## Theme

**Superseded by `18-uiux-enhancement.md`.** The app now ships four switchable
themes instead of the original dark-only design: Dark (default), Midnight,
Graphite, and Light. A minimal technical-workspace aesthetic is preserved
across all four — layered surfaces, a single accent color for interactive
elements, no decorative gradients, no illustration. See "Theme System" below
for the mechanism and exact tokens.

## Colors

Colors are no longer hardcoded Tailwind `neutral`/`blue` classes in
`className` strings (that was the pre-`18` approach). Instead, semantic CSS
custom properties are defined per theme in `app/globals.css` under
`:root`/`[data-theme="…"]` selectors, and registered as Tailwind v4 color
utilities via a top-level `@theme inline` block that maps `--color-*` tokens
to the same underlying variables. This means a plain utility class like
`bg-surface` resolves to `var(--surface)` at runtime and repaints instantly
when `data-theme` changes on `<html>` — no rebuild, no React re-render needed
for the color values themselves.

Always use these semantic classes — never `bg-neutral-900`, `text-blue-400`,
or any other raw Tailwind palette class, and never an arbitrary hex value.

| Role                              | Tailwind class (semantic token)         |
| ---------------------------------- | ----------------------------------------- |
| Page background                      | `bg-bg`                                     |
| Surface (cards, panels)                 | `bg-surface`                                  |
| Surface hover (list/menu item hover)       | `bg-surface-hover`                              |
| Surface border                                | `border-border`                                   |
| Primary text                                     | `text-fg`                                           |
| Secondary text                                      | `text-fg-secondary`                                   |
| Muted text                                             | `text-fg-muted`                                         |
| Primary accent (buttons, active states)                   | `bg-accent`, hover `bg-accent-hover`                      |
| Accent text (links)                                          | `text-accent`                                               |
| Text on an accent-colored surface                               | `text-accent-fg` (not always white — Graphite's green accent needs dark text for contrast) |
| Error                                                              | `text-danger` / `bg-danger`                                          |
| Text on a danger-colored surface                                      | `text-danger-fg`                                                        |
| Success (e.g. "saved" indicator, toast)                                   | `text-success`                                                            |
| Interview panel surface (elevated)                                         | `bg-surface border-l border-border shadow-lg` (see `22-Interview-panel-redesign.md` — same surface color as every other card; elevation comes from the shadow and fixed positioning, not a distinct color) |

### Theme System

Four themes, switched by setting `data-theme` on `<html>`:

| Theme      | Background | Surface   | Accent    | Notes                          |
| ---------- | ---------- | --------- | --------- | ------------------------------ |
| `dark`     | `#0F172A`  | `#1E293B` | `#3B82F6` | Default; matches the original dark-only spec's suggested slate colors |
| `midnight` | `#020617`  | `#0F172A` | `#3B82F6` | Blue-black, deepest background of the four |
| `graphite` | `#111111`  | `#1C1C1C` | `#22C55E` | Gray/black, green accent — the only theme with a non-blue accent and a dark (`#052e12`) `accent-fg` for contrast |
| `light`    | `#FFFFFF`  | `#F8FAFC` | `#2563EB` | Only light theme; `color-scheme: light` set on `html[data-theme="light"]` so native form controls/scrollbars render correctly |

Full token values live in `app/globals.css`; `lib/theme.ts` exports the
`Theme` union type, the theme list, the `localStorage` key
(`interview-prep-theme`), and `THEME_INIT_SCRIPT` — a tiny inline script
string injected via a blocking `<script>` in `app/layout.tsx`'s `<head>` that
reads `localStorage` and sets `data-theme` before first paint, avoiding a
flash of the wrong theme. `components/ThemeSwitcher.tsx` (in the navbar) is
the only place that writes to `localStorage` / changes `data-theme` after
that point — instant, no page refresh, per spec.

## Typography

Still system font stack — `18-uiux-enhancement.md` suggested Inter/Geist/IBM
Plex Sans, but `next/font/google` (or any external font fetch) remains
off-limits per the original reasoning (avoids a build-time network
dependency, keeps local dev/CI reliable). The system-ui stack already reads
as a modern sans-serif on every major OS, so this satisfies the spec's intent
without the network dependency. Revisit only if a self-hosted (non-Google)
variable font is added deliberately, documented here first.

Hierarchy: `text-2xl font-semibold` hero/page titles, `text-lg font-medium`
section headers, `text-sm` body copy, `text-xs` meta/labels/muted captions.

## Border Radius

| Context                              | Class          |
| -------------------------------------- | -------------- |
| Inline / small UI (buttons, inputs)      | `rounded-md`   |
| Cards / panels                              | `rounded-lg`   |
| Chat bubbles                                   | `rounded-2xl`, with the "speaking" corner flattened to `rounded-bl-sm`/`rounded-br-sm` |
| Toasts / theme dropdown                           | `rounded-lg`   |

## Component Library

Still no `shadcn/ui` or similar full component library. `18-uiux-enhancement.md`
required consistent button variants, cards, form fields, skeletons, toasts,
and empty states across every theme, so a small internal set of primitives
now lives in `components/ui/`:

- `Button.tsx` — variants `primary` | `secondary` | `outline` | `ghost` | `danger`, sizes `sm` | `md`
- `Card.tsx` — `hover` prop for elevation-on-hover (list items, concept/question cards)
- `Field.tsx` — `Input`, `Textarea`, `Label`, shared focus-ring + `invalid` styling
- `Skeleton.tsx` — pulsing placeholder block for loading states
- `EmptyState.tsx` — icon + title + description + optional action
- `Toast.tsx` — `ToastProvider` (mounted once in `app/layout.tsx`) + `useToast()` hook (`showToast(message, variant)`, variants `info`/`success`/`error`)

These are still plain Tailwind utility classes underneath, just factored out
because every distinct button/card/field previously repeated the same long
`className` string. Do not add a third-party UI kit — this set is meant to
stay small.

Icons: `lucide-react` is now a dependency (previously "none currently used,
add if needed later" — this is that "later"). Used in the navbar, breadcrumb,
chat, and buttons. Do not introduce inline SVGs or a second icon set.

Animation: `framer-motion` is now a dependency, used for page-transition
fade-in (`components/PageTransition.tsx`), chat bubble entrance/typing
indicator, toast enter/exit, theme-dropdown open/close, and the interview
progress bar's width transition. A couple of pure-CSS keyframes
(`animate-typing-dot`, `animate-fade-in-up`) also live in `globals.css` for
cases that don't need JS (list-item stagger, typing dots) — prefer Framer
Motion for anything that needs exit animations or is already inside a client
component.

## Layout Patterns

- **Page shell**: single centered column, `max-w-3xl`, `mx-auto`, generous
  vertical padding (`py-10`), horizontal `px-4` (added for mobile — the
  original spec's centered column had no horizontal padding, which clipped
  content edge-to-edge on narrow viewports).
- **Navbar** (`components/Navbar.tsx`): sticky (`sticky top-0`), translucent
  blurred background (`bg-bg/80 backdrop-blur-sm`), logo + wordmark on the
  left, theme switcher + a decorative anonymous-session avatar badge on the
  right. There's no real user/account system (see `project-overview.md`), so
  the avatar is a static, non-interactive badge with a `title` tooltip — not a
  profile menu with fake account actions.
- **Breadcrumb / back navigation** (`components/PrepBreadcrumb.tsx`): every
  `/prep/[id]` page shows a "Back to Home" link plus a `Home → {Company}
  Interview` breadcrumb above the guide. There's no separate "Companies"
  listing page in this app's architecture (the home page itself lists past
  preps), so the breadcrumb is two levels, not three.
- **Home page (`app/page.tsx`)**: a "New Prep" call-to-action at the top, then
  a vertical list of past prep cards below (company, role, created date, a
  link into `/prep/[id]`). Empty state uses `components/ui/EmptyState.tsx`.
- **Prep page (`app/prep/[id]/page.tsx`)**: breadcrumb, then guide content
  (research summary, concepts, questions) with an `InterviewHeroCTA` at the
  top of that column. **Superseded by `22-Interview-panel-redesign.md`:** the
  mock interview is no longer a bottom-of-page block — the Hero CTA opens
  `InterviewPanel` (`components/InterviewPanel.tsx`) as a resizable side panel
  docked to the right (desktop), expandable to a full-viewport focus mode, or
  the mobile-only bottom tab bar (`Preparation`/`Interview`, `md:hidden`)
  below 768px — one clear entry point, one panel, no separate "collapsed
  panel" affordance. Panel open/width UI state persists in `localStorage` via
  `lib/panel-state.ts`; interview turn history itself is unaffected, still
  database-backed via `initialTurns`/Server Actions exactly as before.
- **Cards**: every distinct content block (a past-prep list item, the research
  summary, a concept, a question, the chat panel) uses `components/ui/Card.tsx`
  (`rounded-lg border border-border bg-surface`, `hover` prop where the block
  is a clickable/interactive item).
- **Loading states**: `components/ui/Skeleton.tsx` blocks inside the relevant
  card/section (guide research/concepts while generating), plus inline status
  text — not a full-page spinner. The user always sees the shape of what's
  coming.
- **Chat** (`components/MockInterviewChat.tsx`): interviewer bubbles left
  (`bg-surface-hover`), candidate bubbles right (`bg-accent`), subtle
  timestamp caption under each bubble, auto-scroll to the latest message, a
  typing-indicator bubble while the interviewer's next turn is generating, and
  a slim non-intrusive progress bar (question count / total, elapsed timer,
  completion %) above the message list.

## Icons

`lucide-react` (see Component Library above). Do not use inline SVGs or
another icon set.
