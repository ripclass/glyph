# Bangladesh Prescription Format Specification
> v1.0.0 | Last updated: 2026-04-04 | Owner: KhaM Health

## Purpose

Defines the standard format and conventions used in Bangladeshi medical prescriptions. This reference is used by the prescription-reading and note-generation prompts to ensure correct interpretation and output of prescription data.

---

## Standard Prescription Layout

A typical Bangladeshi prescription follows this top-to-bottom layout:

```
┌──────────────────────────────────────────────────────┐
│                    HEADER                              │
│  Doctor's Name, Degrees                               │
│  Specialization                                       │
│  BMDC Reg: A-XXXXX                                    │
│  Clinic/Hospital Name                                 │
│  Address, Phone                                       │
├──────────────────────────────────────────────────────┤
│  Date: DD/MM/YYYY                                     │
│  Patient Name:            Age:        Sex:            │
│  (sometimes Weight, Address, Phone)                   │
├──────────────────────────────────────────────────────┤
│  C/C: Chief complaint                                 │
│  O/E: Examination findings                            │
│  Ix: Investigations ordered                           │
├──────────────────────────────────────────────────────┤
│  ℞                                                    │
│  1. Tab. Drug Name Strength                           │
│        1+0+1 ---- 14 days (AF)                        │
│  2. Cap. Drug Name Strength                           │
│        0+0+1 ---- 7 days (BF)                         │
│  3. Syp. Drug Name                                    │
│        2 TSF 1+1+1 ---- 7 days (AF)                   │
├──────────────────────────────────────────────────────┤
│  Advice:                                              │
│  - Dietary/lifestyle instructions                     │
│  - Follow-up date                                     │
├──────────────────────────────────────────────────────┤
│  Doctor's Signature                                   │
└──────────────────────────────────────────────────────┘
```

## Header Section

### Doctor Information

| Field | Format | Example |
|---|---|---|
| Name | Bengali and/or English | ডা. মোঃ রহিমুল ইসলাম / Dr. Md. Rahimul Islam |
| Degrees | Abbreviated, comma-separated | MBBS, FCPS (Medicine), MD |
| Specialization | Full or abbreviated | Medicine Specialist / Consultant Cardiologist |
| BMDC Registration | A-XXXXX or XXXXX (5-digit) | A-35678 |
| Clinic Name | Full name | City Medical Centre |
| Address | Clinic address | House 45, Road 12, Dhanmondi, Dhaka |
| Phone | Mobile or landline | 01XXXXXXXXX |
| Chamber Hours | Days and times | Sat-Thu: 5pm-9pm |

### BMDC Registration Format

The Bangladesh Medical and Dental Council (BMDC) registration number:
- Format: `A-XXXXX` (for MBBS doctors) or just `XXXXX`
- Dental: `D-XXXXX`
- The A/D prefix indicates medical/dental
- 5-digit number
- This is a legal requirement on all prescriptions in Bangladesh

### Date Format

- Standard: `DD/MM/YYYY` (Bangladesh follows day-month-year)
- Sometimes written as: `DD-MM-YYYY` or `DD.MM.YYYY`
- Bangla date is rarely used on prescriptions
- Some doctors write only day and month (omitting year)

## Patient Information

| Field | Common Formats |
|---|---|
| Name | Full name (often just first + last) |
| Age | Years (e.g., "52 yrs" or "৫২ বছর"). For children: months/years (e.g., "8 mo" or "2½ yrs") |
| Sex | M/F or Male/Female or পুরুষ/মহিলা |
| Weight | In kg (especially for children: "12 kg") |
| Address | Sometimes included, often omitted |
| Phone | Sometimes included |

## Clinical Sections

### C/C (Chief Complaint)

- Brief, often abbreviated
- Common abbreviations:
  - "c/o" = complaining of
  - "H/O" = history of
  - "K/C/O" = known case of
- Example: "C/C: Chest pain x 3 days, cough x 1 week"

