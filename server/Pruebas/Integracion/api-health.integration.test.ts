import test from 'node:test';
import assert from 'node:assert/strict';

const API_URL = process.env.API_URL || 'http://localhost:3001';

test('API responde correctamente al health check', async () => {
  // Arrange
  const endpoint = `${API_URL}/api/health`;

  // Act
  const response = await fetch(endpoint);
  const body = await response.json() as { ok?: boolean; checks?: Record<string, string> };

  // Assert
  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
});