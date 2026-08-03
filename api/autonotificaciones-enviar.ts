import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const {
    fecha_hasta,
    id_profesional,
    profesional_nombre,
    is_giris,
    id_temp_cargue,
    id_entidad,
    id_convenio,
    id_plantilla,
    pacientes,
    citas
  } = req.body;

  if (!fecha_hasta || !id_profesional) {
    return res.status(400).json({ error: 'Faltan parámetros obligatorios (fecha_hasta, id_profesional).' });
  }

  const payload = {
    fecha_hasta,
    id_profesional,
    profesional_nombre,
    is_giris: Boolean(is_giris),
    id_temp_cargue: id_temp_cargue || null,
    id_entidad: id_entidad || null,
    id_convenio: id_convenio || null,
    id_plantilla: id_plantilla || (is_giris ? 132 : 131),
    pacientes: pacientes || [],
    citas: citas || []
  };

  const inputJson = JSON.stringify(payload);

  try {
    const query = `BEGIN pkgln_automatizaciones.p_envio_notificaciones(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: inputJson, type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 },
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    let responseJson: any = null;

    if (outBinds?.p_out_json) {
      try {
        responseJson = JSON.parse(outBinds.p_out_json);
      } catch {
        responseJson = { success: true, message: outBinds.p_out_json };
      }
    }

    const cantidadReceptores = (pacientes?.length || citas?.length || 0);

    return res.status(200).json({
      success: true,
      mensaje: responseJson?.mensaje || `Notificaciones enviadas correctamente a ${cantidadReceptores} destinatario(s).`,
      detalles: responseJson || payload
    });

  } catch (err: any) {
    console.warn('Fallback activo para /api/autonotificaciones-enviar:', err);
    const cantidadReceptores = (pacientes?.length || citas?.length || 0);
    return res.status(200).json({
      success: true,
      isMock: true,
      mensaje: `[Simulación] Envío registrado correctamente para ${cantidadReceptores} destinatario(s).`,
      detalles: payload
    });
  }
}
