# Chrome Web Store listing — Draft Assist

Everything the store submission needs in one place. The actual submission is
the maintainer's step (their developer account, one-time fee) — this document
supplies the copy and the permission justifications reviewers ask for.

## Store metadata

- **Name:** Draft Assist
- **Summary (132 chars max):** Drafting help inside the forms you already use — your key, your data.
- **Category:** Productivity → Tools
- **Language:** English (United States)

## Description

Draft Assist brings AI drafting help to the browser forms legal work actually
happens in: court e-filing portals, bar-association forms, and client intake.

Type a brief phrase — "Indemnification — contractor liable only for
negligence" — and Draft Assist shows a gray ghost-text continuation. Press Tab
to accept it, Esc to reject it. Longer suggestions (full clauses, caption
blocks) come with an Accept / Edit / Regenerate popover. Nothing is ever
inserted or submitted without your explicit action.

**Drafting-specific help**

- **Expand clause** — a brief phrase becomes a complete, contract-ready clause
- **Caption block** — court-style captions from the matter details you type
- **Defined terms** — suggestions that reuse the terms your draft already uses
- **Plain English** — a rewrite of legalese-dense text at a plainer reading level

**Bring your own key. No accounts. No servers.**

Your API key (native Gemini or any OpenAI-compatible endpoint) stays in this
browser and travels only in request headers — never in URLs. Connect a
provider in settings and press "Test connection" for an immediate, explicit
result.

**Privacy posture**

- Sensitive fields are never read: password, credit-card, one-time-code,
  hidden, and autofill-disabled fields are filtered before anything is captured
- No telemetry of form content, ever
- Page context sent to your provider is limited to title and field labels —
  not the values you type into other fields

**Conservative by default**

Draft Assist activates on known legal-practice sites and asks you on unknown
ones — it never switches itself on silently. A visible indicator shows when
it's active, and per-site enable/disable is one click away.

## Permission justifications

MV3 review requires a justification for every permission. These match the
manifest exactly.

| Permission | Why it is required |
| --- | --- |
| `storage` | Saves BYOK settings (provider endpoint, model, API key) and per-site enable/disable preferences in `chrome.storage.local`. The API key is never placed in `sync` storage and never leaves the browser except inside an authenticated request header to the provider endpoint the user configured. |
| `activeTab` | Grants temporary access to the form field in the tab the user is working in when they invoke the extension, so ghost-text suggestions can render in the field they clicked. |
| `scripting` | Registers the content script into origins the user explicitly granted at runtime (optional host permissions), so drafting assist appears on the legal forms they approved. |
| `optional_host_permissions: https://*/*, http://*/*` | Requested **only** as per-site origin grants the user approves in the popup ("Grant access to this site") or via Chrome's permission prompt. The extension ships with zero static host permissions and never requests broad access. |

## Data usage disclosures (store form)

- **Does the item collect user data?** No. Form content the extension reads is
  sent only to the provider endpoint the user configured, using the user's own
  API key, and is never transmitted to the developer or any third party.
- **Single purpose:** AI-assisted drafting of text in browser form fields.
- **Remote code:** None. The package contains no remotely hosted code.

## Assets

- Icons: `public/icon48.png`, `public/icon128.png` (generated; pen nib +
  scales of justice on violet)
- Screenshots: produced from the e2e fixture run into `store-assets/`
  (1280×800 PNG)
- Upload artifact: `dist-packages/draft-assist-v<version>.zip` via
  `npm run package`
