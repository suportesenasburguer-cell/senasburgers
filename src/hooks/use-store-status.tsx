import { useState, useEffect, useCallback } from 'react';
import { isStoreOpen, ensureCacheLoaded, subscribeStoreStatus, isCacheLoaded } from '@/lib/store-hours';

/**
 * Reactive hook that returns the store open/closed status.
 * Waits for the cache to be loaded from DB before returning a value.
 * Re-checks every 60 seconds and when cache updates.
 */
export const useStoreStatus = () => {
  const [open, setOpen] = useState<boolean>(isStoreOpen());
  const [ready, setReady] = useState<boolean>(isCacheLoaded());

  const refresh = useCallback(() => {
    setOpen(isStoreOpen());
    if (!ready && isCacheLoaded()) setReady(true);
  }, [ready]);

  useEffect(() => {
    // Wait for cache to load on first mount
    ensureCacheLoaded().then(() => {
      setOpen(isStoreOpen());
      setReady(true);
    });

    // Subscribe to cache updates
    const unsub = subscribeStoreStatus(() => {
      setOpen(isStoreOpen());
      setReady(true);
    });

    // Re-check every 60s
    const interval = setInterval(() => {
      setOpen(isStoreOpen());
    }, 60_000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return { isOpen: open, ready };
};
