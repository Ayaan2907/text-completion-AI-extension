#!/usr/bin/env node
/**
 * E2E for the legal-drafting extension, driven through real Chrome with the
 * unpacked e2e build loaded as an extension.
 *
 * Ghost-text mechanism (selection-based): showPrediction() inserts the
 * predicted continuation into the field and highlights it via selection,
 * marking the element with data-prediction. Tab accepts it (value becomes
 * original + prediction, marker removed); Esc sets data-prediction-rejected
 * and suppresses re-firing until refocus.
 *
 * Covered:
 *  TC1  password typing on a legal form produces NO outbound provider request
 *  TC2  ghost text appears on a legal drafting field, Tab accepts, Esc rejects
 *  TC3  active indicator renders on a detected legal form
 *  TC4  a non-legal form never activates the assist (no UI, no requests)
 *
 * Run: node test/e2e/run-e2e.mjs  (after prepare-dist + servers are up)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const DIST = process.env.E2E_DIST ?? '/tmp/e2e-dist';
const FIXTURE_BASE = 'http://127.0.0.1:8787';
const MOCK_BASE = 'http://127.0.0.1:8788';
const EVIDENCE = process.env.E2E_EVIDENCE ?? '/home/user/evidence';

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id}: ${detail}`);
}

/** Poll until predicate holds or the budget expires; never throws. */
async function poll(predicate, budgetMs, intervalMs = 250) {
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return predicate();
}

mkdirSync(EVIDENCE, { recursive: true });

async function fetchStats() {
  const res = await fetch(`${MOCK_BASE}/stats`);
  return (await res.json()).count;
}

const context = await chromium.launchPersistentContext('', {
  headless: true,
  // Full Chromium (not the headless shell): extensions require new-headless.
  channel: 'chromium',
  viewport: { width: 1440, height: 900 },
  args: [`--disable-extensions-except=${DIST}`, `--load-extension=${DIST}`],
});

// The background service worker proves the extension loaded; its URL carries
// the extension id.
let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
const extensionId = new URL(worker.url()).host;
console.log(`extension loaded: ${extensionId}`);

// Seed BYOK settings pointed at the mock provider.
await worker.evaluate(async (endpoint) => {
  await chrome.storage.local.set({
    settings: {
      enabled: true,
      apiKey: 'e2e-not-a-real-key',
      apiEndpoint: endpoint,
      model: 'test-model',
      userContext: '',
      wordMode: false,
    },
    sitePrefs: {},
  });
}, `${MOCK_BASE}/v1/chat/completions`);

const page = await context.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

// ---------- TC1: password fields never captured ----------
await page.goto(`${FIXTURE_BASE}/legal-form.html`, { waitUntil: 'load' });

const countBefore = await fetchStats();
await page.locator('#portal_password').click();
await page.keyboard.type('super-secret-password-123');
await page.waitForTimeout(1500);
const countAfterPassword = await fetchStats();
const ghostOnPassword = await page.locator('#portal_password[data-prediction]').count();
record(
  'tc1-password-no-request',
  countAfterPassword === countBefore && ghostOnPassword === 0,
  `provider requests ${countBefore}->${countAfterPassword} (must be equal), ghost markers: ${ghostOnPassword}`,
);
await page.screenshot({ path: `${EVIDENCE}/tc1-password-no-ghost.png` });

// ---------- TC2: ghost text, Tab accept, Esc reject ----------
await page.locator('#statement_of_facts').click();
await page.keyboard.type('Indemnification — contractor liable only for negligence');

const factsField = page.locator('#statement_of_facts');
const ghostAppeared = await poll(
  async () => (await factsField.getAttribute('data-prediction')) !== null,
  8000,
);
if (ghostAppeared) {
  const marked = await factsField.getAttribute('data-prediction');
  record(
    'tc2-ghost-appears',
    Boolean(marked && marked.includes('shall be liable only for losses')),
    `ghost prediction: ${(marked ?? '').slice(0, 60)}...`,
  );
} else {
  record('tc2-ghost-appears', false, 'data-prediction never appeared on the drafting field');
}

// Indicator is visible while assist is active on a legal form (TC3).
const indicator = page.locator('#draft-assist-indicator');
const indicatorVisible = (await indicator.count()) > 0 && (await indicator.isVisible());
await page.screenshot({ path: `${EVIDENCE}/tc3-indicator-ghost.png` });
record('tc3-indicator-visible', indicatorVisible, `indicator visible: ${indicatorVisible}`);

await page.keyboard.press('Tab');
await page.waitForTimeout(400);
const accepted = await factsField.inputValue();
const markerAfterTab = await factsField.getAttribute('data-prediction');
record(
  'tc2-tab-accepts',
  accepted.includes('shall be liable only for losses') && markerAfterTab === null,
  `value after Tab ends with: ...${accepted.slice(-50)}, marker removed: ${markerAfterTab === null}`,
);
await page.screenshot({ path: `${EVIDENCE}/tc2-accepted.png` });

// Esc rejects and suppresses re-fire until refocus.
await page.keyboard.type(' The parties agree');
const ghostBeforeEsc = await poll(
  async () => (await factsField.getAttribute('data-prediction')) !== null,
  8000,
);
if (!ghostBeforeEsc) {
  record('tc2-esc-rejects-and-suppresses', false, 'no ghost appeared before Esc to reject');
} else {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const rejectedMarked = await factsField.getAttribute('data-prediction-rejected');
  const ghostGone = (await factsField.getAttribute('data-prediction')) === null;
  const countAfterEsc = await fetchStats();
  await page.keyboard.type(' further');
  await page.waitForTimeout(1500);
  const ghostAfterEsc = await factsField.getAttribute('data-prediction');
  const countAfterEscRefire = await fetchStats();
  record(
    'tc2-esc-rejects-and-suppresses',
    rejectedMarked !== null &&
      ghostGone &&
      ghostAfterEsc === null &&
      countAfterEscRefire === countAfterEsc,
    `rejected marker: ${rejectedMarked !== null}, ghost removed: ${ghostGone}, ghost after Esc: ${ghostAfterEsc === null}, provider requests ${countAfterEsc}->${countAfterEscRefire}`,
  );
}

// ---------- TC4: non-legal form stays silent ----------
const plainPage = await context.newPage();
await plainPage.setViewportSize({ width: 1440, height: 900 });
await plainPage.goto(`${FIXTURE_BASE}/plain-form.html`, { waitUntil: 'load' });
const countBeforePlain = await fetchStats();
await plainPage.locator('#message').click();
await plainPage.keyboard.type('Dear team, please find attached');
await plainPage.waitForTimeout(1500);
const ghostOnPlain = await plainPage.locator('#message[data-prediction]').count();
const indicatorOnPlain = await plainPage.locator('#draft-assist-indicator').count();
const countAfterPlain = await fetchStats();
await plainPage.screenshot({ path: `${EVIDENCE}/tc4-plain-form-inactive.png` });
record(
  'tc4-plain-form-inactive',
  ghostOnPlain === 0 && indicatorOnPlain === 0 && countAfterPlain === countBeforePlain,
  `ghost: ${ghostOnPlain}, indicator: ${indicatorOnPlain}, provider requests ${countBeforePlain}->${countAfterPlain}`,
);

await context.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} e2e checks passed`);
if (failed.length > 0) {
  process.exit(1);
}
