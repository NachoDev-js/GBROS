import { create } from 'zustand';
import { validateProductForm } from '../../lib/validation';
import { productsRepo } from '../../repositories';
import type { IProductsRepository } from '../../repositories/types';
import type { Product } from '../../types/global';
import type {
  ProductCatalogState,
  ProductDraft,
  SaveProductResult,
} from './types';

/**
 * Generates a unique numeric SKU that does not collide with existing inventory.
 */
export function generateUniqueSku(existingProducts: Product[]): string {
  let maxDigits = 3;
  let limit = 999;
  let attempts = 0;
  let candidate = '';

  do {
    attempts++;
    if (attempts > limit * 2) {
      maxDigits++;
      limit = Math.pow(10, maxDigits) - 1;
      attempts = 0;
    }
    const rnd = Math.floor(Math.random() * limit) + 1;
    candidate = String(rnd).padStart(maxDigits, '0');
  } while (existingProducts.some((p) => p.id === candidate));

  return candidate;
}

/**
 * Creates a Product Catalog store bound to an IProductsRepository adapter.
 * Defaults to the production productsRepo singleton.
 */
export function createProductCatalog(repo?: IProductsRepository) {
  return create<ProductCatalogState>((set, get) => {
    const targetRepo = repo || productsRepo;

    return {
      products: [],
      isLoading: false,

      loadProducts: async () => {
        set({ isLoading: true });
        try {
          const list = await targetRepo.getProducts();
          set({ products: list, isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      saveProduct: async (draft: ProductDraft, existingId?: string): Promise<SaveProductResult> => {
        const state = get();
        let finalId = existingId || (draft.id ? draft.id.trim() : '');

        // If creating and no ID provided, auto-generate unique SKU
        if (!finalId) {
          finalId = generateUniqueSku(state.products);
        }

        const hasVariants = Boolean(
          draft.hasVariants && draft.variantes && draft.variantes.length > 0
        );

        let finalStock = parseInt(String(draft.stock || '0'), 10) || 0;
        let cleanedVariants = undefined;

        if (hasVariants) {
          finalStock = draft.variantes!.reduce(
            (acc, v) => acc + (parseInt(String(v.stock), 10) || 0),
            0
          );
          cleanedVariants = draft.variantes!.map((v) => ({
            id: v.id || `V-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            color: v.color.trim(),
            stock: parseInt(String(v.stock), 10) || 0,
          }));
        }

        // Validate form
        const validationErrors = validateProductForm({
          id: finalId,
          nombre: draft.nombre,
          precio: String(draft.precio ?? ''),
          precio_costo:
            draft.precio_costo !== undefined && draft.precio_costo !== ''
              ? String(draft.precio_costo)
              : undefined,
          stock: hasVariants ? '1' : String(draft.stock ?? ''),
        });

        if (hasVariants && draft.variantes) {
          for (const [idx, v] of draft.variantes.entries()) {
            if (!v.color || !v.color.trim()) {
              validationErrors.push({
                field: `variante_${idx}_color`,
                message: `La variante #${idx + 1} debe tener un nombre/color.`,
              });
            }
            const vStock = parseInt(String(v.stock), 10);
            if (isNaN(vStock) || vStock < 0) {
              validationErrors.push({
                field: `variante_${idx}_stock`,
                message: `El stock de la variante #${idx + 1} debe ser mayor o igual a 0.`,
              });
            }
          }
        }

        if (validationErrors.length > 0) {
          return {
            ok: false,
            error: {
              message: validationErrors[0].message,
              errors: validationErrors,
            },
          };
        }

        const product: Product = {
          id: finalId,
          nombre: draft.nombre.trim(),
          precio: typeof draft.precio === 'number' ? draft.precio : parseFloat(draft.precio),
          precio_costo:
            draft.precio_costo !== undefined && draft.precio_costo !== ''
              ? typeof draft.precio_costo === 'number'
                ? draft.precio_costo
                : parseFloat(draft.precio_costo)
              : 0,
          stock: finalStock,
          imagen: draft.imagen || undefined,
          variantes: cleanedVariants,
          estado_activo: 1,
        };

        try {
          if (existingId) {
            await targetRepo.updateProduct(product);
          } else {
            await targetRepo.addProduct(product);
          }

          // Automatically reload catalog in store
          await get().loadProducts();

          return { ok: true, product };
        } catch (err: any) {
          return {
            ok: false,
            error: {
              message: err?.message || 'Error al persistir el producto.',
              errors: [],
            },
          };
        }
      },

      deleteProduct: async (id: string): Promise<boolean> => {
        try {
          await targetRepo.deleteProduct(id);
          await get().loadProducts();
          return true;
        } catch {
          return false;
        }
      },
    };
  });
}

/**
 * Default singleton hook using production products repository.
 */
export const useProductCatalog = createProductCatalog();
