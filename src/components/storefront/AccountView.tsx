import React, { useEffect, useState } from 'react';
import { ArrowLeft, Heart, LogOut, MapPin, Package, Plus, Trash2, User } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { formatBRL, formatDateBR, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../../lib/format';
import type { Address, Order } from '../../types/ecommerce';
import { SneakerFallback } from './SneakerFallback';

type AccountTab = 'orders' | 'addresses' | 'favorites' | 'profile';

export function AccountView() {
  const {
    user,
    logout,
    setPage,
    refreshProfile,
    products,
    favoriteIds,
    toggleFavorite,
    setSelectedProduct,
  } = useStore();

  const [tab, setTab] = useState<AccountTab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Profile form
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false);

  // New Address form
  const [label, setLabel] = useState('Casa');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name);
    setPhone(user.phone || '');
    apiRequest<{ orders: Order[] }>('/api/customer/orders')
      .then((res) => setOrders(res.orders))
      .catch(() => null);
    apiRequest<{ addresses: Address[] }>('/api/customer/addresses')
      .then((res) => setAddresses(res.addresses))
      .catch(() => null);
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        <p className="text-sm text-zinc-600">Faça login para acessar sua conta.</p>
        <button
          type="button"
          onClick={() => setPage('storefront')}
          className="mt-4 rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-lime-300"
        >
          Voltar à Loja
        </button>
      </div>
    );
  }

  const favoriteProducts = products.filter((p) => favoriteIds.includes(p.id));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ full_name: fullName, phone }),
    });
    await refreshProfile();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiRequest<{ address: Address }>('/api/customer/addresses', {
      method: 'POST',
      body: JSON.stringify({
        label,
        recipient_name: user.full_name,
        zip_code: zipCode,
        street,
        number,
        neighborhood,
        city,
        state: stateUf,
        is_default: addresses.length === 0,
      }),
    });
    setAddresses((prev) => [...prev, res.address]);
    setZipCode('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setCity('');
    setStateUf('');
  };

  const handleDeleteAddress = async (id: string) => {
    await apiRequest(`/api/customer/addresses/${id}`, { method: 'DELETE' });
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <button
            type="button"
            onClick={() => setPage('storefront')}
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar à Vitrine
          </button>
          <h1 className="font-display text-2xl font-bold text-zinc-950">
            Olá, {user.full_name}
          </h1>
          <p className="text-xs text-zinc-500">{user.email}</p>
        </div>

        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => setPage('admin')}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300"
            >
              Abrir Painel Admin
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-200 pb-4">
        {[
          { id: 'orders', label: 'Meus Pedidos', icon: <Package className="h-4 w-4" /> },
          { id: 'addresses', label: 'Endereços', icon: <MapPin className="h-4 w-4" /> },
          { id: 'favorites', label: 'Favoritos', icon: <Heart className="h-4 w-4" /> },
          { id: 'profile', label: 'Meus Dados', icon: <User className="h-4 w-4" /> },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as AccountTab)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              tab === t.id
                ? 'bg-zinc-950 text-lime-300'
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'orders' && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                Você ainda não realizou nenhum pedido.
              </div>
            ) : (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 text-xs">
                    <div>
                      <span className="font-mono font-bold text-zinc-950">{ord.order_number}</span>
                      <span className="mx-2 text-zinc-300">|</span>
                      <span className="text-zinc-500">{formatDateBR(ord.created_at)}</span>
                    </div>
                    <div className="font-semibold text-zinc-900">
                      {ORDER_STATUS_LABELS[ord.status]} · Pagamento:{' '}
                      {PAYMENT_STATUS_LABELS[ord.payment_status]}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {ord.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-xs">
                        <span>
                          {item.quantity}x {item.product_name} (Tam. {item.size} · {item.color_name})
                        </span>
                        <span className="font-mono tabular-nums font-medium">
                          {formatBRL(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-xs">
                    <div className="text-zinc-600">
                      {ord.tracking_code ? (
                        <span>
                          Rastreio ({ord.tracking_carrier || 'Transportadora'}):{' '}
                          <strong className="font-mono text-zinc-950">{ord.tracking_code}</strong>
                        </span>
                      ) : (
                        <span>Aguardando código de rastreamento</span>
                      )}
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums text-zinc-950">
                      Total: {formatBRL(ord.total)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'addresses' && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="flex items-start justify-between rounded-xl border border-zinc-200 bg-white p-4 text-xs"
                >
                  <div>
                    <div className="font-semibold text-zinc-950">{addr.label}</div>
                    <div className="mt-1 text-zinc-600">
                      {addr.street}, {addr.number} — {addr.neighborhood}
                    </div>
                    <div className="text-zinc-500">
                      {addr.city}/{addr.state} · CEP {addr.zip_code}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddAddress}
              className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5"
            >
              <h3 className="text-sm font-semibold text-zinc-950">Novo Endereço</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Apelido (Casa, Trabalho)"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="CEP"
                  className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
                />
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="Rua / Av."
                  className="col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="Número"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Bairro"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs"
                />
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                  placeholder="UF"
                  className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs uppercase"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Salvar Endereço
              </button>
            </form>
          </div>
        )}

        {tab === 'favorites' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {favoriteProducts.length === 0 ? (
              <div className="col-span-full rounded-xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-500">
                Sua lista de favoritos está vazia.
              </div>
            ) : (
              favoriteProducts.map((p) => {
                const primary = p.images.find((i) => i.is_primary) || p.images[0];
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-xl border border-zinc-200 bg-white"
                  >
                    <div
                      onClick={() => setSelectedProduct(p)}
                      className="aspect-[4/3] cursor-pointer bg-zinc-100"
                    >
                      {primary ? (
                        <img
                          src={primary.public_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <SneakerFallback name={p.name} />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-950">{p.name}</h4>
                        <p className="font-mono text-xs font-medium text-zinc-600 tabular-nums">
                          {formatBRL(p.promo_price ?? p.original_price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(p.id)}
                        className="text-xs text-red-600 underline"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'profile' && (
          <form
            onSubmit={handleSaveProfile}
            className="max-w-md space-y-4 rounded-xl border border-zinc-200 bg-white p-6"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Nome Completo</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-lime-300"
            >
              Salvar Dados
            </button>
            {profileSaved && (
              <p className="text-xs font-medium text-lime-700">Perfil atualizado com sucesso.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
