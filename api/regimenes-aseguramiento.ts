import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeQuery } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const mockRegimenes = [
    { id: 1, descripcion: 'Contributivo' },
    { id: 2, descripcion: 'Subsidiado' },
    { id: 3, descripcion: 'Especial / Excepción' },
    { id: 4, descripcion: 'Particular / Privado' }
  ];

  try {
    const query = `SELECT id, descripcion FROM tkr_regimen_aseguramiento ORDER BY descripcion`;
    const result = await executeQuery(query, {});
    const rows = result.rows as any[] | undefined;

    if (rows && rows.length > 0) {
      const regimenes = rows.map((r: any) => {
        if (Array.isArray(r)) {
          return { id: Number(r[0]), descripcion: String(r[1]) };
        }
        return { id: Number(r.ID || r.id), descripcion: String(r.DESCRIPCION || r.descripcion) };
      });
      return res.status(200).json({ success: true, regimenes });
    }

    return res.status(200).json({ success: true, regimenes: mockRegimenes });
  } catch (err: any) {
    console.warn('Fallback activo para /api/regimenes-aseguramiento:', err);
    return res.status(200).json({
      success: true,
      regimenes: mockRegimenes,
      isFallback: true
    });
  }
}
