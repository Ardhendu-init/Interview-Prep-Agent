### Markdown Export

A `downloadMarkdown()` function inside `components/PrepGuideView.tsx`. Purely
client-side — the guide data is already loaded into the component, no server
round-trip needed.

**Behavior**

- Build a markdown string: title (company name), research summary section,
  concepts section (each with linked resources), questions section (each with
  category + hint)
- Wrap in a `Blob` (`type: "text/markdown"`), create an object URL, trigger a
  synthetic `<a download>` click, revoke the object URL immediately after
- Filename: `{company-slug}-interview-prep.md`, company name lowercased with
  spaces replaced by hyphens, non-alphanumeric characters stripped

**Verify**

- Click download on a real generated guide, confirm the `.md` file opens and
  renders correctly (headers, links, nested lists) in a markdown viewer

**Status: not started**
