import { describe, expect, it } from 'vitest';
import { isSensitiveField, type FieldSignals } from '../fieldFilter';

function signals(overrides: Partial<FieldSignals> = {}): FieldSignals {
  return {
    tagName: 'INPUT',
    inputType: 'text',
    autocomplete: '',
    isHidden: false,
    ...overrides,
  };
}

/**
 * Table-driven capture-filter tests: an entry in this table is a promise
 * that the field category is NEVER captured, stored, or sent.
 */
const CASES: Array<{ name: string; signals: FieldSignals; sensitive: boolean }> = [
  { name: 'password input', signals: signals({ inputType: 'password' }), sensitive: true },
  { name: 'hidden input', signals: { tagName: 'INPUT', inputType: 'hidden', autocomplete: '', isHidden: false }, sensitive: true },
  { name: 'credit card number', signals: signals({ autocomplete: 'cc-number' }), sensitive: true },
  { name: 'credit card security code', signals: signals({ autocomplete: 'cc-csc' }), sensitive: true },
  { name: 'credit card name', signals: signals({ autocomplete: 'cc-name' }), sensitive: true },
  { name: 'one-time code', signals: signals({ autocomplete: 'one-time-code' }), sensitive: true },
  { name: 'autofill disabled input', signals: signals({ autocomplete: 'off' }), sensitive: true },
  { name: 'autofill disabled textarea', signals: signals({ tagName: 'TEXTAREA', autocomplete: 'off' }), sensitive: true },
  { name: 'display:none input', signals: signals({ isHidden: true }), sensitive: true },
  { name: 'visibility:hidden textarea', signals: signals({ tagName: 'TEXTAREA', isHidden: true }), sensitive: true },
  { name: 'hidden contenteditable', signals: { tagName: 'DIV', inputType: '', autocomplete: '', isHidden: true }, sensitive: true },

  // Drafting fields must stay eligible
  { name: 'plain text input', signals: signals(), sensitive: false },
  { name: 'plain textarea', signals: signals({ tagName: 'TEXTAREA' }), sensitive: false },
  { name: 'email autocomplete', signals: signals({ autocomplete: 'email' }), sensitive: false },
  { name: 'organization autocomplete', signals: signals({ autocomplete: 'organization' }), sensitive: false },
  { name: 'visible contenteditable', signals: { tagName: 'DIV', inputType: '', autocomplete: '', isHidden: false }, sensitive: false },
  { name: 'on autocomplete', signals: signals({ autocomplete: 'on' }), sensitive: false },
];

describe('isSensitiveField', () => {
  for (const testCase of CASES) {
    it(`${testCase.sensitive ? 'filters' : 'allows'}: ${testCase.name}`, () => {
      expect(isSensitiveField(testCase.signals)).toBe(testCase.sensitive);
    });
  }

  it('treats unknown autocomplete tokens as non-sensitive', () => {
    expect(isSensitiveField(signals({ autocomplete: 'given-name' }))).toBe(false);
  });
});
