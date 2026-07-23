import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Aceptar tanto GET con query params como POST con JSON
  const idProcesoRaw = req.method === 'POST' ? req.body.id_proceso : req.query.id_proceso;
  const id_proceso = idProcesoRaw ? Number(idProcesoRaw) : null;

  if (!id_proceso) {
    return res.status(400).json({ error: 'Debe especificar el id_proceso.' });
  }

  const inputJson = JSON.stringify({ id_proceso });

  try {
    const query = `BEGIN pkgln_automatizaciones.p_consultar_citas(:p_in_json, :p_out_json); END;`;
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
        id_proceso: responseJson.id_proceso || id_proceso,
        citas: responseJson.citas || []
      });
    }

    return res.status(400).json({
      success: false,
      error: responseJson?.error || 'Error al consultar citas de base de datos.'
    });

  } catch (err: any) {
    console.warn('Fallback local activo para /api/autoprogramaciones-citas:', err);

    // Mock de respuesta local en caso de desconexión DB
    const mockCitas = [
      {
        id: 101,
        codigo_cita: "A23F89",
        fecha_cita: "23/07/2026 08:30 am",
        nombre_paciente: "Juan Pérez Gomez",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "10203040",
        correo_electronico_paciente: "juan.perez@example.com",
        telefono_paciente: "3001234567",
        total_registros_usuario: 3,
        proceso_actual: "S",
        nombre_especialidad: "Cardiología",
        nombre_profesional: "Robert Chamorro"
      },
      {
        id: 102,
        codigo_cita: "B56G12",
        fecha_cita: "23/07/2026 09:15 am",
        nombre_paciente: "María Rodriguez Ruiz",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "20304050",
        correo_electronico_paciente: "maria.ruiz@example.com",
        telefono_paciente: "3109876543",
        total_registros_usuario: 4,
        proceso_actual: "S",
        nombre_especialidad: "Cardiología",
        nombre_profesional: "Robert Chamorro"
      },
      {
        id: 103,
        codigo_cita: "C78H45",
        fecha_cita: "24/07/2026 10:00 am",
        nombre_paciente: "Carlos Restrepo",
        tipo_identificacion_paciente: "TI",
        identificacion_paciente: "98070605",
        correo_electronico_paciente: "carlos.restrepo@example.com",
        telefono_paciente: "3205556677",
        total_registros_usuario: 1,
        proceso_actual: "S",
        nombre_especialidad: "Endocrinología Adultos",
        nombre_profesional: "sebastian tabares"
      },
      {
        id: 104,
        codigo_cita: "D90J78",
        fecha_cita: "24/07/2026 11:30 am",
        nombre_paciente: "Laura Restrepo",
        tipo_identificacion_paciente: "CC",
        identificacion_paciente: "52431980",
        correo_electronico_paciente: "laura.res@example.com",
        telefono_paciente: "3154443322",
        total_registros_usuario: 2,
        proceso_actual: "S",
        nombre_especialidad: "Gastroenterología",
        nombre_profesional: "Liber Calderón"
      }
    ];

    // Si para pruebas el usuario envía un proceso que simule vacío (ej: 999), retornamos vacío
    if (id_proceso === 999) {
      return res.status(200).json({
        success: true,
        id_proceso,
        citas: []
      });
    }

    return res.status(200).json({
      success: true,
      isMock: true,
      id_proceso,
      citas: mockCitas
    });
  }
}
