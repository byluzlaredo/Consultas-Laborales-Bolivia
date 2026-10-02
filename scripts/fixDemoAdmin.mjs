import bcrypt from 'bcrypt';
import { Client } from 'pg';

const client = new Client({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:55432/db_sistema',
});

try {
  await client.connect();
  const passwordHash = await bcrypt.hash('Admin123!', 10);
  const existing = await client.query(
    'SELECT id_usuario FROM usuario WHERE LOWER(correo)=LOWER($1)',
    ['admin@consulta.bo']
  );

  if (existing.rowCount > 0) {
    await client.query(
      'UPDATE usuario SET password_hash=$1, rol=$2, activo=TRUE, updated_at=CURRENT_TIMESTAMP WHERE id_usuario=$3',
      [passwordHash, 'ADMINISTRADOR', existing.rows[0].id_usuario]
    );
    console.log('updated', existing.rows[0].id_usuario);
  } else {
    await client.query(
      "INSERT INTO usuario (nombre, apellido, correo, password_hash, rol, activo, fecha_registro, updated_at) VALUES ($1, $2, $3, $4, 'ADMINISTRADOR', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      ['Administrador', 'Demo', 'admin@consulta.bo', passwordHash]
    );
    console.log('created');
  }
} finally {
  await client.end();
}
