import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../lib/api';
import { getSupabaseClient } from '../lib/supabase';
import type {
  Banner,
  Brand,
  CartItem,
  Category,
  Product,
  ProductVariant,
  ProductVideo,
  Profile,
  SiteSection,
  SystemStatus,
} from '../types/ecommerce';

export type ActivePage = 'storefront' | 'checkout' | 'account' | 'admin';

interface StoreContextValue {
  page: ActivePage;
  setPage: (p: ActivePage) => void;
  systemStatus: SystemStatus | null;
  user: Profile | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  register: (fullName: string, email: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
  refreshProfile: (autoRedirectAdmin?: boolean) => Promise<void>;
  // Storefront data
  products: Product[];
  categories: Category[];
  brands: Brand[];
  banners: Banner[];
  siteSections: SiteSection[];
  campaignVideos: ProductVideo[];
  storeLoading: boolean;
  refreshStorefront: () => Promise<void>;
  // Selected Product for PDP modal
  selectedProduct: Product | null;
  setSelectedProduct: (p: Product | null) => void;
  // Cart
  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateCartQty: (variantId: string, quantity: number) => void;
  removeFromCart: (variantId: string) => void;
  clearCart: () => void;
  cartSubtotal: number;
  cartCount: number;
  // Favorites
  favoriteIds: string[];
  toggleFavorite: (productId: string) => Promise<void>;
  // Auth Modal
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_KEY = 'pulso_cart_items';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [page, setPage] = useState<ActivePage>('storefront');
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [siteSections, setSiteSections] = useState<SiteSection[]>([]);
  const [campaignVideos, setCampaignVideos] = useState<ProductVideo[]>([]);
  const [storeLoading, setStoreLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const refreshStorefront = useCallback(async () => {
    setStoreLoading(true);
    try {
      const data = await apiRequest<{
        products: Product[];
        categories: Category[];
        brands: Brand[];
        banners: Banner[];
        site_sections: SiteSection[];
        campaign_videos: ProductVideo[];
      }>('/api/storefront/bootstrap');
      setProducts(data.products);
      setCategories(data.categories);
      setBrands(data.brands);
      setBanners(data.banners);
      setSiteSections(data.site_sections);
      setCampaignVideos(data.campaign_videos);
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async (autoRedirectAdmin = false) => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setFavoriteIds([]);
      setAuthLoading(false);
      return;
    }
    try {
      const res = await apiRequest<{ profile: Profile }>('/api/auth/me');
      setUser(res.profile);
      if (autoRedirectAdmin && res.profile.role === 'admin') {
        setPage('admin');
      }
      const favRes = await apiRequest<{ product_ids: string[] }>('/api/customer/favorites');
      setFavoriteIds(favRes.product_ids);
    } catch {
      setStoredToken(null);
      setUser(null);
      setFavoriteIds([]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    apiRequest<SystemStatus>('/api/system/status')
      .then(setSystemStatus)
      .catch(() => null);
    refreshStorefront();
    refreshProfile(true);
  }, [refreshStorefront, refreshProfile]);

  const login = async (email: string, password: string): Promise<Profile> => {
    const supa = getSupabaseClient();
    if (supa && systemStatus?.auth_mode !== 'local') {
      const { data, error } = await supa.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw new Error(error?.message || 'Erro no login.');
      setStoredToken(data.session.access_token);
      const res = await apiRequest<{ profile: Profile }>('/api/auth/me');
      setUser(res.profile);
      const favRes = await apiRequest<{ product_ids: string[] }>('/api/customer/favorites');
      setFavoriteIds(favRes.product_ids);
      if (res.profile.role === 'admin') {
        setPage('admin');
      }
      return res.profile;
    }

    const res = await apiRequest<{ token: string; profile: Profile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(res.token);
    setUser(res.profile);
    const favRes = await apiRequest<{ product_ids: string[] }>('/api/customer/favorites');
    setFavoriteIds(favRes.product_ids);
    if (res.profile.role === 'admin') {
      setPage('admin');
    }
    return res.profile;
  };

  const register = async (fullName: string, email: string, password: string): Promise<Profile> => {
    const res = await apiRequest<{ token?: string; profile?: Profile }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName, email, password }),
    });
    if (res.token && res.profile) {
      setStoredToken(res.token);
      setUser(res.profile);
      setFavoriteIds([]);
      if (res.profile.role === 'admin') {
        setPage('admin');
      }
      return res.profile;
    }
    return await login(email, password);
  };

  const logout = async () => {
    const supa = getSupabaseClient();
    if (supa) {
      await supa.auth.signOut();
    }
    setStoredToken(null);
    setUser(null);
    setFavoriteIds([]);
    if (page === 'admin' || page === 'account' || page === 'checkout') {
      setPage('storefront');
    }
  };

  const addToCart = (product: Product, variant: ProductVariant, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.variant.id === variant.id);
      if (existing) {
        return prev.map((item) =>
          item.variant.id === variant.id
            ? { ...item, quantity: Math.min(variant.stock_qty, item.quantity + quantity) }
            : item
        );
      }
      return [...prev, { product, variant, quantity }];
    });
    setCartOpen(true);
  };

  const updateCartQty = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(variantId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variant.id === variantId
          ? { ...item, quantity: Math.min(item.variant.stock_qty, quantity) }
          : item
      )
    );
  };

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variant.id !== variantId));
  };

  const clearCart = () => setCart([]);

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    const res = await apiRequest<{ product_ids: string[] }>('/api/customer/favorites/toggle', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    setFavoriteIds(res.product_ids);
  };

  const cartSubtotal = cart.reduce((sum, item) => {
    const unitPrice = item.product.promo_price ?? item.product.original_price;
    return sum + unitPrice * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        page,
        setPage,
        systemStatus,
        user,
        authLoading,
        login,
        register,
        logout,
        refreshProfile,
        products,
        categories,
        brands,
        banners,
        siteSections,
        campaignVideos,
        storeLoading,
        refreshStorefront,
        selectedProduct,
        setSelectedProduct,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartSubtotal,
        cartCount,
        favoriteIds,
        toggleFavorite,
        authModalOpen,
        setAuthModalOpen,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider.');
  return ctx;
}
