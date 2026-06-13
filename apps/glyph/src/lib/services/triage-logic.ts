/**
 * @fileoverview Pure, safety-critical logic for Pocket triage. No network, no
 * framework, no LLM — so it is deterministic and unit-testable. Two jobs:
 *
 *  1. screenRedFlags — a hard danger-phrase screen (Bangla + English) that
 *     forces an urgent "go now" REGARDLESS of the model. Defense in depth: the
 *     LLM is never the sole arbiter of escalation.
 *  2. validateOutcome — parse the model's structured reply and clamp every
 *     uncertainty to the safe (see-a-doctor) side.
 *
 * @module lib/services/triage-logic
 */

export type TriageRoute = "pharmacy" | "doctor" | "urgent";

export interface TriageOutcome {
  /** "question" = ask one more follow-up; "answer" = final structured answer. */
  mode: "question" | "answer";
  /** Plain-Bangla body (the question, or the explanation). */
  text: string;
  /** Final routing (answer mode). */
  route?: TriageRoute;
  /** What to watch for (answer mode). */
  watchFor?: string[];
  /** Suggested kind of doctor (answer mode), e.g. "হৃদরোগ বিশেষজ্ঞ". */
  specialty?: string;
  /** The firm "go now" line when urgent. */
  redFlag?: string;
}

/**
 * Danger phrases that force an urgent answer. Conservative by design — a false
 * "go to hospital" is acceptable; a missed one is not. Substring match,
 * case-insensitive, Bangla and common English/transliteration.
 */
const RED_FLAG_PHRASES: string[] = [
  // Cardiac / chest
  "বুকে ব্যথা", "বুকে চাপ", "বুক ব্যাথা", "chest pain", "chest pressure",
  // Breathing
  "শ্বাসকষ্ট", "দম বন্ধ", "নিঃশ্বাস নিতে কষ্ট", "শ্বাস নিতে", "breathless",
  "shortness of breath", "can't breathe", "cannot breathe",
  // Stroke
  "মুখ বেঁকে", "কথা জড়িয়ে", "এক পাশ অবশ", "একপাশ অবশ", "অবশ হয়ে",
  "slurred speech", "face droop", "one side", "paralysis", "stroke",
  // Bleeding
  "রক্তবমি", "রক্ত বমি", "কালো পায়খানা", "প্রচণ্ড রক্ত", "vomiting blood",
  "coughing blood", "রক্ত পড়ছে", "heavy bleeding", "severe bleeding",
  // Consciousness
  "অজ্ঞান", "সংজ্ঞাহীন", "জ্ঞান হারা", "unconscious", "fainted", "passed out",
  "convulsion", "খিঁচুনি",
  // Neuro / meningitis
  "ঘাড় শক্ত", "stiff neck", "তীব্র মাথাব্যথা", "worst headache",
  // Poisoning / self-harm
  "বিষ খেয়েছে", "poison", "আত্মহত্যা", "নিজেকে শেষ", "suicide", "self harm",
  "self-harm",
];

export interface RedFlagHit {
  matched: string;
  /** Bangla "go now" message shown to the patient. */
  message: string;
}

const URGENT_MESSAGE =
  "এই লক্ষণ গুরুতর হতে পারে। দেরি না করে এখনই কাছের হাসপাতালে বা জরুরি বিভাগে যান।";

/**
 * Screens free text for danger phrases. Returns a hit (force urgent) or null.
 */
export function screenRedFlags(text: string): RedFlagHit | null {
  if (typeof text !== "string") return null;
  const hay = text.toLowerCase();
  for (const phrase of RED_FLAG_PHRASES) {
    if (hay.includes(phrase.toLowerCase())) {
      return { matched: phrase, message: URGENT_MESSAGE };
    }
  }
  return null;
}

/** The forced-urgent outcome, used when the red-flag screen fires. */
export function urgentOutcome(message = URGENT_MESSAGE): TriageOutcome {
  return {
    mode: "answer",
    text: message,
    route: "urgent",
    redFlag: message,
    watchFor: [],
  };
}

const ROUTES: TriageRoute[] = ["pharmacy", "doctor", "urgent"];

/**
 * Parses and clamps the model's structured reply. Anything malformed or
 * uncertain defaults to the safe side: a "see a doctor" answer. An unknown or
 * missing route on an answer becomes "doctor", never "pharmacy".
 *
 * @param raw - The model's JSON (already parsed) or a string to parse
 * @param maxQuestionsReached - When true, a "question" reply is downgraded to
 *   a "doctor" answer so the exchange cannot loop forever.
 */
export function validateOutcome(raw: unknown, maxQuestionsReached = false): TriageOutcome {
  let obj: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = null;
    }
  } else if (raw && typeof raw === "object") {
    obj = raw as Record<string, unknown>;
  }

  const safeFallback: TriageOutcome = {
    mode: "answer",
    text: "নিশ্চিত হতে পারছি না। নিরাপদ থাকতে একজন ডাক্তার দেখানো ভালো।",
    route: "doctor",
    watchFor: [],
  };

  if (!obj || typeof obj.text !== "string" || obj.text.trim() === "") {
    return safeFallback;
  }

  const wantsQuestion = obj.mode === "question";
  if (wantsQuestion && !maxQuestionsReached) {
    return { mode: "question", text: obj.text.trim() };
  }

  // Answer mode (or a question past the cap → forced to answer).
  const route: TriageRoute = ROUTES.includes(obj.route as TriageRoute)
    ? (obj.route as TriageRoute)
    : "doctor"; // unknown/missing → safe side
  const watchFor = Array.isArray(obj.watchFor)
    ? obj.watchFor.filter((w): w is string => typeof w === "string").slice(0, 6)
    : [];
  const specialty = typeof obj.specialty === "string" ? obj.specialty : undefined;
  const redFlag = typeof obj.redFlag === "string" ? obj.redFlag : undefined;

  return {
    mode: "answer",
    text: wantsQuestion
      ? "যথেষ্ট তথ্য পেয়েছি। নিরাপদ থাকতে একজন ডাক্তার দেখানো ভালো।"
      : obj.text.trim(),
    route,
    watchFor,
    specialty,
    redFlag,
  };
}
