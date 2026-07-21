import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

function ensureArray(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return ensureArray(parsed);
    } catch {
      return [];
    }
  }
  if (val && typeof val === 'object') {
    if (Array.isArray(val.entidades)) return val.entidades;
    if (Array.isArray(val.profesionales)) return val.profesionales;
    if (Array.isArray(val.especialidades)) return val.especialidades;
    if (Array.isArray(val.rows)) return val.rows;
    if (Array.isArray(val.data)) return val.data;
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Fallback Mock data estandarizado por si la BD no está disponible
  const mockEntidades = [
    {
      id: 11,
      label: 'Coomeva MP Reg. Cali',
      url_logo: 'https://tekerapp.maxapex.net/FILES_DEV_TEKER/coomeva_mp.png',
      entidades_hijas: [
        { id: 45, nombre_entidad: 'Coomeva MP CALI' },
        { id: 42, nombre_entidad: 'Coomeva MP Cali Vive al 100' },
        { id: 44, nombre_entidad: 'Coomeva MP Salud Mental' }
      ]
    },
    {
      id: 0,
      label: 'TEKER SALUD S.A.S',
      url_logo: 'https://dev.tekerapp.co/assets/logo.svg',
      entidades_hijas: [
        { id: 0, nombre_entidad: 'TEKER SALUD S.A.S' }
      ]
    },
    {
      id: 20,
      label: 'SURA EPS Regional Occidente',
      url_logo: 'https://dev.tekerapp.co/assets/logo.svg',
      entidades_hijas: [
        { id: 81, nombre_entidad: 'Sura Medicina Prepagada' },
        { id: 82, nombre_entidad: 'Sura Plan Complementario' }
      ]
    }
  ];

  const mockProfesionales = [
    { id: 101, nombre_profesional: 'Dr. Maria Garcia', url_foto: 'https://images.unsplash.com/photo-1594824813566-88855ce78c0c?w=150&auto=format&fit=crop&q=80', reg: '12345678' },
    { id: 102, nombre_profesional: 'Dr. Carlos Rodriguez', url_foto: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', reg: '87654321' },
    { id: 103, nombre_profesional: 'Dra. Elena Gomez', url_foto: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', reg: '45671234' },
    { id: 104, nombre_profesional: 'Dr. Fernando Ruiz', url_foto: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80', reg: '99887766' }
  ];

  const mockEspecialidades = [
    { id: 1, nombre_especialidad: 'Cardiología' },
    { id: 2, nombre_especialidad: 'Medicina General' },
    { id: 3, nombre_especialidad: 'Pediatría' },
    { id: 4, nombre_especialidad: 'Dermatología' }
  ];

  const mockEspecialidadesUsuario = [
    { id_usuario: 101, id_especialidad: 1 },
    { id_usuario: 102, id_especialidad: 1 },
    { id_usuario: 103, id_especialidad: 1 },
    { id_usuario: 104, id_especialidad: 1 },
    { id_usuario: 101, id_especialidad: 2 },
    { id_usuario: 103, id_especialidad: 3 },
    { id_usuario: 104, id_especialidad: 4 }
  ];

  const mockCarguesPendientes = [
    { id: 501, nombre_archivo: 'cargue_pacientes_julio_2026.csv' },
    { id: 502, nombre_archivo: 'pacientes_prioritarios_coomeva.xlsx' },
    { id: 503, nombre_archivo: 'cargue_pacientes_nuevos_valle.csv' }
  ];

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_catalogos(:p_out_json); END;`;
    const result = await executeQuery(query, {
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 },
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    let responseJson: any = null;

    if (outBinds?.p_out_json) {
      try {
        responseJson = JSON.parse(outBinds.p_out_json);
      } catch {
        responseJson = null;
      }
    }

    const entidadesArr = ensureArray(responseJson?.entidades);
    const profesionalesArr = ensureArray(responseJson?.profesionales);
    const especialidadesArr = ensureArray(responseJson?.especialidades);
    const especialidadesUsuarioArr = ensureArray(responseJson?.especialidades_usuario);
    const carguesPendientesArr = ensureArray(responseJson?.cargues_pendientes);

    return res.status(200).json({
      success: true,
      entidades: entidadesArr.length > 0 ? entidadesArr : mockEntidades,
      profesionales: profesionalesArr.length > 0 ? profesionalesArr : mockProfesionales,
      especialidades: especialidadesArr.length > 0 ? especialidadesArr : mockEspecialidades,
      especialidades_usuario: especialidadesUsuarioArr.length > 0 ? especialidadesUsuarioArr : mockEspecialidadesUsuario,
      cargues_pendientes: carguesPendientesArr.length > 0 ? carguesPendientesArr : mockCarguesPendientes
    });

  } catch (err: any) {
    console.warn('Fallback activo para /api/autoprogramaciones-catalogos:', err);

    return res.status(200).json({
      success: true,
      entidades: mockEntidades,
      profesionales: mockProfesionales,
      especialidades: mockEspecialidades,
      especialidades_usuario: mockEspecialidadesUsuario,
      cargues_pendientes: mockCarguesPendientes,
      isFallback: true
    });
  }
}
