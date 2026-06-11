# @kham/schemas-clinical

Zod schemas for the **content** of Glyph clinical Verifiable Credentials — the
`credentialSubject.data` of each credential type. Domain content only: the VC
envelope, Ed25519 signing, did:web, and JCS canonicalization live in
[`@kham/identity`](../identity). The Glyph issuance seam (M3) composes the two —
validate here, build + sign there.

## Credential types (v1)

| `credentialType` | VC `type` | Subject | Issuer |
|---|---|---|---|
| `physician_registration` | `PhysicianRegistrationCredential` | doctor DID | self → BMDC |
| `visit_note` | `VisitNoteCredential` | patient DID | physician |
| `prescription` | `PrescriptionCredential` | patient DID | physician |
| `lab_result` | `LabResultCredential` | patient DID | diagnostic centre |
| `dispensing_event` | `DispensingEventCredential` | patient DID | pharmacy |

## Shared envelope (extensible by design)

`common.ts` exports `clinicalContext`, `sourceTag`, `entityRef`, `medication`,
`labResultItem`, and `diagnosis`. Encounter credentials `.extend(clinicalContext)`,
so future population credentials (ANC visit, factory encounter, migrant
assessment) reuse the same envelope and fit **without a schema break** — only
their domain fields differ. `sourceTag` encodes the attendant protocol
(patient_reported / attendant_translated / clinician_observed / …) as data.

BD specifics: `medication.frequency` follows the `"1+0+1"` tri-slot convention
(English or Bangla numerals — see `BD_DOSING_PATTERN`) but stays a lenient
string so `"SOS"`/`"stat"` are accepted; notes use the CC/H-O/O-E/Ix/Dx/Advice
shape with SOAP as opt-in.

## Usage

```ts
import { validateClinicalCredential, CLINICAL_CREDENTIALS } from "@kham/schemas-clinical";

const data = validateClinicalCredential("prescription", input); // throws ZodError if invalid
const { vcType, context, credentialType } = CLINICAL_CREDENTIALS.prescription;
// → feed vcType/context/credentialType + data into @kham/identity buildAndSignCredential
```
