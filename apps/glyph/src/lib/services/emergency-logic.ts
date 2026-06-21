import { randomBytes } from "crypto";

/** URL-safe per-patient emergency token (mirrors wallet-logic.generateToken). */
export function generateEmergencyToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface HospitalGeo { id: string; name: string; latitude: number; longitude: number; phone: string | null }

/** Hospitals within radiusKm of the scan, nearest first. Caller pre-filters to org_type='hospital' with non-null geo. */
export function nearbyHospitals(
  scan: { lat: number; lon: number },
  hospitals: HospitalGeo[],
  radiusKm: number,
): Array<HospitalGeo & { distanceKm: number }> {
  return hospitals
    .map((h) => ({ ...h, distanceKm: haversineKm(scan.lat, scan.lon, h.latitude, h.longitude) }))
    .filter((h) => h.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export interface EmergencyPatient {
  name: string;
  blood_group: string | null;
  known_allergies: unknown;
  chronic_conditions: unknown;
  emergency_medications: string | null;
}

/** The minimal dataset pushed to a hospital. Basics only; explicitly self-reported. */
export function buildMinimalSnapshot(p: EmergencyPatient): Record<string, unknown> {
  return {
    name: p.name,
    bloodGroup: p.blood_group ?? null,
    allergies: Array.isArray(p.known_allergies) ? p.known_allergies : [],
    conditions: Array.isArray(p.chronic_conditions) ? p.chronic_conditions : [],
    medications: p.emergency_medications ?? null,
    selfReported: true,
  };
}

/** Coords-based maps deep-link to hospitals near the scan (no Glyph facility data needed). */
export function mapsLinkNearestHospital(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/hospital/@${lat},${lon},14z`;
}

/** Keys that must NEVER appear in a stranger-facing payload (guard for the smoke). */
export const STRANGER_PHI_KEYS = ["bloodGroup", "allergies", "conditions", "medications", "blood_group", "known_allergies", "chronic_conditions", "emergency_medications"];
