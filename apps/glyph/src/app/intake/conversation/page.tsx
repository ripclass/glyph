"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { VoiceOrb } from "@/components/intake/VoiceOrb";
import { SaaraMessage } from "@/components/intake/SaaraMessage";
import { PatientMessage } from "@/components/intake/PatientMessage";
import { AttendantBanner } from "@/components/intake/AttendantBanner";
import { ConsentPrompt } from "@/components/intake/ConsentPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIntakeStore } from "@/lib/stores/intake-store";
import { useIntakeConversation } from "@/lib/hooks/useIntakeConversation";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { recordIntakeConsents } from "@/lib/services/consents";

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
  const patientId = useIntakeStore((s) => s.patientId);
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

  /**
   * PDPO consent gate — the conversation (and every AI call behind it) only
   * begins after explicit consent naming the external processors. The
   * server-side egress gate enforces the same rule independently.
   */
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    if (visitId && typeof window !== "undefined") {
      setConsented(sessionStorage.getItem(`glyph-consent-${visitId}`) === "yes");
    }
  }, [visitId]);

  // No session → back to registration
  useEffect(() => {
    if (!visitId) router.replace("/intake");
  }, [visitId, router]);

  // Greeting starts only after consent
  const initRef = useRef(false);
  useEffect(() => {
    if (visitId && consented && !initRef.current) {
      initRef.current = true;
      initialize().catch((err) =>
        toast.error(err instanceof Error ? err.message : "শুরু করা যায়নি")
      );
    }
  }, [visitId, consented, initialize]);

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
      <ConsentPrompt
        open={!consented}
        onConsent={() => {
          // Record the consent rows at grant time (idempotent — the history
          // step may already have written them). If this client write fails,
          // intake-start still creates the missing rows server-side.
          if (patientId) {
            recordIntakeConsents({
              patientId,
              visitId,
              grantedBy: isAttendant ? "attendant" : "patient",
            }).catch(() => {});
          }
          sessionStorage.setItem(`glyph-consent-${visitId}`, "yes");
          setConsented(true);
        }}
        onDismiss={() => {
          toast.error("সম্মতি ছাড়া AI ইন্টারভিউ সম্ভব নয় — ডাক্তার সরাসরি কথা বলবেন");
          router.replace("/intake");
        }}
      />
      {isAttendant && <AttendantBanner relation={attendantRelation ?? undefined} />}

      {/* ---------- Conversation stage ----------
          justify-end keeps the exchange gravitating toward the orb, so a
          short conversation never floats in an empty void. It scrolls up
          as it grows. */}
      <div
        ref={scrollRef}
        className="flex flex-1 flex-col justify-end gap-8 overflow-y-auto px-6 py-10 scrollbar-hide"
      >
        {/* Warm welcome holds the first moment while the greeting arrives */}
        {messages.length === 0 && (
          <div className="mx-auto w-full max-w-2xl text-center">
            <p className="font-bangla text-2xl leading-[1.7] text-clinical-text/70 md:text-[28px]">
              একটু সময় নিন। নিচের বোতাম চেপে ধরে নিজের কথা বলুন।
            </p>
            <p className="mt-3 text-base text-clinical-muted">
              Take your time. Press and hold the button below to speak.
            </p>
          </div>
        )}

        {messages.map((msg, i) =>
          msg.role === "ai" ? (
            <SaaraMessage
              key={i}
              message={msg.content}
              isStreaming={isStreaming && i === messages.length - 1}
              emphasized={i === messages.length - 1}
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
            attendantRelation={isAttendant ? attendantRelation ?? undefined : undefined}
            interim
          />
        )}
      </div>

      {/* ---------- Orb zone ----------
          On the same bone canvas (no white dock), a soft top hairline only,
          so the orb reads as part of the room, not a chat input bar. */}
      <div className="flex flex-col items-center gap-4 border-t border-clinical-border/60 px-6 pb-8 pt-6">
        <VoiceOrb state={orbState} onPress={handlePressOrb} onRelease={handleReleaseOrb} />
        <p className="font-bangla text-sm text-clinical-muted">
          {orbState === "idle" && "কথা বলতে চাপ দিয়ে ধরুন"}
          {orbState === "listening" && "শুনছি… ছেড়ে দিলে পাঠানো হবে"}
          {orbState === "processing" && "ভাবছি…"}
        </p>

        {/* Typed fallback — quiet, secondary to the voice */}
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
