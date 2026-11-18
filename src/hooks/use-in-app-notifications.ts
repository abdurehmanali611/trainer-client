import * as React from 'react';

import { api } from '@/lib/api';
import type { AppNotification } from '@/lib/types';

export interface InAppNotification {
  id: number;
  title: string;
  body: string;
  type: AppNotification['type'];
}

interface NotificationsPayload {
  unread: number;
  results: AppNotification[];
}

const POLL_INTERVAL_MS = 20_000;
const MAX_SEEN = 200;

export function useInAppNotifications(enabled: boolean): {
  latest: InAppNotification | null;
  dismiss: () => void;
  unread: number;
} {
  const [latest, setLatest] = React.useState<InAppNotification | null>(null);
  const [unread, setUnread] = React.useState(0);
  const seenRef = React.useRef<Set<number> | null>(null);

  const dismiss = React.useCallback(() => setLatest(null), []);

  React.useEffect(() => {
    if (!enabled) {
      setLatest(null);
      setUnread(0);
      seenRef.current = null;
      return;
    }

    let active = true;

    async function poll() {
      try {
        const data = await api<NotificationsPayload>('client/notifications/');
        if (!active) return;
        setUnread(data.unread);

        const seen = seenRef.current;
        if (!seen) {
          const seeded = new Set<number>();
          for (const n of data.results) seeded.add(n.id);
          seenRef.current = seeded;
          return;
        }

        const fresh = data.results.filter((n) => !seen.has(n.id));
        for (const n of data.results) seen.add(n.id);
        if (seen.size > MAX_SEEN) {
          const kept = [...seen].sort((a, b) => b - a).slice(0, MAX_SEEN);
          seenRef.current = new Set(kept);
        }

        if (fresh.length > 0) {
          const newest = fresh.reduce((a, b) => (b.id > a.id ? b : a));
          setLatest({ id: newest.id, title: newest.title, body: newest.body, type: newest.type });
        }
      } catch {
        // silent
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [enabled]);

  return { latest, dismiss, unread };
}
