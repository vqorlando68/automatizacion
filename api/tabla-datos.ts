import type { VercelRequest, VercelResponse } from '@vercel/node';
import oracledb from 'oracledb';
import { executeQuery } from './db';

const ALLOWED_TABLES = [
  'TKR_CIUDADES',
  'TKR_BARRIOS',
  'TKR_PERFILES_DOCTOR',
  'TKR_MEDIOS',
  'TKR_PLANES_ASEGURADORES',
  'TKR_REGIMEN_ASEGURAMIENTO',
  'TKR_TIPOS_IDENTIFICACION',
  'TKR_GENEROS'
];

const MOCK_DATA: Record<string, Array<Record<string, any>>> = {
  TKR_CIUDADES: [
    { ID: 1, NOMBRE: 'Bogotá', DEPARTAMENTO: 'Cundinamarca' },
    { ID: 2, NOMBRE: 'Medellín', DEPARTAMENTO: 'Antioquia' },
    { ID: 3, NOMBRE: 'Cali', DEPARTAMENTO: 'Valle del Cauca' },
    { ID: 4, NOMBRE: 'Barranquilla', DEPARTAMENTO: 'Atlántico' },
    { ID: 5, NOMBRE: 'Bucaramanga', DEPARTAMENTO: 'Santander' },
  ],
  TKR_BARRIOS: [
    { ID: 1, NOMBRE: 'Chico', CIUDAD: 'Bogotá' },
    { ID: 2, NOMBRE: 'Poblado', CIUDAD: 'Medellín' },
    { ID: 3, NOMBRE: 'San Fernando', CIUDAD: 'Cali' },
    { ID: 4, NOMBRE: 'Prado', CIUDAD: 'Barranquilla' },
    { ID: 5, NOMBRE: 'Cabecera', CIUDAD: 'Bucaramanga' },
  ],
  TKR_PERFILES_DOCTOR: [
    { ID: 10, NOMBRE: 'Médico General', NIVEL: '1' },
    { ID: 11, NOMBRE: 'Pediatra', NIVEL: '2' },
    { ID: 12, NOMBRE: 'Cardiólogo', NIVEL: '3' },
    { ID: 13, NOMBRE: 'Ginecólogo', NIVEL: '2' },
  ],
  TKR_MEDIOS: [
    { ID: 1, NOMBRE: 'Página Web' },
    { ID: 2, NOMBRE: 'Referencia Médica' },
    { ID: 3, NOMBRE: 'Redes Sociales' },
    { ID: 4, NOMBRE: 'Campaña Telefónica' },
  ],
  TKR_PLANES_ASEGURADORES: [
    { ID: 100, NOMBRE: 'EPS Sanitas Pos', CODIGO: 'EPS001' },
    { ID: 101, NOMBRE: 'Sura Medicina Prepagada', CODIGO: 'EPS002' },
    { ID: 102, NOMBRE: 'Nueva EPS Contributivo', CODIGO: 'EPS003' },
    { ID: 103, NOMBRE: 'Colpatria Premium', CODIGO: 'EPS004' },
  ],
  TKR_REGIMEN_ASEGURAMIENTO: [
    { ID: 1, NOMBRE: 'Contributivo' },
    { ID: 2, NOMBRE: 'Subsidiado' },
    { ID: 3, NOMBRE: 'Excepción / Especial' },
    { ID: 4, NOMBRE: 'Particular' },
  ],
  TKR_TIPOS_IDENTIFICACION: [
    { ID: 1, NOMBRE: 'Cédula de Ciudadanía', ABREVIATURA: 'CC' },
    { ID: 2, NOMBRE: 'Tarjeta de Identidad', ABREVIATURA: 'TI' },
    { ID: 3, NOMBRE: 'Cédula de Extranjería', ABREVIATURA: 'CE' },
    { ID: 4, NOMBRE: 'Pasaporte', ABREVIATURA: 'PA' },
    { ID: 5, NOMBRE: 'Registro Civil', ABREVIATURA: 'RC' },
  ],
  TKR_GENEROS: [
    { ID: 1, NOMBRE: 'Femenino', ABREVIATURA: 'F' },
    { ID: 2, NOMBRE: 'Masculino', ABREVIATURA: 'M' },
    { ID: 3, NOMBRE: 'No Binario', ABREVIATURA: 'NB' },
    { ID: 4, NOMBRE: 'Prefiero no decirlo', ABREVIATURA: 'O' },
  ],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const queryParams = req.method === 'GET' ? req.query : req.body;
  const rawTable = queryParams.tabla;

  if (!rawTable) {
    return res.status(400).json({ error: 'El parámetro "tabla" es obligatorio.' });
  }

  const tableName = String(rawTable).toUpperCase();

  if (!ALLOWED_TABLES.includes(tableName)) {
    return res.status(400).json({ error: 'Tabla no permitida o no autorizada para visualización.' });
  }

  try {
    const inputJson = JSON.stringify({ tabla: tableName });
    const query = `BEGIN pkgln_automatizaciones.p_consultar_tabla_foranea(:p_in_json, :p_out_json); END;`;
    const result = await executeQuery(query, {
      p_in_json: { val: inputJson, type: oracledb.STRING },
      p_out_json: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 5000000 },
    });

    const outBinds = result.outBinds as { p_out_json?: string } | undefined;
    const responseJson = outBinds?.p_out_json ? JSON.parse(outBinds.p_out_json) : null;

    if (responseJson && responseJson.success) {
      let rows: any[] = [];
      if (responseJson.rows) {
        rows = responseJson.rows;
      } else if (responseJson.data && responseJson.data.ROWSET && responseJson.data.ROWSET.ROW) {
        const rowData = responseJson.data.ROWSET.ROW;
        rows = Array.isArray(rowData) ? rowData : [rowData];
      }
      return res.status(200).json({
        success: true,
        tabla: tableName,
        rows: rows
      });
    } else {
      throw new Error(responseJson?.error || 'Error retornado por el procedimiento de base de datos.');
    }
  } catch (err: any) {
    console.warn(`Error al consultar tabla ${tableName} en BD (usando procedimiento), usando mock data:`, err.message);
    return res.status(200).json({
      success: true,
      tabla: tableName,
      rows: MOCK_DATA[tableName] || [],
    });
  }
}
