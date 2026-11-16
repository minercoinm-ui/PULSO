import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null = null;
let cachedClientKey = '';

export function normalizeSupabaseUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/\/+(rest|auth|storage|realtime|functions)\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

export function getServerSupabaseUrl(): string {
  return normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
}

export function getServerSupabaseAnonKey(): string {
  return (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
}

export function getServerSupabaseServiceKey(): string {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
}

export function isSupabaseConfigured(): boolean {
  const url = getServerSupabaseUrl();
  const serviceKey = getServerSupabaseServiceKey();
  const anonKey = getServerSupabaseAnonKey();
  if (!url || !serviceKey || !anonKey) return false;
  if (
    url.includes('your-project.supabase.co') ||
    serviceKey.includes('your-service-role-key') ||
    anonKey.includes('your-anon-key')
  ) {
    return false;
  }
  return url.startsWith('https://') || url.startsWith('http://');
}

function extractSupabaseRefFromUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    const match = host.match(/^([a-z0-9-]+)\.supabase\.co$/i);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function inspectJwtClaims(token: string): { ref?: string; role?: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8')) as {
      ref?: string;
      role?: string;
    };
  } catch {
    return null;
  }
}

export function getSupabaseEnvStatus() {
  const rawServerUrl = (process.env.SUPABASE_URL || '').trim();
  const rawViteUrl = (process.env.VITE_SUPABASE_URL || '').trim();
  const effectiveUrl = getServerSupabaseUrl();
  const normalizedServerUrl = normalizeSupabaseUrl(rawServerUrl);
  const normalizedViteUrl = normalizeSupabaseUrl(rawViteUrl);
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  const viteAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = getServerSupabaseServiceKey();
  const sessionSecret = (process.env.SESSION_SECRET || '').trim();
  const mpToken = (process.env.MERCADO_PAGO_ACCESS_TOKEN || '').trim();
  const mpWebhookSecret = (process.env.MERCADO_PAGO_WEBHOOK_SECRET || '').trim();

  const projectRef = effectiveUrl ? extractSupabaseRefFromUrl(effectiveUrl) : null;
  const viteClaims = viteAnonKey ? inspectJwtClaims(viteAnonKey) : null;
  const anonClaims = anonKey ? inspectJwtClaims(anonKey) : null;
  const serviceClaims = serviceKey ? inspectJwtClaims(serviceKey) : null;

  const urlsMatch = Boolean(
    normalizedServerUrl && normalizedViteUrl && normalizedServerUrl === normalizedViteUrl
  );

  const refsMatch = Boolean(
    projectRef &&
      (!viteClaims?.ref || viteClaims.ref === projectRef) &&
      (!anonClaims?.ref || anonClaims.ref === projectRef) &&
      (!serviceClaims?.ref || serviceClaims.ref === projectRef)
  );

  const rolesValid = Boolean(
    (!viteClaims?.role || viteClaims.role === 'anon') &&
      (!anonClaims?.role || anonClaims.role === 'anon') &&
      (!serviceClaims?.role || serviceClaims.role === 'service_role')
  );

  return {
    effective_supabase_url: effectiveUrl || null,
    project_ref: projectRef,
    urls_match: urlsMatch,
    keys_match_project: refsMatch && rolesValid,
    vite_supabase_url_configured: Boolean(rawViteUrl && !rawViteUrl.includes('your-project.supabase.co')),
    vite_supabase_anon_key_configured: Boolean(viteAnonKey && !viteAnonKey.includes('your-anon-key')),
    supabase_url_configured: Boolean(rawServerUrl && !rawServerUrl.includes('your-project.supabase.co')),
    supabase_anon_key_configured: Boolean(anonKey && !anonKey.includes('your-anon-key')),
    supabase_service_role_key_configured: Boolean(
      serviceKey && !serviceKey.includes('your-service-role-key')
    ),
    session_secret_configured: Boolean(
      sessionSecret && !sessionSecret.includes('replace-with-strong-random-secret')
    ),
    mercado_pago_token_configured: Boolean(mpToken && !mpToken.includes('your-access-token')),
    mercado_pago_webhook_secret_configured: Boolean(
      mpWebhookSecret && !mpWebhookSecret.includes('your-webhook-secret')
    ),
  };
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const url = getServerSupabaseUrl();
  const serviceKey = getServerSupabaseServiceKey();
  const keySig = `${url}::${serviceKey.length}`;

  if (!cachedAdminClient || cachedClientKey !== keySig) {
    cachedClientKey = keySig;
    cachedAdminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return cachedAdminClient;
}
