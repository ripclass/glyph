import type { Metadata } from "next";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";

/**
 * Privacy policy — khamhealth.com/privacy. Required as the published privacy
 * URL for the Meta/WhatsApp app and as PDPO-facing disclosure for patients and
 * clinicians. Plain server component, same "quiet clinical" system as the rest
 * of the marketing site. Content is intentionally honest about the AI-processing
 * and cross-border-processor chain (OpenRouter + model providers, Meta WhatsApp).
 */

export const metadata: Metadata = {
  title: "Privacy Policy | KhaM Health",
  description:
    "How Glyph by KhaM Health collects, uses, and protects health information, in line with Bangladesh's Personal Data Protection Ordinance 2025.",
};

const EFFECTIVE = "June 15, 2026";

type Section = { heading: string; body: string[] };

const SECTIONS: Section[] = [
  {
    heading: "Who we are",
    body: [
      "Glyph is a clinical assistant built by KhaM Health, a company based in Dhaka, Bangladesh. Glyph helps doctors run patient intake, prepare for consultations, draft visit notes, and follow up with patients over WhatsApp.",
      "This policy explains what information Glyph handles, why, and the choices you have. It applies to the Glyph web application, the patient record links we issue, and the WhatsApp service operating from KhaM Health's verified business number.",
    ],
  },
  {
    heading: "Information we handle",
    body: [
      "Health information you or your clinic provide: symptoms and history captured during intake, photographs of prior prescriptions and lab reports, the consultation record, and the visit note your doctor approves.",
      "Identifiers needed to link a record to the right person: name, age, phone number, and clinic. For doctors, we also hold professional details such as BMDC registration.",
      "WhatsApp messages you send to or receive from the Glyph number, including text, images, and delivery status, so the service can respond and keep your record current.",
      "Basic technical and consent records — for example, when and how consent was given or withdrawn — which we are required to keep for accountability.",
    ],
  },
  {
    heading: "How we use it",
    body: [
      "To prepare a briefing for your doctor before your visit, to draft a visit note in the standard Bangladesh prescription format, to answer questions you raise over WhatsApp with general guidance, and to send follow-up reminders.",
      "Glyph never replaces a doctor. It does not diagnose or prescribe. Anything it suggests is for the doctor to decide on, and any guidance sent to a patient is general and points you back to a clinician when needed.",
    ],
  },
  {
    heading: "Consent",
    body: [
      "Health data is sensitive personal data under Bangladesh's Personal Data Protection Ordinance 2025. We collect and process it only with consent, recorded at the point it is given, and you may withdraw consent at any time.",
      "Where a family member or attendant speaks on a patient's behalf — common in Bangladeshi clinics — we record who provided each piece of information. Sending the Glyph number a message, or sharing a clinic code, is itself an opt-in to the WhatsApp service, and you can stop it at any time by replying with a stop word.",
    ],
  },
  {
    heading: "Artificial intelligence and de-identification",
    body: [
      "Glyph uses AI models to read documents, summarise intake, and draft notes. Before free text or images leave our systems for an AI model, we remove direct identifiers such as names, phone numbers, and national ID numbers, and we send the minimum needed for the task.",
      "Those AI models are operated by third-party providers, and the request may be routed through an aggregation provider (OpenRouter, Inc.). This means de-identified content may be processed on servers outside Bangladesh. We do not allow these providers to use your data to train their models, and every external call is gated and logged.",
    ],
  },
  {
    heading: "WhatsApp",
    body: [
      "The WhatsApp service runs on the WhatsApp Business Platform provided by Meta. When you message Glyph, Meta processes that message to deliver it, under Meta's own terms and privacy policy. We use it only for the purposes above and never for advertising.",
      "We do not send unsolicited marketing on WhatsApp. Proactive messages are limited to clinical follow-ups and appointment reminders for patients who are linked to a doctor.",
    ],
  },
  {
    heading: "Sharing",
    body: [
      "We do not sell your information. We share it only with the doctor and clinic responsible for your care, with the service providers that host and process data on our behalf under contract, and where the law requires it.",
      "When a pharmacy verifies a prescription Glyph issued, it confirms only that the prescription is valid and not revoked — it does not expose your wider record.",
    ],
  },
  {
    heading: "Where data is stored and for how long",
    body: [
      "Records are stored on managed cloud infrastructure (Supabase) hosted in Singapore (ap-southeast-1), with access restricted to the clinic responsible for the patient. Document images are kept in private storage that is not publicly reachable.",
      "We keep health records for as long as needed to provide care and to meet legal and medical record-keeping obligations, and we delete or anonymise them when that need ends or on a valid request.",
    ],
  },
  {
    heading: "Your rights",
    body: [
      "You may ask us what information we hold about you, ask us to correct it, withdraw consent, or ask us to delete it, subject to any record-keeping the law requires. Patients can view their own record through the secure link issued by their clinic.",
      "To make any of these requests, contact us using the details below and we will respond within a reasonable time.",
    ],
  },
  {
    heading: "Security",
    body: [
      "We protect information with access controls scoped to each clinic, private document storage, encryption of sensitive keys, and an append-only record of when data is shared externally. No system is perfectly secure, but we design Glyph to send as little as possible and to fail safe.",
    ],
  },
  {
    heading: "Contact and changes",
    body: [
      "KhaM Health, Dhaka, Bangladesh. Email: hello@khamhealth.com.",
      "We may update this policy as Glyph develops or as the law requires. The effective date below reflects the latest version, and material changes will be made clear on this page.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="scene min-h-screen px-2 py-2 sm:px-4 sm:py-4">
      <main className="grain-soft relative mx-auto max-w-[1480px] overflow-hidden rounded-[1.75rem] bg-bone text-ink shadow-[0_40px_120px_-40px_rgba(23,26,25,0.45)]">
        <SiteNav />

        <article className="mx-auto max-w-3xl px-6 md:px-10">
          <header className="pb-10 pt-8 md:pt-14">
            <p className="font-mono text-[13px] text-ink-faint">Legal</p>
            <h1 className="mt-5 font-display text-[clamp(2.1rem,4vw,3.4rem)] font-medium leading-[1.08] tracking-[-0.02em]">
              Privacy Policy
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              How Glyph by KhaM Health collects, uses, and protects health
              information, in line with Bangladesh&apos;s Personal Data
              Protection Ordinance 2025.
            </p>
            <p className="mt-6 font-mono text-[13px] text-ink-faint">
              Last updated: {EFFECTIVE}
            </p>
          </header>

          <div className="border-t border-bone-line py-12 md:py-16">
            {SECTIONS.map((section, idx) => (
              <section key={section.heading} className="mb-12 last:mb-0">
                <p className="font-mono text-[13px] tracking-wide text-ink-faint">
                  {String(idx + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 font-display text-2xl font-medium tracking-[-0.01em] md:text-3xl">
                  {section.heading}
                </h2>
                <div className="mt-5 space-y-5">
                  {section.body.map((para, i) => (
                    <p
                      key={i}
                      className="text-[16.5px] leading-[1.75] text-ink-soft"
                    >
                      {para}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>

        <SiteFooter />
      </main>
    </div>
  );
}
