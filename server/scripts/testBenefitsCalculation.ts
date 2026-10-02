import { Client } from 'pg';
import { config } from '../config/index.js';

const baseUrl = process.env.API_URL || 'http://localhost:3001';

const main = async (): Promise<void> => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: config.admin.email, password: config.admin.password }),
  });
  const login = await loginResponse.json() as { token?: string; user?: { id_usuario: number } };
  if (!login.token || !login.user) throw new Error('No se pudo autenticar el usuario de prueba.');
  const headers = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };

  const invalidResponse = await fetch(`${baseUrl}/api/laboral/calculations`, {
    method: 'POST', headers, body: JSON.stringify({ fechaIngreso: '31/02/2024', fechaRetiro: '01/03/2024', motivo: 'Renuncia Voluntaria', salarioMes1: -1, salarioMes2: 0, salarioMes3: 1000 }),
  });
  const invalid = await invalidResponse.json() as { message?: string };

  const validResponse = await fetch(`${baseUrl}/api/laboral/calculations`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ fechaIngreso: '15/01/2021', fechaRetiro: '15/01/2024', motivo: 'Despido Injustificado', salarioMes1: 3500, salarioMes2: 3500, salarioMes3: 3500, diasVacacionesPendientes: 15, userId: 999999 }),
  });
  const valid = await validResponse.json() as { data?: { calculationId: number; resultado: { spi: number; indemnizacion: { subtotal: number }; aguinaldo: { subtotal: number }; vacaciones: { subtotal: number }; totalFiniquito: number } } };

  const client = new Client({ connectionString: config.database.sistema });
  await client.connect();
  const persisted = valid.data
    ? await client.query<{ id_usuario: number; resultado: number }>('SELECT id_usuario, resultado FROM calculo_laboral WHERE id_calculo = $1', [valid.data.calculationId])
    : { rows: [] };
  await client.end();

  console.log(`INVALID_STATUS=${invalidResponse.status};INVALID_MESSAGE=${invalid.message}`);
  console.log(`VALID_STATUS=${validResponse.status};OWNER_MATCHES_TOKEN=${persisted.rows[0]?.id_usuario === login.user.id_usuario}`);
  console.log(`BREAKDOWN=${JSON.stringify(valid.data?.resultado)}`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
