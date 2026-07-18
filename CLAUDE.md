@AGENTS.md

## Git Workflow

- After each logical feature, create a separate commit with a clear message
- Push to GitHub after completing work unless told otherwise
- Before initial pushes, check for embedded .git directories from starter kits and clean them up

## Spec-Driven Development

- Always read the spec files first before implementing features
- After completing spec'd work, update the progress tracker file
- Implement multi-feature specs sequentially with separate commits per feature

## Verification Before Claiming Done

- Never claim a feature is 'complete' without actually running/verifying it works
- For theme/styling changes, verify the class is actually applied to the DOM (e.g., `.dark` on `<html>`)
- For env-dependent integrations (Clerk, auth), check that env vars are set, not just provider config
