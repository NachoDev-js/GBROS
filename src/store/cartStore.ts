/**
 * Backward compatibility proxy for useSaleSession.
 * New callers should import from `src/modules/sale`.
 */
import { useSaleSession } from '../modules/sale';
export type { SaleLineItem as CartItem } from '../modules/sale';
export const useCartStore = useSaleSession;
