import { Image } from 'expo-image';
import { LogOutIcon, TrophyIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Badge, ErrorView, LoadingView, toneForMode } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { shortDate } from '@/lib/dates';
import type { ClientProfile } from '@/lib/types';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between gap-4">
      <Text variant="muted">{label}</Text>
      <Text className="flex-1 text-right">{value || '—'}</Text>
    </View>
  );
}

function Card({
  title,
  onOpen,
  openLabel,
  children,
}: {
  title: string;
  onOpen?: () => void;
  openLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="border-border mt-4 gap-2 rounded-xl border p-4">
      <Text variant="h4">{title}</Text>
      {children}
      {onOpen ? (
        <Button variant="ghost" size="sm" onPress={onOpen}>
          <Text className="text-xs">{openLabel ?? 'View all'}</Text>
        </Button>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const [profile, setProfile] = React.useState<ClientProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const me = await api<ClientProfile>('client/me/');
      setProfile(me);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
  }

  if (loading) return <LoadingView label="Loading profile…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!profile) return <ErrorView error="Profile unavailable." onRetry={load} />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <View className="items-center gap-3 py-6">
        {profile.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} className="h-24 w-24 rounded-full" contentFit="cover" />
        ) : (
          <View className="bg-secondary h-24 w-24 items-center justify-center rounded-full">
            <Text variant="h2">{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text variant="h3">{profile.name}</Text>
        <Badge label={profile.mode} tone={toneForMode[profile.mode] ?? 'default'} />
        <Text variant="muted">Trainer: {profile.trainer_name || '—'}</Text>
      </View>

      <View className="border-border gap-2 rounded-xl border p-4">
        <Text variant="h4">Contact</Text>
        <Row label="Phone" value={profile.phone} />
        <Row label="Email" value={profile.email} />
        <Row label="Emergency contact" value={profile.emergency_contact} />
      </View>

      <View className="border-border mt-4 gap-2 rounded-xl border p-4">
        <Text variant="h4">Goals & health</Text>
        {profile.goals.length === 0 ? (
          <Text variant="muted">No goals set yet.</Text>
        ) : (
          profile.goals.map((goal, i) => (
            <Text key={i} variant="muted">
              • {goal}
            </Text>
          ))
        )}
        {profile.medical_history ? (
          <Text variant="muted">Medical history: {profile.medical_history}</Text>
        ) : null}
      </View>

      <View className="border-border mt-4 gap-2 rounded-xl border p-4">
        <Text variant="h4">Body</Text>
        <Row label="Current weight" value={profile.current_weight !== null ? `${profile.current_weight} kg` : ''} />
        <Row label="Target weight" value={profile.target_weight !== null ? `${profile.target_weight} kg` : ''} />
        <Row label="Body fat" value={profile.body_fat !== null ? `${profile.body_fat}%` : ''} />
        <Row
          label="Last session"
          value={profile.last_session_date ? shortDate(profile.last_session_date) : ''}
        />
        <Row label="Member since" value={shortDate(profile.created_at)} />
      </View>

      {/* Feature 7: the client-detail contents, client-facing & read-only.
          Managing (adding) these lives on the existing detail screens. */}
      <Card
        title="Measurements"
        onOpen={() => router.push('/more/measurements')}
        openLabel="Open measurements">
        {profile.measurements.length === 0 ? (
          <Text variant="muted">No measurements yet.</Text>
        ) : (
          profile.measurements.map((m) => (
            <View key={m.id} className="flex-row justify-between gap-4">
              <Text variant="muted" className="text-xs">
                {shortDate(m.date)}
              </Text>
              <Text className="text-xs">
                {m.weight != null ? `${m.weight} kg` : '—'}
                {m.body_fat != null ? ` · ${m.body_fat}%` : ''}
                {m.chest != null ? ` · chest ${m.chest}` : ''}
                {m.waist != null ? ` · waist ${m.waist}` : ''}
                {m.arms != null ? ` · arms ${m.arms}` : ''}
                {m.thighs != null ? ` · thighs ${m.thighs}` : ''}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card
        title="Personal records"
        onOpen={() => router.push('/more/records')}
        openLabel="Open records">
        {profile.records.length === 0 ? (
          <Text variant="muted">No personal records yet.</Text>
        ) : (
          profile.records.map((r) => (
            <View key={r.id} className="flex-row justify-between gap-4">
              <Text variant="muted" className="text-xs">
                {shortDate(r.date)}
              </Text>
              <Text className="flex-1 text-right text-xs">
                {r.exercise} · {r.weight} kg × {r.reps}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Card
        title="Progress photos"
        onOpen={() => router.push('/more/photos')}
        openLabel="Open photos">
        {profile.photos.length === 0 ? (
          <Text variant="muted">No progress photos yet.</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {profile.photos.map((p) => (
              <View key={p.id} className="items-center gap-1">
                <Image
                  source={{ uri: p.url }}
                  className="h-16 w-16 rounded-lg"
                  contentFit="cover"
                />
                <Text variant="muted" className="text-[10px]">
                  {shortDate(p.date)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Card
        title="Achievements"
        onOpen={() => router.push('/more/achievements')}
        openLabel="Open achievements">
        {profile.achievements.length === 0 ? (
          <Text variant="muted">No achievements unlocked yet.</Text>
        ) : (
          profile.achievements.map((a) => (
            <View key={a.id} className="flex-row justify-between gap-4">
              <Text variant="muted" className="text-xs">
                {a.label}
              </Text>
              <Text className="text-xs">{shortDate(a.unlocked_at)}</Text>
            </View>
          ))
        )}
      </Card>

      <View className="mt-4 flex-row gap-2">
        <Button variant="outline" className="flex-1" onPress={() => router.push('/more/achievements')}>
          <Icon as={TrophyIcon} size={16} />
          <Text>
            Streak {profile.streak?.current ?? 0} · {profile.streak?.longest ?? 0} best
          </Text>
        </Button>
      </View>

      <Text variant="muted" className="mt-3 text-center">
        Your trainer manages your profile details.
      </Text>

      <Button variant="destructive" className="mt-6" onPress={handleSignOut}>
        <Icon as={LogOutIcon} size={18} />
        <Text className="text-white">Sign out</Text>
      </Button>
    </ScrollView>
  );
}
