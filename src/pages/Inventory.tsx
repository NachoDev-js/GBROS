import React, { useEffect, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { Product } from '../types/global';
import { validateProductForm } from '../lib/validation';
import type { ValidationError } from '../lib/validation';
import { Plus, Edit, Trash2, X, Image as ImageIcon } from 'lucide-react';

const columnHelper = createColumnHelper<Product>();

const Inventory: React.FC = () => {
  const [data, setData] = useState<Product[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<ValidationError[]>([]);

  // Form State
  const [id, setId] = useState('');
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [stock, setStock] = useState('');
  const [imagen, setImagen] = useState<string | null>(null);
  const [hasVariants, setHasVariants] = useState(false);
  const [variantes, setVariantes] = useState<{ id?: string, color: string, stock: number | string }[]>([]);

  const addVariant = () => setVariantes([...variantes, { color: '', stock: 0 }]);
  const removeVariant = (index: number) => setVariantes(variantes.filter((_, i) => i !== index));
  const updateVariant = (index: number, field: string, value: string | number) => {
    const newV = [...variantes];
    newV[index] = { ...newV[index], [field]: value };
    setVariantes(newV);
  };

  const handleImageUpload = async () => {
    const base64 = await window.db.saveProductImage();
    if (base64) setImagen(base64);
  };

  const loadData = async () => {
    const products = await window.db.getProducts();
    setData(products);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getFieldError = (field: string): string | undefined =>
    formErrors.find(e => e.field === field)?.message;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalId = id.trim();
    if (!finalId) {
      let rnd;
      let maxDigits = 2;
      let limit = 99;
      let attempts = 0;
      do {
        attempts++;
        if (attempts > limit * 2) {
          maxDigits++;
          limit = Math.pow(10, maxDigits) - 1;
          attempts = 0;
        }
        rnd = Math.floor(Math.random() * limit) + 1;
        finalId = String(rnd).padStart(maxDigits, '0');
      } while (data.find(p => p.id === finalId));
    }

    const errors = validateProductForm({ id: finalId, nombre, precio, stock: hasVariants ? '1' : stock });
    setFormErrors(errors);
    if (errors.length > 0) return;

    let finalStock = parseInt(stock, 10) || 0;
    if (hasVariants) {
      finalStock = variantes.reduce((acc, v) => acc + (parseInt(v.stock as string, 10) || 0), 0);
    }

    const product: Product = {
      id: finalId,
      nombre,
      precio: parseFloat(precio),
      stock: finalStock,
      imagen: imagen || undefined,
      variantes: hasVariants ? variantes.map(v => ({ ...v, stock: parseInt(v.stock as string, 10) || 0 })) as any : []
    };

    if (editingProduct) {
      await window.db.updateProduct(product);
    } else {
      await window.db.addProduct(product);
    }

    setIsModalOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setId(product.id);
    setNombre(product.nombre);
    setPrecio(product.precio.toString());
    setStock(product.stock.toString());
    setImagen(product.imagen || null);
    
    if (product.variantes && product.variantes.length > 0) {
      setHasVariants(true);
      setVariantes(product.variantes);
    } else {
      setHasVariants(false);
      setVariantes([]);
    }
    
    setFormErrors([]);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      await window.db.deleteProduct(productId);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setId('');
    setNombre('');
    setPrecio('');
    setStock('');
    setImagen(null);
    setHasVariants(false);
    setVariantes([]);
    setFormErrors([]);
  };

  const columns = [
    columnHelper.accessor('imagen', {
      header: 'Foto',
      cell: info => {
        const val = info.getValue();
        return val ? (
          <img src={val} alt="Producto" className="w-10 h-10 object-cover rounded" />
        ) : (
          <div className="w-10 h-10 rounded flex items-center justify-center text-xs" style={{ background: 'hsl(var(--gb-surface-100))', color: 'hsl(var(--gb-surface-400))' }}>
            <ImageIcon size={16} />
          </div>
        );
      }
    }),
    columnHelper.accessor('id', {
      header: 'Código / SKU',
      cell: info => (
        <span className="font-mono text-sm" style={{ color: 'hsl(var(--gb-surface-500))' }}>
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('nombre', {
      header: 'Nombre',
      cell: info => <span className="font-medium" style={{ color: 'hsl(var(--gb-surface-700))' }}>{info.getValue()}</span>,
    }),
    columnHelper.accessor('precio', {
      header: 'Precio',
      cell: info => (
        <span className="font-semibold" style={{ color: 'hsl(var(--gb-primary-600))' }}>
          ${info.getValue().toFixed(2)}
        </span>
      ),
    }),
    columnHelper.accessor('stock', {
      header: 'Stock',
      cell: info => {
        const val = info.getValue();
        return (
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: val > 5
                ? 'hsla(var(--gb-success) / 0.12)'
                : val > 0
                ? 'hsla(var(--gb-warning) / 0.12)'
                : 'hsla(var(--gb-danger) / 0.12)',
              color: val > 5
                ? 'hsl(var(--gb-success))'
                : val > 0
                ? 'hsl(var(--gb-warning))'
                : 'hsl(var(--gb-danger))',
            }}
          >
            {val} unid.
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Acciones',
      cell: props => (
        <div className="flex gap-1">
          <button
            onClick={() => handleEdit(props.row.original)}
            className="p-2 rounded-md transition-colors"
            style={{ color: 'hsl(var(--gb-primary-500))' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'hsla(var(--gb-primary-500) / 0.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
            }}
            title="Editar"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => handleDelete(props.row.original.id)}
            className="gb-btn-danger"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
          Inventario
        </h1>
        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="gb-btn-primary"
        >
          <Plus size={20} />
          <span>Nuevo Producto</span>
        </button>
      </div>

      <div className="gb-card overflow-hidden">
        <table className="min-w-full divide-y" style={{ borderColor: 'hsl(var(--gb-surface-200))' }}>
          <thead style={{ background: 'hsl(var(--gb-surface-50))' }}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'hsl(var(--gb-surface-400))' }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'hsl(var(--gb-surface-100))' }}>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className="transition-colors"
                  style={{ background: 'hsl(var(--gb-surface-0))' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'hsl(var(--gb-surface-50))';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'hsl(var(--gb-surface-0))';
                  }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 whitespace-nowrap text-sm"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm"
                  style={{ color: 'hsl(var(--gb-surface-400))' }}
                >
                  No hay productos en el inventario.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'hsla(var(--gb-surface-800) / 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="gb-card-elevated w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'hsl(var(--gb-surface-700))'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'hsl(var(--gb-surface-400))'; }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Código / SKU <span className="text-xs font-normal" style={{ color: 'hsl(var(--gb-surface-400))' }}>(Dejar en blanco para auto-generar)</span>
                </label>
                <input
                  type="text"
                  disabled={!!editingProduct}
                  value={id}
                  onChange={e => setId(e.target.value)}
                  className={`gb-input ${getFieldError('id') ? 'gb-input-error' : ''}`}
                  placeholder="Ej: KB-MEC-001"
                />
                {getFieldError('id') && <p className="gb-error-text">{getFieldError('id')}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Nombre
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  className={`gb-input ${getFieldError('nombre') ? 'gb-input-error' : ''}`}
                  placeholder="Ej: Teclado Mecánico RGB"
                />
                {getFieldError('nombre') && <p className="gb-error-text">{getFieldError('nombre')}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Imagen del Producto
                </label>
                <div className="flex items-center gap-4">
                  {imagen ? (
                    <div className="relative">
                      <img src={imagen} alt="Preview" className="w-16 h-16 object-cover rounded border" style={{ borderColor: 'hsl(var(--gb-surface-200))' }} />
                      <button type="button" onClick={() => setImagen(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded border border-dashed flex items-center justify-center" style={{ borderColor: 'hsl(var(--gb-surface-300))', background: 'hsl(var(--gb-surface-50))' }}>
                      <ImageIcon size={20} style={{ color: 'hsl(var(--gb-surface-400))' }} />
                    </div>
                  )}
                  <button type="button" onClick={handleImageUpload} className="gb-btn-ghost text-sm">
                    Seleccionar Foto
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                    Precio ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={precio}
                    onChange={e => setPrecio(e.target.value)}
                    className={`gb-input ${getFieldError('precio') ? 'gb-input-error' : ''}`}
                    placeholder="0.00"
                  />
                  {getFieldError('precio') && <p className="gb-error-text">{getFieldError('precio')}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                    Stock {hasVariants && '(Automático)'}
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required={!hasVariants}
                    disabled={hasVariants}
                    value={hasVariants ? variantes.reduce((acc, v) => acc + (parseInt(v.stock as string, 10) || 0), 0) : stock}
                    onChange={e => setStock(e.target.value)}
                    className={`gb-input ${getFieldError('stock') ? 'gb-input-error' : ''} ${hasVariants ? 'opacity-70 bg-gray-50' : ''}`}
                    placeholder="0"
                  />
                  {getFieldError('stock') && !hasVariants && <p className="gb-error-text">{getFieldError('stock')}</p>}
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={hasVariants} onChange={e => {
                    setHasVariants(e.target.checked);
                    if (e.target.checked && variantes.length === 0) setVariantes([{ color: '', stock: 0 }]);
                  }} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--gb-surface-700))' }}>Este producto tiene variantes de color</span>
                </label>

                {hasVariants && (
                  <div className="space-y-3 p-4 rounded-md" style={{ background: 'hsl(var(--gb-surface-50))', border: '1px solid hsl(var(--gb-surface-200))' }}>
                    {variantes.map((v, i) => (
                      <div key={i} className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--gb-surface-600))' }}>Color</label>
                          <input type="text" required value={v.color} onChange={e => updateVariant(i, 'color', e.target.value)} className="gb-input py-1.5 px-3 text-sm" placeholder="Ej: Rojo" />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-medium mb-1" style={{ color: 'hsl(var(--gb-surface-600))' }}>Stock</label>
                          <input type="number" min="0" required value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} className="gb-input py-1.5 px-3 text-sm" />
                        </div>
                        <button type="button" onClick={() => removeVariant(i)} className="p-2 mb-0.5 text-red-500 hover:bg-red-50 rounded" title="Quitar variante">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={addVariant} className="text-sm text-blue-600 font-medium flex items-center gap-1 hover:text-blue-700 mt-2">
                      <Plus size={16} /> Agregar otro color
                    </button>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="gb-btn-ghost"
                >
                  Cancelar
                </button>
                <button type="submit" className="gb-btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
