import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, calculateDiscountPercent, calculateRigTotal } from './format';
import { Product } from '../types/product';

test('formatCurrency formats VND correctly', () => {
  const result = formatCurrency(19490000);
  assert.ok(result.includes('19.490.000') || result.includes('19,490,000'));
  assert.ok(result.endsWith('₫'));
});

test('calculateDiscountPercent returns accurate integer discount percentage', () => {
  assert.equal(calculateDiscountPercent(19490000, 21990000), 11);
  assert.equal(calculateDiscountPercent(8290000, 8990000), 8);
  assert.equal(calculateDiscountPercent(1000, 1000), 0);
  assert.equal(calculateDiscountPercent(1200, 1000), 0);
  assert.equal(calculateDiscountPercent(500, undefined), 0);
});

test('calculateRigTotal calculates sum of selected rig parts correctly', () => {
  const mockGpu: Product = {
    id: 'gpu-1',
    name: 'RTX 4070',
    category: 'gpu',
    brand: 'ASUS',
    price: 15000000,
    rating: 4.8,
    reviews: 10,
    stock: 5,
    specs: ['12GB'],
    image: '',
  };

  const mockCpu: Product = {
    id: 'cpu-1',
    name: 'Ryzen 7',
    category: 'cpu',
    brand: 'AMD',
    price: 8000000,
    rating: 4.9,
    reviews: 15,
    stock: 10,
    specs: ['8C/16T'],
    image: '',
  };

  const rig = {
    gpu: mockGpu,
    cpu: mockCpu,
  };

  assert.equal(calculateRigTotal(rig), 23000000);
  assert.equal(calculateRigTotal({}), 0);
});
