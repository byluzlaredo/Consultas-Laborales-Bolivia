import assert from 'node:assert/strict';
import test from 'node:test';

test('API rechaza el historial laboral sin autenticacion', async () => {
  // Arrange
  const endpoint = `${process.env.API_URL || 'http://localhost:3001'}/api/laboral/history`;

  // Act
  const response = await fetch(endpoint);
  const body = await response.json() as { success?: boolean };

  // Assert
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
});