import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { askLegalQuestion } from '../services/ragChatService';

const pool = new Pool({ connectionString: process.env.DATABASE_SISTEMA_URL || 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema' });

export const INVALID_QUERY_MESSAGE = 'Ingrese una consulta válida para procesar';
export const GENERATION_ERROR_MESSAGE = 'Ocurrió un error al generar la respuesta. Por favor intente nuevamente';
export const HISTORY_ERROR_MESSAGE = 'Error al guardar la interacción en el historial';

const laborTerms = /\b(emplead\w*|trabaj\w*|laboral\w*|sueldo\w*|salari\w*|despid\w*|contrat\w*|verbal\w*|prueb\w*|period\w*|vacacion\w*|aguinaldo\w*|benefici\w*|indemniz\w*|quinquen\w*|jornada\w*|hora\w*|extra\w*|nocturn\w*|domingo\w*|feriad\w*|licencia\w*|matern\w*|patern\w*|lactanc\w*|duelo\w*|fallec\w*|seguridad social|finiquito\w*|renunci\w*|acos\w*|hostig\w*|molest\w*|intimid\w*|violenc\w*|sindicat\w*|pago\w*|bono\w*|descuent\w*|mínim\w*|minim\w*|reclamo\w*|denunci\w*|conciliaci\w*|jefatura\w*|realidad\w*|inamovilidad\w*|acumul\w*|ley\w*|decreto\w*|art[ií]culo\w*|normativ\w*|derech\w*|obligaci\w*|pued\w*|correspond\w*|debo\w*|teng\w*|caso\w*|problem\w*|empleador\w*|empres\w*|cargo\w*|puesto\w*|horario\w*|descans\w*|seguro\w*|aporte\w*|preaviso\w*|liquidaci\w*|juicio\w*|firma\w*|document\w*|carta\w*)\b/i;

export const isValidLaborQuery = (question: string): boolean => {
  const normalized = question.trim();
  if (!normalized || normalized.length < 5 || !/[a-záéíóúñ]/i.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  const letters = normalized.match(/[a-záéíóúñ]/gi) || [];
  const vowels = normalized.match(/[aeiouáéíóú]/gi) || [];
  return words.length >= 2 && letters.length >= 4 && vowels.length / letters.length >= 0.2;
};

const isValidFollowUp = (question: string): boolean => {
  const normalized = question.trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const letters = normalized.match(/[a-záéíóúñ]/gi) || [];
  return normalized.length >= 2 && words.length >= 2 && letters.length >= 3;
};

export const postChatQuery = async (req: Request, res: Response): Promise<void> => {
  const question = typeof req.body.question === 'string'
    ? req.body.question.replace(/\s+/g, ' ').trim()
    : '';
  const requestedChatId = Number(req.body.chatId);
  const userId = req.user?.id;

  if (question.length > 500) {
    res.status(400).json({ success: false, message: 'La consulta excede el límite permitido de 500 caracteres' });
    return;
  }

  try {
    if (!userId) {
      res.status(401).json({ success: false, message: 'Sesión no válida' });
      return;
    }

    let chatId = Number.isInteger(requestedChatId) && requestedChatId > 0 ? requestedChatId : null;
    let hasPreviousMessages = false;
    if (chatId) {
      const chat = await pool.query('SELECT id_chat FROM chat WHERE id_chat = $1 AND id_usuario = $2', [chatId, userId]);
      if (!chat.rowCount) {
        res.status(404).json({ success: false, message: 'Conversación no encontrada' });
        return;
      }
      const messageCount = await pool.query('SELECT 1 FROM consulta WHERE id_chat = $1 LIMIT 1', [chatId]);
      hasPreviousMessages = Boolean(messageCount.rowCount);
    }
    if (!isValidLaborQuery(question) && !(chatId && hasPreviousMessages && isValidFollowUp(question))) {
      res.status(400).json({ success: false, message: INVALID_QUERY_MESSAGE });
      return;
    }
    if (!chatId) {
      const chat = await pool.query<{ id_chat: number }>(
        'INSERT INTO chat (id_usuario, titulo) VALUES ($1, $2) RETURNING id_chat',
        [userId, question.trim().slice(0, 255)]
      );
      chatId = chat.rows[0].id_chat;
    }

    const previous = await pool.query<{ pregunta: string; contenido: string }>(
      `SELECT c.pregunta, r.contenido
       FROM consulta c JOIN respuesta r ON r.id_consulta = c.id_consulta
       WHERE c.id_chat = $1 ORDER BY c.fecha_consulta DESC LIMIT 6`,
      [chatId]
    );
    const conversationContext = previous.rows.reverse().map((item) => `Usuario: ${item.pregunta}\nAsistente: ${item.contenido}`).join('\n\n');
    const result = await askLegalQuestion(question, conversationContext);

    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const consultation = await client.query<{ id_consulta: number }>(
          `INSERT INTO consulta (id_chat, pregunta, tipo_consulta, estado) VALUES ($1, $2, $3, 'respondida') RETURNING id_consulta`,
          [chatId, question, 'CONSULTA_LABORAL']
        );
        const response = await client.query<{ id_respuesta: number }>(
          `INSERT INTO respuesta (id_consulta, modelo_ia, contenido) VALUES ($1, $2, $3) RETURNING id_respuesta`,
          [consultation.rows[0].id_consulta, 'rag-legal', result.answer]
        );
        for (const reference of result.references) {
          await client.query(
            `INSERT INTO referencia_legal (id_respuesta, id_fragmento, relevancia) VALUES ($1, $2, $3)`,
            [response.rows[0].id_respuesta, reference.fragmentId, reference.relevance]
          );
        }
        await client.query('COMMIT');
        res.json({ success: true, data: { ...result, chatId, consultationId: consultation.rows[0].id_consulta, responseId: response.rows[0].id_respuesta } });
      } catch (historyError) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error('Error al guardar la interacción en el historial', historyError);
        res.status(500).json({ success: false, message: HISTORY_ERROR_MESSAGE });
      } finally {
        client.release();
      }
    } catch (historyError) {
      console.error('Error al abrir la transacción del historial', historyError);
      res.status(500).json({ success: false, message: HISTORY_ERROR_MESSAGE });
    }
  } catch (error) {
    console.error('Error en la consulta RAG', error);
    if (error instanceof Error && error.name === 'TimeoutError') {
      res.status(504).json({
        success: false,
        message: 'El modelo está tardando demasiado en responder. Intenta una consulta más breve.',
      });
      return;
    }
    res.status(503).json({ success: false, message: GENERATION_ERROR_MESSAGE });
  }
};

