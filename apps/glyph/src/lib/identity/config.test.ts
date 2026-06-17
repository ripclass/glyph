/**
 * @fileoverview Unit tests for the identity-config entity-kind map. Guards the
 * org wiring so an organization DID mints through the same generic
 * ensureEntityIdentity seam as patients/doctors/clinics (R2).
 */

import { describe, it, expect } from 'vitest';
import { ENTITY_TABLE, entitySlug } from './config';

describe('identity config — entity kinds', () => {
  it('maps organization to the organizations table', () => {
    expect(ENTITY_TABLE.organization).toBe('organizations');
  });

  it('keeps the existing principal tables unchanged', () => {
    expect(ENTITY_TABLE.patient).toBe('patients');
    expect(ENTITY_TABLE.doctor).toBe('doctors');
    expect(ENTITY_TABLE.clinic).toBe('clinics');
  });

  it('slugs an organization DID as organization-<id>', () => {
    expect(entitySlug('organization', 'abc-123')).toBe('organization-abc-123');
  });
});
