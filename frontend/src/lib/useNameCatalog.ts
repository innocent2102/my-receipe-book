'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Per-user autocomplete catalog (ingredient names, recipe tags). The API shape is the
 * same for every catalog: GET lists, POST remembers, DELETE forgets, and each of them
 * answers with the full list.
 */
export function useNameCatalog(endpoint: string, label: string) {
  const [options, setOptions] = useState<string[]>([]);

  const applyResponse = useCallback(async (res: Response) => {
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: string[];
    };
    if (res.ok && json.success && Array.isArray(json.data)) {
      setOptions(json.data);
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(endpoint, { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: string[];
        };
        if (!cancelled && res.ok && json.success && Array.isArray(json.data)) {
          setOptions(json.data);
        }
      } catch (err) {
        console.error(`Error loading ${label} suggestions:`, err);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [endpoint, label]);

  /** Persists a newly typed value so it shows up in future autocompletes. */
  const remember = useCallback(
    async (rawValue: string) => {
      const name = rawValue.trim().replace(/\s+/g, ' ');
      if (!name) return;
      if (options.some((option) => option.toLowerCase() === name.toLowerCase())) return;

      // Shown straight away; the server's answer replaces it a moment later.
      setOptions((prev) => [...prev, name].sort((a, b) => a.localeCompare(b)));

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        await applyResponse(res);
      } catch (err) {
        console.error(`Error saving ${label}:`, err);
      }
    },
    [applyResponse, endpoint, label, options]
  );

  /** Drops a suggestion from the user's catalog (the ✕ on a dropdown option). */
  const forget = useCallback(
    async (name: string) => {
      setOptions((prev) => prev.filter((option) => option !== name));

      try {
        const res = await fetch(`${endpoint}?name=${encodeURIComponent(name)}`, {
          method: 'DELETE',
        });
        await applyResponse(res);
      } catch (err) {
        console.error(`Error removing ${label} suggestion:`, err);
      }
    },
    [applyResponse, endpoint, label]
  );

  return { options, remember, forget };
}
