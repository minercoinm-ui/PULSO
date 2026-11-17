import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  Address,
  AdminCustomerSummary,
  Banner,
  Brand,
  Category,
  Coupon,
  DashboardMetrics,
  Favorite,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductImage,
  ProductVariant,
  ProductVideo,
  Profile,
  SiteSection,
  Supplier,
  SupplierProduct,
} from '../src/types/ecommerce.ts';
import { getSupabaseAdmin, isSupabaseConfigured } from './supabaseAdmin.ts';
import {
  deleteBlobMedia,
  getCachedBlobDb,
  isBlobPersistence,
  refreshBlobDb,
  saveBlobMedia,
  setCachedBlobDb,
} from './localPersistence.ts';

export const PRODUCT_MEDIA_BUCKET = 'produto-media';
export const BANNERS_BUCKET = 'banners';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'pulso_db.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

interface LocalAuthRecord {
  user_id: string;
  email: string;
  password_hash: string;
}

interface LocalDatabase {
  profiles: Profile[];
  auth_records: LocalAuthRecord[];
  categories: Category[];
  brands: Brand[];
  products: Omit<Product, 'brand' | 'category' | 'variants' | 'images' | 'videos'>[];
  product_variants: ProductVariant[];
  product_images: ProductImage[];
  product_videos: ProductVideo[];
  suppliers: Supplier[];
  supplier_products: SupplierProduct[];
  addresses: Address[];
  coupons: Coupon[];
  orders: Omit<Order, 'items'>[];
  order_items: OrderItem[];
  favorites: Favorite[];
  banners: Banner[];
  site_sections: SiteSection[];
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

const ADMIN_EMAILS = new Set(['j14menez@gmail.com', 'admin@pulsosneakers.com.br']);

export function isAuthorizedAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function createInitialLocalDb(): LocalDatabase {
  const now = new Date().toISOString();

  const adminId = '00000000-0000-4000-8000-000000000001';
  const customerId = '00000000-0000-4000-8000-000000000002';

  const catMasculinoEsportivo = '10000000-0000-4000-8000-000000000001';
  const catFemininoCasual = '10000000-0000-4000-8000-000000000002';
  const catUrbanoPremium = '10000000-0000-4000-8000-000000000003';
  const catInfantil = '10000000-0000-4000-8000-000000000004';

  const brandPulso = '20000000-0000-4000-8000-000000000001';
  const brandNike = '20000000-0000-4000-8000-000000000002';
  const brandAdidas = '20000000-0000-4000-8000-000000000003';
  const brandNewBalance = '20000000-0000-4000-8000-000000000004';

  const prod1 = '30000000-0000-4000-8000-000000000001';
  const prod2 = '30000000-0000-4000-8000-000000000002';
  const prod3 = '30000000-0000-4000-8000-000000000003';
  const prod4 = '30000000-0000-4000-8000-000000000004';
  const prod5 = '30000000-0000-4000-8000-000000000005';

  const sup1 = '40000000-0000-4000-8000-000000000001';
  const sup2 = '40000000-0000-4000-8000-000000000002';

  return {
    profiles: [
      {
        id: adminId,
        full_name: 'Administrador PULSO',
        email: 'admin@pulsosneakers.com.br',
        phone: '(11) 99999-0000',
        role: 'admin',
        created_at: now,
        updated_at: now,
      },
      {
        id: customerId,
        full_name: 'Rafael Mendes',
        email: 'cliente@pulsosneakers.com.br',
        phone: '(11) 98888-1234',
        role: 'customer',
        created_at: now,
        updated_at: now,
      },
    ],
    auth_records: [
      {
        user_id: adminId,
        email: 'admin@pulsosneakers.com.br',
        password_hash: hashPassword('PulsoAdmin@2026'),
      },
      {
        user_id: customerId,
        email: 'cliente@pulsosneakers.com.br',
        password_hash: hashPassword('PulsoCliente@2026'),
      },
    ],
    categories: [
      {
        id: catMasculinoEsportivo,
        name: 'Performance & Corrida',
        slug: 'performance-corrida',
        gender: 'masculino',
        style: 'esportivo',
        description: 'Tênis de alta performance para corrida, treino e velocidade.',
        image_url: '',
        sort_order: 1,
        is_active: true,
        created_at: now,
      },
      {
        id: catFemininoCasual,
        name: 'Casual Feminino',
        slug: 'casual-feminino',
        gender: 'feminino',
        style: 'casual',
        description: 'Silhuetas contemporâneas para rotina urbana com máximo conforto.',
        image_url: '',
        sort_order: 2,
        is_active: true,
        created_at: now,
      },
      {
        id: catUrbanoPremium,
        name: 'Urbano & Premium',
        slug: 'urbano-premium',
        gender: 'unissex',
        style: 'premium',
        description: 'Edições limitadas e acabamento premium em couro e camurça.',
        image_url: '',
        sort_order: 3,
        is_active: true,
        created_at: now,
      },
      {
        id: catInfantil,
        name: 'Infantil & Youth',
        slug: 'infantil-youth',
        gender: 'infantil',
        style: 'esportivo',
        description: 'Leveza, amortecimento e resistência para acompanhar cada passo.',
        image_url: '',
        sort_order: 4,
        is_active: true,
        created_at: now,
      },
    ],
    brands: [
      {
        id: brandPulso,
        name: 'PULSO Lab',
        slug: 'pulso-lab',
        logo_url: '',
        description: 'Linha autoral PULSO com engenharia de amortecimento responsivo.',
        is_active: true,
        created_at: now,
      },
      {
        id: brandNike,
        name: 'Nike',
        slug: 'nike',
        logo_url: '',
        description: 'Inovação esportiva global para performance e streetwear.',
        is_active: true,
        created_at: now,
      },
      {
        id: brandAdidas,
        name: 'Adidas',
        slug: 'adidas',
        logo_url: '',
        description: 'Design icônico das três listras entre esporte e cultura urbana.',
        is_active: true,
        created_at: now,
      },
      {
        id: brandNewBalance,
        name: 'New Balance',
        slug: 'new-balance',
        logo_url: '',
        description: 'Artesania técnica e estabilidade superior para o dia a dia.',
        is_active: true,
        created_at: now,
      },
    ],
    products: [
      {
        id: prod1,
        name: 'Pulso Pace Carbon V1',
        slug: 'pulso-pace-carbon-v1',
        sku: 'PLS-CRB-001',
        brand_id: brandPulso,
        category_id: catMasculinoEsportivo,
        short_description: 'Placa de propulsão com cabedal em knit respirável e retorno de energia.',
        description:
          'Desenvolvido para ritmo acelerado e transições precisas. Entressola em espuma de dupla densidade com placa estabilizadora, solado em borracha de alta tração e cabedal anatômico sem costuras.',
        original_price: 899.9,
        promo_price: 749.9,
        gender: 'masculino',
        style: 'esportivo',
        delivery_info: 'Envio direto do fornecedor homologado. Prazo estimado de 3 a 6 dias úteis.',
        is_featured: true,
        is_bestseller: true,
        is_new_release: true,
        is_special_offer: true,
        is_recommended: true,
        is_published: true,
        stock_status: 'supplier_dispatch',
        created_at: now,
        updated_at: now,
      },
      {
        id: prod2,
        name: 'Court Studio Low',
        slug: 'court-studio-low',
        sku: 'NB-CRT-024',
        brand_id: brandNewBalance,
        category_id: catFemininoCasual,
        short_description: 'Perfil baixo minimalista em couro macio com sola vulcanizada.',
        description:
          'Silhueta inspirada nas quadras clássicas dos anos 80, reinterpretada em couro selecionado, forro acolchoado em algodão orgânico e palmilha anatômica de alto conforto.',
        original_price: 649.9,
        promo_price: null,
        gender: 'feminino',
        style: 'casual',
        delivery_info: 'Envio direto em até 4 dias úteis com rastreamento completo.',
        is_featured: true,
        is_bestseller: true,
        is_new_release: false,
        is_special_offer: false,
        is_recommended: true,
        is_published: true,
        stock_status: 'in_stock',
        created_at: now,
        updated_at: now,
      },
      {
        id: prod3,
        name: 'Metropole Mono GTX',
        slug: 'metropole-mono-gtx',
        sku: 'ADI-MTP-088',
        brand_id: brandAdidas,
        category_id: catUrbanoPremium,
        short_description: 'Construção urbana monocromática com acabamento resistente à água.',
        description:
          'Projetado para atravessar a cidade sob qualquer clima. Camadas estruturais em nobuck técnico, cadarço de trava rápida e solado tratorado para máxima aderência no asfalto.',
        original_price: 1199.9,
        promo_price: 979.9,
        gender: 'unissex',
        style: 'premium',
        delivery_info: 'Envio direto prioritário em embalagem dupla. Prazo de 2 a 5 dias úteis.',
        is_featured: true,
        is_bestseller: false,
        is_new_release: true,
        is_special_offer: true,
        is_recommended: true,
        is_published: true,
        stock_status: 'supplier_dispatch',
        created_at: now,
        updated_at: now,
      },
      {
        id: prod4,
        name: 'Sprint Junior Air',
        slug: 'sprint-junior-air',
        sku: 'NK-JNR-012',
        brand_id: brandNike,
        category_id: catInfantil,
        short_description: 'Amortecimento leve com calce fácil para o público infantil.',
        description:
          'Construído para oferecer estabilidade e flexibilidade durante brincadeiras e atividades esportivas, com tecido ventilado e biqueira reforçada.',
        original_price: 429.9,
        promo_price: 369.9,
        gender: 'infantil',
        style: 'esportivo',
        delivery_info: 'Envio direto do distribuidor oficial em 3 a 7 dias úteis.',
        is_featured: false,
        is_bestseller: true,
        is_new_release: false,
        is_special_offer: true,
        is_recommended: true,
        is_published: true,
        stock_status: 'in_stock',
        created_at: now,
        updated_at: now,
      },
      {
        id: prod5,
        name: 'Tênis New Balance 9060',
        slug: 'tenis-new-balance-9060',
        sku: 'NB-9060-PRM',
        brand_id: brandNewBalance,
        category_id: catFemininoCasual,
        short_description: 'Premium · Couro legítimo com acabamento bicolor Preto & Branco.',
        description:
          'Tênis New Balance 9060 Feminino na edição Premium confeccionada em couro legítimo e mesh respirável. Entressola esculpida de dupla densidade com amortecimento avançado e silhueta urbana marcante. Numeração disponível do 34 ao 43.',
        original_price: 349.9,
        promo_price: null,
        gender: 'feminino',
        style: 'premium',
        delivery_info: 'Envio direto do distribuidor homologado. Prazo estimado de 3 a 6 dias úteis.',
        is_featured: true,
        is_bestseller: true,
        is_new_release: true,
        is_special_offer: false,
        is_recommended: true,
        is_published: true,
        stock_status: 'in_stock',
        created_at: now,
        updated_at: now,
      },
    ],
    product_variants: [
      { id: 'a0000000-0000-4000-8000-000000000101', product_id: prod1, size: '39', color_name: 'Preto / Lima', color_hex: '#0A0A0A', sku_variant: 'PLS-CRB-001-39', stock_qty: 8, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000102', product_id: prod1, size: '40', color_name: 'Preto / Lima', color_hex: '#0A0A0A', sku_variant: 'PLS-CRB-001-40', stock_qty: 12, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000103', product_id: prod1, size: '41', color_name: 'Preto / Lima', color_hex: '#0A0A0A', sku_variant: 'PLS-CRB-001-41', stock_qty: 6, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000104', product_id: prod1, size: '42', color_name: 'Branco Giz', color_hex: '#F4F4F5', sku_variant: 'PLS-CRB-001-42W', stock_qty: 5, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000201', product_id: prod2, size: '35', color_name: 'Branco Off', color_hex: '#F5F5F4', sku_variant: 'NB-CRT-024-35', stock_qty: 7, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000202', product_id: prod2, size: '36', color_name: 'Branco Off', color_hex: '#F5F5F4', sku_variant: 'NB-CRT-024-36', stock_qty: 10, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000203', product_id: prod2, size: '37', color_name: 'Branco Off', color_hex: '#F5F5F4', sku_variant: 'NB-CRT-024-37', stock_qty: 9, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000204', product_id: prod2, size: '38', color_name: 'Preto Fosco', color_hex: '#18181B', sku_variant: 'NB-CRT-024-38B', stock_qty: 4, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000301', product_id: prod3, size: '39', color_name: 'Grafite / Preto', color_hex: '#27272A', sku_variant: 'ADI-MTP-088-39', stock_qty: 5, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000302', product_id: prod3, size: '40', color_name: 'Grafite / Preto', color_hex: '#27272A', sku_variant: 'ADI-MTP-088-40', stock_qty: 7, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000303', product_id: prod3, size: '42', color_name: 'Grafite / Preto', color_hex: '#27272A', sku_variant: 'ADI-MTP-088-42', stock_qty: 3, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000401', product_id: prod4, size: '28', color_name: 'Branco / Lima', color_hex: '#A3E635', sku_variant: 'NK-JNR-012-28', stock_qty: 9, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000402', product_id: prod4, size: '30', color_name: 'Branco / Lima', color_hex: '#A3E635', sku_variant: 'NK-JNR-012-30', stock_qty: 6, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000403', product_id: prod4, size: '32', color_name: 'Preto Puro', color_hex: '#0A0A0A', sku_variant: 'NK-JNR-012-32', stock_qty: 11, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000501', product_id: prod5, size: '34', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-34', stock_qty: 8, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000502', product_id: prod5, size: '35', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-35', stock_qty: 10, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000503', product_id: prod5, size: '36', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-36', stock_qty: 12, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000504', product_id: prod5, size: '37', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-37', stock_qty: 12, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000505', product_id: prod5, size: '38', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-38', stock_qty: 10, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000506', product_id: prod5, size: '39', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-39', stock_qty: 8, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000507', product_id: prod5, size: '40', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-40', stock_qty: 8, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000508', product_id: prod5, size: '41', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-41', stock_qty: 6, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000509', product_id: prod5, size: '42', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-42', stock_qty: 6, is_available: true, created_at: now },
      { id: 'a0000000-0000-4000-8000-000000000510', product_id: prod5, size: '43', color_name: 'Preto / Branco', color_hex: '#0A0A0A', sku_variant: 'NB-9060-PRM-43', stock_qty: 5, is_available: true, created_at: now },
    ],
    product_images: [
      {
        id: '50000000-0000-4000-8000-000000000501',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.22_3e5d043b.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.22_3e5d043b.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino Premium Couro Legítimo - Vista lateral',
        is_primary: true,
        sort_order: 0,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
      {
        id: '50000000-0000-4000-8000-000000000502',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.28_f66cb2bb.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.28_f66cb2bb.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino Premium - Par em couro legítimo',
        is_primary: false,
        sort_order: 1,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
      {
        id: '50000000-0000-4000-8000-000000000503',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.33_d51f38bc.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.33_d51f38bc.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino - Detalhe lateral e caixa',
        is_primary: false,
        sort_order: 2,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
      {
        id: '50000000-0000-4000-8000-000000000504',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.16_1d3fd9d0.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.16_1d3fd9d0.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino - Calçado no pé',
        is_primary: false,
        sort_order: 3,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
      {
        id: '50000000-0000-4000-8000-000000000505',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.10_12f80b4c.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.10_12f80b4c.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino - Vista superior',
        is_primary: false,
        sort_order: 4,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
      {
        id: '50000000-0000-4000-8000-000000000506',
        product_id: prod5,
        storage_path: 'assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.39_1c16d52e.jpeg',
        public_url: '/assets/aistudio/WhatsApp_Image_2026-11-16_at_08.59.39_1c16d52e.jpeg',
        alt_text: 'Tênis New Balance 9060 Feminino - Editorial urbano',
        is_primary: false,
        sort_order: 5,
        file_size: 250000,
        mime_type: 'image/jpeg',
        created_at: now,
      },
    ],
    product_videos: [],
    suppliers: [
      {
        id: sup1,
        name: 'Distribuidora Sul Footwear',
        contact_name: 'Mariana Costa',
        email: 'pedidos@sulfootwear.com.br',
        phone: '(51) 3344-9900',
        cnpj: '12.345.678/0001-90',
        shipping_lead_time_days: 3,
        direct_to_customer: true,
        integration_type: 'manual',
        notes: 'Operação dropshipping nacional com postagem em até 24h úteis.',
        is_active: true,
        created_at: now,
      },
      {
        id: sup2,
        name: 'Centro Logístico Urbano SP',
        contact_name: 'Lucas Ferreira',
        email: 'logistica@urbanosp.com.br',
        phone: '(11) 4002-7788',
        cnpj: '98.765.432/0001-10',
        shipping_lead_time_days: 2,
        direct_to_customer: true,
        integration_type: 'api',
        api_endpoint: 'https://api.urbanosp.example/v1/inventory',
        notes: 'Sincronização automática de estoque via endpoint REST.',
        is_active: true,
        created_at: now,
      },
    ],
    supplier_products: [
      {
        id: '90000000-0000-4000-8000-000000000001',
        supplier_id: sup1,
        product_id: prod1,
        supplier_sku: 'SUL-PACE-99',
        acquisition_cost: 420.0,
        supplier_stock_qty: 26,
        is_available: true,
        shipping_days_override: 3,
        last_synced_at: now,
        created_at: now,
      },
      {
        id: '90000000-0000-4000-8000-000000000002',
        supplier_id: sup2,
        product_id: prod3,
        supplier_sku: 'URB-GTX-44',
        acquisition_cost: 590.0,
        supplier_stock_qty: 15,
        is_available: true,
        shipping_days_override: 2,
        last_synced_at: now,
        created_at: now,
      },
    ],
    addresses: [
      {
        id: 'b0000000-0000-4000-8000-000000000001',
        user_id: customerId,
        label: 'Casa',
        recipient_name: 'Rafael Mendes',
        zip_code: '01310-100',
        street: 'Av. Paulista',
        number: '1578',
        complement: 'Apto 84',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        is_default: true,
        created_at: now,
      },
    ],
    coupons: [
      {
        id: '80000000-0000-4000-8000-000000000001',
        code: 'PULSO10',
        description: '10% de desconto na primeira compra na loja oficial',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 200,
        max_uses: 500,
        used_count: 0,
        valid_from: now,
        valid_until: '2027-12-31T23:59:59.000Z',
        is_active: true,
        created_at: now,
      },
    ],
    orders: [],
    order_items: [],
    favorites: [],
    banners: [
      {
        id: '60000000-0000-4000-8000-000000000001',
        title: 'Seu estilo. Seu ritmo.',
        subtitle:
          'Curadoria de tênis esportivos, casuais e urbanos com envio direto ao consumidor.',
        cta_label: 'Explorar Catálogo',
        cta_link: '#catalogo',
        image_url: '/src/assets/images/hero_pulso_campaign_1794847951704.jpg',
        placement: 'hero',
        is_active: true,
        sort_order: 1,
        created_at: now,
      },
      {
        id: '60000000-0000-4000-8000-000000000002',
        title: 'Linha Urbana & Edições Limitadas',
        subtitle:
          'Construção arquitetônica, amortecimento responsivo e envio direto garantido.',
        cta_label: 'Ver Lançamentos',
        cta_link: '#catalogo',
        image_url: '/src/assets/images/promo_urban_editorial_1794847952373.jpg',
        placement: 'promo',
        is_active: true,
        sort_order: 2,
        created_at: now,
      },
    ],
    site_sections: [
      {
        id: '70000000-0000-4000-8000-000000000001',
        section_key: 'hero',
        title: 'Campanha Principal',
        subtitle: 'PULSO Sneakers',
        description: 'Banner principal administrável da página inicial.',
        is_enabled: true,
        sort_order: 1,
        config_json: {},
        updated_at: now,
      },
      {
        id: '70000000-0000-4000-8000-000000000002',
        section_key: 'highlights',
        title: 'Destaques e Lançamentos',
        subtitle: 'Seleção Curada',
        description: 'Produtos marcados como destaque ou lançamento no painel administrativo.',
        is_enabled: true,
        sort_order: 2,
        config_json: {},
        updated_at: now,
      },
      {
        id: '70000000-0000-4000-8000-000000000003',
        section_key: 'catalog',
        title: 'Catálogo Completo',
        subtitle: 'Filtre por marca, tamanho, cor e categoria',
        description: 'Vitrine principal com filtros avançados e pesquisa em tempo real.',
        is_enabled: true,
        sort_order: 3,
        config_json: {},
        updated_at: now,
      },
      {
        id: '70000000-0000-4000-8000-000000000004',
        section_key: 'videos',
        title: 'Vídeos Promocionais',
        subtitle: 'Campanhas e Demonstrações',
        description: 'Vídeos reais enviados pelo administrador.',
        is_enabled: true,
        sort_order: 4,
        config_json: {},
        updated_at: now,
      },
    ],
  };
}

function ensureLocalDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/** Reloads the local fallback database from durable storage (Netlify Blobs) before a request. */
export async function syncLocalDb(): Promise<void> {
  await refreshBlobDb(createInitialLocalDb);
}

async function removeLocalMedia(storagePath: string) {
  if (isBlobPersistence()) {
    await deleteBlobMedia(storagePath);
    return;
  }
  const fullDiskPath = path.join(UPLOADS_DIR, storagePath);
  if (fs.existsSync(fullDiskPath)) fs.unlinkSync(fullDiskPath);
}

function readLocalDb(): LocalDatabase {
  if (isBlobPersistence()) {
    const cached = getCachedBlobDb<LocalDatabase>();
    if (cached) return cached;
    const initial = createInitialLocalDb();
    setCachedBlobDb(initial);
    return initial;
  }
  ensureLocalDirs();
  if (!fs.existsSync(DB_PATH)) {
    const initial = createInitialLocalDb();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw) as LocalDatabase;
}

function writeLocalDb(db: LocalDatabase) {
  if (isBlobPersistence()) {
    setCachedBlobDb(db);
    return;
  }
  ensureLocalDirs();
  const tmpPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, DB_PATH);
}

function hydrateProducts(
  rawProducts: LocalDatabase['products'],
  brands: Brand[],
  categories: Category[],
  variants: ProductVariant[],
  images: ProductImage[],
  videos: ProductVideo[]
): Product[] {
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return rawProducts.map((p) => {
    const pImages = images
      .filter((img) => img.product_id === p.id)
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const pVideos = videos
      .filter((vid) => vid.product_id === p.id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const pVariants = variants.filter((v) => v.product_id === p.id);

    return {
      ...p,
      brand: p.brand_id ? brandMap.get(p.brand_id) || null : null,
      category: p.category_id ? catMap.get(p.category_id) || null : null,
      variants: pVariants,
      images: pImages,
      videos: pVideos,
    };
  });
}

// ============================================================================
// REPOSITORY API (Automatically switches between Supabase & Local Persistence)
// ============================================================================

let supabaseSeededOk = false;
let lastSupabaseProbeAt = 0;
let lastSupabaseDiagnostic: string | null = null;
const PROBE_RETRY_INTERVAL_MS = 10_000;

export function getLastSupabaseDiagnostic(): string | null {
  return lastSupabaseDiagnostic;
}

async function ensureStorageBuckets(supa: NonNullable<ReturnType<typeof getSupabaseAdmin>>) {
  const buckets = [
    {
      id: PRODUCT_MEDIA_BUCKET,
      fileSizeLimit: 83886080,
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/avif',
        'video/mp4',
        'video/webm',
        'video/quicktime',
      ],
    },
    {
      id: BANNERS_BUCKET,
      fileSizeLimit: 15728640,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'],
    },
  ];

  for (const b of buckets) {
    const { error } = await supa.storage.getBucket(b.id);
    if (error) {
      await supa.storage.createBucket(b.id, {
        public: true,
        fileSizeLimit: b.fileSizeLimit,
        allowedMimeTypes: b.allowedMimeTypes,
      });
    }
  }
}

export async function ensureSupabaseSeeded(): Promise<boolean> {
  const supa = getSupabaseAdmin();
  if (!supa) {
    lastSupabaseDiagnostic = 'Variáveis SUPABASE_URL, SUPABASE_ANON_KEY ou SUPABASE_SERVICE_ROLE_KEY ausentes no servidor.';
    return false;
  }
  if (supabaseSeededOk) return true;
  if (Date.now() - lastSupabaseProbeAt < PROBE_RETRY_INTERVAL_MS) {
    return false;
  }
  lastSupabaseProbeAt = Date.now();

  const { error: probeErr } = await supa.from('products').select('id').limit(1);
  if (probeErr) {
    lastSupabaseDiagnostic = probeErr.message;
    console.warn('[PULSO] Supabase schema not ready, using local persistence fallback:', probeErr.message);
    return false;
  }

  lastSupabaseDiagnostic = null;
  supabaseSeededOk = true;
  await ensureStorageBuckets(supa).catch(() => null);
  const seed = createInitialLocalDb();

  const seedErrors: string[] = [];

  // Check each table independently so missing tables are backfilled cleanly
  const [
    { count: catCount },
    { count: brdCount },
    { count: supCount },
    { count: cpnCount },
    { count: banCount },
    { count: secCount },
  ] = await Promise.all([
    supa.from('categories').select('id', { count: 'exact', head: true }),
    supa.from('brands').select('id', { count: 'exact', head: true }),
    supa.from('suppliers').select('id', { count: 'exact', head: true }),
    supa.from('coupons').select('id', { count: 'exact', head: true }),
    supa.from('banners').select('id', { count: 'exact', head: true }),
    supa.from('site_sections').select('id', { count: 'exact', head: true }),
  ]);

  if (!catCount) {
    const { error } = await supa.from('categories').upsert(seed.categories, { onConflict: 'id' });
    if (error) seedErrors.push(`categories: ${error.message}`);
  }
  if (!brdCount) {
    const { error } = await supa.from('brands').upsert(seed.brands, { onConflict: 'id' });
    if (error) seedErrors.push(`brands: ${error.message}`);
  }
  if (!supCount) {
    const { error } = await supa.from('suppliers').upsert(seed.suppliers, { onConflict: 'id' });
    if (error) seedErrors.push(`suppliers: ${error.message}`);
  }
  if (!cpnCount) {
    const { error } = await supa.from('coupons').upsert(seed.coupons, { onConflict: 'id' });
    if (error) seedErrors.push(`coupons: ${error.message}`);
  }
  if (!banCount) {
    const { error } = await supa.from('banners').upsert(seed.banners, { onConflict: 'id' });
    if (error) seedErrors.push(`banners: ${error.message}`);
  }
  if (!secCount) {
    const { error } = await supa.from('site_sections').upsert(seed.site_sections, { onConflict: 'id' });
    if (error) seedErrors.push(`site_sections: ${error.message}`);
  }

  // Ensure initial catalog & Tênis New Balance 9060 are present in Supabase
  const { count: prodCount } = await supa
    .from('products')
    .select('id', { count: 'exact', head: true });

  const { data: existingNb } = await supa
    .from('products')
    .select('id')
    .eq('sku', 'NB-9060-PRM')
    .maybeSingle();

  if (!prodCount || !existingNb) {
    await supa.from('brands').upsert(seed.brands, { onConflict: 'slug' });
    await supa.from('categories').upsert(seed.categories, { onConflict: 'slug' });

    const productsToInsert = !prodCount
      ? seed.products
      : seed.products.filter((p) => p.sku === 'NB-9060-PRM');

    if (productsToInsert.length > 0) {
      const { error } = await supa.from('products').upsert(productsToInsert, { onConflict: 'id' });
      if (error) seedErrors.push(`products: ${error.message}`);
    }
  }

  // Backfill product_variants and product_images for any seeded products that currently have 0
  const seedSkus = seed.products.map((p) => p.sku);
  const { data: liveSeedProducts } = await supa
    .from('products')
    .select('id,sku')
    .in('sku', seedSkus);

  if (liveSeedProducts && liveSeedProducts.length > 0) {
    const skuToSeedProdId = new Map(seed.products.map((p) => [p.sku, p.id]));
    const liveProdIds = liveSeedProducts.map((p: { id: string }) => p.id);

    const [{ data: existingVars }, { data: existingImgs }] = await Promise.all([
      supa.from('product_variants').select('product_id').in('product_id', liveProdIds),
      supa.from('product_images').select('product_id').in('product_id', liveProdIds),
    ]);

    const prodsWithVars = new Set((existingVars || []).map((v: { product_id: string }) => v.product_id));
    const prodsWithImgs = new Set((existingImgs || []).map((i: { product_id: string }) => i.product_id));

    const variantsToInsert: typeof seed.product_variants = [];
    const imagesToInsert: typeof seed.product_images = [];

    for (const liveProd of liveSeedProducts as Array<{ id: string; sku: string }>) {
      const seedProdId = skuToSeedProdId.get(liveProd.sku);
      if (!seedProdId) continue;

      if (!prodsWithVars.has(liveProd.id)) {
        const matchingVars = seed.product_variants
          .filter((v) => v.product_id === seedProdId)
          .map((v) => ({ ...v, product_id: liveProd.id }));
        variantsToInsert.push(...matchingVars);
      }

      if (!prodsWithImgs.has(liveProd.id)) {
        const matchingImgs = seed.product_images
          .filter((i) => i.product_id === seedProdId)
          .map((i) => ({ ...i, product_id: liveProd.id }));
        imagesToInsert.push(...matchingImgs);
      }
    }

    if (variantsToInsert.length > 0) {
      const { error } = await supa.from('product_variants').upsert(variantsToInsert, { onConflict: 'id' });
      if (error) seedErrors.push(`product_variants: ${error.message}`);
    }
    if (imagesToInsert.length > 0) {
      const { error } = await supa.from('product_images').upsert(imagesToInsert, { onConflict: 'id' });
      if (error) seedErrors.push(`product_images: ${error.message}`);
    }
  }

  // Seed supplier_products if empty and referenced rows exist
  const { count: spCount } = await supa
    .from('supplier_products')
    .select('id', { count: 'exact', head: true });
  if (!spCount) {
    const [{ data: liveProds }, { data: liveSups }] = await Promise.all([
      supa.from('products').select('id').in('id', seed.supplier_products.map((sp) => sp.product_id)),
      supa.from('suppliers').select('id').in('id', seed.supplier_products.map((sp) => sp.supplier_id)),
    ]);
    const validProdIds = new Set((liveProds || []).map((p: { id: string }) => p.id));
    const validSupIds = new Set((liveSups || []).map((s: { id: string }) => s.id));
    const spRows = seed.supplier_products.filter(
      (sp) => validProdIds.has(sp.product_id) && validSupIds.has(sp.supplier_id)
    );
    if (spRows.length > 0) {
      const { error } = await supa.from('supplier_products').upsert(spRows, { onConflict: 'id' });
      if (error) seedErrors.push(`supplier_products: ${error.message}`);
    }
  }

  if (seedErrors.length > 0) {
    lastSupabaseDiagnostic = `Erros no seed automático: ${seedErrors.join(' | ')}`;
    console.error('[PULSO] Supabase seed errors:', seedErrors.join(' | '));
  }

  return true;
}

export async function getActiveSupabase() {
  const ready = await ensureSupabaseSeeded();
  return ready ? getSupabaseAdmin() : null;
}

export async function getStorefrontBootstrap() {
  const supa = await getActiveSupabase();
  if (supa) {
    const [cats, brds, prods, vars, imgs, vids, bans, secs] = await Promise.all([
      supa.from('categories').select('*').eq('is_active', true).order('sort_order'),
      supa.from('brands').select('*').eq('is_active', true).order('name'),
      supa.from('products').select('*').eq('is_published', true).order('created_at', { ascending: false }),
      supa.from('product_variants').select('*'),
      supa.from('product_images').select('*').order('sort_order'),
      supa.from('product_videos').select('*').order('sort_order'),
      supa.from('banners').select('*').eq('is_active', true).order('sort_order'),
      supa.from('site_sections').select('*').order('sort_order'),
    ]);

    if (!prods.error) {
      const products = hydrateProducts(
        (prods.data || []) as LocalDatabase['products'],
        (brds.data || []) as Brand[],
        (cats.data || []) as Category[],
        (vars.data || []) as ProductVariant[],
        (imgs.data || []) as ProductImage[],
        (vids.data || []) as ProductVideo[]
      );

      return {
        categories: (cats.data || []) as Category[],
        brands: (brds.data || []) as Brand[],
        products,
        banners: (bans.data || []) as Banner[],
        site_sections: (secs.data || []) as SiteSection[],
        campaign_videos: ((vids.data || []) as ProductVideo[]).filter(
          (v) => v.is_campaign || products.some((p) => p.id === v.product_id)
        ),
      };
    }
  }

  const db = readLocalDb();
  const activeCategories = db.categories.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
  const activeBrands = db.brands.filter((b) => b.is_active).sort((a, b) => a.name.localeCompare(b.name));
  const publishedRaw = db.products.filter((p) => p.is_published);
  const products = hydrateProducts(
    publishedRaw,
    db.brands,
    db.categories,
    db.product_variants,
    db.product_images,
    db.product_videos
  );

  return {
    categories: activeCategories,
    brands: activeBrands,
    products,
    banners: db.banners.filter((b) => b.is_active).sort((a, b) => a.sort_order - b.sort_order),
    site_sections: db.site_sections.sort((a, b) => a.sort_order - b.sort_order),
    campaign_videos: db.product_videos.filter(
      (v) => v.is_campaign || products.some((p) => p.id === v.product_id)
    ),
  };
}

// ============================================================================
// AUTH & PROFILES
// ============================================================================

export async function findProfileById(userId: string): Promise<Profile | null> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data } = await supa.from('profiles').select('*').eq('id', userId).single();
    const profile = (data as Profile) || null;
    if (profile && isAuthorizedAdminEmail(profile.email) && profile.role !== 'admin') {
      const { data: updated } = await supa
        .from('profiles')
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select()
        .single();
      return (updated as Profile) || { ...profile, role: 'admin' };
    }
    return profile;
  }
  const db = readLocalDb();
  const profile = db.profiles.find((p) => p.id === userId) || null;
  if (profile && isAuthorizedAdminEmail(profile.email) && profile.role !== 'admin') {
    profile.role = 'admin';
    profile.updated_at = new Date().toISOString();
    writeLocalDb(db);
  }
  return profile;
}

export async function registerLocalCustomer(fullName: string, email: string, password: string): Promise<Profile> {
  const db = readLocalDb();
  const normalized = email.trim().toLowerCase();
  if (db.profiles.some((p) => p.email.toLowerCase() === normalized)) {
    throw new Error('Já existe uma conta cadastrada com este e-mail.');
  }
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const profile: Profile = {
    id,
    full_name: fullName.trim(),
    email: normalized,
    phone: '',
    role: isAuthorizedAdminEmail(normalized) ? 'admin' : 'customer',
    created_at: now,
    updated_at: now,
  };
  db.profiles.push(profile);
  db.auth_records.push({
    user_id: id,
    email: normalized,
    password_hash: hashPassword(password),
  });
  writeLocalDb(db);
  return profile;
}

export async function authenticateLocalUser(email: string, password: string): Promise<Profile> {
  const db = readLocalDb();
  const normalized = email.trim().toLowerCase();
  const authRec = db.auth_records.find((r) => r.email.toLowerCase() === normalized);
  if (!authRec || !verifyPassword(password, authRec.password_hash)) {
    throw new Error('E-mail ou senha inválidos.');
  }
  const profile = db.profiles.find((p) => p.id === authRec.user_id);
  if (!profile) throw new Error('Perfil não encontrado.');
  if (isAuthorizedAdminEmail(normalized) && profile.role !== 'admin') {
    profile.role = 'admin';
    profile.updated_at = new Date().toISOString();
    writeLocalDb(db);
  }
  return profile;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'cpf'>>
): Promise<Profile> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data, error } = await supa
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        cpf: updates.cpf,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Profile;
  }

