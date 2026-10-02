import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSystemPrompt } from '../../controllers/aiConfigController.js';

test('RF10 rechaza texto vacío o solo espacios', () => {
  // Arrange
  const emptyPrompts = ['', '   '];

  // Act
  const results = emptyPrompts.map((prompt) => validateSystemPrompt(prompt));

  // Assert
  assert.deepEqual(results, [false, false]);
});