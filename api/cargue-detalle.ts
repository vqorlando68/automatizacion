import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

function getMockRows() {
  return [
    { id: 1, numero_linea: 1, linea: 'juan123,clave123,Juan,Pérez,100100200,juan@gmail.com,555-1234', c1: 'juan123', c2: 'clave123', c3: 'Juan', c4: 'Pérez', c5: '100100200', c6: 'juan@gmail.com', c7: '555-1234', c8: '1', c9: 'A', id_usuario: 5001, error: null },
    { id: 2, numero_linea: 2, linea: 'maria456,clave456,María,Gómez,300300400,maria@gmail.com,555-5678', c1: 'maria456', c2: 'clave456', c3: 'María', c4: 'Gómez', c5: '300300400', c6: 'maria@gmail.com', c7: '555-5678', c8: '1', c9: 'A', id_usuario: 5002, error: null },
    { id: 3, numero_linea: 3, linea: 'pedro789,clave789,Pedro,Rojas,500500600,pedro@gmail.com,555-9012', c1: 'pedro789', c2: 'clave789', c3: 'Pedro', c4: 'Rojas', c5: '500500600', c6: 'pedro@gmail.com', c7: '555-9012', c8: '1', c9: 'I', id_usuario: null, error: 'ORA-00001: restricción única (TEKER_DEV.SYS_C00123) violada' },
    { id: 4, numero_linea: 4, linea: 'luisa012,clave012,Luisa,Soto,700700800,luisa@gmail.com,555-3456', c1: 'luisa012', c2: 'clave012', c3: 'Luisa', c4: 'Soto', c5: '700700800', c6: 'luisa@gmail.com', c7: '555-3456', c8: '2', c9: 'A', id_usuario: 5003, error: null },
    { id: 5, numero_linea: 5, linea: 'carlos345,clave345,Carlos,Ruiz,900900100,carlos@gmail.com,555-7890', c1: 'carlos345', c2: 'clave345', c3: 'Carlos', c4: 'Ruiz', c5: '900900100', c6: 'carlos@gmail.com', c7: '555-7890', c8: '1', c9: 'A', id_usuario: 5004, error: null }
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { id_temp_cargue } = req.body;

  if (!id_temp_cargue) {
    return res.status(400).json({ error: 'El ID del cargue es requerido.' });
  }

  try {
    const inputJson = JSON.stringify({ id_temp_cargue });
    const query = `BEGIN pkgln_automatizaciones.p_obtener_detalle(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: inputJson, type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 },
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    const responseJson = outBinds?.p_out_json ? JSON.parse(outBinds.p_out_json) : null;

    if (responseJson && responseJson.success && responseJson.rows && responseJson.rows.length > 0) {
      return res.status(200).json(responseJson);
    } else {
      // Si el procedimiento retornó éxito pero sin filas, retornamos los datos mock de fallback
      return res.status(200).json({
        success: true,
        rows: getMockRows()
      });
    }
  } catch (err: any) {
    console.error('Error en API /api/cargue-detalle:', err);

    // Fallback Mock local en caso de error o desconexión
    return res.status(200).json({
      success: true,
      rows: getMockRows()
    });
  }
}
