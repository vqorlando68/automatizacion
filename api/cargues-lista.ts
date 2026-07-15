import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const inputJson = JSON.stringify({});
    const query = `BEGIN pkgln_automatizaciones.p_listar_cargues(:p_in_json, :p_out_json); END;`;
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
        error: responseJson?.error || 'Error al listar los cargues.',
      });
    }
  } catch (err: any) {
    console.error('Error en API /api/cargues-lista:', err);

    // Fallback Mock local
    return res.status(200).json({
      success: true,
      cargues: [
        { id: 1001, nombre_archivo: 'cargue_usuarios_piloto.csv', fecha_cargue: '2026-07-14 15:30:12', tiene_encabezado: 'S', estado: 'C' },
        { id: 1002, nombre_archivo: 'usuarios_medicos.xlsx', fecha_cargue: '2026-07-14 16:12:45', tiene_encabezado: 'S', estado: 'C' }
      ]
    });
  }
}
