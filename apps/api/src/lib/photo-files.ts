import { deleteObjectKey } from './storage.js';

export async function deletePhotoFiles(photo: {
  storageKey: string;
  thumbnailKey?: string | null;
}): Promise<void> {
  await deleteObjectKey(photo.storageKey);
  if (photo.thumbnailKey && photo.thumbnailKey !== photo.storageKey) {
    await deleteObjectKey(photo.thumbnailKey);
  }
}
