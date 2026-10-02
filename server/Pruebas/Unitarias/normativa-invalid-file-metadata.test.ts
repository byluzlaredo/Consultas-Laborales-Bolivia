import test from 'node:test';
import assert from 'node:assert/strict';
import { NormativaService } from '../../modules/normativa/normativa.service.js';

test('RF05: rechaza archivo mayor a 20 MB y metadata obligatoria', () => {
  // Arrange
  const tooBig = NormativaService.validateFile({ originalname: 'ley.pdf', mimetype: 'application/pdf', size: 21 * 1024 * 1024 });
  const missingMeta = NormativaService.validateMetadata({ titulo: '', tipo: 'Ley', numero: '', fuente: '', fecha_publicacion: '' });

  // Act
  const tooBigResult = tooBig;
  const missingMetaResult = missingMeta;

  // Assert
  assert.equal(tooBigResult.valid, false);
  assert.equal(tooBigResult.message, 'El archivo excede el tamaño máximo permitido de 20 MB');
  assert.equal(missingMetaResult.valid, false);
  assert.ok(missingMetaResult.message, 'Debe existir un mensaje de error para metadata faltante');
  assert.equal(missingMetaResult.message!.includes('Título'), true);
});