import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { app } from 'electron';

// Usamos userData para que la bd se guarde en un lugar seguro (AppData)
// o en el mismo directorio si es portable. Por ahora, AppData es lo estándar.
const dbPath = path.join(app.getPath('userData'), 'gbros_database.sqlite');

const db = new DatabaseSync(dbPath);

// Inicializar tablas
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS Productos (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    estado_activo INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS Producto_Variantes (
    id TEXT PRIMARY KEY,
    producto_id TEXT NOT NULL,
    color TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(producto_id) REFERENCES Productos(id)
  );

  CREATE TABLE IF NOT EXISTS Ventas (
    id TEXT PRIMARY KEY,
    fecha_hora TEXT NOT NULL,
    total REAL NOT NULL,
    monto_recibido REAL NOT NULL,
    vuelto REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS Detalle_Ventas (
    id TEXT PRIMARY KEY,
    venta_id TEXT NOT NULL,
    producto_id TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario REAL NOT NULL,
    FOREIGN KEY(venta_id) REFERENCES Ventas(id),
    FOREIGN KEY(producto_id) REFERENCES Productos(id)
  );

  CREATE TABLE IF NOT EXISTS Flujo_Caja (
    id TEXT PRIMARY KEY,
    fecha_apertura TEXT NOT NULL,
    fecha_cierre TEXT,
    efectivo_esperado REAL NOT NULL DEFAULT 0
  );
`);

// Migraciones simples
try {
  db.exec('ALTER TABLE Productos ADD COLUMN imagen TEXT;');
} catch (e) {
  // Ignorar si la columna ya existe
}

try {
  db.exec('ALTER TABLE Detalle_Ventas ADD COLUMN variante_id TEXT;');
} catch (e) {
  // Ignorar si la columna ya existe
}

export default db;
