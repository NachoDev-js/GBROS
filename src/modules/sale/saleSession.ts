import { create } from 'zustand';
import { validateCheckoutAmount, calculateChange } from '../../lib/validation';
import type { Venta, DetalleVenta } from '../../types/global';
import type {
  SaleSessionState,
  ISalePersistenceAdapter,
} from './types';

/**
 * Creates a SaleSession Zustand store bound to a specific persistence adapter.
 * When no adapter is provided, defaults to window.db (standard Electron environment).
 */
export function createSaleSession(adapter?: ISalePersistenceAdapter) {
  return create<SaleSessionState>((set, get) => ({
    items: [],

    addItem: (product, qty = 1, variant) =>
      set((state) => {
        const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;
        const existing = state.items.find((item) => item.cartItemId === cartItemId);
        const currentQtyInCart = existing ? existing.cantidad : 0;

        // Validation: do not exceed available stock
        const maxStock = variant ? variant.stock : product.stock;
        if (currentQtyInCart + qty > maxStock) {
          return state;
        }

        if (existing) {
          return {
            items: state.items.map((item) =>
              item.cartItemId === cartItemId
                ? { ...item, cantidad: item.cantidad + qty }
                : item
            ),
          };
        }

        return {
          items: [
            ...state.items,
            { ...product, cantidad: qty, selectedVariant: variant, cartItemId },
          ],
        };
      }),

    removeItem: (cartItemId) =>
      set((state) => ({
        items: state.items.filter((item) => item.cartItemId !== cartItemId),
      })),

    updateQuantity: (cartItemId, quantity) =>
      set((state) => {
        const item = state.items.find((i) => i.cartItemId === cartItemId);
        if (item) {
          const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.stock;
          if (quantity > maxStock) {
            return state;
          }
        }

        return {
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? { ...item, cantidad: Math.max(1, quantity) }
              : item
          ),
        };
      }),

    clear: () => set({ items: [] }),
    clearCart: () => set({ items: [] }),

    getTotal: () =>
      get().items.reduce((total, item) => total + item.precio * item.cantidad, 0),

    checkout: async (paymentReceived) => {
      const state = get();

      if (state.items.length === 0) {
        return {
          ok: false,
          error: {
            type: 'VALIDATION',
            message: 'El carrito está vacío.',
            errors: [{ field: 'items', message: 'No hay productos en la venta actual.' }],
          },
        };
      }

      const paymentStr =
        typeof paymentReceived === 'number'
          ? paymentReceived.toString()
          : (paymentReceived || '').trim();

      const total = state.getTotal();
      const validationErrors = validateCheckoutAmount(paymentStr, total);

      if (validationErrors.length > 0) {
        return {
          ok: false,
          error: {
            type: 'VALIDATION',
            message: validationErrors[0].message,
            errors: validationErrors,
          },
        };
      }

      const montoRecibido = parseFloat(paymentStr);
      const vuelto = calculateChange(paymentStr, total);
      const idVenta = `V-${Date.now()}`;
      const fechaHora = new Date().toISOString();

      const venta: Venta = {
        id: idVenta,
        fecha_hora: fechaHora,
        total,
        monto_recibido: montoRecibido,
        vuelto,
      };

      const detalles: DetalleVenta[] = state.items.map((item) => ({
        id: `D-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        venta_id: idVenta,
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        variante_id: item.selectedVariant ? item.selectedVariant.id : undefined,
      }));

      const activeAdapter =
        adapter || (typeof window !== 'undefined' ? window.db : undefined);

      if (!activeAdapter) {
        return {
          ok: false,
          error: {
            type: 'PERSISTENCE',
            message: 'No se encontró el adaptador de base de datos.',
          },
        };
      }

      try {
        await activeAdapter.insertVenta({ venta, detalles });
        // Automatically reset session after successful checkout
        set({ items: [] });
        return {
          ok: true,
          sale: venta,
          lineItems: detalles,
          change: vuelto,
        };
      } catch (err: any) {
        return {
          ok: false,
          error: {
            type: 'PERSISTENCE',
            message: err?.message || 'Error al procesar la venta en la base de datos.',
          },
        };
      }
    },
  }));
}

/**
 * Default singleton hook using production database adapter.
 */
export const useSaleSession = createSaleSession();
