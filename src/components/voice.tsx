import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { MicIcon, PauseIcon, PlayIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Animated, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function VoiceRecorderButton({
  onSend,
  disabled,
}: {
  onSend: (localUri: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [busy, setBusy] = React.useState(false);
  const [pulse] = React.useState(() => new Animated.Value(1));

  React.useEffect(() => {
    if (recorderState.isRecording) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulse.setValue(1);
  }, [recorderState.isRecording, pulse]);

  async function start() {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Microphone access needed',
          'Allow microphone access in Settings to send voice notes.'
        );
        return;
      }
      setBusy(true);
      await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      Alert.alert('Could not record', 'Failed to start recording. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) await onSend(uri);
    } catch {
      Alert.alert('Could not send', 'Failed to record voice note. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function onPress() {
    if (busy || disabled) return;
    if (recorderState.isRecording) {
      stop();
    } else {
      start();
    }
  }

  if (recorderState.isRecording) {
    return (
      <Button variant="ghost" size="icon" onPress={onPress} disabled={busy}>
        <View className="flex-row items-center gap-1.5">
          <Animated.View
            style={{ opacity: pulse }}
            className="h-2.5 w-2.5 rounded-full bg-red-600"
          />
          <Text className="text-foreground font-semibold">
            {formatSeconds(recorderState.durationMillis / 1000)}
          </Text>
        </View>
      </Button>
    );
  }

  return (
    <Button variant="ghost" size="icon" onPress={onPress} disabled={busy || disabled}>
      <Icon as={MicIcon} size={22} />
    </Button>
  );
}

function VoicePlayer({ url, mine }: { url: string; mine: boolean }) {
  const player = useAudioPlayer(url);
  const status = useAudioPlayerStatus(player);

  function toggle() {
    if (!status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration) {
      player.seekTo(0);
    }
    player.play();
  }

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <Pressable onPress={toggle} className="flex-row items-center gap-2.5 py-0.5">
      <Icon
        as={status.playing ? PauseIcon : PlayIcon}
        size={20}
        className={mine ? 'text-primary-foreground' : 'text-foreground'}
      />
      <View
        className={cn(
          'h-1 w-20 overflow-hidden rounded-full',
          mine ? 'bg-primary-foreground/30' : 'bg-foreground/15'
        )}>
        <View
          className={cn('h-full rounded-full', mine ? 'bg-primary-foreground' : 'bg-foreground')}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </View>
      <Text className={cn('text-xs', mine ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
        {formatSeconds(status.duration)}
      </Text>
    </Pressable>
  );
}

export { VoicePlayer, VoiceRecorderButton };
