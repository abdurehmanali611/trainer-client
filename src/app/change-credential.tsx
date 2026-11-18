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
  const { setMustChangeCredential, signOut } = useAuth();
  const router = useRouter();
  const [oldOtp, setOldOtp] = React.useState('');
  const [newOtp, setNewOtp] = React.useState('');
  const [confirmOtp, setConfirmOtp] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // One navigation only. The root layout also routes signed-in users away from
  // this screen once `mustChangeCredential` clears, so a screen-level effect plus
  // the explicit replace below used to fire three competing replaces and could
  // leave the screen stuck. Only the already-changed case is handled here.
  const done = React.useRef(false);
  const goHome = React.useCallback(() => {
    if (done.current) return;
    done.current = true;
    router.replace('/');
  }, [router]);

  async function onSubmit() {
    if (loading || done.current) return;
    const oldV = oldOtp.trim();
    const newV = newOtp.trim();
    const confirmV = confirmOtp.trim();
    if (!oldV || !newV || !confirmV) {
      Alert.alert('Missing fields', 'Fill in all three fields.');
      return;
    }
    if (newV !== confirmV) {
      Alert.alert('Mismatch', 'New OTP and confirmation do not match.');
      return;
    }
    if (newV.length < 6 || !/[A-Za-z]/.test(newV) || !/[0-9]/.test(newV)) {
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
          old_credential: oldV,
          new_credential: newV,
          confirm_credential: confirmV,
        },
      });
    } catch (e) {
      setLoading(false);
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
      return;
    }
    // Saved: clear the flag, then go Home once. The screen unmounts on navigation,
    // so loading is deliberately left on to keep the button inert meanwhile.
    setMustChangeCredential(false);
    goHome();
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
