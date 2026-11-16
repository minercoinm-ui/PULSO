import React from 'react';
import { AdminPanel } from './components/admin/AdminPanel';
import { AccountView } from './components/storefront/AccountView';
import { AuthModal } from './components/storefront/AuthModal';
import { CartDrawer } from './components/storefront/CartDrawer';
import { CheckoutView } from './components/storefront/CheckoutView';
import { ProductDetailModal } from './components/storefront/ProductDetailModal';
import { StorefrontHome } from './components/storefront/StorefrontHome';
import { StoreProvider, useStore } from './context/StoreContext';

function PulsoRouter() {
  const { page } = useStore();

  return (
    <>
      {page === 'storefront' && <StorefrontHome />}
      {page === 'checkout' && <CheckoutView />}
      {page === 'account' && <AccountView />}
      {page === 'admin' && <AdminPanel />}

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
