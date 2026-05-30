/**
 * @fileoverview WhatsApp messaging trigger service for the Glyph PWA.
 * Calls Supabase Edge Functions to send patient summaries and follow-up
 * messages via the WhatsApp Business API. The client never communicates
 * with the WhatsApp API directly.
 *
 * @module lib/services/whatsapp
 */

import { createClient } from '@/lib/supabase/client';

/** Response from a WhatsApp send operation */
export interface WhatsAppSendResult {
  /** Whether the message was accepted by the Edge Function */
  success: boolean;
  /** WhatsApp message ID if available */
  message_id: string | null;
  /** Human-readable status or error message */
  message: string;
}

/**
 * Calls a Supabase Edge Function with auth headers.
 *
 * @param functionName - Edge Function name
 * @param body - Request payload
 * @returns Parsed JSON response
 */
async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<T> {
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
 * Sends a patient visit summary via WhatsApp.
 * The Edge Function generates a formatted summary from the visit record
 * and sends it to the patient's phone number using the WhatsApp Business API.
 *
 * @param visitId - The visit UUID whose summary to send
 * @param phone - The patient's phone number in BD format (e.g. `"01711223344"`)
 * @returns Result indicating success or failure with message details
 * @throws {Error} If the Edge Function call fails
 *
 * @example
 * ```ts
 * const result = await sendPatientSummary('visit-uuid', '01711223344');
 * if (result.success) {
 *   console.log('Summary sent:', result.message_id);
 * }
 * ```
 */
export async function sendPatientSummary(
  visitId: string,
  phone: string
): Promise<WhatsAppSendResult> {
  return callEdgeFunction<WhatsAppSendResult>('whatsapp-send-summary', {
    visit_id: visitId,
    phone: normalizePhoneNumber(phone),
  });
}

/**
 * Sends a follow-up message to a patient via WhatsApp.
 * Used for post-visit instructions, medication reminders,
 * or appointment follow-ups.
 *
 * @param visitId - The visit UUID for context tracking
 * @param phone - The patient's phone number in BD format
 * @param message - The follow-up message text to send
 * @returns Result indicating success or failure
 * @throws {Error} If the Edge Function call fails
 *
 * @example
 * ```ts
 * await sendFollowUp(
 *   'visit-uuid',
 *   '01711223344',
 *   'আপনার পরবর্তী অ্যাপয়েন্টমেন্ট ১০ দিন পর। ওষুধ নিয়মিত খাবেন।'
 * );
 * ```
 */
export async function sendFollowUp(
  visitId: string,
  phone: string,
  message: string
): Promise<WhatsAppSendResult> {
  return callEdgeFunction<WhatsAppSendResult>('whatsapp-send-followup', {
    visit_id: visitId,
    phone: normalizePhoneNumber(phone),
    message,
  });
}

/**
 * Normalizes a Bangladeshi phone number to the international format
 * expected by the WhatsApp Business API.
 *
 * @param phone - Phone number in any common BD format
 * @returns Phone number in `+880XXXXXXXXXX` format
 *
 * @example
 * ```ts
 * normalizePhoneNumber('01711223344');    // "+8801711223344"
 * normalizePhoneNumber('+8801711223344'); // "+8801711223344"
 * normalizePhoneNumber('8801711223344');  // "+8801711223344"
 * ```
 */
function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.startsWith('880')) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+880${digits.slice(1)}`;
  }

  return `+880${digits}`;
}
