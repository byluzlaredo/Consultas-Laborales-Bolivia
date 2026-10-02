import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeQuery, buildFallbackKeywords } from '../../services/ragChatService.js';

test('caja blanca cubre ramas de calculo y denuncia del analizador RAG', () => {
  // Arrange
  const calculation = analyzeQuery('me despidieron despues de trabajar 5 anos', '');
  const complaint = analyzeQuery('mi jefe me amenaza con quitarme horas pagadas', '');

  // Act
  const intents = [calculation.intent, complaint.intent];

  // Assert
  assert.deepEqual(intents, ['calculo', 'denuncia']);
  assert.equal(calculation.facts.despido, true);
  assert.equal(complaint.facts.posibleConflicto, true);
});

test('el fallback legal conserva terminos relevantes para consultas de despido e indemnizacion', () => {
  const analysis = analyzeQuery('¿Cuánto es la indemnización por despido injustificado en Bolivia?', '');
  const keywords = buildFallbackKeywords(analysis);

  assert.ok(keywords.length > 0);
  assert.ok(keywords.some((keyword) => keyword.includes('despido') || keyword.includes('indemnizacion') || keyword.includes('finiquito')));
});