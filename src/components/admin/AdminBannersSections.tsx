import React, { useRef, useState } from 'react';
import { ImagePlus, Plus, Trash2, Upload } from 'lucide-react';
import { apiRequest, uploadMediaWithProgress } from '../../lib/api';
import type { Banner, SiteSection } from '../../types/ecommerce';

interface AdminBannersSectionsProps {
  banners: Banner[];
  sections: SiteSection[];
  onRefresh: () => Promise<void>;
  onStorefrontSync: () => Promise<void>;
}

export function AdminBannersSections({
  banners,
  sections,
  onRefresh,
  onStorefrontSync,
}: AdminBannersSectionsProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Explorar Coleção');
  const [ctaLink, setCtaLink] = useState('#catalogo');
  const [placement, setPlacement] = useState<'hero' | 'promo' | 'campaign'>('hero');
  const [imageUrl, setImageUrl] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [uploadPct, setUploadPct] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleBannerUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadPct(5);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'banner');
      fd.append('title', file.name);
      const res = await uploadMediaWithProgress(fd, setUploadPct);
      setImageUrl(res.public_url);
      setStoragePath(res.storage_path);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify({
          title,
          subtitle,
          cta_label: ctaLabel,
          cta_link: ctaLink,
          image_url: imageUrl,
          storage_path: storagePath,
          placement,
          is_active: true,
        }),
      });
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setStoragePath('');
      setUploadPct(0);
      await onRefresh();
      await onStorefrontSync();
    } finally {
      setSaving(false);
    }
  };

  const toggleBannerActive = async (banner: Banner) => {
    await apiRequest('/api/admin/banners', {
      method: 'POST',
      body: JSON.stringify({ ...banner, is_active: !banner.is_active }),
    });
    await onRefresh();
    await onStorefrontSync();
  };

  const handleDeleteBanner = async (id: string) => {
    await apiRequest(`/api/admin/banners/${id}`, { method: 'DELETE' });
    await onRefresh();
    await onStorefrontSync();
  };

  const handleSectionUpdate = async (section: SiteSection, patch: Partial<SiteSection>) => {
    await apiRequest(`/api/admin/sections/${section.id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...section, ...patch }),
    });
    await onRefresh();
    await onStorefrontSync();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-zinc-950">Banners & Conteúdo da Página Inicial</h2>
        <p className="text-xs text-zinc-500">
          Troque banners principais, publique campanhas e ative/desative seções da vitrine sem alterar código.
        </p>
      </div>

      {/* Add Banner Form */}
      <form
        onSubmit={handleSaveBanner}
        className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6"
      >
        <h3 className="text-sm font-semibold text-zinc-950">Novo Banner / Campanha</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Título</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Coleção Corrida 2026"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Posição</label>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value as any)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
            >
              <option value="hero">Banner Principal (Hero)</option>
              <option value="promo">Banner Promocional</option>
              <option value="campaign">Campanha Editorial</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Texto do Botão</label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">Subtítulo</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Descrição breve exibida sobre o banner"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-700">
              Imagem do Banner (Upload ou URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Faça upload ao lado ou cole o caminho"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-100"
              >
                <ImagePlus className="h-4 w-4" />
                Upload
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="hidden"
                onChange={(e) => handleBannerUpload(e.target.files?.[0])}
              />
            </div>
            {uploading && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
                <div className="h-full bg-lime-500" style={{ width: `${uploadPct}%` }} />
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || uploading || !imageUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? 'Publicando...' : 'Publicar Banner'}
          </button>
        </div>
      </form>

      {/* Banners List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {banners.map((b) => (
          <div key={b.id} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <div className="relative aspect-[16/9] bg-zinc-900">
              <img
                src={b.image_url}
                alt={b.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent p-4 flex flex-col justify-end text-white">
                <span className="text-[11px] uppercase tracking-wider text-lime-300">
                  {b.placement} · {b.is_active ? 'Ativo' : 'Oculto'}
                </span>
                <h4 className="text-base font-bold">{b.title}</h4>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 text-xs">
              <button
                type="button"
                onClick={() => toggleBannerActive(b)}
                className={`rounded-md px-3 py-1.5 font-medium ${
                  b.is_active
                    ? 'bg-zinc-950 text-lime-300'
                    : 'border border-zinc-300 text-zinc-700'
                }`}
              >
                {b.is_active ? 'Visível na Loja' : 'Ativar Banner'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteBanner(b.id)}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Site Sections Control */}
      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold text-zinc-950">
          Seções da Página Inicial (Títulos e Visibilidade)
        </h3>
        <div className="divide-y divide-zinc-100">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="grid grid-cols-1 items-center gap-4 py-4 md:grid-cols-12"
            >
              <div className="md:col-span-4">
                <label className="mb-1 block text-[11px] text-zinc-500">
                  Chave: {sec.section_key}
                </label>
                <input
                  type="text"
                  defaultValue={sec.title}
                  onBlur={(e) => {
                    if (e.target.value !== sec.title) {
                      handleSectionUpdate(sec, { title: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium"
                />
              </div>
              <div className="md:col-span-5">
                <label className="mb-1 block text-[11px] text-zinc-500">Subtítulo</label>
                <input
                  type="text"
                  defaultValue={sec.subtitle}
                  onBlur={(e) => {
                    if (e.target.value !== sec.subtitle) {
                      handleSectionUpdate(sec, { subtitle: e.target.value });
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
                />
              </div>
              <div className="flex items-center justify-end md:col-span-3">
                <button
                  type="button"
                  onClick={() => handleSectionUpdate(sec, { is_enabled: !sec.is_enabled })}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                    sec.is_enabled
                      ? 'bg-zinc-950 text-lime-300'
                      : 'border border-zinc-300 bg-zinc-50 text-zinc-600'
                  }`}
                >
                  {sec.is_enabled ? 'Seção Ativa' : 'Seção Desativada'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
