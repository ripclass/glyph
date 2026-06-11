"use client";

import * as React from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/shared/AuthGuard";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Doctor layout providing a dense, clinical, professional chrome.
 *
 * Auth-gated: bootstraps the doctor session and redirects to /login when
 * absent. The header shows the real signed-in doctor.
 */
export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DoctorChrome>{children}</DoctorChrome>
    </AuthGuard>
  );
}

function DoctorChrome({ children }: { children: React.ReactNode }) {
  const doctor = useAuthStore((s) => s.doctor);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        {/* Left: Logo */}
        <Link href="/doctor" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-glyph-700">
            Glyph
          </span>
          <span className="hidden text-xs text-slate-400 sm:inline">
            Clinical AI
          </span>
        </Link>

        {/* Right: Doctor info + Settings */}
        <div className="flex items-center gap-3">
          {/* Signed-in doctor */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-sm font-medium text-slate-600">
              {(doctor?.name ?? "Dr").slice(0, 2)}
            </div>
            <div className="text-sm">
              <p className="font-medium leading-tight text-slate-700">
                {doctor?.name_bn ?? doctor?.name ?? "—"}
              </p>
              <p className="text-xs leading-tight text-slate-400">
                {doctor?.speciality ?? "General Medicine"}
              </p>
            </div>
          </div>

          {/* Settings — no settings screen exists yet; a dead link that
              404s erodes trust faster than a visibly-disabled control */}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-slate-300"
            aria-label="Settings (coming soon)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      </header>

      {/* ── Body: Optional Sidebar + Content ── */}
      <div className="flex flex-1">
        {/* Sidebar — visible on lg+ screens */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white lg:block">
          <nav className="flex flex-col gap-1 p-3">
            <SidebarLink href="/doctor" icon={DashboardIcon} label="Dashboard" />
            {/* No /doctor/patients or /doctor/schedule routes exist yet —
                shown disabled rather than 404ing (per-patient timelines are
                reachable from the queue) */}
            <SidebarSoon icon={PatientsIcon} label="Patients" />
            <SidebarSoon icon={ScheduleIcon} label="Schedule" />
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/* ── Sidebar helpers ── */

/**
 * Internal sidebar navigation link with icon and label.
 */
function SidebarLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.FC<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

/**
 * Placeholder for a navigation destination that doesn't exist yet.
 * @internal
 */
function SidebarSoon({
  icon: Icon,
  label,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
}) {
  return (
    <div
      title="Coming soon"
      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300"
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
      <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-normal text-slate-400">
        soon
      </span>
    </div>
  );
}

/* ── Icon components ── */

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function PatientsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}
