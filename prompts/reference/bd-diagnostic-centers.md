# Bangladesh Diagnostic Centers & Lab Reference
> v1.0.0 | Last updated: 2026-04-04 | Owner: KhaM Health

## Purpose

Reference data on common diagnostic centers in Bangladesh, standard test panels, typical reference ranges used in BD labs, and approximate cost ranges. Used by the lab-report-reading prompt for format recognition and reference range validation, and by clinical prompts for cost-aware investigation suggestions.

---

## Major Diagnostic Center Chains

### Popular Diagnostic Centre Ltd.
- **Coverage:** Largest chain, 20+ branches across Bangladesh
- **Major locations:** Dhanmondi, Shantinagar, Mirpur, Uttara, Chittagong, Sylhet, Rajshahi, Khulna
- **Report format:** Computerized, standardized across branches, green/white color scheme
- **Strengths:** Pathology, biochemistry, radiology, cardiology, gastroenterology
- **Typical turnaround:** Routine blood: 4-6 hours, CBC: 1-2 hours, Histopathology: 3-5 days
- **Online report:** Available via website/SMS

### Ibn Sina Diagnostic & Consultation Centre
- **Coverage:** Multiple branches, primarily Dhaka
- **Major locations:** Dhanmondi, Zigatola, Uttara
- **Report format:** Computerized, distinctive blue header
- **Strengths:** Full diagnostic services, imaging, endoscopy
- **Typical turnaround:** Similar to Popular

### Medinova Medical Services
- **Coverage:** Multiple branches in Dhaka and divisional cities
- **Major locations:** Malibagh, Dhanmondi
- **Report format:** Computerized, standardized
- **Strengths:** Radiology (CT, MRI), pathology

### Lab Aid Diagnostic
- **Coverage:** Associated with Lab Aid Hospital, multiple branches
- **Report format:** Computerized
- **Strengths:** Full range of diagnostics

### Praava Health
- **Coverage:** Dhaka (Banani), expanding
- **Report format:** Modern, clean, English-only, digital-first
- **Strengths:** Wellness packages, modern facilities, app-based results
- **Note:** Premium pricing, caters to upper-middle class

### Hospital-Attached Labs
- **United Hospital** -- Gulshan, Dhaka. Premium, comprehensive
- **Square Hospital** -- Panthapath, Dhaka. Premium, comprehensive
- **Apollo Hospital** -- Bashundhara, Dhaka
- **Evercare Hospital** (formerly Apollo Dhaka)
- **National Heart Foundation** -- Mirpur, Dhaka. Cardiac-focused
- **BIRDEM** -- Shahbag, Dhaka. Diabetes/endocrine focused
- **Dhaka Medical College Hospital** -- Government, high-volume
- **BSMMU** -- University hospital, referral center

### Specialized Labs
- **icddr,b** -- International Centre for Diarrhoeal Disease Research. Research-grade lab
- **National TB Reference Lab** -- TB diagnostics
- **IPH (Institute of Public Health)** -- Public health testing
- **DNA Lab, Mahanagar** -- Genetic testing

### Local/Small Labs
- Found in every neighborhood
- Quality varies significantly
- May use manual methods (not automated analyzers)
- Reports may be handwritten
- Reference ranges may not be printed
- Lower cost than chain labs

## Common Test Panels & Components

### Complete Blood Count (CBC)

| Test | Unit | Male Reference | Female Reference | Critical Low | Critical High |
|---|---|---|---|---|---|
| Hemoglobin (Hb) | g/dL | 13.0-17.0 | 12.0-15.5 | < 7.0 | > 20.0 |
| RBC Count | million/µL | 4.5-5.5 | 4.0-5.0 | < 2.5 | > 7.0 |
| WBC Count | /µL | 4,000-11,000 | 4,000-11,000 | < 2,000 | > 30,000 |
| Platelet Count | /µL | 150,000-400,000 | 150,000-400,000 | < 50,000 | > 1,000,000 |
| Hematocrit (Hct) | % | 40-54 | 36-48 | < 25 | > 60 |
| MCV | fL | 80-100 | 80-100 | -- | -- |
| MCH | pg | 27-33 | 27-33 | -- | -- |
| MCHC | g/dL | 32-36 | 32-36 | -- | -- |
| RDW | % | 11.5-14.5 | 11.5-14.5 | -- | -- |
| ESR | mm/1st hr | 0-10 | 0-20 | -- | > 100 |

**Differential Count:**

| Cell Type | Reference Range (%) |
|---|---|
| Neutrophils | 40-70 |
| Lymphocytes | 20-40 |
| Monocytes | 2-8 |
| Eosinophils | 1-6 |
| Basophils | 0-1 |

**Approximate cost:** 300-600 BDT (chain labs), 150-300 BDT (local labs)

### Blood Glucose Tests

| Test | Unit | Normal | Pre-diabetic | Diabetic |
|---|---|---|---|---|
| Fasting Blood Sugar (FBS) | mg/dL | 70-100 | 100-125 | >= 126 |
| Random Blood Sugar (RBS) | mg/dL | 70-140 | -- | >= 200 |
| 2h After Breakfast (2h ABF) | mg/dL | < 140 | 140-199 | >= 200 |
| HbA1c | % | < 5.7 | 5.7-6.4 | >= 6.5 |
| OGTT (75g, 2h) | mg/dL | < 140 | 140-199 | >= 200 |

