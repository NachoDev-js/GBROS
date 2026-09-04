import type {
  IProductsRepository,
  ISalesRepository,
  IPlatformBridge,
  IDataRepositories,
} from './types';

export function createElectronAdapters(): IDataRepositories {
  const db = typeof window !== 'undefined' ? window.db : undefined;

  if (!db) {
    throw new Error('Electron window.db no está disponible en este entorno.');
  }

  const products: IProductsRepository = {
    getProducts: () => db.getProducts(),
    addProduct: (p) => db.addProduct(p),
    updateProduct: (p) => db.updateProduct(p),
    deleteProduct: (id) => db.deleteProduct(id),
  };

  const sales: ISalesRepository = {
    insertVenta: (data) => db.insertVenta(data),
    getTodaySales: () => db.getTodaySales(),
    deleteVenta: (id) => db.deleteVenta(id),
    getDashboardData: (period) => db.getDashboardData(period),
  };

  const platform: IPlatformBridge = {
    exportDatabase: () => db.exportDatabase(),
    exportSalesExcel: (data) => db.exportSalesExcel(data),
    saveProductImage: () => db.saveProductImage(),
  };

  return { products, sales, platform };
}
