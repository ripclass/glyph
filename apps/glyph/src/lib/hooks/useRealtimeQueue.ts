/**
 * @fileoverview React hook for real-time patient queue updates via Supabase Realtime.
 * Subscribes to changes on the `visits` table for a specific clinic
 * and keeps the queue sorted in arrival order (created_at).
 *
 * @module lib/hooks/useRealtimeQueue
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getTodayQueue, type VisitWithRelations } from '@/lib/services/visits';

/** Return type of the `useRealtimeQueue` hook */
export interface UseRealtimeQueueReturn {
  /** Today's patient queue, sorted in arrival order */
  queue: VisitWithRelations[];
  /** Whether the Realtime subscription is active */
  isConnected: boolean;
}

/**
 * Hook that subscribes to real-time updates on the patient queue for a clinic.
 * Uses Supabase Realtime to watch for INSERT, UPDATE, and DELETE events
 * on the visits table, filtered by clinic ID and today's date.
 *
 * @param clinicId - The clinic UUID to watch the queue for
 * @returns Real-time queue data and connection state
 *
 * @example
 * ```tsx
 * function QueuePanel({ clinicId }: { clinicId: string }) {
 *   const { queue, isConnected } = useRealtimeQueue(clinicId);
 *
 *   return (
 *     <div>
 *       <div>{isConnected ? 'Live' : 'Connecting...'}</div>
 *       {queue.map((visit) => (
 *         <QueueItem key={visit.id} visit={visit} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeQueue(clinicId: string): UseRealtimeQueueReturn {
  const [queue, setQueue] = useState<VisitWithRelations[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  /** Ref to track the Realtime channel for cleanup */
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!clinicId) return;

    const supabase = createClient();

    /**
     * Load the initial queue data before subscribing to real-time updates.
     */
    async function loadInitialQueue() {
      try {
        const todayVisits = await getTodayQueue(clinicId);
        setQueue(todayVisits);
      } catch (err) {
        console.error('[RealtimeQueue] Failed to load initial queue:', err);
      }
    }

    loadInitialQueue();

    /**
     * Subscribe to real-time changes on the visits table.
     * Filters by clinic_id to only receive relevant updates.
     */
    /**
     * Realtime payloads carry bare visit rows (no joined patient names), so
     * any event triggers a (debounced) refetch of the fully-joined queue —
     * always consistent, and cheap at clinic queue sizes.
     */
    let refetchTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRefetch() {
      if (refetchTimer) clearTimeout(refetchTimer);
      refetchTimer = setTimeout(() => {
        void loadInitialQueue();
      }, 300);
    }

    const channel = supabase
      .channel(`queue:${clinicId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'visits',
          filter: `clinic_id=eq.${clinicId}`,
        },
        scheduleRefetch
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    /** Cleanup: unsubscribe and remove channel on unmount or clinicId change */
    return () => {
      if (refetchTimer) clearTimeout(refetchTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [clinicId]);

  return { queue, isConnected };
}

