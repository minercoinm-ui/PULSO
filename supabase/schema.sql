-- ============================================================================
-- PULSO SNEAKERS — SCRIPT SQL COMPLETO (POSTGRESQL / SUPABASE)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. PRODUTOS (tabela principal criada primeiro; FKs adicionadas após brands/categories)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sku TEXT NOT NULL UNIQUE,
  brand_id UUID,
  category_id UUID,
  short_description TEXT DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  original_price NUMERIC(10, 2) NOT NULL CHECK (original_price >= 0),
  promo_price NUMERIC(10, 2) CHECK (promo_price IS NULL OR promo_price >= 0),
  gender TEXT NOT NULL DEFAULT 'unissex' CHECK (gender IN ('masculino', 'feminino', 'infantil', 'unissex')),
  style TEXT NOT NULL DEFAULT 'urbano' CHECK (style IN ('esportivo', 'casual', 'urbano', 'premium')),
  delivery_info TEXT DEFAULT 'Envio direto do centro distribuidor. Prazo estimado de 3 a 7 dias úteis.',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_bestseller BOOLEAN NOT NULL DEFAULT FALSE,
  is_new_release BOOLEAN NOT NULL DEFAULT FALSE,
  is_special_offer BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  stock_status TEXT NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock', 'out_of_stock', 'supplier_dispatch')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  gender TEXT NOT NULL DEFAULT 'unissex' CHECK (gender IN ('masculino', 'feminino', 'infantil', 'unissex')),
  style TEXT NOT NULL DEFAULT 'urbano' CHECK (style IN ('esportivo', 'casual', 'urbano', 'premium')),
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. MARCAS
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relacionamentos de public.products com brands e categories
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_brand_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_brand_id_fkey
      FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. CLIENTES E PERFIS (estende auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  cpf TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    CASE
      WHEN LOWER(NEW.email) IN ('j14menez@gmail.com', 'admin@pulsosneakers.com.br') THEN 'admin'
      ELSE 'customer'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Somente administradores podem alterar permissões de usuário.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_non_admin_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_non_admin_role_change();

-- 5. VARIAÇÕES DE PRODUTO (numerações, cores e estoque)
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL DEFAULT '#0A0A0A',
  sku_variant TEXT NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  price_override NUMERIC(10, 2),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, size, color_name)
);

-- 6. FOTOS DOS PRODUTOS
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT DEFAULT '',
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. VÍDEOS DOS PRODUTOS E CAMPANHAS
CREATE TABLE IF NOT EXISTS public.product_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  thumbnail_url TEXT DEFAULT '',
  duration_seconds INTEGER,
  file_size INTEGER NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'video/mp4',
  is_campaign BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. FORNECEDORES
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  cnpj TEXT DEFAULT '',
  shipping_lead_time_days INTEGER NOT NULL DEFAULT 3,
  direct_to_customer BOOLEAN NOT NULL DEFAULT TRUE,
  integration_type TEXT NOT NULL DEFAULT 'manual' CHECK (integration_type IN ('manual', 'api')),
  api_endpoint TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. VÍNCULO FORNECEDOR x PRODUTO
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_sku TEXT NOT NULL DEFAULT '',
  acquisition_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  supplier_stock_qty INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  shipping_days_override INTEGER,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, product_id)
);

-- 10. ENDEREÇOS DE ENTREGA
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Principal',
  recipient_name TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT DEFAULT '',
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. CUPONS DE DESCONTO
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. PEDIDOS
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN ('pending_payment', 'paid', 'forwarded_to_supplier', 'shipped', 'delivered', 'cancelled')
  ),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'approved', 'rejected', 'refunded')
  ),
  mp_payment_id TEXT DEFAULT '',
  mp_preference_id TEXT DEFAULT '',
  pix_qr_code TEXT DEFAULT '',
  pix_qr_code_base64 TEXT DEFAULT '',
  subtotal NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL,
  coupon_code TEXT DEFAULT '',
  shipping_address_json JSONB NOT NULL,
  tracking_code TEXT DEFAULT '',
  tracking_carrier TEXT DEFAULT '',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_dispatched_at TIMESTAMPTZ,
  stock_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_deducted BOOLEAN NOT NULL DEFAULT FALSE;

-- 13. ITENS DOS PEDIDOS
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  brand_name TEXT NOT NULL DEFAULT '',
  size TEXT NOT NULL,
  color_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10, 2) NOT NULL,
  acquisition_cost NUMERIC(10, 2) DEFAULT 0,
  total_price NUMERIC(10, 2) NOT NULL,
  image_url TEXT DEFAULT ''
);

