import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../../../modules/auth/auth.service.js';

test('seguridad de datos no expone el hash de contrasena en la respuesta de usuario', () => {
  // Arrange
  const user = {
    id_usuario: 42,
    nombre: 'Ana',
    apellido: 'Perez',
    departamento: 'La Paz' as const,
    correo: 'ana@example.bo',
    password_hash: 'hash-privado-no-debe-exponerse',
    rol: 'USUARIO' as const,
    activo: true,
    fecha_registro: '2026-09-30T00:00:00.000Z',
    ultimo_acceso: null,
  };

  // Act
  const response = AuthService.toUserResponse(user);

  // Assert
  assert.equal('password_hash' in response, false);
  assert.equal(JSON.stringify(response).includes(user.password_hash), false);
  assert.equal(response.correo, user.correo);
});