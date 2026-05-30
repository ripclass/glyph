/**
 * @fileoverview React hook for managing the multi-turn AI intake conversation.
 * Handles message history, streaming AI responses, and intake completion.
 *
 * @module lib/hooks/useIntakeConversation
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import {
  startIntake,
  sendIntakeTurn,
  completeIntake,
  type IntakeSummary,
} from '@/lib/services/ai';

/** A single message in the intake conversation */
export interface IntakeMessage {
  /** Who sent this message */
  role: 'ai' | 'patient';
  /** The message content */
  content: string;
  /** Source of the message (e.g. "voice", "typed", "camera") */
  source?: string;
  /** When the message was created */
  timestamp: Date;
}

/** Return type of the `useIntakeConversation` hook */
export interface UseIntakeConversationReturn {
  /** Full conversation history */
  messages: IntakeMessage[];
  /** Whether the AI is processing a response */
  isProcessing: boolean;
  /** Whether the AI response is currently streaming */
  isStreaming: boolean;
  /** Send a message from the patient/attendant and get an AI response */
  sendMessage: (text: string) => void;
  /** Complete the intake and generate a structured summary */
  complete: () => Promise<IntakeSummary>;
}

/**
 * Hook that manages the multi-turn intake conversation with the AI.
 * Streams AI responses token-by-token for a natural conversational feel.
 *
 * @param visitId - The visit ID to associate with this intake
 * @param isAttendant - Whether the speaker is an attendant (not the patient)
 * @returns Conversation state and control functions
 *
 * @example
 * ```tsx
 * function IntakeChat({ visitId }: { visitId: string }) {
 *   const { messages, isStreaming, sendMessage, complete } =
 *     useIntakeConversation(visitId, false);
 *
 *   return (
 *     <div>
 *       {messages.map((msg, i) => (
 *         <p key={i} className={msg.role === 'ai' ? 'text-blue-600' : ''}>
 *           {msg.content}
 *         </p>
 *       ))}
 *       <input onKeyDown={(e) => {
 *         if (e.key === 'Enter') sendMessage(e.currentTarget.value);
 *       }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntakeConversation(
  visitId: string,
  isAttendant: boolean
): UseIntakeConversationReturn {
  const [messages, setMessages] = useState<IntakeMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  /** Track whether the intake session has been initialized */
  const initializedRef = useRef(false);

  /** Track the AI message index being streamed into */
  const streamingIndexRef = useRef<number | null>(null);

  /**
   * Initializes the intake session if not already done.
   * Called automatically on the first message.
   */
  async function ensureInitialized(): Promise<void> {
    if (!initializedRef.current) {
      await startIntake(visitId, isAttendant);
      initializedRef.current = true;
    }
  }

  /**
   * Reads a ReadableStream and progressively appends text to the
   * AI message at the given index in the messages array.
   */
  async function readStream(
    stream: ReadableStream<Uint8Array>,
    aiMessageIndex: number
  ): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';

    try {
      setIsStreaming(true);
      streamingIndexRef.current = aiMessageIndex;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });

        /** Update the AI message in-place */
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
      setIsStreaming(false);
      streamingIndexRef.current = null;
      reader.releaseLock();
    }
  }

  /**
   * Sends a patient/attendant message and streams the AI response.
   *
   * @param text - The message text to send
   */
  const sendMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isProcessing) return;

      setIsProcessing(true);

      /** Add the patient message */
      const patientMessage: IntakeMessage = {
        role: 'patient',
        content: trimmed,
        source: 'typed',
        timestamp: new Date(),
      };

      /** Add a placeholder AI message */
      const aiMessage: IntakeMessage = {
        role: 'ai',
        content: '',
        timestamp: new Date(),
      };

      setMessages((prev) => {
        const updated = [...prev, patientMessage, aiMessage];
        const aiIndex = updated.length - 1;

        /** Start the async flow */
        (async () => {
          try {
            await ensureInitialized();
            const stream = await sendIntakeTurn(visitId, trimmed);
            await readStream(stream, aiIndex);
          } catch (err) {
            const errorMsg =
              err instanceof Error ? err.message : 'Failed to get AI response';
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
            setIsProcessing(false);
          }
        })();

        return updated;
      });
    },
    [visitId, isProcessing] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * Completes the intake and generates a structured summary.
   *
   * @returns The structured intake summary
   */
  const complete = useCallback(async (): Promise<IntakeSummary> => {
    setIsProcessing(true);
    try {
      await ensureInitialized();
      return await completeIntake(visitId);
    } finally {
      setIsProcessing(false);
    }
  }, [visitId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages,
    isProcessing,
    isStreaming,
    sendMessage,
    complete,
  };
}
