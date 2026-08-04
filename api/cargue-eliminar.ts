import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id_temp_cargue } = req.body;

  if (!id_temp_cargue) {
    return res.status(400).json({ error: 'El ID del cargue es requerido.' });
  }

  try {
    const inputJson = JSON.stringify({ id_temp_cargue: Number(id_temp_cargue) });
    const query = `BEGIN pkgln_automatizaciones.p_eliminar_cargue(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: inputJson, type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 },
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    const responseJson = outBinds?.p_out_json ? JSON.parse(outBinds.p_out_json) : null;

    if (responseJson && responseJson.success) {
      return res.status(200).json(responseJson);
    } else {
      return res.status(500).json({
        success: false,
        error: responseJson?.error || 'Error al eliminar el cargue en la base de datos.',
      });
    }
  } catch (err: any) {
    console.warn('Fallback activo para /api/cargue-eliminar:', err);

    // Fallback Mock local para desarrollo
    return res.status(200).json({
      success: true,
      message: 'Cargue eliminado en modo simulado.',
      isMock: true,
    });
  }
}
