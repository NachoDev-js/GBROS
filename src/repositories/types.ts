import type { Product, Venta, DetalleVenta } from '../types/global';

export interface DashboardData {
  totalIngresos: number;
  cantidadVentas: number;
  chartData: { date: string; total: number }[];
  bestSellingDays: { day: string; count: number }[];
}

export interface IProductsRepository {
  getProducts(): Promise<Product[]>;
  addProduct(product: Product): Promise<void>;
  updateProduct(product: Product): Promise<void>;
  deleteProduct(id: string): Promise<void>;
}

export interface ISalesRepository {
  insertVenta(data: { venta: Venta; detalles: DetalleVenta[] }): Promise<void>;
  getTodaySales(): Promise<Venta[]>;
  deleteVenta(id: string): Promise<{ success: boolean; message?: string }>;
  getDashboardData(period: 'diaria' | 'semanal' | 'mensual'): Promise<DashboardData>;
}

export interface IPlatformBridge {
  exportDatabase(): Promise<{ success: boolean; message: string }>;
  exportSalesExcel(data: { startDate: string; endDate: string }): Promise<{ success: boolean; message: string }>;
  saveProductImage(): Promise<string | null>;
}

export interface IDataRepositories {
  products: IProductsRepository;
  sales: ISalesRepository;
  platform: IPlatformBridge;
}
