@AGENTS.md

Add as a new top-level section near the bottom of CLAUDE.md, after any existing workflow rules.\n\n## Verification Before Claiming Done

- Never claim a feature is 'complete' without actually running/verifying it works
- For theme/styling changes, verify the class is actually applied to the DOM (e.g., `.dark` on `<html>`)
- For env-dependent integrations (Clerk, auth), check that env vars are set, not just provider config
  Add as a new ## Git Workflow section near the top of CLAUDE.md.\n\n## Git Workflow
- After each logical feature, create a separate commit with a clear message
- Push to GitHub after completing work unless told otherwise
- Before initial pushes, check for embedded .git directories from starter kits and clean them up
  Add as a new ## Spec-Driven Development section in CLAUDE.md.\n\n## Spec-Driven Development
- Always read the spec files first before implementing features
- After completing spec'd work, update the progress tracker file
- Implement multi-feature specs sequentially with separate commits per feature