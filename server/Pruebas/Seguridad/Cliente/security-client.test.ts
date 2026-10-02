import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../../sourceTestUtils.js';

test('seguridad de cliente envia el token y limpia la sesion al cerrar', () => {
  // Arrange
  const authContext = readProjectSource('src/context/AuthContext.tsx');

  // Act
  const sendsBearerToken = /Authorization: `Bearer \$\{session\.token\}`/.test(authContext);
  const removesStoredToken = authContext.includes('localStorage.removeItem(TOKEN_STORAGE_KEY)');
  const callsLogoutEndpoint = authContext.includes("fetch('/api/auth/logout'");

  // Assert
  assert.equal(sendsBearerToken, true);
  assert.equal(removesStoredToken, true);
  assert.equal(callsLogoutEndpoint, true);
});