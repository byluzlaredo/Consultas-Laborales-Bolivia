import assert from 'node:assert/strict';
import test from 'node:test';
import { processPendingLegalDocuments } from '../../modules/processing/legalProcessingService.js';

test('transaccion de procesamiento devuelve colecciones de resultado', async () => {
  // Arrange
  const expectedKeys = ['processed', 'errors'];

  // Act
  const result = await processPendingLegalDocuments();

  // Assert
  assert.deepEqual(Object.keys(result).sort(), expectedKeys.sort());
  assert.ok(result.processed.every((item) => typeof item === 'object'));
  assert.ok(result.errors.every((item) => typeof item === 'object'));
});