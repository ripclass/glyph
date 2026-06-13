"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { CitationChip, type CitationType } from "@/components/doctor/CitationChip";

/** A single citation attached to an AI response. */
export interface ChatCitation {
  id: string;
  type: CitationType;
  title: string;
  url?: string;
}

/** A message in the consult chat. */
export interface ChatMessage {
  id: string;
  /** Who sent this message. */
  role: "doctor" | "ai";
  /** Message text content. */
  content: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Citations (AI messages only). */
  citations?: ChatCitation[];
  /** Confidence level (AI messages only). */
  confidence?: "high" | "medium" | "low";
  /** Evidence level (AI messages only). */
  evidenceLevel?: string;
  /** Whether this message is still streaming. */
  isStreaming?: boolean;
}

export interface ConsultChatProps {
  /** Visit ID for context. */
  visitId: string;
  /** Chat message history. */
  messages: ChatMessage[];
  /** Called when the doctor sends a new message. */
  onSend: (message: string) => void;
  /** Whether the AI is currently generating a response. */
  isLoading?: boolean;
  className?: string;
}

/**
 * Real-time AI research chat interface for doctors.
 *
 * Chat-style UI for querying clinical knowledge during consultation:
 * - Input box at bottom: "Ask about this patient..."
 * - Doctor messages shown right-aligned
 * - AI responses with citations (CitationChip), confidence, and evidence level
 * - Streaming response indicator (LoadingStream dots)
 *
 * Designed to feel like a clinical co-pilot rather than a generic chatbot.
 *
 * @example
 * ```tsx
 * <ConsultChat
 *   visitId="visit_123"
 *   messages={chatHistory}
 *   onSend={(msg) => handleSend(msg)}
 *   isLoading={isGenerating}
 * />
 * ```
 */
export function ConsultChat({
  visitId,
  messages,
  onSend,
  isLoading = false,
  className,
}: ConsultChatProps) {
  const [input, setInput] = React.useState("");
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div
      className={cn("flex h-full flex-col bg-slate-50", className)}
      role="log"
      aria-label={`AI research chat for visit ${visitId}`}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-3 text-slate-300"
              aria-hidden="true"
            >
              <path d="M12 6V2H8" />
              <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
              <path d="M2 12h2" />
              <path d="M9 11v2" />
              <path d="M15 11v2" />
              <path d="M20 12h2" />
            </svg>
            <p className="text-sm text-slate-400">
              Ask clinical questions about this patient
            </p>
            <p className="mt-1 text-xs text-slate-300">
              Powered by evidence from UpToDate, PubMed, and more
            </p>
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {/* Loading indicator */}
          {isLoading && <LoadingStream />}
        </div>

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-slate-200 bg-white p-3"
      >
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this patient..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-clinical-border bg-clinical-surface px-4 py-2.5 text-sm text-clinical-text placeholder:text-clinical-muted focus:border-ink/40 focus:outline-none focus:ring-2 focus:ring-glyph-400/50"
            disabled={isLoading}
            aria-label="Type your clinical question"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-glyph-600 text-white transition hover:bg-glyph-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── Internal sub-components ── */

/** Confidence badge configuration — lime for high (the trust accent). */
const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-glyph-100 text-glyph-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-red-100 text-red-700",
};

/**
 * Single chat message bubble with role-based styling.
 */
function ChatBubble({ message }: { message: ChatMessage }) {
  const isDoctor = message.role === "doctor";

  return (
    <div className={cn("flex", isDoctor ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] px-4 py-2.5",
          isDoctor
            ? "rounded-2xl rounded-br-md bg-glyph-600 text-white"
            : "rounded-2xl rounded-bl-md border border-clinical-border bg-clinical-surface text-clinical-text"
        )}
      >
        {/* Message content */}
        <p
          className={cn(
            "text-sm leading-relaxed",
            message.isStreaming && "animate-pulse"
          )}
        >
          {message.content}
        </p>

        {/* AI-specific metadata */}
        {!isDoctor && (
          <div className="mt-2 space-y-2">
            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {message.citations.map((citation) => (
                  <CitationChip
                    key={citation.id}
                    type={citation.type}
                    title={citation.title}
                    url={citation.url}
                  />
                ))}
              </div>
            )}

            {/* Confidence + Evidence level */}
            <div className="flex items-center gap-2">
              {message.confidence && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    CONFIDENCE_BADGE[message.confidence]
                  )}
                >
                  {message.confidence} confidence
                </span>
              )}
              {message.evidenceLevel && (
                <span className="text-[10px] text-slate-400">
                  Evidence: {message.evidenceLevel}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "mt-1 text-right text-[10px]",
            isDoctor ? "text-white/60" : "text-slate-300"
          )}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}

/**
 * Streaming response loading indicator with animated dots.
 */
function LoadingStream() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

/**
 * Format ISO timestamp to local time string.
 */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-BD", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
