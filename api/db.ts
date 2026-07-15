import oracledb from 'oracledb';
import dotenv from 'dotenv';

// Cargar variables de entorno desde .env
dotenv.config();

// Habilitar Thin Mode (driver puro JS, compatible con Vercel serverless)
try {
  oracledb.initOracleClient = () => {};
} catch {
  // Ignorar si ya está inicializado
}

// Limpiar la contraseña si viene con la barra invertida de escape (e.g. \$ecur3 -> $ecur3)
let dbPassword = process.env.ORACLE_DB_PASSWORD || '';
if (dbPassword.includes('\\$')) {
  dbPassword = dbPassword.replace('\\$', '$');
}

const dbUser = process.env.ORACLE_DB_USER;
const dbConnectString = process.env.ORACLE_DB_CONNECTION_STRING;

let pool: oracledb.Pool | null = null;
let dbOffline = false;
let lastOfflineCheck = 0;
const RETRY_COOLDOWN = 10000; // 10 segundos de cooldown

export async function getPool(): Promise<oracledb.Pool> {
  if (dbOffline && Date.now() - lastOfflineCheck < RETRY_COOLDOWN) {
    throw new Error('La base de datos Oracle está marcada como offline temporalmente.');
  }

  if (pool) return pool;

  if (!dbUser || !dbPassword || !dbConnectString) {
    throw new Error('Faltan variables de entorno para la conexión de base de datos.');
  }

  try {
    pool = await oracledb.createPool({
      user: dbUser,
      password: dbPassword,
      connectString: dbConnectString,
      poolMin: 1,
      poolMax: 4,
      poolIncrement: 1,
      poolTimeout: 30,
    });
    dbOffline = false;
    return pool;
  } catch (err) {
    dbOffline = true;
    lastOfflineCheck = Date.now();
    console.error('Error al inicializar el Pool de Oracle:', err);
    throw err;
  }
}

export async function getConnection(): Promise<oracledb.Connection> {
  const p = await getPool();
  return p.getConnection();
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<oracledb.Result<T>> {
  try {
    const conn = await getConnection();
    try {
      const result = await conn.execute<T>(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options,
      });
      return result;
    } finally {
      await conn.close();
    }
  } catch (err) {
    console.warn('[DB Warning] Conexión directa a Oracle DB falló. Fallback activo.', err);
    throw err;
  }
}
