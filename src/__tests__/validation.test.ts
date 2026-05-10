import { describe, it, expect } from 'vitest';
import { validateProductForm, validateCheckoutAmount, calculateChange } from '../lib/validation';

describe('validateProductForm', () => {
  it('accepts valid product data', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor 24"',
      precio: '150000',
      stock: '10',
    });
    expect(errors).toEqual([]);
  });

  it('rejects negative stock', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor 24"',
      precio: '150000',
      stock: '-1',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'stock')).toBe(true);
  });

  it('rejects decimal stock', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor 24"',
      precio: '150000',
      stock: '2.5',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'stock')).toBe(true);
  });

  it('accepts zero stock', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor 24"',
      precio: '150000',
      stock: '0',
    });
    expect(errors).toEqual([]);
  });

  it('rejects negative price', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor 24"',
      precio: '-500',
      stock: '10',
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.field === 'precio')).toBe(true);
  });

  it('accepts zero price', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Producto gratis',
      precio: '0',
      stock: '5',
    });
    expect(errors).toEqual([]);
  });

  it('rejects empty id', () => {
    const errors = validateProductForm({
      id: '',
      nombre: 'Monitor',
      precio: '100',
      stock: '10',
    });
    expect(errors.some(e => e.field === 'id')).toBe(true);
  });

  it('rejects whitespace-only id', () => {
    const errors = validateProductForm({
      id: '   ',
      nombre: 'Monitor',
      precio: '100',
      stock: '10',
    });
    expect(errors.some(e => e.field === 'id')).toBe(true);
  });

  it('rejects empty nombre', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: '',
      precio: '100',
      stock: '10',
    });
    expect(errors.some(e => e.field === 'nombre')).toBe(true);
  });

  it('rejects non-numeric price', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor',
      precio: 'abc',
      stock: '10',
    });
    expect(errors.some(e => e.field === 'precio')).toBe(true);
  });

  it('rejects non-numeric stock', () => {
    const errors = validateProductForm({
      id: 'SKU-001',
      nombre: 'Monitor',
      precio: '100',
      stock: 'abc',
    });
    expect(errors.some(e => e.field === 'stock')).toBe(true);
  });

  it('collects multiple errors at once', () => {
    const errors = validateProductForm({
      id: '',
      nombre: '',
      precio: '-10',
      stock: '-5',
    });
    expect(errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe('validateCheckoutAmount', () => {
  it('accepts amount equal to total', () => {
    const errors = validateCheckoutAmount('5000', 5000);
    expect(errors).toEqual([]);
  });

  it('accepts amount greater than total', () => {
    const errors = validateCheckoutAmount('10000', 5000);
    expect(errors).toEqual([]);
  });

  it('rejects amount less than total', () => {
    const errors = validateCheckoutAmount('3000', 5000);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('montoRecibido');
  });

  it('rejects zero amount', () => {
    const errors = validateCheckoutAmount('0', 5000);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects negative amount', () => {
    const errors = validateCheckoutAmount('-100', 5000);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non-numeric input', () => {
    const errors = validateCheckoutAmount('abc', 5000);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty string', () => {
    const errors = validateCheckoutAmount('', 5000);
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('calculateChange', () => {
  it('returns correct change when overpaid', () => {
    expect(calculateChange('10000', 7500)).toBe(2500);
  });

  it('returns zero when exact amount', () => {
    expect(calculateChange('5000', 5000)).toBe(0);
  });

  it('returns negative when underpaid', () => {
    expect(calculateChange('3000', 5000)).toBe(-2000);
  });

  it('returns 0 for non-numeric input', () => {
    expect(calculateChange('abc', 5000)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(calculateChange('', 5000)).toBe(0);
  });
});
