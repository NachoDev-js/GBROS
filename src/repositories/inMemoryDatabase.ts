import type { Product, Venta, DetalleVenta } from '../types/global';
import type {
  IProductsRepository,
  ISalesRepository,
  IPlatformBridge,
  IDataRepositories,
  DashboardData,
} from './types';

export const SEED_PRODUCTS: Product[] = [
  {
    id: '101',
    nombre: 'Teclado Mecánico RGB',
    precio: 35000,
    precio_costo: 22000,
    stock: 15,
    estado_activo: 1,
  },
  {
    id: '102',
    nombre: 'Mouse Óptico Gamer',
    precio: 18500,
    precio_costo: 11000,
    stock: 20,
    estado_activo: 1,
  },
  {
    id: '103',
    nombre: 'Remera GBROS Algodón',
    precio: 12000,
    precio_costo: 6500,
    stock: 10,
    estado_activo: 1,
    variantes: [
      { id: 'V-103-NEGRO', color: 'Negro', stock: 6 },
      { id: 'V-103-BLANCO', color: 'Blanco', stock: 4 },
    ],
  },
];

export function createInMemoryDatabase(initialProducts: Product[] = SEED_PRODUCTS): IDataRepositories {
  let products: Product[] = JSON.parse(JSON.stringify(initialProducts));
  let sales: Venta[] = [];
  let details: DetalleVenta[] = [];

  const productsRepo: IProductsRepository = {
    async getProducts() {
      return products.filter((p) => p.estado_activo !== 0);
    },

    async addProduct(product) {
      const existingIdx = products.findIndex((p) => p.id === product.id);
      if (existingIdx >= 0) {
        products[existingIdx] = { ...product, estado_activo: 1 };
      } else {
        products.push({ ...product, estado_activo: 1 });
      }
    },

    async updateProduct(product) {
      const idx = products.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        products[idx] = { ...product, estado_activo: 1 };
      }
    },

    async deleteProduct(id) {
      const product = products.find((p) => p.id === id);
      if (product) {
        product.estado_activo = 0;
      }
    },
  };

  const salesRepo: ISalesRepository = {
    async insertVenta({ venta, detalles }) {
      sales.push(venta);
      details.push(...detalles);

      // Decrement stock
      for (const d of detalles) {
        const product = products.find((p) => p.id === d.producto_id);
        if (product) {
          product.stock -= d.cantidad;
          if (d.variante_id && product.variantes) {
            const variant = product.variantes.find((v) => v.id === d.variante_id);
            if (variant) {
              variant.stock -= d.cantidad;
            }
          }
        }
      }
    },

    async getTodaySales() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();
      return sales.filter((s) => s.fecha_hora >= todayIso);
    },

    async deleteVenta(id) {
      const targetSale = sales.find((s) => s.id === id);
      if (!targetSale) {
        return { success: false, message: 'Venta no encontrada' };
      }

      // Restore stock from line items
      const saleDetails = details.filter((d) => d.venta_id === id);
      for (const d of saleDetails) {
        const product = products.find((p) => p.id === d.producto_id);
        if (product) {
          product.stock += d.cantidad;
          if (d.variante_id && product.variantes) {
            const variant = product.variantes.find((v) => v.id === d.variante_id);
            if (variant) {
              variant.stock += d.cantidad;
            }
          }
        }
      }

      sales = sales.filter((s) => s.id !== id);
      details = details.filter((d) => d.venta_id !== id);
      return { success: true };
    },

    async getDashboardData(period): Promise<DashboardData> {
      const now = new Date();
      let startDate = new Date();

      if (period === 'diaria') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'semanal') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'mensual') {
        startDate.setMonth(now.getMonth() - 1);
      }

      const filtered = sales.filter((s) => new Date(s.fecha_hora) >= startDate);
      const totalIngresos = filtered.reduce((acc, s) => acc + s.total, 0);
      const cantidadVentas = filtered.length;

      const chartDataMap = new Map<string, number>();
      const daysMap = new Map<string, number>();
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

      for (const v of filtered) {
        const dateObj = new Date(v.fecha_hora);
        const day = dateObj.toISOString().split('T')[0];
        chartDataMap.set(day, (chartDataMap.get(day) || 0) + v.total);

        const dayName = dayNames[dateObj.getDay()];
        daysMap.set(dayName, (daysMap.get(dayName) || 0) + 1);
      }

      const chartData = Array.from(chartDataMap.entries()).map(([date, total]) => ({ date, total }));
      const bestSellingDays = Array.from(daysMap.entries())
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => b.count - a.count);

      return { totalIngresos, cantidadVentas, chartData, bestSellingDays };
    },
  };

  const platformBridge: IPlatformBridge = {
    async exportDatabase() {
      return { success: true, message: 'Backup SQL generado en memoria' };
    },
    async exportSalesExcel() {
      return { success: true, message: 'Excel exportado en memoria' };
    },
    async saveProductImage() {
      return null;
    },
  };

  return {
    products: productsRepo,
    sales: salesRepo,
    platform: platformBridge,
  };
}
