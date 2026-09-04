import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('db', {
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product: any) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product: any) => ipcRenderer.invoke('update-product', product),
  deleteProduct: (id: string) => ipcRenderer.invoke('delete-product', id),
  insertVenta: (data: any) => ipcRenderer.invoke('insert-venta', data),
  getTodaySales: () => ipcRenderer.invoke('get-today-sales'),
  getDashboardData: (period: string) => ipcRenderer.invoke('get-dashboard-data', period),
  exportDatabase: () => ipcRenderer.invoke('export-database'),
  exportSalesExcel: (data: { startDate: string, endDate: string }) => ipcRenderer.invoke('export-sales-excel', data),
  saveProductImage: () => ipcRenderer.invoke('save-product-image'),
  deleteVenta: (id: string) => ipcRenderer.invoke('delete-venta', id),
});
