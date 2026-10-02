import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeQuery } from '../../services/ragChatService.js';

test('conserva el contexto de una consulta de seguimiento y sus datos', () => {
  // Arrange
  const query = 'mes 1305 mes 1300 mess2000 tengo 5 días de vacaciones';
  const history = 'Usuario: me despidieron, trabajé 5 años\nAsistente: necesito tus sueldos y vacaciones pendientes.';

  // Act
  const analysis = analyzeQuery(query, history);

  // Assert
  assert.equal(analysis.intent, 'calculo');
  assert.equal(analysis.facts.despido, true);
  assert.equal(analysis.facts.antiguedadAnios, 5);
  assert.equal(analysis.facts.vacacionesDias, 5);
  assert.match(analysis.retrievalQuery, /1305|salarios|vacaciones|despido|antiguedad/i);
  assert.match(analysis.retrievalQuery, /trabajé 5 años/i);
});