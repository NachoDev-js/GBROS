/**
 * Pure validation functions for GBROS POS business rules.
 * These are framework-agnostic and fully testable.
 */

export interface ProductFormData {
  id: string;
  nombre: string;
  precio: string;
  stock: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export function validateProductForm(data: ProductFormData): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.id.trim()) {
    errors.push({ field: 'id', message: 'El código/SKU es obligatorio.' });
  }

  if (!data.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio.' });
  }

  const precio = parseFloat(data.precio);
  if (isNaN(precio) || precio < 0) {
    errors.push({ field: 'precio', message: 'El precio debe ser un número mayor o igual a 0.' });
  }

  const stock = parseInt(data.stock, 10);
  if (isNaN(stock) || stock < 0) {
    errors.push({ field: 'stock', message: 'El stock debe ser un número entero mayor o igual a 0.' });
  }
  if (!isNaN(stock) && !Number.isInteger(parseFloat(data.stock))) {
    errors.push({ field: 'stock', message: 'El stock debe ser un número entero, sin decimales.' });
  }

  return errors;
}

export function validateCheckoutAmount(montoRecibido: string, total: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const monto = parseFloat(montoRecibido);

  if (isNaN(monto) || monto <= 0) {
    errors.push({ field: 'montoRecibido', message: 'El monto recibido debe ser un número positivo.' });
  } else if (monto < total) {
    errors.push({ field: 'montoRecibido', message: 'El monto recibido es menor al total.' });
  }

  return errors;
}

export function calculateChange(montoRecibido: string, total: number): number {
  const monto = parseFloat(montoRecibido);
  if (isNaN(monto)) return 0;
  return monto - total;
}
