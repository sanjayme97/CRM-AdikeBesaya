import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'attendance-pending-sync';

export type PendingActionType = 'check-in' | 'check-out' | 'add-stop';

export interface PendingAction {
  id: string;
  type: PendingActionType;
  data: any;
  timestamp: string;
}

interface UseOfflineSyncReturn {
  queueAction: (type: PendingActionType, data: any) => void;
  pendingActions: PendingAction[];
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  clearPending: () => void;
  registerSync: (callback: (actions: PendingAction[]) => Promise<void>) => void;
}

function loadPendingActions(): PendingAction[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePendingActions(actions: PendingAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
}

/**
 * Hook for offline queue + auto-sync.
 * Queues attendance actions to localStorage when offline,
 * and auto-syncs when coming back online via a registered callback.
 */
export function useOfflineSync(): UseOfflineSyncReturn {
  const [pendingActions, setPendingActions] = useState<PendingAction[]>(loadPendingActions);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncCallbackRef = useRef<((actions: PendingAction[]) => Promise<void>) | null>(null);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0 && syncCallbackRef.current && !isSyncing) {
      setIsSyncing(true);
      syncCallbackRef.current(pendingActions)
        .then(() => {
          setPendingActions([]);
          savePendingActions([]);
        })
        .catch(() => {
          // Keep in queue for next retry
        })
        .finally(() => setIsSyncing(false));
    }
  }, [isOnline, pendingActions, isSyncing]);

  const queueAction = useCallback((type: PendingActionType, data: any) => {
    const action: PendingAction = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    const updated = [...pendingActions, action];
    setPendingActions(updated);
    savePendingActions(updated);
  }, [pendingActions]);

  const clearPending = useCallback(() => {
    setPendingActions([]);
    savePendingActions([]);
  }, []);

  const registerSync = useCallback((callback: (actions: PendingAction[]) => Promise<void>) => {
    syncCallbackRef.current = callback;

    // Keep only today's actions, clear stale ones
    const current = loadPendingActions();
    const today = new Date().toLocaleDateString('en-CA');
    const todayActions = current.filter(a => a.timestamp.startsWith(today));
    savePendingActions(todayActions);
    setPendingActions(todayActions);

    // Sync today's pending actions if online
    if (navigator.onLine && todayActions.length > 0) {
      setIsSyncing(true);
      callback(todayActions)
        .then(() => {
          setPendingActions([]);
          savePendingActions([]);
        })
        .catch(() => {})
        .finally(() => setIsSyncing(false));
    }
  }, []);

  return {
    queueAction,
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    isOnline,
    clearPending,
    registerSync,
  };
}
