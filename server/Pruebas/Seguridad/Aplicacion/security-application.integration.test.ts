import assert from 'node:assert/strict';
import test from 'node:test';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test('seguridad de aplicacion agrega cabeceras y protege configuracion sensible', async () => {
  // Arrange
  const healthEndpoint = `${API_URL}/api/health`;
  const protectedEndpoint = `${API_URL}/api/ai-config`;

  // Act
  const healthResponse = await fetch(healthEndpoint);
  const protectedResponse = await fetch(protectedEndpoint);

  // Assert
  assert.equal(healthResponse.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(protectedResponse.status, 401);
});