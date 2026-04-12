/**
 * @fileoverview React hook for the doctor's real-time AI chat during consultation.
 * The doctor can ask questions about the patient's history, medications,
 * differentials, etc., and receive streaming AI responses with source citations.
 *
 * @module lib/hooks/useConsultChat
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { consultQuery } from '@/lib/services/ai';

/** A source reference cited by the AI in its response */
export interface Source {
  /** Type of source material */
  type: 'intake' | 'prescription' | 'lab_report' | 'medical_knowledge';
  /** Human-readable label */
  label: string;
  /** Optional link or reference ID */
  reference?: string;
}

/** A single message in the consultation chat */
export interface ConsultMessage {
  /** Who sent this message */
  role: 'doctor' | 'ai';
  /** The message content */
  content: string;
  /** Source citations (AI messages only) */
  sources?: Source[];
  /** When the message was created */
  timestamp: Date;
}

/** Return type of the `useConsultChat` hook */
export interface UseConsultChatReturn {
  /** Full chat history */
  messages: ConsultMessage[];
  /** Whether a query is currently being processed */
  isQuerying: boolean;
  /** Send a query from the doctor and get a streaming AI response */
  sendQuery: (query: string) => void;
}

/**
 * Hook that manages the doctor's real-time AI chat during a consultation.
 * Streams AI responses for fast display and parses source citations
 * from the response.
 *
 * @param visitId - The active visit ID (provides patient context to the AI)
 * @returns Chat state and send function
 *
 * @example
 * ```tsx
 * function ConsultChat({ visitId }: { visitId: string }) {
 *   const { messages, isQuerying, sendQuery } = useConsultChat(visitId);
 *
 *   return (
 *     <div>
 *       {messages.map((msg, i) => (
 *         <div key={i}>
 *           <strong>{msg.role}:</strong> {msg.content}
 *           {msg.sources?.map((s) => <span key={s.label}>[{s.label}]</span>)}
 *         </div>
 *       ))}
 *       <input onKeyDown={(e) => {
 *         if (e.key === 'Enter') sendQuery(e.currentTarget.value);
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useConsultChat(visitId: string): UseConsultChatReturn {
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);

  /** Prevent concurrent queries */
  const queryingRef = useRef(false);

  /**
   * Reads a streaming response and appends text to the AI message
   * at the given index.
   */
  async function readStream(
    stream: ReadableStream<Uint8Array>,
    aiMessageIndex: number
  ): Promise<string> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        setMessages((prev) => {
          const updated = [...prev];
          if (updated[aiMessageIndex]) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              content: accumulated,
            };
          }
          return updated;
        });
      }
    } finally {
      reader.releaseLock();
    }

    return accumulated;
  }

  /**
   * Parses source citations from the AI response.
   * Looks for markers in the format `[source:type:label:reference]`.
   *
   * @param content - The complete AI response text
   * @returns Array of parsed source objects
   */
  function parseSources(content: string): Source[] {
    const sourcePattern = /\[source:(\w+):([^\]]+?)(?::([^\]]+))?\]/g;
    const sources: Source[] = [];
    let match: RegExpExecArray | null;

    while ((match = sourcePattern.exec(content)) !== null) {
      sources.push({
        type: match[1] as Source['type'],
        label: match[2],
        reference: match[3],
      });
    }

    return sources;
  }

  /**
   * Sends a doctor's query and streams the AI response.
   *
   * @param query - The doctor's question or instruction
   */
  const sendQuery = useCallback(
    (query: string) => {
      const trimmed = query.trim();
      if (!trimmed || queryingRef.current) return;

      queryingRef.current = true;
      setIsQuerying(true);

      /** Add doctor message */
      const doctorMessage: ConsultMessage = {
        role: 'doctor',
        content: trimmed,
        timestamp: new Date(),
      };

      /** Add placeholder AI message */
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
            const stream = await consultQuery(visitId, trimmed);
            const fullContent = await readStream(stream, aiIndex);

            /** Parse sources from the completed response */
            const sources = parseSources(fullContent);
            if (sources.length > 0) {
              setMessages((current) => {
                const copy = [...current];
                if (copy[aiIndex]) {
                  /** Remove source markers from displayed content */
                  const cleanContent = fullContent.replace(
                    /\[source:\w+:[^\]]+\]/g,
                    ''
                  ).trim();

                  copy[aiIndex] = {
                    ...copy[aiIndex],
                    content: cleanContent,
                    sources,
                  };
                }
                return copy;
              });
            }
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
    [visitId]
  );

  return {
    messages,
    isQuerying,
    sendQuery,
  };
}
