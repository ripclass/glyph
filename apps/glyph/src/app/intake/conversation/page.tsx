"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VoiceOrb } from "@/components/intake/VoiceOrb";
import { SaaraMessage } from "@/components/intake/SaaraMessage";
import { PatientMessage } from "@/components/intake/PatientMessage";
import { AttendantBanner } from "@/components/intake/AttendantBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntakeStore } from "@/lib/stores/intake-store";
import { useIntakeConversation } from "@/lib/hooks/useIntakeConversation";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";

/**
 * Intake Step 3 — voice-first clinical intake interview, LIVE.
 *
 * The VoiceOrb drives Web Speech recognition (bn-BD); final transcripts go
 * to intake-turn and the AI reply streams back through the egress gate.
 * A typed-input fallback is always available. "শেষ করুন" hands off to the
 * summary step.
 */
export default function IntakeConversationPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const visitId = useIntakeStore((s) => s.visitId);
  const isAttendant = useIntakeStore((s) => s.isAttendant);
  const attendantRelation = useIntakeStore((s) => s.attendantRelation);

  const { messages, isProcessing, isStreaming, initialize, sendMessage } =
    useIntakeConversation(visitId ?? "", isAttendant);

  const {
    isListening,
    transcript,
    finalTranscript,
    startListening,
    stopListening,
    error: voiceError,
  } = useVoiceInput("bn-BD");

  const [typed, setTyped] = useState("");

  // No session → back to registration
  useEffect(() => {
    if (!visitId) router.replace("/intake");
  }, [visitId, router]);

  // Greeting on mount
  const initRef = useRef(false);
  useEffect(() => {
    if (visitId && !initRef.current) {
      initRef.current = true;
      initialize().catch((err) =>
        toast.error(err instanceof Error ? err.message : "শুরু করা যায়নি")
      );
    }
  }, [visitId, initialize]);

  // Voice final transcript → send as a turn
  useEffect(() => {
    if (finalTranscript) {
      sendMessage(finalTranscript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalTranscript]);

  useEffect(() => {
    if (voiceError) toast.error(voiceError);
  }, [voiceError]);

  // Auto-scroll on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, transcript]);

  const orbState = isListening
    ? "listening"
    : isProcessing || isStreaming
      ? "processing"
      : "idle";

  const handlePressOrb = useCallback(() => {
    if (!isListening) startListening();
  }, [isListening, startListening]);

  const handleReleaseOrb = useCallback(() => {
    if (isListening) stopListening();
  }, [isListening, stopListening]);

  const handleTypedSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = typed.trim();
      if (!text) return;
      setTyped("");
      sendMessage(text);
    },
    [typed, sendMessage]
  );

  if (!visitId) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {isAttendant && <AttendantBanner relation={attendantRelation ?? undefined} />}

      {/* ---------- Conversation ---------- */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6 scrollbar-hide"
      >
        {messages.map((msg, i) =>
          msg.role === "ai" ? (
            <SaaraMessage
              key={i}
              message={msg.content}
              isStreaming={isStreaming && i === messages.length - 1}
            />
          ) : (
            <PatientMessage
              key={i}
              message={msg.content}
              source={isAttendant ? "attendant" : "patient"}
              attendantRelation={isAttendant ? attendantRelation ?? undefined : undefined}
            />
          )
        )}

        {/* Live interim transcript while speaking */}
        {transcript && (
          <PatientMessage
            message={`${transcript}…`}
            source={isAttendant ? "attendant" : "patient"}
          />
        )}
      </div>

      {/* ---------- Input area ---------- */}
      <div className="flex flex-col items-center gap-3 border-t border-clinical-border bg-white px-4 pb-6 pt-5">
        <VoiceOrb state={orbState} onPress={handlePressOrb} onRelease={handleReleaseOrb} />
        <p className="font-bangla text-sm text-clinical-muted">
          {orbState === "idle" && "কথা বলতে চাপ দিয়ে ধরুন"}
          {orbState === "listening" && "শুনছি… ছেড়ে দিলে পাঠানো হবে"}
          {orbState === "processing" && "ভাবছি…"}
        </p>

        {/* Typed fallback */}
        <form onSubmit={handleTypedSubmit} className="flex w-full max-w-md gap-2">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="অথবা এখানে লিখুন…"
            className="font-bangla"
            disabled={isProcessing}
          />
          <Button type="submit" variant="outline" disabled={!typed.trim() || isProcessing}>
            পাঠান
          </Button>
        </form>

        {/* Finish — visible once a real exchange happened */}
        {messages.length >= 3 && (
          <Button
            variant="ghost"
            className="text-glyph-700"
            disabled={isProcessing || isStreaming}
            onClick={() => router.push("/intake/summary")}
          >
            কথা শেষ — সারাংশ দেখুন →
          </Button>
        )}
      </div>
    </div>
  );
}