-- 14. FAVORITOS
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 15. BANNERS DA VITRINE
CREATE TABLE IF NOT EXISTS public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  cta_label TEXT DEFAULT 'Explorar Coleção',
  cta_link TEXT DEFAULT '#catalogo',
  image_url TEXT NOT NULL,
  storage_path TEXT DEFAULT '',
  placement TEXT NOT NULL DEFAULT 'hero' CHECK (placement IN ('hero', 'promo', 'campaign')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. SEÇÕES ADMINISTRÁVEIS DA VITRINE
CREATE TABLE IF NOT EXISTS public.site_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT DEFAULT '',
  description TEXT DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES DE DESEMPENHO E RELACIONAMENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published_created ON public.products(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_product_sort ON public.product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_videos_product_id ON public.product_videos(product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON public.supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_product_id ON public.supplier_products(product_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_supplier_id ON public.orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON public.favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON public.banners(is_active, sort_order);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_sections ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_update_own_non_role" ON public.profiles;
CREATE POLICY "profiles_update_own_non_role" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (
    public.is_admin()
    OR (
      auth.uid() = id
      AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- Categorias
DROP POLICY IF EXISTS "categories_public_read" ON public.categories;
CREATE POLICY "categories_public_read" ON public.categories
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
DROP POLICY IF EXISTS "categories_admin_write" ON public.categories;
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Marcas
DROP POLICY IF EXISTS "brands_public_read" ON public.brands;
CREATE POLICY "brands_public_read" ON public.brands
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
DROP POLICY IF EXISTS "brands_admin_write" ON public.brands;
CREATE POLICY "brands_admin_write" ON public.brands
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Produtos
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_published = TRUE OR public.is_admin());
DROP POLICY IF EXISTS "products_admin_write" ON public.products;
CREATE POLICY "products_admin_write" ON public.products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Variações
DROP POLICY IF EXISTS "variants_public_read" ON public.product_variants;
CREATE POLICY "variants_public_read" ON public.product_variants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.is_published = TRUE OR public.is_admin()))
  );
DROP POLICY IF EXISTS "variants_admin_write" ON public.product_variants;
CREATE POLICY "variants_admin_write" ON public.product_variants
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Fotos
DROP POLICY IF EXISTS "images_public_read" ON public.product_images;
CREATE POLICY "images_public_read" ON public.product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND (p.is_published = TRUE OR public.is_admin()))
  );
DROP POLICY IF EXISTS "images_admin_write" ON public.product_images;
CREATE POLICY "images_admin_write" ON public.product_images
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Vídeos
DROP POLICY IF EXISTS "videos_public_read" ON public.product_videos;
CREATE POLICY "videos_public_read" ON public.product_videos
  FOR SELECT USING (
    is_campaign = TRUE OR public.is_admin() OR
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.is_published = TRUE)
  );
DROP POLICY IF EXISTS "videos_admin_write" ON public.product_videos;
CREATE POLICY "videos_admin_write" ON public.product_videos
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Fornecedores (somente Admin)
DROP POLICY IF EXISTS "suppliers_admin_only" ON public.suppliers;
CREATE POLICY "suppliers_admin_only" ON public.suppliers
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "supplier_products_admin_only" ON public.supplier_products;
CREATE POLICY "supplier_products_admin_only" ON public.supplier_products
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Endereços
DROP POLICY IF EXISTS "addresses_owner_all" ON public.addresses;
CREATE POLICY "addresses_owner_all" ON public.addresses
  FOR ALL USING (auth.uid() = user_id OR public.is_admin())
  WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- Cupons
DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Pedidos e Itens
DROP POLICY IF EXISTS "orders_owner_read" ON public.orders;
CREATE POLICY "orders_owner_read" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "orders_owner_insert" ON public.orders;
CREATE POLICY "orders_owner_insert" ON public.orders
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending_payment'
    AND payment_status = 'pending'
    AND COALESCE(mp_payment_id, '') = ''
    AND COALESCE(stock_deducted, FALSE) = FALSE
    AND total >= 0
  );

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "orders_admin_delete" ON public.orders;
CREATE POLICY "orders_admin_delete" ON public.orders
  FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "order_items_owner_read" ON public.order_items;
CREATE POLICY "order_items_owner_read" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_admin()))
  );

DROP POLICY IF EXISTS "order_items_admin_all" ON public.order_items;
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Favoritos
DROP POLICY IF EXISTS "favorites_owner_all" ON public.favorites;
CREATE POLICY "favorites_owner_all" ON public.favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Banners e Seções
DROP POLICY IF EXISTS "banners_public_read" ON public.banners;
CREATE POLICY "banners_public_read" ON public.banners
  FOR SELECT USING (is_active = TRUE OR public.is_admin());
DROP POLICY IF EXISTS "banners_admin_write" ON public.banners;
CREATE POLICY "banners_admin_write" ON public.banners
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "sections_public_read" ON public.site_sections;
CREATE POLICY "sections_public_read" ON public.site_sections
  FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "sections_admin_write" ON public.site_sections;
CREATE POLICY "sections_admin_write" ON public.site_sections
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================================
-- SUPABASE STORAGE BUCKETS & POLICIES (produto-media & banners)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'produto-media',
    'produto-media',
    TRUE,
    83886080,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']
  ),
  (
    'banners',
    'banners',
    TRUE,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
  )
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public_read_product_media" ON storage.objects;
CREATE POLICY "public_read_product_media" ON storage.objects
  FOR SELECT USING (bucket_id IN ('produto-media', 'banners'));

DROP POLICY IF EXISTS "admin_upload_product_media" ON storage.objects;
CREATE POLICY "admin_upload_product_media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('produto-media', 'banners') AND public.is_admin());

DROP POLICY IF EXISTS "admin_update_product_media" ON storage.objects;
CREATE POLICY "admin_update_product_media" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('produto-media', 'banners') AND public.is_admin())
  WITH CHECK (bucket_id IN ('produto-media', 'banners') AND public.is_admin());

DROP POLICY IF EXISTS "admin_delete_product_media" ON storage.objects;
CREATE POLICY "admin_delete_product_media" ON storage.objects
  FOR DELETE USING (bucket_id IN ('produto-media', 'banners') AND public.is_admin());
