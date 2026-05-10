import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ShoppingCart, Calendar, Download, Award, X } from 'lucide-react';

type Period = 'diaria' | 'semanal' | 'mensual';

interface DashboardData {
  totalIngresos: number;
  cantidadVentas: number;
  chartData: { date: string; total: number }[];
  bestSellingDays?: { day: string; count: number }[];
}

const periodLabels: { key: Period; label: string }[] = [
  { key: 'diaria', label: 'Hoy' },
  { key: 'semanal', label: '7 Días' },
  { key: 'mensual', label: '30 Días' },
];

const Dashboard: React.FC = () => {
  const [period, setPeriod] = useState<Period>('semanal');
  const [data, setData] = useState<DashboardData>({
    totalIngresos: 0,
    cantidadVentas: 0,
    chartData: [],
    bestSellingDays: []
  });
  
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const handleExportExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    await window.db.exportSalesExcel({ startDate, endDate });
    setExportModalOpen(false);
  };

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    const dashData = await window.db.getDashboardData(period);
    setData(dashData);
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
          Dashboard de Ventas
        </h1>
        
        <div className="flex gap-3">
          <div
            className="flex rounded-lg p-1 gap-0.5"
            style={{
              background: 'hsl(var(--gb-surface-100))',
              border: '1px solid hsl(var(--gb-surface-200))',
            }}
          >
            {periodLabels.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all"
                style={{
                  background: period === key ? 'hsl(var(--gb-primary-600))' : 'transparent',
                  color: period === key ? 'white' : 'hsl(var(--gb-surface-500))',
                  boxShadow: period === key ? '0 2px 6px hsla(var(--gb-primary-600) / 0.3)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setExportModalOpen(true)} className="gb-btn-success text-sm flex items-center gap-1.5 px-4 h-full">
            <Download size={18} />
            Exportar Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Ingresos */}
        <div className="gb-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'hsla(var(--gb-primary-500) / 0.12)', color: 'hsl(var(--gb-primary-600))' }}
            >
              <TrendingUp size={24} />
            </div>
            <h3 className="text-base font-medium" style={{ color: 'hsl(var(--gb-surface-400))' }}>
              Total Ingresos
            </h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
            ${data.totalIngresos.toFixed(2)}
          </div>
        </div>

        {/* Cantidad de Ventas */}
        <div className="gb-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'hsla(var(--gb-info) / 0.12)', color: 'hsl(var(--gb-info))' }}
            >
              <ShoppingCart size={24} />
            </div>
            <h3 className="text-base font-medium" style={{ color: 'hsl(var(--gb-surface-400))' }}>
              Ventas Realizadas
            </h3>
          </div>
          <div className="text-3xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
            {data.cantidadVentas}
          </div>
        </div>

        {/* Mejores Días */}
        <div className="gb-card p-6">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="p-3 rounded-lg"
              style={{ background: 'hsla(var(--gb-warning) / 0.12)', color: 'hsl(var(--gb-warning))' }}
            >
              <Award size={24} />
            </div>
            <h3 className="text-base font-medium" style={{ color: 'hsl(var(--gb-surface-400))' }}>
              Mejores Días ({periodLabels.find(l => l.key === period)?.label})
            </h3>
          </div>
          <div className="space-y-2.5 mt-2">
            {data.bestSellingDays && data.bestSellingDays.length > 0 ? (
              data.bestSellingDays.slice(0, 3).map((d, i) => (
                <div key={d.day} className="flex justify-between items-center text-sm pb-2 border-b last:border-0" style={{ borderColor: 'hsl(var(--gb-surface-100))' }}>
                  <span className="font-medium flex items-center gap-2" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold" style={{ background: i === 0 ? 'hsla(var(--gb-warning) / 0.2)' : 'hsl(var(--gb-surface-100))', color: i === 0 ? 'hsl(var(--gb-warning))' : 'hsl(var(--gb-surface-500))' }}>
                      {i + 1}
                    </span>
                    {d.day}
                  </span>
                  <span className="font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>{d.count} ventas</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-400 text-center py-2">No hay suficientes datos.</div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="gb-card p-6 flex-1 min-h-[300px]">
        <h3
          className="text-base font-medium mb-6 flex items-center gap-2"
          style={{ color: 'hsl(var(--gb-surface-600))' }}
        >
          <Calendar size={18} /> Evolución de Ingresos
        </h3>
        
        {data.chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: 20, bottom: 10 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(255 52% 44%)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="hsl(255 52% 44%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(240 5% 85%)" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: 'hsl(240 4% 46%)', fontSize: 13 }} 
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                tick={{ fill: 'hsl(240 4% 46%)', fontSize: 13 }}
                axisLine={false}
                tickLine={false}
                width={80}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
                  return `$${value}`;
                }}
              />
              <Tooltip 
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid hsl(240 5% 85%)',
                  boxShadow: '0 4px 12px hsla(240 10% 6% / 0.1)',
                  background: 'white',
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Ingresos']}
                labelStyle={{ color: 'hsl(240 4% 28%)', fontWeight: 'bold', marginBottom: '4px' }}
              />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="hsl(255 52% 44%)" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorTotal)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="h-full flex items-center justify-center text-sm"
            style={{ color: 'hsl(var(--gb-surface-400))' }}
          >
            No hay datos suficientes para mostrar el gráfico.
          </div>
        )}
      </div>

      {/* Export Modal */}
      {exportModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'hsla(var(--gb-surface-800) / 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="gb-card-elevated w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                Exportar Ventas a Excel
              </h2>
              <button
                onClick={() => setExportModalOpen(false)}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleExportExcel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Fecha Desde
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="gb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Fecha Hasta
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="gb-input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="gb-btn-ghost flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="gb-btn-success flex-1 flex items-center justify-center gap-2">
                  <Download size={18} /> Exportar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
