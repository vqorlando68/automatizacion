import { useState, useEffect, useMemo } from 'react';

export interface EntidadHija {
  id: number;
  nombre_entidad: string;
}

export interface Entidad {
  id: number;
  label: string;
  url_logo?: string;
  entidades_hijas: EntidadHija[];
}

export interface Profesional {
  id: number;
  nombre_profesional: string;
  url_foto?: string;
  reg?: string;
}

export interface Especialidad {
  id: number;
  nombre_especialidad: string;
}

export interface EspecialidadUsuario {
  id_usuario: number;
  id_especialidad: number;
}

export interface CarguePendiente {
  id: number;
  nombre_archivo: string;
}

export interface ProfesionalSeleccionado {
  id_profesional: number;
  nombre_profesional: string;
  url_foto?: string;
  reg?: string;
  id_especialidad: number;
  nombre_especialidad: string;
  orden: number;
}

export interface ResultadoAtencion {
  id_especialidad: number;
  nombre_especialidad: string;
  id_profesional: number;
  nombre_profesional: string;
  cantidad_atenciones: number;
}

export interface TotalesDashboard {
  total_atenciones: number;
  total_profesionales: number;
  total_especialidades: number;
}

type ModoOperacion = 'nuevas' | 'solicitudes' | 'vencidas';

function ensureArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return ensureArray<T>(parsed);
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