export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const result = await pool.query(
      `SELECT ch.id_chat AS id, ch.titulo AS title, ch.fecha_creacion AS "createdAt",
              COUNT(c.id_consulta)::int AS "messageCount",
              MAX(COALESCE(r.fecha_respuesta, c.fecha_consulta)) AS "updatedAt"
       FROM chat ch LEFT JOIN consulta c ON c.id_chat = ch.id_chat
       LEFT JOIN respuesta r ON r.id_consulta = c.id_consulta
       WHERE ch.id_usuario = $1 GROUP BY ch.id_chat ORDER BY "updatedAt" DESC NULLS LAST`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error al listar conversaciones', error);
    res.status(500).json({ success: false, message: 'No se pudo cargar el historial de conversaciones' });
  }
};

export const getChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const chatId = Number(req.params.id);
    const chat = await pool.query('SELECT id_chat AS id, titulo AS title, fecha_creacion AS "createdAt" FROM chat WHERE id_chat = $1 AND id_usuario = $2', [chatId, userId]);
    if (!chat.rowCount) {
      res.status(404).json({ success: false, message: 'Conversación no encontrada' });
      return;
    }
    const messages = await pool.query(
      `SELECT c.id_consulta AS "consultationId", c.pregunta AS question, c.fecha_consulta AS "createdAt",
              r.id_respuesta AS "responseId", r.contenido AS answer, r.fecha_respuesta AS "answeredAt"
       FROM consulta c LEFT JOIN respuesta r ON r.id_consulta = c.id_consulta
       WHERE c.id_chat = $1 ORDER BY c.fecha_consulta ASC`,
      [chatId]
    );
    res.json({ success: true, data: { ...chat.rows[0], messages: messages.rows } });
  } catch (error) {
    console.error('Error al obtener conversación', error);
    res.status(500).json({ success: false, message: 'No se pudo cargar la conversación' });
  }
};
