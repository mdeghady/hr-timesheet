import { useEffect, useState, useCallback } from "react";

export interface OfflineEntry {
  id: string; // local UUID
  employeeId: number;
  hoursWorked: number;
  overtimeHours: number;
  workType: string;
  notes: string;
  workDate: string;
  teamId: number;
  syncedAt?: number;
  failedAt?: number;
  error?: string;
}

const STORAGE_KEY = "constructhr_offline_entries";

function loadEntries(): OfflineEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: OfflineEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingEntries, setPendingEntries] = useState<OfflineEntry[]>(() =>
    loadEntries().filter((e) => !e.syncedAt)
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addOfflineEntry = useCallback((entry: Omit<OfflineEntry, "id">) => {
    const newEntry: OfflineEntry = {
      ...entry,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    };
    const all = loadEntries();
    all.push(newEntry);
    saveEntries(all);
    setPendingEntries(all.filter((e) => !e.syncedAt));
    return newEntry.id;
  }, []);

  const markSynced = useCallback((localId: string) => {
    const all = loadEntries().map((e) =>
      e.id === localId ? { ...e, syncedAt: Date.now() } : e
    );
    saveEntries(all);
    setPendingEntries(all.filter((e) => !e.syncedAt));
  }, []);

  const markFailed = useCallback((localId: string, error: string) => {
    const all = loadEntries().map((e) =>
      e.id === localId ? { ...e, failedAt: Date.now(), error } : e
    );
    saveEntries(all);
    setPendingEntries(all.filter((e) => !e.syncedAt));
  }, []);

  const clearSynced = useCallback(() => {
    const all = loadEntries().filter((e) => !e.syncedAt);
    saveEntries(all);
    setPendingEntries(all);
  }, []);

  const getPendingForDate = useCallback((workDate: string, teamId: number) => {
    return loadEntries().filter(
      (e) => !e.syncedAt && e.workDate === workDate && e.teamId === teamId
    );
  }, []);

  return {
    isOnline,
    pendingEntries,
    addOfflineEntry,
    markSynced,
    markFailed,
    clearSynced,
    getPendingForDate,
    pendingCount: pendingEntries.length,
  };
}
