import test from 'node:test';
import assert from 'node:assert/strict';
import { processPendingLegalDocuments } from '../../modules/processing/legalProcessingService.js';

test('RF07/RF08: procesa documentos pendientes sin romper el flujo', async () => {
  // Arrange
  const expectedCollection = true;

  // Act
  const result = await processPendingLegalDocuments();

  // Assert
  assert.ok(result);
  assert.equal(Array.isArray(result.processed), expectedCollection);
  assert.equal(Array.isArray(result.errors), expectedCollection);
});