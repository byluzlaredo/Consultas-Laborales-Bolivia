import test from 'node:test';
import assert from 'node:assert/strict';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test('API protege el historial de chat sin token JWT', async () => {
  // Arrange
  const endpoint = `${API_URL}/api/chat`;

  // Act
  const response = await fetch(endpoint);
  const body = await response.json() as { success?: boolean; message?: string };

  // Assert
  assert.equal(response.status, 401);
  assert.equal(body.success, false);
  assert.ok(body.message);
});