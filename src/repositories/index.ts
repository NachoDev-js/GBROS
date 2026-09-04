import type {
  IDataRepositories,
  IProductsRepository,
  ISalesRepository,
  IPlatformBridge,
} from './types';
import { createElectronAdapters } from './electronAdapters';
import { createInMemoryDatabase } from './inMemoryDatabase';

export * from './types';
export { createInMemoryDatabase, SEED_PRODUCTS } from './inMemoryDatabase';
export { createElectronAdapters } from './electronAdapters';

function resolveDefaultRepositories(): IDataRepositories {
  if (typeof window !== 'undefined' && window.db) {
    return createElectronAdapters();
  }
  return createInMemoryDatabase();
}

let activeRepositories: IDataRepositories = resolveDefaultRepositories();

/**
 * Configure or override repository implementations (e.g. for testing).
 */
export function setRepositoryAdapter(repositories: IDataRepositories) {
  activeRepositories = repositories;
}

/**
 * Reset repositories to default environment detection.
 */
export function resetRepositories() {
  activeRepositories = resolveDefaultRepositories();
}

/**
 * Products repository singleton delegating to active adapter.
 */
export const productsRepo: IProductsRepository = {
  getProducts: (...args) => activeRepositories.products.getProducts(...args),
  addProduct: (...args) => activeRepositories.products.addProduct(...args),
  updateProduct: (...args) => activeRepositories.products.updateProduct(...args),
  deleteProduct: (...args) => activeRepositories.products.deleteProduct(...args),
};

/**
 * Sales repository singleton delegating to active adapter.
 */
export const salesRepo: ISalesRepository = {
  insertVenta: (...args) => activeRepositories.sales.insertVenta(...args),
  getTodaySales: (...args) => activeRepositories.sales.getTodaySales(...args),
  deleteVenta: (...args) => activeRepositories.sales.deleteVenta(...args),
  getDashboardData: (...args) => activeRepositories.sales.getDashboardData(...args),
};

/**
 * Platform bridge singleton delegating to active adapter.
 */
export const platformBridge: IPlatformBridge = {
  exportDatabase: (...args) => activeRepositories.platform.exportDatabase(...args),
  exportSalesExcel: (...args) => activeRepositories.platform.exportSalesExcel(...args),
  saveProductImage: (...args) => activeRepositories.platform.saveProductImage(...args),
};
