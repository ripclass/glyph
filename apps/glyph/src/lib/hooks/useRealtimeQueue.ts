/**
 * @fileoverview React hook for real-time patient queue updates via Supabase Realtime.
 * Subscribes to changes on the `visits` table for a specific clinic
 * and keeps the queue sorted by queue position.
 *
 * @module lib/hooks/useRealtimeQueue
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { getTodayQueue } from '@/lib/services/visits';
import type { Visit } from '@/lib/supabase/types';

/** Return type of the `useRealtimeQueue` hook */
export interface UseRealtimeQueueReturn {
  /** Today's patient queue, sorted by queue position */
  queue: Visit[];
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
  const [queue, setQueue] = useState<Visit[]>([]);
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
    const channel = supabase
      .channel(`queue:${clinicId}`)
      .on<Visit>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'visits',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          setQueue((prev) => {
            const updated = [...prev, payload.new];
            return sortByQueuePosition(updated);
          });
        }
      )
      .on<Visit>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'visits',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          setQueue((prev) => {
            const updated = prev.map((v) =>
              v.id === payload.new.id ? payload.new : v
            );
            return sortByQueuePosition(updated);
          });
        }
      )
      .on<Visit>(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'visits',
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          setQueue((prev) => prev.filter((v) => v.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    /** Cleanup: unsubscribe and remove channel on unmount or clinicId change */
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [clinicId]);

  return { queue, isConnected };
}

/**
 * Sorts visits by queue_position ascending, with nulls at the end.
 *
 * @param visits - Array of visit records to sort
 * @returns Sorted array
 */
function sortByQueuePosition(visits: Visit[]): Visit[] {
  return [...visits].sort((a, b) => {
    const posA = a.queue_position ?? Number.MAX_SAFE_INTEGER;
    const posB = b.queue_position ?? Number.MAX_SAFE_INTEGER;
    return posA - posB;
  });
}
