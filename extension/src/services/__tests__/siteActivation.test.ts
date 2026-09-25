import { describe, expect, it } from 'vitest';
import { decideSiteActivation, originIsGranted } from '../siteActivation';

const legal = { masterEnabled: true, category: 'legal', hasOriginGrant: true } as const;
const unknown = { masterEnabled: true, category: 'unknown', hasOriginGrant: true } as const;

describe('decideSiteActivation', () => {
  it('activates on a legal form by default', () => {
    expect(decideSiteActivation(legal).active).toBe(true);
  });

  it('never silently activates on an undetected site', () => {
    const decision = decideSiteActivation(unknown);
    expect(decision.active).toBe(false);
    expect(decision.reason).toBe('undetected-default');
  });

  it('blocks everything when the master switch is off', () => {
    const decision = decideSiteActivation({ ...legal, masterEnabled: false, pref: 'enabled' });
    expect(decision.active).toBe(false);
    expect(decision.reason).toBe('master-off');
  });

  it('blocks everything without a user-granted origin', () => {
    const decision = decideSiteActivation({ ...legal, hasOriginGrant: false });
    expect(decision.active).toBe(false);
    expect(decision.reason).toBe('no-grant');
  });

  it('lets a user disable a legal site', () => {
    const decision = decideSiteActivation({ ...legal, pref: 'disabled' });
    expect(decision.active).toBe(false);
    expect(decision.reason).toBe('site-disabled');
  });

  it('lets a user enable an undetected site', () => {
    const decision = decideSiteActivation({ ...unknown, pref: 'enabled' });
    expect(decision.active).toBe(true);
    expect(decision.reason).toBe('site-enabled');
  });

  it('treats a user disable as stronger than a site-enabled pref is absent', () => {
    // Explicit user disable beats the legal default.
    const decision = decideSiteActivation({ ...legal, pref: 'disabled' });
    expect(decision.active).toBe(false);
  });
});

describe('originIsGranted', () => {
  const patterns = ['https://efile.example.com/*', 'http://127.0.0.1:8787/*'];

  it('matches a granted origin', () => {
    expect(originIsGranted(patterns, 'https://efile.example.com')).toBe(true);
    expect(originIsGranted(patterns, 'http://127.0.0.1:8787')).toBe(true);
  });

  it('rejects an ungranted origin', () => {
    expect(originIsGranted(patterns, 'https://evil.example.com')).toBe(false);
    expect(originIsGranted(patterns, 'http://127.0.0.1:9999')).toBe(false);
  });

  it('rejects an empty origin', () => {
    expect(originIsGranted(patterns, '')).toBe(false);
  });
});
