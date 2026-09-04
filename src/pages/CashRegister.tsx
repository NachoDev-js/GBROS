import React, { useEffect, useState } from 'react';
import type { Venta } from '../types/global';
import { salesRepo } from '../repositories';
import { DollarSign, ShoppingBag, Trash2 } from 'lucide-react';

const CashRegister: React.FC = () => {
  const [sales, setSales] = useState<Venta[]>([]);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const todaySales = await salesRepo.getTodaySales();
    setSales(todaySales);
  };

  const handleDeleteSale = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta venta? Esta acción no se puede deshacer y restaurará el stock.')) {
      try {
        const result = await salesRepo.deleteVenta(id);
        if (result.success) {
          loadSales();
        } else {
          alert(`Error al eliminar la venta: ${result.message}`);
        }
      } catch (error) {
        console.error(error);
        alert('Ocurrió un error al intentar eliminar la venta.');
      }
    }
  };

  const totalVentas = sales.reduce((acc, sale) => acc + sale.total, 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8" style={{ color: 'hsl(var(--gb-surface-700))' }}>
        Control de Caja Diario
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Total Ventas Hoy */}
        <div className="gb-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'hsla(var(--gb-success) / 0.12)', color: 'hsl(var(--gb-success))' }}
            >
              <ShoppingBag size={24} />
            </div>
            <h3 className="text-base font-medium" style={{ color: 'hsl(var(--gb-surface-400))' }}>
              Ventas del Día
            </h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
            ${totalVentas.toFixed(2)}
          </div>
          <div className="text-sm mt-2" style={{ color: 'hsl(var(--gb-surface-400))' }}>
            {sales.length} transacciones
          </div>
        </div>

        {/* Efectivo Esperado */}
        <div
          className="p-6 rounded-xl"
          style={{
            background: 'hsl(var(--gb-primary-600))',
            boxShadow: '0 4px 16px hsla(var(--gb-primary-600) / 0.35)',
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'hsla(0 0% 100% / 0.15)' }}
            >
              <DollarSign size={24} className="text-white" />
            </div>
            <h3 className="text-base font-medium" style={{ color: 'hsla(0 0% 100% / 0.7)' }}>
              Efectivo Total Esperado
            </h3>
          </div>
          <div className="text-3xl font-bold text-white">
            ${totalVentas.toFixed(2)}
          </div>
          <div className="text-sm mt-2" style={{ color: 'hsla(0 0% 100% / 0.6)' }}>
            En caja al momento del cierre
          </div>
        </div>
      </div>

      <div className="gb-card overflow-hidden">
        <div
          className="px-6 py-4"
          style={{
            background: 'hsl(var(--gb-surface-50))',
            borderBottom: '1px solid hsl(var(--gb-surface-200))',
          }}
        >
          <h2 className="text-base font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
            Detalle de Transacciones (Hoy)
          </h2>
        </div>
        <table className="min-w-full">
          <thead>
            <tr style={{ borderBottom: '1px solid hsl(var(--gb-surface-200))' }}>
              <th
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                Hora
              </th>
              <th
                className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                ID Venta
              </th>
              <th
                className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                Monto Total
              </th>
              <th
                className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {sales.length > 0 ? sales.map(sale => (
              <tr
                key={sale.id}
                className="transition-colors"
                style={{ borderBottom: '1px solid hsl(var(--gb-surface-100))' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--gb-surface-50))'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                  {new Date(sale.fecha_hora).toLocaleTimeString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono" style={{ color: 'hsl(var(--gb-surface-400))' }}>
                  {sale.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-right" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                  ${sale.total.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleDeleteSale(sale.id)}
                    className="p-1.5 rounded transition-colors"
                    style={{ color: 'hsl(var(--gb-danger))' }}
                    title="Eliminar Venta"
                    onMouseEnter={e => { e.currentTarget.style.background = 'hsla(var(--gb-danger) / 0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-12 text-center text-sm"
                  style={{ color: 'hsl(var(--gb-surface-400))' }}
                >
                  No hay ventas registradas en el día de hoy.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CashRegister;