  const db = readLocalDb();
  const idx = db.profiles.findIndex((p) => p.id === userId);
  if (idx === -1) throw new Error('Perfil não encontrado.');
  db.profiles[idx] = {
    ...db.profiles[idx],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  writeLocalDb(db);
  return db.profiles[idx];
}

// ============================================================================
// ADMIN PRODUCTS, VARIANTS & MEDIA
// ============================================================================

export async function adminListAllProducts(): Promise<Product[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const [cats, brds, prods, vars, imgs, vids] = await Promise.all([
      supa.from('categories').select('*'),
      supa.from('brands').select('*'),
      supa.from('products').select('*').order('created_at', { ascending: false }),
      supa.from('product_variants').select('*'),
      supa.from('product_images').select('*').order('sort_order'),
      supa.from('product_videos').select('*').order('sort_order'),
    ]);
    return hydrateProducts(
      (prods.data || []) as LocalDatabase['products'],
      (brds.data || []) as Brand[],
      (cats.data || []) as Category[],
      (vars.data || []) as ProductVariant[],
      (imgs.data || []) as ProductImage[],
      (vids.data || []) as ProductVideo[]
    );
  }

  const db = readLocalDb();
  return hydrateProducts(
    [...db.products].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    db.brands,
    db.categories,
    db.product_variants,
    db.product_images,
    db.product_videos
  );
}

