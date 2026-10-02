import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSystemPrompt } from '../../controllers/aiConfigController.js';

test('RF10 acepta texto con instrucciones válidas', () => {
  // Arrange
  const validPrompt = 'Cita siempre la normativa legal boliviana.';

  // Act
  const result = validateSystemPrompt(validPrompt);

  // Assert
  assert.equal(result, true);
});