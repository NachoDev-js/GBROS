import { describe, it, expect } from 'vitest';
import { useCartStore } from '../store/cartStore';
import type { Product } from '../types/global';

// Reset store between tests
function resetStore() {
  useCartStore.setState({ items: [] });
}

const mockProduct: Product = {
  id: 'P-001',
  nombre: 'Teclado Mecánico',
  precio: 25000,
  stock: 10,
};

const mockProduct2: Product = {
  id: 'P-002',
  nombre: 'Mouse Inalámbrico',
  precio: 15000,
  stock: 5,
};

describe('cartStore', () => {
  it('starts with empty cart', () => {
    resetStore();
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
    expect(state.getTotal()).toBe(0);
  });

  it('adds a product to cart', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    const state = useCartStore.getState();
    expect(state.items.length).toBe(1);
    expect(state.items[0].id).toBe('P-001');
    expect(state.items[0].cantidad).toBe(1);
  });

  it('increments quantity when adding same product twice', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem(mockProduct);
    const state = useCartStore.getState();
    expect(state.items.length).toBe(1);
    expect(state.items[0].cantidad).toBe(2);
  });

  it('adds different products as separate items', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem(mockProduct2);
    const state = useCartStore.getState();
    expect(state.items.length).toBe(2);
  });

  it('removes a product from cart', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem(mockProduct2);
    useCartStore.getState().removeItem('P-001');
    const state = useCartStore.getState();
    expect(state.items.length).toBe(1);
    expect(state.items[0].id).toBe('P-002');
  });

  it('updates quantity of item', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().updateQuantity('P-001', 5);
    const state = useCartStore.getState();
    expect(state.items[0].cantidad).toBe(5);
  });

  it('clears the cart', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().addItem(mockProduct2);
    useCartStore.getState().clearCart();
    const state = useCartStore.getState();
    expect(state.items).toEqual([]);
  });

  it('calculates total correctly for single item', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    useCartStore.getState().updateQuantity('P-001', 3);
    expect(useCartStore.getState().getTotal()).toBe(75000); // 25000 * 3
  });

  it('calculates total correctly for multiple items', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);    // 25000 x 1
    useCartStore.getState().addItem(mockProduct2);   // 15000 x 1
    expect(useCartStore.getState().getTotal()).toBe(40000);
  });

  it('handles adding product with custom quantity', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct, 4);
    const state = useCartStore.getState();
    expect(state.items[0].cantidad).toBe(4);
    expect(state.getTotal()).toBe(100000); // 25000 * 4
  });

  it('does not create negative totals', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct);
    // Total should never be negative even with unusual operations
    expect(useCartStore.getState().getTotal()).toBeGreaterThanOrEqual(0);
  });

  it('respects maximum stock when adding items', () => {
    resetStore();
    // mockProduct has stock: 10
    useCartStore.getState().addItem(mockProduct, 8);
    useCartStore.getState().addItem(mockProduct, 3); // 8+3 = 11 > 10, should be ignored
    
    expect(useCartStore.getState().items[0].cantidad).toBe(8);
  });

  it('respects maximum stock when updating quantity', () => {
    resetStore();
    useCartStore.getState().addItem(mockProduct); // qty: 1
    useCartStore.getState().updateQuantity('P-001', 50); // 50 > 10, should be ignored
    
    expect(useCartStore.getState().items[0].cantidad).toBe(1);
  });
});
