/**
 * @fileoverview Client-side AI service layer for the Glyph clinical PWA.
 * All AI calls are proxied through Supabase Edge Functions — the client never
 * communicates directly with LLM providers.
 *
 * Request bodies use the camelCase keys the Edge Functions actually destructure
 * (visitId, isAttendant, imageUrl, …). Non-streaming functions return the
 * `{ success, data }` envelope; `invokeFunction` unwraps `data` and throws on
 * `success: false`. Streaming functions return a raw `ReadableStream`.
 *
 * @module lib/services/ai
 */

import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types — aligned to supabase/functions/_shared/types.ts (the server contract)
// ---------------------------------------------------------------------------

/** Structured intake summary produced by `intake-complete`. */
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

/** Greeting payload returned by `intake-start` (the visit is the session key — there is no conversation id). */
export interface IntakeStartResult {
  greeting: string;
  respondent: string;
  language: string;
  isAttendant: boolean;
}

/** Result of `extract-document` OCR/extraction. */
export interface ExtractionResult {
  type: 'prescription' | 'lab_report';
  data: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

/** A source cited by `consult-query`. */
export interface ConsultSource {
  type: 'uptodate' | 'pubmed' | 'web' | 'model';
  title: string;
  url?: string;
  citation?: string;
}

/** Non-streaming response from `consult-query`. */
export interface ConsultQueryResult {
  answer: string;
  sources: ConsultSource[];
  confidence: 'high' | 'moderate' | 'low';
  evidenceLevel: string;
  modelUsed: string;
  latencyMs: number;
  queryType?: string;
}

interface EdgeEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function buildHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? anon}`,
    apikey: anon,
  };
}

function functionUrl(functionName: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${supabaseUrl}/functions/v1/${functionName}`;
}

/**
 * Calls a non-streaming Edge Function, unwraps the `{ success, data }`
 * envelope, and returns `data`.
 *
 * @throws {Error} On network / HTTP errors or when the function returns
 *   `success: false`.
 */
async function invokeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(functionUrl(functionName), {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Edge Function "${functionName}" failed (${response.status}): ${errorText}`,
    );
  }

  const json = (await response.json()) as EdgeEnvelope<T>;
  if (!json.success) {
    throw new Error(
      json.error ?? `Edge Function "${functionName}" returned success: false`,
    );
  }
  return json.data as T;
}

/** Calls a streaming (SSE) Edge Function and returns the raw response stream. */
async function invokeStreamingFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(functionUrl(functionName), {
    method: 'POST',
    headers: await buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Edge Function "${functionName}" failed (${response.status}): ${errorText}`,
    );
  }
  if (!response.body) {
    throw new Error(`Edge Function "${functionName}" returned no stream body`);
  }
  return response.body;
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

export interface StartIntakeOptions {
  attendantName?: string;
  attendantRelation?: string;
  language?: 'bn' | 'en';
}

/**
 * Initializes an intake session for a visit and returns the AI greeting.
 *
 * @param visitId - The visit record to associate with this intake.
 * @param isAttendant - Whether the respondent is an attendant (not the patient).
 */
export async function startIntake(
  visitId: string,
  isAttendant: boolean,
  options: StartIntakeOptions = {},
): Promise<IntakeStartResult> {
  return invokeFunction<IntakeStartResult>('intake-start', {
    visitId,
    isAttendant,
    ...(options.attendantName ? { attendantName: options.attendantName } : {}),
    ...(options.attendantRelation
      ? { attendantRelation: options.attendantRelation }
      : {}),
    ...(options.language ? { language: options.language } : {}),
  });
}

/**
 * Sends a patient/attendant message in the intake conversation and streams the
 * AI response (SSE).
 */
export async function sendIntakeTurn(
  visitId: string,
  message: string,
  messageSource: 'patient' | 'attendant' = 'patient',
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('intake-turn', {
    visitId,
    message,
    messageSource,
  });
}

/** Completes the intake conversation and returns the structured summary. */
export async function completeIntake(visitId: string): Promise<IntakeSummary> {
  const data = await invokeFunction<{
    summary: IntakeSummary;
    intakeDurationSeconds: number | null;
    transcriptTurns: number;
  }>('intake-complete', { visitId });
  return data.summary;
}

/**
 * Extracts structured data from a prescription or lab-report image.
 *
 * @param imageUrl - Storage path of the image in the private `documents`
 *   bucket (from `uploadToStorage()` — the function downloads it via
 *   service role; the bucket has no public URLs).
 * @param type - Document type to extract.
 * @param patientId - The patient the document belongs to (required by the function).
 * @param visitId - Optional visit to associate the extracted document with.
 */
export async function extractDocument(
  imageUrl: string,
  type: 'prescription' | 'lab_report',
  patientId: string,
  visitId?: string,
): Promise<ExtractionResult> {
  return invokeFunction<ExtractionResult>('extract-document', {
    imageUrl,
    type,
    patientId,
    ...(visitId ? { visitId } : {}),
  });
}

/** Generates a doctor briefing card from intake data (streamed). */
export async function generateBriefing(
  visitId: string,
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('generate-briefing', { visitId });
}

/**
 * Sends a doctor's real-time consultation query. `consult-query` is
 * non-streaming and returns a structured answer with source citations.
 */
export async function consultQuery(
  visitId: string,
  query: string,
): Promise<ConsultQueryResult> {
  return invokeFunction<ConsultQueryResult>('consult-query', {
    visitId,
    query,
  });
}

/** Generates a clinical note from the consultation (streamed). Defaults to BD format. */
export async function generateNote(
  visitId: string,
  format: 'bd' | 'soap' = 'bd',
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('generate-note', { visitId, format });
}
