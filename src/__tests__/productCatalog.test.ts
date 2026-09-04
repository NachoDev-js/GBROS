import { describe, it, expect, beforeEach } from 'vitest';
import { createProductCatalog, generateUniqueSku } from '../modules/catalog/productCatalog';
import { createInMemoryDatabase } from '../repositories/inMemoryDatabase';
import type { Product } from '../types/global';

describe('ProductCatalog module', () => {
  let db: ReturnType<typeof createInMemoryDatabase>;
  let useCatalog: ReturnType<typeof createProductCatalog>;

  const initialProducts: Product[] = [
    { id: '001', nombre: 'Monitor 24', precio: 100000, stock: 5, estado_activo: 1 },
    { id: '002', nombre: 'Teclado', precio: 20000, stock: 10, estado_activo: 1 },
  ];

  beforeEach(async () => {
    db = createInMemoryDatabase(initialProducts);
    useCatalog = createProductCatalog(db.products);
    await useCatalog.getState().loadProducts();
  });

  it('loads products initially', () => {
    expect(useCatalog.getState().products.length).toBe(2);
  });

  describe('generateUniqueSku', () => {
    it('generates a SKU not present in existing products', () => {
      const existing: Product[] = [{ id: '001', nombre: 'A', precio: 1, stock: 1 }];
      const sku = generateUniqueSku(existing);
      expect(sku).not.toBe('001');
      expect(sku.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('saveProduct', () => {
    it('auto-generates unique SKU when id is empty or blank', async () => {
      const result = await useCatalog.getState().saveProduct({
        nombre: 'Mouse Inalámbrico',
        precio: '15000',
        stock: '8',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.product.id).toBeDefined();
        expect(result.product.id).not.toBe('001');
        expect(result.product.id).not.toBe('002');
        expect(result.product.nombre).toBe('Mouse Inalámbrico');
        expect(result.product.precio).toBe(15000);
        expect(result.product.stock).toBe(8);
      }

      // Catalog in store refreshed
      expect(useCatalog.getState().products.length).toBe(3);
    });

    it('preserves custom barcode or SKU when provided', async () => {
      const result = await useCatalog.getState().saveProduct({
        id: 'BARCODE-779123456',
        nombre: 'Cerveza Artesanal',
        precio: 3500,
        stock: 24,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.product.id).toBe('BARCODE-779123456');
      }
    });

    it('rolls up variant stock into total product stock and synthesizes variant IDs', async () => {
      const result = await useCatalog.getState().saveProduct({
        nombre: 'Buzo GBROS',
        precio: '45000',
        hasVariants: true,
        variantes: [
          { color: 'Negro M', stock: '7' },
          { color: 'Gris L', stock: '5' },
        ],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        // 7 + 5 = 12
        expect(result.product.stock).toBe(12);
        expect(result.product.variantes?.length).toBe(2);
        expect(result.product.variantes![0].id).toMatch(/^V-/);
        expect(result.product.variantes![0].stock).toBe(7);
        expect(result.product.variantes![1].stock).toBe(5);
      }
    });

    it('returns validation errors for invalid price or empty name', async () => {
      const result = await useCatalog.getState().saveProduct({
        nombre: '',
        precio: '-500',
        stock: '10',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.errors.some((e) => e.field === 'nombre')).toBe(true);
        expect(result.error.errors.some((e) => e.field === 'precio')).toBe(true);
      }
    });

    it('returns validation errors for empty variant color or negative variant stock', async () => {
      const result = await useCatalog.getState().saveProduct({
        nombre: 'Gorra',
        precio: '5000',
        hasVariants: true,
        variantes: [
          { color: '', stock: '5' },
          { color: 'Verde', stock: '-1' },
        ],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.errors.some((e) => e.field.includes('color'))).toBe(true);
        expect(result.error.errors.some((e) => e.field.includes('stock'))).toBe(true);
      }
    });

    it('updates existing product when existingId is supplied', async () => {
      const result = await useCatalog.getState().saveProduct(
        {
          nombre: 'Monitor 24 IPS Curvo',
          precio: 125000,
          stock: 4,
        },
        '001'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.product.id).toBe('001');
        expect(result.product.nombre).toBe('Monitor 24 IPS Curvo');
        expect(result.product.precio).toBe(125000);
      }

      // Catalog size remains 2
      expect(useCatalog.getState().products.length).toBe(2);
    });
  });

  describe('deleteProduct', () => {
    it('removes product from store and persistence', async () => {
      const success = await useCatalog.getState().deleteProduct('001');
      expect(success).toBe(true);
      expect(useCatalog.getState().products.length).toBe(1);
      expect(useCatalog.getState().products[0].id).toBe('002');
    });
  });
});
