-- ============================================================
-- GLYPH by KhaM Health — Initial Database Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- CLINICS
-- ============================================================
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  district TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DOCTORS
-- ============================================================
CREATE TABLE doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  clinic_id UUID REFERENCES clinics(id),
  name TEXT NOT NULL,
  name_bn TEXT,
  speciality TEXT,
  bmdc_reg_no TEXT,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  preferred_language TEXT DEFAULT 'bn',
  preferred_note_format TEXT DEFAULT 'bd',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PATIENTS
-- ============================================================
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  phone TEXT,
  age INTEGER,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  blood_group TEXT,
  address TEXT,
  primary_language TEXT DEFAULT 'bn',
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  known_allergies JSONB DEFAULT '[]'::jsonb,
  chronic_conditions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- VISITS
-- ============================================================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  doctor_id UUID REFERENCES doctors(id) NOT NULL,
  clinic_id UUID REFERENCES clinics(id) NOT NULL,
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'intake' CHECK (status IN (
    'intake',
    'intake_complete',
    'in_consultation',
    'note_review',
    'completed',
    'followup_sent'
  )),

  -- Attendant information
  attendant_present BOOLEAN DEFAULT false,
  attendant_name TEXT,
  attendant_relation TEXT,
  attendant_language TEXT,
  attendant_reliability_notes TEXT,

  -- Intake data
  intake_transcript JSONB DEFAULT '[]'::jsonb,
  intake_summary JSONB,
  intake_duration_seconds INTEGER,
  intake_completed_at TIMESTAMPTZ,

  -- Briefing card
  briefing_card JSONB,
  briefing_generated_at TIMESTAMPTZ,

  -- Consultation
  consultation_started_at TIMESTAMPTZ,
  consultation_ended_at TIMESTAMPTZ,
  consultation_transcript JSONB,
  consultation_queries JSONB DEFAULT '[]'::jsonb,

  -- Note
  generated_note JSONB,
  doctor_edits JSONB,
  approved_note JSONB,
  note_format TEXT DEFAULT 'bd',
  approved_at TIMESTAMPTZ,

  -- Linked evidence map
  evidence_links JSONB DEFAULT '{}'::jsonb,

  -- Follow-up
  followup_scheduled_at TIMESTAMPTZ,
  followup_sent_at TIMESTAMPTZ,
  followup_response TEXT,
  followup_response_at TIMESTAMPTZ,

  -- Cost tracking (internal)
  api_costs JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PRESCRIPTIONS
-- ============================================================
CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  visit_id UUID REFERENCES visits(id),
  source TEXT NOT NULL CHECK (source IN ('photo_historical', 'photo_current', 'generated')),
  image_path TEXT,
  prescribing_doctor_name TEXT,
  prescription_date DATE,
  diagnosis TEXT,
  diagnosis_icd10 TEXT,
  medications JSONB DEFAULT '[]'::jsonb,
  investigations_ordered JSONB DEFAULT '[]'::jsonb,
  advice TEXT,
  raw_extraction TEXT,
  extraction_confidence REAL,
  verified_by_doctor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- LAB REPORTS
-- ============================================================
CREATE TABLE lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  visit_id UUID REFERENCES visits(id),
  source TEXT NOT NULL CHECK (source IN ('photo_historical', 'photo_current', 'digital')),
  image_path TEXT,
  lab_name TEXT,
  report_date DATE,
  test_category TEXT,
  results JSONB DEFAULT '[]'::jsonb,
  raw_extraction TEXT,
  extraction_confidence REAL,
  verified_by_doctor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONSENT RECORDS
-- ============================================================
CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  visit_id UUID REFERENCES visits(id),
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'recording',
    'data_storage',
    'ai_processing',
    'image_capture',
    'whatsapp_followup',
    'data_sharing'
  )),
  granted BOOLEAN NOT NULL,
  granted_by TEXT NOT NULL CHECK (granted_by IN ('patient', 'attendant', 'guardian')),
  granted_at TIMESTAMPTZ DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  device_info TEXT,
  ip_address INET
);

-- ============================================================
-- API USAGE LOG
-- ============================================================
CREATE TABLE api_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  edge_function TEXT NOT NULL,
  model_used TEXT NOT NULL,
  was_fallback BOOLEAN DEFAULT false,
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  estimated_cost_usd REAL,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
CREATE INDEX idx_visits_date ON visits(visit_date DESC);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_visits_clinic_date ON visits(clinic_id, visit_date DESC);
CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_lab_reports_patient ON lab_reports(patient_id);
CREATE INDEX idx_lab_reports_category ON lab_reports(patient_id, test_category);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_clinic ON patients(clinic_id);
CREATE INDEX idx_consent_patient ON consent_records(patient_id);
CREATE INDEX idx_api_usage_visit ON api_usage_log(visit_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_log ENABLE ROW LEVEL SECURITY;

-- Doctor sees only their clinic's data
CREATE POLICY "doctors_own_clinic" ON patients FOR ALL USING (
  clinic_id IN (SELECT clinic_id FROM doctors WHERE id = auth.uid())
);
CREATE POLICY "visits_own_clinic" ON visits FOR ALL USING (
  clinic_id IN (SELECT clinic_id FROM doctors WHERE id = auth.uid())
);
CREATE POLICY "prescriptions_own_clinic" ON prescriptions FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id IN (
    SELECT clinic_id FROM doctors WHERE id = auth.uid()
  ))
);
CREATE POLICY "lab_reports_own_clinic" ON lab_reports FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id IN (
    SELECT clinic_id FROM doctors WHERE id = auth.uid()
  ))
);
CREATE POLICY "consent_own_clinic" ON consent_records FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id IN (
    SELECT clinic_id FROM doctors WHERE id = auth.uid()
  ))
);
CREATE POLICY "api_log_own_visits" ON api_usage_log FOR ALL USING (
  visit_id IN (SELECT id FROM visits WHERE clinic_id IN (
    SELECT clinic_id FROM doctors WHERE id = auth.uid()
  ))
);

-- Clinic and doctor self-access
CREATE POLICY "own_clinic" ON clinics FOR ALL USING (
  id IN (SELECT clinic_id FROM doctors WHERE id = auth.uid())
);
CREATE POLICY "own_doctor" ON doctors FOR ALL USING (id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-increment visit_number per patient
CREATE OR REPLACE FUNCTION set_visit_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.visit_number := COALESCE(
    (SELECT MAX(visit_number) FROM visits WHERE patient_id = NEW.patient_id), 0
  ) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_visit_number
  BEFORE INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION set_visit_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER trg_visits_updated
  BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_timestamp();
