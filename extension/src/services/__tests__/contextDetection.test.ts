import { describe, expect, it } from 'vitest';
import { detectLegalContext, type PageSignals } from '../contextDetection';

function page(overrides: Partial<PageSignals> = {}): PageSignals {
  return {
    host: 'example.com',
    path: '/',
    title: 'Example',
    fieldLabels: [],
    ...overrides,
  };
}

/**
 * Table-driven detection tests. The bar for 'legal' is deliberately high:
 * known legal hosts qualify on their own; everything else needs two distinct
 * vocabulary signals, and everything else resolves to 'unknown'.
 */
const CASES: Array<{ name: string; page: PageSignals; category: 'legal' | 'unknown' }> = [
  // Known legal hosts
  { name: 'e-filing portal host', page: page({ host: 'efile.txcourts.gov' }), category: 'legal' },
  { name: 'CM/ECF host', page: page({ host: 'ecf.ilsd.uscourts.gov' }), category: 'legal' },
  { name: 'uscourts.gov host', page: page({ host: 'pacer.uscourts.gov' }), category: 'legal' },
  { name: 'court subdomain', page: page({ host: 'courts.mi.gov' }), category: 'legal' },
  { name: 'Odyssey e-filing', page: page({ host: 'efileca.tylerhost.net' }), category: 'legal' },
  { name: 'bar association', page: page({ host: 'www.americanbar.org' }), category: 'legal' },
  { name: 'legal SaaS', page: page({ host: 'app.clio.com' }), category: 'legal' },
  { name: 'legal documents site', page: page({ host: 'www.legalzoom.com' }), category: 'legal' },

  // Vocabulary: two distinct signals required
  {
    name: 'two field signals',
    page: page({ fieldLabels: ['Case number', 'Name of Plaintiff'] }),
    category: 'legal',
  },
  {
    name: 'field + title signal',
    page: page({ fieldLabels: ['Docket number'], title: 'Electronic Filing' }),
    category: 'legal',
  },
  {
    name: 'title + meta signal',
    page: page({ title: 'File a Motion', metaDescription: 'Bar association forms' }),
    category: 'legal',
  },

  // Conservative: single ambiguous signal stays unknown
  { name: 'one field signal', page: page({ fieldLabels: ['Case number'] }), category: 'unknown' },
  { name: 'one title signal', page: page({ title: 'Court delays ruling' }), category: 'unknown' },
  { name: 'no signals', page: page({ host: 'www.pinterest.com' }), category: 'unknown' },
  {
    name: 'generic contact form',
    page: page({ host: 'mailchimp.com', fieldLabels: ['Your name', 'Email address'] }),
    category: 'unknown',
  },
];

describe('detectLegalContext', () => {
  for (const testCase of CASES) {
    it(`${testCase.category}: ${testCase.name}`, () => {
      expect(detectLegalContext(testCase.page).category).toBe(testCase.category);
    });
  }

  it('reports human-readable signals for a legal page', () => {
    const detection = detectLegalContext(page({ host: 'efile.txcourts.gov' }));
    expect(detection.signals.length).toBeGreaterThan(0);
  });

  it('never classifies as anything but legal or unknown', () => {
    const detection = detectLegalContext(page({ host: 'random-blog.net' }));
    expect(['legal', 'unknown']).toContain(detection.category);
  });
});