export interface SaveProductInput {
  id?: string;
  name: string;
  sku: string;
  brand_id: string | null;
  category_id: string | null;
  short_description: string;
  description: string;
  original_price: number;
  promo_price: number | null;
  gender: Product['gender'];
  style: Product['style'];
  delivery_info: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_release: boolean;
  is_special_offer: boolean;
  is_recommended: boolean;
  is_published: boolean;
  stock_status: Product['stock_status'];
  variants: Array<{
    id?: string;
    size: string;
    color_name: string;
    color_hex: string;
    sku_variant?: string;
    stock_qty: number;
    is_available: boolean;
  }>;
}

export async function adminSaveProduct(input: SaveProductInput): Promise<Product> {
  const now = new Date().toISOString();
  const baseSlug = slugify(input.name);
  const supa = await getActiveSupabase();

  if (supa) {
    const productId = input.id || crypto.randomUUID();
    const payload = {
      id: productId,
      name: input.name.trim(),
      slug: input.id ? undefined : `${baseSlug}-${productId.slice(0, 5)}`,
      sku: input.sku.trim().toUpperCase(),
      brand_id: input.brand_id || null,
      category_id: input.category_id || null,
      short_description: input.short_description,
      description: input.description,
      original_price: Number(input.original_price),
      promo_price: input.promo_price ? Number(input.promo_price) : null,
      gender: input.gender,
      style: input.style,
      delivery_info: input.delivery_info,
      is_featured: input.is_featured,
      is_bestseller: input.is_bestseller,
      is_new_release: input.is_new_release,
      is_special_offer: input.is_special_offer,
      is_recommended: input.is_recommended,
      is_published: input.is_published,
      stock_status: input.stock_status,
      updated_at: now,
    };

    if (input.id) {
      const { error } = await supa.from('products').update(payload).eq('id', input.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supa.from('products').insert({
        ...payload,
        slug: `${baseSlug}-${productId.slice(0, 5)}`,
        created_at: now,
      });
      if (error) throw new Error(error.message);
    }

    const [{ data: existingVars }, { data: referencedItems }] = await Promise.all([
      supa.from('product_variants').select('id,size,color_name').eq('product_id', productId),
      supa.from('order_items').select('variant_id').eq('product_id', productId),
    ]);

    const existingList = (existingVars || []) as Array<{ id: string; size: string; color_name: string }>;
    const referencedVariantIds = new Set(
      ((referencedItems || []) as Array<{ variant_id: string | null }>)
        .map((r) => r.variant_id)
        .filter((id): id is string => Boolean(id))
    );

    const keptIds = new Set<string>();
    const varRows = input.variants.map((v, idx) => {
      const matched =
        (v.id && existingList.find((ev) => ev.id === v.id)) ||
        existingList.find(
          (ev) =>
            ev.size.trim().toLowerCase() === v.size.trim().toLowerCase() &&
            ev.color_name.trim().toLowerCase() === v.color_name.trim().toLowerCase()
        );
      const varId = matched?.id || (v.id && v.id.length > 20 ? v.id : crypto.randomUUID());
      keptIds.add(varId);
      return {
        id: varId,
        product_id: productId,
        size: v.size.trim(),
        color_name: v.color_name.trim(),
        color_hex: v.color_hex || '#0A0A0A',
        sku_variant: v.sku_variant || `${input.sku.trim().toUpperCase()}-${v.size}-${idx + 1}`,
        stock_qty: Number(v.stock_qty) || 0,
        is_available: v.is_available,
        created_at: now,
      };
    });

    if (varRows.length > 0) {
      const { error: varErr } = await supa
        .from('product_variants')
        .upsert(varRows, { onConflict: 'id' });
      if (varErr) throw new Error(varErr.message);
    }

    // Preserve old variants referenced in historical order_items (disable instead of deleting)
    const removedVars = existingList.filter((ev) => !keptIds.has(ev.id));
    const toDisable = removedVars.filter((ev) => referencedVariantIds.has(ev.id)).map((ev) => ev.id);
    const toDelete = removedVars.filter((ev) => !referencedVariantIds.has(ev.id)).map((ev) => ev.id);

    if (toDisable.length > 0) {
      await supa
        .from('product_variants')
        .update({ is_available: false, stock_qty: 0 })
        .in('id', toDisable);
    }
    if (toDelete.length > 0) {
      await supa.from('product_variants').delete().in('id', toDelete);
    }

    const all = await adminListAllProducts();
    const found = all.find((p) => p.id === productId);
    if (!found) throw new Error('Erro ao recarregar produto salvo.');
    return found;
  }

  const db = readLocalDb();
  const productId = input.id || crypto.randomUUID();
  const existingIdx = db.products.findIndex((p) => p.id === productId);

  const productRecord = {
    id: productId,
    name: input.name.trim(),
    slug:
      existingIdx >= 0
        ? db.products[existingIdx].slug
        : `${baseSlug}-${productId.slice(0, 5)}`,
    sku: input.sku.trim().toUpperCase(),
    brand_id: input.brand_id || null,
    category_id: input.category_id || null,
    short_description: input.short_description,
    description: input.description,
    original_price: Number(input.original_price),
    promo_price: input.promo_price ? Number(input.promo_price) : null,
    gender: input.gender,
    style: input.style,
    delivery_info: input.delivery_info,
    is_featured: input.is_featured,
    is_bestseller: input.is_bestseller,
    is_new_release: input.is_new_release,
    is_special_offer: input.is_special_offer,
    is_recommended: input.is_recommended,
    is_published: input.is_published,
    stock_status: input.stock_status,
    created_at: existingIdx >= 0 ? db.products[existingIdx].created_at : now,
    updated_at: now,
  };

  if (existingIdx >= 0) {
    db.products[existingIdx] = productRecord;
  } else {
    db.products.unshift(productRecord);
  }

  const existingLocalVars = db.product_variants.filter((v) => v.product_id === productId);
  const referencedLocalVariantIds = new Set(
    db.order_items
      .filter((oi) => oi.product_id === productId && oi.variant_id)
      .map((oi) => oi.variant_id as string)
  );
  const keptLocalIds = new Set<string>();
  const nextProductVars: ProductVariant[] = [];

  for (let i = 0; i < input.variants.length; i++) {
    const v = input.variants[i];
    const matched =
      (v.id && existingLocalVars.find((ev) => ev.id === v.id)) ||
      existingLocalVars.find(
        (ev) =>
          ev.size.trim().toLowerCase() === v.size.trim().toLowerCase() &&
          ev.color_name.trim().toLowerCase() === v.color_name.trim().toLowerCase()
      );
    const varId = matched?.id || v.id || crypto.randomUUID();
    keptLocalIds.add(varId);
    nextProductVars.push({
      id: varId,
      product_id: productId,
      size: v.size.trim(),
      color_name: v.color_name.trim(),
      color_hex: v.color_hex || '#0A0A0A',
      sku_variant: v.sku_variant || `${productRecord.sku}-${v.size}-${i + 1}`,
      stock_qty: Number(v.stock_qty) || 0,
      is_available: v.is_available,
      created_at: matched?.created_at || now,
    });
  }

  for (const oldVar of existingLocalVars) {
    if (!keptLocalIds.has(oldVar.id) && referencedLocalVariantIds.has(oldVar.id)) {
      nextProductVars.push({ ...oldVar, is_available: false, stock_qty: 0 });
    }
  }

  db.product_variants = db.product_variants
    .filter((v) => v.product_id !== productId)
    .concat(nextProductVars);

  writeLocalDb(db);
  const hydrated = hydrateProducts(
    [productRecord],
    db.brands,
    db.categories,
    db.product_variants,
    db.product_images,
    db.product_videos
  );
  return hydrated[0];
}

export async function adminDeleteProduct(productId: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { error } = await supa.from('products').delete().eq('id', productId);
    if (error) throw new Error(error.message);
    return;
  }

  const db = readLocalDb();
  db.products = db.products.filter((p) => p.id !== productId);
  db.product_variants = db.product_variants.filter((v) => v.product_id !== productId);
  db.product_images = db.product_images.filter((i) => i.product_id !== productId);
  db.product_videos = db.product_videos.filter((v) => v.product_id !== productId);
  db.supplier_products = db.supplier_products.filter((sp) => sp.product_id !== productId);
  db.favorites = db.favorites.filter((f) => f.product_id !== productId);
  writeLocalDb(db);
}

