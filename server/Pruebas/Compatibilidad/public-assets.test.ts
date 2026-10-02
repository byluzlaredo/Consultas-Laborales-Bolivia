import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';

test('compatibilidad conserva las carpetas publicas de imagenes', () => {
  // Arrange
  const publicImages = 'public/Imagenes';

  // Act
  const directoryExists = existsSync(publicImages);

  // Assert
  assert.equal(directoryExists, true);
});