export function Autoprogramaciones() {
  // --- Estados de Catálogos ---
  const [loadingCatalogos, setLoadingCatalogos] = useState(true);
  const [catalogosError, setCatalogosError] = useState<string | null>(null);

  const [entidades, setEntidades] = useState<Entidad[]>([]);
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [especialidadesUsuario, setEspecialidadesUsuario] = useState<EspecialidadUsuario[]>([]);
  const [carguesPendientes, setCarguesPendientes] = useState<CarguePendiente[]>([]);

  // --- Estados del Formulario ---
  const [modoOperacion, setModoOperacion] = useState<ModoOperacion>('nuevas');
  const [selectedEntidadId, setSelectedEntidadId] = useState<string>('');
  const [selectedConvenioId, setSelectedConvenioId] = useState<string>('');
  const [selectedCargueId, setSelectedCargueId] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');

  // --- Estados de Selección de Especialidad y Profesionales ---
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<string>('');
  const [searchEspecialidadText, setSearchEspecialidadText] = useState<string>('');
  const [profesionalesSeleccionados, setProfesionalesSeleccionados] = useState<ProfesionalSeleccionado[]>([]);

  // --- Estados de Ejecución y Dashboard ---
  const [ejecutando, setEjecutando] = useState(false);
  const [ejecucionError, setEjecucionError] = useState<string | null>(null);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [resultadosAgenda, setResultadosAgenda] = useState<ResultadoAtencion[]>([]);
  const [totalesAgenda, setTotalesAgenda] = useState<TotalesDashboard | null>(null);

  // Cargar Catálogos desde API
  useEffect(() => {
    fetchCatalogos();
  }, []);

  const fetchCatalogos = async () => {
    setLoadingCatalogos(true);
    setCatalogosError(null);
    try {
      const response = await fetch('/api/autoprogramaciones-catalogos');
      const data = await response.json();
      if (response.ok && data.success) {
        const ents = ensureArray<Entidad>(data.entidades);
        const profs = ensureArray<Profesional>(data.profesionales);
        const esps = ensureArray<Especialidad>(data.especialidades);
        const espUsr = ensureArray<EspecialidadUsuario>(data.especialidades_usuario);
        const cargues = ensureArray<CarguePendiente>(data.cargues_pendientes);

        setEntidades(ents);
        setProfesionales(profs);
        setEspecialidades(esps);
        setEspecialidadesUsuario(espUsr);
        setCarguesPendientes(cargues);

        // Seleccionar por defecto primera especialidad si existe
        if (esps.length > 0) {
          setSelectedEspecialidadId(String(esps[0].id));
        }
      } else {
        setCatalogosError(data.error || 'Error al cargar los catálogos.');
      }
    } catch (err) {
      console.error('Error cargando catálogos:', err);
      setCatalogosError('Error de conexión al cargar datos iniciales.');
    } finally {
      setLoadingCatalogos(false);
    }
  };

  // Especialidades que realmente tienen profesionales asociados
  const especialidadesConProfesionales = useMemo(() => {
    const esps = ensureArray<Especialidad>(especialidades);
    const profs = ensureArray<Profesional>(profesionales);
    const rels = ensureArray<EspecialidadUsuario>(especialidadesUsuario);

    if (profs.length === 0) return [];

    if (rels.length > 0) {
      return esps.filter(esp => {
        const idsUsuarios = rels
          .filter(eu => String(eu.id_especialidad) === String(esp.id))
          .map(eu => eu.id_usuario);
        return profs.some(p => idsUsuarios.includes(p.id));
      });
    }

    return esps;
  }, [especialidades, profesionales, especialidadesUsuario]);

  // Posicionar por defecto en la primera especialidad con profesionales al cargar
  useEffect(() => {
    if (especialidadesConProfesionales.length > 0) {
      const existe = especialidadesConProfesionales.some(e => String(e.id) === String(selectedEspecialidadId));
      if (!existe) {
        setSelectedEspecialidadId(String(especialidadesConProfesionales[0].id));
      }
    } else {
      setSelectedEspecialidadId('');
    }
  }, [especialidadesConProfesionales, selectedEspecialidadId]);

  // Convenios de la Entidad seleccionada
  const conveniosDisponibles = useMemo(() => {
    if (!selectedEntidadId) return [];
    const ent = entidades.find(e => String(e.id) === String(selectedEntidadId));
    return ent ? ensureArray<EntidadHija>(ent.entidades_hijas) : [];
  }, [selectedEntidadId, entidades]);

  // Especialidades filtradas por búsqueda (solo aquellas con profesionales)
  const especialidadesFiltradas = useMemo(() => {
    if (!searchEspecialidadText.trim()) return especialidadesConProfesionales;
    const term = searchEspecialidadText.toLowerCase();
    return especialidadesConProfesionales.filter(e => e.nombre_especialidad && e.nombre_especialidad.toLowerCase().includes(term));
  }, [especialidadesConProfesionales, searchEspecialidadText]);

  // Profesionales disponibles para la especialidad seleccionada
  const profesionalesPorEspecialidad = useMemo(() => {
    if (!selectedEspecialidadId) return [];
    const espId = Number(selectedEspecialidadId);
    
    const rels = ensureArray<EspecialidadUsuario>(especialidadesUsuario);
    const profs = ensureArray<Profesional>(profesionales);

    // Buscar id_usuario asociados a esta especialidad en tkr_especialidades_usuario
    const idsUsuarios = rels
      .filter(eu => String(eu.id_especialidad) === String(espId))
      .map(eu => eu.id_usuario);

    // Si hay asignaciones específicas, filtrar; si no hay ninguna cargada, mostrar profesionales activos
    if (idsUsuarios.length > 0) {
      return profs.filter(p => idsUsuarios.includes(p.id));
    }
    return profs;
  }, [selectedEspecialidadId, especialidadesUsuario, profesionales]);

  // Manejar selección de un profesional
  const toggleSeleccionProfesional = (prof: Profesional) => {
    const esp = especialidades.find(e => String(e.id) === String(selectedEspecialidadId));
    if (!esp) return;

    const yaSeleccionadoIndex = profesionalesSeleccionados.findIndex(
      p => p.id_profesional === prof.id && p.id_especialidad === esp.id
    );

    if (yaSeleccionadoIndex >= 0) {
      // Eliminar de seleccionados
      const actualizados = profesionalesSeleccionados.filter((_, idx) => idx !== yaSeleccionadoIndex);
      // Re-indexar orden
      const reordenados = actualizados.map((item, idx) => ({ ...item, orden: idx + 1 }));
      setProfesionalesSeleccionados(reordenados);
    } else {
      // Agregar a seleccionados
      const nuevo: ProfesionalSeleccionado = {
        id_profesional: prof.id,
        nombre_profesional: prof.nombre_profesional,
        url_foto: prof.url_foto,
        reg: prof.reg || `Reg. ${prof.id * 12345}`,
        id_especialidad: esp.id,
        nombre_especialidad: esp.nombre_especialidad,
        orden: profesionalesSeleccionados.length + 1
      };
      setProfesionalesSeleccionados([...profesionalesSeleccionados, nuevo]);
    }
  };

  const eliminarProfesionalSeleccionado = (index: number) => {
    const actualizados = profesionalesSeleccionados.filter((_, idx) => idx !== index);
    const reordenados = actualizados.map((item, idx) => ({ ...item, orden: idx + 1 }));
    setProfesionalesSeleccionados(reordenados);
  };

  const resetFormulario = () => {
    setModoOperacion('nuevas');
    setSelectedEntidadId('');
    setSelectedConvenioId('');
    setSelectedCargueId('');
    setFechaHasta('');
    setProfesionalesSeleccionados([]);
    setEjecucionError(null);
    setDashboardVisible(false);
  };

  // Enviar y Correr Programa (Validaciones requeridas)
  const handleCorrerPrograma = async () => {
    setEjecucionError(null);

    if (!selectedEntidadId) {
      setEjecucionError('Debe seleccionar la Entidad.');
      return;
    }

    if (conveniosDisponibles.length > 0 && !selectedConvenioId) {
      setEjecucionError('Debe seleccionar el Convenio.');
      return;
    }

    if (modoOperacion === 'nuevas' && !selectedCargueId) {
      setEjecucionError('Debe seleccionar el Cargue de Pacientes (Nombre del Archivo).');
      return;
    }

    if (!fechaHasta) {
      setEjecucionError('Debe seleccionar la fecha de corte (Programar hasta fecha).');
      return;
    }

    if (profesionalesSeleccionados.length === 0) {
      setEjecucionError('Debe seleccionar al menos un profesional.');
      return;
    }

    setEjecutando(true);
    try {
      const payload = {
        modo_operacion: modoOperacion,
        id_entidad: selectedEntidadId ? Number(selectedEntidadId) : null,
        id_convenio: selectedConvenioId ? Number(selectedConvenioId) : null,
        id_temp_cargue: selectedCargueId ? Number(selectedCargueId) : null,
        fecha_hasta: fechaHasta || null,
        profesionales: profesionalesSeleccionados
      };

      const response = await fetch('/api/autoprogramaciones-agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const rawList = data.atenciones_agendadas || data.resultados || [];
        const listaNormalizada: ResultadoAtencion[] = rawList.map((item: any) => ({
          id_especialidad: item.id_especialidad,
          nombre_especialidad: item.nombre_especialidad || 'Especialidad',
          id_profesional: item.id_profesional || 0,
          nombre_profesional: item.PROFESIONAL || item.nombre_profesional || 'Profesional Médico',
          cantidad_atenciones: Number(item['Cantidad de Atenciones'] ?? item.cantidad_atenciones ?? 0)
        }));

        setResultadosAgenda(listaNormalizada);
        setTotalesAgenda(data.totales || {
          total_atenciones: listaNormalizada.reduce((acc: number, r: any) => acc + r.cantidad_atenciones, 0),
          total_profesionales: new Set(listaNormalizada.map(r => r.nombre_profesional)).size,
          total_especialidades: new Set(listaNormalizada.map(r => r.id_especialidad)).size
        });
        setDashboardVisible(true);
      } else {
        setEjecucionError(data.error || 'Ocurrió un error durante la ejecución de pkgln_automatizaciones.p_agendar.');
      }
    } catch (err) {
      console.error('Error al ejecutar agendamiento:', err);
      setEjecucionError('Error de comunicación con el servidor.');
    } finally {
      setEjecutando(false);
    }
  };

  // --- RENDERING DASHBOARD ---
  if (dashboardVisible) {
    // Agrupar desglose por especialidad
    const desgloseEspecialidad = resultadosAgenda.reduce((acc, curr) => {
      if (!acc[curr.nombre_especialidad]) {
        acc[curr.nombre_especialidad] = 0;
      }
      acc[curr.nombre_especialidad] += curr.cantidad_atenciones;
      return acc;
    }, {} as Record<string, number>);

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Encabezado Dashboard */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                ✓ Proceso Completado
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Dashboard de Agendamiento Masivo
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
              Resultados obtenidos tras la ejecución de <code className="text-indigo-500 font-mono">pkgln_automatizaciones.p_agendar</code>
            </p>
          </div>
          <button
            onClick={resetFormulario}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
          >
            ← Nueva Programación
          </button>
        </div>

        {/* Tarjetas de Totales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950/40 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Atenciones Creadas</span>
            <div className="text-4xl font-black text-indigo-700 dark:text-indigo-300 mt-2">
              {totalesAgenda?.total_atenciones || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Citas médicas asignadas e ingresadas</span>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-slate-900 dark:to-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider">Especialidades Atendidas</span>
            <div className="text-4xl font-black text-cyan-700 dark:text-cyan-300 mt-2">
              {totalesAgenda?.total_especialidades || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Áreas médicas configuradas</span>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-900 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800/50 rounded-2xl p-5 shadow-xs">
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Profesionales Asignados</span>
            <div className="text-4xl font-black text-purple-700 dark:text-purple-300 mt-2">
              {totalesAgenda?.total_profesionales || 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Médicos programados con orden</span>
          </div>
        </div>

        {/* Desglose por Especialidad y Desglose por Profesional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Desglose por Especialidad */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Desglose por Especialidad
            </h3>
            <div className="space-y-3">
              {Object.entries(desgloseEspecialidad).map(([espNombre, cantidad]) => {
                const porcentaje = totalesAgenda?.total_atenciones
                  ? Math.round((cantidad / totalesAgenda.total_atenciones) * 100)
                  : 0;

                return (
                  <div key={espNombre} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{espNombre}</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{cantidad} atenciones ({porcentaje}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Desglose por Profesional */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
              Desglose por Profesional
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Profesional</th>
                    <th className="pb-2">Especialidad</th>
                    <th className="pb-2 text-right">Atenciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {resultadosAgenda.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 font-bold text-slate-900 dark:text-white">{r.nombre_profesional}</td>
                      <td className="py-2.5 text-slate-500">{r.nombre_especialidad}</td>
                      <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{r.cantidad_atenciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Dashboard */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={resetFormulario}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            Aceptar y Volver
          </button>
        </div>
      </div>
    );
  }

  // --- RENDERING FORMULARIO PRINCIPAL ---
  return (
    <div className="space-y-6">
      {/* Título Principal */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          Generar y Reprogramar Atenciones
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure los parámetros para la asignación masiva de citas médicas.
        </p>
      </div>

      {loadingCatalogos ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium text-slate-500">Cargando datos de catálogo desde Oracle...</span>
        </div>
      ) : (
        <>
          {catalogosError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{catalogosError}</span>
            </div>
          )}

          {ejecucionError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{ejecucionError}</span>
            </div>
          )}

          {/* MODO DE OPERACIÓN */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              MODO DE OPERACIÓN
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Tarjeta 1: Generar Atenciones Nuevas */}
              <button
                type="button"
                onClick={() => setModoOperacion('nuevas')}
                className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer ${
                  modoOperacion === 'nuevas'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-sm ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    modoOperacion === 'nuevas' ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    ⊕
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Generar Atenciones Nuevas</h4>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                  Cree nuevas agendas basadas en un cargue de pacientes nuevos
                </p>
              </button>

              {/* Tarjeta 2: Programar desde Solicitudes */}
              <button
                type="button"
                onClick={() => setModoOperacion('solicitudes')}
                className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer ${
                  modoOperacion === 'solicitudes'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-sm ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    modoOperacion === 'solicitudes' ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    📋
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Programar desde Solicitudes</h4>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                  Asigne citas a partir del comité multidisciplinario.
                </p>
              </button>

              {/* Tarjeta 3: Programar desde Vencidas */}
              <button
                type="button"
                onClick={() => setModoOperacion('vencidas')}
                className={`p-4 text-left rounded-2xl border transition-all duration-200 cursor-pointer ${
                  modoOperacion === 'vencidas'
                    ? 'border-cyan-500 bg-cyan-50/40 dark:bg-cyan-950/20 shadow-sm ring-1 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    modoOperacion === 'vencidas' ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}>
                    🕒
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Programar desde Vencidas</h4>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-tight">
                  Reprogramar las atenciones que superaron el tiempo límite de espera.
                </p>
              </button>
            </div>
          </div>

          {/* CUERPO EN DOS COLUMNAS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUMNA IZQUIERDA: FILTROS Y DATOS DE ENTRADA (SPAN 7) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  FILTROS Y DATOS DE ENTRADA
                </h3>

                {/* Fila Entidad / Convenio */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Entidad
                    </label>
                    <select
                      value={selectedEntidadId}
                      onChange={(e) => {
                        setSelectedEntidadId(e.target.value);
                        setSelectedConvenioId('');
                      }}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccione Entidad</option>
                      {entidades.map((ent) => (
                        <option key={ent.id} value={ent.id}>
                          {ent.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Convenio
                    </label>
                    <select
                      value={selectedConvenioId}
                      onChange={(e) => setSelectedConvenioId(e.target.value)}
                      disabled={!selectedEntidadId || conveniosDisponibles.length === 0}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">
                        {selectedEntidadId && conveniosDisponibles.length === 0
                          ? 'Sin convenios (no requiere)'
                          : 'Seleccione Convenio'}
                      </option>
                      {conveniosDisponibles.map((conv) => (
                        <option key={conv.id} value={conv.id}>
                          {conv.nombre_entidad}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Cargue de Pacientes (Solo visible en Generar Atenciones Nuevas) */}
                {modoOperacion === 'nuevas' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Cargue de Pacientes <span className="font-normal text-slate-400">(Nombre del Archivo)</span>
                    </label>
                    <select
                      value={selectedCargueId}
                      onChange={(e) => setSelectedCargueId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                    >
                      <option value="">Seleccione un archivo...</option>
                      {carguesPendientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_archivo} (ID: {c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Programar hasta fecha */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Programar hasta fecha
                  </label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                  />
                </div>

                {/* PROFESIONALES SELECCIONADOS */}
                <div className="bg-slate-50/70 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3 mt-4">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    PROFESIONALES SELECCIONADOS
                  </h4>

                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-blue-50/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="px-4 py-2.5">Profesional</th>
                          <th className="px-4 py-2.5">Especialidad</th>
                          <th className="px-4 py-2.5 text-center w-20">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {profesionalesSeleccionados.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-4 py-6 text-center text-slate-400 italic">
                              No hay profesionales seleccionados aún. Elige uno del panel de la derecha.
                            </td>
                          </tr>
                        ) : (
                          profesionalesSeleccionados.map((item, idx) => (
                            <tr key={`${item.id_profesional}-${item.id_especialidad}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-4 py-2.5 font-medium">{item.nombre_profesional}</td>
                              <td className="px-4 py-2.5">{item.nombre_especialidad}</td>
                              <td className="px-4 py-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => eliminarProfesionalSeleccionado(idx)}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-all cursor-pointer"
                                  title="Eliminar profesional"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* COLUMNA DERECHA: ESPECIALIDADES Y PROFESIONALES (SPAN 5) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  ESPECIALIDADES Y PROFESIONALES
                </h3>

                {/* Seleccionar Especialidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Seleccionar Especialidad
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar especialidad..."
                      value={searchEspecialidadText}
                      onChange={(e) => setSearchEspecialidadText(e.target.value)}
                      className="w-full pl-4 pr-9 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 text-xs">🔍</span>
                  </div>

                  {/* Selector rápido de especialidades */}
                  <select
                    value={selectedEspecialidadId}
                    onChange={(e) => setSelectedEspecialidadId(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {especialidadesFiltradas.map((esp) => (
                      <option key={esp.id} value={esp.id}>
                        {esp.nombre_especialidad}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Lista de Profesionales Disponibles */}
                <div className="space-y-3 pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">
                    Profesionales disponibles para la especialidad:
                  </span>

                  <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                    {profesionalesPorEspecialidad.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-4 text-center">
                        No hay profesionales asociados a esta especialidad.
                      </p>
                    ) : (
                      profesionalesPorEspecialidad.map((prof) => {
                        const espActual = especialidades.find(e => String(e.id) === String(selectedEspecialidadId));
                        const itemSeleccionado = profesionalesSeleccionados.find(
                          p => p.id_profesional === prof.id && p.id_especialidad === espActual?.id
                        );
                        const estaSeleccionado = !!itemSeleccionado;

                        return (
                          <div
                            key={prof.id}
                            onClick={() => toggleSeleccionProfesional(prof)}
                            className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                              estaSeleccionado
                                ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-xs'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={prof.url_foto || 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80'}
                                alt={prof.nombre_profesional}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                              />
                              <div>
                                <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                                  {prof.nombre_profesional}
                                </h5>
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  {prof.reg || `Reg. ${prof.id * 12345}`}
                                </span>
                              </div>
                            </div>

                            {/* Badge de Orden o Selección */}
                            <div>
                              {estaSeleccionado ? (
                                <div className="text-center">
                                  <span className="text-[9px] font-black uppercase text-cyan-600 dark:text-cyan-400 block">ORDEN</span>
                                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white font-bold text-xs inline-flex items-center justify-center shadow-xs">
                                    {itemSeleccionado.orden}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 hover:underline">
                                  + Seleccionar
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* BOTONES INFERIORES DE ACCIÓN */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={resetFormulario}
              className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleCorrerPrograma}
              disabled={ejecutando}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-md shadow-cyan-600/20 active:scale-95 flex items-center gap-2"
            >
              {ejecutando ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Ejecutando p_agendar...</span>
                </>
              ) : (
                <>
                  <span>▷</span>
                  <span>Correr Programa</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
