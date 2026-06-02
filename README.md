# GBROS POS - Sistema de Punto de Venta y Gestión de Inventario

GBROS POS es una aplicación de escritorio diseñada para gestionar puntos de venta (POS) e inventarios, construida con tecnologías web modernas y empaquetada para escritorio mediante Electron. Utiliza PostgreSQL como motor de base de datos para garantizar persistencia robusta, alta concurrencia y seguridad de la información.
<img width="1181" height="789" alt="image" src="https://github.com/user-attachments/assets/1c52dd0d-f8d8-4706-9707-be781a0d4141" />
<img width="1178" height="784" alt="image" src="https://github.com/user-attachments/assets/eaf78211-1732-4668-9788-8535ec25abd1" />
<img width="1181" height="786" alt="image" src="https://github.com/user-attachments/assets/77f1fe6d-bbac-4f12-a1c2-8689d3a18708" />
<img width="1180" height="789" alt="image" src="https://github.com/user-attachments/assets/3cad9f63-4b69-4170-bce8-bff35c53130b" />
<img width="1177" height="784" alt="image" src="https://github.com/user-attachments/assets/6d0c2778-e0fc-4d3a-9711-f1d3d0fdfd35" />
<img width="1181" height="786" alt="image" src="https://github.com/user-attachments/assets/90c145f4-9ee4-43e1-a909-618fa12bbcb9" />

## 🚀 Características Principales

* **Punto de Venta (POS):**
  * Interfaz de cobro rápida e intuitiva.
  * Búsqueda inteligente de productos por código de barras o palabras clave.
  * Soporte para variantes de productos (ej. colores) y control de stock en tiempo real.
  * Cálculo automático de cambio (vuelto).
* **Gestión de Inventario:**
  * Creación, edición y eliminación de productos.
  * Control de precios de costo, precios de venta y rentabilidad.
  * Carga de imágenes de productos locales.
  * Gestión de stock por producto o por variantes individuales.
  * Generación de códigos/SKUs automáticos.
* **Analíticas y Dashboard:**
  * Visualización de ventas en tiempo real.
  * Gráficos estadísticos (diarios, semanales, mensuales).
  * Reportes de días con mayores ventas e ingresos totales.
* **Exportación y Respaldo:**
  * Exportación de reportes de ventas a archivos Excel (`.xlsx`).
  * Generación de copias de seguridad de la base de datos (SQL Dumps).
* **Sincronización y Configuración:**
  * Base de datos PostgreSQL escalable para entornos de red y múltiples terminales.
  * Configuración simple a través de un archivo `database.ini`.

## 🛠️ Stack Tecnológico

**Frontend:**
* [React 19](https://react.dev/)
* [TypeScript](https://www.typescriptlang.org/)
* [Vite](https://vitejs.dev/)
* [Tailwind CSS v4](https://tailwindcss.com/)
* [Zustand](https://zustand-demo.pmnd.rs/) (Gestor del estado global y carrito)
* [React Router](https://reactrouter.com/) (Navegación)
* [Recharts](https://recharts.org/) (Gráficos y analíticas)
* [Lucide React](https://lucide.dev/) (Iconografía)

**Backend (Electron Node.js):**
* [Electron](https://www.electronjs.org/) (Contenedor de escritorio)
* [PostgreSQL (pg)](https://node-postgres.com/) (Controlador de base de datos nativo)
* [XLSX (SheetJS)](https://sheetjs.com/) (Generación de hojas de cálculo)

## 📋 Prerrequisitos

Para ejecutar y desarrollar el proyecto de forma local, necesitas:
* **Node.js** (v18 o superior)
* **PostgreSQL** (v12 o superior). Debe estar instalado y ejecutándose en el entorno (o en la red).

## ⚙️ Instalación y Configuración

1. **Clonar el repositorio y entrar al directorio:**
   ```bash
   git clone <repositorio>
   cd gbros-pos
   ```

2. **Instalar las dependencias:**
   ```bash
   npm install
   ```

3. **Configuración de Base de Datos:**
   Al ejecutar la aplicación por primera vez, se intentará conectar a una base de datos PostgreSQL local (`localhost:5432` con usuario `postgres` y clave `admin`).
   Si la conexión falla, la aplicación creará un archivo `database.ini` en la carpeta de datos de la aplicación (ej. `AppData/Roaming/gbros-pos`).
   Debes editar ese archivo o crear un archivo `.env` o `database.ini` en la raíz del proyecto con el siguiente contenido:

   ```ini
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=gbros_pos
   PGUSER=postgres
   PGPASSWORD=tu_contraseña
   ```
   *Nota: Asegúrate de crear manualmente la base de datos `gbros_pos` en tu servidor PostgreSQL usando PgAdmin o psql (`CREATE DATABASE gbros_pos;`). Las tablas se crearán automáticamente al iniciar la app.*

## 💻 Desarrollo

Para iniciar el servidor de desarrollo (Vite) junto con Electron:

```bash
npm run dev
```

Esto iniciará el frontend con Hot Module Replacement (HMR) y levantará la ventana de Electron conectada al servidor de Vite.

## 📦 Construcción y Empaquetado

Para construir la aplicación para producción y generar el ejecutable (versión Portable para Windows):

```bash
npm run package
```

Esto ejecutará `vite build` y luego utilizará `electron-builder` para crear un ejecutable standalone en la carpeta `/release`.

## 📁 Estructura del Proyecto

```text
├── electron/
│   ├── main.ts         # Proceso principal de Electron, manejadores IPC (APIs)
│   ├── db.ts           # Configuración de Pool Postgres y migración de tablas (DDL)
│   └── preload.ts      # Puente seguro (ContextBridge) entre Node.js y React
├── src/
│   ├── components/     # Componentes de UI reutilizables (Sidebar, Modals)
│   ├── lib/            # Lógica de negocio pura (validaciones, cálculos)
│   ├── pages/          # Pantallas principales (POS, Inventory, Dashboard, Settings)
│   ├── store/          # Estado global de Zustand (cartStore.ts)
│   ├── types/          # Definiciones de interfaces TypeScript globales
│   ├── App.tsx         # Layout principal y sistema de rutas
│   ├── main.tsx        # Punto de entrada de React
│   └── index.css       # Estilos globales y tokens CSS
├── public/             # Assets estáticos (iconos, imágenes)
├── package.json        # Dependencias y scripts
└── vite.config.ts      # Configuración del bundler Vite y plugins de Electron
```

## 🔐 Seguridad y Arquitectura

* **Aislamiento de Contexto (Context Isolation):** Habilitado por defecto. El código del frontend (React) no tiene acceso directo a las APIs de Node.js ni al módulo `fs`. Todo pasa a través del puente de IPC definido en `preload.ts` (`window.db`).
* **Validación en Cliente y Servidor:** El módulo `/src/lib/validation.ts` provee funciones puras y agnósticas de framework para validar que los datos cumplan las reglas de negocio antes de tocar la base de datos.
* **Sentencias SQL Parametrizadas:** Todas las consultas a PostgreSQL en `main.ts` se realizan utilizando parámetros indexados (ej. `$1, $2`) para prevenir de manera efectiva ataques de inyección SQL.

---
*Desarrollado para GBROS*
