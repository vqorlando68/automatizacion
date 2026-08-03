import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

const MOCK_PACIENTES = [
  { id_usuario: 5001, abreviatura: 'CC', identificacion: '100100200', nombre_paciente: 'Juan Pérez', correo_electronico: 'juan.perez@gmail.com', telefono: '3001234567' },
  { id_usuario: 5002, abreviatura: 'CC', identificacion: '300300400', nombre_paciente: 'María Gómez', correo_electronico: 'maria.gomez@gmail.com', telefono: '3109876543' },
  { id_usuario: 5003, abreviatura: 'TI', identificacion: '700700800', nombre_paciente: 'Luisa Soto', correo_electronico: 'luisa.soto@gmail.com', telefono: '3204567890' },
  { id_usuario: 5004, abreviatura: 'CC', identificacion: '900900100', nombre_paciente: 'Carlos Ruiz', correo_electronico: 'carlos.ruiz@gmail.com', telefono: '3151122334' },
  { id_usuario: 5005, abreviatura: 'CE', identificacion: '400400500', nombre_paciente: 'Ana Martínez', correo_electronico: 'ana.martinez@outlook.com', telefono: '3015556677' }
];

const MOCK_CITAS_GIRIS = [
  { id_cita: 1001, codigo_cita: 'CT-88901', fecha_cita: '2026-08-05', hora_cita: '08:00 AM', nombre_paciente: 'Roberto Gómez', identificacion: '10203040', id_estado_cita: 10, estado_cita: 'Programada' },
  { id_cita: 1002, codigo_cita: 'CT-88902', fecha_cita: '2026-08-05', hora_cita: '09:30 AM', nombre_paciente: 'Clara López', identificacion: '50607080', id_estado_cita: 16, estado_cita: 'Confirmada' },
  { id_cita: 1003, codigo_cita: 'CT-88903', fecha_cita: '2026-08-06', hora_cita: '10:00 AM', nombre_paciente: 'Esteban Quito', identificacion: '90100110', id_estado_cita: 10, estado_cita: 'Programada' },
  { id_cita: 1004, codigo_cita: 'CT-88904', fecha_cita: '2026-08-07', hora_cita: '02:15 PM', nombre_paciente: 'Diana Prince', identificacion: '12131415', id_estado_cita: 16, estado_cita: 'Confirmada' }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { is_giris, fecha_hasta, id_profesional, id_cargue, id_entidad, id_convenio, id_especialidad } = req.body;

  const payload = {
    is_giris: Boolean(is_giris),
    fecha_hasta: fecha_hasta || null,
    id_profesional: id_profesional ? Number(id_profesional) : null,
    id_cargue: id_cargue ? Number(id_cargue) : null,
    id_entidad: id_entidad ? Number(id_entidad) : null,
    id_convenio: id_convenio ? Number(id_convenio) : null,
    id_especialidad: id_especialidad ? Number(id_especialidad) : null
  };

  const getDynamicMockCitas = (profId?: number | null) => {
    const profSeed = profId || 65;
    const dateStr = fecha_hasta || '2026-08-05';

    const pool = [
      [
        { name: 'Roberto Gómez', id: '10203040' },
        { name: 'Clara López', id: '50607080' },
        { name: 'Esteban Quito', id: '90100110' },
        { name: 'Diana Prince', id: '12131415' }
      ],
      [
        { name: 'María Fernanda Aristizábal', id: '10987654' },
        { name: 'Alejandro Morales', id: '79845612' },
        { name: 'Sonia Bermúdez', id: '52369874' },
        { name: 'Gabriel García', id: '80123456' }
      ],
      [
        { name: 'Camila Ospina', id: '10172345' },
        { name: 'Felipe Jaramillo', id: '98765432' },
        { name: 'Valentina Restrepo', id: '43218765' },
        { name: 'Santiago Echeverri', id: '65432109' }
      ]
    ];

    const idx = Math.abs(profSeed) % pool.length;
    const selectedPool = pool[idx];

    return [
      { id_cita: 1000 + profSeed * 10 + 1, codigo_cita: `CT-${profSeed}-01`, fecha_cita: dateStr, hora_cita: '08:00 AM', nombre_paciente: selectedPool[0].name, identificacion: selectedPool[0].id, id_estado_cita: 10, estado_cita: 'Programada' },
      { id_cita: 1000 + profSeed * 10 + 2, codigo_cita: `CT-${profSeed}-02`, fecha_cita: dateStr, hora_cita: '09:30 AM', nombre_paciente: selectedPool[1].name, identificacion: selectedPool[1].id, id_estado_cita: 16, estado_cita: 'Confirmada' },
      { id_cita: 1000 + profSeed * 10 + 3, codigo_cita: `CT-${profSeed}-03`, fecha_cita: dateStr, hora_cita: '10:00 AM', nombre_paciente: selectedPool[2].name, identificacion: selectedPool[2].id, id_estado_cita: 10, estado_cita: 'Programada' },
      { id_cita: 1000 + profSeed * 10 + 4, codigo_cita: `CT-${profSeed}-04`, fecha_cita: dateStr, hora_cita: '02:15 PM', nombre_paciente: selectedPool[3].name, identificacion: selectedPool[3].id, id_estado_cita: 16, estado_cita: 'Confirmada' }
    ];
  };

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_pacientes_notificacion(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: JSON.stringify(payload), type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 }
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    let data: any = null;

    if (outBinds?.p_out_json) {
      try {
        data = JSON.parse(outBinds.p_out_json);
      } catch {
        data = null;
      }
    }

    if (data && (data.success === 'true' || data.success === true)) {
      let rawList: any[] = [];
      if (Array.isArray(data.data)) {
        rawList = data.data;
      } else if (typeof data.data === 'string') {
        try {
          const parsed = JSON.parse(data.data);
          rawList = Array.isArray(parsed) ? parsed : [];
        } catch {
          rawList = [];
        }
      }

      const resultData = is_giris
        ? rawList.filter((c: any) => Number(c.id_estado_cita) === 10 || Number(c.id_estado_cita) === 16)
        : rawList;
      return res.status(200).json({ success: true, data: resultData });
    }

    const fallbackData = is_giris
      ? getDynamicMockCitas(id_profesional)
      : MOCK_PACIENTES;

    return res.status(200).json({
      success: true,
      data: fallbackData,
      isMock: true
    });
  } catch (err: any) {
    console.warn('Fallback activo para /api/autonotificaciones-pacientes:', err);
    const fallbackData = is_giris
      ? getDynamicMockCitas(id_profesional)
      : MOCK_PACIENTES;
    return res.status(200).json({
      success: true,
      data: fallbackData,
      isMock: true
    });
  }
}
