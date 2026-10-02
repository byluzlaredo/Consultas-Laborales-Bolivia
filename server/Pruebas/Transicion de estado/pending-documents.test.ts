import assert from 'node:assert/strict';
import test from 'node:test';
import { detectPendingLegalDocuments } from '../../modules/processing/legalProcessingService.js';

test('transaccion de documentos pendientes siempre devuelve una coleccion', async () => {
  // Arrange
  const expectedType = 'array';

  // Act
  const documents = await detectPendingLegalDocuments();

  // Assert
  assert.equal(typeof documents.length, 'number');
  assert.equal(Array.isArray(documents) ? 'array' : typeof documents, expectedType);
});