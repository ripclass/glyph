export type DocType = "prescription" | "lab_report";

const RX = ["১", "1", "প্রেসক্রিপশন", "rx", "prescription", "presc"];
const LAB = ["২", "2", "রিপোর্ট", "report", "lab", "ল্যাব", "lab report", "ল্যাব রিপোর্ট"];

/** Map a patient's "1/2/prescription/report" reply to a DocType, or null. */
export function parseDocType(text: string): DocType | null {
  const t = text.trim().toLowerCase().replace(/[।.!?]+$/u, "");
  if (RX.includes(t)) return "prescription";
  if (LAB.includes(t)) return "lab_report";
  return null;
}
