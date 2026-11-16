export type UserRole = 'customer' | 'admin';

export type GenderType = 'masculino' | 'feminino' | 'infantil' | 'unissex';
export type StyleType = 'esportivo' | 'casual' | 'urbano' | 'premium';
export type StockStatus = 'in_stock' | 'out_of_stock' | 'supplier_dispatch';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'forwarded_to_supplier'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'pix' | 'credit_card';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: GenderType;
  style: StyleType;
  description: string;
  image_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;
  color_name: string;
  color_hex: string;
  sku_variant: string;
  stock_qty: number;
  price_override?: number | null;
  is_available: boolean;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface ProductVideo {
  id: string;
  product_id: string | null;
  title: string;
  storage_path: string;
  public_url: string;
  thumbnail_url?: string;
  duration_seconds?: number | null;
  file_size: number;
  mime_type: string;
  is_campaign: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  brand_id: string | null;
  category_id: string | null;
  short_description: string;
  description: string;
  original_price: number;
  promo_price: number | null;
  gender: GenderType;
  style: StyleType;
  delivery_info: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_release: boolean;
  is_special_offer: boolean;
  is_recommended: boolean;
  is_published: boolean;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
  // Hydrated relational fields
  brand?: Brand | null;
  category?: Category | null;
  variants: ProductVariant[];
  images: ProductImage[];
  videos: ProductVideo[];
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  cnpj: string;
  shipping_lead_time_days: number;
  direct_to_customer: boolean;
  integration_type: 'manual' | 'api';
  api_endpoint?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
}

export interface SupplierProduct {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_sku: string;
  acquisition_cost: number;
  supplier_stock_qty: number;
  is_available: boolean;
  shipping_days_override?: number | null;
  last_synced_at: string;
  created_at: string;
  supplier?: Supplier;
  product_name?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  recipient_name: string;
  zip_code: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  is_default: boolean;
  created_at: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  brand_name: string;
  size: string;
  color_name: string;
  quantity: number;
  unit_price: number;
  acquisition_cost?: number;
  total_price: number;
  image_url: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  mp_payment_id?: string;
  mp_preference_id?: string;
  pix_qr_code?: string;
  pix_qr_code_base64?: string;
  subtotal: number;
  discount_amount: number;
  shipping_cost: number;
  total: number;
  coupon_code?: string;
  shipping_address_json: Omit<Address, 'id' | 'user_id' | 'created_at' | 'is_default'>;
  tracking_code?: string;
  tracking_carrier?: string;
  supplier_id?: string | null;
  supplier_dispatched_at?: string | null;
  stock_deducted?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface Favorite {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  cta_label: string;
  cta_link: string;
  image_url: string;
  storage_path?: string;
  placement: 'hero' | 'promo' | 'campaign';
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface SiteSection {
  id: string;
  section_key: string;
  title: string;
  subtitle: string;
  description: string;
  is_enabled: boolean;
  sort_order: number;
  config_json: Record<string, unknown>;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

export interface DashboardMetrics {
  total_sales_count: number;
  total_revenue: number;
  paid_revenue: number;
  orders_received: number;
  registered_customers: number;
  published_products: number;
  out_of_stock_products: number;
  total_products: number;
  pending_supplier_dispatch: number;
  recent_orders: Order[];
}

export interface AdminCustomerSummary {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  cpf?: string;
  role: UserRole;
  created_at: string;
  orders_count: number;
  total_spent: number;
}

export interface SystemStatus {
  supabase_configured: boolean;
  mercado_pago_configured: boolean;
  storage_mode: 'supabase' | 'local';
  auth_mode: 'supabase' | 'local';
  supabase_diagnostic?: string | null;
  env_status?: {
    effective_supabase_url: string | null;
    project_ref?: string | null;
    urls_match?: boolean;
    keys_match_project?: boolean;
    vite_supabase_url_configured: boolean;
    vite_supabase_anon_key_configured: boolean;
    supabase_url_configured: boolean;
    supabase_anon_key_configured: boolean;
    supabase_service_role_key_configured: boolean;
    session_secret_configured: boolean;
    mercado_pago_token_configured: boolean;
    mercado_pago_webhook_secret_configured: boolean;
  };
}
