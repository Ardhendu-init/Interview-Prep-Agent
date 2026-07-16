# UI Context

## Theme

Dark only. No light mode. A minimal technical-workspace aesthetic — near-black
background, layered dark-gray surfaces, a single blue accent for interactive
elements. No decorative gradients, no illustration — this is a utility tool, not
a marketing page.

## Colors

Tokens are Tailwind's built-in `neutral` and `blue` scales, used consistently
rather than introducing custom CSS variables for a project this size. Never use
arbitrary hex values in `className` — always one of the classes below.

| Role                    | Tailwind class                             |
| ------------------------ | -------------------------------------------- |
| Page background            | `bg-neutral-950`                              |
| Surface (cards)               | `bg-neutral-900`                              |
| Surface border                   | `border-neutral-800`                          |
| Input background                    | `bg-neutral-950` (inside a bordered field)     |
| Input border                           | `border-neutral-700`                          |
| Primary text                              | `text-neutral-100`                            |
| Secondary text                               | `text-neutral-300`                            |
| Muted text                                      | `text-neutral-400` / `text-neutral-500`       |
| Primary accent (buttons)                           | `bg-blue-600`, hover `bg-blue-500`            |
| Accent text (links)                                   | `text-blue-400`                               |
| Error                                                    | `text-red-400`                                |
| Success (e.g. "saved" indicator)                            | `text-green-400`                              |

## Typography

System font stack — do not add `next/font/google` or any external font fetch.
This avoids a build-time network dependency and keeps local dev/CI reliable.
Default Tailwind sizing: `text-2xl` page titles, `text-lg` section headers,
`text-sm` body copy, `text-xs` meta/labels.

## Border Radius

| Context                              | Class          |
| -------------------------------------- | -------------- |
| Inline / small UI (buttons, inputs)      | `rounded-md`   |
| Cards / panels                              | `rounded-lg`   |

No modal/overlay pattern in v1. If one is added later, define its radius here
first, before implementing it.

## Component Library

None. Plain Tailwind utility classes on native HTML elements. Do not introduce
shadcn/ui or another component library — the app is intentionally small enough
not to need one.

## Layout Patterns

- **Page shell**: single centered column, `max-w-3xl`, `mx-auto`, generous
  vertical padding (`py-10`). No sidebar, no multi-panel layout.
- **Home page (`app/page.tsx`)**: a "New Prep" call-to-action at the top, then a
  vertical list of past prep cards below (company, role, created date, a link
  into `/prep/[id]`). Empty state (no past preps) shows a short prompt instead
  of a blank list.
- **Prep page (`app/prep/[id]/page.tsx`)**: guide content first, mock interview
  chat below it, in that order, on one scrollable page — no tabs.
- **Cards**: every distinct content block (a past-prep list item, the research
  summary, a concept, a question, the chat panel) is its own
  `rounded-lg border border-neutral-800 bg-neutral-900` block with internal
  padding (`p-4` to `p-6` depending on density).
- **Loading states**: inline text within the relevant card/section
  (e.g. "Researching…"), not a full-page spinner — the user should always see
  the shell of what's coming.

## Icons

None currently used. If icons are needed later, use `lucide-react` rather than
inline SVGs, and document the addition here.
