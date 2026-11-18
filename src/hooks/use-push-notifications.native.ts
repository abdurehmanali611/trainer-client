import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as React from 'react';

import { registerPushToken, routeForNotification, unregisterPushToken } from '@/lib/push';

export function usePushNotifications(enabled: boolean): void {
  const router = useRouter();

  React.useEffect(() => {
    if (enabled) {
      void registerPushToken();
    } else {
      void unregisterPushToken();
    }
  }, [enabled]);

  const initialResponse = Notifications.useLastNotificationResponse();
  React.useEffect(() => {
    const response = initialResponse;
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    const route = routeForNotification(
      response.notification.request.content.data as Record<string, unknown> | undefined
    );
    if (route) router.push(route as never);
  }, [initialResponse, router]);

  React.useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = routeForNotification(
        response.notification.request.content.data as Record<string, unknown> | undefined
      );
      if (route) router.push(route as never);
    });
    return () => subscription.remove();
  }, [router]);
}
