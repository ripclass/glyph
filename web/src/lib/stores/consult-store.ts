/**
 * @fileoverview Zustand store for the current consultation session.
 * Manages the doctor's active consultation state including recording status,
 * the AI briefing card, and consultation lifecycle.
 *
 * @module lib/stores/consult-store
 */

import { create } from 'zustand';

/** Structured briefing card data presented to the doctor before consultation */
export interface BriefingCard {
  /** Patient's chief complaint */
  chief_complaint: string;
  /** Triage priority level */
  triage_priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Key symptoms identified during intake */
  key_symptoms: string[];
  /** Relevant medical history */
  relevant_history: string[];
  /** Current medications */
  current_medications: string[];
  /** Known allergies */
  allergies: string[];
  /** Captured and extracted prescriptions */
  captured_prescriptions: Array<{
    image_url: string;
    extracted_summary: string;
  }>;
  /** Captured and extracted lab reports */
  captured_lab_reports: Array<{
    image_url: string;
    report_type: string;
    key_findings: string;
  }>;
  /** AI-suggested questions for the doctor to explore */
  suggested_questions: string[];
  /** Possible differential diagnoses to consider */
  differentials: string[];
}

/** Consult store state */
interface ConsultState {
  /** The current visit ID for this consultation */
  visitId: string | null;
  /** Whether ambient recording is active */
  isRecording: boolean;
  /** The AI-generated briefing card for the current visit */
  briefingCard: BriefingCard | null;
}

/** Consult store actions */
interface ConsultActions {
  /** Start a new consultation session for a visit */
  startConsultation: (visitId: string) => void;
  /** Set the briefing card data */
  setBriefingCard: (card: BriefingCard) => void;
  /** Toggle ambient recording state */
  setRecording: (isRecording: boolean) => void;
  /** End the current consultation and reset state */
  endConsultation: () => void;
  /** Reset the store to its initial state */
  reset: () => void;
}

/** Initial state values */
const initialState: ConsultState = {
  visitId: null,
  isRecording: false,
  briefingCard: null,
};

/**
 * Global consultation session store.
 * Tracks the state of the doctor's active consultation.
 *
 * @example
 * ```tsx
 * function ConsultationView() {
 *   const { visitId, briefingCard, isRecording } = useConsultStore();
 *
 *   if (!visitId) return <NoActiveConsultation />;
 *
 *   return (
 *     <div>
 *       {briefingCard && <BriefingPanel card={briefingCard} />}
 *       <RecordingIndicator active={isRecording} />
 *     </div>
 *   );
 * }
 * ```
 */
export const useConsultStore = create<ConsultState & ConsultActions>((set) => ({
  ...initialState,

  startConsultation: (visitId) =>
    set({
      visitId,
      isRecording: false,
      briefingCard: null,
    }),

  setBriefingCard: (card) =>
    set({ briefingCard: card }),

  setRecording: (isRecording) =>
    set({ isRecording }),

  endConsultation: () =>
    set(initialState),

  reset: () =>
    set(initialState),
}));
