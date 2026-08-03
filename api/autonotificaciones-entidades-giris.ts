import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

const MOCK_ENTIDADES_GIRIS = [
  {
    id: 11,
    label: 'Coomeva MP Reg. Cali (GV/GO)',
    url_logo: 'https://tekerapp.maxapex.net/FILES_DEV_TEKER/coomeva_mp.png',
    entidades_hijas: [
      { id: 45, id_convenio: 101, nombre_entidad: 'Coomeva MP CALI - Convenio GV' },
      { id: 42, id_convenio: 102, nombre_entidad: 'Coomeva MP Vive 100 - Convenio GO' }
    ]
  },
  {
    id: 20,
    label: 'SURA EPS Regional Occidente (GV/GO)',
    url_logo: 'https://dev.tekerapp.co/assets/logo.svg',
    entidades_hijas: [
      { id: 81, id_convenio: 301, nombre_entidad: 'Sura Prepagada GV' },
      { id: 82, id_convenio: 302, nombre_entidad: 'Sura Complementario GO' }
    ]
  }
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const query = `BEGIN pkgln_automatizaciones.p_obtener_entidades_giris(:p_out_json); END;`;
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

    if (data && data.success && Array.isArray(data.entidades) && data.entidades.length > 0) {
      return res.status(200).json({ success: true, entidades: data.entidades });
    }

    return res.status(200).json({ success: true, entidades: MOCK_ENTIDADES_GIRIS, isMock: true });
  } catch (err: any) {
    console.warn('Fallback activo para /api/autonotificaciones-entidades-giris:', err);
    return res.status(200).json({
      success: true,
      entidades: MOCK_ENTIDADES_GIRIS,
      isMock: true
    });
  }
}
