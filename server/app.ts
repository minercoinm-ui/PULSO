import express from 'express';
import multer from 'multer';
import {
  type AuthenticatedRequest,
  requireAdmin,
  requireAuth,
  resolveUserFromRequest,
  signLocalToken,
} from './authMiddleware.ts';
import {
  createMercadoPagoCardPreference,
  createMercadoPagoPixPayment,
  fetchMercadoPagoPayment,
  isMercadoPagoConfigured,
  verifyMercadoPagoWebhookSignature,
} from './mercadoPago.ts';
import {
  UPLOADS_DIR,
  adminDeleteProduct,
  adminListAllProducts,
  adminListAllVideos,
  adminListBannersAndSections,
  adminListCustomers,
  adminSaveProduct,
  adminUpdateOrder,
  authenticateLocalUser,
  createBrand,
  createCategory,
  createOrderRecord,
  deleteBanner,
  deleteProductImage,
  deleteProductVideo,
  deleteUserAddress,
  ensureSupabaseSeeded,
  syncLocalDb,
  getActiveSupabase,
  getAdminDashboardMetrics,
  getLastSupabaseDiagnostic,
  getStorefrontBootstrap,
  isAuthorizedAdminEmail,
  linkSupplierProduct,
  listBrandsAndCategories,
  listCoupons,
  listOrders,
  listSuppliersAndLinks,
  listUserAddresses,
  listUserFavorites,
  registerLocalCustomer,
  reorderProductImages,
  saveBanner,
  saveCoupon,
  saveSupplier,
  saveUploadedProductMedia,
  saveUserAddress,
  setPrimaryProductImage,
  toggleUserFavorite,
  updateOrderPaymentDetails,
  updateSiteSection,
  updateUserProfile,
  validateCouponCode,
} from './storeRepository.ts';
import { getSupabaseEnvStatus, isSupabaseConfigured } from './supabaseAdmin.ts';
import { flushBlobWrites, getBlobMedia, isBlobPersistence } from './localPersistence.ts';

const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const ALLOWED_VIDEO_MIMES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_BYTES,
  },
});

/**
 * Builds the PULSO Express app with every /api route and the /uploads media route.
 * Used both by the local dev server (server.ts) and the Netlify Server entrypoint.
 */
