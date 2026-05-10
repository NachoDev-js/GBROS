import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ShoppingCart, Package, DollarSign, BarChart3, Database } from 'lucide-react';

const navItems = [
  { to: '/', icon: ShoppingCart, label: 'Punto de Venta' },
  { to: '/inventory', icon: Package, label: 'Inventario' },
  { to: '/cash-register', icon: DollarSign, label: 'Caja' },
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
] as const;

const Layout: React.FC = () => {
  return (
    <div className="flex h-screen" style={{ background: 'hsl(var(--gb-surface-50))' }}>
      {/* Sidebar */}
      <aside
        className="w-64 flex flex-col"
        style={{ background: 'hsl(var(--gb-surface-800))' }}
      >
        <div
          className="px-6 py-5 text-xl font-bold tracking-tight"
          style={{
            color: 'white',
            borderBottom: '1px solid hsla(0 0% 100% / 0.06)',
            letterSpacing: '-0.02em',
          }}
        >
          GBROS<span style={{ color: 'hsl(var(--gb-primary-400))' }}> POS</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                isActive ? 'gb-nav-item gb-nav-item-active' : 'gb-nav-item'
              }
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid hsla(0 0% 100% / 0.06)' }}>
          <button
            onClick={async () => {
              const result = await window.db.exportDatabase();
              if (result.success) {
                alert('¡Copia de seguridad guardada con éxito!');
              } else if (result.message !== 'Exportación cancelada') {
                alert(`Error: ${result.message}`);
              }
            }}
            className="gb-nav-item w-full justify-center"
            style={{ color: 'hsl(var(--gb-surface-400))' }}
          >
            <Database size={18} />
            <span>Exportar BD</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto" style={{ background: 'hsl(var(--gb-surface-50))' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
