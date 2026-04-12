/**
 * @fileoverview Google Speech streaming service for real-time transcription.
 * Audio is captured via the MediaRecorder API and streamed through a
 * Supabase Edge Function proxy — never directly to Google from the client.
 *
 * @module lib/services/speech
 */

/** Callback for receiving transcript updates */
type TranscriptCallback = (transcript: string, isFinal: boolean) => void;

/** Callback for receiving errors */
type ErrorCallback = (error: string) => void;

/** Handle returned by `createSpeechStream` for controlling the stream lifecycle */
export interface SpeechStreamHandle {
  /** Begin capturing audio and streaming to the speech API */
  start: () => Promise<void>;
  /** Stop capturing and close the WebSocket connection */
  stop: () => void;
  /** Register a callback for transcript updates (interim and final) */
  onTranscript: (cb: TranscriptCallback) => void;
  /** Register a callback for error events */
  onError: (cb: ErrorCallback) => void;
}

/**
 * Creates a speech streaming session that captures microphone audio
 * and sends it to Google Speech-to-Text via a WebSocket proxy.
 *
 * The WebSocket connects to a Supabase Edge Function at
 * `{SUPABASE_URL}/functions/v1/speech-stream`, which proxies
 * audio to the Google Speech API and returns transcript events.
 *
 * @param language - BCP-47 language code for recognition (e.g. `"bn-BD"`, `"en-US"`)
 * @returns A handle with `start`, `stop`, `onTranscript`, and `onError` methods
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
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let ws: WebSocket | null = null;
  let transcriptCallback: TranscriptCallback | null = null;
  let errorCallback: ErrorCallback | null = null;

  /**
   * Builds the WebSocket URL for the speech proxy Edge Function.
   * Converts the HTTP(S) Supabase URL to a WS(S) URL.
   */
  function getWsUrl(): string {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
    }
    const wsBase = supabaseUrl.replace(/^https?:\/\//, (match) =>
      match === 'https://' ? 'wss://' : 'ws://'
    );
    return `${wsBase}/functions/v1/speech-stream?language=${encodeURIComponent(language)}`;
  }

  /**
   * Opens the WebSocket connection to the speech proxy.
   */
  function connectWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const url = getWsUrl();
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
      const socket = new WebSocket(url, ['supabase-auth', anonKey]);

      socket.onopen = () => resolve(socket);

      socket.onerror = (event) => {
        const message = 'WebSocket connection to speech proxy failed';
        errorCallback?.(message);
        reject(new Error(message));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            transcript?: string;
            is_final?: boolean;
            error?: string;
          };

          if (data.error) {
            errorCallback?.(data.error);
            return;
          }

          if (data.transcript !== undefined) {
            transcriptCallback?.(data.transcript, data.is_final ?? false);
          }
        } catch {
          errorCallback?.('Failed to parse speech response');
        }
      };

      socket.onclose = (event) => {
        if (!event.wasClean && event.code !== 1000) {
          errorCallback?.(`Speech connection closed unexpectedly (code ${event.code})`);
        }
      };
    });
  }

  /**
   * Configures MediaRecorder to capture audio and pipe chunks
   * through the WebSocket.
   */
  async function setupMediaRecorder(): Promise<void> {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    /** Prefer webm/opus for compact streaming; fall back to webm */
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    mediaRecorder = new MediaRecorder(mediaStream, {
      mimeType,
      audioBitsPerSecond: 16000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && ws?.readyState === WebSocket.OPEN) {
        ws.send(event.data);
      }
    };

    mediaRecorder.onerror = () => {
      errorCallback?.('MediaRecorder encountered an error');
    };

    /** Send audio in 250ms chunks for near-real-time streaming */
    mediaRecorder.start(250);
  }

  return {
    async start() {
      try {
        ws = await connectWebSocket();
        await setupMediaRecorder();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to start speech stream';
        errorCallback?.(message);
        throw err;
      }
    },

    stop() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      mediaRecorder = null;

      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Client stopped');
      }
      ws = null;
    },

    onTranscript(cb: TranscriptCallback) {
      transcriptCallback = cb;
    },

    onError(cb: ErrorCallback) {
      errorCallback = cb;
    },
  };
}
