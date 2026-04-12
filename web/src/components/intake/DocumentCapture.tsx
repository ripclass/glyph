"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

interface DocumentCaptureProps {
  /** Called with the captured image as a data URL. */
  onCapture: (dataUrl: string) => void;
  /** Called when the user cancels the capture flow. */
  onCancel: () => void;
}

/**
 * Camera viewfinder component for capturing document photos.
 *
 * Uses `navigator.mediaDevices.getUserMedia` to display a live camera
 * feed. Provides a large circular capture button. After capture, shows
 * the frozen image with "Retake" and "Use Photo" options.
 *
 * Falls back to a file input on devices where the camera API is
 * unavailable.
 */
export function DocumentCapture({ onCapture, onCancel }: DocumentCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  /** Start the camera stream. */
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraReady(true);
      }
    } catch (err) {
      setCameraError(
        // TODO: i18n key intake.camera.error
        "Camera access denied or unavailable. Please use the file upload option."
      );
    }
  }, []);

  /** Stop the camera stream. */
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  /** Capture a frame from the video feed. */
  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  /** Retake the photo and re-open camera. */
  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  /** Confirm the captured image. */
  const handleUsePhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  /** Fallback file input handler. */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          onCapture(reader.result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onCapture]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Viewfinder area */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-clinical-border bg-black">
        {cameraError ? (
          /* Camera error fallback */
          <div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-clinical-muted"
              aria-hidden="true"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <line x1="2" y1="2" x2="22" y2="22" />
            </svg>
            <p className="text-sm text-clinical-muted">{cameraError}</p>
            <label className="cursor-pointer rounded-lg bg-glyph-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-glyph-700">
              {/* TODO: i18n key intake.camera.upload */}
              Upload from Gallery
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInput}
                className="hidden"
              />
            </label>
          </div>
        ) : capturedImage ? (
          /* Captured image preview */
          <img
            src={capturedImage}
            alt="Captured document"
            className="aspect-[4/3] w-full object-contain"
          />
        ) : (
          /* Live camera feed */
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "aspect-[4/3] w-full object-cover",
                !isCameraReady && "opacity-0"
              )}
            />
            {!isCameraReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
              </div>
            )}
            {/* Corner guides */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/70 rounded-tl" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/70 rounded-tr" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/70 rounded-bl" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/70 rounded-br" />
            </div>
          </>
        )}
      </div>

      {/* Action buttons */}
      {capturedImage ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={handleRetake}
          >
            {/* TODO: i18n key intake.camera.retake */}
            Retake
          </Button>
          <Button
            variant="default"
            size="lg"
            className="flex-1"
            onClick={handleUsePhoto}
          >
            {/* TODO: i18n key intake.camera.usePhoto */}
            Use Photo
          </Button>
        </div>
      ) : !cameraError ? (
        <div className="flex items-center justify-center gap-4">
          {/* Cancel */}
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-clinical-border p-3 text-clinical-muted transition hover:bg-clinical-bg"
            aria-label="Cancel"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Large capture button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!isCameraReady}
            className={cn(
              "flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white shadow-lg transition",
              "hover:scale-105 active:scale-95",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            aria-label="Capture photo"
          >
            <div className="h-[56px] w-[56px] rounded-full border-2 border-clinical-border bg-glyph-500" />
          </button>

          {/* Placeholder for symmetry */}
          <div className="w-[48px]" />
        </div>
      ) : null}
    </div>
  );
}
