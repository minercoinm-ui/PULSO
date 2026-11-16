import type { OrderStatus, PaymentStatus } from '../types/ecommerce';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pagamento Confirmado',
  forwarded_to_supplier: 'Enviado ao Fornecedor',
  shipped: 'Em Trânsito',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  refunded: 'Estornado',
};

export const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
  infantil: 'Infantil',
  unissex: 'Unissex',
};

export const STYLE_LABELS: Record<string, string> = {
  esportivo: 'Esportivo',
  casual: 'Casual',
  urbano: 'Urbano',
  premium: 'Premium',
};
