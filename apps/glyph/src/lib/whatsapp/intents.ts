/**
 * Pure, deterministic command classifiers for bound-patient WhatsApp messages.
 * Conservative: only an explicit match counts; anything else is treated as a
 * symptom (the default in the router). Bangla + English.
 */
function norm(text: string): string {
  return text.trim().toLowerCase();
}

const AFFIRMATIVE = ["হ্যাঁ", "হ্যা", "জি", "জ্বি", "ঠিক আছে", "আচ্ছা", "রাজি", "সম্মত", "yes", "ok", "okay", "y", "👍", "✓", "accept"];
const STOP = ["stop", "unsubscribe", "বন্ধ", "আনসাবস্ক্রাইব", "বন্ধ করুন", "remove", "cancel"];
const RECORD = ["record", "records", "রেকর্ড", "my record", "আমার রেকর্ড", "রিপোর্ট", "report", "history", "ইতিহাস", "প্রেসক্রিপশন"];

function matchesAny(text: string, list: string[]): boolean {
  const t = norm(text);
  return list.some((w) => t === w || t.includes(w));
}

/** A short affirmative ("yes"/"হ্যাঁ"/👍). Only matches SHORT replies to avoid a symptom that contains "ok". */
export function isAffirmative(text: string): boolean {
  const t = norm(text);
  if (t.length > 12) return false; // a real symptom is longer than a yes
  return AFFIRMATIVE.some((w) => t === w || t.startsWith(w + " ") || t === w + "।");
}

export function isStopWord(text: string): boolean {
  return matchesAny(text, STOP);
}

export function isRecordRequest(text: string): boolean {
  return matchesAny(text, RECORD);
}
