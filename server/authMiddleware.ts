import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type { Profile } from '../src/types/ecommerce.ts';
import { findProfileById, getActiveSupabase } from './storeRepository.ts';

const SESSION_SECRET = process.env.SESSION_SECRET || 'pulso-sneakers-dev-session-secret-2026';

export interface AuthenticatedRequest extends Request {
  userProfile?: Profile;
}

export function signLocalToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `local.${payload}.${sig}`;
}

export function verifyLocalToken(token: string): string | null {
  if (!token.startsWith('local.')) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub: string;
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

export async function resolveUserFromRequest(req: Request): Promise<Profile | null> {
  const authHeader = req.headers.authorization || '';
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const token = bearer || '';
  if (!token) return null;

  const supa = await getActiveSupabase();
  if (supa && !token.startsWith('local.')) {
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data.user) return null;
    return findProfileById(data.user.id);
  }

  const userId = verifyLocalToken(token);
  if (!userId) return null;
  return findProfileById(userId);
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await resolveUserFromRequest(req);
    if (!profile) {
      res.status(401).json({ error: 'Autenticação necessária para acessar este recurso.' });
      return;
    }
    req.userProfile = profile;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const profile = await resolveUserFromRequest(req);
    if (!profile) {
      res.status(401).json({ error: 'Autenticação administrativa necessária.' });
      return;
    }
    if (profile.role !== 'admin') {
      res.status(403).json({ error: 'Acesso restrito a administradores autorizados.' });
      return;
    }
    req.userProfile = profile;
    next();
  } catch {
    res.status(401).json({ error: 'Falha ao validar permissões de administrador.' });
  }
}
