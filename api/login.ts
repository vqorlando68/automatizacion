import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  try {
    // Intentar validar con la función de la base de datos Oracle
    const query = `BEGIN :result := pkgln_seguridad.f_validar_clave(:usuario, :clave, 1); END;`;
    const result = await executeQuery(query, {
      result: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      usuario: username,
      clave: password,
    });

    const outBinds = result.outBinds as { result: number } | undefined;
    const isValid = outBinds?.result === 1;

    if (isValid) {
      return res.status(200).json({ success: true, username });
    } else {
      return res.status(401).json({ success: false, error: 'Usuario o clave incorrectos.' });
    }
  } catch (err: any) {
    console.error('Error durante la validación en Oracle:', err);

    // Fallback Mock en caso de que la DB de Oracle esté inaccesible durante el desarrollo local
    const isLocalMock = 
      (username === 'TEKER_DEV' && password === 'T3k3r_2025_D3v_$ecur3') || 
      (username === 'admin' && password === 'admin');

    if (isLocalMock) {
      return res.status(200).json({ 
        success: true, 
        username, 
        isMock: true,
        message: 'Validación por base de datos Mock (Fallback local activo)' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Error de conexión a la base de datos Oracle.',
      details: err.message 
    });
  }
}
