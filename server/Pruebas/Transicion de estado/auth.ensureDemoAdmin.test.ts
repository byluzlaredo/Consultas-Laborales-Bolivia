import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { Client } from 'pg';
import { config } from '../../config/index.js';

const ADMIN_EMAIL = config.admin.email;
const ADMIN_PASSWORD = config.admin.password;

const getAdminHash = async (): Promise<string | null> => {
  const client = new Client({ connectionString: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema' });
  await client.connect();
  try {
    const result = await client.query<{ password_hash: string }>(
      'SELECT password_hash FROM usuario WHERE LOWER(correo) = LOWER($1)',
      [ADMIN_EMAIL]
    );
    return result.rows[0]?.password_hash ?? null;
  } finally {
    await client.end();
  }
};

test('admin demo debe mantener la contraseña válida por defecto', async () => {
  // Arrange
  const passwordHash = await getAdminHash();

  // Act
  assert.ok(passwordHash, 'Debe existir el usuario administrador');
  const matches = await bcrypt.compare(ADMIN_PASSWORD, passwordHash as string);

  // Assert
  assert.equal(matches, true, 'La contraseña del administrador debe coincidir con la configuración por defecto');
});
