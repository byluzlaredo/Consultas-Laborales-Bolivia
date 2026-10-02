import assert from 'node:assert/strict';
import test from 'node:test';
import { NormativaService } from '../../modules/normativa/normativa.service.js';

test('caja blanca cubre ramas de formato y tamano de archivo normativo', () => {
  // Arrange
  const validFile = { originalname: 'ley.pdf', mimetype: 'application/pdf', size: 1024 };

  // Act
  const validResult = NormativaService.validateFile(validFile);
  const invalidResult = NormativaService.validateFile({ originalname: 'ley.txt', mimetype: 'text/plain', size: validFile.size });
  const oversizedResult = NormativaService.validateFile({ ...validFile, size: 21 * 1024 * 1024 });

  // Assert
  assert.equal(validResult.valid, true);
  assert.equal(invalidResult.valid, false);
  assert.equal(oversizedResult.valid, false);
});