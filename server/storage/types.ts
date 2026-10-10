export interface FileStorage {
  /** Guarda el archivo y devuelve una URL pública para mostrarlo en la web. */
  save(file: { buffer: Buffer; originalName: string; contentType: string }): Promise<string>;
}

export function safeFileName(originalName: string): string {
  const base = originalName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base || 'imagen'}`;
}
