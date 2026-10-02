import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('usabilidad usa restricciones responsive en el historial', () => {
  // Arrange
  const source = readProjectSource('src/pages/user/HistoryPage.tsx');

  // Act
  const hasResponsiveLayout = source.includes('max-w-6xl') && source.includes('lg:grid-cols-3') && source.includes('flex-wrap');

  // Assert
  assert.equal(hasResponsiveLayout, true);
});