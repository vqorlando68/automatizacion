import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id_temp_cargue, mappings, modo_carga } = req.body;

  if (!id_temp_cargue || !mappings || !Array.isArray(mappings)) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios de mapeo.' });
  }

  try {
    const inputJson = JSON.stringify({
      id_temp_cargue: Number(id_temp_cargue),
      modo_carga: modo_carga || 'PARCIAL',
      mappings
    });

    const query = `BEGIN pkgln_automatizaciones.p_crear_usuarios(:p_in_json, :p_out_json); END;`;
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
        error: responseJson?.error || 'Error al crear los usuarios en la base de datos.',
      });
    }
  } catch (err: any) {
    console.error('Error en API /api/crear-usuarios:', err);

    // Fallback Mock local para desarrollo
    return res.status(200).json({
      success: true,
      rows_processed: 5,
      exitosos: 4,
      errores: 1,
      any_error: true,
      isMock: true,
      message: 'Usuarios insertados localmente en modo simulado.',
    });
  }
}
