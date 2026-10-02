import assert from 'node:assert/strict';
import test from 'node:test';

test('API devuelve 404 para una ruta inexistente', async () => {
  // Arrange
  const endpoint = `${process.env.API_URL || 'http://localhost:3001'}/api/ruta-inexistente`;

  // Act
  const response = await fetch(endpoint);
  const body = await response.json() as { success?: boolean; message?: string };

  // Assert
  assert.equal(response.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Endpoint no encontrado');
});