import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectSource } from '../sourceTestUtils.js';

test('usabilidad ofrece navegacion mediante enlaces de React Router', () => {
  // Arrange
  const source = readProjectSource('src/components/Navbar.tsx');

  // Act
  const hasNavigation = source.includes('<Link') || source.includes('<NavLink');

  // Assert
  assert.equal(hasNavigation, true);
});