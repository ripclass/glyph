# Glyph Pocket — v1 (the wallet)

**Design spec · 2026-06-13 · approved by founder**

Pocket is the patient's interface. It spans wallet, Bangla triage, family
circles, medication reminders, doctor matching, and patient-held keys. That
is several subsystems, so it is decomposed. **v1 builds only the wallet.**
Triage is v2 (explicit founder note); family circles, reminders, matching,
and real patient-held keys follow.

## Goal

A patient leaves a Chamber visit able to open, on their own phone, a
read-only view of their own clinical record — signed prescriptions, visit
notes, the plain-Bangla summary, labs — the plastic bag made permanent. It
wears the warm calm-presence design (bone, large Bangla), not the dense
doctor language. It is the patient's keepsake of their care.

## Access model: clinic-issued bearer token, not a login

No patient auth exists today, and the founder avoids recurring cost (no paid
SMS). So access is a **per-patient bearer token**:

1. At note approval, the doctor's tablet shows a QR (and a copyable link).
2. The patient scans it; `/wallet/<token>` opens on their phone.
3. The token maps to one patient, is **revocable**, and may carry an
   **optional PIN**. No password, no account.

Honest tradeoff: a durable bearer link, if leaked, exposes the record until
revoked — so the PIN is offered and the token is revocable. Real
patient-held keys replace this when the identity lift matures. The same link
delivers via WhatsApp once sending is live.

## Components

**Migration 006 — `wallet_access_tokens`**
Columns: `id` uuid pk, `token` text unique (URL-safe, ~32 bytes), `patient_id`
fk → patients, `pin_hash` text null, `created_by_doctor_id` uuid null,
`created_at`, `last_accessed_at` null, `revoked` bool default false.
RLS **enabled with zero policies** (service-role only — patients never touch
PostgREST), mirroring `waitlist_signups`.

**`wallet-logic.ts` (pure, unit-tested)**
- `generateToken()` → URL-safe random string (crypto).
- `hashPin(pin)` / `verifyPin(pin, hash)` — SHA-256 with a per-token salt (or
  bcrypt-lite); PIN is 4 digits, optional.
- `validateAccess({ token row, pin })` → `ok` | `pin_required` | `revoked` |
  `invalid`. No DB, no framework.

**`POST /api/wallet/issue` (doctor session)**
Auth like the other routes (validate `Authorization`). Body `{ patientId,
pin? }`. Finds-or-creates the patient's active (non-revoked) token; sets
`pin_hash` if a PIN is given. Returns `{ token, walletPath }`. The wallet is
the patient's, so one active token per patient (re-issuing returns the same
or rotates on demand).

**`GET /api/wallet/[token]` (public, service-role)**
Validates the token. If `pin_hash` set and no/!matching `pin` provided,
returns `{ state: "pin_required" }`. Otherwise returns the patient bundle:
snapshot (name, age, gender), and per visit — date, doctor name, chief
complaint, plain-Bangla summary, prescriptions (med + 1+0+1 dosing),
labs, and a verification flag per signed credential. Read-only. Updates
`last_accessed_at`. Returns nothing identifying beyond the one patient.

**`/wallet/[token]` (public page, no AuthGuard)**
Calm-presence, Bangla-first. If `pin_required`, a 4-digit PIN entry, then the
record. Sections: a warm header (name, "আপনার স্বাস্থ্য রেকর্ড"), then a
reverse-chronological list of visits; each visit card shows the summary, the
prescriptions in friendly Bangla, labs, and a quiet "✓ যাচাইযোগ্য / verified"
marker on signed items. A footer line: this is your record, owned by you.

**Issuance UI (note page)**
On the existing note-approval success, add a "রোগীর ওয়ালেট প্রস্তুত / Patient
wallet ready" panel: the QR (generated client-side via `qrcode`, so the token
URL never leaves the device), the copyable link, and an optional "set a 4-digit
PIN with the patient" field.

## Out of scope (v2+)

Triage (v2, explicit), family circles, medication reminders, doctor matching,
patient-held keys, WhatsApp delivery of the link, any write/edit action in the
wallet.

## New dependency

`qrcode` (+ `@types/qrcode`) — build-time QR generation, MIT, no runtime
service, generated locally. Justified: the QR-at-clinic flow needs it and a
public QR API would leak the token URL.

## Verification

Unit tests on `wallet-logic`. Browser test of the full loop on local Supabase:
run a Chamber visit → approve note → scan/open the wallet link → confirm the
record renders, PIN gates when set, and a revoked token is refused.
