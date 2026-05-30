/**
 * @fileoverview Date and time formatting utilities for the Bangladesh locale.
 * All formatters use the Asia/Dhaka timezone (UTC+6) and produce
 * human-readable strings suitable for clinical UIs.
 *
 * @module lib/utils/format-date-bd
 */

/** Bangladesh timezone identifier */
const BD_TIMEZONE = 'Asia/Dhaka';

/**
 * Safely coerces a `Date` or ISO string into a `Date` object.
 *
 * @param input - A Date instance or ISO 8601 date string
 * @returns A valid Date object
 */
function toDate(input: Date | string): Date {
  return typeof input === 'string' ? new Date(input) : input;
}

/**
 * Formats a date in the DD/MM/YYYY style common in Bangladesh.
 *
 * @param date - Date to format
 * @returns Formatted date string (e.g. `"04/04/2026"`)
 *
 * @example
 * ```ts
 * formatDateBD('2026-04-04T10:30:00Z'); // "04/04/2026"
 * ```
 */
export function formatDateBD(date: Date | string): string {
  const d = toDate(date);
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: BD_TIMEZONE,
  });
  return formatter.format(d);
}

/**
 * Formats a time in 12-hour format with AM/PM, localized to BD timezone.
 *
 * @param date - Date to format
 * @returns Formatted time string (e.g. `"04:30 PM"`)
 *
 * @example
 * ```ts
 * formatTimeBD('2026-04-04T10:30:00Z'); // "04:30 PM" (UTC+6)
 * ```
 */
export function formatTimeBD(date: Date | string): string {
  const d = toDate(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: BD_TIMEZONE,
  });
  return formatter.format(d);
}

/**
 * Produces a human-readable relative time string (e.g. "5 minutes ago").
 * Uses progressive thresholds: seconds, minutes, hours, days, then falls
 * back to the full DD/MM/YYYY date.
 *
 * @param date - Date to compute relative time from
 * @returns A relative time string in English
 *
 * @example
 * ```ts
 * // If current time is 2026-04-04T10:35:00Z
 * formatRelativeTime('2026-04-04T10:30:00Z'); // "5 minutes ago"
 * formatRelativeTime('2026-04-04T08:35:00Z'); // "2 hours ago"
 * formatRelativeTime('2026-04-01T10:35:00Z'); // "3 days ago"
 * ```
 */
export function formatRelativeTime(date: Date | string): string {
  const d = toDate(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  /** Handle future dates gracefully */
  if (diffMs < 0) {
    return 'just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  return formatDateBD(d);
}
