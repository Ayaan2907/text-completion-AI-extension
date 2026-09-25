/**
 * Activation policy for drafting assist on a page. Pure decision logic,
 * shared by the background worker. Invariants:
 *  - the master kill switch wins over everything;
 *  - nothing activates without a user-granted origin (never silent);
 *  - an explicit per-site user decision wins over detection defaults;
 *  - undetected sites default OFF — a user decision, not auto-activation.
 */

import type { DetectionCategory } from './contextDetection';
import type { SitePref } from '../types';

export interface SiteActivationInput {
  masterEnabled: boolean
  category: DetectionCategory
  /** Per-site preference from storage; undefined means "user has not decided". */
  pref?: SitePref
  /** True when the origin was granted to the extension at runtime. */
  hasOriginGrant: boolean
}

export type SiteActivationReason =
  | 'master-off'
  | 'no-grant'
  | 'site-disabled'
  | 'site-enabled'
  | 'legal-default'
  | 'undetected-default';

export interface SiteActivation {
  active: boolean
  reason: SiteActivationReason
}

export function decideSiteActivation(input: SiteActivationInput): SiteActivation {
  if (!input.masterEnabled) return { active: false, reason: 'master-off' };
  if (!input.hasOriginGrant) return { active: false, reason: 'no-grant' };
  if (input.pref === 'disabled') return { active: false, reason: 'site-disabled' };
  if (input.pref === 'enabled') return { active: true, reason: 'site-enabled' };
  return input.category === 'legal'
    ? { active: true, reason: 'legal-default' }
    : { active: false, reason: 'undetected-default' };
}

/**
 * True when `origin` (scheme://host[:port]) matches one of the granted
 * permission patterns the extension holds (e.g. "https://example.com/*").
 */
export function originIsGranted(patterns: string[], origin: string): boolean {
  if (!origin) return false;
  return patterns.some((pattern) => pattern.replace(/\/\*$/, '') === origin);
}
