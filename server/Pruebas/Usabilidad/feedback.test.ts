import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('usabilidad muestra estados de error y carga en acciones principales', () => {
  // Arrange
  const calculator = readProjectSource('src/pages/user/BenefitsCalculatorPage.tsx');
  const history = readProjectSource('src/pages/user/HistoryPage.tsx');

  // Act
  const hasFeedback = calculator.includes('setError') && calculator.includes('loading') && history.includes('role="alert"');

  // Assert
  assert.equal(hasFeedback, true);
});