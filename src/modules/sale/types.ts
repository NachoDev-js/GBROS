import type { Product, ProductVariant, Venta, DetalleVenta } from '../../types/global';
import type { ValidationError } from '../../lib/validation';

export interface SaleLineItem extends Product {
  cantidad: number;
  selectedVariant?: ProductVariant;
  cartItemId: string;
}

export interface ISalePersistenceAdapter {
  insertVenta: (data: { venta: Venta; detalles: DetalleVenta[] }) => Promise<void>;
}

export interface SaleError {
  type: 'VALIDATION' | 'PERSISTENCE';
  message: string;
  errors?: ValidationError[];
}

export type CheckoutResult =
  | {
      ok: true;
      sale: Venta;
      lineItems: DetalleVenta[];
      change: number;
    }
  | {
      ok: false;
      error: SaleError;
    };

export interface SaleSessionState {
  items: SaleLineItem[];
  addItem: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clear: () => void;
  clearCart: () => void;
  getTotal: () => number;
  checkout: (paymentReceived: string | number) => Promise<CheckoutResult>;
}
