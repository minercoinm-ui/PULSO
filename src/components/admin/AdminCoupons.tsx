import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { formatBRL, formatDateBR } from '../../lib/format';
import type { Coupon } from '../../types/ecommerce';

interface AdminCouponsProps {
  coupons: Coupon[];
  onRefresh: () => Promise<void>;
}

export function AdminCoupons({ coupons, onRefresh }: AdminCouponsProps) {
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('15');
  const [minOrder, setMinOrder] = useState('250');
  const [maxUses, setMaxUses] = useState('100');
  const [validUntil, setValidUntil] = useState('2027-12-31');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          description,
          discount_type: discountType,
          discount_value: Number(discountValue),
          min_order_value: Number(minOrder),
          max_uses: maxUses ? Number(maxUses) : null,
          valid_until: validUntil ? `${validUntil}T23:59:59.000Z` : null,
          is_active: true,
        }),
      });
      setCode('');
      setDescription('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    await apiRequest('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({ ...coupon, is_active: !coupon.is_active }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-950">Cupons de Desconto</h2>
        <p className="text-xs text-zinc-500">
          Crie cupons percentuais ou de valor fixo com controle de validade e limite de uso.
        </p>
      </div>

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-4 rounded-xl border border-zinc-200 bg-white p-5 md:grid-cols-6"
      >
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Código</label>
          <input
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="EX: PULSO15"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Tipo</label>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="percentage">Porcentagem (%)</option>
            <option value="fixed">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Valor</label>
          <input
            type="number"
            step="0.01"
            required
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Pedido Mín. (R$)</label>
          <input
            type="number"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Limite Usos</label>
          <input
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="md:col-span-4">
          <label className="mb-1 block text-xs font-medium text-zinc-700">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição interna ou regra do cupom"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-700">Validade</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            Criar Cupom
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Código</th>
              <th className="px-4 py-3 font-medium">Desconto</th>
              <th className="px-4 py-3 font-medium">Mínimo</th>
              <th className="px-4 py-3 font-medium">Utilizações</th>
              <th className="px-4 py-3 font-medium">Validade</th>
              <th className="px-4 py-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-bold text-zinc-950">
                  {c.code}
                  <div className="font-sans text-[11px] font-normal text-zinc-500">
                    {c.description}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono tabular-nums font-medium">
                  {c.discount_type === 'percentage'
                    ? `${c.discount_value}%`
                    : formatBRL(c.discount_value)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-600">
                  {formatBRL(c.min_order_value)}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-zinc-600">
                  {c.used_count} / {c.max_uses ?? '∞'}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-500">
                  {c.valid_until ? formatDateBR(c.valid_until) : 'Sem validade'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className={`rounded-md px-3 py-1.5 font-medium ${
                      c.is_active
                        ? 'bg-zinc-950 text-lime-300'
                        : 'border border-zinc-300 text-zinc-500'
                    }`}
                  >
                    {c.is_active ? 'Ativo' : 'Desativado'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
