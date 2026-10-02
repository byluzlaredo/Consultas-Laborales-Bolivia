import test from 'node:test';
import assert from 'node:assert/strict';
import { NormativaService } from '../../modules/normativa/normativa.service.js';

test('RF05: acepta PDF válido y rechaza formato no permitido', () => {
  // Arrange
  const ok = NormativaService.validateFile({ originalname: 'ley.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024 });
  const badFormat = NormativaService.validateFile({ originalname: 'ley.jpg', mimetype: 'image/jpeg', size: 2 * 1024 * 1024 });

  // Act
  const validResult = ok;
  const invalidResult = badFormat;

  // Assert
  assert.equal(validResult.valid, true);
  assert.equal(invalidResult.valid, false);
  assert.equal(invalidResult.message, 'Formato de archivo no válido. Solo se permiten archivos PDF');
});