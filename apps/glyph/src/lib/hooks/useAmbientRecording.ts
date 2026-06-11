/**
 * @fileoverview React hook for ambient background recording during consultations.
 * Captures audio via MediaRecorder, streams it for transcription using the
 * speech service, and returns the full transcript when stopped.
 *
 * @module lib/hooks/useAmbientRecording
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createSpeechStream, type SpeechStreamHandle } from '@/lib/services/speech';

/** Return type of the `useAmbientRecording` hook */
export interface UseAmbientRecordingReturn {
  /** Whether audio is currently being recorded */
  isRecording: boolean;
  /** Elapsed recording time in seconds */
  duration: number;
  /** Start background recording and transcription */
  startRecording: () => void;
  /** Stop recording and return the accumulated transcript */
  stopRecording: () => Promise<string>;
  /** Temporarily pause recording without closing the session */
  pauseRecording: () => void;
  /** Resume a paused recording session */
  resumeRecording: () => void;
}

/**
 * Hook that manages ambient background audio recording during a consultation.
 * Records audio, streams it to the speech service for transcription, and
 * accumulates the full transcript for later use in note generation.
 *
 * @param language - BCP-47 language code (defaults to `"bn-BD"`)
 * @returns Recording state and control functions
 *
 * @example
 * ```tsx
 * function ConsultRecorder() {
 *   const { isRecording, duration, startRecording, stopRecording } =
 *     useAmbientRecording('bn-BD');
 *
 *   const handleStop = async () => {
 *     const transcript = await stopRecording();
 *     console.log('Full transcript:', transcript);
 *   };
 *
 *   return (
 *     <button onClick={isRecording ? handleStop : startRecording}>
 *       {isRecording ? `Recording (${duration}s)` : 'Start Recording'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAmbientRecording(
  language: string = 'bn-BD'
): UseAmbientRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);

  /** Accumulated transcript segments */
  const transcriptRef = useRef<string[]>([]);

  /** Speech stream handle */
  const streamRef = useRef<SpeechStreamHandle | null>(null);

  /** Duration timer interval ID */
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Whether the recording is paused */
  const isPausedRef = useRef(false);

  /** Promise resolver for stopRecording */
  const stopResolverRef = useRef<((transcript: string) => void) | null>(null);

  /**
   * Starts the duration counter. Increments every second.
   */
  function startTimer(): void {
    timerRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        setDuration((prev) => prev + 1);
      }
    }, 1000);
  }

  /**
   * Stops the duration counter.
   */
  function stopTimer(): void {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Clean up on unmount */
  useEffect(() => {
    return () => {
      stopTimer();
      if (streamRef.current) {
        streamRef.current.stop();
        streamRef.current = null;
      }
    };
  }, []);

  /**
   * Starts background recording and real-time transcription.
   */
  const startRecording = useCallback(() => {
    transcriptRef.current = [];
    setDuration(0);
    isPausedRef.current = false;

    const stream = createSpeechStream(language);

    stream.onTranscript((text, isFinal) => {
      if (isFinal && text.trim()) {
        transcriptRef.current.push(text.trim());
      }
    });

    stream.onError((errMsg) => {
      console.error('[AmbientRecording] Speech error:', errMsg);
    });

    stream
      .start()
      .then(() => {
        streamRef.current = stream;
        setIsRecording(true);
        startTimer();
      })
      .catch((err: unknown) => {
        console.error('[AmbientRecording] Failed to start:', err);
        setIsRecording(false);
      });
  }, [language]);

  /**
   * Stops the recording session and returns the full accumulated transcript.
   *
   * @returns The complete transcript of the recording session
   */
  const stopRecording = useCallback((): Promise<string> => {
    return new Promise<string>((resolve) => {
      stopTimer();

      if (streamRef.current) {
        streamRef.current.stop();
        streamRef.current = null;
      }

      setIsRecording(false);
      isPausedRef.current = false;

      /** Allow a brief moment for final transcripts to arrive */
      setTimeout(() => {
        const fullTranscript = transcriptRef.current.join(' ');
        resolve(fullTranscript);
      }, 500);
    });
  }, []);

  /**
   * Pauses the recording without closing the stream.
   * The timer stops counting but the stream remains connected.
   */
  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  /**
   * Resumes a paused recording session.
   */
  const resumeRecording = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  return {
    isRecording,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
