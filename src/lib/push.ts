import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '@/lib/api';

const TOKEN_KEY = 'client.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (!Device.isDevice) return null;

  const settings = await Notifications.getPermissionsAsync();
  // iOS provisional ≈ status 2; avoid IosAuthorizationStatus enum (lint/types gap).
  const granted = settings.granted || (settings.ios?.status ?? 0) >= 2;
  if (!granted) {
    const request = await Notifications.requestPermissionsAsync();
    if (!request.granted) return null;
  }

  try {
    const projectId = (
      Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
    )?.eas?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token.data;
  } catch {
    return null;
  }
}

export async function registerPushToken(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  const previous = await AsyncStorage.getItem(TOKEN_KEY);
  if (previous === token) return;

  await api('client/devices/', {
    method: 'POST',
    body: { token },
  });
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function unregisterPushToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export function routeForNotification(
  data: Record<string, unknown> | undefined
): string | null {
  if (!data) return null;
  if (typeof data.route === 'string' && data.route.startsWith('/')) return data.route;
  if (data.session_id != null) return '/(tabs)/schedule';
  if (data.payment_id != null) return '/more/payment-portal';
  if (data.type === 'chat' || data.chat_id != null) return '/(tabs)/chat';
  if (data.type === 'feedback' || data.type === 'diet') return '/more/feedback';
  return '/more/notifications';
}
