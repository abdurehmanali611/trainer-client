import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [otp, setOtp] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  async function onSubmit() {
    if (!otp.trim()) {
      Alert.alert('Missing OTP', 'Enter the OTP your trainer shared.');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn(otp.trim());
      if (!res.blocked) {
        router.replace('/');
      }
      // blocked: the root layout redirects to /lock
    } catch (e) {
      if (e instanceof ApiError && e.body?.blocked) {
        router.replace('/lock');
        return;
      }
      Alert.alert('Sign in failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with the OTP your trainer shared.">
      <Input
        placeholder="OTP code"
        keyboardType="number-pad"
        autoCapitalize="characters"
        value={otp}
        onChangeText={setOtp}
      />
      <Button disabled={loading} onPress={onSubmit}>
        <Text className="text-sm font-semibold text-primary-foreground">
          {loading ? 'Signing in…' : 'Sign in'}
        </Text>
      </Button>
    </AuthShell>
  );
}
