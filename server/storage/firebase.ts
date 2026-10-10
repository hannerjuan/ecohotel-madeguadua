import { randomUUID } from 'node:crypto';
import type { Storage } from 'firebase-admin/storage';
import { safeFileName, type FileStorage } from './types';

/**
 * Sube a Firebase Storage y devuelve una URL con token de descarga,
 * el mismo formato que generaba el SDK web en la versión anterior.
 */
export class FirebaseFileStorage implements FileStorage {
  constructor(
    private storage: Storage,
    private bucketName: string,
  ) {}

  async save(file: { buffer: Buffer; originalName: string; contentType: string }) {
    const bucket = this.storage.bucket(this.bucketName);
    const objectPath = `images/${safeFileName(file.originalName)}`;
    const token = randomUUID();
    await bucket.file(objectPath).save(file.buffer, {
      resumable: false,
      contentType: file.contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000',
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
    return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(objectPath)}?alt=media&token=${token}`;
  }
}
