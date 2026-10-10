import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { safeFileName, type FileStorage } from './types';

/** Guarda imágenes en disco y las sirve en /uploads. Solo para desarrollo local. */
export class LocalFileStorage implements FileStorage {
  constructor(private dir: string) {}

  async save(file: { buffer: Buffer; originalName: string }) {
    await mkdir(this.dir, { recursive: true });
    const name = safeFileName(file.originalName);
    await writeFile(path.join(this.dir, name), file.buffer);
    return `/uploads/${name}`;
  }
}
