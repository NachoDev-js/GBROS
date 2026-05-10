import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as xlsx from 'xlsx';

import db from './db.js';

// Setup IPC handlers
ipcMain.handle('get-products', () => {
  const products = db.prepare('SELECT * FROM Productos WHERE estado_activo = 1').all();
  for (const p of products as any[]) {
    p.variantes = db.prepare('SELECT * FROM Producto_Variantes WHERE producto_id = ?').all(p.id);
  }
  return products;
});

ipcMain.handle('add-product', (_, product) => {
  const stmt = db.prepare('INSERT INTO Productos (id, nombre, precio, stock, imagen) VALUES (?, ?, ?, ?, ?)');
  const insertVariant = db.prepare('INSERT INTO Producto_Variantes (id, producto_id, color, stock) VALUES (?, ?, ?, ?)');
  
  try {
    db.exec('BEGIN TRANSACTION;');
    stmt.run(product.id, product.nombre, product.precio, product.stock, product.imagen || null);
    if (product.variantes && product.variantes.length > 0) {
      for (const v of product.variantes) {
        insertVariant.run(v.id || `V-${Date.now()}-${Math.random().toString(36).substring(7)}`, product.id, v.color, v.stock);
      }
    }
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
});

ipcMain.handle('update-product', (_, product) => {
  const stmt = db.prepare('UPDATE Productos SET nombre = ?, precio = ?, stock = ?, imagen = ? WHERE id = ?');
  const deleteVariants = db.prepare('DELETE FROM Producto_Variantes WHERE producto_id = ?');
  const insertVariant = db.prepare('INSERT INTO Producto_Variantes (id, producto_id, color, stock) VALUES (?, ?, ?, ?)');

  try {
    db.exec('BEGIN TRANSACTION;');
    stmt.run(product.nombre, product.precio, product.stock, product.imagen || null, product.id);
    
    deleteVariants.run(product.id);
    if (product.variantes && product.variantes.length > 0) {
      for (const v of product.variantes) {
        insertVariant.run(v.id || `V-${Date.now()}-${Math.random().toString(36).substring(7)}`, product.id, v.color, v.stock);
      }
    }
    db.exec('COMMIT;');
  } catch (e) {
    db.exec('ROLLBACK;');
    throw e;
  }
});

ipcMain.handle('delete-product', (_, id) => {
  const stmt = db.prepare('UPDATE Productos SET estado_activo = 0 WHERE id = ?');
  stmt.run(id);
});

ipcMain.handle('get-today-sales', () => {
  // Get start of today in ISO
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();
  
  return db.prepare('SELECT * FROM Ventas WHERE fecha_hora >= ?').all(startOfDay);
});

ipcMain.handle('get-dashboard-data', (_, period) => {
  const now = new Date();
  let startDate = new Date();
  
  if (period === 'diaria') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'semanal') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'mensual') {
    startDate.setMonth(now.getMonth() - 1);
  }
  
  const startIso = startDate.toISOString();
  
  const ventas = db.prepare('SELECT fecha_hora, total FROM Ventas WHERE fecha_hora >= ? ORDER BY fecha_hora ASC').all(startIso) as any[];
  const totalIngresos = ventas.reduce((acc: number, v: any) => acc + v.total, 0);
  const cantidadVentas = ventas.length;
  
  // Agrupar por dia para el grafico y calcular mejores dias
  const chartDataMap = new Map();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const daysMap = new Map();

  for (const v of ventas) {
    const day = v.fecha_hora.split('T')[0];
    chartDataMap.set(day, (chartDataMap.get(day) || 0) + v.total);

    const dateObj = new Date(v.fecha_hora);
    const dayName = dayNames[dateObj.getDay()];
    daysMap.set(dayName, (daysMap.get(dayName) || 0) + 1);
  }
  
  const chartData = Array.from(chartDataMap.entries()).map(([date, total]) => ({ date, total }));
  const bestSellingDays = Array.from(daysMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);
  
  return { totalIngresos, cantidadVentas, chartData, bestSellingDays };
});

