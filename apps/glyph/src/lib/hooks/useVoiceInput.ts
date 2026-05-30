/**
 * @fileoverview React hook for managing microphone input and live transcription.
 * Wraps the speech streaming service to provide a simple start/stop interface
 * with real-time transcript updates.
 *
 * @module lib/hooks/useVoiceInput
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { createSpeechStream, type SpeechStreamHandle } from '@/lib/services/speech';

/** Return type of the `useVoiceInput` hook */
export interface UseVoiceInputReturn {
  /** Whether the microphone is currently active and streaming */
  isListening: boolean;
  /** Current interim transcript (updates in real-time as the user speaks) */
  transcript: string;
  /** Last finalized transcript (stable, complete utterance) */
  finalTranscript: string;
  /** Start microphone capture and speech transcription */
  startListening: () => void;
  /** Stop microphone capture and close the speech stream */
  stopListening: () => void;
  /** Error message if speech capture or transcription fails */
  error: string | null;
}

/**
 * Hook that manages microphone streaming and live speech-to-text transcription.
 *
 * @param language - BCP-47 language code (defaults to `"bn-BD"` for Bangla)
 * @returns Voice input state and controls
 *
 * @example
 * ```tsx
 * function VoiceButton() {
 *   const { isListening, transcript, finalTranscript, startListening, stopListening, error } =
 *     useVoiceInput('bn-BD');
 *
 *   return (
 *     <div>
 *       <button onClick={isListening ? stopListening : startListening}>
 *         {isListening ? 'Stop' : 'Start'} Listening
 *       </button>
 *       <p>{transcript || finalTranscript}</p>
 *       {error && <p className="text-red-500">{error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useVoiceInput(language: string = 'bn-BD'): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  /** Ref to hold the current speech stream handle across renders */
  const streamRef = useRef<SpeechStreamHandle | null>(null);

  /**
   * Begins microphone capture and opens a speech streaming connection.
   * Clears any previous error state.
   */
  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');

    const stream = createSpeechStream(language);

    stream.onTranscript((text, isFinal) => {
      if (isFinal) {
        setFinalTranscript(text);
        setTranscript('');
      } else {
        setTranscript(text);
      }
    });

    stream.onError((errMsg) => {
      setError(errMsg);
      setIsListening(false);
    });

    stream
      .start()
      .then(() => {
        streamRef.current = stream;
        setIsListening(true);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to start listening';
        setError(message);
        setIsListening(false);
      });
  }, [language]);

  /**
   * Stops the microphone and closes the speech stream connection.
   */
  const stopListening = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.stop();
      streamRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    error,
  };
}