**Approximate cost:** FBS/RBS: 100-200 BDT, HbA1c: 400-800 BDT, OGTT: 300-500 BDT

### Renal Function Test (RFT)

| Test | Unit | Reference Range | Critical Values |
|---|---|---|---|
| Serum Creatinine | mg/dL | 0.7-1.3 (M), 0.6-1.1 (F) | > 10.0 |
| Blood Urea Nitrogen (BUN) | mg/dL | 7-20 | > 100 |
| Blood Urea | mg/dL | 15-40 | > 200 |
| Serum Uric Acid | mg/dL | 3.5-7.2 (M), 2.6-6.0 (F) | > 12.0 |
| eGFR | mL/min/1.73m² | > 90 (normal) | < 15 (kidney failure) |

**eGFR Staging:**
- \> 90: Normal (Stage 1 if proteinuria)
- 60-89: Mildly decreased (Stage 2)
- 45-59: Mild-moderate decrease (Stage 3a)
- 30-44: Moderate-severe decrease (Stage 3b)
- 15-29: Severely decreased (Stage 4)
- < 15: Kidney failure (Stage 5)

**Approximate cost:** S.Cr alone: 150-300 BDT, Full RFT: 400-800 BDT

### Liver Function Test (LFT)

| Test | Unit | Reference Range | Notes |
|---|---|---|---|
| Serum Bilirubin (Total) | mg/dL | 0.1-1.2 | Jaundice visible > 2.5 |
| Serum Bilirubin (Direct) | mg/dL | 0.0-0.3 | |
| Serum Bilirubin (Indirect) | mg/dL | 0.1-0.9 | |
| SGPT / ALT | U/L | < 41 (M), < 33 (F) | Most specific for liver |
| SGOT / AST | U/L | < 40 (M), < 32 (F) | Also in heart, muscle |
| Alkaline Phosphatase (ALP) | U/L | 44-147 | Elevated in bone/biliary disease |
| GGT | U/L | 8-61 (M), 5-36 (F) | Alcohol, biliary |
| Serum Albumin | g/dL | 3.5-5.0 | Low in liver disease, nephrotic |
| Serum Total Protein | g/dL | 6.0-8.3 | |
| PT/INR | seconds / ratio | 11-13.5s / 1.0 | Coagulation, liver function |

**Approximate cost:** Full LFT: 600-1200 BDT

### Lipid Profile

| Test | Unit | Desirable | Borderline | High Risk |
|---|---|---|---|---|
| Total Cholesterol | mg/dL | < 200 | 200-239 | >= 240 |
| LDL Cholesterol | mg/dL | < 100 (ideal), < 130 | 130-159 | >= 160 |
| HDL Cholesterol | mg/dL | > 40 (M), > 50 (F) | -- | < 40 |
| Triglycerides | mg/dL | < 150 | 150-199 | >= 200 |
| VLDL | mg/dL | < 30 | -- | > 40 |
| TC/HDL Ratio | ratio | < 5.0 | -- | > 5.0 |

**Approximate cost:** 500-1000 BDT

### Thyroid Function Test

| Test | Unit | Reference Range | Notes |
|---|---|---|---|
| TSH | mIU/L | 0.4-4.0 | Primary screening test |
| Free T4 (FT4) | ng/dL | 0.8-1.8 | |
| Free T3 (FT3) | pg/mL | 2.3-4.2 | |
| Total T3 | ng/dL | 80-200 | |
| Total T4 | µg/dL | 4.5-12.5 | |

**Pregnancy TSH ranges:**
- 1st trimester: 0.1-2.5 mIU/L
- 2nd trimester: 0.2-3.0 mIU/L
- 3rd trimester: 0.3-3.5 mIU/L

**Approximate cost:** TSH alone: 300-500 BDT, Full TFT: 800-1500 BDT

### Electrolytes

| Test | Unit | Reference Range | Critical Low | Critical High |
|---|---|---|---|---|
| Serum Sodium (Na+) | mEq/L | 136-145 | < 120 | > 160 |
| Serum Potassium (K+) | mEq/L | 3.5-5.0 | < 2.5 | > 6.5 |
| Serum Chloride (Cl-) | mEq/L | 98-106 | < 80 | > 120 |
| Serum Bicarbonate (HCO3-) | mEq/L | 22-28 | < 10 | > 40 |
| Serum Calcium (Total) | mg/dL | 8.5-10.5 | < 6.0 | > 13.0 |
| Serum Magnesium | mg/dL | 1.7-2.3 | < 1.0 | > 4.0 |
| Serum Phosphate | mg/dL | 2.5-4.5 | < 1.0 | > 8.0 |

**Approximate cost:** Single electrolyte: 150-300 BDT, Panel: 500-1000 BDT

### Cardiac Markers

