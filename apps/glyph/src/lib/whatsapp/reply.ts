import type { TriageOutcome } from "@/lib/services/triage-logic";

/**
 * Render a triage outcome as one plain-Bangla WhatsApp message. Questions are
 * sent as-is; answers lead with the firm line for urgent, then the explanation,
 * then a "watch for" list. (WhatsApp has no rich cards — this is the text form
 * of the wallet's OutcomeCard.)
 */
export function formatOutcome(outcome: TriageOutcome): string {
  if (outcome.mode === "question") return outcome.text;

  const lines: string[] = [];
  if (outcome.route === "urgent" && outcome.redFlag) {
    lines.push("⚠️ " + outcome.redFlag);
  }
  if (outcome.text && outcome.text !== outcome.redFlag) lines.push(outcome.text);
  if (outcome.route === "doctor" && outcome.specialty) {
    lines.push(`কোন ডাক্তার: ${outcome.specialty}`);
  }
  if (outcome.watchFor && outcome.watchFor.length > 0) {
    lines.push("এগুলো দেখা দিলে দেরি না করে ডাক্তার দেখান:");
    for (const w of outcome.watchFor) lines.push(`• ${w}`);
  }
  return lines.join("\n");
}
