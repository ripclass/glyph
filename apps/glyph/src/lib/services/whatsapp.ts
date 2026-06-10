/**
 * @fileoverview WhatsApp messaging trigger service for the Glyph PWA.
 * Calls the `send-followup` Supabase Edge Function, which generates the message
 * (a patient summary or a follow-up check-in) and sends it via the WhatsApp
 * Business API. The client never communicates with the WhatsApp API directly.
 *
 * @module lib/services/whatsapp
 */

import { createClient } from '@/lib/supabase/client';

/** Data returned by the `send-followup` function. */
export interface WhatsAppSendResult {
  messageSent: boolean;
  messageType: 'summary' | 'followup';
  whatsappMessageId: string | null;
  messagePreview: string;
  /** Masked phone number. */
  phone: string;
}

interface EdgeEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

/** Calls the `send-followup` Edge Function and unwraps the `{ success, data }` envelope. */
async function sendViaFollowupFunction(
  body: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  const response = await fetch(`${supabaseUrl}/functions/v1/send-followup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? anon}`,
      apikey: anon,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Edge Function "send-followup" failed (${response.status}): ${errorText}`,
    );
  }

  const json = (await response.json()) as EdgeEnvelope<WhatsAppSendResult>;
  if (!json.success) {
    throw new Error(json.error ?? 'send-followup returned success: false');
  }
  return json.data as WhatsAppSendResult;
}

/**
 * Sends a patient visit summary via WhatsApp. The Edge Function generates the
 * summary from the approved note and sends it.
 *
 * @param visitId - The visit whose summary to send.
 * @param phone - The patient's phone number in any common BD format.
 */
export async function sendPatientSummary(
  visitId: string,
  phone: string,
): Promise<WhatsAppSendResult> {
  return sendViaFollowupFunction({
    visitId,
    phone: normalizePhoneNumber(phone),
    messageType: 'summary',
  });
}

/**
 * Sends a follow-up check-in to a patient via WhatsApp. The Edge Function
 * composes the follow-up message server-side (there is no custom-message path).
 *
 * @param visitId - The visit for context tracking.
 * @param phone - The patient's phone number in any common BD format.
 */
export async function sendFollowUp(
  visitId: string,
  phone: string,
): Promise<WhatsAppSendResult> {
  return sendViaFollowupFunction({
    visitId,
    phone: normalizePhoneNumber(phone),
    messageType: 'followup',
  });
}

/**
 * Normalizes a Bangladeshi phone number to `+880XXXXXXXXXX`.
 *
 * @example
 * normalizePhoneNumber('01711223344');    // "+8801711223344"
 * normalizePhoneNumber('+8801711223344'); // "+8801711223344"
 * normalizePhoneNumber('8801711223344');  // "+8801711223344"
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
