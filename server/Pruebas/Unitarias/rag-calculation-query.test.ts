import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuery } from '../../services/ragChatService.js';

test('analiza una consulta de cálculo sin generar una respuesta programada', () => {
  // Arrange
  const query = 'me despidieron después de trabajar 5 años';

  // Act
  const analysis = analyzeQuery(query, '');

  // Assert
  assert.equal(analysis.intent, 'calculo');
  assert.equal(analysis.facts.despido, true);
  assert.equal(analysis.facts.antiguedadAnios, 5);
  assert.ok(analysis.missingData.includes('fecha de ingreso y fecha de retiro'));
  assert.match(analysis.retrievalQuery, /despid|indemniz|beneficios|vacaciones|sueldo/i);
});