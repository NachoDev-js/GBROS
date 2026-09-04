export interface ProductVariant {
  id: string;
  color: string;
  stock: number;
}

export interface Product {
  id: string;
  nombre: string;
  precio: number;
  precio_costo?: number;
  stock: number;
  estado_activo?: number;
  imagen?: string;
  variantes?: ProductVariant[];
}

export interface Venta {
  id: string;
  fecha_hora: string;
  total: number;
  monto_recibido: number;
  vuelto: number;
}

export interface DetalleVenta {
  id: string;
  venta_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  variante_id?: string;
}

export interface IElectronDB {
  getProducts: () => Promise<Product[]>;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  insertVenta: (data: { venta: Venta; detalles: DetalleVenta[] }) => Promise<void>;
  getTodaySales: () => Promise<Venta[]>;
  getDashboardData: (period: 'diaria' | 'semanal' | 'mensual') => Promise<{
    totalIngresos: number;
    cantidadVentas: number;
    chartData: { date: string; total: number }[];
    bestSellingDays: { day: string; count: number }[];
  }>;
  exportDatabase: () => Promise<{ success: boolean; message: string }>;
  exportSalesExcel: (data: { startDate: string; endDate: string }) => Promise<{ success: boolean; message: string }>;
  saveProductImage: () => Promise<string | null>;
  deleteVenta: (id: string) => Promise<{ success: boolean; message: string }>;
}

declare global {
  interface Window {
    db: IElectronDB;
  }
}
