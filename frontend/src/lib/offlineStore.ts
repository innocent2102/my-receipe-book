'use client';

/**
 * Small localStorage wrapper for the offline cache. Every read and write is
 * defensive: private browsing, a full quota or corrupted JSON must never break
 * a page, they just mean "no offline copy".
 */
const PREFIX = 'recipe-book.offline.';

export function readOffline<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeOffline(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the app still works online.
  }
}

export function clearOffline(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // Ignore — nothing we can do, and nothing depends on it.
  }
}
