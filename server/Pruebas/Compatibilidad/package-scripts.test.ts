import assert from 'node:assert/strict';
import test from 'node:test';
import packageJson from '../../../package.json' with { type: 'json' };

test('compatibilidad conserva scripts de prueba por categoria', () => {
  // Arrange
  const scripts = packageJson.scripts as Record<string, string>;

  // Act
  const requiredScripts = ['test', 'test:unitarias', 'test:integracion', 'test:transicion', 'test:compatibilidad', 'test:usabilidad', 'test:caja-blanca', 'test:seguridad'];

  // Assert
  assert.ok(requiredScripts.every((scriptName) => typeof scripts[scriptName] === 'string'));
});