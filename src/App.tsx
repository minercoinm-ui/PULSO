import React, { Suspense, lazy } from 'react';
import { AccountView } from './components/storefront/AccountView';
import { AuthModal } from './components/storefront/AuthModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutView } from './components/storefront/CheckoutView';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { StorefrontHome } from './components/storefront/StorefrontHome';
import { StoreProvider, useStore } from './context/StoreContext';

const AdminPanel = lazy(() =>
  import('./components/admin/AdminPanel').then((mod) => ({ default: mod.AdminPanel }))
);

function PulsoRouter() {
  const { page } = useStore();

  return (
    <>
      {page === 'storefront' && <StorefrontHome />}
      {page === 'checkout' && <CheckoutView />}
      {page === 'account' && <AccountView />}
      {page === 'admin' && (
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-xs font-medium text-zinc-500">
              Carregando painel administrativo...
            </div>
          }
        >
          <AdminPanel />
        </Suspense>
      )}

      <ProductDetailModal />
      <CartDrawer />
      <AuthModal />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <PulsoRouter />
    </StoreProvider>
  );
}