// Venta transaction
ipcMain.handle('insert-venta', (_, { venta, detalles }) => {
  const insertVenta = db.prepare('INSERT INTO Ventas (id, fecha_hora, total, monto_recibido, vuelto) VALUES (?, ?, ?, ?, ?)');
  const insertDetalle = db.prepare('INSERT INTO Detalle_Ventas (id, venta_id, producto_id, cantidad, precio_unitario, variante_id) VALUES (?, ?, ?, ?, ?, ?)');
  const updateStock = db.prepare('UPDATE Productos SET stock = stock - ? WHERE id = ?');
  const updateVariantStock = db.prepare('UPDATE Producto_Variantes SET stock = stock - ? WHERE id = ?');

  try {
    db.exec('BEGIN TRANSACTION;');
    insertVenta.run(venta.id, venta.fecha_hora, venta.total, venta.monto_recibido, venta.vuelto);
    for (const detalle of detalles) {
      insertDetalle.run(detalle.id, detalle.venta_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.variante_id || null);
      updateStock.run(detalle.cantidad, detalle.producto_id);
      if (detalle.variante_id) {
        updateVariantStock.run(detalle.cantidad, detalle.variante_id);
      }
    }
    db.exec('COMMIT;');
  } catch(error) {
    db.exec('ROLLBACK;');
    throw error;
  }
});


ipcMain.handle('export-database', async (event) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar Base de Datos de GBROS',
    defaultPath: 'gbros_backup.sqlite',
    filters: [
      { name: 'SQLite Database', extensions: ['sqlite', 'db'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Exportación cancelada' };
  }

  try {
    // Checkpoint SQLite WAL before copying
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    
    const dbPath = path.join(app.getPath('userData'), 'gbros_database.sqlite');
    fs.copyFileSync(dbPath, filePath);
    
    return { success: true, message: 'Base de datos exportada con éxito' };
  } catch (error: any) {
    console.error('Error al exportar:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('export-sales-excel', async (_, { startDate, endDate }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar Ventas a Excel',
    defaultPath: `Ventas_${startDate.split('T')[0]}_al_${endDate.split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) return { success: false, message: 'Exportación cancelada' };

  try {
    const query = `
      SELECT v.fecha_hora, v.id as venta_id, p.nombre as producto, pv.color, dv.cantidad, dv.precio_unitario, (dv.cantidad * dv.precio_unitario) as subtotal
      FROM Ventas v
      JOIN Detalle_Ventas dv ON v.id = dv.venta_id
      JOIN Productos p ON dv.producto_id = p.id
      LEFT JOIN Producto_Variantes pv ON dv.variante_id = pv.id
      WHERE v.fecha_hora >= ? AND v.fecha_hora <= ?
      ORDER BY v.fecha_hora DESC
    `;
    // Build full datetime range: start of startDate local -> end of endDate local
    // Dates come as 'YYYY-MM-DD' from the date picker
    const startLocal = new Date(`${startDate}T00:00:00`);
    const endLocal = new Date(`${endDate}T23:59:59.999`);
    const startISO = startLocal.toISOString();
    const endISO = endLocal.toISOString();
    
    const rows = db.prepare(query).all(startISO, endISO);


    const worksheet = xlsx.utils.json_to_sheet(rows.map((r: any) => ({
      'Fecha': new Date(r.fecha_hora).toLocaleString(),
      'Venta ID': r.venta_id,
      'Producto': r.producto,
      'Color/Variante': r.color || '-',
      'Cantidad': r.cantidad,
      'Precio Unitario': r.precio_unitario,
      'Subtotal': r.subtotal
    })));

    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(filePath, buffer);

    return { success: true, message: 'Excel exportado con éxito' };
  } catch (error: any) {
    console.error('Error exporting excel:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('save-product-image', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Seleccionar Imagen del Producto',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }]
  });

  if (canceled || filePaths.length === 0) return null;

  const sourcePath = filePaths[0];
  const imageBuffer = fs.readFileSync(sourcePath);
  const ext = path.extname(sourcePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';
  
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
});

// const __dirname = path.dirname(fileURLToPath(import.meta.url)); // ESM
// Since we are compiling to CJS, __dirname is available globally.
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC, 'vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
