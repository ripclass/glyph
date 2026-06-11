/**
 * PII de-identification / re-identification utilities.
 * Strips names, phone numbers, and addresses before sending
 * patient context to external LLM APIs.
 */

/** Mapping from placeholder back to original value. */
export type PiiMappings = Map<string, string>;

interface DeidentifyResult {
  cleaned: string;
  mappings: PiiMappings;
}

// ── Regex patterns ──────────────────────────────────────────────

/** Bangladeshi mobile: +880 1XXXXXXXXX or 01XXXXXXXXX */
const BD_PHONE_RE = /(?:\+?880[-\s]?)?01[3-9]\d{8}/g;

/** International-style phone fallback */
const INTL_PHONE_RE = /\+\d{1,3}[-\s]?\d{4,14}/g;

/** Common Bangladeshi / South-Asian name patterns (2-4 word names) */
const NAME_PREFIXES = [
  "Mr\\.", "Mrs\\.", "Ms\\.", "Dr\\.", "Prof\\.",
  "Md\\.", "Md", "Mohammad", "Mohammed", "Muhammad",
  "Sheikh", "Sk\\.",
];
const NAME_RE = new RegExp(
  `(?:${NAME_PREFIXES.join("|")})\\s+[A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,3}`,
  "g",
);

/** Bangla name pattern (Unicode Bengali block) */
const BANGLA_NAME_RE = /[\u0980-\u09FF]{2,}(?:\s+[\u0980-\u09FF]{2,}){1,4}/g;

/** Address-like patterns (contains road/lane/house/flat/sector + number) */
const ADDRESS_RE =
  /(?:House|Flat|Road|Lane|Block|Sector|Plot|Holding)[\s#\-.:]*\d+[^,\n]{0,60}/gi;

/** National ID / NID */
const NID_RE = /\b\d{10,17}\b/g;

/** Email */
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// ── Helpers ─────────────────────────────────────────────────────

let counter = 0;

function placeholder(tag: string): string {
  counter++;
  return `[${tag}_${counter}]`;
}

function replaceAll(
  text: string,
  regex: RegExp,
  tag: string,
  mappings: PiiMappings,
): string {
  return text.replace(regex, (match) => {
    // Avoid re-replacing already-replaced placeholders
    if (match.startsWith("[") && match.endsWith("]")) return match;
    const ph = placeholder(tag);
    mappings.set(ph, match);
    return ph;
  });
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Strip PII from text, returning cleaned text and a mapping table.
 */
export function deidentify(text: string): DeidentifyResult {
  counter = 0;
  const mappings: PiiMappings = new Map();

  let cleaned = text;

  // Order matters: replace more specific patterns first
  cleaned = replaceAll(cleaned, EMAIL_RE, "EMAIL", mappings);
  cleaned = replaceAll(cleaned, BD_PHONE_RE, "PHONE", mappings);
  cleaned = replaceAll(cleaned, INTL_PHONE_RE, "PHONE", mappings);
  cleaned = replaceAll(cleaned, NID_RE, "ID", mappings);
  cleaned = replaceAll(cleaned, ADDRESS_RE, "ADDRESS", mappings);
  cleaned = replaceAll(cleaned, NAME_RE, "NAME", mappings);
  cleaned = replaceAll(cleaned, BANGLA_NAME_RE, "NAME_BN", mappings);

  return { cleaned, mappings };
}

/**
 * Restore original PII values from placeholders.
 */
export function reidentify(text: string, mappings: PiiMappings): string {
  let restored = text;
  for (const [placeholder, original] of mappings) {
    // Use split/join for literal replacement (no regex escaping needed)
    restored = restored.split(placeholder).join(original);
  }
  return restored;
}

/**
 * PRECISE-pattern scrub only: email, phone, NID — the patterns that are
 * reliable on any text, including Bangla prose.
 *
 * The name/address heuristics in `deidentify()` are deliberately excluded:
 * BANGLA_NAME_RE matches ANY 2–5 word Bangla sequence, so running it over a
 * Bangla prompt or transcript destroys the clinical content itself. Use
 * known-identifier literal scrubbing (egress.ts) for names — exact values
 * from structured fields are strictly more reliable than regex guessing.
 *
 * Appends into an existing mappings table so it composes with
 * known-identifier scrubbing under one re-identification pass.
 */
export function deidentifyPrecise(
  text: string,
  mappings: PiiMappings,
): string {
  let cleaned = text;
  cleaned = replaceAll(cleaned, EMAIL_RE, "EMAIL", mappings);
  cleaned = replaceAll(cleaned, BD_PHONE_RE, "PHONE", mappings);
  cleaned = replaceAll(cleaned, INTL_PHONE_RE, "PHONE", mappings);
  cleaned = replaceAll(cleaned, NID_RE, "ID", mappings);
  return cleaned;
}
