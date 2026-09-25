# Draft Assist — legal in-form drafting extension

Drafting help inside the forms you already use — your key, your data.

A Chrome MV3 extension that drafts legal text inside browser forms (court
e-filing portals, bar forms, client intake): you type a brief phrase, it shows
a ghost-text continuation, and nothing is inserted unless you accept it.

## Security posture (invariants, enforced by CI)

1. **Sensitive fields are never captured.** Password, credit-card
   (`autocomplete="cc-*"`), one-time-code, hidden, and `autocomplete="off"`
   fields are filtered at capture — never read, stored, or sent.
   Enforced by table-driven unit tests plus a browser e2e that asserts typing
   a password produces **zero** outbound provider requests.
2. **Your API key never appears in a URL.** Keys travel in request headers
   (`x-goog-api-key` for native Gemini endpoints, `Authorization: Bearer` for
   OpenAI-compatible endpoints). Enforced by unit tests plus a grep-style CI
   guard against key-in-URL patterns.
3. **Key material lives in `chrome.storage.local` only.** Never `sync` (which
   replicates to the user's Google account), never logged. A one-time
   migration moves pre-hardening `sync` blobs into local storage and deletes
   the sync copy.
4. **Least-privilege permissions.** No static host permissions and no static
   content scripts. The extension injects only into sites the user grants at
   runtime (`activeTab` + optional per-site origin grants).
   Enforced by `npm run check:manifest`.
5. **Human-in-the-loop, always.** Every suggestion requires explicit user
   action (Tab to accept). The extension never auto-submits anything.
   Esc rejects a suggestion and suppresses it until the field is re-focused.
6. **No telemetry of form content.** Page-context extraction sends only
   title/meta/labels — never field values — and is itself filtered through
   the sensitive-field rules.

## Legal-context controls

Detection is conservative: known legal-practice hosts (e-filing portals,
CM/ECF, bar associations, legal SaaS) activate automatically; everything else
requires two distinct legal-vocabulary signals; undetected sites default to a
user decision — **never silent activation**. A visible indicator shows when
drafting assist is active, and per-site enable/disable persists.

## BYOK (bring your own key)

Settings live in the extension popup: provider endpoint (native Gemini
`generateContent` or any OpenAI-compatible chat-completions endpoint), model,
API key, plus a connection test with explicit error states (invalid key,
quota, network — no silent failure). The default Gemini model is pinned in
`extension/src/types.ts` with its verification date from Google's model
lifecycle documentation.

## Development

```bash
npm install
npm run build          # webpack production build -> extension/dist/
npm run lint
npm run typecheck
npm test               # vitest unit suites
npm run check:manifest # MV3 least-privilege lint
npm run check:secrets  # key-in-URL / content-logging grep guard
```

Load the build in Chrome via `chrome://extensions` → Developer mode →
"Load unpacked" → select `extension/dist/`.

### Browser e2e

```bash
npm run build
node test/e2e/mock-provider.mjs &     # OpenAI-compatible mock (port 8788)
node test/e2e/fixture-server.mjs &    # fixture pages (port 8787)
node test/e2e/prepare-dist.mjs        # copies dist, patches in local grants
node test/e2e/run-e2e.mjs             # Playwright, real Chromium, extension loaded
```

Covers: password fields produce no outbound request; ghost text appears on a
legal drafting field; Tab accepts; Esc rejects and suppresses; the indicator
renders on legal forms; non-legal forms stay silent. Screenshots land in
`/home/user/evidence/`.

## Repository layout

```
extension/src/
  content.ts            content script: capture gating, ghost text, key handling
  background.ts         service worker: settings, activation, predictions, registration
  services/
    fieldFilter.ts      sensitive-field classification (pure, tested)
    contextDetection.ts legal-context detection (pure, tested)
    siteActivation.ts   per-site activation decisions (pure, tested)
    ai.ts               provider request construction + parsing (pure, tested)
  utils/ui.ts           indicator, ghost text, loader rendering
  popup.tsx             settings UI (Mantine)
test/e2e/               browser e2e harness (mock provider, fixtures, driver)
scripts/                CI guard scripts (manifest lint, secret patterns)
```

## Status and kill criteria

This is the MVP of a legal-drafting pivot. Per the repivot strategy, the
project is judged 90 days after launch against: ≥5 practitioner installs,
≥1 weekly-active drafter, and evidence that suggestions are accepted (not
dismissed). If those are not met, the honest next step is archiving, not
more features. Distribution: Chrome Web Store free core; store submission
(account + one-time fee) belongs to the maintainer.
