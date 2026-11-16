import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';

type AuthMode = 'login' | 'register' | 'forgot';

export function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, setPage } = useStore();
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const profile = await login(email, password);
        setAuthModalOpen(false);
        if (profile.role === 'admin') {
          setPage('admin');
        }
      } else if (mode === 'register') {
        const profile = await register(fullName, email, password);
        setAuthModalOpen(false);
        if (profile.role === 'admin') {
          setPage('admin');
        }
      } else {
        const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        setNotice(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-zinc-950">
              {mode === 'login' && 'Entrar na PULSO Sneakers'}
              {mode === 'register' && 'Criar Conta'}
              {mode === 'forgot' && 'Recuperar Senha'}
            </h2>
            <p className="text-xs text-zinc-500">Seu estilo. Seu ritmo.</p>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          {notice && (
            <div className="rounded-lg border border-lime-300 bg-lime-50 px-3 py-2 text-xs text-zinc-900">
              {notice}
            </div>
          )}

          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Nome Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-950 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-950 focus:outline-none"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-zinc-950 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-950 py-2.5 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading
              ? 'Processando...'
              : mode === 'login'
              ? 'Entrar'
              : mode === 'register'
              ? 'Cadastrar'
              : 'Enviar instruções'}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
          {mode === 'login' ? (
            <>
              <button type="button" onClick={() => setMode('register')} className="underline">
                Criar nova conta
              </button>
              <button type="button" onClick={() => setMode('forgot')} className="underline">
                Esqueci minha senha
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setMode('login')} className="underline">
              Já tenho conta — Entrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