### O/E (On Examination)

- Physical examination findings
- Vitals often listed first
- Common format:
  ```
  O/E:
  BP: 140/90 mmHg
  Pulse: 88/min
  Temp: 100°F
  Chest: Clear
  Abdomen: Soft, non-tender
  ```
- Abbreviations:
  - NAD = No Apparent Distress
  - WNL = Within Normal Limits
  - B/L = Bilateral
  - CVS = Cardiovascular System
  - RS = Respiratory System
  - GIT = Gastrointestinal Tract
  - CNS = Central Nervous System

### Ix (Investigations)

- Tests ordered
- Written as a list
- Common abbreviations:
  - CBC = Complete Blood Count
  - RBS/FBS = Random/Fasting Blood Sugar
  - S.Cr = Serum Creatinine
  - LFT = Liver Function Test
  - RFT = Renal Function Test
  - CXR = Chest X-ray
  - USG = Ultrasonogram
  - ECG = Electrocardiogram
  - HbA1c = Glycated Hemoglobin

## Rx (Prescription) Section

### The Rx Symbol

The ℞ symbol (or "Rx" written plainly) precedes the medication list. It originates from the Latin "recipe" (take).

### Medication Entry Format

Each medication entry typically follows this pattern:

```
[Form Abbreviation]. [Drug Name] [Strength]
    [Frequency] ---- [Duration] ([Meal relation])
```

### Drug Form Abbreviations

| Abbreviation | Full Form | Bangla |
|---|---|---|
| Tab. | Tablet | ট্যাবলেট |
| Cap. | Capsule | ক্যাপসুল |
| Syp. | Syrup | সিরাপ |
| Susp. | Suspension | সাসপেনশন |
| Inj. | Injection | ইনজেকশন |
| Cr. / Crm. | Cream | ক্রিম |
| Oint. | Ointment | মলম |
| Drop / Drp. | Drops | ড্রপ |
| Inh. | Inhaler | ইনহেলার |
| Sup. / Supp. | Suppository | সাপোজিটরি |
| Sach. | Sachet | স্যাশে |
| Sol. | Solution | সলিউশন |
| Neb. | Nebulization | নেবুলাইজেশন |
| Loz. | Lozenge | লজেন্স |
| Pwd. | Powder | পাউডার |
| SR | Sustained Release | - |
| XR / ER | Extended Release | - |
| DS | Double Strength | - |

### Frequency Notation (Unique to BD)

The Bangladeshi prescription system uses a distinctive numeric notation showing doses at three time points: **morning + afternoon + night**.

| Notation | Meaning | Standard Equivalent |
|---|---|---|
| 1+1+1 | Morning 1, Afternoon 1, Night 1 | TID (three times daily) |
| 1+0+1 | Morning 1, skip afternoon, Night 1 | BID (twice daily) |
| 1+0+0 | Morning 1 only | QD (once daily, morning) |
| 0+0+1 | Night 1 only | QD (once daily, at bedtime) |
| 0+1+0 | Afternoon 1 only | QD (once daily, noon) |
| 1+1+0 | Morning 1, Afternoon 1 | BID (twice daily, morning and noon) |
| 0+1+1 | Afternoon 1, Night 1 | BID (twice daily, noon and night) |
| ½+0+½ | Half morning, Half night | BID (half tablet) |
| 1+1+1+1 | Four times daily | QID |
| 2+2+2 | Two tablets TID | - |
| SOS | As needed | PRN |
| Stat | Immediately, once | STAT |

### Approximate Timing

| Bangla Term | Meaning | Approximate Time |
|---|---|---|
| সকালে | Morning | 6-8 AM |
| দুপুরে | Afternoon / Noon | 12-2 PM |
| রাতে | Night / Bedtime | 8-10 PM |

### Duration Notation

