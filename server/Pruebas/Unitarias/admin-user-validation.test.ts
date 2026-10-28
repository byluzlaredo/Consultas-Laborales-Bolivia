import assert from 'node:assert/strict';
import test from 'node:test';
import { getPasswordRequirementsMessage } from '../../modules/auth/passwordValidation.js';
import { UsersService } from '../../modules/users/users.service.js';
import { readProjectSource } from '../sourceTestUtils.js';

const validAdminInput = {
  nombre: 'Ana',
  apellido: 'Pérez',
  correo: 'ana@example.com',
  password: 'Admin123!',
  passwordConfirm: 'Admin123!',
};

test('valida campos requeridos al crear una cuenta administrativa', () => {
  assert.equal(UsersService.validateAdminUserInput({
    ...validAdminInput,
    nombre: ' ',
  }).valid, false);
});

test('rechaza correo inválido, contraseña débil y confirmación distinta', () => {
  assert.equal(UsersService.validateAdminUserInput({
    ...validAdminInput,
    correo: 'correo-invalido',
  }).error, 'El correo electrónico no es válido');

  assert.equal(UsersService.validateAdminUserInput({
    ...validAdminInput,
    password: 'weakpass',
    passwordConfirm: 'weakpass',
  }).error,
  'La contraseña no cumple los requisitos. Requisitos faltantes: incluir una letra mayúscula, incluir un número, incluir un carácter especial (!@#$%^&*).');

  assert.equal(UsersService.validateAdminUserInput({
    ...validAdminInput,
    passwordConfirm: 'Otra123!',
  }).error, 'Las contraseñas no coinciden');
});

test('indica exactamente cada requisito de contraseña que falta', () => {
  assert.equal(
    getPasswordRequirementsMessage('abc'),
    'La contraseña no cumple los requisitos. Requisitos faltantes: tener al menos 8 caracteres, incluir una letra mayúscula, incluir un número, incluir un carácter especial (!@#$%^&*).'
  );
  assert.equal(
    getPasswordRequirementsMessage('Correcta123!'),
    null
  );
});

test('acepta los datos correctos para el alta administrativa', () => {
  assert.deepEqual(UsersService.validateAdminUserInput(validAdminInput), { valid: true });
});

test('protege el alta admin y fija ambos roles exclusivamente en el backend', () => {
  const serverSource = readProjectSource('server/index.ts');
  const usersSource = readProjectSource('server/modules/users/users.service.ts');
  const authSource = readProjectSource('server/modules/auth/auth.service.ts');

  assert.match(
    serverSource,
    /app\.post\('\/api\/admin\/users', authGuard, adminGuard, createAdminUserController\)/
  );
  assert.match(usersSource, /VALUES \(\$1, \$2, \$3, \$4, NULL, 'ADMINISTRADOR', TRUE, CURRENT_TIMESTAMP\)/);
  assert.match(
    authSource,
    /VALUES \(\$1, \$2, \$3, \$4, \$5, 'USUARIO', TRUE, CURRENT_TIMESTAMP\)/
  );
});
