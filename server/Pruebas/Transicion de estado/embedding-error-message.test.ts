import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEmbeddingError } from '../../modules/processing/legalProcessingService.js';

test('RF08: mantiene el mensaje de error de conexión a embeddings', () => {
  // Arrange
  const embeddingError = new Error('ECONNREFUSED');

  // Act
  const message = formatEmbeddingError(embeddingError);

  // Assert
  assert.equal(message, 'Error de conexión con la API de IA al generar embeddings');
});