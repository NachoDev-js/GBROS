import { describe, it, expect, beforeEach } from 'vitest';
import {
  createInMemoryDatabase,
  setRepositoryAdapter,
  productsRepo,
  salesRepo,
  platformBridge,
} from '../repositories';
import { createSaleSession } from '../modules/sale';
import type { Product, Venta, DetalleVenta } from '../types/global';

describe('Data Repositories & In-Memory Seam', () => {
  let db: ReturnType<typeof createInMemoryDatabase>;

  beforeEach(() => {
    db = createInMemoryDatabase([
      {
        id: 'TEST-1',
        nombre: 'Gamepad Pro',
        precio: 30000,
        stock: 10,
        estado_activo: 1,
      },
      {
        id: 'TEST-2',
        nombre: 'Gorra Gamer',
        precio: 8000,
        stock: 6,
        estado_activo: 1,
        variantes: [
          { id: 'V-ROJO', color: 'Rojo', stock: 4 },
          { id: 'V-AZUL', color: 'Azul', stock: 2 },
        ],
      },
    ]);
    setRepositoryAdapter(db);
  });

  describe('productsRepo', () => {
    it('retrieves active products', async () => {
      const list = await productsRepo.getProducts();
      expect(list.length).toBe(2);
      expect(list.map((p) => p.id)).toEqual(['TEST-1', 'TEST-2']);
    });

    it('adds a new product', async () => {
      const newProd: Product = {
        id: 'TEST-3',
        nombre: 'Mousepad XL',
        precio: 5000,
        stock: 25,
      };
      await productsRepo.addProduct(newProd);

      const list = await productsRepo.getProducts();
      expect(list.length).toBe(3);
      expect(list.find((p) => p.id === 'TEST-3')?.nombre).toBe('Mousepad XL');
    });

    it('updates an existing product', async () => {
      const updated: Product = {
        id: 'TEST-1',
        nombre: 'Gamepad Pro Wireless',
        precio: 38000,
        stock: 8,
      };
      await productsRepo.updateProduct(updated);

      const list = await productsRepo.getProducts();
      const p1 = list.find((p) => p.id === 'TEST-1');
      expect(p1?.nombre).toBe('Gamepad Pro Wireless');
      expect(p1?.precio).toBe(38000);
      expect(p1?.stock).toBe(8);
    });

    it('soft deletes a product by setting estado_activo = 0', async () => {
      await productsRepo.deleteProduct('TEST-1');

      const list = await productsRepo.getProducts();
      expect(list.length).toBe(1);
      expect(list[0].id).toBe('TEST-2');
    });
  });

  describe('salesRepo', () => {
    it('records a sale and decrements product & variant stock atomically', async () => {
      const now = new Date().toISOString();
      const venta: Venta = {
        id: 'V-1001',
        fecha_hora: now,
        total: 46000,
        monto_recibido: 50000,
        vuelto: 4000,
      };

      const detalles: DetalleVenta[] = [
        {
          id: 'D-1',
          venta_id: 'V-1001',
          producto_id: 'TEST-1',
          cantidad: 1,
          precio_unitario: 30000,
        },
        {
          id: 'D-2',
          venta_id: 'V-1001',
          producto_id: 'TEST-2',
          cantidad: 2,
          precio_unitario: 8000,
          variante_id: 'V-ROJO',
        },
      ];

      await salesRepo.insertVenta({ venta, detalles });

      // Verify today sales
      const todaySales = await salesRepo.getTodaySales();
      expect(todaySales.length).toBe(1);
      expect(todaySales[0].id).toBe('V-1001');

      // Verify stock was reduced
      const products = await productsRepo.getProducts();
      const p1 = products.find((p) => p.id === 'TEST-1');
      const p2 = products.find((p) => p.id === 'TEST-2');

      expect(p1?.stock).toBe(9); // 10 - 1
      expect(p2?.stock).toBe(4); // 6 - 2
      expect(p2?.variantes?.find((v) => v.id === 'V-ROJO')?.stock).toBe(2); // 4 - 2
    });

    it('restores stock when a sale is deleted', async () => {
      const now = new Date().toISOString();
      const venta: Venta = {
        id: 'V-2001',
        fecha_hora: now,
        total: 30000,
        monto_recibido: 30000,
        vuelto: 0,
      };
      const detalles: DetalleVenta[] = [
        {
          id: 'D-201',
          venta_id: 'V-2001',
          producto_id: 'TEST-1',
          cantidad: 3,
          precio_unitario: 30000,
        },
      ];

      await salesRepo.insertVenta({ venta, detalles });
      expect((await productsRepo.getProducts())[0].stock).toBe(7); // 10 - 3

      const result = await salesRepo.deleteVenta('V-2001');
      expect(result.success).toBe(true);

      // Sale is gone
      const todaySales = await salesRepo.getTodaySales();
      expect(todaySales.length).toBe(0);

      // Stock is restored
      expect((await productsRepo.getProducts())[0].stock).toBe(10);
    });

    it('computes dashboard metrics correctly', async () => {
      const now = new Date().toISOString();
      await salesRepo.insertVenta({
        venta: { id: 'V-1', fecha_hora: now, total: 10000, monto_recibido: 10000, vuelto: 0 },
        detalles: [],
      });
      await salesRepo.insertVenta({
        venta: { id: 'V-2', fecha_hora: now, total: 15000, monto_recibido: 15000, vuelto: 0 },
        detalles: [],
      });

      const metrics = await salesRepo.getDashboardData('semanal');
      expect(metrics.totalIngresos).toBe(25000);
      expect(metrics.cantidadVentas).toBe(2);
      expect(metrics.chartData.length).toBeGreaterThanOrEqual(1);
      expect(metrics.bestSellingDays.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('platformBridge', () => {
    it('executes bridge operations without crashing', async () => {
      const dbDump = await platformBridge.exportDatabase();
      expect(dbDump.success).toBe(true);

      const excel = await platformBridge.exportSalesExcel({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });
      expect(excel.success).toBe(true);

      const img = await platformBridge.saveProductImage();
      expect(img).toBeNull();
    });
  });

  describe('End-to-End integration with SaleSession', () => {
    it('executes checkout through saleSession and reflects stock and sales in repositories', async () => {
      // Default session uses salesRepo
      const useSession = createSaleSession();
      const product = (await productsRepo.getProducts())[0]; // TEST-1, stock 10

      useSession.getState().addItem(product, 3);
      expect(useSession.getState().getTotal()).toBe(90000);

      const checkoutResult = await useSession.getState().checkout(100000);
      expect(checkoutResult.ok).toBe(true);

      // Repositories observe the new sale
      const todaySales = await salesRepo.getTodaySales();
      expect(todaySales.length).toBe(1);
      expect(todaySales[0].total).toBe(90000);

      // Stock was reduced in repository
      const updatedProducts = await productsRepo.getProducts();
      expect(updatedProducts.find((p) => p.id === 'TEST-1')?.stock).toBe(7);
    });
  });
});