| Written As | Meaning |
|---|---|
| x 7 days / x 7d / ৭ দিন | For 7 days |
| x 14 days / x 2 wk | For 14 days |
| x 1 month / x 1 mo | For 1 month |
| x 3 months | For 3 months |
| Cont. / Continue / চলবে | Continue indefinitely |
| --- (long line) | Continue until told to stop |
| Till next visit | Until follow-up |

### Meal Relation

| Written As | Meaning |
|---|---|
| BF / a.c. / আগে / খাবার আগে | Before food (ante cibum) |
| AF / p.c. / পরে / খাবার পরে | After food (post cibum) |
| Empty stomach / খালি পেটে | On empty stomach |
| With food | With food |
| At bedtime / ঘুমের আগে | At bedtime |

### Route of Administration

| Written As | Route |
|---|---|
| PO / oral | By mouth (most common, often not explicitly stated) |
| IV | Intravenous |
| IM | Intramuscular |
| SC / SQ | Subcutaneous |
| SL | Sublingual |
| PR | Per rectum |
| INH | Inhalation |
| Topical | On skin |
| Eye / Ear / Nasal | Specific drops |

### Syrup/Suspension Dosing

| Written As | Meaning |
|---|---|
| 1 TSF | 1 teaspoon (5 mL) |
| 2 TSF | 2 teaspoons (10 mL) |
| ½ TSF | Half teaspoon (2.5 mL) |
| 1 TBF | 1 tablespoon (15 mL) |
| 5 ml / 10 ml | Milliliter dosing |
| 1 cup | Usually measuring cup provided (varies) |

### Injection Dosing

| Written As | Meaning |
|---|---|
| 1 amp | 1 ampoule |
| 1 vial | 1 vial |
| IV / IM | Route |
| 1 unit / 10 units | For insulin |
| BD / OD | Twice daily / Once daily |

## Advice Section

Common advice entries in BD prescriptions:

| Bangla | English |
|---|---|
| তৈলাক্ত খাবার কম খাবেন | Avoid oily/fatty foods |
| চিনি / মিষ্টি কম খাবেন | Reduce sugar/sweets |
| লবণ কম খাবেন | Reduce salt |
| পানি বেশি খাবেন | Drink plenty of water |
| বিশ্রাম নেবেন | Take rest |
| হাঁটাহাঁটি করবেন | Walk regularly |
| ধূমপান বর্জন করুন | Quit smoking |
| ওজন কমাতে হবে | Need to lose weight |
| পরীক্ষার রিপোর্ট নিয়ে আসবেন | Come with test reports |
| ৭ দিন পর আসবেন | Come back after 7 days |
| ওষুধ শেষে আসবেন | Come after finishing medications |
| জরুরি প্রয়োজনে আসবেন | Come if urgently needed |

## Common Prescription Patterns by Condition

### Common Cold / URTI
```
Tab. Napa Extra 1+1+1 x 5 days (AF)
Tab. Fexo 120 0+0+1 x 7 days
Syp. Ambrol / Ambrox 2 TSF 1+1+1 x 7 days
```

### Gastric / GERD
```
Cap. Seclo 20 1+0+1 x 14 days (BF)
Tab. Antacil / Renet 1+1+1 (after meal, chew)
```

### Hypertension
```
Tab. Losartan 50 1+0+0 (Cont.)
Tab. Amlodipine 5 0+0+1 (Cont.)
```

### Diabetes (Type 2)
```
Tab. Metformin 500 1+0+1 (AF, Cont.)
Tab. Glimepiride 2 1+0+0 (BF, Cont.)
```

## Regulatory Notes

1. **BMDC registration is legally required** on all prescriptions in Bangladesh.
2. **Generic name requirement**: By law, doctors should write generic names, though brand names are far more commonly used in practice.
3. **Prescription validity**: No formal expiration, but pharmacies generally dispense within a reasonable timeframe.
4. **Controlled substances**: Require special notation and may need duplicate copies.
5. **Antibiotic prescriptions**: Should ideally include indication (rarely followed in practice).

## Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-04-04 | Initial BD prescription format specification | KhaM Health |
