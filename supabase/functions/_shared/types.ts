/**
 * Shared type definitions for Glyph Edge Functions.
 */

// ── LLM primitives ──────────────────────────────────────────────

export interface LLMResponse {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface ModelConfig {
  provider: "gemini" | "medgemma" | "claude" | "openai" | "perplexity";
  model: string;
  temperature?: number;
  maxTokens?: number;
}

// ── Clinical query ──────────────────────────────────────────────

export interface Source {
  type: "uptodate" | "pubmed" | "web" | "model";
  title: string;
  url?: string;
  citation?: string;
}

export interface ConsultQueryResponse {
  answer: string;
  sources: Source[];
  confidence: "high" | "moderate" | "low";
  evidenceLevel: string;
  modelUsed: string;
  latencyMs: number;
}

// ── Document extraction ─────────────────────────────────────────

export interface ExtractionResult {
  type: "prescription" | "lab_report";
  data: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

// ── Intake ──────────────────────────────────────────────────────

export interface IntakeSummary {
  chiefComplaint: string;
  hpiSummary: string;
  pastHistory: string[];
  currentMedications: string[];
  allergies: string[];
  socialHistory: string;
  attendantInfo?: {
    name: string;
    relation: string;
    reliability: string;
  };
}

// ── Briefing card ───────────────────────────────────────────────

export interface BriefingCard {
  patientSnapshot: {
    name: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    visitNumber: number;
  };
  chiefComplaint: string;
  hpiSummary: string;
  relevantHistory: {
    chronicConditions: string[];
    pastMedical: string[];
    surgicalHistory: string[];
    familyHistory: string[];
  };
  currentMedications: {
    name: string;
    dose: string;
    frequency: string;
    duration?: string;
  }[];
  allergies: string[];
  recentLabs: {
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    isAbnormal: boolean;
    date: string;
  }[];
  redFlags: {
    type: "drug_interaction" | "abnormal_lab" | "allergy_conflict" | "contradiction" | "clinical_alert";
    severity: "critical" | "warning" | "info";
    message: string;
    details?: string;
  }[];
  suggestedFocus: string[];
  differentialConsiderations: string[];
}

// ── Clinical note ───────────────────────────────────────────────

export interface ClinicalNote {
  format: "bd" | "soap";
  /** BD format sections */
  chiefComplaint?: string;
  onExamination?: string;
  investigations?: string;
  diagnosis?: string;
  prescription?: {
    medications: {
      name: string;
      genericName?: string;
      dose: string;
      frequency: string;
      duration: string;
      route: string;
      instructions?: string;
    }[];
    investigationsOrdered?: string[];
  };
  advice?: string;
  followUp?: string;
  /** SOAP format sections */
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  /** Common */
  icdCodes?: string[];
  evidenceLinks?: Record<string, string>;
}

// ── API request/response envelopes ──────────────────────────────

export interface EdgeFunctionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}
