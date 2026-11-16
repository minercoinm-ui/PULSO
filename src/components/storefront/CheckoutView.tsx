import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Copy, CreditCard, QrCode, ShieldCheck } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { apiRequest } from '../../lib/api';
import { formatBRL, ORDER_STATUS_LABELS } from '../../lib/format';
import type { Address, Order, PaymentMethod } from '../../types/ecommerce';

interface ShippingOption {
  id: string;
  name: string;
  cost: number;
  estimated_days: string;
}

export function CheckoutView() {
  const { cart, cartSubtotal, clearCart, user, setPage, setAuthModalOpen } = useStore();
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const [recipientName, setRecipientName] = useState(user?.full_name || '');
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('');

  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_amount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createdOrder, setCreatedOrder] = useState<{
    order: Order;
    gateway_configured: boolean;
    gateway_message?: string;
    payment?: {
      qr_code?: string;
      qr_code_base64?: string;
      init_point?: string;
    };
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ addresses: Address[] }>('/api/customer/addresses')
      .then((res) => {
        setSavedAddresses(res.addresses);
        const def = res.addresses.find((a) => a.is_default) || res.addresses[0];
        if (def) {
          applyAddress(def);
        }
      })
      .catch(() => null);
  }, [user]);

  const applyAddress = (addr: Address) => {
    setRecipientName(addr.recipient_name);
    setZipCode(addr.zip_code);
    setStreet(addr.street);
    setNumber(addr.number);
    setComplement(addr.complement || '');
    setNeighborhood(addr.neighborhood);
    setCity(addr.city);
    setStateUf(addr.state);
    calculateShipping(addr.zip_code);
  };

  const calculateShipping = async (zip: string) => {
    const clean = zip.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const res = await apiRequest<{ options: ShippingOption[] }>('/api/shipping/calculate', {
        method: 'POST',
        body: JSON.stringify({ zip_code: clean, subtotal: cartSubtotal }),
      });
      setShippingOptions(res.options);
      setSelectedShipping(res.options[0] || null);
    } catch {
      setShippingOptions([]);
    }
  };

  const handleApplyCoupon = async () => {
    setCouponError(null);
    if (!couponCode.trim()) return;
    try {
      const res = await apiRequest<{
        valid: boolean;
        discount_amount: number;
        message: string;
        coupon?: { code: string };
      }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode.trim(), subtotal: cartSubtotal }),
      });
      if (!res.valid) {
        setAppliedCoupon(null);
        setCouponError(res.message);
      } else {
        setAppliedCoupon({
          code: res.coupon?.code || couponCode.trim().toUpperCase(),
          discount_amount: res.discount_amount,
          message: res.message,
        });
      }
    } catch (err: any) {
      setCouponError(err.message);
    }
  };

  const discount = appliedCoupon?.discount_amount || 0;
  const shippingCost = selectedShipping?.cost ?? 0;
  const finalTotal = Math.max(0, cartSubtotal - discount + shippingCost);

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiRequest<{
        order: Order;
        gateway_configured: boolean;
        gateway_message?: string;
        payment?: { qr_code?: string; qr_code_base64?: string; init_point?: string };
      }>('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map((c) => ({
            product_id: c.product.id,
            variant_id: c.variant.id,
            quantity: c.quantity,
          })),
          shipping_address: {
            label: 'Entrega',
            recipient_name: recipientName,
            zip_code: zipCode,
            street,
            number,
            complement,
            neighborhood,
            city,
            state: stateUf,
          },
          shipping_cost: shippingCost,
          payment_method: paymentMethod,
          coupon_code: appliedCoupon?.code || '',
        }),
      });
      setCreatedOrder(res);
      clearCart();
    } catch (err: any) {
      setError(err.message || 'Erro ao finalizar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdOrder) {
    const { order, gateway_configured, gateway_message, payment } = createdOrder;
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 space-y-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-zinc-950" />
            <div>
              <h1 className="font-display text-2xl font-bold text-zinc-950">
                Pedido {order.order_number} Registrado
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Status atual: <strong>{ORDER_STATUS_LABELS[order.status]}</strong>
              </p>
            </div>
          </div>

          {!gateway_configured && gateway_message && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
              {gateway_message}
            </div>
          )}

          {gateway_configured && payment?.qr_code && (
            <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center">
              <p className="text-xs font-semibold text-zinc-900">
                Escaneie o QR Code Pix via Mercado Pago para confirmar seu pagamento
              </p>
              {payment.qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${payment.qr_code_base64}`}
                  alt="QR Code Pix"
                  className="mx-auto h-48 w-48 rounded-lg border border-zinc-200 bg-white p-2"
                />
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={payment.qr_code}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(payment.qr_code || '')}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-zinc-950 px-3 py-2 text-xs font-semibold text-lime-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>
              <p className="text-[11px] text-zinc-500">
                A confirmação do pagamento ocorre automaticamente via webhook seguro do Mercado Pago.
              </p>
            </div>
          )}

          {gateway_configured && payment?.init_point && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center space-y-3">
              <p className="text-xs text-zinc-700">
                Finalize o pagamento com Cartão de Crédito no ambiente seguro do Mercado Pago:
              </p>
              <a
                href={payment.init_point}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-zinc-950 px-6 py-3 text-xs font-semibold text-lime-300 hover:bg-zinc-800"
              >
                Pagar no Mercado Pago
              </a>
            </div>
          )}

          <div className="border-t border-zinc-100 pt-4 text-xs text-zinc-600 space-y-1">
            <div className="flex justify-between">
              <span>Total do Pedido</span>
              <span className="font-mono font-bold text-zinc-950 tabular-nums">
                {formatBRL(order.total)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage('account')}
              className="rounded-lg bg-zinc-950 px-5 py-2.5 text-xs font-semibold text-lime-300"
            >
              Acompanhar Pedido
            </button>
            <button
              type="button"
              onClick={() => setPage('storefront')}
              className="rounded-lg border border-zinc-300 px-4 py-2.5 text-xs font-medium text-zinc-800"
            >
              Voltar à Loja
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <button
        type="button"
        onClick={() => setPage('storefront')}
        className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Continuar comprando
      </button>

      <h1 className="font-display text-2xl font-bold text-zinc-950">Finalizar Compra</h1>

      {cart.length === 0 ? (
        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
          Sua sacola está vazia.
        </div>
      ) : (
        <form onSubmit={handleSubmitCheckout} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            {/* Saved Addresses */}
            {savedAddresses.length > 0 && (
              <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-3">
                <h2 className="text-sm font-semibold text-zinc-950">Endereços Salvos</h2>
                <div className="flex flex-wrap gap-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => applyAddress(addr)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-left text-xs hover:border-zinc-950"
                    >
                      <div className="font-semibold text-zinc-900">{addr.label}</div>
                      <div className="text-zinc-500">
                        {addr.street}, {addr.number} · {addr.city}/{addr.state}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Delivery Address */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
              <h2 className="text-sm font-semibold text-zinc-950">Endereço de Entrega</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-medium text-zinc-700">
                    Destinatário
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">CEP</label>
                  <input
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => {
                      setZipCode(e.target.value);
                      calculateShipping(e.target.value);
                    }}
                    placeholder="01310-100"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Rua / Avenida</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Número</label>
                  <input
                    type="text"
                    required
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Complemento</label>
                  <input
                    type="text"
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-700">Bairro</label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-medium text-zinc-700">Cidade</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-700">UF</label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      value={stateUf}
                      onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <div className="space-y-2 border-t border-zinc-100 pt-4">
                  <span className="block text-xs font-semibold text-zinc-900">Modalidade de Frete</span>
                  {shippingOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs ${
                        selectedShipping?.id === opt.id
                          ? 'border-zinc-950 bg-zinc-50'
                          : 'border-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShipping?.id === opt.id}
                          onChange={() => setSelectedShipping(opt)}
                        />
                        <div>
                          <div className="font-semibold text-zinc-900">{opt.name}</div>
                          <div className="text-zinc-500">{opt.estimated_days}</div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold tabular-nums">
                        {opt.cost === 0 ? 'Grátis' : formatBRL(opt.cost)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-950">
                  Pagamento via Mercado Pago
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                  <ShieldCheck className="h-3.5 w-3.5" /> Ambiente Seguro
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    paymentMethod === 'pix'
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white text-zinc-900'
                  }`}
                >
                  <QrCode className="h-5 w-5 text-lime-400" />
                  <div>
                    <div className="text-xs font-bold">Pix</div>
                    <div className="text-[11px] opacity-75">Aprovação imediata via webhook</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                    paymentMethod === 'credit_card'
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-200 bg-white text-zinc-900'
                  }`}
                >
                  <CreditCard className="h-5 w-5 text-lime-400" />
                  <div>
                    <div className="text-xs font-bold">Cartão de Crédito</div>
                    <div className="text-[11px] opacity-75">Checkout Mercado Pago até 12x</div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Order Summary Right */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-zinc-200 bg-white p-6 space-y-5">
              <h2 className="text-sm font-semibold text-zinc-950">Resumo do Pedido</h2>

              <div className="divide-y divide-zinc-100">
                {cart.map((item) => {
                  const unit = item.product.promo_price ?? item.product.original_price;
                  return (
                    <div key={item.variant.id} className="flex justify-between gap-3 py-3 text-xs">
                      <div>
                        <div className="font-semibold text-zinc-900">{item.product.name}</div>
                        <div className="text-zinc-500">
                          Tam. {item.variant.size} · {item.variant.color_name} · Qtd {item.quantity}
                        </div>
                      </div>
                      <span className="font-mono font-semibold tabular-nums">
                        {formatBRL(unit * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Coupon */}
              <div className="space-y-2 border-t border-zinc-100 pt-4">
                <label className="block text-xs font-medium text-zinc-700">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    placeholder="EX: PULSO10"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="rounded-lg border border-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-zinc-50"
                  >
                    Aplicar
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-red-600">{couponError}</p>}
                {appliedCoupon && (
                  <p className="text-[11px] font-medium text-lime-700">{appliedCoupon.message}</p>
                )}
              </div>

              <div className="space-y-2 border-t border-zinc-100 pt-4 text-xs">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">{formatBRL(cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-lime-700 font-medium">
                    <span>Desconto ({appliedCoupon?.code})</span>
                    <span className="font-mono tabular-nums">-{formatBRL(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-600">
                  <span>Frete</span>
                  <span className="font-mono tabular-nums">
                    {shippingCost === 0 ? 'Grátis / A calcular' : formatBRL(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-3 text-base font-bold text-zinc-950">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatBRL(finalTotal)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-zinc-950 py-3.5 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
              >
                {submitting ? 'Processando Pedido...' : 'Confirmar Pedido e Gerar Pagamento'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
