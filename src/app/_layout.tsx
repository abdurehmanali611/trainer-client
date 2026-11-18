import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Appearance, View } from 'react-native';

import { NotificationBanner } from '@/components/notification-banner';
import { useInAppNotifications } from '@/hooks/use-in-app-notifications';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { AuthProvider, useAuth } from '@/lib/auth';
import { WebAlertHost } from '@/lib/web-alert';

// A render error in any screen shows Expo Router's "Try again" screen instead
// of closing the app (release builds have no other error boundary).
export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

/** FitPilot navigation theme: near-black base with the green brand. */
const FitPilotTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#3ADD6C',
    background: '#070B14',
    card: '#0B1220',
    text: '#ECF4EF',
    border: '#1B2433',
    notification: '#F87171',
  },
};

function RootNavigator() {
  const { status, mustChangeCredential } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { latest, dismiss } = useInAppNotifications(status === 'signedIn');
  usePushNotifications(status === 'signedIn');

  // The whole app is dark (FitPilot brand); keep the system scheme in step so
  // NativeWind's dark tokens and native controls match.
  React.useEffect(() => {
    if (typeof Appearance.setColorScheme === 'function') Appearance.setColorScheme('dark');
  }, []);

  const inAuthGroup = segments[0] === 'auth';
  const inLock = segments[0] === 'lock';
  const inChangeCredential = segments[0] === 'change-credential';

  React.useEffect(() => {
    if (status === 'loading') return;
    if (status === 'blocked') {
      if (!inLock) router.replace('/lock');
    } else if (status === 'signedOut') {
      if (!inAuthGroup) router.replace('/auth/login');
    } else if (status === 'signedIn') {
      if (mustChangeCredential) {
        if (!inChangeCredential) router.replace('/change-credential');
      } else if (inAuthGroup || inLock || inChangeCredential) {
        router.replace('/');
      }
    }
  }, [status, mustChangeCredential, inAuthGroup, inLock, inChangeCredential, segments, router]);

  const splashHidden = React.useRef(false);
  const hideSplash = React.useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync();
  }, []);

  React.useEffect(() => {
    if (status !== 'loading') hideSplash();
  }, [status, hideSplash]);

  React.useEffect(() => {
    const failsafe = setTimeout(hideSplash, 2500);
    return () => clearTimeout(failsafe);
  }, [hideSplash]);

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={FitPilotTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#070B14' },
        }}>
        <Stack.Screen name="auth" />
        <Stack.Screen name="lock" />
        <Stack.Screen name="change-credential" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: 'Workout' }} />
      </Stack>
      {latest ? (
        <NotificationBanner
          notification={latest}
          onDismiss={dismiss}
          onPress={() => {
            dismiss();
            router.push('/more/notifications');
          }}
        />
      ) : null}
      <PortalHost />
      {/* Coloured in-app replacement for Alert.alert (native and web). */}
      <WebAlertHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
