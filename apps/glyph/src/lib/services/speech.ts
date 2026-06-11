/**
 * @fileoverview Speech-to-text for the intake flow.
 *
 * M4 decision: the Web Speech API (built into Chromium; supports bn-BD) is
 * the v1 transport — zero infrastructure, zero cost, typed input always
 * available as fallback. The previous implementation targeted a
 * `speech-stream` WebSocket edge function that was never built; a
 * server-relayed Cloud STT path (gate-controlled) remains the documented
 * upgrade when dialect accuracy demands it.
 *
 * PDPO note, recorded honestly: browser speech recognition transits the
 * vendor's servers OUTSIDE our egress gate. It runs only inside the intake
 * flow, which operates under the patient's `ai_processing` consent
 * (collected at intake start) — the same consent that covers the transcript
 * processing itself.
 *
 * @module lib/services/speech
 */

/** Callback for receiving transcript updates */
type TranscriptCallback = (transcript: string, isFinal: boolean) => void;

/** Callback for receiving errors */
type ErrorCallback = (error: string) => void;

/** Handle returned by `createSpeechStream` for controlling the stream lifecycle */
export interface SpeechStreamHandle {
  /** Begin speech recognition */
  start: () => Promise<void>;
  /** Stop recognition */
  stop: () => void;
  /** Register a callback for transcript updates (interim and final) */
  onTranscript: (cb: TranscriptCallback) => void;
  /** Register a callback for error events */
  onError: (cb: ErrorCallback) => void;
}

/** Minimal typings for the (still-prefixed) Web Speech API */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Creates a speech recognition session over the Web Speech API.
 *
 * @param language - BCP-47 language code (e.g. `"bn-BD"`, `"en-US"`)
 * @returns A handle with `start`, `stop`, `onTranscript`, and `onError`
 *
 * @example
 * ```ts
 * const stream = createSpeechStream('bn-BD');
 * stream.onTranscript((text, isFinal) => {
 *   if (isFinal) console.log('Final:', text);
 * });
 * stream.onError((err) => console.error(err));
 * await stream.start();
 * // Later...
 * stream.stop();
 * ```
 */
export function createSpeechStream(language: string): SpeechStreamHandle {
  let recognition: SpeechRecognitionLike | null = null;
  let transcriptCallback: TranscriptCallback | null = null;
  let errorCallback: ErrorCallback | null = null;
  let stopped = false;

  return {
    onTranscript(cb: TranscriptCallback) {
      transcriptCallback = cb;
    },

    onError(cb: ErrorCallback) {
      errorCallback = cb;
    },

    async start() {
      const Ctor = getRecognitionCtor();
      if (!Ctor) {
        throw new Error(
          'এই ব্রাউজারে ভয়েস ইনপুট নেই — দয়া করে টাইপ করুন (Speech recognition unavailable — please type)'
        );
      }

      recognition = new Ctor();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript ?? '';
          if (result.isFinal) {
            if (text.trim()) transcriptCallback?.(text.trim(), true);
          } else {
            interim += text;
          }
        }
        if (interim.trim()) transcriptCallback?.(interim.trim(), false);
      };

      recognition.onerror = (event) => {
        // "no-speech"/"aborted" are normal lifecycle noise, not failures
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        errorCallback?.(
          event.error === 'not-allowed'
            ? 'মাইক্রোফোনের অনুমতি দিন (Microphone permission needed)'
            : `Speech error: ${event.error ?? 'unknown'}`
        );
      };

      recognition.onend = () => {
        // Chrome ends sessions on silence; keep listening until stop()
        if (!stopped && recognition) {
          try {
            recognition.start();
          } catch {
            /* already restarting */
          }
        }
      };

      stopped = false;
      recognition.start();
    },

    stop() {
      stopped = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
        recognition = null;
      }
    },
  };
}
