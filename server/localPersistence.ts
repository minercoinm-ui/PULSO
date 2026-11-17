/**
 * Durable backing store for the local (non-Supabase) persistence fallback.
 *
 * - Running on Netlify: the JSON database and uploaded media live in Netlify Blobs,
 *   because the deployed server's filesystem is read-only and wiped on every cold start.
 * - Running locally with `tsx server.ts` (no Blobs environment): falls back to the
 *   original files under ./data.
 */
import { getStore } from '@netlify/blobs';
import { getContext } from '@netlify/server';

type BlobStore = ReturnType<typeof getStore>;

const DB_KEY = 'pulso_db';

let dbStore: BlobStore | null = null;
let mediaStore: BlobStore | null = null;

let cachedDb: unknown = null;
let writeChain: Promise<unknown> = Promise.resolve();

function detectBlobs() {
  // Only a successful detection is cached: the Blobs environment can be injected
  // per request, so a failed probe is retried on the next call.
  if (dbStore) return;
  try {
    dbStore = getStore({ name: 'pulso-local-db', consistency: 'strong' });
    mediaStore = getStore({ name: 'pulso-uploads', consistency: 'strong' });
  } catch {
    dbStore = null;
    mediaStore = null;
  }
}

export function isBlobPersistence(): boolean {
  detectBlobs();
  return dbStore !== null;
}

function registerBackgroundWork(promise: Promise<unknown>) {
  try {
    getContext().waitUntil(promise);
  } catch {
    // Not inside a Netlify request context (e.g. local dev) — nothing to register.
  }
}

/** Loads the latest database snapshot from Blobs into memory. Seeds it when absent. */
export async function refreshBlobDb<T>(seed: () => T): Promise<void> {
  if (!isBlobPersistence() || !dbStore) return;
  await writeChain.catch(() => null);
  const stored = await dbStore.get(DB_KEY, { type: 'json' });
  if (stored) {
    cachedDb = stored;
    return;
  }
  const initial = seed();
  cachedDb = initial;
  await dbStore.setJSON(DB_KEY, initial);
}

export function getCachedBlobDb<T>(): T | null {
  return cachedDb ? (structuredClone(cachedDb) as T) : null;
}

export function setCachedBlobDb<T>(db: T): void {
  cachedDb = structuredClone(db);
  if (!dbStore) return;
  const store = dbStore;
  const snapshot = cachedDb;
  writeChain = writeChain
    .catch(() => null)
    .then(() => store.setJSON(DB_KEY, snapshot))
    .catch((err) => console.error('[PULSO] Falha ao salvar banco no Netlify Blobs:', err));
  registerBackgroundWork(writeChain);
}

/** Resolves once every pending database write has been persisted. */
export function flushBlobWrites(): Promise<unknown> {
  return writeChain.catch(() => null);
}

export async function saveBlobMedia(storagePath: string, buffer: Buffer, contentType: string) {
  if (!mediaStore) throw new Error('Armazenamento de mídia indisponível.');
  const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  await mediaStore.set(storagePath, bytes, { metadata: { contentType } });
}

export async function deleteBlobMedia(storagePath: string) {
  if (!mediaStore) return;
  await mediaStore.delete(storagePath).catch(() => null);
}

export async function getBlobMedia(
  storagePath: string,
): Promise<{ data: ArrayBuffer; contentType: string } | null> {
  if (!mediaStore) return null;
  const result = await mediaStore.getWithMetadata(storagePath, { type: 'arrayBuffer' });
  if (!result || !result.data) return null;
  const contentType = String(result.metadata?.contentType || 'application/octet-stream');
  return { data: result.data, contentType };
}
