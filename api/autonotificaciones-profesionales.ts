import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

const MOCK_PROFESIONALES = [
  {
    "id": 65,
    "fullName": "65-Rodolfo Vargas",
    "trabaja_festivos": "N",
    "slug": "rodolfo",
    "price": 100000,
    "gender": "Masculino",
    "rate": null,
    "reviews": null,
    "correo_electronico": "rodolfo.vargas@teker.co",
    "telefono": "3001112233",
    "specialty": [
      {
        "id": 2,
        "nombre_especialidad": "Cardiología",
        "tipo_especialidad": "S"
      }
    ],
    "esp_subesp": null,
    "subspecialty": null,
    "days_of_service": "Lunes, Miércoles",
    "img_url": "https://tekersalud.maxapex.net/FILES_DEV_TEKER/logo_circulo.png",
    "specialtiesIds": "2"
  },
  {
    "id": 28,
    "fullName": "Carlos 28 Monsalve",
    "trabaja_festivos": "N",
    "slug": "carlos",
    "price": 100000,
    "gender": "Masculino",
    "rate": 3,
    "reviews": 3,
    "correo_electronico": "carlos.monsalve@teker.co",
    "telefono": "3104445566",
    "specialty": [
      {
        "id": 17,
        "nombre_especialidad": "Medicina General",
        "tipo_especialidad": "N"
      }
    ],
    "esp_subesp": null,
    "subspecialty": null,
    "days_of_service": "Martes, Miércoles, Jueves, Viernes, Sábado",
    "img_url": "https://tekersalud.maxapex.net/FILES_DEV_TEKER/Id_203_2A8AB4B4313765EB985D02EDF3AD33FB706B8199.png",
    "specialtiesIds": "17"
  },
  {
    "id": 110,
    "fullName": "Psicologo - 110 Vargas",
    "trabaja_festivos": "N",
    "slug": "psicologia",
    "price": 100000,
    "gender": "Masculino",
    "rate": null,
    "reviews": null,
    "correo_electronico": "psicologia.vargas@teker.co",
    "telefono": "3207778899",
    "specialty": [
      {
        "id": 36,
        "nombre_especialidad": "Psicología",
        "tipo_especialidad": "N"
      }
    ],
    "esp_subesp": null,
    "subspecialty": null,
    "days_of_service": "Lunes, Martes",
    "img_url": "https://tekersalud.maxapex.net/FILES_DEV_TEKER/logo_circulo.png",
    "specialtiesIds": "36"
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_profesionales_notificacion(:p_out_json); END;`;
    const result = await executeQuery(query, {
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

    if (data && data.success && Array.isArray(data.profesionales) && data.profesionales.length > 0) {
      return res.status(200).json({ success: true, profesionales: data.profesionales });
    }

    return res.status(200).json({ success: true, profesionales: MOCK_PROFESIONALES, isMock: true });
  } catch (err: any) {
    console.warn('Fallback activo para /api/autonotificaciones-profesionales:', err);
    return res.status(200).json({
      success: true,
      profesionales: MOCK_PROFESIONALES,
      isMock: true
    });
  }
}
