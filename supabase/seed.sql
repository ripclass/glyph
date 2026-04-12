-- ============================================================
-- GLYPH Seed Data — Development Only
-- 1 clinic, 2 doctors, 5 patients with varied histories
-- ============================================================

-- Clinic
INSERT INTO clinics (id, name, address, district, phone) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'ডক্টর রহমান ক্লিনিক', '42 Mirpur Road, Dhaka-1205', 'Mirpur', '+8801700000001');

-- Note: Doctors reference auth.users — in dev, create users via Supabase Auth first,
-- then update these IDs to match.
-- These placeholder UUIDs must be replaced with real auth.users IDs after signup.

-- Patients
INSERT INTO patients (id, clinic_id, name, name_bn, phone, age, gender, blood_group, address, known_allergies, chronic_conditions) VALUES
  ('p0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'Abdul Karim', 'আব্দুল করিম', '+8801811111001', 62, 'male', 'B+',
   'Mirpur-10, Dhaka',
   '["Penicillin"]'::jsonb,
   '["Type 2 Diabetes", "Hypertension", "CKD Stage 3"]'::jsonb),

  ('p0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   'Fatema Begum', 'ফাতেমা বেগম', '+8801811111002', 45, 'female', 'O+',
   'Pallabi, Dhaka',
   '[]'::jsonb,
   '["Hypothyroidism"]'::jsonb),

  ('p0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001',
   'Mohammad Hasan', 'মোহাম্মদ হাসান', '+8801811111003', 28, 'male', 'A+',
   'Kazipara, Dhaka',
   '["Sulfa drugs"]'::jsonb,
   '[]'::jsonb),

  ('p0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001',
   'Rashida Akter', 'রশিদা আক্তার', '+8801811111004', 55, 'female', 'AB+',
   'Shewrapara, Dhaka',
   '[]'::jsonb,
   '["Rheumatoid Arthritis", "Hypertension"]'::jsonb),

  ('p0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001',
   'Nurul Islam', 'নুরুল ইসলাম', '+8801811111005', 70, 'male', 'B-',
   'Agargaon, Dhaka',
   '["NSAIDs"]'::jsonb,
   '["COPD", "IHD", "Type 2 Diabetes"]'::jsonb);

-- Sample lab reports for Abdul Karim (chronic disease patient)
INSERT INTO lab_reports (id, patient_id, source, lab_name, report_date, test_category, results) VALUES
  ('l0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001',
   'photo_historical', 'Popular Diagnostics', '2026-01-15', 'RFT',
   '[
     {"name": "Serum Creatinine", "value": "1.8", "unit": "mg/dL", "range": "0.7-1.3", "isAbnormal": true, "severity": "moderate"},
     {"name": "Blood Urea", "value": "52", "unit": "mg/dL", "range": "15-40", "isAbnormal": true, "severity": "mild"},
     {"name": "eGFR", "value": "42", "unit": "mL/min", "range": ">60", "isAbnormal": true, "severity": "moderate"}
   ]'::jsonb),

  ('l0000000-0000-0000-0000-000000000002', 'p0000000-0000-0000-0000-000000000001',
   'photo_historical', 'Popular Diagnostics', '2026-01-15', 'HbA1c',
   '[
     {"name": "HbA1c", "value": "8.2", "unit": "%", "range": "<7.0", "isAbnormal": true, "severity": "moderate"},
     {"name": "Fasting Blood Sugar", "value": "162", "unit": "mg/dL", "range": "70-100", "isAbnormal": true, "severity": "moderate"}
   ]'::jsonb),

  ('l0000000-0000-0000-0000-000000000003', 'p0000000-0000-0000-0000-000000000001',
   'photo_historical', 'Ibn Sina Diagnostics', '2025-10-20', 'HbA1c',
   '[
     {"name": "HbA1c", "value": "7.8", "unit": "%", "range": "<7.0", "isAbnormal": true, "severity": "mild"},
     {"name": "Fasting Blood Sugar", "value": "145", "unit": "mg/dL", "range": "70-100", "isAbnormal": true, "severity": "mild"}
   ]'::jsonb);

-- Sample prescriptions for Abdul Karim
INSERT INTO prescriptions (id, patient_id, source, prescribing_doctor_name, prescription_date, diagnosis, medications) VALUES
  ('x0000000-0000-0000-0000-000000000001', 'p0000000-0000-0000-0000-000000000001',
   'photo_historical', 'Dr. A. Rahman', '2026-01-15',
   'T2DM with CKD Stage 3, Hypertension',
   '[
     {"name": "Metformin", "generic_name": "Metformin", "dose": "500mg", "unit": "mg", "frequency": "1+0+1", "duration": "30 days", "route": "oral"},
     {"name": "Amlodipine", "generic_name": "Amlodipine", "dose": "5mg", "unit": "mg", "frequency": "0+0+1", "duration": "30 days", "route": "oral"},
     {"name": "Losartan", "generic_name": "Losartan", "dose": "50mg", "unit": "mg", "frequency": "1+0+0", "duration": "30 days", "route": "oral"},
     {"name": "Insulin Glargine", "generic_name": "Insulin Glargine", "dose": "16 units", "unit": "units", "frequency": "0+0+1", "duration": "30 days", "route": "subcutaneous"}
   ]'::jsonb);
