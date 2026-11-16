import React, { useState } from 'react';
import { Edit3, Plus, Search, Trash2, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatBRL, GENDER_LABELS, STYLE_LABELS } from '../../lib/format';
import type { Brand, Category, GenderType, Product, StockStatus, StyleType } from '../../types/ecommerce';
import { AdminMediaUploader } from './AdminMediaUploader';

interface AdminProductsProps {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  onRefresh: () => Promise<void>;
  onStorefrontSync: () => Promise<void>;
}

interface VariantDraft {
  id?: string;
  size: string;
  color_name: string;
  color_hex: string;
  stock_qty: number;
  is_available: boolean;
}

export function AdminProducts({
  products,
  brands,
  categories,
  onRefresh,
  onStorefrontSync,
}: AdminProductsProps) {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [brandId, setBrandId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('599.90');
  const [promoPrice, setPromoPrice] = useState('');
  const [gender, setGender] = useState<GenderType>('masculino');
  const [style, setStyle] = useState<StyleType>('esportivo');
  const [deliveryInfo, setDeliveryInfo] = useState(
    'Envio direto do fornecedor homologado. Prazo estimado de 3 a 7 dias úteis.'
  );
  const [stockStatus, setStockStatus] = useState<StockStatus>('in_stock');
  const [isFeatured, setIsFeatured] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNewRelease, setIsNewRelease] = useState(true);
  const [isSpecialOffer, setIsSpecialOffer] = useState(false);
  const [isRecommended, setIsRecommended] = useState(true);
  const [isPublished, setIsPublished] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([
    { size: '39', color_name: 'Preto / Lima', color_hex: '#0A0A0A', stock_qty: 10, is_available: true },
    { size: '40', color_name: 'Preto / Lima', color_hex: '#0A0A0A', stock_qty: 10, is_available: true },
    { size: '41', color_name: 'Preto / Lima', color_hex: '#0A0A0A', stock_qty: 8, is_available: true },
  ]);

  // Quick Brand / Category creation
  const [newBrandName, setNewBrandName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openNewForm = () => {
    setEditing(null);
    setCreating(true);
    setName('');
    setSku(`PLS-${Math.floor(1000 + Math.random() * 9000)}`);
    setBrandId(brands[0]?.id || '');
    setCategoryId(categories[0]?.id || '');
    setShortDesc('');
    setDescription('');
    setOriginalPrice('699.90');
    setPromoPrice('');
    setGender('masculino');
    setStyle('esportivo');
    setDeliveryInfo('Envio direto do fornecedor homologado. Prazo estimado de 3 a 7 dias úteis.');
    setStockStatus('in_stock');
    setIsFeatured(true);
    setIsBestseller(false);
    setIsNewRelease(true);
    setIsSpecialOffer(false);
    setIsRecommended(true);
    setIsPublished(true);
    setVariants([
      { size: '39', color_name: 'Preto', color_hex: '#0A0A0A', stock_qty: 10, is_available: true },
      { size: '40', color_name: 'Preto', color_hex: '#0A0A0A', stock_qty: 10, is_available: true },
    ]);
    setFeedback(null);
    setError(null);
  };

  const openEditForm = (product: Product) => {
    setCreating(false);
    setEditing(product);
    setName(product.name);
    setSku(product.sku);
    setBrandId(product.brand_id || '');
    setCategoryId(product.category_id || '');
    setShortDesc(product.short_description);
    setDescription(product.description);
    setOriginalPrice(String(product.original_price));
    setPromoPrice(product.promo_price ? String(product.promo_price) : '');
    setGender(product.gender);
    setStyle(product.style);
    setDeliveryInfo(product.delivery_info);
    setStockStatus(product.stock_status);
    setIsFeatured(product.is_featured);
    setIsBestseller(product.is_bestseller);
    setIsNewRelease(product.is_new_release);
    setIsSpecialOffer(product.is_special_offer);
    setIsRecommended(product.is_recommended);
    setIsPublished(product.is_published);
    setVariants(
      product.variants.map((v) => ({
        id: v.id,
        size: v.size,
        color_name: v.color_name,
        color_hex: v.color_hex,
        stock_qty: v.stock_qty,
        is_available: v.is_available,
      }))
    );
    setFeedback(null);
    setError(null);
  };

  const closeEditor = () => {
    setCreating(false);
    setEditing(null);
  };

  const handleCreateBrand = async () => {
    if (!newBrandName.trim()) return;
    try {
      const res = await apiRequest<{ brand: Brand }>('/api/admin/brands', {
        method: 'POST',
        body: JSON.stringify({ name: newBrandName.trim() }),
      });
      setBrandId(res.brand.id);
      setNewBrandName('');
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await apiRequest<{ category: Category }>('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: newCategoryName.trim(), gender, style }),
      });
      setCategoryId(res.category.id);
      setNewCategoryName('');
      await onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    if (!name.trim() || !sku.trim()) {
      setError('Nome e SKU do tênis são obrigatórios.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim(),
        brand_id: brandId || null,
        category_id: categoryId || null,
        short_description: shortDesc.trim(),
        description: description.trim(),
        original_price: Number(originalPrice),
        promo_price: promoPrice ? Number(promoPrice) : null,
        gender,
        style,
        delivery_info: deliveryInfo.trim(),
        stock_status: stockStatus,
        is_featured: isFeatured,
        is_bestseller: isBestseller,
        is_new_release: isNewRelease,
        is_special_offer: isSpecialOffer,
        is_recommended: isRecommended,
        is_published: isPublished,
        variants,
      };

      const res = editing
        ? await apiRequest<{ product: Product }>(`/api/admin/products/${editing.id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiRequest<{ product: Product }>('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      setEditing(res.product);
      setCreating(false);
      setFeedback('Produto salvo com sucesso. Agora você pode enviar ou organizar fotos e vídeos abaixo.');
      await onRefresh();
      await onStorefrontSync();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (editing?.id === id) closeEditor();
    await onRefresh();
    await onStorefrontSync();
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  // Keep active editing product synced after media upload
  const currentEditingProduct = editing
    ? products.find((p) => p.id === editing.id) || editing
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-950">Produtos & Mídias</h2>
          <p className="text-xs text-zinc-500">
            Cadastre modelos, numerações, preços, descontos e faça upload de fotos e vídeos reais.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2.5 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          Novo Tênis
        </button>
      </div>

      {/* Product Editor Panel */}
      {(creating || currentEditingProduct) && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between border-b border-zinc-100 pb-4">
            <h3 className="text-lg font-semibold text-zinc-950">
              {currentEditingProduct
                ? `Editando: ${currentEditingProduct.name}`
                : 'Cadastrar Novo Tênis'}
            </h3>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-700">
              {error}
            </div>
          )}
          {feedback && (
            <div className="mb-4 rounded-lg border border-lime-300 bg-lime-50 px-4 py-2.5 text-xs text-zinc-900">
              {feedback}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-zinc-700">Nome do Tênis</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Pulso Pace Carbon Pro"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-950 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">SKU Principal</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase focus:border-zinc-950 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Marca</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar marca</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Nova marca..."
                    className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateBrand}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar categoria</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 flex gap-1">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nova categoria..."
                    className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="rounded bg-zinc-900 px-2 py-1 text-xs font-medium text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Público</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderType)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="infantil">Infantil</option>
                  <option value="unissex">Unissex</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Estilo</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value as StyleType)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="esportivo">Esportivo</option>
                  <option value="casual">Casual</option>
                  <option value="urbano">Urbano</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Preço Original (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Preço Promocional (R$) — opcional
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={promoPrice}
                  onChange={(e) => setPromoPrice(e.target.value)}
                  placeholder="Deixe vazio se sem desconto"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Disponibilidade
                </label>
                <select
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="in_stock">Disponível em Estoque</option>
                  <option value="supplier_dispatch">Envio Direto pelo Fornecedor</option>
                  <option value="out_of_stock">Sem Disponibilidade</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Resumo Curto</label>
                <input
                  type="text"
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  placeholder="Frase curta para cartão e subtítulo"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">
                  Informações de Entrega
                </label>
                <input
                  type="text"
                  value={deliveryInfo}
                  onChange={(e) => setDeliveryInfo(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">
                Descrição Completa
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes técnicos de cabedal, entressola, solado e indicação de uso..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>

            {/* Variants (Numerações & Cores) */}
            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900">
                  Numerações, Cores e Estoque
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setVariants((prev) => [
                      ...prev,
                      {
                        size: '41',
                        color_name: 'Preto',
                        color_hex: '#0A0A0A',
                        stock_qty: 5,
                        is_available: true,
                      },
                    ])
                  }
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  + Adicionar Numeração
                </button>
              </div>

              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 items-center gap-2 rounded-lg border border-zinc-200 bg-white p-2"
                  >
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={v.size}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, size: e.target.value } : item))
                          )
                        }
                        placeholder="Tam."
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-xs font-mono"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={v.color_name}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, color_name: e.target.value } : item
                            )
                          )
                        }
                        placeholder="Nome da cor"
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      <input
                        type="color"
                        value={v.color_hex}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, color_hex: e.target.value } : item
                            )
                          )
                        }
                        className="h-7 w-8 cursor-pointer rounded border border-zinc-200"
                      />
                      <span className="hidden text-[10px] font-mono text-zinc-500 xl:inline">
                        {v.color_hex}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={0}
                        value={v.stock_qty}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, stock_qty: Number(e.target.value) } : item
                            )
                          )
                        }
                        className="w-full rounded border border-zinc-200 px-2 py-1 font-mono text-xs tabular-nums"
                      />
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <label className="flex items-center gap-1 text-[11px] text-zinc-600">
                        <input
                          type="checkbox"
                          checked={v.is_available}
                          onChange={(e) =>
                            setVariants((prev) =>
                              prev.map((item, i) =>
                                i === idx ? { ...item, is_available: e.target.checked } : item
                              )
                            )
                          }
                        />
                        Ativo
                      </label>
                      <button
                        type="button"
                        onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visibility & Showcase Checkboxes */}
            <div className="flex flex-wrap gap-4 border-t border-zinc-100 pt-4 text-xs text-zinc-800">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Publicado na Loja Virtual
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                />
                Destaque na Home
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isNewRelease}
                  onChange={(e) => setIsNewRelease(e.target.checked)}
                />
                Lançamento
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isBestseller}
                  onChange={(e) => setIsBestseller(e.target.checked)}
                />
                Mais Vendido
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSpecialOffer}
                  onChange={(e) => setIsSpecialOffer(e.target.checked)}
                />
                Oferta Especial
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isRecommended}
                  onChange={(e) => setIsRecommended(e.target.checked)}
                />
                Recomendado
              </label>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : currentEditingProduct ? 'Salvar Alterações' : 'Criar Produto e Liberar Mídias'}
              </button>
            </div>
          </form>

          {/* PRIORITY: Photo & Video Uploader */}
          <AdminMediaUploader
            productId={currentEditingProduct?.id || null}
            images={currentEditingProduct?.images || []}
            videos={currentEditingProduct?.videos || []}
            onRefresh={async () => {
              await onRefresh();
              await onStorefrontSync();
            }}
          />
        </div>
      )}

      {/* Search & Products Table */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-200 p-4">
          <Search className="h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, marca ou SKU..."
            className="w-full text-sm focus:outline-none"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Público / Estilo</th>
                <th className="px-4 py-3 font-medium">Mídias</th>
                <th className="px-4 py-3 font-medium text-right">Preço</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((p) => {
                const primary = p.images.find((i) => i.is_primary) || p.images[0];
                const totalStock = p.variants.reduce((s, v) => s + v.stock_qty, 0);
                return (
                  <tr key={p.id} className="hover:bg-zinc-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-14 shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-100">
                          {primary ? (
                            <img
                              src={primary.public_url}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                              Sem foto
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-950">{p.name}</div>
                          <div className="text-zinc-500">{p.brand?.name || 'Sem marca'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600">{p.sku}</td>
                    <td className="px-4 py-3 text-zinc-600">
                      {GENDER_LABELS[p.gender]} · {STYLE_LABELS[p.style]}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-zinc-600">
                      {p.images.length} fotos · {p.videos.length} vídeos
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {p.promo_price ? (
                        <div>
                          <div className="font-semibold text-zinc-950">
                            {formatBRL(p.promo_price)}
                          </div>
                          <div className="text-[11px] text-zinc-400 line-through">
                            {formatBRL(p.original_price)}
                          </div>
                        </div>
                      ) : (
                        <span className="font-semibold text-zinc-950">
                          {formatBRL(p.original_price)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-zinc-800 font-medium">
                        {p.is_published ? 'Publicado' : 'Rascunho'}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono tabular-nums">
                        {totalStock} un. ({p.variants.length} grades)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditForm(p)}
                          className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Editar / Mídias
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded p-1.5 text-red-600 hover:bg-red-50"
                          title="Excluir produto"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
