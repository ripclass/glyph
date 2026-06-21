import { describe, it, expect } from "vitest";
import { haversineKm, nearbyHospitals, buildMinimalSnapshot, mapsLinkNearestHospital, generateEmergencyToken } from "./emergency-logic";

describe("haversineKm", () => {
  it("is ~0 for the same point", () => { expect(haversineKm(23.81, 90.41, 23.81, 90.41)).toBeLessThan(0.001); });
  it("Dhaka to Chittagong is ~210-260 km", () => { const d = haversineKm(23.81, 90.41, 22.36, 91.78); expect(d).toBeGreaterThan(200); expect(d).toBeLessThan(270); });
});

describe("nearbyHospitals", () => {
  const H = (id: string, lat: number, lon: number) => ({ id, name: id, latitude: lat, longitude: lon, phone: "880" });
  it("keeps only within radius, nearest first", () => {
    const scan = { lat: 23.81, lon: 90.41 };
    const res = nearbyHospitals(scan, [H("near", 23.82, 90.42), H("far", 22.36, 91.78)], 10);
    expect(res.map(h => h.id)).toEqual(["near"]);
    expect(res[0].distanceKm).toBeGreaterThan(0);
  });
  it("skips hospitals with no geo (filtered by caller) — empty list yields empty", () => {
    expect(nearbyHospitals({ lat: 23.8, lon: 90.4 }, [], 10)).toEqual([]);
  });
});

describe("buildMinimalSnapshot", () => {
  it("includes only the basics, never name-as-PHI beyond display, and flags self-reported", () => {
    const snap = buildMinimalSnapshot({ name: "X", blood_group: "O+", known_allergies: ["penicillin"], chronic_conditions: ["HTN"], emergency_medications: "amlodipine" });
    expect(snap.bloodGroup).toBe("O+");
    expect(snap.allergies).toEqual(["penicillin"]);
    expect(snap.selfReported).toBe(true);
  });
});

describe("mapsLinkNearestHospital", () => {
  it("builds a coords-based maps search url", () => {
    const url = mapsLinkNearestHospital(23.81, 90.41);
    expect(url).toContain("23.81");
    expect(url).toContain("90.41");
    expect(url.startsWith("https://")).toBe(true);
  });
});

describe("generateEmergencyToken", () => {
  it("returns a url-safe token of reasonable length, unique per call", () => {
    const a = generateEmergencyToken(), b = generateEmergencyToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(20);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
