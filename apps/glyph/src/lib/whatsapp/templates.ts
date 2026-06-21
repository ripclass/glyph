export type ScheduledKind = "followup" | "appointment_reminder" | "doctor_nudge";

export const TEMPLATE_NAMES: Record<ScheduledKind, string> = {
  followup: "glyph_followup",
  appointment_reminder: "glyph_appointment_reminder",
  doctor_nudge: "glyph_doctor_nudge",
};
export const TEMPLATE_LANG = "bn";

/** glyph_followup body: {{1}} = patient name. */
export function followupParams(patientName: string): string[] {
  return [patientName];
}
/** glyph_appointment_reminder body: {{1}} name, {{2}} date, {{3}} doctor. */
export function appointmentReminderParams(patientName: string, dateText: string, doctorName: string): string[] {
  return [patientName, dateText, doctorName];
}
/** glyph_doctor_nudge body: {{1}} = a short patient label (age, chief concern). */
export function doctorNudgeParams(patientLabel: string): string[] {
  return [patientLabel];
}

// --- Emergency Access (Task 4) ---
// Both templates must be created + approved in Meta separately (a prereq, not
// code). Until approved, the sends fail gracefully (logged; the scan still
// routes + audits). No patient name in the hospital template by design.
export const EMERGENCY_FAMILY_TEMPLATE = "glyph_emergency_family";
export const EMERGENCY_HOSPITAL_TEMPLATE = "glyph_emergency_hospital";

/**
 * glyph_emergency_family body:
 * "{{1}} এর জন্য একটি জরুরি কোড স্ক্যান হয়েছে {{2}} এলাকায়, {{4}}। নিকটতম হাসপাতাল: {{3}}।"
 * params: patientName, area, hospitalName, timeText.
 */
export function familyAlertParams(patientName: string, area: string, hospitalName: string, timeText: string): string[] {
  return [patientName, area, hospitalName, timeText];
}

/**
 * glyph_emergency_hospital body (no patient name):
 * "জরুরি রোগী আসছে {{1}} এলাকা থেকে। রক্তের গ্রুপ: {{2}}। সময়: {{3}}। (রোগী-প্রদত্ত তথ্য, যাচাই করুন।)"
 * params: area, bloodGroup, timeText.
 */
export function hospitalAlertParams(area: string, bloodGroup: string, timeText: string): string[] {
  return [area, bloodGroup || "অজানা", timeText];
}
