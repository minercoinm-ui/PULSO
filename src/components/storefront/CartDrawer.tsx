import React from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatBRL } from '../../lib/format';
import { SneakerFallback } from './SneakerFallback';

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    cartSubtotal,
    user,
    setAuthModalOpen,
    setPage,
  } = useStore();

  if (!cartOpen) return null;

  const handleCheckout = () => {
    setCartOpen(false);
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setPage('checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-zinc-950" />
            <h2 className="font-display text-base font-bold text-zinc-950">Sacola de Compras</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {cart.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-3 h-10 w-10 text-zinc-300" />
              <p className="text-sm font-medium text-zinc-800">Sua sacola está vazia</p>
              <p className="mt-1 text-xs text-zinc-500">
                Explore os lançamentos e adicione seus tênis favoritos.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {cart.map((item) => {
                const unitPrice = item.product.promo_price ?? item.product.original_price;
                const img =
                  item.product.images.find((i) => i.is_primary) || item.product.images[0];
                return (
                  <div key={item.variant.id} className="flex gap-4 py-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                      {img ? (
                        <img
                          src={img.public_url}
                          alt={item.product.name}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <SneakerFallback name={item.product.name} />
                      )}
                    </div>

                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-zinc-950">
                            {item.product.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.variant.id)}
                            className="text-zinc-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          Tam. {item.variant.size} · {item.variant.color_name}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-zinc-200">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variant.id, item.quantity - 1)}
                            className="p-1.5 text-zinc-600 hover:bg-zinc-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="px-3 font-mono text-xs font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variant.id, item.quantity + 1)}
                            className="p-1.5 text-zinc-600 hover:bg-zinc-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="font-mono text-sm font-semibold tabular-nums text-zinc-950">
                          {formatBRL(unitPrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-zinc-200 bg-zinc-50 p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-600">Subtotal</span>
              <span className="font-mono text-lg font-bold tabular-nums text-zinc-950">
                {formatBRL(cartSubtotal)}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">
              Frete e cupons de desconto são calculados na próxima etapa.
            </p>
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full rounded-lg bg-zinc-950 py-3 text-xs font-semibold text-lime-300 transition-colors hover:bg-zinc-800"
            >
              Finalizar Compra
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
