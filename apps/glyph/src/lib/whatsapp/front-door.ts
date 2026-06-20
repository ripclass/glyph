/** Default display name for a provisional patient (real name captured later, progressively). */
export const NAME_DEFAULT = "Glyph ব্যবহারকারী";

/** First reply to an unknown number: what Glyph is + the consent ask. */
export const FRONT_DOOR_CONSENT_MSG =
  "আসসালামু আলাইকুম, এটি Glyph। আমি আপনার জন্য একটি বিনামূল্যের ব্যক্তিগত স্বাস্থ্য রেকর্ড রাখতে পারি এবং স্বাস্থ্য বিষয়ে সাহায্য করতে পারি। আপনার লেখা একটি AI পড়বে, পরিচয় গোপন রেখে। এটি ডাক্তারের বিকল্প নয়, শুধু পরামর্শ। শুরু করতে 'হ্যাঁ' লিখুন, বন্ধ করতে 'বন্ধ' লিখুন।";

/** After consent: who is the record for. */
export const SUBJECT_QUESTION =
  "এটি কার জন্য? নিজের জন্য হলে '১' লিখুন, পরিবারের কারও জন্য হলে '২' লিখুন।";

export const CONSENT_DECLINED_MSG = "ঠিক আছে, কোনো সমস্যা নেই। প্রয়োজনে ডাক্তার দেখান।";

/** Welcome shown once the record exists, carrying the wallet link. */
export function buildWelcome(walletUrl: string): string {
  return `স্বাগতম। আপনার ব্যক্তিগত স্বাস্থ্য রেকর্ড তৈরি হয়েছে। এখানে দেখুন:\n${walletUrl}`;
}

/** Map a free-text reply to a subject choice. Conservative: exact tokens only. */
export function parseSubjectChoice(text: string): "self" | "family" | null {
  const t = text.trim();
  if (["1", "১", "নিজে", "আমি"].includes(t)) return "self";
  if (["2", "২", "পরিবার"].includes(t)) return "family";
  return null;
}
