/**
 * @fileoverview Zustand store for the patient queue state.
 * Manages the list of today's visits, filter state, and provides
 * actions for updating individual visits in the queue.
 *
 * @module lib/stores/queue-store
 */

import { create } from 'zustand';
import type { Visit, VisitStatus } from '@/lib/supabase/types';

/** Filter value that includes all statuses or a specific one */
export type QueueFilter = VisitStatus | 'all';

/** Queue store state */
interface QueueState {
  /** Today's visits in queue order */
  visits: Visit[];
  /** Current filter applied to the queue display */
  filter: QueueFilter;
  /** Whether the queue is being loaded */
  isLoading: boolean;
}

/** Queue store actions */
interface QueueActions {
  /** Replace the entire visit list (e.g. after initial load) */
  setVisits: (visits: Visit[]) => void;
  /** Update a single visit in the queue by ID */
  updateVisit: (visit: Visit) => void;
  /** Add a new visit to the queue */
  addVisit: (visit: Visit) => void;
  /** Remove a visit from the queue */
  removeVisit: (visitId: string) => void;
  /** Set the active filter */
  setFilter: (filter: QueueFilter) => void;
  /** Set the loading state */
  setLoading: (isLoading: boolean) => void;
}

/**
 * Derived selector: returns visits filtered by the current filter.
 *
 * @param state - Current queue state
 * @returns Filtered array of visits
 */
export function selectFilteredVisits(state: QueueState): Visit[] {
  if (state.filter === 'all') {
    return state.visits;
  }
  return state.visits.filter((v) => v.status === state.filter);
}

/**
 * Derived selector: counts visits by status for dashboard badges.
 *
 * @param state - Current queue state
 * @returns Record of status to count
 */
export function selectStatusCounts(
  state: QueueState
): Record<VisitStatus | 'all', number> {
  const counts: Record<string, number> = { all: state.visits.length };

  for (const visit of state.visits) {
    counts[visit.status] = (counts[visit.status] ?? 0) + 1;
  }

  return counts as Record<VisitStatus | 'all', number>;
}

/**
 * Global patient queue store.
 * Used by the doctor dashboard to display and filter the day's patient list.
 *
 * @example
 * ```tsx
 * function QueueList() {
 *   const visits = useQueueStore(selectFilteredVisits);
 *   const filter = useQueueStore((s) => s.filter);
 *   const setFilter = useQueueStore((s) => s.setFilter);
 *
 *   return (
 *     <div>
 *       <FilterTabs active={filter} onChange={setFilter} />
 *       {visits.map((v) => <QueueCard key={v.id} visit={v} />)}
 *     </div>
 *   );
 * }
 * ```
 */
export const useQueueStore = create<QueueState & QueueActions>((set) => ({
  visits: [],
  filter: 'all',
  isLoading: false,

  setVisits: (visits) =>
    set({ visits, isLoading: false }),

  updateVisit: (visit) =>
    set((state) => ({
      visits: state.visits.map((v) => (v.id === visit.id ? visit : v)),
    })),

  addVisit: (visit) =>
    set((state) => {
      /** Insert in queue_position order */
      const updated = [...state.visits, visit].sort((a, b) => {
        const posA = a.queue_position ?? Number.MAX_SAFE_INTEGER;
        const posB = b.queue_position ?? Number.MAX_SAFE_INTEGER;
        return posA - posB;
      });
      return { visits: updated };
    }),

  removeVisit: (visitId) =>
    set((state) => ({
      visits: state.visits.filter((v) => v.id !== visitId),
    })),

  setFilter: (filter) =>
    set({ filter }),

  setLoading: (isLoading) =>
    set({ isLoading }),
}));
