'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks connectivity. Starts optimistic (`true`) so server and first client
 * render agree; the real value lands in the effect right after hydration.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return online;
}
