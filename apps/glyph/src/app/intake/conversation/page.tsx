"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils/cn";
import { VoiceOrb } from "@/components/intake/VoiceOrb";
import { SaaraMessage } from "@/components/intake/SaaraMessage";
import { PatientMessage } from "@/components/intake/PatientMessage";
import { AttendantBanner } from "@/components/intake/AttendantBanner";

/** Chat message model for the intake conversation. */
interface ChatMessage {
  id: string;
  role: "ai" | "patient";
  text: string;
  isStreaming?: boolean;
}

/**
 * Intake Step 3 -- Voice-first clinical intake interview.
 *
 * Core intake experience. Displays a chat-style conversation between
 * the Saara AI assistant and the patient (or attendant). The VoiceOrb
 * at the bottom is the primary interaction element; the conversation
 * auto-scrolls as new messages arrive.
 */
export default function IntakeConversationPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine role from session
  const [role, setRole] = useState<"patient" | "attendant">("patient");
  const [attendantRelation] = useState<string>(""); // TODO: collect relation

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("intake_role");
      if (stored === "attendant") setRole("attendant");
    }
  }, []);

  // Voice orb state
  const [orbState, setOrbState] = useState<"idle" | "listening" | "processing">(
    "idle"
  );

  // Conversation messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      // TODO: i18n key intake.conversation.welcome
      text: "আসসালামু আলাইকুম! আমি সারা, আপনার ডিজিটাল সহকারী। আজ আপনার কী সমস্যা হচ্ছে?",
    },
  ]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  /** Handle voice recording start. */
  const handlePressOrb = useCallback(() => {
    setOrbState("listening");
    // TODO: start audio recording via Web Audio API / MediaRecorder
  }, []);

  /** Handle voice recording stop -- triggers transcription. */
  const handleReleaseOrb = useCallback(() => {
    setOrbState("processing");

    // TODO: replace with actual STT + LLM pipeline
    // Simulated transcription and AI response for scaffolding
    const simulatedTranscript = "আমার মাথায় ব্যথা হচ্ছে গত তিন দিন ধরে।";
    const simulatedAiResponse =
      "বুঝতে পারছি, মাথাব্যথা তিন দিন ধরে হচ্ছে। ব্যথাটা কোন জায়গায় হয়? পুরো মাথায় নাকি একদিকে?";

    setTimeout(() => {
      // Add patient message
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "patient",
          text: simulatedTranscript,
        },
      ]);

      // Add AI response with streaming simulation
      const aiId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: aiId,
          role: "ai",
          text: "",
          isStreaming: true,
        },
      ]);

      // Simulate streaming text
      let charIndex = 0;
      const streamInterval = setInterval(() => {
        charIndex += 3;
        if (charIndex >= simulatedAiResponse.length) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, text: simulatedAiResponse, isStreaming: false }
                : m
            )
          );
          clearInterval(streamInterval);
          setOrbState("idle");
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, text: simulatedAiResponse.slice(0, charIndex) }
                : m
            )
          );
        }
      }, 40);
    }, 800);
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Attendant banner */}
      {role === "attendant" && (
        <AttendantBanner
          relation={attendantRelation || undefined}
        />
      )}

      {/* ---------- Conversation ---------- */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-4 overflow-y-auto px-4 py-6 scrollbar-hide"
      >
        {messages.map((msg) =>
          msg.role === "ai" ? (
            <SaaraMessage
              key={msg.id}
              message={msg.text}
              isStreaming={msg.isStreaming}
            />
          ) : (
            <PatientMessage
              key={msg.id}
              message={msg.text}
              source={role}
              attendantRelation={
                role === "attendant" ? attendantRelation || undefined : undefined
              }
            />
          )
        )}
      </div>

      {/* ---------- Voice orb area ---------- */}
      <div className="flex flex-col items-center gap-2 border-t border-clinical-border bg-white px-4 pb-8 pt-5">
        <VoiceOrb
          state={orbState}
          onPress={handlePressOrb}
          onRelease={handleReleaseOrb}
        />
        {orbState === "idle" && (
          <p className="font-bangla text-sm text-clinical-muted">
            {/* TODO: i18n key intake.conversation.holdToSpeak */}
            কথা বলতে চাপ দিয়ে ধরুন
          </p>
        )}
      </div>
    </div>
  );
}
