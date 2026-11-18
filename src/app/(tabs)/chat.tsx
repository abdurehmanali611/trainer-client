import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { ImageIcon, SendIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { VoicePlayer, VoiceRecorderButton } from '@/components/voice';
import { api, ApiError } from '@/lib/api';
import { uploadAudioToCloudinary, uploadToCloudinary } from '@/lib/cloudinary';
import { shortTime } from '@/lib/dates';
import { setChatUnread } from '@/hooks/use-unread-chat';
import type { ClientProfile, Message } from '@/lib/types';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 5;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const listRef = React.useRef<FlatList<Message>>(null);

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingOlder, setLoadingOlder] = React.useState(false);
  const [trainerName, setTrainerName] = React.useState('Trainer');

  const [draft, setDraft] = React.useState('');
  const [pending, setPending] = React.useState<string[]>([]);
  const [sending, setSending] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [viewerUrl, setViewerUrl] = React.useState<string | null>(null);

  const markRead = React.useCallback(async () => {
    try {
      await api('client/chat/read/', { method: 'POST', body: {} });
      setChatUnread(0);
    } catch {
      // ignore
    }
  }, []);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<Message[]>('client/chat/');
      setMessages(rows);
      setHasMore(rows.length >= 100);
      setError(null);
      if (rows.some((m) => m.sender_type === 'trainer' && !m.client_read_at)) {
        await markRead();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load messages.');
    } finally {
      setLoading(false);
    }
  }, [markRead]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      markRead();
    }, [load, markRead])
  );

  React.useEffect(() => {
    let active = true;
    api<ClientProfile>('client/me/')
      .then((me) => {
        if (active && me.trainer_name) setTrainerName(me.trainer_name);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [messages.length]);

  async function loadOlder() {
    if (loadingOlder || messages.length === 0) return;
    setLoadingOlder(true);
    try {
      const rows = await api<Message[]>('client/chat/', { query: { before: messages[0].id } });
      setHasMore(rows.length >= 100);
      setMessages((prev) => [...rows, ...prev]);
    } catch (e) {
      Alert.alert('Could not load older messages', e instanceof ApiError ? e.message : 'Unknown error');
    } finally {
      setLoadingOlder(false);
    }
  }

  async function pickImages() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES,
      quality: 0.8,
    });
    if (result.canceled) return;
    setPending((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_IMAGES));
    setValidationError(null);
  }

  async function send() {
    const text = draft.trim();
    if (!text && pending.length === 0) {
      setValidationError('Type a message or attach a photo.');
      return;
    }
    setSending(true);
    setValidationError(null);
    try {
      let media_urls: string[] = [];
      if (pending.length > 0) {
        media_urls = await Promise.all(pending.map((uri) => uploadToCloudinary(uri)));
      }
      const body = media_urls.length > 0
        ? { kind: 'image', media_urls, content: text || undefined }
        : { kind: 'text', content: text };
      const message = await api<Message>('client/chat/', { method: 'POST', body });
      setMessages((prev) => [...prev, message]);
      setDraft('');
      setPending([]);
    } catch (e) {
      Alert.alert('Could not send', e instanceof ApiError || e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  async function sendVoice(localUri: string) {
    setSending(true);
    setValidationError(null);
    try {
      const url = await uploadAudioToCloudinary(localUri);
      const message = await api<Message>('client/chat/', {
        method: 'POST',
        body: { kind: 'voice', media_urls: [url] },
      });
      setMessages((prev) => [...prev, message]);
    } catch (e) {
      Alert.alert('Could not send', e instanceof ApiError || e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSending(false);
    }
  }

  function renderBubble(message: Message) {
    const mine = message.sender_type === 'client';
    return (
      <View key={message.id} className={cn('mb-2 flex-row', mine ? 'justify-end' : 'justify-start')}>
        <View
          className={cn(
            'max-w-[80%] gap-1.5 rounded-2xl px-3 py-2',
            mine ? 'bg-primary rounded-br-sm' : 'bg-secondary rounded-bl-sm'
          )}>
          {message.kind === 'voice' ? (
            message.media_urls.length > 0 ? (
              <VoicePlayer url={message.media_urls[0]} mine={mine} />
            ) : (
              <Text className={mine ? 'text-primary-foreground' : 'text-foreground'}>Voice note</Text>
            )
          ) : null}
          {message.kind === 'image' && message.media_urls.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {message.media_urls.map((url, i) => (
                <Pressable key={`${message.id}-${i}`} onPress={() => setViewerUrl(url)}>
                  <Image source={{ uri: url }} className="h-36 w-36 rounded-xl" contentFit="cover" />
                </Pressable>
              ))}
            </View>
          ) : null}
          {message.content ? (
            <Text className={mine ? 'text-primary-foreground' : 'text-foreground'}>{message.content}</Text>
          ) : null}
          <Text className={cn('text-xs', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
            {shortTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  if (loading) return <LoadingView label="Loading chat…" />;
  if (error) return <ErrorView error={error} onRetry={load} />;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      <View
        className="border-border border-b px-4 pb-2"
        style={{ paddingTop: insets.top + 8 }}>
        <Text variant="h3">{trainerName}</Text>
        <Text variant="muted">Your trainer</Text>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => renderBubble(item)}
        contentContainerClassName="flex-grow px-4 pt-3"
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListHeaderComponent={
          hasMore ? (
            <Pressable onPress={loadOlder} className="items-center py-2" disabled={loadingOlder}>
              <Text className="text-primary font-medium">{loadingOlder ? 'Loading…' : 'Load older messages'}</Text>
            </Pressable>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyView title="No messages yet" subtitle={`Say hello to ${trainerName}.`} />
        }
      />
      {pending.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 border-border border-t px-4 pt-3">
          {pending.map((uri, i) => (
            <View key={uri} className="relative">
              <Image source={{ uri }} className="h-16 w-16 rounded-lg" contentFit="cover" />
              <Pressable
                onPress={() => setPending((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5">
                <Icon as={XIcon} size={12} className="text-background" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      {validationError ? (
        <Text variant="muted" className="px-4 pt-2 text-red-600 dark:text-red-400">
          {validationError}
        </Text>
      ) : null}
      <View
        className="flex-row items-center gap-2 border-border border-t px-3 py-2"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <Button variant="ghost" size="icon" onPress={pickImages} disabled={sending}>
          <Icon as={ImageIcon} size={22} />
        </Button>
        <VoiceRecorderButton onSend={sendVoice} disabled={sending} />
        <Input
          className="flex-1"
          placeholder="Message…"
          value={draft}
          onChangeText={(t) => {
            setDraft(t);
            setValidationError(null);
          }}
          multiline
        />
        <Button variant="ghost" size="icon" onPress={send} disabled={sending}>
          <Icon as={SendIcon} size={22} />
        </Button>
      </View>
      <Modal visible={viewerUrl !== null} transparent animationType="fade" onRequestClose={() => setViewerUrl(null)}>
        <View className="flex-1 items-center justify-center bg-black/95">
          <Pressable onPress={() => setViewerUrl(null)} className="absolute right-4 top-12 z-10 p-2">
            <Icon as={XIcon} size={26} className="text-white" />
          </Pressable>
          {viewerUrl ? (
            <Image source={{ uri: viewerUrl }} className="h-full w-full" contentFit="contain" />
          ) : null}
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
