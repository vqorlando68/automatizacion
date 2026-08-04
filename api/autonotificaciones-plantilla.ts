import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db.js';

const MOCK_PLANTILLA_131 = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
  <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 22px;">Confirmación de Atenciones Agendadas</h2>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">Teker Salud - Automatización de Citas</p>
  </div>
  <div style="padding: 24px; color: #334155; line-height: 1.6;">
    <p>Estimado(a) paciente <strong>{{nombre_paciente}}</strong>,</p>
    <p>Le informamos que sus citas médicas han sido procesadas correctamente para la fecha límite <strong>{{fecha_hasta}}</strong>.</p>
    <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0;"><strong>Profesional Asignado:</strong> {{nombre_profesional}}</p>
      <p style="margin: 5px 0 0 0;"><strong>Entidad / Convenio:</strong> {{entidad_convenio}}</p>
    </div>
    <p>Si requiere reprogramar o actualizar sus datos, por favor ingrese a nuestro portal o comuníquese con nuestra línea de atención.</p>
  </div>
  <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">Este es un mensaje automático generado por el sistema Teker. Por favor no responda a este correo.</p>
  </div>
</div>
`;

const MOCK_PLANTILLA_132 = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; color: #334155; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
  <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Hello {{NOMBRE_PACIENTE}} 👏</h2>
  
  <p style="margin-bottom: 16px; color: #475569; font-size: 14px;">Somos IPS Teker, aliado de <strong>{{NOMBRE_ENTIDAD}}</strong>.</p>
  
  <p style="margin-bottom: 16px; color: #475569; font-size: 14px;">Queremos que recuerdes que tu programa personalizado incluye:</p>
  
  <ol style="padding-left: 20px; margin-bottom: 20px; color: #334155; font-size: 14px; line-height: 1.8;">
    <li style="margin-bottom: 10px;"><strong>Educación digital en salud.</strong></li>
    <li style="margin-bottom: 10px;"><strong>Atención primaria</strong> – Medicina general, medicina interna, nutrición y psicología.</li>
    <li style="margin-bottom: 10px;"><strong>Atención especializada</strong> – Deportología, neurología, cardiología y más de 40 especialidades.</li>
  </ol>
  
  <p style="margin-bottom: 20px; color: #475569; font-size: 14px; line-height: 1.7;">
    Estos elementos son articulados para ti por un comité médico experto. Como resultado, el comité asignó la siguiente atención para optimizar tu salud: <strong>{{NOMBRE_ESPECIALIDAD}}</strong> con el Dr(a). <strong>{{NOMBRE_PROFESIONAL}}</strong>.
  </p>
  
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin: 24px 0; font-size: 14px; color: #1e293b;">
    <p style="margin: 6px 0;">🗓️ <strong>Fecha:</strong> &nbsp;{{FECHA_CITA}}</p>
    <p style="margin: 6px 0;">🕒 <strong>Hora:</strong> &nbsp;{{HORA_CITA}}</p>
    <p style="margin: 6px 0;">💻 <strong>Modalidad:</strong> &nbsp;Videoconsulta</p>
    <p style="margin: 6px 0;">🏷️ <strong>Código de atención:</strong> &nbsp;{{ID_HEXADECIMAL}}</p>
  </div>
  
  <div style="text-align: center; margin: 28px 0;">
    <a href="#" style="background-color: #00a8e8; color: #ffffff; padding: 14px 32px; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 168, 232, 0.3);">Confirma dentro de 72 Horas</a>
  </div>
  
  <p style="font-size: 13px; color: #64748b; margin-bottom: 12px; line-height: 1.6;">
    Sabemos que puedes preferir un horario distinto. En el botón encontrarás los detalles para gestionar o ingresar a tu atención. Por favor:
  </p>
  
  <ul style="list-style: none; padding-left: 0; font-size: 13px; color: #475569; margin-top: 12px;">
    <li style="margin-bottom: 10px;">✅ Confirma tu asistencia desde tres días antes de la atención.</li>
    <li style="margin-bottom: 10px;">⏰ Conéctate 10 minutos antes de la hora programada.</li>
    <li style="margin-bottom: 10px;">📄 Sube tus exámenes e historias clínicas antes de la consulta.</li>
  </ul>
</div>
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const idPlantilla = Number(req.query.id_plantilla || req.body?.id_plantilla || 131);

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_plantilla_notificacion(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: JSON.stringify({ id_plantilla: idPlantilla }), type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 }
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    let data: any = null;

    if (outBinds?.p_out_json) {
      try {
        data = typeof outBinds.p_out_json === 'string' ? JSON.parse(outBinds.p_out_json) : outBinds.p_out_json;
      } catch (e) {
        console.error('[API Plantilla] Error parseando JSON de p_out_json:', e);
        data = null;
      }
    }

    if (data && (data.success === false || data.success === 'false')) {
      return res.status(200).json({
        success: false,
        error: data.error || `La plantilla con ID ${idPlantilla} no existe en la base de datos.`
      });
    }

    if (data && (data.success === true || data.success === 'true') && data.texto_plantilla) {
      return res.status(200).json({
        success: true,
        id_plantilla: idPlantilla,
        texto_plantilla: data.texto_plantilla,
        asunto: data.asunto || 'Notificación de Atención Médica',
        fromDb: true
      });
    }

    const fallbackHtml = idPlantilla === 132 ? MOCK_PLANTILLA_132 : MOCK_PLANTILLA_131;
    return res.status(200).json({
      success: true,
      id_plantilla: idPlantilla,
      texto_plantilla: fallbackHtml,
      asunto: idPlantilla === 132 ? 'Notificación Especial Paciente GIRIS' : 'Confirmación de Atenciones Agendadas',
      isMock: true
    });
  } catch (err: any) {
    console.warn('Fallback activo para /api/autonotificaciones-plantilla:', err);
    const fallbackHtml = idPlantilla === 132 ? MOCK_PLANTILLA_132 : MOCK_PLANTILLA_131;
    return res.status(200).json({
      success: true,
      id_plantilla: idPlantilla,
      texto_plantilla: fallbackHtml,
      asunto: idPlantilla === 132 ? 'Notificación Especial Paciente GIRIS' : 'Confirmación de Atenciones Agendadas',
      isMock: true
    });
  }
}
