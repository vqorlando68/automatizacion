import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeQuery } from './db.js';
import oracledb from 'oracledb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Se requiere POST.' });
  }

  const pInJson = JSON.stringify(req.body || {});

  try {
    const query = `BEGIN pkgln_automatizaciones.p_guardar_equipo_medico(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: pInJson, type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 }
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    let data: any = null;

    if (outBinds?.p_out_json) {
      try {
        data = typeof outBinds.p_out_json === 'string' ? JSON.parse(outBinds.p_out_json) : outBinds.p_out_json;
      } catch (e) {
        console.error('[API Equipo Medico Guardar] Error parseando JSON:', e);
      }
    }

    if (data && (data.success === true || data.success === 'true')) {
      return res.status(200).json({
        success: true,
        mensaje: data.mensaje || 'Equipo médico guardado exitosamente.'
      });
    }

    return res.status(200).json({
      success: false,
      error: data?.error || 'Error al guardar la asignación del equipo médico.'
    });
  } catch (err: any) {
    console.warn('Error en /api/equipo-medico-guardar:', err);
    return res.status(500).json({
      success: false,
      error: 'Error interno o de conexión con la base de datos Oracle.'
    });
  }
}
