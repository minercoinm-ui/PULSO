import React, { useState } from 'react';
import { Send, Truck } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import {
  formatBRL,
  formatDateBR,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../../lib/format';
import type { Order, OrderStatus, Supplier } from '../../types/ecommerce';

interface AdminOrdersProps {
  orders: Order[];
  suppliers: Supplier[];
  onRefresh: () => Promise<void>;
}

export function AdminOrders({ orders, suppliers, onRefresh }: AdminOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState<OrderStatus>('pending_payment');
  const [trackingCode, setTrackingCode] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('Correios / Jadlog');
  const [supplierId, setSupplierId] = useState('');
  const [saving, setSaving] = useState(false);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);
    setStatus(order.status);
    setTrackingCode(order.tracking_code || '');
    setTrackingCarrier(order.tracking_carrier || 'Correios / Jadlog');
    setSupplierId(order.supplier_id || suppliers[0]?.id || '');
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      await apiRequest(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          tracking_code: trackingCode.trim(),
          tracking_carrier: trackingCarrier.trim(),
          supplier_id: supplierId || null,
        }),
      });
      await onRefresh();
      setSelectedOrder(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-zinc-950">Pedidos, Pagamentos & Rastreamento</h2>
        <p className="text-xs text-zinc-500">
          Consulte pedidos, encaminhe aos fornecedores para envio direto e registre códigos de rastreamento.
        </p>
      </div>

      {selectedOrder && (
        <form
          onSubmit={handleUpdateOrder}
          className="space-y-5 rounded-xl border border-zinc-200 bg-white p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-950 font-mono">
                Pedido {selectedOrder.order_number}
              </h3>
              <p className="text-xs text-zinc-500">
                {selectedOrder.customer_name} · {selectedOrder.customer_email} ·{' '}
                {formatDateBR(selectedOrder.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="text-xs text-zinc-500 underline"
            >
              Fechar detalhes
            </button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-zinc-900">Itens Comprados</h4>
              {selectedOrder.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                >
                  <div>
                    <div className="font-medium text-zinc-900">{item.product_name}</div>
                    <div className="text-zinc-500">
                      Tam. {item.size} · {item.color_name} · Qtd {item.quantity}
                    </div>
                  </div>
                  <div className="font-mono tabular-nums font-semibold">
                    {formatBRL(item.total_price)}
                  </div>
                </div>
              ))}
              <div className="pt-2 text-zinc-600">
                <strong>Entrega:</strong> {selectedOrder.shipping_address_json.street},{' '}
                {selectedOrder.shipping_address_json.number} —{' '}
                {selectedOrder.shipping_address_json.city}/
                {selectedOrder.shipping_address_json.state} (CEP{' '}
                {selectedOrder.shipping_address_json.zip_code})
              </div>
              <div className="text-zinc-600">
                <strong>Pagamento:</strong>{' '}
                {selectedOrder.payment_method === 'pix' ? 'Pix' : 'Cartão de Crédito'} ·{' '}
                {PAYMENT_STATUS_LABELS[selectedOrder.payment_status]}
                {selectedOrder.mp_payment_id ? ` (MP #${selectedOrder.mp_payment_id})` : ''}
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="mb-1 block font-medium text-zinc-700">Status do Pedido</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-medium text-zinc-700">
                  Fornecedor Responsável pelo Envio Direto
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar fornecedor...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.shipping_lead_time_days} dias)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-zinc-700">Transportadora</label>
                  <input
                    type="text"
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-zinc-700">
                    Código de Rastreamento
                  </label>
                  <input
                    type="text"
                    value={trackingCode}
                    onChange={(e) => setTrackingCode(e.target.value)}
                    placeholder="EX: BR123456789BR"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
                >
                  <Truck className="h-4 w-4" />
                  Salvar Atualização
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={async () => {
                    setStatus('forwarded_to_supplier');
                    await apiRequest(`/api/admin/orders/${selectedOrder.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({
                        status: 'forwarded_to_supplier',
                        supplier_id: supplierId || null,
                      }),
                    });
                    await onRefresh();
                    setSelectedOrder(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Encaminhar ao Fornecedor
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Nenhum pedido recebido ainda. Os pedidos realizados no checkout aparecerão aqui em tempo real.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Rastreamento</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50">
                    <td className="px-4 py-3 font-mono font-semibold text-zinc-950">
                      {o.order_number}
                      <div className="font-sans text-[11px] font-normal text-zinc-400">
                        {formatDateBR(o.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{o.customer_name}</div>
                      <div className="text-zinc-500">{o.customer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-zinc-800">
                        {o.payment_method === 'pix' ? 'Pix' : 'Cartão'}
                      </span>{' '}
                      · {PAYMENT_STATUS_LABELS[o.payment_status]}
                    </td>
                    <td className="px-4 py-3 text-zinc-800 font-medium">
                      {ORDER_STATUS_LABELS[o.status]}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600">
                      {o.tracking_code || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-zinc-950">
                      {formatBRL(o.total)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openOrder(o)}
                        className="rounded border border-zinc-200 px-3 py-1.5 font-medium text-zinc-800 hover:bg-zinc-100"
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
