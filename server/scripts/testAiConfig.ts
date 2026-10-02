import jwt from 'jsonwebtoken';
import { Client } from 'pg';

const baseUrl = process.env.API_URL || 'http://localhost:3001';
const databaseUrl = process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema';

const main = async (): Promise<void> => {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const result = await client.query<{ id_usuario: number; correo: string; rol: string }>(
    'SELECT id_usuario, correo, rol FROM usuario WHERE activo = TRUE ORDER BY id_usuario'
  );
  await client.end();

  const admin = result.rows.find((row) => row.rol === 'ADMINISTRADOR');
  const user = result.rows.find((row) => row.rol === 'USUARIO');
  if (!admin || !user) throw new Error('No existen usuarios de prueba con los roles requeridos.');

  const makeToken = (account: typeof admin): string =>
    jwt.sign({ id: account.id_usuario, correo: account.correo, rol: account.rol }, process.env.JWT_SECRET || 'cambiar-en-produccion', { expiresIn: '5m' });

  const unauthenticated = await fetch(`${baseUrl}/api/ai-config`);
  const generalUser = await fetch(`${baseUrl}/api/ai-config`, {
    headers: { Authorization: `Bearer ${makeToken(user)}` },
  });
  const headers = {
    Authorization: `Bearer ${makeToken(admin)}`,
    'Content-Type': 'application/json',
  };
  const beforeResponse = await fetch(`${baseUrl}/api/ai-config`, { headers });
  const before = await beforeResponse.json() as { data: Record<string, unknown> };
  const saveResponse = await fetch(`${baseUrl}/api/ai-config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      temperatura: 0.7,
      maxTokens: 1536,
      systemPrompt: 'Prueba RF10: responde con tono formal y cita normativa boliviana.',
    }),
  });
  const saved = await saveResponse.json() as { message?: string };
  const afterResponse = await fetch(`${baseUrl}/api/ai-config`, { headers });
  const after = await afterResponse.json() as { data: Record<string, unknown> };

  console.log(`UNAUTHORIZED_STATUS=${unauthenticated.status}`);
  console.log(`GENERAL_USER_STATUS=${generalUser.status}`);
  console.log(`ADMIN_GET_STATUS=${beforeResponse.status}`);
  console.log(`HAS_EXPOSED_KEY=${Object.prototype.hasOwnProperty.call(before.data || {}, 'apiKey') || Object.prototype.hasOwnProperty.call(before.data || {}, 'openaiApiKey')}`);
  console.log(`SAVE_STATUS=${saveResponse.status};MESSAGE=${saved.message}`);
  console.log(`PERSISTED=${after.data?.temperatura === 0.7 && after.data?.maxTokens === 1536 && after.data?.systemPrompt === 'Prueba RF10: responde con tono formal y cita normativa boliviana.'}`);

  await fetch(`${baseUrl}/api/ai-config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      temperatura: before.data.temperatura,
      maxTokens: before.data.maxTokens,
      kChunks: before.data.kChunks,
      systemPrompt: before.data.systemPrompt,
    }),
  });
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
