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
 * and provides the queue for the caller to sync when online.
 *
 * The actual sync logic (calling API) is handled by the page component,
 * since it needs access to the service layer and state.
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

  return {
    queueAction,
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    isOnline,
    clearPending,
  };
}