export async function saveUploadedProductMedia(params: {
  productId: string | null;
  kind: 'image' | 'video' | 'banner';
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  fileSize: number;
  title?: string;
  isCampaign?: boolean;
}): Promise<{
  public_url: string;
  storage_path: string;
  imageRecord?: ProductImage;
  videoRecord?: ProductVideo;
}> {
  const safeExt = path.extname(params.originalName).toLowerCase() || (params.kind === 'video' ? '.mp4' : '.jpg');
  const fileId = crypto.randomUUID();
  const folder =
    params.kind === 'banner'
      ? 'banners'
      : `products/${params.productId || 'campaigns'}`;
  const storagePath = `${folder}/${fileId}${safeExt}`;
  const now = new Date().toISOString();

  let publicUrl = '';
  const supa = await getActiveSupabase();

  if (supa) {
    const bucket = params.kind === 'banner' ? BANNERS_BUCKET : PRODUCT_MEDIA_BUCKET;
    const { error: uploadErr } = await supa.storage.from(bucket).upload(storagePath, params.buffer, {
      contentType: params.mimeType,
      upsert: false,
    });
    if (uploadErr) throw new Error(`Falha no Supabase Storage: ${uploadErr.message}`);
    const { data: pub } = supa.storage.from(bucket).getPublicUrl(storagePath);
    publicUrl = pub.publicUrl;
  } else if (isBlobPersistence()) {
    await saveBlobMedia(storagePath, params.buffer, params.mimeType);
    publicUrl = `/uploads/${storagePath}`;
  } else {
    const targetDir = path.join(UPLOADS_DIR, folder);
    fs.mkdirSync(targetDir, { recursive: true });
    const fullDiskPath = path.join(UPLOADS_DIR, storagePath);
    fs.writeFileSync(fullDiskPath, params.buffer);
    publicUrl = `/uploads/${storagePath}`;
  }

  if (params.kind === 'banner') {
    return { public_url: publicUrl, storage_path: storagePath };
  }

  if (params.kind === 'image') {
    if (!params.productId) throw new Error('productId é obrigatório para upload de imagem de produto.');

    if (supa) {
      const { data: existingImgs } = await supa
        .from('product_images')
        .select('id')
        .eq('product_id', params.productId);
      const isFirst = !existingImgs || existingImgs.length === 0;
      const sortOrder = existingImgs ? existingImgs.length : 0;

      const { data, error } = await supa
        .from('product_images')
        .insert({
          product_id: params.productId,
          storage_path: storagePath,
          public_url: publicUrl,
          alt_text: params.title || params.originalName,
          is_primary: isFirst,
          sort_order: sortOrder,
          file_size: params.fileSize,
          mime_type: params.mimeType,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { public_url: publicUrl, storage_path: storagePath, imageRecord: data as ProductImage };
    }

    const db = readLocalDb();
    const existingImgs = db.product_images.filter((i) => i.product_id === params.productId);
    const imageRecord: ProductImage = {
      id: crypto.randomUUID(),
      product_id: params.productId,
      storage_path: storagePath,
      public_url: publicUrl,
      alt_text: params.title || params.originalName,
      is_primary: existingImgs.length === 0,
      sort_order: existingImgs.length,
      file_size: params.fileSize,
      mime_type: params.mimeType,
      created_at: now,
    };
    db.product_images.push(imageRecord);
    writeLocalDb(db);
    return { public_url: publicUrl, storage_path: storagePath, imageRecord };
  }

  // Video
  if (supa) {
    const { data, error } = await supa
      .from('product_videos')
      .insert({
        product_id: params.productId || null,
        title: params.title || params.originalName,
        storage_path: storagePath,
        public_url: publicUrl,
        file_size: params.fileSize,
        mime_type: params.mimeType,
        is_campaign: Boolean(params.isCampaign),
        sort_order: 0,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { public_url: publicUrl, storage_path: storagePath, videoRecord: data as ProductVideo };
  }

  const db = readLocalDb();
  const videoRecord: ProductVideo = {
    id: crypto.randomUUID(),
    product_id: params.productId || null,
    title: params.title || params.originalName,
    storage_path: storagePath,
    public_url: publicUrl,
    file_size: params.fileSize,
    mime_type: params.mimeType,
    is_campaign: Boolean(params.isCampaign),
    sort_order: db.product_videos.length,
    created_at: now,
  };
  db.product_videos.push(videoRecord);
  writeLocalDb(db);
  return { public_url: publicUrl, storage_path: storagePath, videoRecord };
}

export async function reorderProductImages(productId: string, orderedImageIds: string[]): Promise<ProductImage[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    for (let i = 0; i < orderedImageIds.length; i++) {
      await supa
        .from('product_images')
        .update({ sort_order: i })
        .eq('id', orderedImageIds[i])
        .eq('product_id', productId);
    }
    const { data } = await supa
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .order('sort_order');
    return (data || []) as ProductImage[];
  }

  const db = readLocalDb();
  orderedImageIds.forEach((imgId, idx) => {
    const img = db.product_images.find((i) => i.id === imgId && i.product_id === productId);
    if (img) img.sort_order = idx;
  });
  writeLocalDb(db);
  return db.product_images
    .filter((i) => i.product_id === productId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function setPrimaryProductImage(productId: string, imageId: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    await supa.from('product_images').update({ is_primary: false }).eq('product_id', productId);
    await supa
      .from('product_images')
      .update({ is_primary: true })
      .eq('id', imageId)
      .eq('product_id', productId);
    return;
  }

  const db = readLocalDb();
  db.product_images.forEach((img) => {
    if (img.product_id === productId) {
      img.is_primary = img.id === imageId;
    }
  });
  writeLocalDb(db);
}

export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data: img } = await supa
      .from('product_images')
      .select('*')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single();
    if (img?.storage_path) {
      await supa.storage.from(PRODUCT_MEDIA_BUCKET).remove([img.storage_path]);
    }
    await supa.from('product_images').delete().eq('id', imageId);
    return;
  }

  const db = readLocalDb();
  const img = db.product_images.find((i) => i.id === imageId && i.product_id === productId);
  if (img) {
    await removeLocalMedia(img.storage_path);
  }
  db.product_images = db.product_images.filter((i) => i.id !== imageId);
  // Ensure another image becomes primary if the primary was removed
  const remaining = db.product_images.filter((i) => i.product_id === productId);
  if (remaining.length > 0 && !remaining.some((i) => i.is_primary)) {
    remaining[0].is_primary = true;
  }
  writeLocalDb(db);
}

export async function deleteProductVideo(videoId: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data: vid } = await supa.from('product_videos').select('*').eq('id', videoId).single();
    if (vid?.storage_path) {
      await supa.storage.from(PRODUCT_MEDIA_BUCKET).remove([vid.storage_path]);
    }
    await supa.from('product_videos').delete().eq('id', videoId);
    return;
  }

  const db = readLocalDb();
  const vid = db.product_videos.find((v) => v.id === videoId);
  if (vid) {
    await removeLocalMedia(vid.storage_path);
  }
  db.product_videos = db.product_videos.filter((v) => v.id !== videoId);
  writeLocalDb(db);
}

