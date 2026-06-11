"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Doctor login — email + password (the pilot auth path; phone OTP arrives
 * with an SMS-provider decision). On success, loads the doctor profile and
 * lands on the dashboard.
 */
export default function LoginPage() {
  const router = useRouter();
  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const checkSession = useAuthStore((s) => s.checkSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password || submitting) return;
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      await checkSession();
      const doctor = useAuthStore.getState().doctor;
      if (!doctor) {
        toast.error("Signed in, but no doctor profile is linked to this account.");
        return;
      }
      toast.success(`স্বাগতম, ${doctor.name_bn ?? doctor.name}`);
      router.push("/doctor");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-clinical-bg px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-glyph-700">Glyph</h1>
          <p className="mt-1 text-sm text-clinical-muted">Doctor sign in</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
