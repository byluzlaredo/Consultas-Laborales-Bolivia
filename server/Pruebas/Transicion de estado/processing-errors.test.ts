import assert from 'node:assert/strict';
import test from 'node:test';
import { formatEmbeddingError, formatProcessingError } from '../../modules/processing/legalProcessingService.js';

test('transaccion conserva mensajes de error para fallos de cada etapa', () => {
  // Arrange
  const extractionError = new Error('fallo de PDF');
  const embeddingError = new Error('fallo de red');

  // Act
  const messages = [formatProcessingError(extractionError), formatEmbeddingError(embeddingError)];

  // Assert
  assert.deepEqual(messages, [
    'Fallo en la extracción o fragmentación del texto normativo',
    'Error de conexión con la API de IA al generar embeddings',
  ]);
});