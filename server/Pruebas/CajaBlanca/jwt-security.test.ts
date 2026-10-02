import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { AuthService } from '../../modules/auth/auth.service.js';

test('caja blanca firma JWT con claims y rechaza tokens manipulados o vencidos', () => {
  // Arrange
  const user = {
    id_usuario: 42,
    nombre: 'Ana',
    apellido: 'Perez',
    departamento: 'La Paz' as const,
    correo: 'ana@example.bo',
    password_hash: 'no-debe-incluirse',
    rol: 'USUARIO' as const,
    activo: true,
    fecha_registro: '2026-09-30T00:00:00.000Z',
    ultimo_acceso: null,
  };
  const token = AuthService.generateToken(user);
  const expiredToken = jwt.sign(
    { id: user.id_usuario, correo: user.correo, rol: user.rol },
    config.jwt.secret,
    { expiresIn: -1 }
  );
  const [header, payload, signature] = token.split('.');
  const tamperedSignature = `${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
  const tamperedToken = `${header}.${payload}.${tamperedSignature}`;

  // Act
  const decoded = AuthService.verifyToken(token);

  // Assert
  assert.deepEqual(
    { id: decoded.id, correo: decoded.correo, rol: decoded.rol },
    { id: 42, correo: 'ana@example.bo', rol: 'USUARIO' }
  );
  assert.equal('password_hash' in decoded, false);
  assert.throws(() => AuthService.verifyToken(tamperedToken));
  assert.throws(() => AuthService.verifyToken(expiredToken));
});