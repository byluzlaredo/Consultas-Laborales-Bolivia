import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProcessingError } from '../../modules/processing/legalProcessingService.js';

test('RF07: mantiene el mensaje de error de extracción/fragmentación', () => {
  // Arrange
  const processingError = new Error('PDF corrupto');

  // Act
  const message = formatProcessingError(processingError);

  // Assert
  assert.equal(message, 'Fallo en la extracción o fragmentación del texto normativo');
});