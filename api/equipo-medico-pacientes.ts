import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeQuery } from './db.js';
import oracledb from 'oracledb';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const busqueda = (req.query.busqueda || req.body?.busqueda || '') as string;
  const pInJson = JSON.stringify({ busqueda });

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_pacientes_giris_equipo(:p_in_json, :p_out_json); END;`;
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
        console.error('[API Equipo Medico Pacientes] Error parseando JSON:', e);
      }
    }

    if (data && (data.success === true || data.success === 'true')) {
      let pacientesList = data.pacientes;
      if (typeof pacientesList === 'string') {
        try {
          pacientesList = JSON.parse(pacientesList);
        } catch {
          pacientesList = [];
        }
      }

      if (Array.isArray(pacientesList)) {
        pacientesList = pacientesList.map((p: any) => {
          let profs = p.profesionales_asignados;
          if (typeof profs === 'string') {
            try {
              profs = JSON.parse(profs);
            } catch {
              profs = [];
            }
          }
          return {
            ...p,
            profesionales_asignados: Array.isArray(profs) ? profs : []
          };
        });
      }

      return res.status(200).json({
        success: true,
        pacientes: Array.isArray(pacientesList) ? pacientesList : []
      });
    }

    return res.status(200).json({
      success: false,
      error: data?.error || 'Error al obtener pacientes GIRIS para equipo médico.',
      pacientes: []
    });
  } catch (err: any) {
    console.warn('Fallback o error en /api/equipo-medico-pacientes:', err);
    return res.status(200).json({
      success: false,
      error: 'Error de conexión con la base de datos.',
      pacientes: []
    });
  }
}