export async function adminListAllVideos(): Promise<ProductVideo[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data } = await supa.from('product_videos').select('*').order('created_at', { ascending: false });
    return (data || []) as ProductVideo[];
  }
  const db = readLocalDb();
  return [...db.product_videos].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

// ============================================================================
// BRANDS, CATEGORIES, BANNERS & SITE SECTIONS
// ============================================================================

export async function listBrandsAndCategories() {
  const supa = await getActiveSupabase();
  if (supa) {
    const [b, c] = await Promise.all([
      supa.from('brands').select('*').order('name'),
      supa.from('categories').select('*').order('sort_order'),
    ]);
    return { brands: (b.data || []) as Brand[], categories: (c.data || []) as Category[] };
  }
  const db = readLocalDb();
  return {
    brands: [...db.brands].sort((a, b) => a.name.localeCompare(b.name)),
    categories: [...db.categories].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function createBrand(name: string, description = ''): Promise<Brand> {
  const now = new Date().toISOString();
  const slug = slugify(name);
  const supa = await getActiveSupabase();
  if (supa) {
    const { data, error } = await supa
      .from('brands')
      .insert({ name: name.trim(), slug, description, is_active: true })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Brand;
  }
  const db = readLocalDb();
  const brand: Brand = {
    id: crypto.randomUUID(),
    name: name.trim(),
    slug,
    logo_url: '',
    description,
    is_active: true,
    created_at: now,
  };
  db.brands.push(brand);
  writeLocalDb(db);
  return brand;
}

export async function createCategory(input: {
  name: string;
  gender: Category['gender'];
  style: Category['style'];
  description?: string;
}): Promise<Category> {
  const now = new Date().toISOString();
  const slug = `${slugify(input.name)}-${crypto.randomBytes(2).toString('hex')}`;
  const supa = await getActiveSupabase();
  if (supa) {
    const { data, error } = await supa
      .from('categories')
      .insert({
        name: input.name.trim(),
        slug,
        gender: input.gender,
        style: input.style,
        description: input.description || '',
        is_active: true,
        sort_order: 10,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Category;
  }
  const db = readLocalDb();
  const category: Category = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    slug,
    gender: input.gender,
    style: input.style,
    description: input.description || '',
    image_url: '',
    sort_order: db.categories.length + 1,
    is_active: true,
    created_at: now,
  };
  db.categories.push(category);
  writeLocalDb(db);
  return category;
}

export async function adminListBannersAndSections() {
  const supa = await getActiveSupabase();
  if (supa) {
    const [b, s] = await Promise.all([
      supa.from('banners').select('*').order('sort_order'),
      supa.from('site_sections').select('*').order('sort_order'),
    ]);
    return { banners: (b.data || []) as Banner[], sections: (s.data || []) as SiteSection[] };
  }
  const db = readLocalDb();
  return {
    banners: [...db.banners].sort((a, b) => a.sort_order - b.sort_order),
    sections: [...db.site_sections].sort((a, b) => a.sort_order - b.sort_order),
  };
}

export async function saveBanner(banner: Partial<Banner> & { title: string; image_url: string }): Promise<Banner> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    if (banner.id) {
      const { data, error } = await supa
        .from('banners')
        .update({
          title: banner.title,
          subtitle: banner.subtitle || '',
          cta_label: banner.cta_label || 'Explorar',
          cta_link: banner.cta_link || '#catalogo',
          image_url: banner.image_url,
          storage_path: banner.storage_path || '',
          placement: banner.placement || 'hero',
          is_active: banner.is_active ?? true,
          sort_order: banner.sort_order ?? 1,
        })
        .eq('id', banner.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as Banner;
    }
    const { data, error } = await supa
      .from('banners')
      .insert({
        title: banner.title,
        subtitle: banner.subtitle || '',
        cta_label: banner.cta_label || 'Explorar',
        cta_link: banner.cta_link || '#catalogo',
        image_url: banner.image_url,
        storage_path: banner.storage_path || '',
        placement: banner.placement || 'hero',
        is_active: banner.is_active ?? true,
        sort_order: banner.sort_order ?? 1,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Banner;
  }

  const db = readLocalDb();
  const id = banner.id || crypto.randomUUID();
  const idx = db.banners.findIndex((b) => b.id === id);
  const record: Banner = {
    id,
    title: banner.title,
    subtitle: banner.subtitle || '',
    cta_label: banner.cta_label || 'Explorar Coleção',
    cta_link: banner.cta_link || '#catalogo',
    image_url: banner.image_url,
    storage_path: banner.storage_path || '',
    placement: banner.placement || 'hero',
    is_active: banner.is_active ?? true,
    sort_order: banner.sort_order ?? db.banners.length + 1,
    created_at: idx >= 0 ? db.banners[idx].created_at : now,
  };
  if (idx >= 0) db.banners[idx] = record;
  else db.banners.push(record);
  writeLocalDb(db);
  return record;
}

export async function deleteBanner(id: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data: banner } = await supa.from('banners').select('storage_path').eq('id', id).maybeSingle();
    if (banner?.storage_path) {
      await supa.storage.from(BANNERS_BUCKET).remove([banner.storage_path]);
    }
    await supa.from('banners').delete().eq('id', id);
    return;
  }
  const db = readLocalDb();
  const banner = db.banners.find((b) => b.id === id);
  if (banner?.storage_path) {
    await removeLocalMedia(banner.storage_path);
  }
  db.banners = db.banners.filter((b) => b.id !== id);
  writeLocalDb(db);
}

export async function updateSiteSection(section: SiteSection): Promise<SiteSection> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    const { data, error } = await supa
      .from('site_sections')
      .update({
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        is_enabled: section.is_enabled,
        sort_order: section.sort_order,
        updated_at: now,
      })
      .eq('id', section.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SiteSection;
  }

  const db = readLocalDb();
  const idx = db.site_sections.findIndex((s) => s.id === section.id);
  if (idx === -1) throw new Error('Seção não encontrada.');
  db.site_sections[idx] = { ...section, updated_at: now };
  writeLocalDb(db);
  return db.site_sections[idx];
}

// ============================================================================
// SUPPLIERS & DROPSHIPPING ARCHITECTURE
// ============================================================================

export async function listSuppliersAndLinks() {
  const supa = await getActiveSupabase();
  if (supa) {
    const [sups, links, prods] = await Promise.all([
      supa.from('suppliers').select('*').order('name'),
      supa.from('supplier_products').select('*'),
      supa.from('products').select('id,name'),
    ]);
    const supMap = new Map(((sups.data || []) as Supplier[]).map((s) => [s.id, s]));
    const prodMap = new Map(((prods.data || []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
    return {
      suppliers: (sups.data || []) as Supplier[],
      links: ((links.data || []) as SupplierProduct[]).map((l) => ({
        ...l,
        supplier: supMap.get(l.supplier_id),
        product_name: prodMap.get(l.product_id) || 'Produto',
      })),
    };
  }

  const db = readLocalDb();
  const supMap = new Map(db.suppliers.map((s) => [s.id, s]));
  const prodMap = new Map(db.products.map((p) => [p.id, p.name]));
  return {
    suppliers: db.suppliers,
    links: db.supplier_products.map((l) => ({
      ...l,
      supplier: supMap.get(l.supplier_id),
      product_name: prodMap.get(l.product_id) || 'Produto',
    })),
  };
}

export async function saveSupplier(input: Partial<Supplier> & { name: string }): Promise<Supplier> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    const payload = {
      name: input.name,
      contact_name: input.contact_name || '',
      email: input.email || '',
      phone: input.phone || '',
      cnpj: input.cnpj || '',
      shipping_lead_time_days: Number(input.shipping_lead_time_days ?? 3),
      direct_to_customer: input.direct_to_customer ?? true,
      integration_type: input.integration_type || 'manual',
      api_endpoint: input.api_endpoint || '',
      notes: input.notes || '',
      is_active: input.is_active ?? true,
    };
    if (input.id) {
      const { data, error } = await supa.from('suppliers').update(payload).eq('id', input.id).select().single();
      if (error) throw new Error(error.message);
      return data as Supplier;
    }
    const { data, error } = await supa.from('suppliers').insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data as Supplier;
  }

  const db = readLocalDb();
  const id = input.id || crypto.randomUUID();
  const idx = db.suppliers.findIndex((s) => s.id === id);
  const record: Supplier = {
    id,
    name: input.name,
    contact_name: input.contact_name || '',
    email: input.email || '',
    phone: input.phone || '',
    cnpj: input.cnpj || '',
    shipping_lead_time_days: Number(input.shipping_lead_time_days ?? 3),
    direct_to_customer: input.direct_to_customer ?? true,
    integration_type: input.integration_type || 'manual',
    api_endpoint: input.api_endpoint || '',
    notes: input.notes || '',
    is_active: input.is_active ?? true,
    created_at: idx >= 0 ? db.suppliers[idx].created_at : now,
  };
  if (idx >= 0) db.suppliers[idx] = record;
  else db.suppliers.push(record);
  writeLocalDb(db);
  return record;
}

export async function linkSupplierProduct(input: {
  supplier_id: string;
  product_id: string;
  supplier_sku: string;
  acquisition_cost: number;
  supplier_stock_qty: number;
  is_available: boolean;
  shipping_days_override?: number | null;
}): Promise<SupplierProduct> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    const { data, error } = await supa
      .from('supplier_products')
      .upsert(
        {
          ...input,
          last_synced_at: now,
        },
        { onConflict: 'supplier_id,product_id' }
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as SupplierProduct;
  }

  const db = readLocalDb();
  const idx = db.supplier_products.findIndex(
    (sp) => sp.supplier_id === input.supplier_id && sp.product_id === input.product_id
  );
  const record: SupplierProduct = {
    id: idx >= 0 ? db.supplier_products[idx].id : crypto.randomUUID(),
    supplier_id: input.supplier_id,
    product_id: input.product_id,
    supplier_sku: input.supplier_sku,
    acquisition_cost: Number(input.acquisition_cost),
    supplier_stock_qty: Number(input.supplier_stock_qty),
    is_available: input.is_available,
    shipping_days_override: input.shipping_days_override ?? null,
    last_synced_at: now,
    created_at: idx >= 0 ? db.supplier_products[idx].created_at : now,
  };
  if (idx >= 0) db.supplier_products[idx] = record;
  else db.supplier_products.push(record);
  writeLocalDb(db);
  return record;
}

// ============================================================================
// COUPONS
// ============================================================================

export async function listCoupons(): Promise<Coupon[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data } = await supa.from('coupons').select('*').order('created_at', { ascending: false });
    return (data || []) as Coupon[];
  }
  const db = readLocalDb();
  return [...db.coupons].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function saveCoupon(input: Partial<Coupon> & { code: string; discount_type: Coupon['discount_type']; discount_value: number }): Promise<Coupon> {
  const now = new Date().toISOString();
  const code = input.code.trim().toUpperCase();
  const supa = await getActiveSupabase();
  if (supa) {
    const payload = {
      code,
      description: input.description || '',
      discount_type: input.discount_type,
      discount_value: Number(input.discount_value),
      min_order_value: Number(input.min_order_value ?? 0),
      max_uses: input.max_uses ? Number(input.max_uses) : null,
      valid_until: input.valid_until || null,
      is_active: input.is_active ?? true,
    };
    if (input.id) {
      const { data, error } = await supa.from('coupons').update(payload).eq('id', input.id).select().single();
      if (error) throw new Error(error.message);
      return data as Coupon;
    }
    const { data, error } = await supa.from('coupons').insert({ ...payload, valid_from: now }).select().single();
    if (error) throw new Error(error.message);
    return data as Coupon;
  }

  const db = readLocalDb();
  const id = input.id || crypto.randomUUID();
  const idx = db.coupons.findIndex((c) => c.id === id);
  const record: Coupon = {
    id,
    code,
    description: input.description || '',
    discount_type: input.discount_type,
    discount_value: Number(input.discount_value),
    min_order_value: Number(input.min_order_value ?? 0),
    max_uses: input.max_uses ? Number(input.max_uses) : null,
    used_count: idx >= 0 ? db.coupons[idx].used_count : 0,
    valid_from: idx >= 0 ? db.coupons[idx].valid_from : now,
    valid_until: input.valid_until || null,
    is_active: input.is_active ?? true,
    created_at: idx >= 0 ? db.coupons[idx].created_at : now,
  };
  if (idx >= 0) db.coupons[idx] = record;
  else db.coupons.push(record);
  writeLocalDb(db);
  return record;
}

