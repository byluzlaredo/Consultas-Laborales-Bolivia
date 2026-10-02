import assert from 'node:assert/strict';
import test from 'node:test';

test('API protege la configuracion de IA para administradores autenticados', async () => {
  // Arrange
  const endpoint = `${process.env.API_URL || 'http://localhost:3001'}/api/ai-config`;

  // Act
  const response = await fetch(endpoint);
  const body = await response.json() as { success?: boolean };

  // Assert
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});