| Test | Unit | Reference Range | Notes |
|---|---|---|---|
| Troponin I | ng/mL | < 0.04 | Elevated = myocardial injury |
| Troponin T (hs) | ng/L | < 14 (hs-cTnT) | High-sensitivity |
| CK-MB | U/L | < 25 | Less specific than troponin |
| BNP | pg/mL | < 100 | Heart failure marker |
| NT-proBNP | pg/mL | < 125 (age < 75) | Heart failure marker |
| D-dimer | µg/mL FEU | < 0.5 | PE/DVT screening |
| CRP (hs) | mg/L | < 1.0 (low risk), 1-3 (moderate), > 3 (high risk) | Cardiovascular risk |

**Approximate cost:** Troponin: 500-1000 BDT, BNP: 1500-3000 BDT, D-dimer: 800-1500 BDT

### Urine Routine Examination

| Parameter | Normal Values |
|---|---|
| Color | Pale yellow to amber |
| Appearance | Clear |
| pH | 4.6-8.0 |
| Specific Gravity | 1.005-1.030 |
| Protein | Nil / Trace |
| Sugar / Glucose | Nil |
| Blood | Nil |
| Bilirubin | Nil |
| Ketones | Nil |
| WBC (Pus cells) | 0-5 /HPF |
| RBC | 0-2 /HPF |
| Epithelial cells | Few |
| Casts | Nil |
| Crystals | Nil or few |
| Bacteria | Nil |

**Approximate cost:** 100-300 BDT

### Serology / Infectious Disease

| Test | Result Interpretation | Cost Estimate (BDT) |
|---|---|---|
| HBsAg | Positive = Hepatitis B infection | 200-400 |
| Anti-HCV | Positive = Hepatitis C exposure | 300-500 |
| HIV (screening) | Reactive = needs confirmatory | 300-500 |
| VDRL | Reactive = possible syphilis | 150-300 |
| Widal (TO, TH) | Titer ≥ 1:160 = suggestive of typhoid | 200-400 |
| Dengue NS1 | Positive in first 5 days | 400-800 |
| Dengue IgM | Positive after day 5 (current/recent) | 400-800 |
| Dengue IgG | Positive = past infection or secondary | 400-800 |
| Dengue Panel (NS1+IgM+IgG) | Comprehensive | 1000-1500 |
| CRP (Quantitative) | < 6 mg/L normal | 200-400 |
| ASO Titer | < 200 IU/mL normal | 200-400 |
| RA Factor | < 14 IU/mL normal | 200-400 |
| ANA | Negative = normal | 800-1500 |
| Procalcitonin | < 0.5 ng/mL = low risk of bacterial infection | 1500-3000 |
| Blood Culture | Organism + sensitivity | 500-1000 |
| Urine Culture | Organism + sensitivity + colony count | 400-800 |
| MT (Mantoux Test) | < 10mm = negative (immunocompetent) | 100-200 |

## Common Imaging Costs

| Investigation | Approximate Cost (BDT) | Availability |
|---|---|---|
| Chest X-ray (PA view) | 300-600 | Widely available |
| X-ray (other views) | 300-800 | Widely available |
| USG (Abdomen) | 500-1500 | Widely available |
| USG (Pregnancy/Obstetric) | 500-1500 | Widely available |
| Echo (Echocardiography) | 1500-3000 | Major centers |
| ECG | 200-500 | Widely available |
| CT Scan (single region) | 3000-8000 | Major centers |
| CT Scan (with contrast) | 5000-12000 | Major centers |
| MRI (single region) | 5000-15000 | Major centers, limited availability outside Dhaka |
| MRI (with contrast) | 8000-20000 | Major centers |
| Endoscopy (Upper GI) | 2000-5000 | Major centers |
| Colonoscopy | 3000-8000 | Major centers |
| Mammography | 1500-3000 | Major centers |
| Bone Densitometry (DEXA) | 2000-4000 | Major centers |
| Holter Monitor (24h) | 2000-4000 | Cardiology centers |
| Stress Test (TMT/ETT) | 2000-4000 | Cardiology centers |

## Cost Awareness Notes for Clinical Prompts

1. **Cost is a major factor** in BD healthcare decisions. Many patients pay out-of-pocket with no insurance.
2. **Average monthly income** context: Minimum wage is approximately 12,500 BDT (~$115 USD) per month. A CBC costing 500 BDT represents 4% of monthly minimum wage.
3. **Suggest essential tests first.** When suggesting investigations, prioritize by clinical necessity and cost-effectiveness.
4. **Batch testing saves money.** Many labs offer panels (e.g., "DM panel": FBS + HbA1c + RFT + Urine R/E) at discounted rates.
5. **Government hospitals are cheaper** but have long wait times. DMCH, BSMMU labs cost 30-50% less than private labs.
6. **Rural availability.** CT/MRI/Endoscopy may not be available outside divisional cities. X-ray, USG, and basic blood tests are available in most upazila health complexes.
7. **Quality consideration.** For critical tests (biopsy, culture, cardiac markers), recommend established chain labs over local labs due to quality control.

## Changelog

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0.0 | 2026-04-04 | Initial diagnostic center and lab reference | KhaM Health |
