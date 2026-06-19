export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      antenatal_visits: {
        Row: {
          blood_pressure: string | null
          created_at: string | null
          created_by: string | null
          credential_id: string | null
          edd: string | null
          fetal_heart_rate_bpm: number | null
          fundal_height_cm: number | null
          gestational_age_weeks: number | null
          id: string
          lmp: string | null
          next_visit_date: string | null
          owner_org_id: string
          patient_id: string
          risk_flags: Json | null
          signatory_user_id: string | null
          signed_at: string | null
          status: string
          visit_number: number | null
          weight_kg: number | null
        }
        Insert: {
          blood_pressure?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          edd?: string | null
          fetal_heart_rate_bpm?: number | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          id?: string
          lmp?: string | null
          next_visit_date?: string | null
          owner_org_id: string
          patient_id: string
          risk_flags?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          visit_number?: number | null
          weight_kg?: number | null
        }
        Update: {
          blood_pressure?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          edd?: string | null
          fetal_heart_rate_bpm?: number | null
          fundal_height_cm?: number | null
          gestational_age_weeks?: number | null
          id?: string
          lmp?: string | null
          next_visit_date?: string | null
          owner_org_id?: string
          patient_id?: string
          risk_flags?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          visit_number?: number | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "antenatal_visits_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antenatal_visits_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "antenatal_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage_log: {
        Row: {
          created_at: string | null
          edge_function: string
          error: string | null
          estimated_cost_usd: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model_used: string
          output_tokens: number | null
          visit_id: string | null
          was_fallback: boolean | null
        }
        Insert: {
          created_at?: string | null
          edge_function: string
          error?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_used: string
          output_tokens?: number | null
          visit_id?: string | null
          was_fallback?: boolean | null
        }
        Update: {
          created_at?: string | null
          edge_function?: string
          error?: string | null
          estimated_cost_usd?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model_used?: string
          output_tokens?: number | null
          visit_id?: string | null
          was_fallback?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      clearance_records: {
        Row: {
          created_at: string | null
          created_by: string | null
          credential_id: string | null
          destination_country: string | null
          findings: Json | null
          fitness_status: string | null
          id: string
          owner_org_id: string
          patient_id: string
          purpose: string | null
          restrictions: Json | null
          signatory_user_id: string | null
          signed_at: string | null
          status: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          destination_country?: string | null
          findings?: Json | null
          fitness_status?: string | null
          id?: string
          owner_org_id: string
          patient_id: string
          purpose?: string | null
          restrictions?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          destination_country?: string | null
          findings?: Json | null
          fitness_status?: string | null
          id?: string
          owner_org_id?: string
          patient_id?: string
          purpose?: string | null
          restrictions?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clearance_records_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_records_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clearance_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string | null
          did: string | null
          district: string | null
          encrypted_private_key: string | null
          id: string
          key_nonce: string | null
          name: string
          organization_id: string | null
          phone: string | null
          public_key_jwk: Json | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          did?: string | null
          district?: string | null
          encrypted_private_key?: string | null
          id?: string
          key_nonce?: string | null
          name: string
          organization_id?: string | null
          phone?: string | null
          public_key_jwk?: Json | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          did?: string | null
          district?: string | null
          encrypted_private_key?: string | null
          id?: string
          key_nonce?: string | null
          name?: string
          organization_id?: string | null
          phone?: string | null
          public_key_jwk?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "clinics_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_type: string
          device_info: string | null
          granted: boolean
          granted_at: string | null
          granted_by: string
          id: string
          ip_address: unknown
          patient_id: string
          visit_id: string | null
          withdrawn_at: string | null
        }
        Insert: {
          consent_type: string
          device_info?: string | null
          granted: boolean
          granted_at?: string | null
          granted_by: string
          id?: string
          ip_address?: unknown
          patient_id: string
          visit_id?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          consent_type?: string
          device_info?: string | null
          granted?: boolean
          granted_at?: string | null
          granted_by?: string
          id?: string
          ip_address?: unknown
          patient_id?: string
          visit_id?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consent_records_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      credential_status_log: {
        Row: {
          actor_did: string | null
          created_at: string | null
          credential_id: string
          id: string
          new_status: string
          previous_status: string
          reason: string | null
        }
        Insert: {
          actor_did?: string | null
          created_at?: string | null
          credential_id: string
          id?: string
          new_status: string
          previous_status: string
          reason?: string | null
        }
        Update: {
          actor_did?: string | null
          created_at?: string | null
          credential_id?: string
          id?: string
          new_status?: string
          previous_status?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credential_status_log_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      credentials: {
        Row: {
          created_at: string | null
          credential_json: Json
          expires_at: string | null
          id: string
          issued_at: string
          issuer_did: string
          proof_value: string
          replaces_credential_id: string | null
          revoked_at: string | null
          status: string
          subject_did: string
          types: string[]
          vc_id: string
        }
        Insert: {
          created_at?: string | null
          credential_json: Json
          expires_at?: string | null
          id?: string
          issued_at: string
          issuer_did: string
          proof_value: string
          replaces_credential_id?: string | null
          revoked_at?: string | null
          status?: string
          subject_did: string
          types: string[]
          vc_id: string
        }
        Update: {
          created_at?: string | null
          credential_json?: Json
          expires_at?: string | null
          id?: string
          issued_at?: string
          issuer_did?: string
          proof_value?: string
          replaces_credential_id?: string | null
          revoked_at?: string | null
          status?: string
          subject_did?: string
          types?: string[]
          vc_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credentials_replaces_credential_id_fkey"
            columns: ["replaces_credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
        ]
      }
      did_documents: {
        Row: {
          created_at: string | null
          did: string
          document: Json
          id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          did: string
          document: Json
          id?: string
          version?: number
        }
        Update: {
          created_at?: string | null
          did?: string
          document?: Json
          id?: string
          version?: number
        }
        Relationships: []
      }
      discharge_records: {
        Row: {
          admission_date: string | null
          created_at: string | null
          created_by: string | null
          credential_id: string | null
          discharge_condition: string | null
          discharge_date: string | null
          discharge_diagnosis: Json | null
          discharge_medications: Json | null
          follow_up_instructions: Json | null
          hospital_course: string | null
          id: string
          owner_org_id: string
          patient_id: string
          procedures: Json | null
          signatory_user_id: string | null
          signed_at: string | null
          status: string
        }
        Insert: {
          admission_date?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          discharge_condition?: string | null
          discharge_date?: string | null
          discharge_diagnosis?: Json | null
          discharge_medications?: Json | null
          follow_up_instructions?: Json | null
          hospital_course?: string | null
          id?: string
          owner_org_id: string
          patient_id: string
          procedures?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
        }
        Update: {
          admission_date?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          discharge_condition?: string | null
          discharge_date?: string | null
          discharge_diagnosis?: Json | null
          discharge_medications?: Json | null
          follow_up_instructions?: Json | null
          hospital_course?: string | null
          id?: string
          owner_org_id?: string
          patient_id?: string
          procedures?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "discharge_records_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_records_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discharge_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          bmdc_reg_no: string | null
          clinic_id: string | null
          created_at: string | null
          did: string | null
          email: string | null
          encrypted_private_key: string | null
          id: string
          key_nonce: string | null
          name: string
          name_bn: string | null
          phone: string
          preferred_language: string | null
          preferred_note_format: string | null
          public_key_jwk: Json | null
          settings: Json | null
          speciality: string | null
        }
        Insert: {
          bmdc_reg_no?: string | null
          clinic_id?: string | null
          created_at?: string | null
          did?: string | null
          email?: string | null
          encrypted_private_key?: string | null
          id: string
          key_nonce?: string | null
          name: string
          name_bn?: string | null
          phone: string
          preferred_language?: string | null
          preferred_note_format?: string | null
          public_key_jwk?: Json | null
          settings?: Json | null
          speciality?: string | null
        }
        Update: {
          bmdc_reg_no?: string | null
          clinic_id?: string | null
          created_at?: string | null
          did?: string | null
          email?: string | null
          encrypted_private_key?: string | null
          id?: string
          key_nonce?: string | null
          name?: string
          name_bn?: string | null
          phone?: string
          preferred_language?: string | null
          preferred_note_format?: string | null
          public_key_jwk?: Json | null
          settings?: Json | null
          speciality?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      egress_log: {
        Row: {
          allowed: boolean
          called_at: string
          consent_id: string | null
          contains_unredactable: boolean
          deidentified: boolean
          edge_function: string
          id: string
          identifiers_scrubbed: number | null
          processor: string
          reject_reason: string | null
          tier: string
          visit_id: string | null
        }
        Insert: {
          allowed: boolean
          called_at?: string
          consent_id?: string | null
          contains_unredactable?: boolean
          deidentified?: boolean
          edge_function: string
          id?: string
          identifiers_scrubbed?: number | null
          processor: string
          reject_reason?: string | null
          tier: string
          visit_id?: string | null
        }
        Update: {
          allowed?: boolean
          called_at?: string
          consent_id?: string | null
          contains_unredactable?: boolean
          deidentified?: boolean
          edge_function?: string
          id?: string
          identifiers_scrubbed?: number | null
          processor?: string
          reject_reason?: string | null
          tier?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egress_log_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "consent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egress_log_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          created_at: string | null
          credential_id: string | null
          id: string
          lab_report_id: string | null
          normalized_at: string | null
          normalized_results: Json | null
          ordered_at: string | null
          ordered_by: string | null
          owner_org_id: string
          patient_id: string
          raw_results: Json | null
          result_image_path: string | null
          resulted_at: string | null
          resulted_by: string | null
          sanity_flags: Json | null
          signatory_user_id: string | null
          signed_at: string | null
          status: string
          test_category: string
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          id?: string
          lab_report_id?: string | null
          normalized_at?: string | null
          normalized_results?: Json | null
          ordered_at?: string | null
          ordered_by?: string | null
          owner_org_id: string
          patient_id: string
          raw_results?: Json | null
          result_image_path?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          sanity_flags?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          test_category: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          id?: string
          lab_report_id?: string | null
          normalized_at?: string | null
          normalized_results?: Json | null
          ordered_at?: string | null
          ordered_by?: string | null
          owner_org_id?: string
          patient_id?: string
          raw_results?: Json | null
          result_image_path?: string | null
          resulted_at?: string | null
          resulted_by?: string | null
          sanity_flags?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
          test_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_lab_report_id_fkey"
            columns: ["lab_report_id"]
            isOneToOne: false
            referencedRelation: "lab_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reports: {
        Row: {
          created_at: string | null
          credential_id: string | null
          extraction_confidence: number | null
          id: string
          image_path: string | null
          lab_name: string | null
          patient_id: string
          raw_extraction: string | null
          report_date: string | null
          results: Json | null
          source: string
          test_category: string | null
          verified_by_doctor: boolean | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          extraction_confidence?: number | null
          id?: string
          image_path?: string | null
          lab_name?: string | null
          patient_id: string
          raw_extraction?: string | null
          report_date?: string | null
          results?: Json | null
          source: string
          test_category?: string | null
          verified_by_doctor?: boolean | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          extraction_confidence?: number | null
          id?: string
          image_path?: string | null
          lab_name?: string | null
          patient_id?: string
          raw_extraction?: string | null
          report_date?: string | null
          results?: Json | null
          source?: string
          test_category?: string | null
          verified_by_doctor?: boolean | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string | null
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          organization_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      occupational_assessments: {
        Row: {
          assessment_type: string | null
          created_at: string | null
          created_by: string | null
          credential_id: string | null
          exposures: Json | null
          findings: Json | null
          fitness_for_role: string | null
          id: string
          owner_org_id: string
          patient_id: string
          recommendations: Json | null
          restrictions: Json | null
          signatory_user_id: string | null
          signed_at: string | null
          status: string
        }
        Insert: {
          assessment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          exposures?: Json | null
          findings?: Json | null
          fitness_for_role?: string | null
          id?: string
          owner_org_id: string
          patient_id: string
          recommendations?: Json | null
          restrictions?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
        }
        Update: {
          assessment_type?: string | null
          created_at?: string | null
          created_by?: string | null
          credential_id?: string | null
          exposures?: Json | null
          findings?: Json | null
          fitness_for_role?: string | null
          id?: string
          owner_org_id?: string
          patient_id?: string
          recommendations?: Json | null
          restrictions?: Json | null
          signatory_user_id?: string | null
          signed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupational_assessments_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupational_assessments_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occupational_assessments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          did: string | null
          district: string | null
          encrypted_private_key: string | null
          id: string
          key_nonce: string | null
          name: string
          org_type: string
          phone: string | null
          public_key_jwk: Json | null
        }
        Insert: {
          created_at?: string | null
          did?: string | null
          district?: string | null
          encrypted_private_key?: string | null
          id?: string
          key_nonce?: string | null
          name: string
          org_type: string
          phone?: string | null
          public_key_jwk?: Json | null
        }
        Update: {
          created_at?: string | null
          did?: string | null
          district?: string | null
          encrypted_private_key?: string | null
          id?: string
          key_nonce?: string | null
          name?: string
          org_type?: string
          phone?: string | null
          public_key_jwk?: Json | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          address: string | null
          age: number | null
          blood_group: string | null
          chronic_conditions: Json | null
          clinic_id: string | null
          created_at: string | null
          date_of_birth: string | null
          did: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          encrypted_private_key: string | null
          gender: string | null
          id: string
          key_nonce: string | null
          known_allergies: Json | null
          name: string
          name_bn: string | null
          owner_org_id: string | null
          phone: string | null
          primary_language: string | null
          public_key_jwk: Json | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          age?: number | null
          blood_group?: string | null
          chronic_conditions?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          did?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          encrypted_private_key?: string | null
          gender?: string | null
          id?: string
          key_nonce?: string | null
          known_allergies?: Json | null
          name: string
          name_bn?: string | null
          owner_org_id?: string | null
          phone?: string | null
          primary_language?: string | null
          public_key_jwk?: Json | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          age?: number | null
          blood_group?: string | null
          chronic_conditions?: Json | null
          clinic_id?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          did?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          encrypted_private_key?: string | null
          gender?: string | null
          id?: string
          key_nonce?: string | null
          known_allergies?: Json | null
          name?: string
          name_bn?: string | null
          owner_org_id?: string | null
          phone?: string | null
          primary_language?: string | null
          public_key_jwk?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patients_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          advice: string | null
          created_at: string | null
          credential_id: string | null
          diagnosis: string | null
          diagnosis_icd10: string | null
          extraction_confidence: number | null
          id: string
          image_path: string | null
          investigations_ordered: Json | null
          medications: Json | null
          patient_id: string
          prescribing_doctor_name: string | null
          prescription_date: string | null
          raw_extraction: string | null
          source: string
          verified_by_doctor: boolean | null
          visit_id: string | null
        }
        Insert: {
          advice?: string | null
          created_at?: string | null
          credential_id?: string | null
          diagnosis?: string | null
          diagnosis_icd10?: string | null
          extraction_confidence?: number | null
          id?: string
          image_path?: string | null
          investigations_ordered?: Json | null
          medications?: Json | null
          patient_id: string
          prescribing_doctor_name?: string | null
          prescription_date?: string | null
          raw_extraction?: string | null
          source: string
          verified_by_doctor?: boolean | null
          visit_id?: string | null
        }
        Update: {
          advice?: string | null
          created_at?: string | null
          credential_id?: string | null
          diagnosis?: string | null
          diagnosis_icd10?: string | null
          extraction_confidence?: number | null
          id?: string
          image_path?: string | null
          investigations_ordered?: Json | null
          medications?: Json | null
          patient_id?: string
          prescribing_doctor_name?: string | null
          prescription_date?: string | null
          raw_extraction?: string | null
          source?: string
          verified_by_doctor?: boolean | null
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          attempts: number
          created_at: string
          doctor_id: string | null
          fire_at: string
          id: string
          kind: string
          patient_id: string | null
          result: Json | null
          state: string
          template_lang: string
          template_name: string
          template_vars: Json
          to_wa_id: string
          visit_id: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          doctor_id?: string | null
          fire_at: string
          id?: string
          kind: string
          patient_id?: string | null
          result?: Json | null
          state?: string
          template_lang?: string
          template_name: string
          template_vars?: Json
          to_wa_id: string
          visit_id?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          doctor_id?: string | null
          fire_at?: string
          id?: string
          kind?: string
          patient_id?: string | null
          result?: Json | null
          state?: string
          template_lang?: string
          template_name?: string
          template_vars?: Json
          to_wa_id?: string
          visit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_visit_id_fkey"
            columns: ["visit_id"]
            isOneToOne: false
            referencedRelation: "visits"
            referencedColumns: ["id"]
          },
        ]
      }
      triage_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          outcome: Json | null
          patient_id: string
          red_flag_screened: boolean
          wallet_token_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          outcome?: Json | null
          patient_id: string
          red_flag_screened?: boolean
          wallet_token_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          outcome?: Json | null
          patient_id?: string
          red_flag_screened?: boolean
          wallet_token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "triage_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "triage_sessions_wallet_token_id_fkey"
            columns: ["wallet_token_id"]
            isOneToOne: false
            referencedRelation: "wallet_access_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          api_costs: Json | null
          approved_at: string | null
          approved_note: Json | null
          attendant_language: string | null
          attendant_name: string | null
          attendant_present: boolean | null
          attendant_relation: string | null
          attendant_reliability_notes: string | null
          briefing_card: Json | null
          briefing_generated_at: string | null
          clinic_id: string
          consultation_ended_at: string | null
          consultation_queries: Json | null
          consultation_started_at: string | null
          consultation_transcript: Json | null
          created_at: string | null
          doctor_edits: Json | null
          doctor_id: string
          evidence_links: Json | null
          followup_response: string | null
          followup_response_at: string | null
          followup_scheduled_at: string | null
          followup_sent_at: string | null
          generated_note: Json | null
          id: string
          intake_completed_at: string | null
          intake_duration_seconds: number | null
          intake_summary: Json | null
          intake_transcript: Json | null
          next_appointment_at: string | null
          note_credential_id: string | null
          note_format: string | null
          patient_id: string
          prescription_safety_check: Json | null
          status: string | null
          updated_at: string | null
          visit_date: string | null
          visit_number: number | null
        }
        Insert: {
          api_costs?: Json | null
          approved_at?: string | null
          approved_note?: Json | null
          attendant_language?: string | null
          attendant_name?: string | null
          attendant_present?: boolean | null
          attendant_relation?: string | null
          attendant_reliability_notes?: string | null
          briefing_card?: Json | null
          briefing_generated_at?: string | null
          clinic_id: string
          consultation_ended_at?: string | null
          consultation_queries?: Json | null
          consultation_started_at?: string | null
          consultation_transcript?: Json | null
          created_at?: string | null
          doctor_edits?: Json | null
          doctor_id: string
          evidence_links?: Json | null
          followup_response?: string | null
          followup_response_at?: string | null
          followup_scheduled_at?: string | null
          followup_sent_at?: string | null
          generated_note?: Json | null
          id?: string
          intake_completed_at?: string | null
          intake_duration_seconds?: number | null
          intake_summary?: Json | null
          intake_transcript?: Json | null
          next_appointment_at?: string | null
          note_credential_id?: string | null
          note_format?: string | null
          patient_id: string
          prescription_safety_check?: Json | null
          status?: string | null
          updated_at?: string | null
          visit_date?: string | null
          visit_number?: number | null
        }
        Update: {
          api_costs?: Json | null
          approved_at?: string | null
          approved_note?: Json | null
          attendant_language?: string | null
          attendant_name?: string | null
          attendant_present?: boolean | null
          attendant_relation?: string | null
          attendant_reliability_notes?: string | null
          briefing_card?: Json | null
          briefing_generated_at?: string | null
          clinic_id?: string
          consultation_ended_at?: string | null
          consultation_queries?: Json | null
          consultation_started_at?: string | null
          consultation_transcript?: Json | null
          created_at?: string | null
          doctor_edits?: Json | null
          doctor_id?: string
          evidence_links?: Json | null
          followup_response?: string | null
          followup_response_at?: string | null
          followup_scheduled_at?: string | null
          followup_sent_at?: string | null
          generated_note?: Json | null
          id?: string
          intake_completed_at?: string | null
          intake_duration_seconds?: number | null
          intake_summary?: Json | null
          intake_transcript?: Json | null
          next_appointment_at?: string | null
          note_credential_id?: string | null
          note_format?: string | null
          patient_id?: string
          prescription_safety_check?: Json | null
          status?: string | null
          updated_at?: string | null
          visit_date?: string | null
          visit_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_note_credential_id_fkey"
            columns: ["note_credential_id"]
            isOneToOne: false
            referencedRelation: "credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_conversations: {
        Row: {
          active_flow: string
          flow_state: Json
          id: string
          patient_id: string | null
          updated_at: string
          wa_id: string
          window_expires_at: string | null
        }
        Insert: {
          active_flow?: string
          flow_state?: Json
          id?: string
          patient_id?: string | null
          updated_at?: string
          wa_id: string
          window_expires_at?: string | null
        }
        Update: {
          active_flow?: string
          flow_state?: Json
          id?: string
          patient_id?: string | null
          updated_at?: string
          wa_id?: string
          window_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          created_at: string
          direction: string
          error: string | null
          id: string
          kind: string
          patient_id: string | null
          payload: Json | null
          provider_message_id: string | null
          status: string
          wa_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          kind: string
          patient_id?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          status: string
          wa_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          kind?: string
          patient_id?: string | null
          payload?: Json | null
          provider_message_id?: string | null
          status?: string
          wa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          bmdc_reg_no: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          phone: string
          role: string
          source: string
          status: string
        }
        Insert: {
          bmdc_reg_no?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name: string
          phone: string
          role?: string
          source?: string
          status?: string
        }
        Update: {
          bmdc_reg_no?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          phone?: string
          role?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      wallet_access_tokens: {
        Row: {
          created_at: string
          created_by_doctor_id: string | null
          id: string
          last_accessed_at: string | null
          patient_id: string
          pin_hash: string | null
          revoked: boolean
          token: string
        }
        Insert: {
          created_at?: string
          created_by_doctor_id?: string | null
          id?: string
          last_accessed_at?: string | null
          patient_id: string
          pin_hash?: string | null
          revoked?: boolean
          token: string
        }
        Update: {
          created_at?: string
          created_by_doctor_id?: string | null
          id?: string
          last_accessed_at?: string | null
          patient_id?: string
          pin_hash?: string | null
          revoked?: boolean
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_access_tokens_created_by_doctor_id_fkey"
            columns: ["created_by_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_access_tokens_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_links: {
        Row: {
          bind_code: string | null
          bind_code_expires_at: string | null
          created_at: string
          created_by_doctor_id: string | null
          id: string
          patient_id: string
          revoked: boolean
          verified_at: string | null
          wa_id: string | null
        }
        Insert: {
          bind_code?: string | null
          bind_code_expires_at?: string | null
          created_at?: string
          created_by_doctor_id?: string | null
          id?: string
          patient_id: string
          revoked?: boolean
          verified_at?: string | null
          wa_id?: string | null
        }
        Update: {
          bind_code?: string | null
          bind_code_expires_at?: string | null
          created_at?: string
          created_by_doctor_id?: string | null
          id?: string
          patient_id?: string
          revoked?: boolean
          verified_at?: string | null
          wa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_links_created_by_doctor_id_fkey"
            columns: ["created_by_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_links_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const


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

/** Waitlist lifecycle (CHECK constraint on waitlist_signups.status) */
export type WaitlistStatus = 'pending' | 'invited' | 'onboarded' | 'declined';

/** Credential lifecycle (CHECK constraint on credentials.status) */
export type CredentialStatus = 'active' | 'revoked' | 'superseded';

/** Convenience aliases for Row types */
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type Doctor = Database['public']['Tables']['doctors']['Row'];
export type Patient = Database['public']['Tables']['patients']['Row'];
export type Visit = Database['public']['Tables']['visits']['Row'];
export type Prescription = Database['public']['Tables']['prescriptions']['Row'];
export type LabReport = Database['public']['Tables']['lab_reports']['Row'];
export type ConsentRecord = Database['public']['Tables']['consent_records']['Row'];
export type ApiUsageLog = Database['public']['Tables']['api_usage_log']['Row'];
export type CredentialRow = Database['public']['Tables']['credentials']['Row'];
export type DidDocumentRow = Database['public']['Tables']['did_documents']['Row'];
export type CredentialStatusLogRow = Database['public']['Tables']['credential_status_log']['Row'];

/** Convenience aliases for Insert/Update types */
export type PatientInsert = Database['public']['Tables']['patients']['Insert'];
export type PatientUpdate = Database['public']['Tables']['patients']['Update'];
export type VisitInsert = Database['public']['Tables']['visits']['Insert'];
export type VisitUpdate = Database['public']['Tables']['visits']['Update'];
export type PrescriptionInsert = Database['public']['Tables']['prescriptions']['Insert'];
export type LabReportInsert = Database['public']['Tables']['lab_reports']['Insert'];
export type ConsentRecordInsert = Database['public']['Tables']['consent_records']['Insert'];
export type ApiUsageLogInsert = Database['public']['Tables']['api_usage_log']['Insert'];
export type CredentialInsert = Database['public']['Tables']['credentials']['Insert'];
export type DidDocumentInsert = Database['public']['Tables']['did_documents']['Insert'];
export type WaitlistSignup = Database['public']['Tables']['waitlist_signups']['Row'];
export type WaitlistSignupInsert = Database['public']['Tables']['waitlist_signups']['Insert'];
export type WalletAccessToken = Database['public']['Tables']['wallet_access_tokens']['Row'];
export type WalletAccessTokenInsert = Database['public']['Tables']['wallet_access_tokens']['Insert'];
export type TriageSession = Database['public']['Tables']['triage_sessions']['Row'];
export type TriageSessionInsert = Database['public']['Tables']['triage_sessions']['Insert'];
export type WaConversation = Database['public']['Tables']['wa_conversations']['Row'];
export type WaConversationInsert = Database['public']['Tables']['wa_conversations']['Insert'];
export type WaMessage = Database['public']['Tables']['wa_messages']['Row'];
export type WaMessageInsert = Database['public']['Tables']['wa_messages']['Insert'];
export type WhatsappLink = Database['public']['Tables']['whatsapp_links']['Row'];
export type WhatsappLinkInsert = Database['public']['Tables']['whatsapp_links']['Insert'];
export type ScheduledMessage = Database['public']['Tables']['scheduled_messages']['Row'];
export type ScheduledMessageInsert = Database['public']['Tables']['scheduled_messages']['Insert'];
export type OccupationalAssessment = Database['public']['Tables']['occupational_assessments']['Row'];
export type OccupationalAssessmentInsert = Database['public']['Tables']['occupational_assessments']['Insert'];
export type ClearanceRecord = Database['public']['Tables']['clearance_records']['Row'];
export type ClearanceRecordInsert = Database['public']['Tables']['clearance_records']['Insert'];
export type AntenatalVisit = Database['public']['Tables']['antenatal_visits']['Row'];
export type AntenatalVisitInsert = Database['public']['Tables']['antenatal_visits']['Insert'];

/** Visit lifecycle (CHECK constraint on visits.status) */
export type VisitStatus =
  | 'intake'
  | 'intake_complete'
  | 'in_consultation'
  | 'note_review'
  | 'completed'
  | 'followup_sent';
