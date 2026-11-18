import { api } from '@/lib/api';
import * as React from 'react';

let setUnreadCount: ((n: number) => void) | null = null;

/** Called by the chat screen to keep the tab badge in sync. */
export function setChatUnread(n: number) {
  setUnreadCount?.(n);
}

export function useUnreadChatCount(): number {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    setUnreadCount = setCount;
    let active = true;

    async function poll() {
      try {
        const messages = await api<{ sender_type: string; client_read_at: string | null }[]>(
          'client/chat/?limit=100'
        );
        if (!active) return;
        const unread = messages.filter(
          (m) => m.sender_type === 'trainer' && !m.client_read_at
        ).length;
        setCount(unread);
      } catch {
        // ignore polling errors
      }
    }

    poll();
    const interval = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(interval);
      setUnreadCount = null;
    };
  }, []);

  return count;
}
