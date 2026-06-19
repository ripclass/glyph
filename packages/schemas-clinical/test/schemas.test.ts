import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  CLINICAL_CREDENTIALS,
  validateClinicalCredential,
  BD_DOSING_PATTERN,
  type ClinicalCredentialType,
} from "../src/index";

const GOOD: Record<ClinicalCredentialType, unknown> = {
  physician_registration: {
    fullName: "Dr. A. Rahman",
    fullNameBn: "ডা. এ. রহমান",
    bmdcRegNo: "A-12345",
    registrationType: "specialist",
    specialty: "Medicine",
    qualifications: ["MBBS", "FCPS"],
  },
  visit_note: {
    encounterDate: "2026-06-10",
    prescriber: { name: "Dr. A. Rahman", identifier: "A-12345" },
    format: "bd",
    chiefComplaint: "জ্বর ৩ দিন ধরে",
    onExamination: "Temp 101F, chest clear",
    diagnosis: [{ text: "Viral fever", icd10: "B34.9" }],
    advice: ["Plenty of fluids", "Rest"],
    sourceTags: [{ claim: "জ্বর ৩ দিন", source: "attendant_translated" }],
  },
  prescription: {
    encounterDate: "2026-06-10",
    prescriber: { name: "Dr. A. Rahman", identifier: "A-12345" },
    diagnosis: [{ text: "Viral fever" }],
    medications: [
      {
        name: "Napa",
        genericName: "Paracetamol",
        dose: "500mg",
        unit: "mg",
        frequency: "1+0+1",
        timing: "after_meal",
        duration: "5 days",
        route: "oral",
      },
    ],
    advice: ["Plenty of fluids"],
  },
  lab_result: {
    encounterDate: "2026-01-15",
    lab: { name: "Popular Diagnostics", identifier: "LIC-001" },
    testCategory: "RFT",
    reportDate: "2026-01-15",
    results: [
      {
        testName: "Serum Creatinine",
        value: "1.8",
        unit: "mg/dL",
        referenceRange: "0.7-1.3",
        isAbnormal: true,
        severity: "moderate",
      },
    ],
  },
  dispensing_event: {
    encounterDate: "2026-06-11",
    pharmacy: { name: "Lazz Pharma", identifier: "PH-9001" },
    prescriptionRef: "urn:uuid:abc",
    dispensedItems: [{ drug: "Napa 500mg", quantity: "10 tablets" }],
  },
  discharge_summary: {
    encounterDate: "2026-06-14",
    hospital: { name: "Square Hospitals Ltd", identifier: "DGHS-1234" },
    admissionDate: "2026-06-10",
    dischargeDate: "2026-06-14",
    dischargeDiagnosis: [{ text: "Dengue fever", icd10: "A90" }],
    dischargeMedications: [{ name: "Napa", frequency: "1+1+1" }],
    dischargeCondition: "recovered",
  },
  medical_clearance: {
    encounterDate: "2026-06-14",
    assessingFacility: { name: "GAMCA Medical Centre", identifier: "GAMCA-77" },
    purpose: "overseas_employment",
    fitnessStatus: "fit",
    destinationCountry: "UAE",
  },
  occupational_health: {
    encounterDate: "2026-06-14",
    employer: { name: "Beximco RMG Unit 4" },
    assessmentType: "periodic",
    fitnessForRole: "fit",
  },
  antenatal_record: {
    encounterDate: "2026-06-14",
    provider: { name: "CHW Ruma Begum" },
    visitNumber: 2,
    gestationalAgeWeeks: 24,
    bloodPressure: "110/70",
  },
  specialist_opinion: {
    encounterDate: "2026-06-14",
    specialist: { name: "Dr. A. Oncologist", identifier: "UK-GMC-998" },
    specialty: "Oncology",
    opinion: "Findings consistent with early-stage disease; biopsy advised.",
    recommendations: ["Core-needle biopsy", "Staging CT"],
  },
};

describe("clinical credential schemas", () => {
  it("registry covers the five M2 types plus five reserved credential shapes", () => {
    expect(Object.keys(CLINICAL_CREDENTIALS).sort()).toEqual(
      [
        "antenatal_record",
        "discharge_summary",
        "dispensing_event",
        "lab_result",
        "medical_clearance",
        "occupational_health",
        "physician_registration",
        "prescription",
        "specialist_opinion",
        "visit_note",
      ].sort(),
    );
  });

  for (const type of Object.keys(CLINICAL_CREDENTIALS) as ClinicalCredentialType[]) {
    it(`accepts a valid ${type} payload and exposes envelope metadata`, () => {
      const def = CLINICAL_CREDENTIALS[type];
      expect(def.vcType).toMatch(/Credential$/);
      expect(def.context).toContain("kham.health");
      expect(() => validateClinicalCredential(type, GOOD[type])).not.toThrow();
    });
  }

  it("rejects a prescription with no medications", () => {
    expect(() =>
      validateClinicalCredential("prescription", {
        encounterDate: "2026-06-10",
        prescriber: { name: "Dr. X" },
        medications: [],
      }),
    ).toThrow(ZodError);
  });

  it("rejects an entityRef with no identifying field", () => {
    expect(() =>
      validateClinicalCredential("prescription", {
        encounterDate: "2026-06-10",
        prescriber: {},
        medications: [{ name: "Napa" }],
      }),
    ).toThrow(ZodError);
  });

  it("rejects a SOAP visit-note missing the soap block", () => {
    expect(() =>
      validateClinicalCredential("visit_note", {
        encounterDate: "2026-06-10",
        prescriber: { name: "Dr. X" },
        format: "soap",
      }),
    ).toThrow(ZodError);
  });

  it("defaults locale to bn and applies field defaults", () => {
    const parsed = validateClinicalCredential("prescription", GOOD.prescription) as {
      locale: string;
    };
    expect(parsed.locale).toBe("bn");
  });

  it("rejects a discharge_summary missing required dischargeDiagnosis", () => {
    expect(() =>
      validateClinicalCredential("discharge_summary", {
        encounterDate: "2026-06-14",
        hospital: { name: "Square Hospitals Ltd" },
        admissionDate: "2026-06-10",
        dischargeDate: "2026-06-14",
        // dischargeDiagnosis intentionally omitted
      }),
    ).toThrow(ZodError);
  });

  it("BD_DOSING_PATTERN matches English and Bangla tri-slot dosing", () => {
    expect(BD_DOSING_PATTERN.test("1+0+1")).toBe(true);
    expect(BD_DOSING_PATTERN.test("০+০+১")).toBe(true);
    expect(BD_DOSING_PATTERN.test("1+1+1+1")).toBe(true);
    expect(BD_DOSING_PATTERN.test("SOS")).toBe(false);
  });
});
