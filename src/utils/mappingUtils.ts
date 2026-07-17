// Estructuras de datos para parseo e importación
export interface ParsedRow {
  linea: string;
  numero_linea: number;
  [key: string]: any; // c1, c2, c3 ... c50
}

export interface UploadedCargue {
  id: number;
  nombre_archivo: string;
  fecha_cargue: string;
  tiene_encabezado: string;
  estado: string;
}

// Estructura para el mapeo dinámico de campos y homologaciones
export interface FieldMapping {
  campo_destino: string;
  label: string;
  tipo: 'VARCHAR2' | 'NUMBER' | 'DATE' | 'CLOB';
  columna_origen: string; // columna_1 a columna_50, o ''
  formato_fecha?: string;  // Para campos de tipo DATE
  required?: boolean;
  concatenacion?: {
    columnas: string[];
    separador: string;
  };
  homologacion?: {
    tipo: 'directo' | 'tabla' | 'constante';
    valor_constante?: string;
    tabla_destino?: string;
    criterio?: 'id' | 'nombre';
    valores?: { origen: string; destino: string }[];
    defecto?: string;
  };
}

// Constantes globales de mapeo y homologación
export const COMMON_DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Ej: 14/07/2026)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (Ej: 2026-07-14)' },
  { value: 'YYYY-MM-DD HH24:MI:SS', label: 'YYYY-MM-DD HH:MI:SS' },
  { value: 'DD-MM-YYYY', label: 'DD-MM-YYYY' },
  { value: 'DD/MM/RR', label: 'DD/MM/RR (Ej: 14/07/26)' }
];

export const FK_TABLES_MAP: Record<string, string> = {
  id_ciudad_residencia: 'TKR_CIUDADES',
  id_barrio: 'TKR_BARRIOS',
  id_perfil_doctor: 'TKR_PERFILES_DOCTOR',
  id_medio: 'TKR_MEDIOS',
  id_plan_asegurador: 'TKR_PLANES_ASEGURADORES',
  id_regimen_aseguramiento: 'TKR_REGIMEN_ASEGURAMIENTO',
  id_tipo_identificacion: 'TKR_TIPOS_IDENTIFICACION',
  id_genero: 'TKR_GENEROS'
};

// Construye una fila parseada a partir de las columnas crudas de texto o Excel
export const buildParsedRow = (rawLine: string, columns: any[], lineNumber: number): ParsedRow => {
  const rowObj: ParsedRow = {
    linea: rawLine.substring(0, 4000),
    numero_linea: lineNumber,
  };

  for (let i = 0; i < 50; i++) {
    const val = columns[i] !== undefined && columns[i] !== null ? String(columns[i]).trim() : '';
    rowObj[`c${i + 1}`] = val.substring(0, 4000);
  }

  return rowObj;
};

// Sugiere mapeos iniciales automáticos basados en nombres similares de cabeceras
export const suggestInitialMappings = (firstRow: ParsedRow, currentMappings: FieldMapping[]): FieldMapping[] => {
  return currentMappings.map(mapping => {
    for (let i = 1; i <= 50; i++) {
      const val = String(firstRow[`c${i}`] || '').toLowerCase().trim();
      if (!val) continue;

      if (
        (mapping.campo_destino === 'nombres' && (val.includes('nombre') || val.includes('name'))) ||
        (mapping.campo_destino === 'apellidos' && (val.includes('apellido') || val.includes('last'))) ||
        (mapping.campo_destino === 'usuario' && (val.includes('user') || val.includes('usuario'))) ||
        (mapping.campo_destino === 'clave' && (val.includes('clave') || val.includes('pass') || val.includes('contra'))) ||
        (mapping.campo_destino === 'identificacion' && (val.includes('identi') || val.includes('doc') || val.includes('cedula')))
      ) {
        return { ...mapping, columna_origen: `columna_${i}` };
      }
    }
    return mapping;
  });
};

// Resuelve y traduce el valor final homologado aplicando constantes, mapeo directo o búsquedas foráneas
export const getHomologatedValue = (mapping: FieldMapping, row: ParsedRow): string => {
  // 1. Obtener el valor de origen (directo o por concatenación)
  let rawVal = '';
  if (mapping.concatenacion && mapping.concatenacion.columnas.length > 0) {
    const parts = mapping.concatenacion.columnas.map(colKey => {
      const idx = Number(colKey.replace('columna_', ''));
      return row[`c${idx}`] || '';
    }).filter(v => v !== '');
    rawVal = parts.join(mapping.concatenacion.separador ?? ' ');
  } else if (mapping.columna_origen) {
    const idx = Number(mapping.columna_origen.replace('columna_', ''));
    rawVal = row[`c${idx}`] || '';
  }

  if (!mapping.homologacion) {
    return rawVal;
  }

  const homol = mapping.homologacion;
  if (homol.tipo === 'constante') {
    return homol.valor_constante || '';
  }

  if (homol.tipo === 'directo') {
    const rule = homol.valores?.find(v => v.origen.toLowerCase().trim() === rawVal.toLowerCase().trim());
    if (rule) return rule.destino;
    return homol.defecto !== undefined && homol.defecto !== '' ? homol.defecto : rawVal;
  }

  if (homol.tipo === 'tabla') {
    return `[Búsqueda en ${homol.tabla_destino} por ${homol.criterio === 'id' ? 'ID' : 'Nombre'}: "${rawVal}"]`;
  }

  return '';
};
