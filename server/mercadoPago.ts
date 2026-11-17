import crypto from 'crypto';
import type { Order } from '../src/types/ecommerce.js';

export function isMercadoPagoConfigured(): boolean {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  return Boolean(
    token &&
      !token.includes('your-access-token') &&
      (token.startsWith('APP_USR-') || token.startsWith('TEST-'))
  );
}

function getAppBaseUrl(): string {
  const configured = (process.env.APP_URL || '').trim();
  if (configured && configured !== 'MY_APP_URL') {
    return configured.replace(/\/$/, '');
  }
  const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (vercelProd) {
    return `https://${vercelProd.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  const vercelPreview = (process.env.VERCEL_URL || '').trim();
  if (vercelPreview) {
    return `https://${vercelPreview.replace(/^https?:\/\//, '').replace(/\/$/, '')}`;
  }
  return 'http://localhost:3000';
}

export interface MercadoPagoPixResult {
  configured: boolean;
  payment_id?: string;
  status?: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  error?: string;
}

export interface MercadoPagoPreferenceResult {
  configured: boolean;
  preference_id?: string;
  init_point?: string;
  sandbox_init_point?: string;
  error?: string;
}

export async function createMercadoPagoPixPayment(order: Order): Promise<MercadoPagoPixResult> {
  if (!isMercadoPagoConfigured()) {
    return {
      configured: false,
      error:
        'Gateway Mercado Pago não configurado no servidor (MERCADO_PAGO_ACCESS_TOKEN ausente). O pedido foi registrado como Aguardando Pagamento e não será aprovado automaticamente.',
    };
  }

  const appUrl = getAppBaseUrl();
  const notificationUrl = appUrl.startsWith('https://') ? `${appUrl}/api/webhooks/mercadopago` : undefined;

  const [firstName, ...restName] = (order.customer_name || 'Cliente Pulso').trim().split(/\s+/);
  const lastName = restName.join(' ') || 'Pulso';

  const body: Record<string, unknown> = {
    transaction_amount: Number(order.total.toFixed(2)),
    description: `PULSO Sneakers - Pedido ${order.order_number}`,
    payment_method_id: 'pix',
    external_reference: order.id,
    payer: {
      email: order.customer_email,
      first_name: firstName,
      last_name: lastName,
    },
  };

  if (notificationUrl && notificationUrl.startsWith('https://')) {
    body.notification_url = notificationUrl;
  }

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `pulso-pix-${order.id}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, any>;
  if (!response.ok) {
    return {
      configured: true,
      error: data?.message || 'Falha ao criar cobrança Pix no Mercado Pago.',
    };
  }

  const txData = data?.point_of_interaction?.transaction_data || {};
  return {
    configured: true,
    payment_id: String(data.id),
    status: String(data.status || 'pending'),
    qr_code: txData.qr_code || '',
    qr_code_base64: txData.qr_code_base64 || '',
    ticket_url: txData.ticket_url || '',
  };
}

export async function createMercadoPagoCardPreference(order: Order): Promise<MercadoPagoPreferenceResult> {
  if (!isMercadoPagoConfigured()) {
    return {
      configured: false,
      error:
        'Gateway Mercado Pago não configurado no servidor (MERCADO_PAGO_ACCESS_TOKEN ausente). O pedido foi registrado como Aguardando Pagamento e não será aprovado automaticamente.',
    };
  }

  const appUrl = getAppBaseUrl();
  const notificationUrl = appUrl.startsWith('https://')
    ? `${appUrl}/api/webhooks/mercadopago`
    : undefined;

  const items = order.items.map((item) => ({
    id: item.product_id || item.id,
    title: `${item.product_name} (${item.size} / ${item.color_name})`,
    quantity: item.quantity,
    currency_id: 'BRL',
    unit_price: Number(item.unit_price.toFixed(2)),
  }));

  if (order.shipping_cost > 0) {
    items.push({
      id: 'shipping',
      title: 'Frete',
      quantity: 1,
      currency_id: 'BRL',
      unit_price: Number(order.shipping_cost.toFixed(2)),
    });
  }

  const body: Record<string, unknown> = {
    items,
    payer: {
      name: order.customer_name,
      email: order.customer_email,
    },
    external_reference: order.id,
    back_urls: {
      success: `${appUrl}/?checkout_status=success&order=${order.order_number}`,
      failure: `${appUrl}/?checkout_status=failure&order=${order.order_number}`,
      pending: `${appUrl}/?checkout_status=pending&order=${order.order_number}`,
    },
    auto_return: 'approved',
    payment_methods: {
      excluded_payment_types: [{ id: 'ticket' }],
      installments: 12,
    },
  };

  if (notificationUrl) {
    body.notification_url = notificationUrl;
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as Record<string, any>;
  if (!response.ok) {
    return {
      configured: true,
      error: data?.message || 'Falha ao criar preferência de cartão no Mercado Pago.',
    };
  }

  return {
    configured: true,
    preference_id: String(data.id),
    init_point: data.init_point,
    sandbox_init_point: data.sandbox_init_point,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string): Promise<{
  ok: boolean;
  status?: string;
  external_reference?: string;
  id?: string;
}> {
  if (!isMercadoPagoConfigured()) {
    return { ok: false };
  }
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: {
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    },
  });
  if (!response.ok) return { ok: false };
  const data = (await response.json()) as Record<string, any>;
  return {
    ok: true,
    id: String(data.id),
    status: String(data.status),
    external_reference: data.external_reference ? String(data.external_reference) : undefined,
  };
}

export function verifyMercadoPagoWebhookSignature(
  xSignature: string | undefined,
  xRequestId: string | undefined,
  dataId: string | undefined
): boolean {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || '';
  if (!secret || secret.includes('your-webhook-secret')) {
    // If webhook secret is not configured, verify strictly via Mercado Pago API fetch instead of trusting payload blindly
    return true;
  }
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(',').map((part) => {
      const [k, v] = part.split('=').map((s) => s.trim());
      return [k, v];
    })
  );

  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
  } catch {
    return false;
  }
}
