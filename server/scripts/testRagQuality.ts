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
  if (!login.token) throw new Error('Login falló.');
  const headers = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };

  const firstResponse = await fetch(`${baseUrl}/api/chat/query`, {
    method: 'POST', headers, body: JSON.stringify({ question: 'necesito saber cuánto cobrar si me despidieron, trabajé 5 años' }),
  });
  const first = await firstResponse.json() as { data?: { chatId: number; analysis: { intent: string; facts: Record<string, unknown>; missingData: string[] }; citations: Array<{ articulo: string; normativa: string }> } };
  const chatId = first.data?.chatId;
  const followUpResponse = chatId ? await fetch(`${baseUrl}/api/chat/query`, {
    method: 'POST', headers, body: JSON.stringify({ chatId, question: 'mes 1305 mes 1300 mess2000 tengo 5 días de vacaciones' }),
  }) : null;
  const followUp = followUpResponse ? await followUpResponse.json() as { data?: { analysis: { facts: Record<string, unknown>; missingData: string[] }; citations: Array<{ articulo: string; normativa: string }> } } : null;
  const narrativeResponse = await fetch(`${baseUrl}/api/chat/query`, {
    method: 'POST', headers, body: JSON.stringify({ question: 'mi jefe me dijo vamos a comer o te quito horas de trabajo pagadas' }),
  });
  const narrative = await narrativeResponse.json() as { data?: { analysis: { intent: string; facts: Record<string, unknown>; missingData: string[] }; citations: Array<{ articulo: string; normativa: string }> } };

  const client = new Client({ connectionString: config.database.sistema });
  await client.connect();
  const count = await client.query<{ total: string }>('SELECT count(*) AS total FROM consulta WHERE id_chat = $1', [chatId]);
  await client.end();

  console.log(`FIRST_STATUS=${firstResponse.status};FIRST_INTENT=${first.data?.analysis.intent};YEARS=${first.data?.analysis.facts.antiguedadAnios}`);
  console.log(`FIRST_CITATIONS=${first.data?.citations.map((citation) => citation.articulo).join(' | ')}`);
  console.log(`FOLLOWUP_STATUS=${followUpResponse?.status};SALARIES=${followUp?.data?.analysis.facts.salariosMencionados};VACATION_DAYS=${followUp?.data?.analysis.facts.vacacionesDias};CHAT_MESSAGES=${count.rows[0]?.total}`);
  console.log(`NARRATIVE_STATUS=${narrativeResponse.status};NARRATIVE_INTENT=${narrative.data?.analysis.intent};MISSING=${narrative.data?.analysis.missingData.join(' | ')}`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
