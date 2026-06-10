/**
 * @fileoverview Zustand store for authentication state management.
 * Manages the authenticated doctor's session, sign-in via phone OTP,
 * and session persistence checks.
 *
 * @module lib/stores/auth-store
 */

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { Doctor } from '@/lib/supabase/types';

/** Auth store state */
interface AuthState {
  /** The currently authenticated doctor, or null if not signed in */
  doctor: Doctor | null;
  /** Whether a session check or sign-in is in progress */
  isLoading: boolean;
}

/** Auth store actions */
interface AuthActions {
  /** Set the doctor state directly (used after fetching profile) */
  setDoctor: (doctor: Doctor | null) => void;
  /**
   * Sign in using phone OTP.
   * This sends an OTP to the phone number and does NOT complete sign-in —
   * the verification step is handled separately by Supabase Auth.
   *
   * @param phone - The doctor's phone number in BD format
   */
  signIn: (phone: string) => Promise<void>;
  /** Sign out and clear session */
  signOut: () => Promise<void>;
  /** Check for an existing session and load the doctor profile */
  checkSession: () => Promise<void>;
}

/**
 * Global authentication store.
 * Used throughout the app to access the current doctor's profile
 * and manage auth lifecycle.
 *
 * @example
 * ```tsx
 * function DoctorName() {
 *   const doctor = useAuthStore((s) => s.doctor);
 *   return <span>{doctor?.name ?? 'Not signed in'}</span>;
 * }
 * ```
 */
export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  doctor: null,
  isLoading: true,

  setDoctor: (doctor) => set({ doctor }),

  signIn: async (phone: string) => {
    set({ isLoading: true });
    const supabase = createClient();

    try {
      /** Normalize to international format for Supabase Auth */
      const normalizedPhone = phone.startsWith('+880')
        ? phone
        : phone.startsWith('0')
          ? `+880${phone.slice(1)}`
          : `+880${phone}`;

      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) {
        throw new Error(`Sign-in failed: ${error.message}`);
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ doctor: null, isLoading: false });
  },

  checkSession: async () => {
    set({ isLoading: true });
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        set({ doctor: null, isLoading: false });
        return;
      }

      /**
       * Fetch the doctor profile for this auth user.
       * In the schema, doctors.id IS the auth.users id (PK references
       * auth.users(id)) — there is no separate auth_user_id column.
       */
      const { data: doctor, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !doctor) {
        set({ doctor: null, isLoading: false });
        return;
      }

      set({ doctor, isLoading: false });
    } catch {
      set({ doctor: null, isLoading: false });
    }
  },
}));
