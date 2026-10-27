import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('usabilidad conserva campos etiquetados en la calculadora', () => {
  // Arrange
  const source = readProjectSource('src/pages/user/BenefitsCalculatorPage.tsx');

  // Act
  const hasLabels = (source.match(/<label\b/g) || []).length >= 5;

  // Assert
  assert.equal(hasLabels, true);
});
