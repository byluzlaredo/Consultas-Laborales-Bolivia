import assert from 'node:assert/strict';
import test from 'node:test';
import { validateModelParameters, validateSystemPrompt } from '../../controllers/aiConfigController.js';

test('caja blanca cubre ramas limite y rechazo de configuracion IA', () => {
  // Arrange
  const boundaryParameters = validateModelParameters(0, 256);
  const invalidParameters = validateModelParameters(-1, 0);

  // Act
  const validPrompt = validateSystemPrompt('Instrucciones legales');
  const emptyPrompt = validateSystemPrompt('');

  // Assert
  assert.equal(boundaryParameters, true);
  assert.equal(invalidParameters, false);
  assert.equal(validPrompt, true);
  assert.equal(emptyPrompt, false);
});