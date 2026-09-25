import { describe, expect, it } from 'vitest';
import {
  buildDraftingPrompt,
  replacesDraftedText,
  selectDraftKind,
  type DraftKind,
} from '../draftingPrompts';

describe('selectDraftKind', () => {
  it('picks caption_block from a caption-labelled field', () => {
    expect(selectDraftKind({ fieldLabel: 'Case Caption', typedText: 'Smith' })).toBe('caption_block');
  });

  it('picks caption_block from a "v." seed typed by the user', () => {
    expect(selectDraftKind({ fieldLabel: '', typedText: 'Smith v. Jones' })).toBe('caption_block');
    expect(selectDraftKind({ fieldLabel: '', typedText: 'Adams vs Baker ' })).toBe('caption_block');
  });

  it('picks defined_terms when quoted terms repeat in the draft', () => {
    const typed =
      'The "Contractor" shall perform per the "Statement of Work"; the "Contractor" is paid monthly.';
    expect(selectDraftKind({ fieldLabel: '', typedText: typed })).toBe('defined_terms');
  });

  it('picks plain_english on legalese-dense drafts', () => {
    const typed =
      'The party of the first part, hereinafter referred to as the Contractor, pursuant to the aforementioned agreement, warrants performance. Notwithstanding the foregoing, remedies are exclusive.';
    expect(selectDraftKind({ fieldLabel: '', typedText: typed })).toBe('plain_english');
  });

  it('picks expand_clause on clause signals', () => {
    expect(
      selectDraftKind({ fieldLabel: 'Statement of Facts (motion text)', typedText: 'Indemnification — contractor liable' }),
    ).toBe('expand_clause');
    expect(selectDraftKind({ fieldLabel: '', typedText: 'The vendor shall be liable' })).toBe('expand_clause');
  });

  it('falls through to generic continuation on ordinary prose', () => {
    expect(selectDraftKind({ fieldLabel: 'Message', typedText: 'Dear team, please find attached' })).toBe('continue');
    expect(selectDraftKind({ fieldLabel: '', typedText: '' })).toBe('continue');
  });

  it('is conservative: one quoted term or one legalese marker is not enough', () => {
    expect(selectDraftKind({ fieldLabel: '', typedText: 'per the "Statement of Work" the work begins' })).toBe('continue');
    expect(
      selectDraftKind({ fieldLabel: '', typedText: 'Pursuant to the agreement the vendor delivers and the vendor invoices.' }),
    ).toBe('continue');
  });
});

describe('buildDraftingPrompt', () => {
  const base = {
    text: 'Indemnification — contractor liable only for negligence',
    cursorPos: 55,
    fieldLabel: 'Statement of Facts (motion text)',
    pageContext: 'E-Filing Portal | Civil motions',
    userContext: 'I am a lawyer drafting motions.',
  };

  it('expand_clause embeds the drafted text, page context, and field label', () => {
    const prompt = buildDraftingPrompt({ ...base, kind: 'expand_clause' });
    expect(prompt).toContain('Indemnification — contractor liable only for negligence');
    expect(prompt).toContain('E-Filing Portal | Civil motions');
    expect(prompt).toContain('Statement of Facts (motion text)');
    expect(prompt).toMatch(/expand/i);
  });

  it('caption_block forbids inventing missing case details', () => {
    const prompt = buildDraftingPrompt({ ...base, kind: 'caption_block' });
    expect(prompt).toMatch(/leave a clearly marked blank/i);
    expect(prompt).toContain('never invent');
  });

  it('defined_terms instructs consistency with terms already used', () => {
    const prompt = buildDraftingPrompt({ ...base, kind: 'defined_terms' });
    expect(prompt).toMatch(/defined terms consistent/i);
  });

  it('plain_english is a rewrite of the drafted portion and replaces it', () => {
    const prompt = buildDraftingPrompt({ ...base, kind: 'plain_english' });
    expect(prompt).toMatch(/rewrite/i);
    expect(prompt).toContain('replaces the drafted portion');
    expect(replacesDraftedText('plain_english')).toBe(true);
  });

  it('continue keeps the generic completion contract', () => {
    const prompt = buildDraftingPrompt({ ...base, kind: 'continue', answerLength: 'paragraph' });
    expect(prompt).toContain('Desired Length: paragraph words');
    expect(prompt).toContain('Text Before Cursor');
    expect(replacesDraftedText('continue')).toBe(false);
  });

  it('every kind returns only drafted text and never asks for explanations', () => {
    const kinds: DraftKind[] = ['expand_clause', 'caption_block', 'defined_terms', 'plain_english', 'continue'];
    for (const kind of kinds) {
      const prompt = buildDraftingPrompt({ ...base, kind });
      expect(prompt).toMatch(/Return ONLY/i);
      expect(prompt).not.toMatch(/console|log the/i);
    }
  });
});
