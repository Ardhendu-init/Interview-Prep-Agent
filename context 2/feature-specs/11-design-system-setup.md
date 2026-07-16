### Design System Setup

`app/globals.css`, `app/layout.tsx`, `tailwind.config` (if a config file is
generated — Tailwind v4's zero-config setup may not need one, use whatever the
scaffolding tool produces, do not hand-roll a config unless a token in
`ui-context.md` genuinely can't be expressed with default Tailwind classes).

**`app/layout.tsx`**

- No `next/font/google` — system font stack per `ui-context.md`
- `<html lang="en" className="h-full antialiased">`, `<body className="min-h-full flex flex-col">`
- Metadata: title "Interview Prep Agent", a one-line description matching
  `project-overview.md`'s Overview paragraph

**`app/globals.css`**

- Tailwind's base/components/utilities imports (per whatever the installed
  Tailwind version's convention is — v4 differs from v3, check
  `package.json` after scaffolding and use the matching import syntax)
- No custom CSS beyond what Tailwind's reset provides — if a component needs a
  style Tailwind utilities can't express, that's a signal to reconsider the
  design, not to add custom CSS, for a project this size

**Verify**

- A fresh `npm run build` produces no network calls to any font CDN
- Every color/spacing/radius value used anywhere in the app traces back to a row
  in `ui-context.md`'s tables — if you introduce a new one while building later
  feature-specs, add it to `ui-context.md` in the same step, don't leave it
  undocumented

**Status: not started**
