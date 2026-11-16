import React, { useState } from 'react';
import { Link2, Plus, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatBRL, formatDateBR } from '../../lib/format';
import type { Product, Supplier, SupplierProduct } from '../../types/ecommerce';

interface AdminSuppliersProps {
  suppliers: Supplier[];
  links: SupplierProduct[];
  products: Product[];
  onRefresh: () => Promise<void>;
}

export function AdminSuppliers({
  suppliers,
  links,
  products,
  onRefresh,
}: AdminSuppliersProps) {
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [leadDays, setLeadDays] = useState('3');
  const [integrationType, setIntegrationType] = useState<'manual' | 'api'>('manual');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [directToCustomer, setDirectToCustomer] = useState(true);

  // Linking form
  const [linkSupplierId, setLinkSupplierId] = useState(suppliers[0]?.id || '');
  const [linkProductId, setLinkProductId] = useState(products[0]?.id || '');
  const [supplierSku, setSupplierSku] = useState('');
  const [acqCost, setAcqCost] = useState('350.00');
  const [supStock, setSupStock] = useState('20');
  const [supAvail, setSupAvail] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await apiRequest('/api/admin/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name,
          contact_name: contactName,
          email,
          phone,
          shipping_lead_time_days: Number(leadDays),
          direct_to_customer: directToCustomer,
          integration_type: integrationType,
          api_endpoint: apiEndpoint,
        }),
      });
      setName('');
      setContactName('');
      setEmail('');
      setPhone('');
      setApiEndpoint('');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const handleLinkProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSupplierId || !linkProductId) return;
    setBusy(true);
    try {
      await apiRequest('/api/admin/suppliers/link-product', {
        method: 'POST',
        body: JSON.stringify({
          supplier_id: linkSupplierId,
          product_id: linkProductId,
          supplier_sku: supplierSku || 'SUP-SKU',
          acquisition_cost: Number(acqCost),
          supplier_stock_qty: Number(supStock),
          is_available: supAvail,
        }),
      });
      setSupplierSku('');
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };

  const toggleLinkAvailability = async (link: SupplierProduct) => {
    await apiRequest('/api/admin/suppliers/link-product', {
      method: 'POST',
      body: JSON.stringify({
        supplier_id: link.supplier_id,
        product_id: link.product_id,
        supplier_sku: link.supplier_sku,
        acquisition_cost: link.acquisition_cost,
        supplier_stock_qty: link.supplier_stock_qty,
        is_available: !link.is_available,
      }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-zinc-950">
          Fornecedores & Envio Direto ao Consumidor
        </h2>
        <p className="text-xs text-zinc-500">
          Cadastre parceiros de operação manual ou via API, defina custos de aquisição e prazos de despacho.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* New Supplier */}
        <form
          onSubmit={handleSaveSupplier}
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-zinc-950">Cadastrar Fornecedor</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Razão Social / Nome"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do contato"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail operacional"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone / WhatsApp"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Prazo de envio (dias)</label>
              <input
                type="number"
                min={1}
                value={leadDays}
                onChange={(e) => setLeadDays(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Modalidade</label>
              <select
                value={integrationType}
                onChange={(e) => setIntegrationType(e.target.value as 'manual' | 'api')}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="manual">Operação Manual (E-mail / Portal)</option>
                <option value="api">Integração via API REST</option>
              </select>
            </div>
          </div>

          {integrationType === 'api' && (
            <input
              type="url"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api.fornecedor.com.br/v1/stock"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs"
            />
          )}

          <label className="flex items-center gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              checked={directToCustomer}
              onChange={(e) => setDirectToCustomer(e.target.checked)}
            />
            Entrega direta do fornecedor ao consumidor final (Dropshipping)
          </label>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Salvar Fornecedor
          </button>
        </form>

        {/* Link Product to Supplier */}
        <form
          onSubmit={handleLinkProduct}
          className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-zinc-950">
            Vincular Produto ao Fornecedor
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Fornecedor</label>
              <select
                value={linkSupplierId}
                onChange={(e) => setLinkSupplierId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">Produto na Loja</label>
              <select
                value={linkProductId}
                onChange={(e) => setLinkProductId(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">SKU no Fornecedor</label>
              <input
                type="text"
                value={supplierSku}
                onChange={(e) => setSupplierSku(e.target.value)}
                placeholder="FORN-001"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">
                Custo de Aquisição (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={acqCost}
                onChange={(e) => setAcqCost(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-zinc-500">
                Estoque Informado
              </label>
              <input
                type="number"
                min={0}
                value={supStock}
                onChange={(e) => setSupStock(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm tabular-nums"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={supAvail}
                  onChange={(e) => setSupAvail(e.target.checked)}
                />
                Disponível para despacho
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
          >
            <Link2 className="h-4 w-4" />
            Vincular / Atualizar Custo
          </button>
        </form>
      </div>

      {/* Suppliers Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-700">
          Fornecedores Cadastrados ({suppliers.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-100 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Operação</th>
                <th className="px-4 py-3 font-medium">Prazo Envio</th>
                <th className="px-4 py-3 font-medium">Envio Direto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-semibold text-zinc-950">{s.name}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {s.contact_name} · {s.email} · {s.phone}
                  </td>
                  <td className="px-4 py-3 uppercase font-mono text-zinc-700">
                    {s.integration_type}
                  </td>
                  <td className="px-4 py-3 font-mono tabular-nums text-zinc-700">
                    {s.shipping_lead_time_days} dias úteis
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {s.direct_to_customer ? 'Sim (Dropshipping)' : 'Centro Próprio'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Products Table */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-700">
          Produtos Vinculados & Custos ({links.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-100 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Produto</th>
                <th className="px-4 py-3 font-medium">Fornecedor</th>
                <th className="px-4 py-3 font-medium">SKU Forn.</th>
                <th className="px-4 py-3 font-medium text-right">Custo Aquisição</th>
                <th className="px-4 py-3 font-medium text-right">Estoque</th>
                <th className="px-4 py-3 font-medium">Última Sinc.</th>
                <th className="px-4 py-3 font-medium text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {links.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3 font-semibold text-zinc-950">{l.product_name}</td>
                  <td className="px-4 py-3 text-zinc-600">{l.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{l.supplier_sku}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-medium text-zinc-900">
                    {formatBRL(l.acquisition_cost)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                    {l.supplier_stock_qty} un.
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                    {formatDateBR(l.last_synced_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleLinkAvailability(l)}
                      className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium ${
                        l.is_available
                          ? 'bg-lime-100 text-lime-900'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      <RefreshCw className="h-3 w-3" />
                      {l.is_available ? 'Disponível' : 'Pausado'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
