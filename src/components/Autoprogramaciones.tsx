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
  const [pasoActual, setPasoActual] = useState<'parametrizar' | 'validar' | 'resultado'>('parametrizar');
  const [idProceso, setIdProceso] = useState<number | null>(null);
  const [resultadosAgenda, setResultadosAgenda] = useState<ResultadoAtencion[]>([]);
  const [totalesAgenda, setTotalesAgenda] = useState<TotalesDashboard | null>(null);

  // --- Estados de la Pantalla de Validación (Paso 2) ---
  const [citasAValidar, setCitasAValidar] = useState<any[]>([]);
  const [citasSeleccionadas, setCitasSeleccionadas] = useState<number[]>([]); // IDs de citas marcadas para borrar
  const [cargandoCitas, setCargandoCitas] = useState(false);
  const [procesandoValidacion, setProcesandoValidacion] = useState(false);
  const [searchCitaText, setSearchCitaText] = useState('');
  const [paginaActualCitas, setPaginaActualCitas] = useState(1);
  const [citasPorPagina, setCitasPorPagina] = useState(10);

  // --- Estados del Modal de Historial de Paciente ---
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalPacienteNombre, setModalPacienteNombre] = useState('');
  const [modalPacienteTipoId, setModalPacienteTipoId] = useState('');
  const [modalPacienteIdentificacion, setModalPacienteIdentificacion] = useState('');
  const [modalPacienteCorreo, setModalPacienteCorreo] = useState('');
  const [modalPacienteTelefono, setModalPacienteTelefono] = useState('');
  const [modalPacienteTotalRegistros, setModalPacienteTotalRegistros] = useState<number>(0);
  const [modalCitas, setModalCitas] = useState<any[]>([]);
  const [modalCargando, setModalCargando] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSearchText, setModalSearchText] = useState('');
  const [modalPaginaActual, setModalPaginaActual] = useState(1);
  const [modalCitasPorPagina, setModalCitasPorPagina] = useState(5);
  const [modalSortKey, setModalSortKey] = useState<string>('id');
  const [modalSortOrder, setModalSortOrder] = useState<'asc' | 'desc'>('desc');

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
    setPasoActual('parametrizar');
    setIdProceso(null);
    setCitasAValidar([]);
    setCitasSeleccionadas([]);
    setSearchCitaText('');
    setPaginaActualCitas(1);
    setModalAbierto(false);
    setModalPacienteNombre('');
    setModalPacienteTipoId('');
    setModalPacienteIdentificacion('');
    setModalPacienteCorreo('');
    setModalPacienteTelefono('');
    setModalPacienteTotalRegistros(0);
    setModalCitas([]);
    setModalSearchText('');
    setModalPaginaActual(1);
    setModalSortKey('id');
    setModalSortOrder('desc');
  };

  const abrirModalPaciente = async (cita: any) => {
    setModalPacienteNombre(cita.nombre_paciente || '');
    setModalPacienteTipoId(cita.tipo_identificacion_paciente || '');
    setModalPacienteIdentificacion(cita.identificacion_paciente || '');
    setModalPacienteCorreo(cita.correo_electronico_paciente || '');
    setModalPacienteTelefono(cita.telefono_paciente || '');
    setModalPacienteTotalRegistros(Number(cita.total_registros_usuario) || 0);

    setModalCitas([]);
    setModalError(null);
    setModalCargando(true);
    setModalAbierto(true);
    setModalSearchText('');
    setModalPaginaActual(1);
    setModalSortKey('id');
    setModalSortOrder('desc');

    try {
      const response = await fetch(`/api/autoprogramaciones-paciente-citas?id_usuario=${cita.id_usuario}&id_cita=${cita.id}&id_proceso=${idProceso}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setModalCitas(data.citas || []);
        if (data.citas && data.citas.length > 0) {
          const firstCita = data.citas[0];
          if (firstCita.tipo_identificacion_paciente) setModalPacienteTipoId(firstCita.tipo_identificacion_paciente);
          if (firstCita.identificacion_paciente) setModalPacienteIdentificacion(firstCita.identificacion_paciente);
          if (firstCita.correo_electronico_paciente) setModalPacienteCorreo(firstCita.correo_electronico_paciente);
          if (firstCita.telefono_paciente) setModalPacienteTelefono(firstCita.telefono_paciente);
          if (firstCita.total_registros_usuario !== undefined) setModalPacienteTotalRegistros(Number(firstCita.total_registros_usuario) || 0);
        }
      } else {
        setModalError(data.error || 'Error al obtener el historial de citas del paciente.');
      }
    } catch (err) {
      console.error(err);
      setModalError('Error de comunicación con el servidor al consultar citas del paciente.');
    } finally {
      setModalCargando(false);
    }
  };

  // Helper para cambiar el orden de las columnas en el modal
  const handleModalSort = (key: string) => {
    if (modalSortKey === key) {
      setModalSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setModalSortKey(key);
      setModalSortOrder('asc');
    }
  };

  // Filtrar y ordenar citas del modal
  const modalCitasFiltradas = useMemo(() => {
    let result = modalCitas;
    if (modalSearchText.trim()) {
      const term = modalSearchText.toLowerCase();
      result = modalCitas.filter(c => 
        (c.codigo_cita && c.codigo_cita.toLowerCase().includes(term)) ||
        (c.estado_cita && c.estado_cita.toLowerCase().includes(term)) ||
        (c.fecha_cita && c.fecha_cita.toLowerCase().includes(term)) ||
        (c.nombre_especialidad && c.nombre_especialidad.toLowerCase().includes(term)) ||
        (c.nombre_profesional && c.nombre_profesional.toLowerCase().includes(term))
      );
    }

    return [...result].sort((a, b) => {
      let valA = a[modalSortKey];
      let valB = b[modalSortKey];

      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (modalSortKey === 'fecha_cita') {
        const parseFecha = (str: string) => {
          if (!str) return 0;
          const parts = str.split(' ');
          if (parts.length < 2) return 0;
          const dateParts = parts[0].split('/');
          if (dateParts.length < 3) return 0;
          const day = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1;
          const year = parseInt(dateParts[2], 10);
          
          let timeParts = parts[1].split(':');
          if (timeParts.length < 2) return 0;
          let hour = parseInt(timeParts[0], 10);
          const minute = parseInt(timeParts[1], 10);
          const ampm = parts[2] ? parts[2].toLowerCase() : '';

          if (ampm === 'pm' && hour < 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;

          return new Date(year, month, day, hour, minute).getTime();
        };

        const timeA = parseFecha(String(valA));
        const timeB = parseFecha(String(valB));
        return modalSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return modalSortOrder === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return modalSortOrder === 'asc' 
        ? strA.localeCompare(strB) 
        : strB.localeCompare(strA);
    });
  }, [modalCitas, modalSearchText, modalSortKey, modalSortOrder]);

  // Resetear paginación del modal al buscar
  useEffect(() => {
    setModalPaginaActual(1);
  }, [modalSearchText]);

  // Total páginas modal
  const modalTotalPaginas = useMemo(() => {
    return Math.ceil(modalCitasFiltradas.length / modalCitasPorPagina) || 1;
  }, [modalCitasFiltradas, modalCitasPorPagina]);

  // Citas paginadas del modal
  const modalCitasPaginadas = useMemo(() => {
    const start = (modalPaginaActual - 1) * modalCitasPorPagina;
    return modalCitasFiltradas.slice(start, start + modalCitasPorPagina);
  }, [modalCitasFiltradas, modalPaginaActual, modalCitasPorPagina]);

  const toggleSeleccionCita = (id: number) => {
    if (citasSeleccionadas.includes(id)) {
      setCitasSeleccionadas(citasSeleccionadas.filter(cid => cid !== id));
    } else {
      setCitasSeleccionadas([...citasSeleccionadas, id]);
    }
  };

  // Filtrar citas según el buscador
  const citasFiltradas = useMemo(() => {
    if (!searchCitaText.trim()) return citasAValidar;
    const term = searchCitaText.toLowerCase();
    return citasAValidar.filter(c => 
      (c.codigo_cita && c.codigo_cita.toLowerCase().includes(term)) ||
      (c.nombre_paciente && c.nombre_paciente.toLowerCase().includes(term)) ||
      (c.nombre_especialidad && c.nombre_especialidad.toLowerCase().includes(term)) ||
      (c.nombre_profesional && c.nombre_profesional.toLowerCase().includes(term))
    );
  }, [citasAValidar, searchCitaText]);

  // Resetear a la página 1 cuando cambia el texto de búsqueda
  useEffect(() => {
    setPaginaActualCitas(1);
  }, [searchCitaText]);

  // Calcular páginas
  const totalPaginasCitas = useMemo(() => {
    return Math.ceil(citasFiltradas.length / citasPorPagina) || 1;
  }, [citasFiltradas, citasPorPagina]);

  // Obtener citas de la página actual
  const citasPaginadas = useMemo(() => {
    const start = (paginaActualCitas - 1) * citasPorPagina;
    return citasFiltradas.slice(start, start + citasPorPagina);
  }, [citasFiltradas, paginaActualCitas, citasPorPagina]);

  // Saber si todas las citas FILTRADAS están seleccionadas
  const todasSeleccionadas = useMemo(() => {
    if (citasFiltradas.length === 0) return false;
    return citasFiltradas.every(c => citasSeleccionadas.includes(c.id));
  }, [citasFiltradas, citasSeleccionadas]);

  const toggleSeleccionarTodas = () => {
    if (todasSeleccionadas) {
      // Desmarcar todas las filtradas
      const idsFiltrados = citasFiltradas.map(c => c.id);
      setCitasSeleccionadas(citasSeleccionadas.filter(id => !idsFiltrados.includes(id)));
    } else {
      // Marcar todas las filtradas
      const nuevasSelecciones = [...citasSeleccionadas];
      citasFiltradas.forEach(c => {
        if (!nuevasSelecciones.includes(c.id)) {
          nuevasSelecciones.push(c.id);
        }
      });
      setCitasSeleccionadas(nuevasSelecciones);
    }
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
        if (data.id_proceso === null || data.id_proceso === undefined) {
          setEjecucionError('No se encontró atenciones o disponibilidad de profesionales.');
          return;
        }
        const idProcesoObtenido = data.id_proceso;
        setIdProceso(idProcesoObtenido);

        // Consultar citas generadas para el idProceso
        setCargandoCitas(true);
        try {
          const resCitas = await fetch(`/api/autoprogramaciones-citas?id_proceso=${idProcesoObtenido}`);
          const dataCitas = await resCitas.json();
          
          if (resCitas.ok && dataCitas.success) {
            setCitasAValidar(dataCitas.citas || []);
            setCitasSeleccionadas([]); // Limpiar previas
            setPasoActual('validar');
          } else {
            setEjecucionError(dataCitas.error || 'Error al consultar las citas generadas.');
          }
        } catch (errCitas) {
          console.error('Error fetching citas:', errCitas);
          setEjecucionError('Error al conectar con el servidor para obtener las citas.');
        } finally {
          setCargandoCitas(false);
        }
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

  const handleProcesarValidacion = async () => {
    setEjecucionError(null);
    setProcesandoValidacion(true);

    try {
      const citasABorrarStr = citasSeleccionadas.join(',');
      
      const response = await fetch('/api/autoprogramaciones-validar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citas_a_borrar: citasABorrarStr })
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
        setPasoActual('resultado');
      } else {
        setEjecucionError(data.error || 'Ocurrió un error al procesar la validación.');
      }
    } catch (err) {
      console.error('Error al validar:', err);
      setEjecucionError('Error de comunicación con el servidor al validar.');
    } finally {
      setProcesandoValidacion(false);
    }
  };

  // --- COMPONENTES AUXILIARES DE RENDERIZADO ---

  const renderPasos = () => {
    const pasos = [
      { id: 'parametrizar', label: 'Parametrizar', num: 1 },
      { id: 'validar', label: 'Validar', num: 2 },
      { id: 'resultado', label: 'Resultado', num: 3 },
    ];

    const getIndex = (id: string) => pasos.findIndex(p => p.id === id);
    const indexActual = getIndex(pasoActual);

    return (
      <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-4 flex items-center justify-center gap-4 md:gap-8 flex-wrap shadow-xs mb-6">
        {pasos.map((paso, idx) => {
          const indexPaso = idx;
          const isActive = paso.id === pasoActual;
          const isCompleted = indexPaso < indexActual;

          return (
            <div key={paso.id} className="flex items-center gap-4 md:gap-8">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? 'bg-cyan-500 text-white shadow-md ring-4 ring-cyan-500/15'
                      : isCompleted
                      ? 'bg-cyan-600/10 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400 border border-cyan-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : paso.num}
                </span>
                <span
                  className={`text-xs md:text-sm font-bold tracking-wide transition-colors duration-300 ${
                    isActive
                      ? 'text-cyan-600 dark:text-cyan-400 font-extrabold'
                      : isCompleted
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-400 dark:text-slate-500 font-medium'
                  }`}
                >
                  {paso.label}
                </span>
              </div>
              {idx < pasos.length - 1 && (
                <span className="text-slate-300 dark:text-slate-700 font-semibold select-none">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderCabecera = () => {
    let titulo = '';
    let descripcion = '';

    if (pasoActual === 'parametrizar') {
      titulo = 'Generar y Reprogramar Atenciones';
      descripcion = 'Configure los parámetros para la asignación masiva de citas médicas.';
    } else if (pasoActual === 'validar') {
      titulo = 'Validación de Citas Médicas';
      descripcion = `Proceso ID: ${idProceso || 10}. Seleccione las citas que desea descartar/borrar antes de confirmar el agendamiento.`;
    } else if (pasoActual === 'resultado') {
      titulo = 'Resultado del Agendamiento';
      descripcion = 'Consolidado de atenciones finales ingresadas tras el proceso.';
    }

    return (
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
          {titulo}
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {descripcion}
        </p>
      </div>
    );
  };

  const renderPasoValidar = () => {
    if (cargandoCitas) {
      return (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium text-slate-500">Cargando citas generadas para validación...</span>
        </div>
      );
    }

    if (citasAValidar.length === 0) {
      return (
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto border border-amber-500/20">
            ⚠️
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No se encontraron registros para procesar</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              El proceso de agendamiento masivo (Proceso ID: {idProceso}) no generó ninguna cita médica.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setPasoActual('parametrizar')}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              ← Regresar a Parametrizar
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Citas Programadas
              </h3>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full border border-red-500/20">
              {citasSeleccionadas.length} de {citasAValidar.length} citas marcadas para borrar
            </span>
          </div>

          {/* Filtros superiores: buscador y registros por página */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            {/* Buscador */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Buscar por código, paciente, especialidad, médico..."
                value={searchCitaText}
                onChange={(e) => setSearchCitaText(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
              />
              {searchCitaText ? (
                <button
                  onClick={() => setSearchCitaText('')}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              ) : (
                <span className="absolute right-3 top-2.5 text-slate-400 text-xs">🔍</span>
              )}
            </div>

            {/* Registros por página */}
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-end">
              <span>Mostrar</span>
              <select
                value={citasPorPagina}
                onChange={(e) => {
                  setCitasPorPagina(Number(e.target.value));
                  setPaginaActualCitas(1);
                }}
                className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>registros</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                  <th className="px-4 py-3 text-center w-12">
                    <input
                      type="checkbox"
                      checked={todasSeleccionadas}
                      onChange={toggleSeleccionarTodas}
                      className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 rounded focus:ring-cyan-500"
                    />
                  </th>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Fecha de Cita</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3 text-center">Citas Agendadas</th>
                  <th className="px-4 py-3">Especialidad</th>
                  <th className="px-4 py-3">Profesional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                {citasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400 italic">
                      No se encontraron citas médicas que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  citasPaginadas.map((cita) => {
                    const estaMarcada = citasSeleccionadas.includes(cita.id);
                    return (
                      <tr
                        key={cita.id}
                        onClick={() => toggleSeleccionCita(cita.id)}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer ${
                          estaMarcada ? 'bg-red-500/5 dark:bg-red-500/10' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={estaMarcada}
                            onChange={() => toggleSeleccionCita(cita.id)}
                            className="w-4 h-4 text-red-600 bg-slate-100 border-slate-300 rounded focus:ring-red-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-950 dark:text-white">
                          {cita.codigo_cita}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {cita.fecha_cita}
                        </td>
                        <td 
                          className="px-4 py-3 font-semibold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 hover:underline cursor-pointer select-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalPaciente(cita);
                          }}
                        >
                          {cita.nombre_paciente}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300">
                            {cita.total_registros_usuario || 0}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {cita.nombre_especialidad}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                          {cita.nombre_profesional}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          {totalPaginasCitas > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Mostrando {Math.min(citasFiltradas.length, (paginaActualCitas - 1) * citasPorPagina + 1)} a {Math.min(citasFiltradas.length, paginaActualCitas * citasPorPagina)} de {citasFiltradas.length} registros
              </span>
              
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={paginaActualCitas === 1}
                  onClick={() => setPaginaActualCitas(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer select-none"
                >
                  Anterior
                </button>

                {(() => {
                  const maxVisiblePages = 5;
                  let startPage = Math.max(1, paginaActualCitas - Math.floor(maxVisiblePages / 2));
                  let endPage = Math.min(totalPaginasCitas, startPage + maxVisiblePages - 1);

                  if (endPage - startPage + 1 < maxVisiblePages) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }

                  const pageButtons = [];
                  for (let p = startPage; p <= endPage; p++) {
                    pageButtons.push(
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPaginaActualCitas(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          paginaActualCitas === p
                            ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/20'
                            : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                        } cursor-pointer`}
                      >
                        {p}
                      </button>
                    );
                  }
                  return pageButtons;
                })()}

                <button
                  type="button"
                  disabled={paginaActualCitas === totalPaginasCitas}
                  onClick={() => setPaginaActualCitas(p => Math.min(totalPaginasCitas, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer select-none"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPasoActual('parametrizar')}
            className="px-6 py-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-full transition-all cursor-pointer"
          >
            ← Volver a Parámetros
          </button>

          <button
            type="button"
            onClick={handleProcesarValidacion}
            disabled={procesandoValidacion}
            className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-full transition-all cursor-pointer shadow-md shadow-cyan-600/20 active:scale-95 flex items-center gap-2"
          >
            {procesandoValidacion ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Procesando Validación...</span>
              </>
            ) : (
              <>
                <span>Procesar Validación</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
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
  };

  // --- RENDERIZADO PRINCIPAL DEL COMPONENTE ---
  return (
    <div className="space-y-6">
      {renderPasos()}
      {renderCabecera()}

      {ejecucionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <span>⚠️</span>
          <span>{ejecucionError}</span>
        </div>
      )}

      {pasoActual === 'parametrizar' && (
        <>
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
        </>
      )}

      {pasoActual === 'validar' && renderPasoValidar()}
      
      {pasoActual === 'resultado' && renderDashboard()}

      {/* MODAL: ATENCIONES DEL PACIENTE */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            onClick={() => setModalAbierto(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 flex flex-col gap-4 animate-scale-in">
            {/* Header */}
            <div className="flex flex-col gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    Historial de Atenciones
                  </h3>
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400 mt-1">
                    {modalPacienteNombre}
                  </p>
                </div>
                <button 
                  onClick={() => setModalAbierto(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Patient Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-xs">
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Identificación</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {modalPacienteTipoId && modalPacienteIdentificacion 
                      ? `${modalPacienteTipoId} - ${modalPacienteIdentificacion}` 
                      : modalPacienteIdentificacion || modalPacienteTipoId || '---'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Teléfono</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350">
                    {modalPacienteTelefono || '---'}
                  </span>
                </div>
                <div className="md:col-span-2">
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Correo Electrónico</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-350 break-all">
                    {modalPacienteCorreo || '---'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400 dark:text-slate-500 font-semibold mb-0.5 uppercase tracking-wider text-[10px]">Citas Agendadas</span>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">
                    {modalPacienteTotalRegistros || 0}
                  </span>
                </div>
              </div>
            </div>

            {modalCargando ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-cyan-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs font-medium text-slate-500">Consultando historial del paciente...</span>
              </div>
            ) : modalError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-2xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{modalError}</span>
              </div>
            ) : modalCitas.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-8 text-center bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                No se encontraron citas previas asociadas a este paciente.
              </p>
            ) : (
              <div className="space-y-4">
                {/* Filtros del modal */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
                  {/* Buscador Modal */}
                  <div className="relative flex-1 max-w-sm">
                    <input
                      type="text"
                      placeholder="Filtrar por código, estado, especialidad, médico..."
                      value={modalSearchText}
                      onChange={(e) => setModalSearchText(e.target.value)}
                      className="w-full pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-cyan-500 text-slate-900 dark:text-white"
                    />
                    {modalSearchText ? (
                      <button
                        onClick={() => setModalSearchText('')}
                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-xs"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="absolute right-2.5 top-2 text-slate-400 text-xs">🔍</span>
                    )}
                  </div>

                  {/* Selector tamaño página Modal */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 justify-end">
                    <span>Mostrar</span>
                    <select
                      value={modalCitasPorPagina}
                      onChange={(e) => {
                        setModalCitasPorPagina(Number(e.target.value));
                        setModalPaginaActual(1);
                      }}
                      className="px-2 py-0.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-[11px] font-semibold text-slate-700 dark:text-slate-300"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                    <span>registros</span>
                  </div>
                </div>

                {/* Tabla de citas del modal */}
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                  <table className="w-full text-left text-xs min-w-[600px]">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800 select-none">
                        <th className="px-4 py-2.5 w-12 text-center"></th>
                        <th 
                          onClick={() => handleModalSort('codigo_cita')}
                          className="px-4 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Código</span>
                            {modalSortKey === 'codigo_cita' ? (modalSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleModalSort('fecha_cita')}
                          className="px-4 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Fecha</span>
                            {modalSortKey === 'fecha_cita' ? (modalSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleModalSort('estado_cita')}
                          className="px-4 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Estado</span>
                            {modalSortKey === 'estado_cita' ? (modalSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleModalSort('nombre_especialidad')}
                          className="px-4 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Especialidad</span>
                            {modalSortKey === 'nombre_especialidad' ? (modalSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleModalSort('nombre_profesional')}
                          className="px-4 py-2.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-1">
                            <span>Médico</span>
                            {modalSortKey === 'nombre_profesional' ? (modalSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                      {modalCitasPaginadas.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                            No se encontraron citas que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        modalCitasPaginadas.map((cita) => {
                          const estaMarcada = citasSeleccionadas.includes(cita.id);
                          const esProcesoActual = cita.proceso_actual === 'S';
                          return (
                            <tr 
                              key={cita.id} 
                              onClick={() => esProcesoActual && toggleSeleccionCita(cita.id)}
                              className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors ${
                                esProcesoActual ? 'cursor-pointer' : ''
                              } ${estaMarcada ? 'bg-red-500/5 dark:bg-red-500/10' : ''}`}
                            >
                              <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                {esProcesoActual ? (
                                  <input
                                    type="checkbox"
                                    checked={estaMarcada}
                                    onChange={() => toggleSeleccionCita(cita.id)}
                                    className="w-4 h-4 text-cyan-600 bg-slate-100 border-slate-300 rounded focus:ring-cyan-500 cursor-pointer"
                                  />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-700 select-none">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                                {cita.codigo_cita}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                                {cita.fecha_cita}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  cita.estado_cita?.toLowerCase() === 'atendida'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                    : cita.estado_cita?.toLowerCase() === 'cancelada'
                                    ? 'bg-red-500/10 text-red-600 border-red-500/20'
                                    : 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                                }`}>
                                  {cita.estado_cita || 'Asignada'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 font-semibold">
                                {cita.nombre_especialidad}
                              </td>
                              <td className="px-4 py-2.5 text-slate-800 dark:text-slate-200">
                                {cita.nombre_profesional}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginador Modal */}
                {modalTotalPaginas > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Mostrando {Math.min(modalCitasFiltradas.length, (modalPaginaActual - 1) * modalCitasPorPagina + 1)} a {Math.min(modalCitasFiltradas.length, modalPaginaActual * modalCitasPorPagina)} de {modalCitasFiltradas.length} registros
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={modalPaginaActual === 1}
                        onClick={() => setModalPaginaActual(p => Math.max(1, p - 1))}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer select-none"
                      >
                        Anterior
                      </button>

                      {(() => {
                        const pageButtons = [];
                        for (let p = 1; p <= modalTotalPaginas; p++) {
                          pageButtons.push(
                            <button
                              key={p}
                              type="button"
                              onClick={() => setModalPaginaActual(p)}
                              className={`w-6 h-6 rounded-lg text-[10px] font-bold transition-all ${
                                modalPaginaActual === p
                                  ? 'bg-cyan-500 text-white shadow-xs'
                                  : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                              } cursor-pointer`}
                            >
                              {p}
                            </button>
                          );
                        }
                        return pageButtons;
                      })()}

                      <button
                        type="button"
                        disabled={modalPaginaActual === modalTotalPaginas}
                        onClick={() => setModalPaginaActual(p => Math.min(modalTotalPaginas, p + 1))}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors cursor-pointer select-none"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setModalAbierto(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
