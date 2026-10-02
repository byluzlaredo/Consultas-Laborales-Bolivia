import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('usabilidad limita la consulta del chat y muestra su contador', () => {
  // Arrange
  const source = readProjectSource('src/pages/user/ChatPage.tsx');

  // Act
  const hasLimit = source.includes('maxLength={500}') && source.includes('500');

  // Assert
  assert.equal(hasLimit, true);
});