/**
 * @fileoverview Supabase database type definitions for the Glyph clinical AI platform.
 *
 * HAND-RECONCILED against `supabase/migrations/001_initial_schema.sql` on
 * 2026-06-10 (audit item F: the previous version of this file had drifted —
 * invented columns like `visits.queue_position`, `prescriptions.image_url`,
 * `lab_reports.report_type` that do not exist in the database).
 *
 * The migration SQL is the source of truth. Once a live DB exists (M4),
 * regenerate with:
 *   supabase gen types typescript --local > apps/glyph/src/lib/supabase/types.ts
 * and re-apply the convenience aliases at the bottom if the generator drops them.
 *
 * Nullability follows the SQL exactly: columns without NOT NULL are
 * `T | null` even when they have a DEFAULT.
 *
 * @module lib/supabase/types
 */

/** JSON value as stored in Postgres JSONB columns (matches supabase gen types) */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/** Visit lifecycle statuses (CHECK constraint on visits.status) */
export type VisitStatus =
  | 'intake'
  | 'intake_complete'
  | 'in_consultation'
  | 'note_review'
  | 'completed'
  | 'followup_sent';

/** Prescription provenance (CHECK constraint on prescriptions.source) */
export type PrescriptionSource = 'photo_historical' | 'photo_current' | 'generated';

/** Lab report provenance (CHECK constraint on lab_reports.source) */
export type LabReportSource = 'photo_historical' | 'photo_current' | 'digital';

/** Consent categories tracked for PDPO compliance (CHECK constraint) */
export type ConsentType =
  | 'recording'
  | 'data_storage'
  | 'ai_processing'
  | 'image_capture'
  | 'whatsapp_followup'
  | 'data_sharing';

/** Who provided consent on behalf of the patient (CHECK constraint) */
export type ConsentGrantedBy = 'patient' | 'attendant' | 'guardian';

/**
 * Full Supabase database schema definition.
 * Used with `createClient<Database>()` to enable end-to-end type safety.
 *
 * MUST be a `type` alias, not an `interface`: supabase-js constrains the
 * generic to `Record<string, GenericSchema>`, and interfaces have no
 * implicit index signature — an interface here silently degrades every
 * table to `never`, which is what previously forced `as never` casts all
 * over the service layer.
 */
