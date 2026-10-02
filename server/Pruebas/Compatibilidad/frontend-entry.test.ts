import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('compatibilidad mantiene la entrada React y el elemento raiz', () => {
  // Arrange
  const source = readProjectSource('src/main.tsx');
  const html = readProjectSource('index.html');

  // Act
  const isCompatible = source.includes('createRoot') && html.includes('id="root"');

  // Assert
  assert.equal(isCompatible, true);
});