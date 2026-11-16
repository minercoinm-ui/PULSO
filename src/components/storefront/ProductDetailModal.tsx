import React, { useEffect, useState } from 'react';
import { Heart, ShoppingBag, Truck, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatBRL, GENDER_LABELS, STYLE_LABELS } from '../../lib/format';
import { SneakerFallback } from './SneakerFallback';

export function ProductDetailModal() {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    favoriteIds,
    toggleFavorite,
  } = useStore();

  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');

  useEffect(() => {
    if (!selectedProduct) return;
    setActiveMediaIdx(0);
    const available = selectedProduct.variants.filter((v) => v.is_available && v.stock_qty > 0);
    const first = available[0] || selectedProduct.variants[0];
    setSelectedColor(first?.color_name || '');
    setSelectedVariantId(first?.id || '');
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const isFav = favoriteIds.includes(selectedProduct.id);
  const mediaItems = [
    ...selectedProduct.images.map((img) => ({ type: 'image' as const, url: img.public_url, id: img.id })),
    ...selectedProduct.videos.map((vid) => ({ type: 'video' as const, url: vid.public_url, id: vid.id })),
  ];
  const activeMedia = mediaItems[activeMediaIdx];

  const uniqueColors = Array.from(
    new Map(
      selectedProduct.variants.map((v) => [
        v.color_name,
        { color_name: v.color_name, color_hex: v.color_hex },
      ])
    ).values()
  );

  const variantsForColor = selectedProduct.variants.filter(
    (v) => !selectedColor || v.color_name === selectedColor
  );
  const chosenVariant =
    selectedProduct.variants.find((v) => v.id === selectedVariantId) || variantsForColor[0];

  const effectivePrice = selectedProduct.promo_price ?? selectedProduct.original_price;
  const discountPct =
    selectedProduct.promo_price && selectedProduct.original_price > 0
      ? Math.round(
          ((selectedProduct.original_price - selectedProduct.promo_price) /
            selectedProduct.original_price) *
            100
        )
      : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4 backdrop-blur-xs">
      <div className="mx-auto my-6 max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>{selectedProduct.brand?.name || 'PULSO'}</span>
            <span>·</span>
            <span>{GENDER_LABELS[selectedProduct.gender]}</span>
            <span>·</span>
            <span>{STYLE_LABELS[selectedProduct.style]}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedProduct(null)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Sticky Gallery (Photos + Videos) */}
          <div className="bg-zinc-50 p-6 lg:col-span-7">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-zinc-200 bg-white">
              {activeMedia ? (
                activeMedia.type === 'image' ? (
                  <img
                    src={activeMedia.url}
                    alt={selectedProduct.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <video
                    src={activeMedia.url}
                    controls
                    preload="metadata"
                    className="h-full w-full bg-black object-cover"
                  />
                )
              ) : (
                <SneakerFallback name={selectedProduct.name} />
              )}
            </div>

            {mediaItems.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {mediaItems.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                      idx === activeMediaIdx ? 'border-zinc-950' : 'border-transparent opacity-70'
                    }`}
                  >
                    {m.type === 'image' ? (
                      <img
                        src={m.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-900 text-[10px] font-semibold text-lime-300">
                        VÍDEO
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="flex flex-col justify-between p-6 lg:col-span-5 lg:p-8">
            <div className="space-y-5">
              <div>
                <h1 className="font-display text-2xl font-bold text-zinc-950">
                  {selectedProduct.name}
                </h1>
                <p className="mt-1 text-xs text-zinc-500 font-mono">SKU {selectedProduct.sku}</p>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-bold tabular-nums text-zinc-950">
                  {formatBRL(effectivePrice)}
                </span>
                {selectedProduct.promo_price && (
                  <>
                    <span className="font-mono text-sm text-zinc-400 line-through tabular-nums">
                      {formatBRL(selectedProduct.original_price)}
                    </span>
                    <span className="text-xs font-semibold text-lime-700">
                      -{discountPct}%
                    </span>
                  </>
                )}
              </div>

              <p className="text-sm leading-relaxed text-zinc-600">
                {selectedProduct.description || selectedProduct.short_description}
              </p>

              {/* Color Swatches */}
              {uniqueColors.length > 0 && (
                <div>
                  <span className="mb-2 block text-xs font-semibold text-zinc-900">
                    Cor: {selectedColor}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {uniqueColors.map((c) => (
                      <button
                        key={c.color_name}
                        type="button"
                        onClick={() => {
                          setSelectedColor(c.color_name);
                          const match = selectedProduct.variants.find(
                            (v) => v.color_name === c.color_name && v.stock_qty > 0
                          );
                          if (match) setSelectedVariantId(match.id);
                        }}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium ${
                          selectedColor === c.color_name
                            ? 'border-zinc-950 bg-zinc-950 text-white'
                            : 'border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400'
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border border-zinc-300"
                          style={{ backgroundColor: c.color_hex }}
                        />
                        {c.color_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div>
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-900">Numeração</span>
                  {chosenVariant && (
                    <span className="font-mono text-zinc-500 tabular-nums">
                      {chosenVariant.stock_qty > 0
                        ? `${chosenVariant.stock_qty} disponíveis`
                        : 'Indisponível'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {variantsForColor.map((v) => {
                    const out = !v.is_available || v.stock_qty <= 0;
                    const active = chosenVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={out}
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`rounded-lg border py-2.5 font-mono text-xs font-semibold transition-colors ${
                          active
                            ? 'border-zinc-950 bg-zinc-950 text-lime-300'
                            : out
                            ? 'border-zinc-100 bg-zinc-50 text-zinc-300 line-through'
                            : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-950'
                        }`}
                      >
                        {v.size}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-600">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-800" />
                <span>{selectedProduct.delivery_info}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 pt-4 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => toggleFavorite(selectedProduct.id)}
                className={`inline-flex items-center justify-center rounded-lg border p-3 transition-colors ${
                  isFav
                    ? 'border-zinc-950 bg-zinc-950 text-lime-300'
                    : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
                aria-label="Favoritar produto"
              >
                <Heart className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} />
              </button>

              <button
                type="button"
                disabled={
                  !chosenVariant ||
                  !chosenVariant.is_available ||
                  chosenVariant.stock_qty <= 0 ||
                  selectedProduct.stock_status === 'out_of_stock'
                }
                onClick={() => {
                  if (chosenVariant) {
                    addToCart(selectedProduct, chosenVariant, 1);
                    setSelectedProduct(null);
                  }
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-zinc-950 py-3.5 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
              >
                <ShoppingBag className="h-4 w-4" />
                {selectedProduct.stock_status === 'out_of_stock'
                  ? 'Produto Indisponível'
                  : 'Comprar Agora'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
