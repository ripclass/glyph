'use client';

/**
 * @fileoverview Centre-staff session store (Lens). PARALLEL to auth-store.ts —
 * it reads memberships+organizations, never the doctors table. Keeping it
 * separate means the live doctor auth path is untouched (Chamber-safe).
 */

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import { shapeStaffSession, type StaffSession } from '@/lib/services/staff-logic';

interface StaffState {
  staff: StaffSession | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkStaffSession: () => Promise<void>;
}

export const useStaffStore = create<StaffState>((set) => ({
  staff: null,
  isLoading: true,

  signInWithEmail: async (email, password) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  },

  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ staff: null });
  },

  checkStaffSession: async () => {
    set({ isLoading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      set({ staff: null, isLoading: false });
      return;
    }
    // membership_self_read RLS scopes this to the signed-in user.
    const { data: rows } = await supabase
      .from('memberships')
      .select('user_id, role, organizations(id, name, org_type)');
    set({ staff: shapeStaffSession(rows as never), isLoading: false });
  },
}));
