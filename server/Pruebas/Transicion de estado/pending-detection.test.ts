import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPendingLegalDocuments } from '../../modules/processing/legalProcessingService.js';

test('RF07: detecta documentos pendientes para fragmentación', async () => {
  // Arrange
  const expectedCollection = true;

  // Act
  const documents = await detectPendingLegalDocuments();

  // Assert
  assert.equal(Array.isArray(documents), expectedCollection);
});