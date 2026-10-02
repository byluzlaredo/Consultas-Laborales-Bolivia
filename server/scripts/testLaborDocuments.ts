import { Document, Packer, Paragraph } from 'docx';
import { jsPDF } from 'jspdf';
import { Client } from 'pg';
import { config } from '../config/index.js';

const baseUrl = process.env.API_URL || 'http://localhost:3001';

const main = async (): Promise<void> => {
  const unauthorized = await fetch(`${baseUrl}/api/laboral/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo: 'Carta de Renuncia', titulo: 'Prueba', contenido: 'Prueba', formato: 'PDF' }),
  });
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: config.admin.email, password: config.admin.password }),
  });
  const login = await loginResponse.json() as { token?: string; user?: { id_usuario: number } };
  if (!login.token || !login.user) throw new Error('No se pudo autenticar el usuario de prueba.');
  const headers = { Authorization: `Bearer ${login.token}`, 'Content-Type': 'application/json' };
  const missingResponse = await fetch(`${baseUrl}/api/laboral/documents`, {
    method: 'POST', headers, body: JSON.stringify({ tipo: 'Carta de Renuncia', titulo: '', contenido: '', formato: 'PDF' }),
  });
  const missing = await missingResponse.json() as { message?: string };
  const documentResponse = await fetch(`${baseUrl}/api/laboral/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ userId: 999999, tipo: 'Denuncia Laboral', titulo: 'Denuncia especial', contenido: 'Texto con caracteres: áéíóú ñ ¿? & <script>', formato: 'DOCX' }),
  });
  const documentBody = await documentResponse.json() as { data?: { id_documento: number; id_usuario: number; formato: string } };

  const pdf = new jsPDF();
  pdf.text('Documento laboral válido', 10, 10);
  const pdfBytes = new Uint8Array(await (pdf.output('arraybuffer') as ArrayBuffer));
  const docx = await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph('Documento laboral válido')] }] }));
  const docxBytes = new Uint8Array(docx);

  const client = new Client({ connectionString: config.database.sistema });
  await client.connect();
  const persisted = documentBody.data
    ? await client.query<{ id_usuario: number; formato: string }>('SELECT id_usuario, formato FROM documento_laboral WHERE id_documento = $1', [documentBody.data.id_documento])
    : { rows: [] };
  await client.end();

  console.log(`UNAUTHORIZED_STATUS=${unauthorized.status}`);
  console.log(`MISSING_STATUS=${missingResponse.status};MISSING_MESSAGE=${missing.message}`);
  console.log(`DOCUMENT_STATUS=${documentResponse.status};OWNER_MATCHES_TOKEN=${persisted.rows[0]?.id_usuario === login.user.id_usuario};FORMAT=${persisted.rows[0]?.formato}`);
  console.log(`PDF_SIGNATURE=${Buffer.from(pdfBytes.slice(0, 5)).toString('ascii')}`);
  console.log(`DOCX_ZIP_SIGNATURE=${Buffer.from(docxBytes.slice(0, 2)).toString('ascii')}`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
