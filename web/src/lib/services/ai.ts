/**
 * @fileoverview Client-side AI service layer for the Glyph clinical PWA.
 * All AI calls are proxied through Supabase Edge Functions — the client
 * never communicates directly with LLM providers.
 *
 * Streaming responses use the Fetch API `ReadableStream` interface.
 *
 * @module lib/services/ai
 */

import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Structured intake summary produced by the AI after conversation */
export interface IntakeSummary {
  /** Chief complaint in the patient's own words */
  chief_complaint: string;
  /** Duration and onset description */
  duration: string;
  /** Key symptoms identified */
  symptoms: string[];
  /** Relevant medical history mentioned */
  medical_history: string[];
  /** Current medications reported */
  current_medications: string[];
  /** Known allergies */
  allergies: string[];
  /** Family history highlights */
  family_history: string[];
  /** Social history and lifestyle factors */
  social_history: string[];
  /** Review of systems findings */
  review_of_systems: Record<string, string[]>;
  /** AI-generated triage priority: low | medium | high | urgent */
  triage_priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Suggested follow-up questions for the doctor */
  suggested_questions: string[];
}

/** Result of AI-powered document extraction (prescription or lab report) */
export interface ExtractionResult {
  /** Whether extraction succeeded */
  success: boolean;
  /** Extracted structured data */
  data: Record<string, unknown>;
  /** Confidence score 0-1 */
  confidence: number;
  /** Raw OCR text */
  raw_text: string;
  /** Warnings or issues during extraction */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Calls a Supabase Edge Function and returns the JSON response.
 *
 * @param functionName - Edge Function route name
 * @param body - Request payload
 * @returns Parsed JSON response body
 * @throws {Error} On network or Edge Function errors
 */
async function invokeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Function "${functionName}" failed (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Calls a Supabase Edge Function and returns a streaming ReadableStream.
 * Used for responses that are streamed token-by-token.
 *
 * @param functionName - Edge Function route name
 * @param body - Request payload
 * @returns A ReadableStream of the response body
 * @throws {Error} On network or Edge Function errors
 */
async function invokeStreamingFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<ReadableStream<Uint8Array>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Edge Function "${functionName}" failed (${response.status}): ${errorText}`);
  }

  if (!response.body) {
    throw new Error(`Edge Function "${functionName}" returned no stream body`);
  }

  return response.body;
}

// ---------------------------------------------------------------------------
// Exported API
// ---------------------------------------------------------------------------

/**
 * Starts an AI-driven patient intake session.
 * The Edge Function initializes the conversation context with patient data
 * and returns a conversation ID for subsequent turns.
 *
 * @param visitId - The visit record to associate with this intake
 * @param isAttendant - Whether the person speaking is an attendant (not the patient)
 * @returns The conversation session ID
 */
export async function startIntake(visitId: string, isAttendant: boolean): Promise<string> {
  const result = await invokeFunction<{ conversation_id: string }>('intake-start', {
    visit_id: visitId,
    is_attendant: isAttendant,
  });
  return result.conversation_id;
}

/**
 * Sends a patient/attendant message in the intake conversation
 * and streams the AI's response.
 *
 * @param visitId - The visit ID for this intake session
 * @param message - The user's spoken or typed message
 * @returns A ReadableStream of the AI's response text
 */
export async function sendIntakeTurn(
  visitId: string,
  message: string
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('intake-turn', {
    visit_id: visitId,
    message,
  });
}

/**
 * Completes the intake conversation and generates a structured summary.
 * The Edge Function synthesizes all conversation turns into a clinical summary.
 *
 * @param visitId - The visit ID to complete intake for
 * @returns A structured intake summary for the doctor's briefing card
 */
export async function completeIntake(visitId: string): Promise<IntakeSummary> {
  return invokeFunction<IntakeSummary>('intake-complete', {
    visit_id: visitId,
  });
}

/**
 * Extracts structured data from a prescription or lab report image.
 * The Edge Function runs OCR + AI extraction on the image.
 *
 * @param imageUrl - Public URL of the uploaded image in Supabase Storage
 * @param type - Document type to extract: `'prescription'` or `'lab_report'`
 * @returns Extraction result with structured data and confidence score
 */
export async function extractDocument(
  imageUrl: string,
  type: 'prescription' | 'lab_report'
): Promise<ExtractionResult> {
  return invokeFunction<ExtractionResult>('extract-document', {
    image_url: imageUrl,
    type,
  });
}

/**
 * Generates a doctor briefing card from intake data.
 * Streams the briefing content for progressive display.
 *
 * @param visitId - The visit ID to generate a briefing for
 * @returns A ReadableStream of the briefing content
 */
export async function generateBriefing(
  visitId: string
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('generate-briefing', {
    visit_id: visitId,
  });
}

/**
 * Sends a doctor's real-time query during consultation.
 * The AI has access to the patient's full context (intake, history, labs).
 * Response is streamed for fast display.
 *
 * @param visitId - The active visit ID providing patient context
 * @param query - The doctor's question or instruction
 * @returns A ReadableStream of the AI's response
 */
export async function consultQuery(
  visitId: string,
  query: string
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('consult-query', {
    visit_id: visitId,
    query,
  });
}

/**
 * Generates a clinical note from the consultation transcript.
 * Produces a structured SOAP note streamed for doctor review.
 *
 * @param visitId - The visit ID to generate a note for
 * @returns A ReadableStream of the clinical note content
 */
export async function generateNote(
  visitId: string
): Promise<ReadableStream<Uint8Array>> {
  return invokeStreamingFunction('generate-note', {
    visit_id: visitId,
  });
}
