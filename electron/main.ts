import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as xlsx from 'xlsx';

import { pool, initializeDatabase, configPath, wasCreated } from './db.js';

// PostgreSQL devuelve NUMERIC como strings — normalizamos a number
function normalizeProduct(p: any) {
  return {
    ...p,
    precio: Number(p.precio),
    precio_costo: Number(p.precio_costo || 0),
    stock: Number(p.stock),
    variantes: p.variantes?.map((v: any) => ({ ...v, stock: Number(v.stock) })) || [],
  };
}

function normalizeVenta(v: any) {
  return {
    ...v,
    total: Number(v.total),
    monto_recibido: Number(v.monto_recibido),
    vuelto: Number(v.vuelto),
  };
}

// ─────────────────────────────────────────────
// IPC: Productos
// ─────────────────────────────────────────────

ipcMain.handle('get-products', async () => {
  const { rows: products } = await pool.query(`
    SELECT 
      p.*,
      COALESCE(
        json_agg(pv.*) FILTER (WHERE pv.id IS NOT NULL), 
        '[]'
      ) as variantes
    FROM Productos p
    LEFT JOIN Producto_Variantes pv ON p.id = pv.producto_id
    WHERE p.estado_activo = 1
    GROUP BY p.id
  `);
  
  return products.map(normalizeProduct);
});

ipcMain.handle('add-product', async (_, product) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO Productos (id, nombre, precio, precio_costo, stock, imagen) VALUES ($1, $2, $3, $4, $5, $6)',
      [product.id, product.nombre, product.precio, product.precio_costo || 0, product.stock, product.imagen || null]
    );

    if (product.variantes && product.variantes.length > 0) {
      for (const v of product.variantes) {
        await client.query(
          'INSERT INTO Producto_Variantes (id, producto_id, color, stock) VALUES ($1, $2, $3, $4)',
          [
            v.id || `V-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            product.id,
            v.color,
            v.stock,
          ]
        );
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

ipcMain.handle('update-product', async (_, product) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'UPDATE Productos SET nombre = $1, precio = $2, precio_costo = $3, stock = $4, imagen = $5 WHERE id = $6',
      [product.nombre, product.precio, product.precio_costo || 0, product.stock, product.imagen || null, product.id]
    );

    await client.query('DELETE FROM Producto_Variantes WHERE producto_id = $1', [product.id]);

    if (product.variantes && product.variantes.length > 0) {
      for (const v of product.variantes) {
        await client.query(
          'INSERT INTO Producto_Variantes (id, producto_id, color, stock) VALUES ($1, $2, $3, $4)',
          [
            v.id || `V-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            product.id,
            v.color,
            v.stock,
          ]
        );
      }
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
});

ipcMain.handle('delete-product', async (_, id) => {
  await pool.query('UPDATE Productos SET estado_activo = 0 WHERE id = $1', [id]);
});

// ─────────────────────────────────────────────
// IPC: Ventas
// ─────────────────────────────────────────────

ipcMain.handle('get-today-sales', async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { rows } = await pool.query(
    'SELECT * FROM Ventas WHERE fecha_hora >= $1',
    [today.toISOString()]
  );
  return rows.map(normalizeVenta);
});

ipcMain.handle('get-dashboard-data', async (_, period) => {
  const now = new Date();
  let startDate = new Date();

  if (period === 'diaria') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'semanal') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === 'mensual') {
    startDate.setMonth(now.getMonth() - 1);
  }

  const { rows: ventas } = await pool.query(
    'SELECT fecha_hora, total FROM Ventas WHERE fecha_hora >= $1 ORDER BY fecha_hora ASC',
    [startDate.toISOString()]
  );

  const totalIngresos = ventas.reduce((acc: number, v: any) => acc + Number(v.total), 0);
  const cantidadVentas = ventas.length;

  const chartDataMap = new Map<string, number>();
  const daysMap = new Map<string, number>();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  for (const v of ventas) {
    const dateObj = new Date(v.fecha_hora);
    const day = dateObj.toISOString().split('T')[0];
    chartDataMap.set(day, (chartDataMap.get(day) || 0) + Number(v.total));

    const dayName = dayNames[dateObj.getDay()];
    daysMap.set(dayName, (daysMap.get(dayName) || 0) + 1);
  }

  const chartData = Array.from(chartDataMap.entries()).map(([date, total]) => ({ date, total }));
  const bestSellingDays = Array.from(daysMap.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => b.count - a.count);

  return { totalIngresos, cantidadVentas, chartData, bestSellingDays };
});

