### New Prep Form

`components/NewPrepForm.tsx`. Client component, lives on the home page.

**Fields**

- Company (text input, required)
- Role (text input, required)
- Job description (textarea, optional, 4 rows)

**Behavior**

- Submit disabled while `company` or `role` is empty, or while the action is
  pending (`useTransition`)
- On submit: call `createPrepAndRunAgent` Server Action inside `startTransition`
- On success (`{ prepId }`): use `useRouter().push(`/prep/${prepId}`)` to
  navigate immediately — do not wait for AI work, per `09-server-actions-preps.md`
- On failure (`{ error }`): show the error message inline, keep the form filled
  in (don't clear the user's input on failure)

**Styling**

- Follow `ui-context.md` tokens exactly — same card/input/button treatment as
  every other form-like surface in the app

**Verify**

- Submitting with only "Company" filled in (no role) does not submit — button
  stays disabled
- A successful submit lands on `/prep/[id]` showing a "researching…" state
  within about a second, not a long blocking wait on the home page

**Status: not started**
