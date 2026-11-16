import React, { useMemo, useState } from 'react';
import { ArrowRight, Heart, Search, ShoppingBag, SlidersHorizontal, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatBRL, GENDER_LABELS, STYLE_LABELS } from '../../lib/format';
import type { Product } from '../../types/ecommerce';
import { SneakerFallback } from './SneakerFallback';

type ShowcaseTab = 'all' | 'highlights' | 'releases' | 'bestsellers' | 'offers' | 'recommended';

export function StorefrontHome() {
  const {
    products,
    brands,
    banners,
    siteSections,
    campaignVideos,
    storeLoading,
    setSelectedProduct,
    setCartOpen,
    cartCount,
    user,
    setPage,
    setAuthModalOpen,
    favoriteIds,
    toggleFavorite,
  } = useStore();

  const [showcaseTab, setShowcaseTab] = useState<ShowcaseTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(2000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const heroBanner = banners.find((b) => b.placement === 'hero') || banners[0];
  const promoBanner = banners.find((b) => b.placement === 'promo');

  const isSectionEnabled = (key: string) => {
    const found = siteSections.find((s) => s.section_key === key);
    return found ? found.is_enabled : true;
  };
  const getSectionMeta = (key: string, fallbackTitle: string, fallbackSub: string) => {
    const found = siteSections.find((s) => s.section_key === key);
    return {
      title: found?.title || fallbackTitle,
      subtitle: found?.subtitle || fallbackSub,
    };
  };

  // Available facet options derived dynamically from real products
  const availableSizes = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.variants.forEach((v) => set.add(v.size)));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [products]);

  const availableColors = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.variants.forEach((v) => set.add(v.color_name)));
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (showcaseTab === 'highlights' && !p.is_featured) return false;
      if (showcaseTab === 'releases' && !p.is_new_release) return false;
      if (showcaseTab === 'bestsellers' && !p.is_bestseller) return false;
      if (showcaseTab === 'offers' && !p.is_special_offer && !p.promo_price) return false;
      if (showcaseTab === 'recommended' && !p.is_recommended) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          (p.brand?.name || '').toLowerCase().includes(q) ||
          p.short_description.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (filterGender && p.gender !== filterGender && p.gender !== 'unissex') return false;
      if (filterStyle && p.style !== filterStyle) return false;
      if (filterBrand && p.brand_id !== filterBrand) return false;
      if (filterSize && !p.variants.some((v) => v.size === filterSize && v.stock_qty > 0)) {
        return false;
      }
      if (filterColor && !p.variants.some((v) => v.color_name === filterColor)) return false;

      const price = p.promo_price ?? p.original_price;
      if (price > maxPrice) return false;

      return true;
    });
  }, [
    products,
    showcaseTab,
    searchQuery,
    filterGender,
    filterStyle,
    filterBrand,
    filterSize,
    filterColor,
    maxPrice,
  ]);

  const scrollToCatalog = (genderPreset?: string, tabPreset?: ShowcaseTab) => {
    if (genderPreset !== undefined) setFilterGender(genderPreset);
    if (tabPreset) setShowcaseTab(tabPreset);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const renderProductCard = (product: Product) => {
    const primary = product.images.find((i) => i.is_primary) || product.images[0];
    const secondary = product.images.find((i) => i.id !== primary?.id);
    const effectivePrice = product.promo_price ?? product.original_price;
    const isFav = favoriteIds.includes(product.id);

    return (
      <article
        key={product.id}
        className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
      >
        <div
          onClick={() => setSelectedProduct(product)}
          className="relative aspect-[4/3] cursor-pointer overflow-hidden bg-zinc-100"
        >
          {primary ? (
            <>
              <img
                src={primary.public_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover transition-opacity duration-300 ${
                  secondary ? 'group-hover:opacity-0' : ''
                }`}
              />
              {secondary && (
                <img
                  src={secondary.public_url}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <SneakerFallback name={product.name} />
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            aria-label="Favoritar"
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-zinc-800 shadow-xs transition-colors hover:bg-zinc-950 hover:text-lime-300"
          >
            <Heart className="h-4 w-4" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
              <span>
                {product.brand?.name || 'PULSO'} · {GENDER_LABELS[product.gender]}
              </span>
              {product.promo_price ? (
                <span className="font-semibold text-lime-700">Oferta</span>
              ) : product.is_new_release ? (
                <span className="font-medium text-zinc-700">Lançamento</span>
              ) : null}
            </div>

            <h3
              onClick={() => setSelectedProduct(product)}
              className="mt-1.5 cursor-pointer font-display text-base font-semibold text-zinc-950 group-hover:underline"
            >
              {product.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {product.short_description}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-zinc-100 pt-4">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base font-bold tabular-nums text-zinc-950">
                {formatBRL(effectivePrice)}
              </span>
              {product.promo_price && (
                <span className="font-mono text-xs text-zinc-400 line-through tabular-nums">
                  {formatBRL(product.original_price)}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedProduct(product)}
              className="rounded-lg bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 whitespace-nowrap"
            >
              Comprar
            </button>
          </div>
        </div>
      </article>
    );
  };

  const catalogMeta = getSectionMeta(
    'catalog',
    'Coleção PULSO Sneakers',
    'Encontre o par ideal filtrando por marca, numeração, cor e estilo.'
  );

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {/* 3-Zone Top Navigation Contract */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          {/* Zone 1: Brand Wordmark */}
          <button
            type="button"
            onClick={() => {
              setFilterGender('');
              setShowcaseTab('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-xl font-extrabold tracking-tight text-zinc-950 whitespace-nowrap shrink-0"
          >
            PULSO<span className="text-lime-500">.</span>
          </button>

          {/* Zone 2: 5 concise single-line links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-600">
            <button
              type="button"
              onClick={() => scrollToCatalog('masculino', 'all')}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
            >
              Masculino
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('feminino', 'all')}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
            >
              Feminino
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('infantil', 'all')}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
            >
              Infantil
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('', 'releases')}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
            >
              Lançamentos
            </button>
            <button
              type="button"
              onClick={() => scrollToCatalog('', 'offers')}
              className="hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
            >
              Ofertas
            </button>
          </nav>

          {/* Zone 3: Compact Primary Action Cluster */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFiltersOpen(true);
                scrollToCatalog();
              }}
              aria-label="Pesquisar"
              className="rounded-lg p-2 text-zinc-700 hover:bg-zinc-100"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (!user) setAuthModalOpen(true);
                else setPage('account');
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50 whitespace-nowrap shrink-0"
            >
              <User className="h-3.5 w-3.5" />
              {user ? 'Minha Conta' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="font-mono tabular-nums">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: Hero Banner (Admin Managed) */}
      {isSectionEnabled('hero') && heroBanner && (
        <section className="relative overflow-hidden bg-zinc-950 text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-stretch lg:grid-cols-12">
            <div className="flex flex-col justify-center px-6 py-16 lg:col-span-6 lg:py-24">
              <p className="text-xs font-medium tracking-wide text-lime-400">
                PULSO Sneakers · Seu estilo. Seu ritmo.
              </p>
              <h1
                className="mt-3 font-display text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                {heroBanner.title}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-300">
                {heroBanner.subtitle}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => scrollToCatalog()}
                  className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-6 py-3 text-xs font-bold text-zinc-950 transition-colors hover:bg-lime-300"
                >
                  {heroBanner.cta_label || 'Explorar Coleção'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToCatalog('', 'offers')}
                  className="rounded-lg border border-zinc-700 px-5 py-3 text-xs font-medium text-white transition-colors hover:border-zinc-500"
                >
                  Ofertas Especiais
                </button>
              </div>
            </div>

            <div className="relative min-h-[300px] lg:col-span-6">
              <img
                src={heroBanner.image_url}
                alt={heroBanner.title}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-transparent to-transparent lg:block hidden" />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: Catalog, Search & Multi-Facet Filters */}
      {isSectionEnabled('catalog') && (
        <section id="catalogo" className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-zinc-200 pb-6">
            <div>
              <p className="text-xs font-medium text-zinc-500">{catalogMeta.subtitle}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-zinc-950 sm:text-3xl">
                {catalogMeta.title}
              </h2>
            </div>

            {/* Segmented Showcase Tabs */}
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'highlights', label: 'Destaques' },
                { id: 'releases', label: 'Lançamentos' },
                { id: 'bestsellers', label: 'Mais Vendidos' },
                { id: 'offers', label: 'Ofertas' },
                { id: 'recommended', label: 'Recomendados' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setShowcaseTab(tab.id as ShowcaseTab)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    showcaseTab === tab.id
                      ? 'bg-white text-zinc-950 shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar tênis por modelo, marca ou estilo..."
                  className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-4 text-sm focus:border-zinc-950 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setFiltersOpen((o) => !o)}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 whitespace-nowrap"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </button>

              {(filterGender || filterStyle || filterBrand || filterSize || filterColor || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterGender('');
                    setFilterStyle('');
                    setFilterBrand('');
                    setFilterSize('');
                    setFilterColor('');
                    setMaxPrice(2000);
                    setShowcaseTab('all');
                  }}
                  className="text-xs font-medium text-zinc-600 underline"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filtersOpen && (
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2 lg:grid-cols-6">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Categoria / Público
                  </label>
                  <select
                    value={filterGender}
                    onChange={(e) => setFilterGender(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Todos</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                    <option value="infantil">Infantil</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Estilo</label>
                  <select
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Todos</option>
                    <option value="esportivo">Esportivo</option>
                    <option value="casual">Casual</option>
                    <option value="urbano">Urbano</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Marca</label>
                  <select
                    value={filterBrand}
                    onChange={(e) => setFilterBrand(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Todas</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Tamanho
                  </label>
                  <select
                    value={filterSize}
                    onChange={(e) => setFilterSize(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                  >
                    <option value="">Todos</option>
                    {availableSizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">Cor</label>
                  <select
                    value={filterColor}
                    onChange={(e) => setFilterColor(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs"
                  >
                    <option value="">Todas</option>
                    {availableColors.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Preço até {formatBRL(maxPrice)}
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={2000}
                    step={50}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="mt-2 w-full accent-zinc-950"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3-Column Product Grid */}
          {storeLoading ? (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-80 animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"
                />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-12 text-center">
              <p className="text-sm font-medium text-zinc-700">
                Nenhum tênis encontrado para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredProducts.map(renderProductCard)}
            </div>
          )}
        </section>
      )}

      {/* SECTION 3: Editorial Promo & Promotional Videos */}
      {(promoBanner || (isSectionEnabled('videos') && campaignVideos.length > 0)) && (
        <section className="border-t border-zinc-200 bg-zinc-50 py-16">
          <div className="mx-auto max-w-7xl px-6 space-y-12">
            {promoBanner && (
              <div className="grid grid-cols-1 items-stretch overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:grid-cols-12">
                <div className="aspect-[16/9] lg:aspect-auto lg:col-span-7">
                  <img
                    src={promoBanner.image_url}
                    alt={promoBanner.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center p-8 lg:col-span-5 lg:p-12">
                  <span className="text-xs font-medium text-zinc-500">
                    Envio Direto · Curadoria PULSO
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-bold text-zinc-950">
                    {promoBanner.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                    {promoBanner.subtitle}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {brands.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setFilterBrand(b.id);
                          setFiltersOpen(true);
                          scrollToCatalog();
                        }}
                        className="rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-semibold text-zinc-900 hover:bg-zinc-950 hover:text-lime-300 transition-colors"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isSectionEnabled('videos') && campaignVideos.length > 0 && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-medium text-zinc-500">
                    {getSectionMeta('videos', 'Vídeos Promocionais', 'Campanhas e Demonstrações').subtitle}
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-zinc-950">
                    {getSectionMeta('videos', 'Vídeos Promocionais', 'Campanhas e Demonstrações').title}
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {campaignVideos.map((vid) => {
                    const linkedProd = products.find((p) => p.id === vid.product_id);
                    return (
                      <div
                        key={vid.id}
                        className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                      >
                        <video
                          src={vid.public_url}
                          controls
                          preload="metadata"
                          className="aspect-video w-full bg-zinc-950 object-cover"
                        />
                        <div className="flex items-center justify-between p-4 text-xs">
                          <span className="font-semibold text-zinc-900 truncate">{vid.title}</span>
                          {linkedProd && (
                            <button
                              type="button"
                              onClick={() => setSelectedProduct(linkedProd)}
                              className="shrink-0 font-semibold text-zinc-950 underline"
                            >
                              Ver Tênis
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Clean Footer */}
      <footer className="border-t border-zinc-200 bg-zinc-950 py-12 text-zinc-400">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 md:flex-row md:items-center">
          <div>
            <div className="font-display text-lg font-extrabold text-white">
              PULSO<span className="text-lime-400">.</span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Seu estilo. Seu ritmo. · Tênis esportivos, casuais, urbanos e premium.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <button type="button" onClick={() => scrollToCatalog('masculino')} className="hover:text-white">
              Masculino
            </button>
            <button type="button" onClick={() => scrollToCatalog('feminino')} className="hover:text-white">
              Feminino
            </button>
            <button type="button" onClick={() => scrollToCatalog('infantil')} className="hover:text-white">
              Infantil
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
