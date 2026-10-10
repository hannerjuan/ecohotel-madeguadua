import 'dotenv/config';
import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { cert, applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createApp } from './app';
import type { TokenVerifier } from './auth';
import { loadConfig } from './config';
import { FirestoreRepository } from './repo/firestore';
import { MemoryRepository } from './repo/memory';
import type { Repository } from './repo/types';
import { seedDemoData } from './seed';
import { FirebaseFileStorage } from './storage/firebase';
import { LocalFileStorage } from './storage/local';
import type { FileStorage } from './storage/types';

async function main() {
  const config = loadConfig();
  const { firebase } = config;
  const useFirestore = config.dataBackend === 'firestore';

  // Sin credenciales solo se verifican tokens de inicio de sesión (basta con el projectId).
  const firebaseApp = initializeApp({
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket,
    ...(useFirestore && {
      credential: firebase.serviceAccountJson ? cert(JSON.parse(firebase.serviceAccountJson)) : applicationDefault(),
    }),
  });

  const verifier: TokenVerifier = {
    async verify(token) {
      const decoded = await getAuth(firebaseApp).verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email ?? null,
        emailVerified: decoded.email_verified === true,
        name: (decoded.name as string | undefined) ?? null,
      };
    },
  };

  let repo: Repository;
  let storage: FileStorage;
  if (useFirestore) {
    const db = firebase.firestoreDatabaseId
      ? getFirestore(firebaseApp, firebase.firestoreDatabaseId)
      : getFirestore(firebaseApp);
    repo = new FirestoreRepository(db);
    storage = new FirebaseFileStorage(getStorage(firebaseApp), firebase.storageBucket);
  } else {
    const memory = new MemoryRepository();
    if (config.seedDemoData) await seedDemoData(memory);
    repo = memory;
    storage = new LocalFileStorage(config.uploadsDir);
    console.warn('⚠️  Modo memoria: los datos son de ejemplo y se pierden al reiniciar. Usa DATA_BACKEND=firestore para datos reales.');
  }

  const app = createApp({
    repo,
    storage,
    verifier,
    adminEmails: config.adminEmails,
    corsOrigins: config.corsOrigins,
    maxUploadBytes: config.maxUploadBytes,
    trustProxy: config.isProduction,
  });

  if (!useFirestore) app.use('/uploads', express.static(config.uploadsDir, { maxAge: '7d' }));

  // En producción el mismo servidor entrega la web compilada (npm run build).
  const distDir = path.resolve(process.cwd(), 'dist');
  if (existsSync(distDir)) {
    app.use(express.static(distDir, { index: false, maxAge: '1y', immutable: true }));
    app.get('*', (_req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(config.port, () => {
    console.log(`API de EcoHotel Madeguadua en http://localhost:${config.port} (datos: ${config.dataBackend})`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
