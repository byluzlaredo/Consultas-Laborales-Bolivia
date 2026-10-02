import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuery } from '../../services/ragChatService.js';

test('clasifica una situación de abuso como análisis de denuncia, no como respuesta fija', () => {
  // Arrange
  const query = 'mi jefe me amenaza con quitarme horas pagadas';

  // Act
  const analysis = analyzeQuery(query, '');

  // Assert
  assert.equal(analysis.intent, 'denuncia');
  assert.equal(analysis.facts.posibleConflicto, true);
  assert.ok(analysis.missingData.length >= 1);
  assert.match(analysis.retrievalQuery, /amenaza|horas pagadas|trabajo|conflicto/i);
});