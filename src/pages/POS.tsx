import React, { useState, useEffect } from 'react';
import { useSaleSession } from '../modules/sale';
import { productsRepo } from '../repositories';
import type { Product } from '../types/global';
import { calculateChange } from '../lib/validation';
import type { ValidationError } from '../lib/validation';
import { Search, ShoppingCart, Trash2, CreditCard, Minus, Plus, X, Check, Image as ImageIcon } from 'lucide-react';

const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState<ValidationError[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotal, checkout } = useSaleSession();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await productsRepo.getProducts();
    setProducts(data);
  };

  const searchTerms = React.useMemo(() => searchQuery.toLowerCase().split(/\s+/).filter(Boolean), [searchQuery]);
  const filteredProducts = React.useMemo(() => {
    if (searchQuery.length < 2) return [];
    return products.filter(p => {
      const searchableText = `${p.nombre.toLowerCase()} ${p.id.toLowerCase()}`;
      return searchTerms.every(term => searchableText.includes(term));
    }).slice(0, 60); // Optimize DOM rendering by showing max 60 results
  }, [products, searchQuery, searchTerms]);

  const handleProductClick = (product: Product) => {
    if (product.variantes && product.variantes.length > 0) {
      setSelectedProduct(product);
      setVariantModalOpen(true);
    } else {
      addItem(product);
    }
  };

  const total = getTotal();
  const vuelto = calculateChange(montoRecibido, total);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await checkout(montoRecibido);

      if (result.ok) {
        setIsCheckoutOpen(false);
        setMontoRecibido('');
        setCheckoutErrors([]);
        loadProducts();

        // Show success toast
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
      } else {
        if (result.error.errors && result.error.errors.length > 0) {
          setCheckoutErrors(result.error.errors);
        } else {
          alert(`Error al procesar la venta: ${result.error.message}`);
        }
      }
    } catch (error) {
      console.error('Error al realizar la venta:', error);
      alert('Hubo un error al procesar la venta. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Product Search & Grid */}
      <div className="flex-1 p-6 flex flex-col">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search style={{ color: 'hsl(var(--gb-surface-300))' }} size={20} />
          </div>
          <input
            type="text"
            className="gb-input"
            style={{ paddingLeft: '2.75rem', fontSize: '1rem', padding: '0.75rem 1rem 0.75rem 2.75rem' }}
            placeholder="Buscar por nombre o código de barras..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {searchQuery.length < 2 && (
              <div className="col-span-full text-center py-10" style={{ color: 'hsl(var(--gb-surface-400))' }}>
                <Search size={32} className="mx-auto mb-3 opacity-30" />
                <p>Ingrese al menos 2 caracteres para buscar productos.</p>
              </div>
            )}
            {filteredProducts.map(product => {
              // Stock calculation for main button (we show total remaining stock, if variants we can just check total)
              const currentQty = items.filter(i => i.id === product.id).reduce((sum, i) => sum + i.cantidad, 0);
              const remainingStock = product.stock - currentQty;
              const isStockReached = remainingStock <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => handleProductClick(product)}
                  disabled={product.stock <= 0 || isStockReached}
                  className={`gb-product-card flex flex-col justify-between p-3 ${isStockReached ? 'opacity-60 grayscale' : ''}`}
                >
                  <div className="w-full aspect-square bg-gray-100 rounded mb-3 overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'hsl(var(--gb-surface-100))' }}>
                    {product.imagen ? (
                       <img src={product.imagen} className="w-full h-full object-cover" alt={product.nombre} />
                    ) : (
                       <ImageIcon size={32} style={{ color: 'hsl(var(--gb-surface-300))' }} />
                    )}
                  </div>
                  <div className="text-left w-full">
                    <div className="text-xs font-mono mb-1" style={{ color: 'hsl(var(--gb-surface-400))' }}>
                      {product.id}
                    </div>
                    <div className="font-semibold mb-2 leading-tight" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                      {product.nombre}
                    </div>
                  </div>
                  <div className="mt-auto pt-3">
                    <div className="text-lg font-bold" style={{ color: 'hsl(var(--gb-primary-600))' }}>
                      ${product.precio.toFixed(2)}
                    </div>
                    <div
                      className="text-xs font-semibold mt-1.5 inline-block px-2 py-0.5 rounded-full"
                      style={{
                        background: remainingStock > 5
                          ? 'hsla(var(--gb-success) / 0.12)'
                          : remainingStock > 0
                            ? 'hsla(var(--gb-warning) / 0.12)'
                            : 'hsla(var(--gb-danger) / 0.12)',
                        color: remainingStock > 5
                          ? 'hsl(var(--gb-success))'
                          : remainingStock > 0
                            ? 'hsl(var(--gb-warning))'
                            : 'hsl(var(--gb-danger))',
                      }}
                    >
                      {remainingStock} unid.
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div
        className="w-96 flex flex-col"
        style={{
          background: 'hsl(var(--gb-surface-0))',
          borderLeft: '1px solid hsl(var(--gb-surface-200))',
          boxShadow: '-4px 0 16px hsla(var(--gb-surface-800) / 0.04)',
        }}
      >
        <div
          className="p-4 flex justify-between items-center"
          style={{
            borderBottom: '1px solid hsl(var(--gb-surface-200))',
            background: 'hsl(var(--gb-surface-50))',
          }}
        >
          <div className="flex items-center gap-2 text-lg font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
            <ShoppingCart size={22} style={{ color: 'hsl(var(--gb-primary-500))' }} />
            Venta Actual
          </div>
          {items.length > 0 && (
            <button 
              onClick={clearCart}
              className="text-sm font-medium px-2 py-1 rounded transition-colors"
              style={{ color: 'hsl(var(--gb-danger))' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'hsla(var(--gb-danger) / 0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Vaciar
            </button>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center" style={{ color: 'hsl(var(--gb-surface-300))' }}>
              <ShoppingCart size={48} className="mb-4 opacity-40" />
              <p className="text-sm">El carrito está vacío</p>
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 rounded-lg"
                style={{
                  background: 'hsl(var(--gb-surface-50))',
                  border: '1px solid hsl(var(--gb-surface-100))',
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium text-sm" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                    {item.nombre}
                    {item.selectedVariant && (
                      <span className="block text-xs font-normal" style={{ color: 'hsl(var(--gb-surface-500))' }}>
                        Color: {item.selectedVariant.color}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.cartItemId)}
                    className="p-1 rounded transition-colors"
                    style={{ color: 'hsl(var(--gb-surface-300))' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'hsl(var(--gb-danger))';
                      e.currentTarget.style.background = 'hsla(var(--gb-danger) / 0.08)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'hsl(var(--gb-surface-300))';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <div
                    className="flex items-center rounded-md overflow-hidden"
                    style={{ border: '2px solid hsl(var(--gb-surface-200))' }}
                  >
                    <button
                      onClick={() => updateQuantity(item.cartItemId || item.id, Math.max(1, item.cantidad - 1))}
                      className="px-2 py-1 transition-colors"
                      style={{ color: 'hsl(var(--gb-surface-500))' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--gb-surface-100))'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Minus size={14} />
                    </button>
                    <span
                      className="px-3 py-1 font-semibold text-sm"
                      style={{ color: 'hsl(var(--gb-surface-700))' }}
                    >
                      {item.cantidad}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartItemId || item.id, item.cantidad + 1)}
                      className="px-2 py-1 transition-colors"
                      style={{ color: 'hsl(var(--gb-surface-500))' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'hsl(var(--gb-surface-100))'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <div className="font-bold text-sm" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                    ${(item.precio * item.cantidad).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div
          className="p-5"
          style={{
            borderTop: '1px solid hsl(var(--gb-surface-200))',
            background: 'hsl(var(--gb-surface-50))',
          }}
        >
          <div className="flex justify-between items-center mb-5">
            <span className="text-base font-medium" style={{ color: 'hsl(var(--gb-surface-500))' }}>Total</span>
            <span className="text-2xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
              ${total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={() => { setIsCheckoutOpen(true); setCheckoutErrors([]); }}
            disabled={items.length === 0}
            className="gb-btn-primary w-full py-3.5 text-base"
          >
            <CreditCard size={22} />
            Cobrar
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'hsla(var(--gb-surface-800) / 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="gb-card-elevated w-full max-w-md overflow-hidden">
            <div
              className="p-5 flex justify-between items-center"
              style={{ background: 'hsl(var(--gb-primary-600))' }}
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard size={22} /> Confirmar Cobro
              </h2>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 rounded-md transition-colors text-white/70 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCheckout} className="p-6">
              <div className="mb-6">
                <div className="flex justify-between items-center">
                  <span style={{ color: 'hsl(var(--gb-surface-500))' }}>Total a Pagar:</span>
                  <span className="text-2xl font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'hsl(var(--gb-surface-600))' }}>
                  Monto Recibido ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={montoRecibido}
                  onChange={(e) => { setMontoRecibido(e.target.value); setCheckoutErrors([]); }}
                  className={`gb-input text-xl ${checkoutErrors.length > 0 ? 'gb-input-error' : ''}`}
                  style={{ padding: '0.875rem 1rem' }}
                  placeholder="Ej: 5000"
                />
                {checkoutErrors.map((err, i) => (
                  <p key={i} className="gb-error-text">{err.message}</p>
                ))}
              </div>

              <div
                className="mb-6 p-4 rounded-lg"
                style={{
                  background: 'hsl(var(--gb-surface-50))',
                  border: '1px solid hsl(var(--gb-surface-200))',
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium" style={{ color: 'hsl(var(--gb-surface-500))' }}>
                    Vuelto a entregar:
                  </span>
                  <span
                    className="text-xl font-bold"
                    style={{
                      color: vuelto >= 0 ? 'hsl(var(--gb-success))' : 'hsl(var(--gb-danger))',
                    }}
                  >
                    ${vuelto.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="gb-btn-ghost flex-1 py-3"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vuelto < 0 || isNaN(parseFloat(montoRecibido)) || isSubmitting}
                  className={`gb-btn-success flex-1 py-3 ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  <Check size={18} />
                  {isSubmitting ? 'Procesando...' : 'Confirmar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="gb-toast gb-toast-success flex items-center gap-2">
          <Check size={18} />
          Venta registrada con éxito
        </div>
      )}

      {/* Variant Selection Modal */}
      {variantModalOpen && selectedProduct && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'hsla(var(--gb-surface-800) / 0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div className="gb-card-elevated w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold" style={{ color: 'hsl(var(--gb-surface-700))' }}>
                Seleccionar Color
              </h2>
              <button
                onClick={() => setVariantModalOpen(false)}
                className="p-1 rounded-md transition-colors"
                style={{ color: 'hsl(var(--gb-surface-400))' }}
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm mb-4" style={{ color: 'hsl(var(--gb-surface-500))' }}>
              Elija una variante para {selectedProduct.nombre}:
            </p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {selectedProduct.variantes?.map(v => {
                const currentQty = items.find(i => i.cartItemId === `${selectedProduct.id}-${v.id}`)?.cantidad || 0;
                const remaining = v.stock - currentQty;
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      addItem(selectedProduct, 1, v);
                      setVariantModalOpen(false);
                    }}
                    disabled={remaining <= 0}
                    className="w-full flex justify-between items-center p-3 rounded border text-left transition-colors"
                    style={{ 
                      borderColor: 'hsl(var(--gb-surface-200))', 
                      background: remaining > 0 ? 'hsl(var(--gb-surface-50))' : 'hsl(var(--gb-surface-100))',
                      opacity: remaining <= 0 ? 0.6 : 1
                    }}
                  >
                    <span className="font-medium" style={{ color: 'hsl(var(--gb-surface-700))' }}>{v.color}</span>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: remaining > 0 ? 'hsla(var(--gb-primary-500) / 0.1)' : 'hsla(var(--gb-surface-400) / 0.1)', color: remaining > 0 ? 'hsl(var(--gb-primary-600))' : 'hsl(var(--gb-surface-500))' }}>
                      {remaining} en stock
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
