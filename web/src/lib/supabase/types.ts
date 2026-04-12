/**
 * @fileoverview Supabase database type definitions for the Glyph clinical AI platform.
 * These types mirror the PostgreSQL schema and are used throughout the application
 * for type-safe database operations.
 *
 * @module lib/supabase/types
 */

/** Visit lifecycle statuses */
export type VisitStatus =
  | 'intake'
  | 'intake_complete'
  | 'in_consultation'
  | 'note_review'
  | 'completed'
  | 'followup_sent';

/** Prescription provenance */
export type PrescriptionSource = 'photo_historical' | 'photo_current' | 'generated';

/** Lab report provenance */
export type LabReportSource = 'photo_historical' | 'photo_current' | 'digital';

/** Consent categories tracked for regulatory compliance */
export type ConsentType =
  | 'recording'
  | 'data_storage'
  | 'ai_processing'
  | 'image_capture'
  | 'whatsapp_followup'
  | 'data_sharing';

/** Who provided consent on behalf of the patient */
export type ConsentGrantedBy = 'patient' | 'attendant' | 'guardian';

/**
 * Full Supabase database schema definition.
 * Used with `createClient<Database>()` to enable end-to-end type safety.
 */
export interface Database {
  public: {
    Tables: {
      /** Clinic/practice locations */
      clinics: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      /** Registered doctors/clinicians */
      doctors: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          phone: string;
          specialization: string | null;
          bmdc_reg_no: string | null;
          auth_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          phone: string;
          specialization?: string | null;
          bmdc_reg_no?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          name?: string;
          phone?: string;
          specialization?: string | null;
          bmdc_reg_no?: string | null;
          auth_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Patient demographics and contact info */
      patients: {
        Row: {
          id: string;
          clinic_id: string;
          name: string;
          phone: string;
          age: number | null;
          gender: string | null;
          address: string | null;
          blood_group: string | null;
          emergency_contact: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clinic_id: string;
          name: string;
          phone: string;
          age?: number | null;
          gender?: string | null;
          address?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clinic_id?: string;
          name?: string;
          phone?: string;
          age?: number | null;
          gender?: string | null;
          address?: string | null;
          blood_group?: string | null;
          emergency_contact?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Clinical visit records tracking the full encounter lifecycle */
      visits: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          status: VisitStatus;
          chief_complaint: string | null;
          intake_summary: Record<string, unknown> | null;
          briefing_card: Record<string, unknown> | null;
          consultation_transcript: string | null;
          clinical_note: Record<string, unknown> | null;
          is_attendant: boolean;
          attendant_relation: string | null;
          queue_position: number | null;
          scheduled_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          doctor_id: string;
          clinic_id: string;
          status?: VisitStatus;
          chief_complaint?: string | null;
          intake_summary?: Record<string, unknown> | null;
          briefing_card?: Record<string, unknown> | null;
          consultation_transcript?: string | null;
          clinical_note?: Record<string, unknown> | null;
          is_attendant?: boolean;
          attendant_relation?: string | null;
          queue_position?: number | null;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          patient_id?: string;
          doctor_id?: string;
          clinic_id?: string;
          status?: VisitStatus;
          chief_complaint?: string | null;
          intake_summary?: Record<string, unknown> | null;
          briefing_card?: Record<string, unknown> | null;
          consultation_transcript?: string | null;
          clinical_note?: Record<string, unknown> | null;
          is_attendant?: boolean;
          attendant_relation?: string | null;
          queue_position?: number | null;
          scheduled_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "visits_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_doctor_id_fkey";
            columns: ["doctor_id"];
            isOneToOne: false;
            referencedRelation: "doctors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "visits_clinic_id_fkey";
            columns: ["clinic_id"];
            isOneToOne: false;
            referencedRelation: "clinics";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Prescription records — captured from photos or AI-generated */
      prescriptions: {
        Row: {
          id: string;
          visit_id: string;
          patient_id: string;
          source: PrescriptionSource;
          image_url: string | null;
          extracted_data: Record<string, unknown> | null;
          medications: Record<string, unknown>[] | null;
          prescriber_name: string | null;
          prescribed_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          patient_id: string;
          source: PrescriptionSource;
          image_url?: string | null;
          extracted_data?: Record<string, unknown> | null;
          medications?: Record<string, unknown>[] | null;
          prescriber_name?: string | null;
          prescribed_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          patient_id?: string;
          source?: PrescriptionSource;
          image_url?: string | null;
          extracted_data?: Record<string, unknown> | null;
          medications?: Record<string, unknown>[] | null;
          prescriber_name?: string | null;
          prescribed_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prescriptions_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Lab/diagnostic report records */
      lab_reports: {
        Row: {
          id: string;
          visit_id: string;
          patient_id: string;
          source: LabReportSource;
          image_url: string | null;
          extracted_data: Record<string, unknown> | null;
          report_type: string | null;
          report_date: string | null;
          lab_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          patient_id: string;
          source: LabReportSource;
          image_url?: string | null;
          extracted_data?: Record<string, unknown> | null;
          report_type?: string | null;
          report_date?: string | null;
          lab_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          patient_id?: string;
          source?: LabReportSource;
          image_url?: string | null;
          extracted_data?: Record<string, unknown> | null;
          report_type?: string | null;
          report_date?: string | null;
          lab_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lab_reports_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lab_reports_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Patient consent records for PDPO regulatory compliance */
      consent_records: {
        Row: {
          id: string;
          visit_id: string;
          patient_id: string;
          consent_type: ConsentType;
          granted: boolean;
          granted_by: ConsentGrantedBy;
          granted_at: string;
          revoked_at: string | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          patient_id: string;
          consent_type: ConsentType;
          granted: boolean;
          granted_by: ConsentGrantedBy;
          granted_at?: string;
          revoked_at?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          patient_id?: string;
          consent_type?: ConsentType;
          granted?: boolean;
          granted_by?: ConsentGrantedBy;
          granted_at?: string;
          revoked_at?: string | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "consent_records_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "consent_records_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };

      /** Tracks AI API usage and costs per visit for billing and monitoring */
      api_usage_log: {
        Row: {
          id: string;
          visit_id: string;
          function_name: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          latency_ms: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          visit_id: string;
          function_name: string;
          model: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          latency_ms: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          visit_id?: string;
          function_name?: string;
          model?: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          latency_ms?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_usage_log_visit_id_fkey";
            columns: ["visit_id"];
            isOneToOne: false;
            referencedRelation: "visits";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      visit_status: VisitStatus;
      prescription_source: PrescriptionSource;
      lab_report_source: LabReportSource;
      consent_type: ConsentType;
      consent_granted_by: ConsentGrantedBy;
    };
    CompositeTypes: Record<string, never>;
  };
}

/** Convenience aliases for Row types */
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type Prescription = Database['public']['Tables']['prescriptions']['Row'];
export type LabReport = Database['public']['Tables']['lab_reports']['Row'];
export type ConsentRecord = Database['public']['Tables']['consent_records']['Row'];
export type ApiUsageLog = Database['public']['Tables']['api_usage_log']['Row'];

/** Convenience aliases for Insert types */
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];
export type VisitInsert = Database['public']['Tables']['visits']['Insert'];
export type VisitUpdate = Database['public']['Tables']['visits']['Update'];
export type PrescriptionInsert = Database['public']['Tables']['prescriptions']['Insert'];
export type LabReportInsert = Database['public']['Tables']['lab_reports']['Insert'];
export type ConsentRecordInsert = Database['public']['Tables']['consent_records']['Insert'];
export type ApiUsageLogInsert = Database['public']['Tables']['api_usage_log']['Insert'];
