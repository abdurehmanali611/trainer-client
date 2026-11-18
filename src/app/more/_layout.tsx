import { Stack } from 'expo-router';

export default function MoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="diary" options={{ title: 'Food Diary' }} />
      <Stack.Screen name="water" options={{ title: 'Water' }} />
      <Stack.Screen name="measurements" options={{ title: 'Measurements' }} />
      <Stack.Screen name="photos" options={{ title: 'Progress Photos' }} />
      <Stack.Screen name="records" options={{ title: 'Personal Records' }} />
      <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing' }} />
      <Stack.Screen name="payment-portal" options={{ title: 'Payment portal' }} />
      <Stack.Screen name="feedback" options={{ title: 'Trainer feedback' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
    </Stack>
  );
}
