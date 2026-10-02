import test from 'node:test';
import assert from 'node:assert/strict';
import { validateModelParameters } from '../../controllers/aiConfigController.js';

test('RF09 rechaza valores fuera del rango permitido', () => {
  // Arrange
  const invalidParameters = [[1.1, 500], [0.5, 255], [0.5, 2049]] as const;

  // Act
  const results = invalidParameters.map(([temperature, maxTokens]) => validateModelParameters(temperature, maxTokens));

  // Assert
  assert.deepEqual(results, [false, false, false]);
});