export async function validateCouponCode(code: string, subtotal: number): Promise<{
  valid: boolean;
  coupon?: Coupon;
  discount_amount: number;
  message: string;
}> {
  const normalized = code.trim().toUpperCase();
  const coupons = await listCoupons();
  const coupon = coupons.find((c) => c.code === normalized);
  if (!coupon) {
    return { valid: false, discount_amount: 0, message: 'Cupom não encontrado.' };
  }
  if (!coupon.is_active) {
    return { valid: false, discount_amount: 0, message: 'Este cupom está desativado.' };
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < Date.now()) {
    return { valid: false, discount_amount: 0, message: 'Este cupom expirou.' };
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, discount_amount: 0, message: 'Limite de utilização do cupom atingido.' };
  }
  if (subtotal < coupon.min_order_value) {
    return {
      valid: false,
      discount_amount: 0,
      message: `Pedido mínimo de R$ ${coupon.min_order_value.toFixed(2)} para este cupom.`,
    };
  }
  const discount =
    coupon.discount_type === 'percentage'
      ? Math.min(subtotal, (subtotal * coupon.discount_value) / 100)
      : Math.min(subtotal, coupon.discount_value);

  return {
    valid: true,
    coupon,
    discount_amount: Number(discount.toFixed(2)),
    message: `Cupom ${coupon.code} aplicado.`,
  };
}

