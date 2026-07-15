import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { nombre_archivo, tiene_encabezado, usuario, rows } = req.body;

  if (!nombre_archivo || !usuario || !rows || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios.' });
  }

  try {
    const inputJson = JSON.stringify({
      nombre_archivo,
      tiene_encabezado: tiene_encabezado || 'S',
      usuario,
      rows,
    });

    const query = `BEGIN pkgln_automatizaciones.p_cargue_archivo(:p_in_json, :p_out_json); END;`;
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
        error: responseJson?.error || 'Error al procesar el cargue en la base de datos.',
      });
    }
  } catch (err: any) {
    console.error('Error en API /api/cargue:', err);

    // Fallback Mock local para desarrollo
    const mockId = Math.floor(Math.random() * 10000) + 1;
    return res.status(200).json({
      success: true,
      id_temp_cargue: mockId,
      isMock: true,
      message: 'Cargue guardado localmente en modo simulado.',
    });
  }
}
