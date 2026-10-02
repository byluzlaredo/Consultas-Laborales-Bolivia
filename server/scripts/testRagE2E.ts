import jwt from 'jsonwebtoken';
import { Client } from 'pg';
import { config } from '../config/index.js';

const baseUrl = process.env.API_URL || 'http://localhost:3001';

const main = async (): Promise<void> => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: config.admin.email, password: config.admin.password }),
  });
  const login = await loginResponse.json() as { token?: string };
  if (!loginResponse.ok || !login.token) throw new Error(`Login admin falló: HTTP ${loginResponse.status}`);

  const headers = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };
  const emptyResponse = await fetch(`${baseUrl}/api/chat/query`, {
    method: 'POST', headers, body: JSON.stringify({ question: '   ' }),
  });
  const empty = await emptyResponse.json() as { message?: string };

  const query = '¿Qué establece la Ley General del Trabajo sobre la jornada laboral?';
  const queryResponse = await fetch(`${baseUrl}/api/chat/query`, {
    method: 'POST', headers, body: JSON.stringify({ question: query }),
  });
  const queryBody = await queryResponse.json() as {
    success?: boolean;
    message?: string;
    data?: { chatId: number; citations: Array<unknown>; references: Array<unknown>; answer: string };
  };

  const chatsResponse = await fetch(`${baseUrl}/api/chat`, { headers });
  const chats = await chatsResponse.json() as { data?: Array<{ id: number }> };
  const chatId = queryBody.data?.chatId || chats.data?.[0]?.id;
  const detailResponse = chatId
    ? await fetch(`${baseUrl}/api/chat/${chatId}`, { headers })
    : null;
  const detail = detailResponse ? await detailResponse.json() as { data?: { messages: Array<unknown> } } : null;

  const client = new Client({ connectionString: config.database.sistema });
  await client.connect();
  const userRows = await client.query<{ id_usuario: number; correo: string }>(
    "SELECT id_usuario, correo FROM usuario WHERE rol = 'USUARIO' AND activo = TRUE ORDER BY id_usuario LIMIT 1"
  );
  await client.end();

  const otherUserToken = userRows.rows[0]
    ? jwt.sign({ id: userRows.rows[0].id_usuario, correo: userRows.rows[0].correo, rol: 'USUARIO' }, config.jwt.secret, { expiresIn: '5m' })
    : '';
  const ownershipResponse = chatId && otherUserToken
    ? await fetch(`${baseUrl}/api/chat/${chatId}`, { headers: { Authorization: `Bearer ${otherUserToken}` } })
    : null;

  console.log(`EMPTY_STATUS=${emptyResponse.status};EMPTY_MESSAGE=${empty.message}`);
  console.log(`QUERY_STATUS=${queryResponse.status};QUERY_SUCCESS=${queryBody.success === true}`);
  console.log(`HAS_CITATIONS=${Boolean(queryBody.data?.citations?.length)};HAS_REFERENCES=${Boolean(queryBody.data?.references?.length)}`);
  console.log(`HISTORY_LIST_STATUS=${chatsResponse.status};HISTORY_DETAIL_STATUS=${detailResponse?.status ?? 'SKIPPED'}`);
  console.log(`HISTORY_MESSAGES=${detail?.data?.messages?.length ?? 0}`);
  console.log(`OTHER_USER_STATUS=${ownershipResponse?.status ?? 'SKIPPED'}`);
  if (!queryResponse.ok) console.log(`QUERY_ERROR=${queryBody.message || 'sin mensaje'}`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
