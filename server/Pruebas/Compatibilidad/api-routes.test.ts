import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('compatibilidad conserva las rutas publicas y protegidas principales', () => {
  // Arrange
  const source = readProjectSource('server/index.ts');

  // Act
  const routesPresent = ['/api/health', '/api/auth/login', '/api/chat/query', '/api/laboral/calculations'].every((route) => source.includes(route));

  // Assert
  assert.equal(routesPresent, true);
});