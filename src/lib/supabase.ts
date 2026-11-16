import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/\/+(rest|auth|storage|realtime|functions)\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const url = normalizeSupabaseUrl(rawUrl);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isClientSupabaseConfigured = Boolean(
  url &&
    anonKey &&
    (url.startsWith('https://') || url.startsWith('http://')) &&
    !url.includes('your-project.supabase.co') &&
    !anonKey.includes('your-anon-key')
);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isClientSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey);
  }
  return client;
}

export function getClientSupabaseUrl(): string {
  return url;
}
