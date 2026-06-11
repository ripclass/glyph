/**
 * @fileoverview React hook for the doctor's AI chat during consultation.
 * The doctor asks questions about the patient's history, medications,
 * differentials, etc., and receives a structured answer with source citations.
 *
 * `consult-query` is non-streaming (it returns a structured answer + sources),
 * so this hook awaits the full result rather than reading a token stream.
 *
 * @module lib/hooks/useConsultChat
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { consultQuery, type ConsultSource } from '@/lib/services/ai';

/** A source reference cited by the AI in its response. */
export interface Source {
  /** Type of source material. */
  type: 'intake' | 'prescription' | 'lab_report' | 'medical_knowledge';
  /** Human-readable label. */
  label: string;
  /** Optional link or reference. */
  reference?: string;
}

/** A single message in the consultation chat. */
export interface ConsultMessage {
  role: 'doctor' | 'ai';
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface UseConsultChatReturn {
  messages: ConsultMessage[];
  isQuerying: boolean;
  sendQuery: (query: string) => void;
}

/** Map the edge function's structured sources onto the chat's Source shape. */
function mapSources(sources: ConsultSource[]): Source[] {
  return sources.map((s) => ({
    type: 'medical_knowledge' as const,
    label: s.title,
    reference: s.url ?? s.citation,
  }));
}

/**
 * Hook that manages the doctor's AI chat during a consultation.
 *
 * @param visitId - The active visit ID (provides patient context to the AI).
 */
export function useConsultChat(visitId: string): UseConsultChatReturn {
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  /** Prevent concurrent queries. */
  const queryingRef = useRef(false);

  const sendQuery = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || queryingRef.current) return;

      queryingRef.current = true;
      setIsQuerying(true);

      const doctorMessage: ConsultMessage = {
        role: 'doctor',
        content: trimmed,
        timestamp: new Date(),
      };
      const aiMessage: ConsultMessage = {
        role: 'ai',
        content: '',
        sources: [],
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const updated = [...prev, doctorMessage, aiMessage];
        const aiIndex = updated.length - 1;

        (async () => {
          try {
            const result = await consultQuery(visitId, trimmed);
            setMessages((current) => {
              const copy = [...current];
              if (copy[aiIndex]) {
                copy[aiIndex] = {
                  ...copy[aiIndex],
                  content: result.answer,
                  sources: mapSources(result.sources),
                };
              }
              return copy;
            });
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Failed to query AI';
            setMessages((current) => {
              const copy = [...current];
              if (copy[aiIndex]) {
                copy[aiIndex] = {
                  ...copy[aiIndex],
                  content: `Error: ${errorMsg}`,
                };
              }
              return copy;
            });
          } finally {
            queryingRef.current = false;
            setIsQuerying(false);
          }
        })();

        return updated;
      });
    },
    [visitId],
  );

  return {
    messages,
    isQuerying,
    sendQuery,
  };
}
