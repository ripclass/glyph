/**
 * @fileoverview Camera capture and image upload service for the Glyph PWA.
 * Handles rear-camera access, still-frame capture, and upload to
 * Supabase Storage for prescription/lab report photos.
 *
 * @module lib/services/camera
 */

import { createClient } from '@/lib/supabase/client';

/**
 * Opens the rear (environment-facing) camera on the device.
 * Falls back to any available camera if the rear camera is not accessible.
 *
 * @returns A MediaStream from the rear camera
 * @throws {Error} If camera access is denied or unavailable
 *
 * @example
 * ```ts
 * const stream = await openCamera();
 * videoElement.srcObject = stream;
 * ```
 */
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API is not supported on this device');
  }

  try {
    /** Request rear camera with high resolution for document capture */
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false,
    });
  } catch (err) {
    /** Fall back to any available camera */
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    } catch {
      throw new Error(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access was denied. Please enable camera permissions in your browser settings.'
          : 'Unable to access camera. Please check that your device has a working camera.'
      );
    }
  }
}

/**
 * Captures a single still frame from an active camera stream.
 * Uses an off-screen canvas to render the current video frame as a JPEG blob.
 *
 * @param stream - An active MediaStream from `openCamera()`
 * @returns A JPEG Blob of the captured frame
 * @throws {Error} If the stream has no active video tracks or capture fails
 *
 * @example
 * ```ts
 * const stream = await openCamera();
 * const photo = await capturePhoto(stream);
 * ```
 */
export async function capturePhoto(stream: MediaStream): Promise<Blob> {
  const videoTrack = stream.getVideoTracks()[0];

  if (!videoTrack || videoTrack.readyState !== 'live') {
    throw new Error('No active video track available for capture');
  }

  const settings = videoTrack.getSettings();
  const width = settings.width ?? 1920;
  const height = settings.height ?? 1080;

  /** Create an off-screen video element to read the current frame */
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => {
      video.play().then(() => resolve()).catch(reject);
    };
    video.onerror = () => reject(new Error('Failed to load video stream'));
  });

  /** Draw the frame onto a canvas */
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create canvas context');
  }

  ctx.drawImage(video, 0, 0, width, height);

  /** Convert to JPEG blob with high quality for document readability */
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to capture photo — canvas.toBlob returned null'));
        }
      },
      'image/jpeg',
      0.92
    );
  });
}

/**
 * Uploads an image blob to Supabase Storage and returns its public URL.
 *
 * @param blob - The image blob to upload
 * @param path - Storage path including bucket prefix (e.g. `"visits/abc123/rx-1.jpg"`)
 * @returns The public URL of the uploaded file
 * @throws {Error} If the upload fails
 *
 * @example
 * ```ts
 * const url = await uploadToStorage(photoBlob, 'visits/visit-id/rx-001.jpg');
 * ```
 */
export async function uploadToStorage(blob: Blob, path: string): Promise<string> {
  const supabase = createClient();

  const bucketName = 'documents';
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Failed to upload image: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);

  return urlData.publicUrl;
}

/**
 * Stops all tracks in a camera MediaStream and releases the device.
 *
 * @param stream - The MediaStream to stop
 *
 * @example
 * ```ts
 * stopCamera(stream);
 * ```
 */
export function stopCamera(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
