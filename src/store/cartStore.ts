import { create } from 'zustand';
import type { Product, ProductVariant } from '../types/global';

export interface CartItem extends Product {
  cantidad: number;
  selectedVariant?: ProductVariant;
  cartItemId: string;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, qty?: number, variant?: ProductVariant) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addItem: (product, qty = 1, variant) => set((state) => {
    const cartItemId = variant ? `${product.id}-${variant.id}` : product.id;
    const existing = state.items.find(item => item.cartItemId === cartItemId);
    const currentQtyInCart = existing ? existing.cantidad : 0;
    
    // VALIDACIÓN: No permitir exceder el stock disponible
    const maxStock = variant ? variant.stock : product.stock;
    if (currentQtyInCart + qty > maxStock) {
      return state;
    }

    if (existing) {
      return {
        items: state.items.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, cantidad: item.cantidad + qty }
            : item
        )
      };
    }
    return { items: [...state.items, { ...product, cantidad: qty, selectedVariant: variant, cartItemId }] };
  }),
  removeItem: (cartItemId) => set((state) => ({
    items: state.items.filter(item => item.cartItemId !== cartItemId)
  })),
  updateQuantity: (cartItemId, quantity) => set((state) => {
    const item = state.items.find(i => i.cartItemId === cartItemId);
    
    // VALIDACIÓN: No permitir que la nueva cantidad supere el stock
    if (item) {
      const maxStock = item.selectedVariant ? item.selectedVariant.stock : item.stock;
      if (quantity > maxStock) {
        return state;
      }
    }

    return {
      items: state.items.map(item => 
        item.cartItemId === cartItemId ? { ...item, cantidad: Math.max(1, quantity) } : item
      )
    };
  }),
  clearCart: () => set({ items: [] }),
  getTotal: () => get().items.reduce((total, item) => total + (item.precio * item.cantidad), 0),
}));