// ============================================================================
// CUSTOMER ADDRESSES, FAVORITES & ORDERS
// ============================================================================

export async function listUserAddresses(userId: string): Promise<Address[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data } = await supa
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    return (data || []) as Address[];
  }
  const db = readLocalDb();
  return db.addresses.filter((a) => a.user_id === userId);
}

export async function saveUserAddress(
  userId: string,
  input: Omit<Address, 'id' | 'user_id' | 'created_at'> & { id?: string }
): Promise<Address> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    if (input.is_default) {
      await supa.from('addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const { data, error } = await supa
      .from('addresses')
      .insert({ ...input, user_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Address;
  }

  const db = readLocalDb();
  if (input.is_default) {
    db.addresses.forEach((a) => {
      if (a.user_id === userId) a.is_default = false;
    });
  }
  const addr: Address = {
    ...input,
    id: input.id || crypto.randomUUID(),
    user_id: userId,
    created_at: now,
  };
  db.addresses.push(addr);
  writeLocalDb(db);
  return addr;
}

export async function deleteUserAddress(userId: string, addressId: string): Promise<void> {
  const supa = await getActiveSupabase();
  if (supa) {
    await supa.from('addresses').delete().eq('id', addressId).eq('user_id', userId);
    return;
  }
  const db = readLocalDb();
  db.addresses = db.addresses.filter((a) => !(a.id === addressId && a.user_id === userId));
  writeLocalDb(db);
}

export async function listUserFavorites(userId: string): Promise<string[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data } = await supa.from('favorites').select('product_id').eq('user_id', userId);
    return (data || []).map((f: { product_id: string }) => f.product_id);
  }
  const db = readLocalDb();
  return db.favorites.filter((f) => f.user_id === userId).map((f) => f.product_id);
}

export async function toggleUserFavorite(userId: string, productId: string): Promise<string[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const { data: existing } = await supa
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .maybeSingle();
    if (existing) {
      await supa.from('favorites').delete().eq('id', existing.id);
    } else {
      await supa.from('favorites').insert({ user_id: userId, product_id: productId });
    }
    return listUserFavorites(userId);
  }

  const db = readLocalDb();
  const idx = db.favorites.findIndex((f) => f.user_id === userId && f.product_id === productId);
  if (idx >= 0) db.favorites.splice(idx, 1);
  else {
    db.favorites.push({
      id: crypto.randomUUID(),
      user_id: userId,
      product_id: productId,
      created_at: new Date().toISOString(),
    });
  }
  writeLocalDb(db);
  return db.favorites.filter((f) => f.user_id === userId).map((f) => f.product_id);
}

// ============================================================================
// ORDERS & CHECKOUT
// ============================================================================

