/**
 * Upload care packet images to Firebase Storage.
 * Path: users/{uid}/carePackets/{timestamp}-{index}.jpg
 * Returns the full storage path for each upload (stored in sessionMetadata.documentIds).
 */

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

export type UploadResult =
  | { ok: true; path: string; url: string }
  | { ok: false; error: Error };

/**
 * Upload a single image blob to the user's carePackets folder.
 * Returns the storage path (suitable for documentIds) and download URL.
 */
export async function uploadCarePacketImage(
  uid: string,
  blob: Blob,
  index: number
): Promise<UploadResult> {
  try {
    const timestamp = Date.now();
    const path = `users/${uid}/carePackets/${timestamp}-${index}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(storageRef);
    return { ok: true, path, url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

/**
 * Upload multiple care packet images. Returns paths in order (for documentIds).
 */
export async function uploadCarePacketImages(
  uid: string,
  blobs: Blob[]
): Promise<{ paths: string[]; errors: Error[] }> {
  const paths: string[] = [];
  const errors: Error[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const result = await uploadCarePacketImage(uid, blobs[i], i);
    if (result.ok) {
      paths.push(result.path);
    } else {
      errors.push(result.error);
    }
  }
  return { paths, errors };
}
