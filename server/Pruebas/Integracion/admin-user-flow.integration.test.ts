import assert from 'node:assert/strict';
import test from 'node:test';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { config } from '../../config/index.js';

interface ApiUser {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: 'USUARIO' | 'ADMINISTRADOR';
}

interface ApiBody {
  success?: boolean;
  message?: string;
  token?: string;
  user?: ApiUser;
  data?: ApiUser | ApiUser[];
}

const apiUrl = process.env.API_URL || `http://127.0.0.1:${config.server.port}`;
const database = new Pool({ connectionString: config.database.sistema });

const apiRequest = async (
  path: string,
  options: { method?: string; token?: string; body?: Record<string, unknown> } = {}
): Promise<{ status: number; body: ApiBody }> => {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  return {
    status: response.status,
    body: await response.json() as ApiBody,
  };
};

test('flujo completo de creación, acceso y separación de cuentas administrativas', async () => {
  const testId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const adminEmail = `qa-admin-${testId}@example.invalid`;
  const userEmail = `qa-user-${testId}@example.invalid`;
  const password = 'AdminTest123!';
  const regularPassword = 'UserTest123!';

  try {
    const existingAdminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { correo: config.admin.email, password: config.admin.password },
    });
    assert.equal(existingAdminLogin.status, 200);
    assert.equal(existingAdminLogin.body.user?.rol, 'ADMINISTRADOR');
    const adminToken = existingAdminLogin.body.token;
    assert.ok(adminToken);

    const createdAdmin = await apiRequest('/api/admin/users', {
      method: 'POST',
      token: adminToken,
      body: {
        nombre: 'QA',
        apellido: 'Administrator',
        correo: adminEmail,
        password,
        passwordConfirm: password,
        rol: 'USUARIO',
      },
    });
    assert.equal(createdAdmin.status, 201);
    assert.equal((createdAdmin.body.data as ApiUser).rol, 'ADMINISTRADOR');

    const databaseAdmin = await database.query(
      'SELECT id_usuario, rol, password_hash FROM usuario WHERE correo = $1',
      [adminEmail]
    );
    assert.equal(databaseAdmin.rowCount, 1);
    assert.equal(databaseAdmin.rows[0].rol, 'ADMINISTRADOR');
    assert.ok(await bcrypt.compare(password, databaseAdmin.rows[0].password_hash));

    const adminList = await apiRequest('/api/admin/users', { token: adminToken });
    assert.equal(adminList.status, 200);
    const listedUsers = adminList.body.data as ApiUser[];
    assert.ok(listedUsers.some((user) => user.correo === adminEmail && user.rol === 'ADMINISTRADOR'));

    const newAdminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { correo: adminEmail, password },
    });
    assert.equal(newAdminLogin.status, 200);
    assert.equal(newAdminLogin.body.user?.rol, 'ADMINISTRADOR');
    assert.equal(
      (await apiRequest('/api/admin/users', { token: newAdminLogin.body.token })).status,
      200
    );

    const publicRegistration = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        nombre: 'QA',
        apellido: 'Public',
        correo: userEmail,
        password: regularPassword,
        passwordConfirm: regularPassword,
        departamento: 'La Paz',
        rol: 'ADMINISTRADOR',
      },
    });
    assert.equal(publicRegistration.status, 201);
    assert.equal(publicRegistration.body.user?.rol, 'USUARIO');

    const regularUserToken = publicRegistration.body.token;
    assert.ok(regularUserToken);
    assert.equal(
      (await apiRequest('/api/admin/users', {
        method: 'POST',
        token: regularUserToken,
        body: {
          nombre: 'Intruder',
          apellido: 'Test',
          correo: `intruder-${testId}@example.invalid`,
          password,
          passwordConfirm: password,
        },
      })).status,
      403
    );
    assert.equal((await apiRequest('/api/admin/users', { token: regularUserToken })).status, 403);

    const duplicateAdmin = await apiRequest('/api/admin/users', {
      method: 'POST',
      token: adminToken,
      body: {
        nombre: 'QA',
        apellido: 'Duplicate',
        correo: adminEmail.toUpperCase(),
        password,
        passwordConfirm: password,
      },
    });
    assert.equal(duplicateAdmin.status, 409);
    assert.match(duplicateAdmin.body.message || '', /registrado/i);

    const duplicatePublicRegistration = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        nombre: 'QA',
        apellido: 'Duplicate',
        correo: adminEmail,
        password: regularPassword,
        passwordConfirm: regularPassword,
        departamento: 'La Paz',
      },
    });
    assert.equal(duplicatePublicRegistration.status, 409);
    assert.match(duplicatePublicRegistration.body.message || '', /registrado/i);

    const separatedList = await apiRequest('/api/admin/users', { token: adminToken });
    assert.equal(separatedList.status, 200);
    const separatedUsers = separatedList.body.data as ApiUser[];
    assert.ok(separatedUsers.some((user) => user.correo === adminEmail && user.rol === 'ADMINISTRADOR'));
    assert.ok(separatedUsers.some((user) => user.correo === userEmail && user.rol === 'USUARIO'));
    assert.ok(!separatedUsers.some((user) => user.correo === adminEmail && user.rol === 'USUARIO'));
    assert.ok(!separatedUsers.some((user) => user.correo === userEmail && user.rol === 'ADMINISTRADOR'));

    assert.equal(
      (await apiRequest('/api/admin/users', {
        method: 'POST',
        body: { nombre: 'NoAuth' },
      })).status,
      401
    );
  } finally {
    await database.query(
      'DELETE FROM usuario WHERE correo = ANY($1::text[])',
      [[adminEmail, userEmail]]
    );
    await database.end();
  }
});
