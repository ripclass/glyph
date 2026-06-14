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
