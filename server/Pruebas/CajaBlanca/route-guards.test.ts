import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('caja blanca verifica guardas en las rutas administrativas', () => {
  // Arrange
  const source = readProjectSource('server/index.ts');

  // Act
  const adminRoutes = source.match(/app\.(get|post|patch|delete)\('\/api\/admin[^\n]+/g) || [];

  // Assert
  assert.ok(adminRoutes.length >= 5);
  assert.ok(adminRoutes.every((route) => route.includes('authGuard') && route.includes('adminGuard')));
});