import type { Product } from '../../types/global';
import type { ValidationError } from '../../lib/validation';

export interface VariantDraft {
  id?: string;
  color: string;
  stock: number | string;
}

export interface ProductDraft {
  id?: string;
  nombre: string;
  precio: number | string;
  precio_costo?: number | string;
  stock?: number | string;
  imagen?: string | null;
  hasVariants?: boolean;
  variantes?: VariantDraft[];
}

export type SaveProductResult =
  | {
      ok: true;
      product: Product;
    }
  | {
      ok: false;
      error: {
        message: string;
        errors: ValidationError[];
      };
    };

export interface ProductCatalogState {
  products: Product[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
  saveProduct: (draft: ProductDraft, existingId?: string) => Promise<SaveProductResult>;
  deleteProduct: (id: string) => Promise<boolean>;
}
