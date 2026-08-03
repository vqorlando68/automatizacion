import { useEffect, useState } from 'react';

interface DocumentationModalProps {
  currentTab: string;
}

interface ProcedureDoc {
  nombre: string;
  descripcion: string;
  paramEntrada: string;
  paramSalida: string;
}

interface TabDoc {
  titulo: string;
  descripcion: string;
  tablas: { nombre: string; descripcion: string }[];
  procedimientos: ProcedureDoc[];
}

const DOCUMENTATION_DATA: Record<string, TabDoc> = {
  cargue: {
    titulo: 'Asistente y Administración de Cargues',
    descripcion: 'Módulo para la lectura, validación y almacenamiento masivo de archivos planos y hojas Excel.',
    tablas: [
      { nombre: 'TKR_TEMP_CARGUE', descripcion: 'Cabecera/encabezado de lotes cargados (estado, usuario, total registros, separador).' },
      { nombre: 'TKR_TEMP_DETALLE_CARGUE', descripcion: 'Detalle fila a fila leídos desde el archivo procesado (col1..col100, estado processing).' },
      { nombre: 'TKR_USUARIOS', descripcion: 'Auditoría del usuario que ejecuta la acción de cargue.' }
    ],
    procedimientos: [
      {
        nombre: 'pkgln_automatizaciones.p_crear_encabezado_cargue',
        descripcion: 'Crea el registro cabecera del lote de archivo a procesar.',
        paramEntrada: `{\n  "usuario": "orlando",\n  "nombre_archivo": "pacientes_2026.xlsx",\n  "total_registros": 250,\n  "tipo_cargue": "EXCEL",\n  "separador": ",",\n  "tiene_encabezado": true\n}`,
        paramSalida: `{\n  "success": true,\n  "id_temp_cargue": 1042,\n  "mensaje": "Encabezado de cargue creado con éxito."\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_insertar_detalle_cargue',
        descripcion: 'Inserta en lote las filas leídas del archivo en tkr_temp_detalle_cargue.',
        paramEntrada: `{\n  "id_temp_cargue": 1042,\n  "rows": [\n    { "col1": "Juan", "col2": "Pérez", "col3": "12345678" }\n  ]\n}`,
        paramSalida: `{\n  "success": true,\n  "registros_insertados": 250\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_obtener_historial_cargues',
        descripcion: 'Consulta el historial de archivos procesados.',
        paramEntrada: `{\n  "busqueda": "",\n  "estado": "TODOS"\n}`,
        paramSalida: `{\n  "success": true,\n  "cargues": [\n    { "id": 1042, "nombre_archivo": "pacientes_2026.xlsx", "total_registros": 250, "estado": "COMPLETADO" }\n  ]\n}`
      }
    ]
  },
  crear_usuarios: {
    titulo: 'Creación Masiva de Usuarios',
    descripcion: 'Módulo para mapear columnas de cargas previas e insertar usuarios en la tabla principal TKR_USUARIOS con conversión y homologación.',
    tablas: [
      { nombre: 'TKR_USUARIOS', descripcion: 'Tabla destino principal de cuentas de usuario, médicos y pacientes.' },
      { nombre: 'TKR_TEMP_DETALLE_CARGUE', descripcion: 'Tabla origen de los registros procesados en la etapa de cargue.' },
      { nombre: 'TKR_CIUDADES', descripcion: 'Catálogo de homologación para la ciudad de residencia.' },
      { nombre: 'TKR_TIPOS_IDENTIFICACION', descripcion: 'Catálogo de homologación para tipos de documento de identidad.' },
      { nombre: 'TKR_GENEROS', descripcion: 'Catálogo de homologación de géneros.' },
      { nombre: 'TKR_PERFILES_DOCTOR', descripcion: 'Catálogo de perfiles y roles médicos.' }
    ],
    procedimientos: [
      {
        nombre: 'pkgln_automatizaciones.p_procesar_creacion_usuarios',
        descripcion: 'Transforma las filas temporales en cuentas reales de la tabla tkr_usuarios.',
        paramEntrada: `{\n  "id_temp_cargue": 1042,\n  "mappings": [\n    { "campo_destino": "nombres", "columna_origen": "col1", "tipo": "VARCHAR2" },\n    { "campo_destino": "apellidos", "columna_origen": "col2", "tipo": "VARCHAR2" }\n  ]\n}`,
        paramSalida: `{\n  "success": true,\n  "exitosos": 248,\n  "errores": 2,\n  "detalles_errores": [\n    { "fila": 12, "error": "Identificación duplicada" }\n  ]\n}`
      }
    ]
  },
  autoprogramaciones: {
    titulo: 'Autoprogramaciones de Citas',
    descripcion: 'Gestión y consulta de autoprogramaciones de citas médicas agendadas automáticamente.',
    tablas: [
      { nombre: 'TKR_USUARIOS', descripcion: 'Usuarios y pacientes destinatarios de la cita programada.' },
      { nombre: 'TKR_CONVENIOS', descripcion: 'Convenio o aseguradora asociada a la autoprogramación.' }
    ],
    procedimientos: [
      {
        nombre: 'pkgln_automatizaciones.p_obtener_autoprogramaciones',
        descripcion: 'Retorna el listado de citas autoprogramadas.',
        paramEntrada: `{\n  "busqueda": "Carlos"\n}`,
        paramSalida: `{\n  "success": true,\n  "programaciones": [\n    { "id": 55, "paciente": "Carlos Gómez", "fecha": "2026-08-15" }\n  ]\n}`
      }
    ]
  },
  autonotificaciones: {
    titulo: 'Módulo de Autonotificaciones',
    descripcion: 'Búsqueda de citas, selección de plantillas y envío masivo de notificaciones a pacientes.',
    tablas: [
      { nombre: 'TKR_CITAS', descripcion: 'Consultas y citas agendadas de los pacientes.' },
      { nombre: 'TKR_USUARIOS', descripcion: 'Pacientes destinatarios y profesionales de la salud.' },
      { nombre: 'TKR_ESTADOS_CITA', descripcion: 'Estados de atención de las citas médicas (id_estado_cita).' },
      { nombre: 'TKR_PLANTILLAS', descripcion: 'Plantillas de mensajes predefinidos para notificaciones.' },
      { nombre: 'TKR_CONVENIOS', descripcion: 'Convenios de salud e id_entidad_padre.' },
      { nombre: 'TKR_ENTIDADES', descripcion: 'Entidades prestadoras de salud (GIRIS).' }
    ],
    procedimientos: [
      {
        nombre: 'pkgln_automatizaciones.p_obtener_pacientes_notificacion',
        descripcion: 'Consulta las citas y pacientes elegibles para notificación según filtros.',
        paramEntrada: `{\n  "is_giris": true,\n  "id_entidad": 10,\n  "id_convenio": 5,\n  "id_especialidad": null,\n  "id_profesional": 65,\n  "fecha_hasta": "2026-08-30"\n}`,
        paramSalida: `{\n  "success": true,\n  "data": [\n    {\n      "id_cita": 101,\n      "codigo_cita": "CIT-101",\n      "fecha_cita": "2026-08-15",\n      "hora_cita": "09:00 AM",\n      "id_usuario": 4340,\n      "nombre_paciente": "Joshua Prueba",\n      "identificacion": "12345667",\n      "id_estado_cita": 10,\n      "estado_cita": "Asignada"\n    }\n  ]\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_obtener_plantilla_notificacion',
        descripcion: 'Obtiene el texto predefinido de la plantilla seleccionada por su ID.',
        paramEntrada: `{\n  "id_plantilla": 2\n}`,
        paramSalida: `{\n  "success": true,\n  "id_plantilla": 2,\n  "texto_plantilla": "Estimado(a) paciente, le recordamos su cita...",\n  "asunto": "Notificación de Atención Médica"\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_envio_notificaciones',
        descripcion: 'Procesa el despacho masivo de notificaciones a los pacientes seleccionados.',
        paramEntrada: `{\n  "is_giris": true,\n  "id_plantilla": 2,\n  "id_profesional": 65,\n  "pacientes": [\n    { "id_usuario": 4340 }\n  ]\n}`,
        paramSalida: `{\n  "success": true,\n  "mensaje": "Notificaciones registradas correctamente para 1 paciente(s)."\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_obtener_entidades_giris',
        descripcion: 'Obtiene la jerarquía de entidades e hijas con convenios tipo GV/GO.',
        paramEntrada: `{}`,
        paramSalida: `{\n  "success": true,\n  "data": [\n    { "id": 1, "label": "EPS Sanitas", "entidades_hijas": [...] }\n  ]\n}`
      }
    ]
  },
  equipo_medico: {
    titulo: 'Gestión de Equipo Médico',
    descripcion: 'Asignación individual o masiva de profesionales de la salud a usuarios con indicador paciente_giris = S.',
    tablas: [
      { nombre: 'TKR_EQUIPO_MEDICO', descripcion: 'Tabla de asignación relacional (id, id_usuario, id_profesional, fecha_creacion, id_usuario_creacion).' },
      { nombre: 'TKR_USUARIOS', descripcion: 'Pacientes GIRIS y profesionales médicos.' },
      { nombre: 'TKR_USUARIOS_COHORTE', descripcion: 'Relación con el ID del convenio (id_convenio) y coordinador (id_coordinador).' },
      { nombre: 'TKR_CONVENIOS', descripcion: 'Convenios de salud e id_entidad_hijo.' },
      { nombre: 'TKR_ENTIDADES', descripcion: 'Entidades de salud y nombre de la entidad (nombre_convenio).' },
      { nombre: 'TKR_CIUDADES', descripcion: 'Catálogo de ciudades de residencia del paciente.' }
    ],
    procedimientos: [
      {
        nombre: 'pkgln_automatizaciones.p_obtener_pacientes_giris_equipo',
        descripcion: 'Consulta usuarios pacientes GIRIS y sus médicos asignados en tkr_equipo_medico.',
        paramEntrada: `{\n  "busqueda": "Coomeva"\n}`,
        paramSalida: `{\n  "success": true,\n  "pacientes": [\n    {\n      "id_usuario": 4340,\n      "nombres": "Joshua",\n      "apellidos": "Prueba",\n      "nombre_completo": "Joshua Prueba",\n      "identificacion": "12345667",\n      "correo_electronico": "joshua@gmail.com",\n      "telefono": "573104868742",\n      "direccion": "Calle 10 # 5-20",\n      "nombre_convenio": "Coomeva MP Cali",\n      "nombre_ciudad": "Cali",\n      "nombre_coordinador": "Orlando Valverde",\n      "profesionales_asignados": [\n        { "id_profesional": 65, "nombre_profesional": "Rodolfo Vargas" }\n      ]\n    }\n  ]\n}`
      },
      {
        nombre: 'pkgln_automatizaciones.p_guardar_equipo_medico',
        descripcion: 'Guarda la asignación de médicos en tkr_equipo_medico de forma individual o masiva.',
        paramEntrada: `{\n  "usuarios": [ { "id_usuario": 4340 } ],\n  "profesionales": [ { "id_profesional": 65 }, { "id_profesional": 28 } ],\n  "id_usuario_creacion": 14890615\n}`,
        paramSalida: `{\n  "success": true,\n  "mensaje": "Equipo médico asignado correctamente para 1 paciente(s)."\n}`
      }
    ]
  }
};

export function DocumentationModal({ currentTab }: DocumentationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Escuchar Atajo Secreto Ctrl + Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const doc = DOCUMENTATION_DATA[currentTab] || DOCUMENTATION_DATA['cargue'];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(label);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📖</span>
              <h2 className="text-lg font-extrabold tracking-tight">
                Documentación Técnica del Módulo
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 uppercase">
                {currentTab.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 font-medium">
              Atajo activado (<kbd className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 font-mono text-[10px]">Ctrl + Alt + D</kbd>).
            </p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
            title="Cerrar ventana de documentación"
          >
            ✕
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200 text-xs">
          
          {/* Título del Módulo */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>📌</span>
              <span>{doc.titulo}</span>
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
              {doc.descripcion}
            </p>
          </div>

          {/* Seccion 1: Tablas Utilizadas */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>🗄️</span>
              <span>Tablas de Base de Datos Utilizadas ({doc.tablas.length})</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {doc.tablas.map((t, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40 shadow-xs space-y-1">
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                    {t.nombre}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                    {t.descripcion}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Seccion 2: Procedimientos y Funciones PL/SQL */}
          <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <span>⚙️</span>
              <span>Procedimientos y Funciones PL/SQL ({doc.procedimientos.length})</span>
            </h4>

            <div className="space-y-5">
              {doc.procedimientos.map((p, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden bg-white dark:bg-slate-800/30 shadow-xs space-y-3 p-4">
                  
                  {/* Encabezado Procedimiento */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                        {p.nombre}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {p.descripcion}
                      </p>
                    </div>
                  </div>

                  {/* Parámetros IN y OUT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Parámetro de Entrada */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                          📥 Parámetro Entrada (p_in_json)
                        </span>
                        <button
                          onClick={() => copyToClipboard(p.paramEntrada, `in_${idx}`)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCode === `in_${idx}` ? '✓ Copiado' : 'Copiar JSON'}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-teal-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 leading-tight max-h-48">
                        {p.paramEntrada}
                      </pre>
                    </div>

                    {/* Parámetro de Salida */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                          📤 Parámetro Salida (p_out_json)
                        </span>
                        <button
                          onClick={() => copyToClipboard(p.paramSalida, `out_${idx}`)}
                          className="text-[10px] font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {copiedCode === `out_${idx}` ? '✓ Copiado' : 'Copiar JSON'}
                        </button>
                      </div>
                      <pre className="p-3 bg-slate-900 text-indigo-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800 leading-tight max-h-48">
                        {p.paramSalida}
                      </pre>
                    </div>

                  </div>

                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Pie del Modal */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">
            Presiona <kbd className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">ESC</kbd> o la tecla de cierre para salir.
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="px-5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Cerrar Documentación
          </button>
        </div>

      </div>
    </div>
  );
}
