import { readFileSync } from 'node:fs';
import path from 'node:path';

interface FirebaseWebConfig {
  projectId: string;
  storageBucket: string;
  firestoreDatabaseId?: string;
}

const list = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

function readFirebaseWebConfig(): FirebaseWebConfig {
  const file = path.resolve(process.cwd(), 'firebase-applet-config.json');
  return JSON.parse(readFileSync(file, 'utf8'));
}

export interface Config {
  port: number;
  isProduction: boolean;
  dataBackend: 'firestore' | 'memory';
  seedDemoData: boolean;
  firebase: FirebaseWebConfig & { serviceAccountJson?: string };
  adminEmails: string[];
  corsOrigins: string[];
  uploadsDir: string;
  maxUploadBytes: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env.NODE_ENV === 'production';
  const web = readFirebaseWebConfig();
  const hasCredentials = Boolean(env.FIREBASE_SERVICE_ACCOUNT || env.GOOGLE_APPLICATION_CREDENTIALS || env.K_SERVICE);
  const dataBackend = (env.DATA_BACKEND as Config['dataBackend']) || (isProduction || hasCredentials ? 'firestore' : 'memory');

  if (isProduction && dataBackend === 'memory') {
    throw new Error('DATA_BACKEND=memory no está permitido en producción: los datos se perderían al reiniciar.');
  }

  return {
    port: Number(env.PORT) || 8080,
    isProduction,
    dataBackend,
    seedDemoData: env.SEED_DEMO_DATA !== 'false',
    firebase: {
      projectId: env.FIREBASE_PROJECT_ID || web.projectId,
      storageBucket: env.FIREBASE_STORAGE_BUCKET || web.storageBucket,
      firestoreDatabaseId: env.FIRESTORE_DATABASE_ID || web.firestoreDatabaseId,
      serviceAccountJson: env.FIREBASE_SERVICE_ACCOUNT,
    },
    adminEmails: list(env.ADMIN_EMAILS || 'ecohotelmadeguadua@gmail.com').map((e) => e.toLowerCase()),
    corsOrigins: list(env.CORS_ORIGINS),
    uploadsDir: path.resolve(process.cwd(), env.UPLOADS_DIR || 'uploads'),
    maxUploadBytes: (Number(env.MAX_UPLOAD_MB) || 8) * 1024 * 1024,
  };
}
