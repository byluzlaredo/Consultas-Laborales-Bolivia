import test from 'node:test';
import assert from 'node:assert/strict';
import { getResponseBudget, getResponseLengthInstruction } from '../../services/ragChatService.js';

test('adapta la instruccion de respuesta al presupuesto de tokens', () => {
  // Arrange
  const shortBudget = getResponseBudget(256);
  const detailedBudget = getResponseBudget(2048);

  // Act
  const shortInstruction = getResponseLengthInstruction(256);
  const detailedInstruction = getResponseLengthInstruction(2048);

  // Assert
  assert.equal(shortBudget, 204);
  assert.equal(detailedBudget, 1638);
  assert.match(shortInstruction, /RESPUESTA BREVE/);
  assert.match(detailedInstruction, /RESPUESTA DETALLADA/);
});