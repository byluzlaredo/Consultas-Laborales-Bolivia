import test from 'node:test';
import assert from 'node:assert/strict';
import { NormativaService } from '../../modules/normativa/normativa.service.js';

test('RF06: normaliza estados de vigencia y mensajes de actualización', () => {
  // Arrange
  const statuses = ['Activo', 'Inactivo', 'Pendiente de Procesamiento'];

  // Act
  const normalizedStatuses = statuses.map((status) => NormativaService.normalizeStatus(status));
  const successMessage = NormativaService.getUpdateSuccessMessage();
  const errorMessage = NormativaService.getUpdateErrorMessage();

  // Assert
  assert.deepEqual(normalizedStatuses, ['ACTIVO', 'INACTIVO', 'PENDIENTE_PROCESAMIENTO']);
  assert.equal(successMessage, 'Estado normativo actualizado correctamente.');
  assert.equal(errorMessage, 'No se pudo actualizar el registro normativo seleccionado.');
});