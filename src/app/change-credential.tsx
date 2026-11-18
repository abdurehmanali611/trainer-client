import { useRouter } from 'expo-router';
import * as React from 'react';
import { Alert } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ChangeCredentialScreen() {
  const { mustChangeCredential, setMustChangeCredential, signOut } = useAuth();
  const router = useRouter();
  const [oldOtp, setOldOtp] = React.useState('');
  const [newOtp, setNewOtp] = React.useState('');
  const [confirmOtp, setConfirmOtp] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!mustChangeCredential) router.replace('/');
  }, [mustChangeCredential, router]);

  async function onSubmit() {
    if (!oldOtp.trim() || !newOtp.trim() || !confirmOtp.trim()) {
      Alert.alert('Missing fields', 'Fill in all three fields.');
      return;
    }
    if (newOtp !== confirmOtp) {
      Alert.alert('Mismatch', 'New OTP and confirmation do not match.');
      return;
    }
    if (newOtp.length < 6 || !/[A-Za-z]/.test(newOtp) || !/[0-9]/.test(newOtp)) {
      Alert.alert(
        'Weak OTP',
        'New OTP must be at least 6 characters and include both letters and digits.'
      );
      return;
    }
    setLoading(true);
    try {
      await api('auth/change-credential/', {
        method: 'POST',
        body: {
          old_credential: oldOtp.trim(),
          new_credential: newOtp,
          confirm_credential: confirmOtp,
        },
      });
      setMustChangeCredential(false);
      router.replace('/');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Change your OTP"
      subtitle="This is your first login. Choose a new OTP to use from now on."
      footer={
        <Button variant="link" size="sm" onPress={() => signOut().then(() => router.replace('/auth/login'))}>
          <Text className="text-sm font-semibold text-white/90">Sign out</Text>
        </Button>
      }>
      <Input
        placeholder="Old OTP"
        autoCapitalize="none"
        autoCorrect={false}
        value={oldOtp}
        onChangeText={setOldOtp}
      />
      <Input
        placeholder="New OTP"
        autoCapitalize="none"
        autoCorrect={false}
        value={newOtp}
        onChangeText={setNewOtp}
      />
      <Input
        placeholder="Confirm new OTP"
        autoCapitalize="none"
        autoCorrect={false}
        value={confirmOtp}
        onChangeText={setConfirmOtp}
      />
      <Button disabled={loading} onPress={onSubmit}>
        <Text className="text-sm font-semibold text-primary-foreground">
          {loading ? 'Saving…' : 'Save and continue'}
        </Text>
      </Button>
    </AuthShell>
  );
}
