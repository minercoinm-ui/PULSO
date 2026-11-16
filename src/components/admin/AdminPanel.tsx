import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  LayoutDashboard,
  LayoutTemplate,
  Package,
  ShoppingBag,
  Tag,
  Truck,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { formatBRL, formatDateBR, ORDER_STATUS_LABELS } from '../../lib/format';
import type {
  AdminCustomerSummary,
  Banner,
  Brand,
  Category,
  Coupon,
  DashboardMetrics,
  Order,
  Product,
  SiteSection,
  Supplier,
  SupplierProduct,
} from '../../types/ecommerce';
import { AdminBannersSections } from './AdminBannersSections';
import { AdminCoupons } from './AdminCoupons';
import { AdminCustomers } from './AdminCustomers';
import { AdminOrders } from './AdminOrders';
import { AdminProducts } from './AdminProducts';
import { AdminSuppliers } from './AdminSuppliers';

type AdminTab = 'dashboard' | 'products' | 'content' | 'suppliers' | 'orders' | 'customers' | 'coupons';

export function AdminPanel() {
  const { user, setPage, refreshStorefront, setAuthModalOpen, systemStatus } = useStore();
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierLinks, setSupplierLinks] = useState<SupplierProduct[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  const loadAdminData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    setLoading(true);
    setError(null);
    try {
      const [dash, prodRes, contentRes, supRes, ordRes, custRes, coupRes] = await Promise.all([
        apiRequest<DashboardMetrics>('/api/admin/dashboard'),
        apiRequest<{ products: Product[]; brands: Brand[]; categories: Category[] }>(
          '/api/admin/products'
        ),
        apiRequest<{ banners: Banner[]; sections: SiteSection[] }>('/api/admin/content'),
        apiRequest<{ suppliers: Supplier[]; links: SupplierProduct[] }>('/api/admin/suppliers'),
        apiRequest<{ orders: Order[] }>('/api/admin/orders'),
        apiRequest<{ customers: AdminCustomerSummary[] }>('/api/admin/customers'),
        apiRequest<{ coupons: Coupon[] }>('/api/admin/coupons'),
      ]);
      setMetrics(dash);
      setProducts(prodRes.products);
      setBrands(prodRes.brands);
      setCategories(prodRes.categories);
      setBanners(contentRes.banners);
      setSections(contentRes.sections);
      setSuppliers(supRes.suppliers);
      setSupplierLinks(supRes.links);
      setOrders(ordRes.orders);
      setCustomers(custRes.customers);
      setCoupons(coupRes.coupons);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do painel.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-bold text-zinc-950">Área Administrativa Restrita</h1>
        <p className="mt-2 text-sm text-zinc-600">
          O acesso ao painel de gerenciamento é protegido por autenticação e controle de permissões (RBAC).
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage('storefront')}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Voltar à Loja
          </button>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
          >
            Entrar como Administrador
          </button>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'products', label: 'Produtos & Mídias', icon: <Package className="h-4 w-4" /> },
    { id: 'content', label: 'Banners & Seções', icon: <LayoutTemplate className="h-4 w-4" /> },
    { id: 'suppliers', label: 'Fornecedores', icon: <Truck className="h-4 w-4" /> },
    { id: 'orders', label: 'Pedidos', icon: <ShoppingBag className="h-4 w-4" /> },
    { id: 'customers', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { id: 'coupons', label: 'Cupons', icon: <Tag className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950">
      {/* Left Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-zinc-950 p-5 text-white lg:flex">
        <div className="space-y-8">
          <div>
            <div className="font-display text-xl font-extrabold tracking-tight text-white">
              PULSO<span className="text-lime-400">.</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-400">Painel Administrativo</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-lime-400 text-zinc-950 font-semibold'
                    : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-3 border-t border-zinc-800 pt-4">
          <div className="text-[11px] text-zinc-400">
            <div className="font-medium text-zinc-200">{user.full_name}</div>
            <div className="truncate">{user.email}</div>
            <div className="mt-1 text-zinc-500">
              Infra: {systemStatus?.supabase_configured ? 'Supabase Cloud' : 'Persistência Local'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPage('storefront')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Ver Loja Virtual
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              PULSO Admin /{' '}
              <strong className="text-zinc-950">
                {navItems.find((i) => i.id === tab)?.label}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-zinc-950 text-lime-300'
                    : 'bg-zinc-100 text-zinc-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPage('storefront')}
            className="rounded-lg border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
          >
            Abrir Vitrine Pública
          </button>
        </header>

        <main className="mx-auto max-w-6xl p-6">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {loading && !metrics ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-white"
                />
              ))}
            </div>
          ) : (
            <>
              {tab === 'dashboard' && metrics && (
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-950">Visão Geral da Operação</h2>
                    <p className="text-xs text-zinc-500">
                      Indicadores consolidados de vendas, catálogo, estoque e despacho direto.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="text-xs font-medium text-zinc-500">Faturamento Confirmado</div>
                      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">
                        {formatBRL(metrics.paid_revenue)}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500 font-mono tabular-nums">
                        Bruto em pedidos: {formatBRL(metrics.total_revenue)}
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="text-xs font-medium text-zinc-500">Vendas & Pedidos</div>
                      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">
                        {metrics.total_sales_count} vendas · {metrics.orders_received} pedidos
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        {metrics.pending_supplier_dispatch} aguardando envio ao fornecedor
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="text-xs font-medium text-zinc-500">Clientes Cadastrados</div>
                      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">
                        {metrics.registered_customers}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Contas ativas na loja virtual
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="text-xs font-medium text-zinc-500">Produtos Publicados</div>
                      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">
                        {metrics.published_products} / {metrics.total_products}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Visíveis automaticamente na vitrine
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="text-xs font-medium text-zinc-500">
                        Produtos Sem Disponibilidade
                      </div>
                      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-zinc-950">
                        {metrics.out_of_stock_products}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Itens com grade esgotada ou pausada
                      </div>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-950 p-5 text-white">
                      <div className="text-xs font-medium text-zinc-400">Ação Rápida</div>
                      <div className="mt-2 text-sm font-semibold">
                        Enviar fotografias e vídeos reais dos tênis
                      </div>
                      <button
                        type="button"
                        onClick={() => setTab('products')}
                        className="mt-3 rounded-lg bg-lime-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-lime-300"
                      >
                        Abrir Gerenciador de Mídias
                      </button>
                    </div>
                  </div>

                  {/* Recent Orders */}
                  <div className="rounded-xl border border-zinc-200 bg-white">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
                      <h3 className="text-sm font-semibold text-zinc-950">Pedidos Recentes</h3>
                      <button
                        type="button"
                        onClick={() => setTab('orders')}
                        className="text-xs font-medium text-zinc-700 underline"
                      >
                        Ver todos
                      </button>
                    </div>
                    {metrics.recent_orders.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500">
                        Nenhum pedido registrado até o momento.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="border-b border-zinc-100 text-zinc-500">
                            <tr>
                              <th className="px-5 py-3 font-medium">Pedido</th>
                              <th className="px-5 py-3 font-medium">Cliente</th>
                              <th className="px-5 py-3 font-medium">Status</th>
                              <th className="px-5 py-3 font-medium">Data</th>
                              <th className="px-5 py-3 font-medium text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {metrics.recent_orders.map((ord) => (
                              <tr key={ord.id}>
                                <td className="px-5 py-3 font-mono font-semibold">
                                  {ord.order_number}
                                </td>
                                <td className="px-5 py-3">{ord.customer_name}</td>
                                <td className="px-5 py-3">{ORDER_STATUS_LABELS[ord.status]}</td>
                                <td className="px-5 py-3 font-mono text-zinc-500">
                                  {formatDateBR(ord.created_at)}
                                </td>
                                <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                                  {formatBRL(ord.total)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'products' && (
                <AdminProducts
                  products={products}
                  brands={brands}
                  categories={categories}
                  onRefresh={loadAdminData}
                  onStorefrontSync={refreshStorefront}
                />
              )}

              {tab === 'content' && (
                <AdminBannersSections
                  banners={banners}
                  sections={sections}
                  onRefresh={loadAdminData}
                  onStorefrontSync={refreshStorefront}
                />
              )}

              {tab === 'suppliers' && (
                <AdminSuppliers
                  suppliers={suppliers}
                  links={supplierLinks}
                  products={products}
                  onRefresh={loadAdminData}
                />
              )}

              {tab === 'orders' && (
                <AdminOrders
                  orders={orders}
                  suppliers={suppliers}
                  onRefresh={loadAdminData}
                />
              )}

              {tab === 'customers' && <AdminCustomers customers={customers} />}

              {tab === 'coupons' && (
                <AdminCoupons coupons={coupons} onRefresh={loadAdminData} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
