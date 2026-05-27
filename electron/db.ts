import { Pool } from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

// ─────────────────────────────────────────────
// Configuración de base de datos
// ─────────────────────────────────────────────

interface DbConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

const CONFIG_FILENAME = 'database.ini';

const DEFAULT_CONFIG: DbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'gbros_pos',
  user: 'postgres',
  password: 'admin',
};

/**
 * Lee un archivo .ini / .env simple (KEY=VALUE por línea).
 */
function parseConfigFile(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    const value = trimmed.substring(eqIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

/**
 * Genera el contenido del archivo database.ini con los valores por defecto.
 */
function generateConfigContent(config: DbConfig): string {
  return [
    '; Configuración de conexión a PostgreSQL para GBROS POS',
    '; Editá este archivo con los datos de tu servidor PostgreSQL.',
    '',
    `PGHOST=${config.host}`,
    `PGPORT=${config.port}`,
    `PGDATABASE=${config.database}`,
    `PGUSER=${config.user}`,
    `PGPASSWORD=${config.password}`,
    '',
  ].join('\r\n');
}

/**
 * Busca la configuración en múltiples ubicaciones.
 * Si no existe en ninguna, crea un archivo por defecto en AppData.
 * Retorna la ruta donde se encontró/creó el archivo.
 */
function loadConfig(): { config: DbConfig; configPath: string; wasCreated: boolean } {
  const userDataDir = app.getPath('userData');
  const portableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const exeDir = path.dirname(process.execPath);

  // Nombres de archivos que buscamos (en orden de prioridad)
  const fileNames = [CONFIG_FILENAME, '.env'];

  // Ubicaciones donde buscar (en orden de prioridad)
  const dirs = [
    ...(portableDir ? [portableDir] : []),          // junto al .exe portable
    exeDir,                                          // junto al .exe real
    path.join(exeDir, 'resources'),                  // en resources/
    ...(process.resourcesPath ? [process.resourcesPath] : []),
    app.getAppPath(),                                // raíz del proyecto (dev)
    path.resolve(__dirname, '..'),                   // un nivel arriba de dist-electron
    process.cwd(),                                   // cwd
    userDataDir,                                     // AppData (fallback seguro)
  ];

  // Buscar en todas las ubicaciones
  for (const dir of dirs) {
    for (const fileName of fileNames) {
      const filePath = path.join(dir, fileName);
      if (fs.existsSync(filePath)) {
        console.log(`[DB] Config encontrada en: ${filePath}`);
        const parsed = parseConfigFile(filePath);
        return {
          config: {
            host:     parsed.PGHOST     || DEFAULT_CONFIG.host,
            port:     Number(parsed.PGPORT) || DEFAULT_CONFIG.port,
            database: parsed.PGDATABASE || DEFAULT_CONFIG.database,
            user:     parsed.PGUSER     || DEFAULT_CONFIG.user,
            password: parsed.PGPASSWORD ?? DEFAULT_CONFIG.password,
          },
          configPath: filePath,
          wasCreated: false,
        };
      }
    }
  }

  // No se encontró en ningún lado → crear en AppData
  const newPath = path.join(userDataDir, CONFIG_FILENAME);
  console.log(`[DB] No se encontró config. Creando en: ${newPath}`);
  fs.mkdirSync(userDataDir, { recursive: true });
  fs.writeFileSync(newPath, generateConfigContent(DEFAULT_CONFIG), 'utf-8');

  return {
    config: { ...DEFAULT_CONFIG },
    configPath: newPath,
    wasCreated: true,
  };
}

// ─────────────────────────────────────────────
// Cargar configuración y crear Pool
// ─────────────────────────────────────────────

const { config: dbConfig, configPath, wasCreated } = loadConfig();

export { configPath, wasCreated };

export const pool = new Pool({
  host:     dbConfig.host,
  port:     dbConfig.port,
  database: dbConfig.database,
  user:     dbConfig.user,
  password: dbConfig.password,
  connectionTimeoutMillis: 5000,
});

/**
 * Ejecuta las sentencias DDL para crear todas las tablas si no existen.
 * Se llama una vez al arrancar la app.
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS Productos (
        id TEXT PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio NUMERIC(12,2) NOT NULL,
        precio_costo NUMERIC(12,2) NOT NULL DEFAULT 0,
        stock INTEGER NOT NULL DEFAULT 0,
        estado_activo INTEGER NOT NULL DEFAULT 1,
        imagen TEXT
      );
      
      ALTER TABLE Productos ADD COLUMN IF NOT EXISTS precio_costo NUMERIC(12,2) NOT NULL DEFAULT 0;

      CREATE TABLE IF NOT EXISTS Producto_Variantes (
        id TEXT PRIMARY KEY,
        producto_id TEXT NOT NULL REFERENCES Productos(id),
        color TEXT NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS Ventas (
        id TEXT PRIMARY KEY,
        fecha_hora TIMESTAMPTZ NOT NULL,
        total NUMERIC(12,2) NOT NULL,
        monto_recibido NUMERIC(12,2) NOT NULL,
        vuelto NUMERIC(12,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Detalle_Ventas (
        id TEXT PRIMARY KEY,
        venta_id TEXT NOT NULL REFERENCES Ventas(id),
        producto_id TEXT NOT NULL REFERENCES Productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario NUMERIC(12,2) NOT NULL,
        variante_id TEXT
      );

      CREATE TABLE IF NOT EXISTS Flujo_Caja (
        id TEXT PRIMARY KEY,
        fecha_apertura TIMESTAMPTZ NOT NULL,
        fecha_cierre TIMESTAMPTZ,
        efectivo_esperado NUMERIC(12,2) NOT NULL DEFAULT 0
      );
    `);

    console.log('[DB] Tablas inicializadas correctamente en PostgreSQL.');
  } finally {
    client.release();
  }
}

export default pool;
