import assert from 'node:assert/strict';
import test from 'node:test';
import tsconfig from '../../../tsconfig.json' with { type: 'json' };

test('compatibilidad mantiene TypeScript estricto y modulos ESM', () => {
  // Arrange
  const options = tsconfig.compilerOptions;

  // Act
  const isCompatible = options.strict && options.module === 'ESNext' && options.moduleResolution === 'Bundler';

  // Assert
  assert.equal(isCompatible, true);
});