import test from 'node:test';
import assert from 'node:assert/strict';
import { validateModelParameters } from '../../controllers/aiConfigController.js';

test('RF09 acepta temperatura y max_tokens dentro del rango permitido', () => {
  // Arrange
  const validParameters = [[0.2, 500], [0.0, 256], [1.0, 2048]] as const;

  // Act
  const results = validParameters.map(([temperature, maxTokens]) => validateModelParameters(temperature, maxTokens));

  // Assert
  assert.deepEqual(results, [true, true, true]);
});