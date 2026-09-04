import { describe, it, expect, vi } from 'vitest';
import { createSaleSession } from '../modules/sale/saleSession';
import type { ISalePersistenceAdapter } from '../modules/sale/types';
import type { Product, Venta, DetalleVenta } from '../types/global';

const mockProduct: Product = {
  id: 'P-001',
  nombre: 'Teclado Mecánico',
  precio: 25000,
  stock: 10,
};

const mockProductWithVariants: Product = {
  id: 'P-002',
  nombre: 'Remera GBROS',
  precio: 15000,
  stock: 8,
  variantes: [
    { id: 'VAR-RED', color: 'Rojo', stock: 5 },
    { id: 'VAR-BLUE', color: 'Azul', stock: 3 },
  ],
};

function createMockAdapter(shouldFail = false) {
  const salesHistory: { venta: Venta; detalles: DetalleVenta[] }[] = [];
  const adapter: ISalePersistenceAdapter = {
    insertVenta: vi.fn(async (data) => {
      if (shouldFail) {
        throw new Error('Database connection failed');
      }
      salesHistory.push(data);
    }),
  };
  return { adapter, salesHistory };
}

describe('SaleSession module', () => {
  it('starts with empty session and total 0', () => {
    const useSession = createSaleSession();
    const state = useSession.getState();
    expect(state.items).toEqual([]);
    expect(state.getTotal()).toBe(0);
  });

  it('manages cart items and respects stock bounds', () => {
    const useSession = createSaleSession();
    const session = useSession.getState();

    session.addItem(mockProduct, 8);
    expect(useSession.getState().items[0].cantidad).toBe(8);

    // Attempting to exceed stock (8 + 3 = 11 > 10) is ignored
    session.addItem(mockProduct, 3);
    expect(useSession.getState().items[0].cantidad).toBe(8);

    // Updating quantity beyond stock is ignored
    session.updateQuantity('P-001', 50);
    expect(useSession.getState().items[0].cantidad).toBe(8);

    // Reducing quantity works
    session.updateQuantity('P-001', 4);
    expect(useSession.getState().items[0].cantidad).toBe(4);
    expect(useSession.getState().getTotal()).toBe(100000); // 25000 * 4
  });

  it('tracks variant stock independently', () => {
    const useSession = createSaleSession();
    const session = useSession.getState();
    const variantRed = mockProductWithVariants.variantes![0];

    session.addItem(mockProductWithVariants, 4, variantRed);
    expect(useSession.getState().items[0].cantidad).toBe(4);

    // Variant stock limit is 5: adding 2 more (total 6 > 5) should be ignored
    session.addItem(mockProductWithVariants, 2, variantRed);
    expect(useSession.getState().items[0].cantidad).toBe(4);
  });

  it('rejects checkout when session has no items', async () => {
    const { adapter } = createMockAdapter();
    const useSession = createSaleSession(adapter);

    const result = await useSession.getState().checkout(50000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('VALIDATION');
      expect(result.error.message).toBe('El carrito está vacío.');
    }
    expect(adapter.insertVenta).not.toHaveBeenCalled();
  });

  it('rejects checkout when received payment is insufficient', async () => {
    const { adapter } = createMockAdapter();
    const useSession = createSaleSession(adapter);

    useSession.getState().addItem(mockProduct, 2); // total = 50,000

    // Payment of 30,000 is under 50,000
    const result = await useSession.getState().checkout(30000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('VALIDATION');
      expect(result.error.message).toContain('menor al total');
    }
    expect(adapter.insertVenta).not.toHaveBeenCalled();
  });

  it('rejects checkout on invalid or negative payment input', async () => {
    const { adapter } = createMockAdapter();
    const useSession = createSaleSession(adapter);

    useSession.getState().addItem(mockProduct, 1);

    const result = await useSession.getState().checkout('-500');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('VALIDATION');
    }
    expect(adapter.insertVenta).not.toHaveBeenCalled();
  });

  it('executes successful checkout, synthesizes IDs, computes change, and resets session', async () => {
    const { adapter, salesHistory } = createMockAdapter();
    const useSession = createSaleSession(adapter);

    useSession.getState().addItem(mockProduct, 2); // 50,000
    const variantRed = mockProductWithVariants.variantes![0];
    useSession.getState().addItem(mockProductWithVariants, 1, variantRed); // 15,000
    // Total = 65,000

    const paymentReceived = '70000';
    const result = await useSession.getState().checkout(paymentReceived);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.change).toBe(5000);
      expect(result.sale.total).toBe(65000);
      expect(result.sale.monto_recibido).toBe(70000);
      expect(result.sale.vuelto).toBe(5000);
      expect(result.sale.id).toMatch(/^V-\d+$/);
      expect(result.lineItems.length).toBe(2);

      // Verify line items detail
      const firstLine = result.lineItems.find((l) => l.producto_id === 'P-001');
      expect(firstLine?.cantidad).toBe(2);
      expect(firstLine?.precio_unitario).toBe(25000);

      const variantLine = result.lineItems.find((l) => l.producto_id === 'P-002');
      expect(variantLine?.variante_id).toBe('VAR-RED');
    }

    // Adapter received the atomic persistence call
    expect(adapter.insertVenta).toHaveBeenCalledTimes(1);
    expect(salesHistory.length).toBe(1);

    // Session automatically cleared
    expect(useSession.getState().items).toEqual([]);
    expect(useSession.getState().getTotal()).toBe(0);
  });

  it('surfaces persistence failure gracefully without unhandled exceptions', async () => {
    const { adapter } = createMockAdapter(true); // Fails with DB error
    const useSession = createSaleSession(adapter);

    useSession.getState().addItem(mockProduct, 1);

    const result = await useSession.getState().checkout(30000);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.type).toBe('PERSISTENCE');
      expect(result.error.message).toBe('Database connection failed');
    }

    // Items remain in cart so user does not lose transaction data on failure
    expect(useSession.getState().items.length).toBe(1);
  });
});
