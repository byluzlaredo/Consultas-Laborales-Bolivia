import assert from 'node:assert/strict';
import test from 'node:test';

test('API valida el registro incompleto antes de crear un usuario', async () => {
  // Arrange
  const endpoint = `${process.env.API_URL || 'http://localhost:3001'}/api/auth/register`;

  // Act
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const body = await response.json() as { success?: boolean; message?: string };

  // Assert
  assert.equal(response.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.message);
});