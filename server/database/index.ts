import { Pool, type PoolClient } from 'pg';
import { config } from '../config/index.js';

// Pool para la base de datos de sistema
const poolSistema = new Pool({
  connectionString: config.database.sistema,
});

// Pool para la base de datos vectorial
const poolVectorial = new Pool({
  connectionString: config.database.vectorial,
});

poolSistema.on('error', (err) => {
  console.error('Error en pool de sistema:', err);
});

poolVectorial.on('error', (err) => {
  console.error('Error en pool vectorial:', err);
});

export const queryDb = async <T = any>(
  query: string,
  params?: any[],
  useVectorialDb: boolean = false
): Promise<T[]> => {
  const pool = useVectorialDb ? poolVectorial : poolSistema;
  const result = await pool.query(query, params);
  return result.rows as T[];
};

export const queryDbSingle = async <T = any>(
  query: string,
  params?: any[],
  useVectorialDb: boolean = false
): Promise<T | null> => {
  const pool = useVectorialDb ? poolVectorial : poolSistema;
  const result = await pool.query(query, params);
  return (result.rows[0] as T) || null;
};

export const execDb = async (
  query: string,
  params?: any[],
  useVectorialDb: boolean = false
): Promise<number> => {
  const pool = useVectorialDb ? poolVectorial : poolSistema;
  const result = await pool.query(query, params);
  return result.rowCount || 0;
};

export const getClient = async (useVectorialDb: boolean = false): Promise<PoolClient> => {
  const pool = useVectorialDb ? poolVectorial : poolSistema;
  return pool.connect();
};

export const closeConnections = async (): Promise<void> => {
  await poolSistema.end();
  await poolVectorial.end();
};

export { poolSistema, poolVectorial };