export type Database = {
  public: {
    Tables: {
      /** Clinic/practice locations */
      clinics: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          district: string | null;
          phone: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          district?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          district?: string | null;
          phone?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };

      /**
       * Registered doctors. `id` IS the auth.users id (PK references
       * auth.users(id), no separate auth_user_id column) — it has no default,
       * so Insert requires it.
       */
      doctors: {
        Row: {
          id: string;
          clinic_id: string | null;
          name: string;
          name_bn: string | null;
          speciality: string | null;
          bmdc_reg_no: string | null;
          phone: string;
          email: string | null;
          preferred_language: string | null;
          preferred_note_format: string | null;
          settings: Json | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          clinic_id?: string | null;
          name: string;
          name_bn?: string | null;
          speciality?: string | null;
          bmdc_reg_no?: string | null;
          phone: string;
          email?: string | null;
          preferred_language?: string | null;
          preferred_note_format?: string | null;
          settings?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          clinic_id?: string | null;
          name?: string;
          name_bn?: string | null;
          speciality?: string | null;
          bmdc_reg_no?: string | null;
          phone?: string;
          email?: string | null;
          preferred_language?: string | null;
          preferred_note_format?: string | null;
          settings?: Json | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'doctors_clinic_id_fkey';
            columns: ['clinic_id'];
            isOneToOne: false;
            referencedRelation: 'clinics';
            referencedColumns: ['id'];
          },
        ];
      };

      /** Patient demographics and soft-denormalized clinical context */
      patients: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          name_bn: string | null;
          phone: string | null;
          age: number | null;
          date_of_birth: string | null;
          gender: string | null;
          blood_group: string | null;
          address: string | null;
          primary_language: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          known_allergies: Json | null;
          chronic_conditions: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          name_bn?: string | null;
          phone?: string | null;
          age?: number | null;
          date_of_birth?: string | null;
          gender?: string | null;
          blood_group?: string | null;
          address?: string | null;
          primary_language?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          known_allergies?: Json | null;
          chronic_conditions?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          name?: string;
          name_bn?: string | null;
          phone?: string | null;
          age?: number | null;
          date_of_birth?: string | null;
          gender?: string | null;
          blood_group?: string | null;
          address?: string | null;
          primary_language?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          known_allergies?: Json | null;
          chronic_conditions?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patients_clinic_id_fkey';
            columns: ['clinic_id'];
            isOneToOne: false;
            referencedRelation: 'clinics';
            referencedColumns: ['id'];
          },
        ];
      };

      /**
       * Clinical visit records — the central table tracking the full
       * encounter lifecycle. `visit_number` is set by the `set_visit_number()`
       * trigger (per-patient counter); `updated_at` by `update_timestamp()`.
       * There is NO queue_position column — queue order is arrival order
       * (`created_at`).
       */
      visits: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          visit_date: string | null;
          visit_number: number | null;
          status: VisitStatus | null;
          attendant_present: boolean | null;
          attendant_name: string | null;
          attendant_relation: string | null;
          attendant_language: string | null;
          attendant_reliability_notes: string | null;
          intake_transcript: Json | null;
          intake_summary: Json | null;
          intake_duration_seconds: number | null;
          intake_completed_at: string | null;
          briefing_card: Json | null;
          briefing_generated_at: string | null;
          consultation_started_at: string | null;
          consultation_ended_at: string | null;
          consultation_transcript: Json | null;
          consultation_queries: Json | null;
          generated_note: Json | null;
          doctor_edits: Json | null;
          approved_note: Json | null;
          note_format: string | null;
          approved_at: string | null;
          evidence_links: Json | null;
          followup_scheduled_at: string | null;
          followup_sent_at: string | null;
          followup_response: string | null;
          followup_response_at: string | null;
          api_costs: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          visit_date?: string | null;
          visit_number?: number | null;
          status?: VisitStatus | null;
          attendant_present?: boolean | null;
          attendant_name?: string | null;
          attendant_relation?: string | null;
          attendant_language?: string | null;
          attendant_reliability_notes?: string | null;
          intake_transcript?: Json | null;
          intake_summary?: Json | null;
          intake_duration_seconds?: number | null;
          intake_completed_at?: string | null;
          briefing_card?: Json | null;
          briefing_generated_at?: string | null;
          consultation_started_at?: string | null;
          consultation_ended_at?: string | null;
          consultation_transcript?: Json | null;
          consultation_queries?: Json | null;
          generated_note?: Json | null;
          doctor_edits?: Json | null;
          approved_note?: Json | null;
          note_format?: string | null;
          approved_at?: string | null;
          evidence_links?: Json | null;
          followup_scheduled_at?: string | null;
          followup_sent_at?: string | null;
          followup_response?: string | null;
          followup_response_at?: string | null;
          api_costs?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          clinic_id?: string;
          visit_date?: string | null;
          visit_number?: number | null;
          status?: VisitStatus | null;
          attendant_present?: boolean | null;
          attendant_name?: string | null;
          attendant_relation?: string | null;
          attendant_language?: string | null;
          attendant_reliability_notes?: string | null;
          intake_transcript?: Json | null;
          intake_summary?: Json | null;
          intake_duration_seconds?: number | null;
          intake_completed_at?: string | null;
          briefing_card?: Json | null;
          briefing_generated_at?: string | null;
          consultation_started_at?: string | null;
          consultation_ended_at?: string | null;
          consultation_transcript?: Json | null;
          consultation_queries?: Json | null;
          generated_note?: Json | null;
          doctor_edits?: Json | null;
          approved_note?: Json | null;
          note_format?: string | null;
          approved_at?: string | null;
          evidence_links?: Json | null;
          followup_scheduled_at?: string | null;
          followup_sent_at?: string | null;
          followup_response?: string | null;
          followup_response_at?: string | null;
          api_costs?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'visits_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_doctor_id_fkey';
            columns: ['doctor_id'];
            isOneToOne: false;
            referencedRelation: 'doctors';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'visits_clinic_id_fkey';
            columns: ['clinic_id'];
            isOneToOne: false;
            referencedRelation: 'clinics';
            referencedColumns: ['id'];
          },
        ];
      };

      /** Prescription records — captured from photos or AI-generated */
      prescriptions: {
        Row: {
          id: string;
          patient_id: string;
          visit_id: string | null;
          source: PrescriptionSource;
          image_path: string | null;
          prescribing_doctor_name: string | null;
          prescription_date: string | null;
          diagnosis: string | null;
          diagnosis_icd10: string | null;
          medications: Json | null;
          investigations_ordered: Json | null;
          advice: string | null;
          raw_extraction: string | null;
          extraction_confidence: number | null;
          verified_by_doctor: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          visit_id?: string | null;
          source: PrescriptionSource;
          image_path?: string | null;
          prescribing_doctor_name?: string | null;
          prescription_date?: string | null;
          diagnosis?: string | null;
          diagnosis_icd10?: string | null;
          medications?: Json | null;
          investigations_ordered?: Json | null;
          advice?: string | null;
          raw_extraction?: string | null;
          extraction_confidence?: number | null;
          verified_by_doctor?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          visit_id?: string | null;
          source?: PrescriptionSource;
          image_path?: string | null;
          prescribing_doctor_name?: string | null;
          prescription_date?: string | null;
          diagnosis?: string | null;
          diagnosis_icd10?: string | null;
          medications?: Json | null;
          investigations_ordered?: Json | null;
          advice?: string | null;
          raw_extraction?: string | null;
          extraction_confidence?: number | null;
          verified_by_doctor?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prescriptions_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescriptions_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };

      /** Lab/diagnostic report records */
      lab_reports: {
        Row: {
          id: string;
          patient_id: string;
          visit_id: string | null;
          source: LabReportSource;
          image_path: string | null;
          lab_name: string | null;
          report_date: string | null;
          test_category: string | null;
          results: Json | null;
          raw_extraction: string | null;
          extraction_confidence: number | null;
          verified_by_doctor: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          visit_id?: string | null;
          source: LabReportSource;
          image_path?: string | null;
          lab_name?: string | null;
          report_date?: string | null;
          test_category?: string | null;
          results?: Json | null;
          raw_extraction?: string | null;
          extraction_confidence?: number | null;
          verified_by_doctor?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          visit_id?: string | null;
          source?: LabReportSource;
          image_path?: string | null;
          lab_name?: string | null;
          report_date?: string | null;
          test_category?: string | null;
          results?: Json | null;
          raw_extraction?: string | null;
          extraction_confidence?: number | null;
          verified_by_doctor?: boolean | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'lab_reports_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'lab_reports_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };

      /**
       * Patient consent records for PDPO compliance.
       * Note: withdrawal is `withdrawn_at` (not "revoked_at") and there is
       * no created_at column — `granted_at` is the record timestamp.
       */
      consent_records: {
        Row: {
          id: string;
          patient_id: string;
          visit_id: string | null;
          consent_type: ConsentType;
          granted: boolean;
          granted_by: ConsentGrantedBy;
          granted_at: string | null;
          withdrawn_at: string | null;
          device_info: string | null;
          ip_address: string | null;
        };
        Insert: {
          id?: string;
          patient_id: string;
          visit_id?: string | null;
          consent_type: ConsentType;
          granted: boolean;
          granted_by: ConsentGrantedBy;
          granted_at?: string | null;
          withdrawn_at?: string | null;
          device_info?: string | null;
          ip_address?: string | null;
        };
        Update: {
          id?: string;
          patient_id?: string;
          visit_id?: string | null;
          consent_type?: ConsentType;
          granted?: boolean;
          granted_by?: ConsentGrantedBy;
          granted_at?: string | null;
          withdrawn_at?: string | null;
          device_info?: string | null;
          ip_address?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'consent_records_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'consent_records_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };

      /** AI API usage + cost log, populated by edge functions' cost-logger */
      api_usage_log: {
        Row: {
          id: string;
          visit_id: string | null;
          edge_function: string;
          model_used: string;
          was_fallback: boolean | null;
          input_tokens: number | null;
          output_tokens: number | null;
          latency_ms: number | null;
          estimated_cost_usd: number | null;
          error: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          visit_id?: string | null;
          edge_function: string;
          model_used: string;
          was_fallback?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          estimated_cost_usd?: number | null;
          error?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          visit_id?: string | null;
          edge_function?: string;
          model_used?: string;
          was_fallback?: boolean | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          latency_ms?: number | null;
          estimated_cost_usd?: number | null;
          error?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'api_usage_log_visit_id_fkey';
            columns: ['visit_id'];
            isOneToOne: false;
            referencedRelation: 'visits';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience aliases for Row types */
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type Prescription = Database['public']['Tables']['prescriptions']['Row'];
export type LabReport = Database['public']['Tables']['lab_reports']['Row'];
export type ConsentRecord = Database['public']['Tables']['consent_records']['Row'];
export type ApiUsageLog = Database['public']['Tables']['api_usage_log']['Row'];

/** Convenience aliases for Insert/Update types */
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];
export type VisitInsert = Database['public']['Tables']['visits']['Insert'];
export type VisitUpdate = Database['public']['Tables']['visits']['Update'];
export type PrescriptionInsert = Database['public']['Tables']['prescriptions']['Insert'];
export type LabReportInsert = Database['public']['Tables']['lab_reports']['Insert'];
export type ConsentRecordInsert = Database['public']['Tables']['consent_records']['Insert'];
export type ApiUsageLogInsert = Database['public']['Tables']['api_usage_log']['Insert'];
