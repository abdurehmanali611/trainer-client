import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_PRESET_NAME } from '@/lib/config';

/**
 * Direct unsigned upload to Cloudinary (no server round-trip).
 * Requires EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_PRESET_NAME.
 * Returns the secure URL of the uploaded asset.
 */
export async function uploadToCloudinary(localUri: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_PRESET_NAME) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_* in .env.');
  }
  const form = new FormData();
  form.append('file', { uri: localUri, type: 'image/jpeg', name: 'photo.jpg' } as unknown as Blob);
  form.append('upload_preset', CLOUDINARY_PRESET_NAME);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? 'Upload failed.');
  }
  return data.secure_url as string;
}

export async function uploadAudioToCloudinary(localUri: string): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_PRESET_NAME) {
    throw new Error('Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_* in .env.');
  }
  const form = new FormData();
  form.append('file', { uri: localUri, type: 'audio/mp4', name: 'voice.m4a' } as unknown as Blob);
  form.append('upload_preset', CLOUDINARY_PRESET_NAME);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message ?? 'Upload failed.');
  }
  return data.secure_url as string;
}

export function cloudinaryConfigured(): boolean {
  return Boolean(CLOUDINARY_CLOUD_NAME && CLOUDINARY_PRESET_NAME);
}