export async function createApp() {
  await ensureSupabaseSeeded().catch(() => false);
  const app = express();

  app.use(express.json({ limit: '4mb' }));

  // Load the latest local-fallback database snapshot (Netlify Blobs) before each API call,
  // and make sure pending writes are persisted before the response is sent.
  app.use('/api', async (_req, res, next) => {
    try {
      await syncLocalDb();
    } catch (err) {
      console.error('[PULSO] Falha ao carregar banco local:', err);
    }
    if (isBlobPersistence()) {
      const originalJson = res.json.bind(res);
      res.json = ((payload: unknown) => {
        flushBlobWrites().finally(() => originalJson(payload));
        return res;
      }) as typeof res.json;
    }
    next();
  });

  // Serve uploaded product/banner media (Netlify Blobs when deployed, disk locally)
  app.get('/uploads/*', async (req, res, next) => {
    if (!isBlobPersistence()) return next();
    try {
      const storagePath = decodeURIComponent(req.path.replace(/^\/uploads\//, ''));
      const media = await getBlobMedia(storagePath);
      if (!media) {
        res.status(404).end();
        return;
      }
      res.setHeader('Content-Type', media.contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(Buffer.from(media.data));
    } catch (err) {
      next(err);
    }
  });
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ========================================================================
  // SYSTEM & HEALTH
  // ========================================================================
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'pulso-sneakers', timestamp: new Date().toISOString() });
  });

  app.get('/api/system/status', async (_req, res) => {
    const supaOk = isSupabaseConfigured() && (await ensureSupabaseSeeded());
    res.json({
      supabase_configured: supaOk,
      mercado_pago_configured: isMercadoPagoConfigured(),
      storage_mode: supaOk ? 'supabase' : 'local',
      auth_mode: supaOk ? 'supabase' : 'local',
      supabase_diagnostic: supaOk ? null : getLastSupabaseDiagnostic(),
      env_status: getSupabaseEnvStatus(),
    });
  });

  // ========================================================================
  // AUTHENTICATION (Supabase Auth or Local Signed Session Fallback)
  // ========================================================================
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { full_name, email, password } = req.body as {
        full_name?: string;
        email?: string;
        password?: string;
      };
      if (!full_name?.trim() || !email?.trim() || !password || password.length < 6) {
        res.status(400).json({ error: 'Informe nome completo, e-mail válido e senha (mín. 6 caracteres).' });
        return;
      }

      const supa = await getActiveSupabase();
      if (supa) {
        const normalizedEmail = email.trim().toLowerCase();
        const { data, error } = await supa.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: { full_name: full_name.trim() },
        });
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        if (isAuthorizedAdminEmail(normalizedEmail)) {
          await supa.from('profiles').upsert({
            id: data.user.id,
            full_name: full_name.trim(),
            email: normalizedEmail,
            role: 'admin',
            updated_at: new Date().toISOString(),
          });
        }
        res.json({
          message: 'Cadastro realizado com sucesso. Faça login com seu e-mail e senha.',
          user_id: data.user.id,
        });
        return;
      }

      const profile = await registerLocalCustomer(full_name, email, password);
      const token = signLocalToken(profile.id);
      res.json({ token, profile });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao cadastrar usuário.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
        return;
      }
      if (await ensureSupabaseSeeded()) {
        res.status(400).json({ error: 'Use Supabase Auth SDK no cliente.' });
        return;
      }
      const profile = await authenticateLocalUser(email, password);
      const token = signLocalToken(profile.id);
      res.json({ token, profile });
    } catch (err: any) {
      res.status(401).json({ error: err.message || 'Credenciais inválidas.' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body as { email?: string };
    if (!email?.trim()) {
      res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
      return;
    }
    res.json({
      message:
        'Se o e-mail estiver cadastrado em nossa base, enviaremos as instruções de redefinição de senha.',
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    const profile = await resolveUserFromRequest(req);
    if (!profile) {
      res.status(401).json({ error: 'Não autenticado.' });
      return;
    }
    res.json({ profile });
  });

  app.put('/api/auth/profile', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { full_name, phone, cpf } = req.body;
      const updated = await updateUserProfile(req.userProfile!.id, { full_name, phone, cpf });
      res.json({ profile: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ========================================================================
  // PUBLIC STOREFRONT ENDPOINTS
  // ========================================================================
  app.get('/api/storefront/bootstrap', async (_req, res) => {
    try {
      const data = await getStorefrontBootstrap();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao carregar vitrine.' });
    }
  });

  app.post('/api/coupons/validate', async (req, res) => {
    try {
      const { code, subtotal } = req.body as { code?: string; subtotal?: number };
      if (!code) {
        res.status(400).json({ valid: false, discount_amount: 0, message: 'Informe um código de cupom.' });
        return;
      }
      const result = await validateCouponCode(code, Number(subtotal || 0));
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ valid: false, discount_amount: 0, message: err.message });
    }
  });

  app.post('/api/shipping/calculate', (req, res) => {
    const { zip_code, subtotal } = req.body as { zip_code?: string; subtotal?: number };
    const cleanZip = (zip_code || '').replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      res.status(400).json({ error: 'CEP inválido. Informe os 8 dígitos.' });
      return;
    }
    const sub = Number(subtotal || 0);
    // Free shipping for orders above R$ 699,90; regional calculation otherwise
    const regionDigit = Number(cleanZip[0]);
    const expressBase = regionDigit <= 3 ? 24.9 : regionDigit <= 6 ? 32.9 : 41.9;
    const standardCost = sub >= 699.9 ? 0 : Number((expressBase - 8).toFixed(2));
    res.json({
      options: [
        {
          id: 'standard',
          name: standardCost === 0 ? 'Envio Direto Padrão (Frete Grátis)' : 'Envio Direto Padrão',
          cost: standardCost,
          estimated_days: regionDigit <= 3 ? '3 a 5 dias úteis' : '5 a 8 dias úteis',
        },
        {
          id: 'express',
          name: 'Envio Direto Expresso',
          cost: Number((expressBase + 15).toFixed(2)),
          estimated_days: regionDigit <= 3 ? '1 a 3 dias úteis' : '2 a 4 dias úteis',
        },
      ],
    });
  });

  // ========================================================================
  // CUSTOMER ACCOUNT & CHECKOUT
  // ========================================================================
  app.get('/api/customer/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
    const addresses = await listUserAddresses(req.userProfile!.id);
    res.json({ addresses });
  });

  app.post('/api/customer/addresses', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const address = await saveUserAddress(req.userProfile!.id, req.body);
      res.json({ address });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/customer/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    await deleteUserAddress(req.userProfile!.id, String(req.params.id));
    res.json({ ok: true });
  });

  app.get('/api/customer/favorites', requireAuth, async (req: AuthenticatedRequest, res) => {
    const product_ids = await listUserFavorites(req.userProfile!.id);
    res.json({ product_ids });
  });

  app.post('/api/customer/favorites/toggle', requireAuth, async (req: AuthenticatedRequest, res) => {
    const { product_id } = req.body as { product_id?: string };
    if (!product_id) {
      res.status(400).json({ error: 'product_id obrigatório.' });
      return;
    }
    const product_ids = await toggleUserFavorite(req.userProfile!.id, product_id);
    res.json({ product_ids });
  });

  app.get('/api/customer/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
    const orders = await listOrders(req.userProfile!.id);
    res.json({ orders });
  });

  app.post('/api/checkout', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { items, shipping_address, shipping_cost, payment_method, coupon_code } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'Seu carrinho está vazio.' });
        return;
      }
      if (!shipping_address?.zip_code || !shipping_address?.street || !shipping_address?.city) {
        res.status(400).json({ error: 'Preencha o endereço completo de entrega.' });
        return;
      }
      if (payment_method !== 'pix' && payment_method !== 'credit_card') {
        res.status(400).json({ error: 'Método de pagamento inválido.' });
        return;
      }

      const order = await createOrderRecord({
        user: req.userProfile!,
        items,
        shipping_address,
        shipping_cost: Number(shipping_cost || 0),
        payment_method,
        coupon_code,
      });

      if (payment_method === 'pix') {
        const pixRes = await createMercadoPagoPixPayment(order);
        if (pixRes.configured && !pixRes.error) {
          const updated = await updateOrderPaymentDetails(order.id, {
            mp_payment_id: pixRes.payment_id,
            pix_qr_code: pixRes.qr_code,
            pix_qr_code_base64: pixRes.qr_code_base64,
          });
          res.json({
            order: updated || order,
            gateway_configured: true,
            payment: pixRes,
          });
          return;
        }
        res.json({
          order,
          gateway_configured: pixRes.configured,
          gateway_message: pixRes.error,
        });
        return;
      }

      const cardRes = await createMercadoPagoCardPreference(order);
      if (cardRes.configured && !cardRes.error) {
        const updated = await updateOrderPaymentDetails(order.id, {
          mp_preference_id: cardRes.preference_id,
        });
        res.json({
          order: updated || order,
          gateway_configured: true,
          payment: cardRes,
        });
        return;
      }

      res.json({
        order,
        gateway_configured: cardRes.configured,
        gateway_message: cardRes.error,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Erro ao processar pedido.' });
    }
  });

  // ========================================================================
  // MERCADO PAGO WEBHOOK (Secure Payment Status Confirmation)
  // ========================================================================
  app.post('/api/webhooks/mercadopago', async (req, res) => {
    try {
      const dataId = req.body?.data?.id ? String(req.body.data.id) : String(req.query['data.id'] || '');
      const xSignature = req.headers['x-signature'] as string | undefined;
      const xRequestId = req.headers['x-request-id'] as string | undefined;

      if (!verifyMercadoPagoWebhookSignature(xSignature, xRequestId, dataId)) {
        res.status(401).json({ error: 'Assinatura de webhook inválida.' });
        return;
      }

      if (dataId && isMercadoPagoConfigured()) {
        const payment = await fetchMercadoPagoPayment(dataId);
        if (payment.ok && payment.external_reference) {
          const isApproved = payment.status === 'approved';
          const isRejected = payment.status === 'rejected' || payment.status === 'cancelled';
          await updateOrderPaymentDetails(payment.external_reference, {
            mp_payment_id: payment.id,
            payment_status: isApproved ? 'approved' : isRejected ? 'rejected' : 'pending',
            status: isApproved ? 'paid' : isRejected ? 'cancelled' : 'pending_payment',
          });
        }
      }

      res.status(200).json({ received: true });
    } catch {
      res.status(500).json({ error: 'Erro no processamento do webhook.' });
    }
  });

  // ========================================================================
  // ADMIN PANEL ROUTES (Strictly Protected by requireAdmin)
  // ========================================================================
  app.get('/api/admin/dashboard', requireAdmin, async (_req, res) => {
    try {
      const metrics = await getAdminDashboardMetrics();
      res.json(metrics);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/products', requireAdmin, async (_req, res) => {
    const [products, meta, videos] = await Promise.all([
      adminListAllProducts(),
      listBrandsAndCategories(),
      adminListAllVideos(),
    ]);
    res.json({ products, brands: meta.brands, categories: meta.categories, videos });
  });

  app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
      const product = await adminSaveProduct(req.body);
      res.json({ product });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      const product = await adminSaveProduct({ ...req.body, id: String(req.params.id) });
      res.json({ product });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
      await adminDeleteProduct(String(req.params.id));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // PRIORITY FEATURE: Media Upload (Photos, Videos, Banners) with Format & Size Validation
  app.post(
    '/api/admin/media/upload',
    requireAdmin,
    upload.single('file'),
    async (req, res) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ error: 'Nenhum arquivo enviado.' });
          return;
        }
        const kind = (req.body.kind as 'image' | 'video' | 'banner') || 'image';
        const productId = req.body.product_id ? String(req.body.product_id) : null;
        const title = req.body.title ? String(req.body.title) : file.originalname;
        const isCampaign = req.body.is_campaign === 'true';

        if (kind === 'image' || kind === 'banner') {
          if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
            res.status(400).json({
              error: 'Formato de imagem inválido. Utilize JPG, PNG, WEBP ou AVIF.',
            });
            return;
          }
          if (file.size > MAX_IMAGE_BYTES) {
            res.status(400).json({ error: 'Imagem excede o limite de 10 MB.' });
            return;
          }
        } else if (kind === 'video') {
          if (!ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
            res.status(400).json({
              error: 'Formato de vídeo inválido. Utilize MP4, WEBM ou MOV.',
            });
            return;
          }
          if (file.size > MAX_VIDEO_BYTES) {
            res.status(400).json({ error: 'Vídeo excede o limite de 80 MB.' });
            return;
          }
        }

        const saved = await saveUploadedProductMedia({
          productId,
          kind,
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          title,
          isCampaign,
        });

        res.json(saved);
      } catch (err: any) {
        res.status(400).json({ error: err.message || 'Falha no upload da mídia.' });
      }
    }
  );

  app.put('/api/admin/products/:id/images/reorder', requireAdmin, async (req, res) => {
    try {
      const { ordered_ids } = req.body as { ordered_ids: string[] };
      const images = await reorderProductImages(String(req.params.id), ordered_ids || []);
      res.json({ images });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/products/:id/images/:imageId/primary', requireAdmin, async (req, res) => {
    try {
      await setPrimaryProductImage(String(req.params.id), String(req.params.imageId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/products/:id/images/:imageId', requireAdmin, async (req, res) => {
    try {
      await deleteProductImage(String(req.params.id), String(req.params.imageId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/videos/:videoId', requireAdmin, async (req, res) => {
    try {
      await deleteProductVideo(String(req.params.videoId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/brands', requireAdmin, async (req, res) => {
    try {
      const brand = await createBrand(req.body.name, req.body.description);
      res.json({ brand });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const category = await createCategory(req.body);
      res.json({ category });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/admin/content', requireAdmin, async (_req, res) => {
    const data = await adminListBannersAndSections();
    res.json(data);
  });

  app.post('/api/admin/banners', requireAdmin, async (req, res) => {
    try {
      const banner = await saveBanner(req.body);
      res.json({ banner });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/admin/banners/:id', requireAdmin, async (req, res) => {
    await deleteBanner(String(req.params.id));
    res.json({ ok: true });
  });

  app.put('/api/admin/sections/:id', requireAdmin, async (req, res) => {
    try {
      const section = await updateSiteSection({ ...req.body, id: String(req.params.id) });
      res.json({ section });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/admin/suppliers', requireAdmin, async (_req, res) => {
    const data = await listSuppliersAndLinks();
    res.json(data);
  });

  app.post('/api/admin/suppliers', requireAdmin, async (req, res) => {
    try {
      const supplier = await saveSupplier(req.body);
      res.json({ supplier });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/suppliers/link-product', requireAdmin, async (req, res) => {
    try {
      const link = await linkSupplierProduct(req.body);
      res.json({ link });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/admin/orders', requireAdmin, async (_req, res) => {
    const orders = await listOrders();
    res.json({ orders });
  });

  app.put('/api/admin/orders/:id', requireAdmin, async (req, res) => {
    try {
      const order = await adminUpdateOrder(String(req.params.id), req.body);
      res.json({ order });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/admin/customers', requireAdmin, async (_req, res) => {
    try {
      const customers = await adminListCustomers();
      res.json({ customers });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/coupons', requireAdmin, async (_req, res) => {
    const coupons = await listCoupons();
    res.json({ coupons });
  });

  app.post('/api/admin/coupons', requireAdmin, async (req, res) => {
    try {
      const coupon = await saveCoupon(req.body);
      res.json({ coupon });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  return app;
}
