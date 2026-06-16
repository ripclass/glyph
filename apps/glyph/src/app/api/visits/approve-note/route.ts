/**
 * @fileoverview Note approval — the issuance seam's first real consumer.
 *
 * POST { visitId, doctorEdits? }
 *
 * When the doctor approves a generated note:
 *   1. Patient + doctor DIDs are ensured (provisioned on first use).
 *   2. A PrescriptionCredential is issued (when the note carries an Rx),
 *      then a VisitNoteCredential linking to it — both signed with the
 *      doctor's self-issued Glyph key.
 *   3. The canonical VCs land in `credentials` (INSERT-only).
 *   4. Projections follow: the prescriptions row is rebuilt FROM the
 *      credential, and the visit's approved_note freezes the moment
 *      note_credential_id is set (DB trigger).
 *
 * Only the visit's own doctor may approve. Approval is one-shot — an
 * already-credentialed note returns 409 (amend by issuing a replacement,
 * not by re-approving).
 *
 * @module app/api/visits/approve-note/route
 */

import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/lib/supabase/types';
import { ensureEntityIdentity } from '@/lib/identity/ensure-identity';
import { issueCredential } from '@/lib/identity/issue';
import { mapGeneratedNote } from '@/lib/identity/note-mapping';
import { rebuildProjections } from '@/lib/identity/projections';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, error: 'Missing authorization header' },
        { status: 401 }
      );
    }

    const userClient = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // ── Input ─────────────────────────────────────────────────
    const { visitId, doctorEdits, nextAppointmentAt, safetyCheck } = await req.json().catch(() => ({}));
    if (!visitId) {
      return NextResponse.json(
        { success: false, error: 'visitId is required' },
        { status: 400 }
      );
    }

    // ── Load visit through the doctor's RLS scope ─────────────
    const { data: visit, error: visitErr } = await userClient
      .from('visits')
      .select('id, patient_id, doctor_id, visit_date, generated_note, note_credential_id')
      .eq('id', visitId)
      .single();

    if (visitErr || !visit) {
      return NextResponse.json({ success: false, error: 'Visit not found' }, { status: 404 });
    }
    if (visit.doctor_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Only the attending doctor can approve this note' },
        { status: 403 }
      );
    }
    if (visit.note_credential_id) {
      return NextResponse.json(
        { success: false, error: 'Note is already credentialed; amendments must issue a replacement credential' },
        { status: 409 }
      );
    }

    const noteToApprove = doctorEdits ?? visit.generated_note;
    if (!noteToApprove) {
      return NextResponse.json(
        { success: false, error: 'No note to approve (generate one first)' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ── Doctor context for the prescriber ref ─────────────────
    const { data: doctor } = await admin
      .from('doctors')
      .select('name, bmdc_reg_no')
      .eq('id', user.id)
      .single();

    // ── Ensure identities (DIDs minted on first use) ──────────
    const doctorIdentity = await ensureEntityIdentity(admin, 'doctor', user.id);
    const patientIdentity = await ensureEntityIdentity(admin, 'patient', visit.patient_id);

    // ── Map the note to credential payloads ───────────────────
    const { visitNote, prescription } = mapGeneratedNote(noteToApprove, {
      visitId: visit.id,
      encounterDate: visit.visit_date ?? new Date().toISOString().slice(0, 10),
      prescriber: {
        did: doctorIdentity.did,
        name: doctor?.name,
        identifier: doctor?.bmdc_reg_no ?? undefined,
      },
    });

    // ── Issue: Rx first, then the note that references it ─────
    const issuer = { kind: 'doctor' as const, id: user.id, name: doctor?.name };

    const rxCredential = prescription
      ? await issueCredential(admin, {
          issuer,
          subjectDid: patientIdentity.did,
          type: 'prescription',
          data: prescription,
        })
      : null;

    const noteCredential = await issueCredential(admin, {
      issuer,
      subjectDid: patientIdentity.did,
      type: 'visit_note',
      data: rxCredential ? { ...visitNote, prescriptionRef: rxCredential.vcId } : visitNote,
    });

    // ── Project rows from the credentials ─────────────────────
    const projection = await rebuildProjections(admin, patientIdentity.did);

    const { error: approveErr } = await admin
      .from('visits')
      .update({
        approved_note: noteToApprove as Json,
        doctor_edits: (doctorEdits ?? null) as Json,
        approved_at: new Date().toISOString(),
        note_credential_id: noteCredential.rowId,
        status: 'completed',
        prescription_safety_check: (safetyCheck ?? null) as Json,
      })
      .eq('id', visitId);

    if (approveErr) {
      return NextResponse.json(
        { success: false, error: `Credentials issued but visit update failed: ${approveErr.message}` },
        { status: 500 }
      );
    }

    // ── Leg D: proactive enqueues (best-effort; never block approval) ──
    try {
      const { resolveWaIdForPatient, enqueue } = await import("@/lib/whatsapp/schedule");
      const { followupParams, appointmentReminderParams } = await import("@/lib/whatsapp/templates");
      const waId = await resolveWaIdForPatient(admin, visit.patient_id);
      if (waId) {
        const { data: pat } = await admin.from("patients").select("name, name_bn").eq("id", visit.patient_id).maybeSingle();
        const patientName = pat?.name_bn ?? pat?.name ?? "রোগী";

        const followAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
        await enqueue(admin, { kind: "followup", patientId: visit.patient_id, visitId: visit.id, toWaId: waId, bodyParams: followupParams(patientName), fireAt: followAt });

        if (typeof nextAppointmentAt === "string" && nextAppointmentAt) {
          const apptDate = new Date(nextAppointmentAt);
          if (!isNaN(apptDate.getTime()) && apptDate.getTime() > Date.now()) {
            await admin.from("visits").update({ next_appointment_at: apptDate.toISOString() }).eq("id", visit.id);
            const remindAt = new Date(apptDate.getTime() - 24 * 60 * 60 * 1000);
            const dateText = apptDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
            await enqueue(admin, { kind: "appointment_reminder", patientId: visit.patient_id, visitId: visit.id, toWaId: waId, bodyParams: appointmentReminderParams(patientName, dateText, doctor?.name ?? "ডাক্তার"), fireAt: remindAt });
          }
        }
      }
    } catch (err) {
      console.error("[approve-note] proactive enqueue failed (non-fatal):", err instanceof Error ? err.message : err);
    }

    return NextResponse.json({
      success: true,
      data: {
        visitNoteVcId: noteCredential.vcId,
        prescriptionVcId: rxCredential?.vcId ?? null,
        patientDid: patientIdentity.did,
        doctorDid: doctorIdentity.did,
        projection,
      },
    });
  } catch (err) {
    console.error('[approve-note] Error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
