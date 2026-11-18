import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { PlusIcon, XIcon } from 'lucide-react-native';
import * as React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { EmptyView, ErrorView, LoadingView } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { DateField } from '@/components/ui/calendar';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { api, ApiError } from '@/lib/api';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { shortDate, todayISO } from '@/lib/dates';
import type { ProgressPhoto } from '@/lib/types';

export default function PhotosScreen() {
  const [photos, setPhotos] = React.useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [viewer, setViewer] = React.useState<ProgressPhoto | null>(null);

  const [open, setOpen] = React.useState(false);
  const [photoUri, setPhotoUri] = React.useState<string | null>(null);
  const [date, setDate] = React.useState(todayISO());
  const [note, setNote] = React.useState('');
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const rows = await api<ProgressPhoto[]>('client/photos/');
      setPhotos(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function openDialog() {
    setPhotoUri(null);
    setDate(todayISO());
    setNote('');
    setDialogError(null);
    setOpen(true);
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function submit() {
    if (!photoUri) {
      setDialogError('Pick a photo first.');
      return;
    }
    setSubmitting(true);
    setDialogError(null);
    try {
      const url = await uploadToCloudinary(photoUri);
      await api('client/photos/', {
        method: 'POST',
        body: { url, date: date.trim() || undefined, note: note.trim() || undefined },
      });
      setOpen(false);
      await load();
    } catch (e) {
      setDialogError(e instanceof ApiError || e instanceof Error ? e.message : 'Failed to save photo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pb-12">
      <Button className="my-3" onPress={openDialog}>
        <Icon as={PlusIcon} size={16} />
        <Text>Add photo</Text>
      </Button>

      {loading ? (
        <LoadingView label="Loading photos…" />
      ) : error ? (
        <ErrorView error={error} onRetry={load} />
      ) : photos.length === 0 ? (
        <EmptyView title="No progress photos" subtitle="Add a photo to track how your body changes." />
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo) => (
            <Pressable key={photo.id} className="w-[48%]" onPress={() => setViewer(photo)}>
              <Image source={{ uri: photo.url }} className="aspect-square w-full rounded-xl" contentFit="cover" />
              <Text variant="muted" className="mt-1">
                {shortDate(photo.date)}
              </Text>
              {photo.note ? (
                <Text variant="muted" numberOfLines={2}>
                  {photo.note}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add progress photo</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            {photoUri ? (
              <View className="relative self-start">
                <Image source={{ uri: photoUri }} className="h-32 w-32 rounded-lg" contentFit="cover" />
                <Pressable
                  onPress={() => setPhotoUri(null)}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-foreground p-0.5">
                  <Icon as={XIcon} size={12} className="text-background" />
                </Pressable>
              </View>
            ) : null}
            <Button variant="outline" onPress={pickPhoto}>
              <Text>{photoUri ? 'Change photo' : 'Pick photo'}</Text>
            </Button>
            <DateField label="Date" value={date} onChange={setDate} maxDate={todayISO()} />
            <Textarea placeholder="Note (optional)" value={note} onChangeText={setNote} />
            {dialogError ? <Text className="text-red-600 dark:text-red-400">{dialogError}</Text> : null}
            <Button onPress={submit} disabled={submitting}>
              <Text>{submitting ? 'Uploading…' : 'Save photo'}</Text>
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      <Modal visible={viewer !== null} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View className="flex-1 items-center justify-center bg-black/95">
          <Pressable onPress={() => setViewer(null)} className="absolute right-4 top-12 z-10 p-2">
            <Icon as={XIcon} size={26} className="text-white" />
          </Pressable>
          {viewer ? (
            <View className="h-full w-full items-center justify-center px-4">
              <Image source={{ uri: viewer.url }} className="h-full w-full" contentFit="contain" />
              <View className="absolute bottom-16 items-center">
                <Text className="text-white">{shortDate(viewer.date)}</Text>
                {viewer.note ? <Text className="text-white/80">{viewer.note}</Text> : null}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}
