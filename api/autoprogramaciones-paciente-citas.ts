import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const idUsuarioRaw = req.method === 'POST' ? req.body.id_usuario : req.query.id_usuario;
  const idCitaRaw = req.method === 'POST' ? req.body.id_cita : req.query.id_cita;
  const idProcesoRaw = req.method === 'POST' ? req.body.id_proceso : req.query.id_proceso;

  const id_usuario = idUsuarioRaw ? Number(idUsuarioRaw) : null;
  const id_cita = idCitaRaw ? Number(idCitaRaw) : null;
  const id_proceso = idProcesoRaw ? Number(idProcesoRaw) : null;

  if (!id_usuario || !id_cita) {
    return res.status(400).json({ error: 'Debe especificar id_usuario e id_cita.' });
  }

  const inputJson = JSON.stringify({ id_usuario, id_cita, id_proceso });

  try {
    const query = `BEGIN pkgln_automatizaciones.p_consultar_citas_paciente(:p_in_json, :p_out_json); END;`;
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
        responseJson = { success: true, citas: [] };
      }
    }

    if (responseJson && responseJson.success) {
      return res.status(200).json({
        success: true,
        citas: responseJson.citas || []
      });
    }

    return res.status(400).json({
      success: false,
      error: responseJson?.error || 'Error al consultar citas del paciente.'
    });

  } catch (err: any) {
    console.warn('Fallback local activo para /api/autoprogramaciones-paciente-citas:', err);

    // Mock para desarrollo offline
    const mockCitas = [
      {
        id: 201,
        codigo_cita: "XYZ100",
        estado_cita: "Asignada",
        fecha_cita: "15/07/2026 10:00 am",
        nombre_paciente: "Paciente de Prueba",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "1234567890",
        correo_electronico_paciente: "paciente.prueba@example.com",
        telefono_paciente: "3007654321",
        total_registros_usuario: 3,
        proceso_actual: "S",
        nombre_especialidad: "Cardiología",
        nombre_profesional: "Robert Chamorro"
      },
      {
        id: 202,
        codigo_cita: "XYZ200",
        estado_cita: "Cancelada",
        fecha_cita: "10/07/2026 09:30 am",
        nombre_paciente: "Paciente de Prueba",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "1234567890",
        correo_electronico_paciente: "paciente.prueba@example.com",
        telefono_paciente: "3007654321",
        total_registros_usuario: 3,
        proceso_actual: "N",
        nombre_especialidad: "Cardiología",
        nombre_profesional: "Robert Chamorro"
      },
      {
        id: 203,
        codigo_cita: "XYZ300",
        estado_cita: "Atendida",
        fecha_cita: "01/07/2026 11:00 am",
        nombre_paciente: "Paciente de Prueba",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "1234567890",
        correo_electronico_paciente: "paciente.prueba@example.com",
        telefono_paciente: "3007654321",
        total_registros_usuario: 3,
        proceso_actual: "N",
        nombre_especialidad: "Cardiología",
        nombre_profesional: "Robert Chamorro"
      }
    ];

    return res.status(200).json({
      success: true,
      isMock: true,
      citas: mockCitas
    });
  }
}
