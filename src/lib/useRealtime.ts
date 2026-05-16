import { useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export function useRealtimeSubscription(
  table: string,
  callback: () => void,
  deps: unknown[] = []
) {
  const cb = useCallback(callback, deps);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}-${Date.now()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => cb())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, () => cb())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () => cb())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, cb]);
}

export function useMultiRealtimeSubscription(
  tables: string[],
  callback: () => void,
  deps: unknown[] = []
) {
  const cb = useCallback(callback, deps);

  useEffect(() => {
    const channels = tables.map(table =>
      supabase
        .channel(`realtime-${table}-${Date.now()}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => cb())
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, () => cb())
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table }, () => cb())
        .subscribe()
    );

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [tables.join(','), cb]);
}