export async function createOrderRecord(params: {
  user: Profile;
  items: Array<{ product_id: string; variant_id: string; quantity: number }>;
  shipping_address: Order['shipping_address_json'];
  shipping_cost: number;
  payment_method: PaymentMethod;
  coupon_code?: string;
}): Promise<Order> {
  const allProducts = await adminListAllProducts();
  const now = new Date().toISOString();
  const orderId = crypto.randomUUID();
  const orderNumber = `PLS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 899)}`;

  const builtItems: OrderItem[] = [];
  let subtotal = 0;

  for (const reqItem of params.items) {
    const product = allProducts.find((p) => p.id === reqItem.product_id && p.is_published);
    if (!product) throw new Error('Produto indisponível no catálogo.');
    const variant = product.variants.find((v) => v.id === reqItem.variant_id);
    if (!variant || !variant.is_available || variant.stock_qty < reqItem.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name} (${variant?.size || ''}).`);
    }
    const unitPrice = product.promo_price ?? product.original_price;
    const totalPrice = Number((unitPrice * reqItem.quantity).toFixed(2));
    subtotal += totalPrice;

    const primaryImg = product.images.find((i) => i.is_primary) || product.images[0];
    builtItems.push({
      id: crypto.randomUUID(),
      order_id: orderId,
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      brand_name: product.brand?.name || 'PULSO',
      size: variant.size,
      color_name: variant.color_name,
      quantity: reqItem.quantity,
      unit_price: unitPrice,
      total_price: totalPrice,
      image_url: primaryImg?.public_url || '',
    });
  }

  let discountAmount = 0;
  let validCouponCode = '';
  if (params.coupon_code) {
    const check = await validateCouponCode(params.coupon_code, subtotal);
    if (!check.valid) throw new Error(check.message);
    discountAmount = check.discount_amount;
    validCouponCode = check.coupon!.code;
  }

  const total = Math.max(0, Number((subtotal - discountAmount + params.shipping_cost).toFixed(2)));

  const orderHeader: Omit<Order, 'items'> = {
    id: orderId,
    order_number: orderNumber,
    user_id: params.user.id,
    customer_name: params.user.full_name || params.shipping_address.recipient_name,
    customer_email: params.user.email,
    status: 'pending_payment',
    payment_method: params.payment_method,
    payment_status: 'pending',
    subtotal: Number(subtotal.toFixed(2)),
    discount_amount: discountAmount,
    shipping_cost: Number(params.shipping_cost.toFixed(2)),
    total,
    coupon_code: validCouponCode,
    shipping_address_json: params.shipping_address,
    tracking_code: '',
    tracking_carrier: '',
    stock_deducted: false,
    created_at: now,
    updated_at: now,
  };

  // Persist checkout shipping address into addresses table if not already saved
  const existingAddresses = await listUserAddresses(params.user.id);
  const normZip = (params.shipping_address.zip_code || '').replace(/\D/g, '');
  const normStreet = (params.shipping_address.street || '').trim().toLowerCase();
  const normNumber = (params.shipping_address.number || '').trim().toLowerCase();
  const alreadySaved = existingAddresses.some(
    (a) =>
      a.zip_code.replace(/\D/g, '') === normZip &&
      a.street.trim().toLowerCase() === normStreet &&
      a.number.trim().toLowerCase() === normNumber
  );
  if (!alreadySaved) {
    await saveUserAddress(params.user.id, {
      label: params.shipping_address.label || 'Entrega',
      recipient_name: params.shipping_address.recipient_name || params.user.full_name,
      zip_code: params.shipping_address.zip_code,
      street: params.shipping_address.street,
      number: params.shipping_address.number,
      complement: params.shipping_address.complement || '',
      neighborhood: params.shipping_address.neighborhood,
      city: params.shipping_address.city,
      state: params.shipping_address.state,
      is_default: existingAddresses.length === 0,
    });
  }

  const supa = await getActiveSupabase();
  if (supa) {
    const { error: orderErr } = await supa.from('orders').insert(orderHeader);
    if (orderErr) throw new Error(orderErr.message);
    const { error: itemsErr } = await supa.from('order_items').insert(builtItems);
    if (itemsErr) throw new Error(itemsErr.message);
    if (validCouponCode) {
      const { data: c } = await supa.from('coupons').select('used_count').eq('code', validCouponCode).single();
      if (c) {
        await supa.from('coupons').update({ used_count: c.used_count + 1 }).eq('code', validCouponCode);
      }
    }
    return { ...orderHeader, items: builtItems };
  }

  const db = readLocalDb();
  db.orders.unshift(orderHeader);
  db.order_items.push(...builtItems);
  if (validCouponCode) {
    const c = db.coupons.find((cp) => cp.code === validCouponCode);
    if (c) c.used_count += 1;
  }
  writeLocalDb(db);
  return { ...orderHeader, items: builtItems };
}

export async function updateOrderPaymentDetails(
  orderId: string,
  updates: Partial<
    Pick<
      Order,
      'mp_payment_id' | 'mp_preference_id' | 'pix_qr_code' | 'pix_qr_code_base64' | 'payment_status' | 'status'
    >
  >
): Promise<Order | null> {
  const now = new Date().toISOString();
  const supa = await getActiveSupabase();
  if (supa) {
    const { data: currentOrder } = await supa
      .from('orders')
      .select('id, stock_deducted')
      .eq('id', orderId)
      .maybeSingle();
    if (!currentOrder) return null;

    const shouldDeductStock =
      updates.payment_status === 'approved' && !currentOrder.stock_deducted;

    if (shouldDeductStock) {
      // Atomic conditional update ensures duplicate webhooks never deduct stock twice
      const { data: lockedRows, error: lockErr } = await supa
        .from('orders')
        .update({ ...updates, stock_deducted: true, updated_at: now })
        .eq('id', orderId)
        .eq('stock_deducted', false)
        .select('id');
      if (lockErr) throw new Error(lockErr.message);

      if (lockedRows && lockedRows.length > 0) {
        const { data: orderItems } = await supa
          .from('order_items')
          .select('variant_id, quantity')
          .eq('order_id', orderId);

        for (const item of (orderItems || []) as Array<{ variant_id: string | null; quantity: number }>) {
          if (!item.variant_id) continue;
          const { data: variant } = await supa
            .from('product_variants')
            .select('stock_qty')
            .eq('id', item.variant_id)
            .maybeSingle();
          if (variant) {
            const nextQty = Math.max(0, Number(variant.stock_qty) - Number(item.quantity));
            await supa
              .from('product_variants')
              .update({ stock_qty: nextQty, is_available: nextQty > 0 })
              .eq('id', item.variant_id);
          }
        }
      }
    } else {
      await supa
        .from('orders')
        .update({ ...updates, updated_at: now })
        .eq('id', orderId);
    }

    const orders = await listOrders();
    return orders.find((o) => o.id === orderId) || null;
  }

  const db = readLocalDb();
  const idx = db.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return null;
  const alreadyDeducted = Boolean(db.orders[idx].stock_deducted);
  const shouldDeductLocal = updates.payment_status === 'approved' && !alreadyDeducted;

  db.orders[idx] = {
    ...db.orders[idx],
    ...updates,
    stock_deducted: alreadyDeducted || shouldDeductLocal,
    updated_at: now,
  };

  // Decrement stock ONLY once when payment is truly confirmed via webhook
  if (shouldDeductLocal) {
    const items = db.order_items.filter((i) => i.order_id === orderId);
    for (const item of items) {
      if (item.variant_id) {
        const v = db.product_variants.find((vr) => vr.id === item.variant_id);
        if (v) {
          v.stock_qty = Math.max(0, v.stock_qty - item.quantity);
          if (v.stock_qty === 0) v.is_available = false;
        }
      }
    }
  }

  writeLocalDb(db);
  return {
    ...db.orders[idx],
    items: db.order_items.filter((i) => i.order_id === orderId),
  };
}

export async function listOrders(userId?: string): Promise<Order[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    let query = supa.from('orders').select('*').order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data: orders } = await query;
    const orderIds = (orders || []).map((o: { id: string }) => o.id);
    const { data: items } = orderIds.length
      ? await supa.from('order_items').select('*').in('order_id', orderIds)
      : { data: [] };

    return ((orders || []) as Omit<Order, 'items'>[]).map((o) => ({
      ...o,
      items: ((items || []) as OrderItem[]).filter((i) => i.order_id === o.id),
    }));
  }

  const db = readLocalDb();
  const filtered = userId
    ? db.orders.filter((o) => o.user_id === userId)
    : db.orders;
  return [...filtered]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => ({
      ...o,
      items: db.order_items.filter((i) => i.order_id === o.id),
    }));
}

export async function adminUpdateOrder(
  orderId: string,
  updates: {
    status?: OrderStatus;
    tracking_code?: string;
    tracking_carrier?: string;
    supplier_id?: string | null;
    notes?: string;
  }
): Promise<Order> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...updates, updated_at: now };
  if (updates.status === 'forwarded_to_supplier') {
    patch.supplier_dispatched_at = now;
  }

  const supa = await getActiveSupabase();
  if (supa) {
    const { error } = await supa.from('orders').update(patch).eq('id', orderId);
    if (error) throw new Error(error.message);
    const all = await listOrders();
    const found = all.find((o) => o.id === orderId);
    if (!found) throw new Error('Pedido não encontrado.');
    return found;
  }

  const db = readLocalDb();
  const idx = db.orders.findIndex((o) => o.id === orderId);
  if (idx === -1) throw new Error('Pedido não encontrado.');
  db.orders[idx] = { ...db.orders[idx], ...patch } as Omit<Order, 'items'>;
  writeLocalDb(db);
  return {
    ...db.orders[idx],
    items: db.order_items.filter((i) => i.order_id === orderId),
  };
}

// ============================================================================
// ADMIN DASHBOARD METRICS
// ============================================================================

export async function getAdminDashboardMetrics(): Promise<DashboardMetrics> {
  const [products, orders, customersCount] = await Promise.all([
    adminListAllProducts(),
    listOrders(),
    (async () => {
      const supa = await getActiveSupabase();
      if (supa) {
        const { count } = await supa
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'customer');
        return count || 0;
      }
      return readLocalDb().profiles.filter((p) => p.role === 'customer').length;
    })(),
  ]);

  const published = products.filter((p) => p.is_published);
  const outOfStock = products.filter(
    (p) =>
      p.stock_status === 'out_of_stock' ||
      (p.variants.length > 0 && p.variants.every((v) => !v.is_available || v.stock_qty <= 0))
  );

  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');
  const paidOrders = orders.filter((o) => o.payment_status === 'approved');
  const totalRevenue = nonCancelled.reduce((sum, o) => sum + o.total, 0);
  const paidRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const pendingDispatch = orders.filter((o) => o.status === 'paid').length;

  return {
    total_sales_count: paidOrders.length,
    total_revenue: Number(totalRevenue.toFixed(2)),
    paid_revenue: Number(paidRevenue.toFixed(2)),
    orders_received: orders.length,
    registered_customers: customersCount,
    published_products: published.length,
    out_of_stock_products: outOfStock.length,
    total_products: products.length,
    pending_supplier_dispatch: pendingDispatch,
    recent_orders: orders.slice(0, 8),
  };
}

export async function adminListCustomers(): Promise<AdminCustomerSummary[]> {
  const supa = await getActiveSupabase();
  if (supa) {
    const [{ data: profiles }, { data: orders }] = await Promise.all([
      supa
        .from('profiles')
        .select('id,full_name,email,phone,cpf,role,created_at')
        .order('created_at', { ascending: false }),
      supa.from('orders').select('user_id,total,status'),
    ]);

    const orderStats = new Map<string, { count: number; total: number }>();
    for (const o of (orders || []) as Array<{ user_id: string; total: number; status: string }>) {
      if (o.status === 'cancelled') continue;
      const cur = orderStats.get(o.user_id) || { count: 0, total: 0 };
      cur.count += 1;
      cur.total += Number(o.total || 0);
      orderStats.set(o.user_id, cur);
    }

    return ((profiles || []) as Profile[]).map((p) => {
      const stats = orderStats.get(p.id) || { count: 0, total: 0 };
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone || '',
        cpf: p.cpf || '',
        role: p.role,
        created_at: p.created_at,
        orders_count: stats.count,
        total_spent: Number(stats.total.toFixed(2)),
      };
    });
  }

  const db = readLocalDb();
  const orderStats = new Map<string, { count: number; total: number }>();
  for (const o of db.orders) {
    if (o.status === 'cancelled') continue;
    const cur = orderStats.get(o.user_id) || { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(o.total || 0);
    orderStats.set(o.user_id, cur);
  }

  return [...db.profiles]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((p) => {
      const stats = orderStats.get(p.id) || { count: 0, total: 0 };
      return {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        phone: p.phone || '',
        cpf: p.cpf || '',
        role: p.role,
        created_at: p.created_at,
        orders_count: stats.count,
        total_spent: Number(stats.total.toFixed(2)),
      };
    });
}
