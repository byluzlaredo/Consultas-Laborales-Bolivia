import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../../modules/auth/auth.service.js';

const validRegistration = {
  nombre: 'Ana',
  apellido: 'Perez',
  correo: 'ana@example.bo',
  password: 'Seguro123!',
  passwordConfirm: 'Seguro123!',
  departamento: 'La Paz' as const,
};

test('caja blanca valida correo y complejidad de contraseña mediante regex', () => {
  // Arrange
  const invalidEmails = ['ana example.bo', 'ana@', '@example.bo', 'ana@example'];
  const invalidPasswords = ['seguro123!', 'Seguroseguro!', 'Seguro123'];

  // Act
  const validResult = AuthService.validateRegisterInput(validRegistration);
  const emailResults = invalidEmails.map((correo) =>
    AuthService.validateRegisterInput({ ...validRegistration, correo })
  );
  const passwordResults = invalidPasswords.map((password) =>
    AuthService.validateRegisterInput({ ...validRegistration, password, passwordConfirm: password })
  );

  // Assert
  assert.deepEqual(validResult, { valid: true });
  assert.ok(emailResults.every((result) => !result.valid && result.error === 'El correo electrónico no es válido'));
  assert.ok(passwordResults.every((result) => !result.valid && result.error === 'La contraseña debe contener mayúscula, número y carácter especial'));
});