ipcMain.handle('insert-venta', async (_, { venta, detalles }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      'INSERT INTO Ventas (id, fecha_hora, total, monto_recibido, vuelto) VALUES ($1, $2, $3, $4, $5)',
      [venta.id, venta.fecha_hora, venta.total, venta.monto_recibido, venta.vuelto]
    );

    for (const detalle of detalles) {
      await client.query(
        'INSERT INTO Detalle_Ventas (id, venta_id, producto_id, cantidad, precio_unitario, variante_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [detalle.id, detalle.venta_id, detalle.producto_id, detalle.cantidad, detalle.precio_unitario, detalle.variante_id || null]
      );
      await client.query(
        'UPDATE Productos SET stock = stock - $1 WHERE id = $2',
        [detalle.cantidad, detalle.producto_id]
      );
      if (detalle.variante_id) {
        await client.query(
          'UPDATE Producto_Variantes SET stock = stock - $1 WHERE id = $2',
          [detalle.cantidad, detalle.variante_id]
        );
      }
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────
// IPC: Exportaciones
// ─────────────────────────────────────────────

ipcMain.handle('export-database', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar volcado de GBROS (SQL)',
    defaultPath: `gbros_backup_${new Date().toISOString().split('T')[0]}.sql`,
    filters: [{ name: 'SQL Dump', extensions: ['sql'] }],
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Exportación cancelada' };
  }

  try {
    // Exportar todas las tablas a SQL INSERT statements
    const tables = ['Productos', 'Producto_Variantes', 'Ventas', 'Detalle_Ventas', 'Flujo_Caja'];
    let sqlDump = `-- GBROS POS - Backup generado: ${new Date().toISOString()}\n\n`;

    for (const table of tables) {
      const { rows } = await pool.query(`SELECT * FROM ${table}`);
      if (rows.length === 0) continue;

      sqlDump += `-- Tabla: ${table}\n`;
      for (const row of rows) {
        const cols = Object.keys(row).join(', ');
        const vals = Object.values(row)
          .map((v) => (v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`))
          .join(', ');
        sqlDump += `INSERT INTO ${table} (${cols}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sqlDump += '\n';
    }

    fs.writeFileSync(filePath, sqlDump, 'utf-8');
    return { success: true, message: 'Backup SQL exportado con éxito' };
  } catch (error: any) {
    console.error('Error al exportar:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('export-sales-excel', async (_, { startDate, endDate }) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exportar Ventas a Excel',
    defaultPath: `Ventas_${startDate}_al_${endDate}.xlsx`,
    filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
  });

  if (canceled || !filePath) return { success: false, message: 'Exportación cancelada' };

  try {
    const startLocal = new Date(`${startDate}T00:00:00`);
    const endLocal   = new Date(`${endDate}T23:59:59.999`);

    const { rows } = await pool.query(
      `SELECT v.fecha_hora, v.id as venta_id, p.nombre as producto, pv.color, dv.cantidad, dv.precio_unitario,
              (dv.cantidad * dv.precio_unitario) as subtotal
       FROM Ventas v
       JOIN Detalle_Ventas dv ON v.id = dv.venta_id
       JOIN Productos p ON dv.producto_id = p.id
       LEFT JOIN Producto_Variantes pv ON dv.variante_id = pv.id
       WHERE v.fecha_hora >= $1 AND v.fecha_hora <= $2
       ORDER BY v.fecha_hora DESC`,
      [startLocal.toISOString(), endLocal.toISOString()]
    );

    const worksheet = xlsx.utils.json_to_sheet(
      rows.map((r: any) => ({
        Fecha: new Date(r.fecha_hora).toLocaleString(),
        'Venta ID': r.venta_id,
        Producto: r.producto,
        'Color/Variante': r.color || '-',
        Cantidad: r.cantidad,
        'Precio Unitario': Number(r.precio_unitario),
        Subtotal: Number(r.subtotal),
      }))
    );

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
    filters: [{ name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'webp'] }],
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

// ─────────────────────────────────────────────
// Ventana principal
// ─────────────────────────────────────────────

process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(process.env.VITE_PUBLIC!, 'vite.svg'),
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

app.whenReady().then(async () => {
  try {
    await initializeDatabase();
  } catch (err) {
    console.error('[DB] Error al conectar con PostgreSQL:', err);

    let msg = `No se pudo conectar a PostgreSQL.\n\n`;
    if (wasCreated) {
      msg += `Se creó un archivo de configuración con valores por defecto.\nEditalo con los datos de tu servidor PostgreSQL:\n\n`;
    } else {
      msg += `Verificá que el servidor esté corriendo y que la configuración sea correcta:\n\n`;
    }
    msg += `📄 ${configPath}\n\nDetalle: ${(err as Error).message}`;

    dialog.showErrorBox('Error de Base de Datos', msg);
    app.quit();
    return;
  }
  createWindow();
});
