import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { citas_a_borrar } = req.body;

  // Enviar el JSON tal como se espera en la base de datos
  const inputJson = JSON.stringify({ citas_a_borrar: citas_a_borrar || '' });

  try {
    const query = `BEGIN pkgln_automatizaciones.p_validar(:p_in_json, :p_out_json); END;`;
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
        responseJson = { success: false, error: 'Respuesta inválida de base de datos.' };
      }
    }

    if (responseJson && responseJson.success) {
      const rawList = responseJson.atenciones_agendadas || responseJson.resultados || [];
      const resultadosNormalizados = rawList.map((item: any) => ({
        id_especialidad: item.id_especialidad,
        nombre_especialidad: item.nombre_especialidad,
        cantidad_atenciones: Number(item['Cantidad de Atenciones'] ?? item.cantidad_atenciones ?? 0),
        nombre_profesional: item.PROFESIONAL || item.nombre_profesional || 'Profesional Médico',
        id_profesional: item.id_profesional || 0
      }));

      const totalAtenciones = resultadosNormalizados.reduce((acc: number, curr: any) => acc + curr.cantidad_atenciones, 0);

      return res.status(200).json({
        success: true,
        mensaje: responseJson.mensaje || 'Validación procesada correctamente.',
        atenciones_agendadas: rawList,
        resultados: resultadosNormalizados,
        totales: {
          total_atenciones: totalAtenciones,
          total_profesionales: new Set(resultadosNormalizados.map((r: any) => r.nombre_profesional)).size,
          total_especialidades: new Set(resultadosNormalizados.map((r: any) => r.id_especialidad)).size
        }
      });
    }

    return res.status(400).json({
      success: false,
      error: responseJson?.error || 'Error al procesar validación en la base de datos.'
    });

  } catch (err: any) {
    console.warn('Fallback local activo para /api/autoprogramaciones-validar:', err);

    // Mock en caso de desconexión DB
    const mockResultados = [
      {
        id_especialidad: 2,
        nombre_especialidad: "Cardiología",
        cantidad_atenciones: 5,
        nombre_profesional: "Robert Chamorro",
        id_profesional: 1
      },
      {
        id_especialidad: 9,
        nombre_especialidad: "Endocrinología Adultos",
        cantidad_atenciones: 15,
        nombre_profesional: "sebastian tabares",
        id_profesional: 2
      }
    ];

    const totalAtenciones = mockResultados.reduce((acc: number, curr: any) => acc + curr.cantidad_atenciones, 0);

    return res.status(200).json({
      success: true,
      isMock: true,
      mensaje: 'Validación procesada correctamente (Simulación offline).',
      atenciones_agendadas: mockResultados.map(r => ({
        id_especialidad: r.id_especialidad,
        nombre_especialidad: r.nombre_especialidad,
        'Cantidad de Atenciones': r.cantidad_atenciones,
        PROFESIONAL: r.nombre_profesional
      })),
      resultados: mockResultados,
      totales: {
        total_atenciones: totalAtenciones,
        total_profesionales: mockResultados.length,
        total_especialidades: new Set(mockResultados.map(r => r.id_especialidad)).size
      }
    });
  }
}
