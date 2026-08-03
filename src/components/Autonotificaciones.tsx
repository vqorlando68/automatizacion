import React, { useState, useEffect, useMemo } from 'react';

interface Specialty {
  id: number;
  nombre_especialidad: string;
  tipo_especialidad?: string;
}

interface Profesional {
  id: number;
  fullName: string;
  img_url?: string;
  correo_electronico?: string;
  telefono?: string;
  specialty?: Specialty[];
  specialtiesIds?: string;
}

interface EntidadHijaCatalog {
  id: number;
  id_convenio?: number;
  nombre_entidad: string;
}

interface EntidadCatalog {
  id: number;
  label: string;
  url_logo?: string;
  entidades_hijas: EntidadHijaCatalog[];
}

interface CargueItem {
  id: number;
  nombre_archivo?: string;
  id_entidad?: number;
  nombre_entidad?: string;
  id_convenio?: number;
  nombre_convenio?: string;
}

interface Paciente {
  id_usuario: number;
  abreviatura: string;
  identificacion: string;
  nombre_paciente: string;
  correo_electronico: string;
  telefono: string;
}

interface CitaGiris {
  id_cita: number;
  codigo_cita?: string;
  fecha_cita: string;
  hora_cita: string;
  id_usuario?: number;
  nombre_paciente: string;
  identificacion: string;
  id_estado_cita: number;
  estado_cita: string;
}

export function Autonotificaciones() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Pasos: 1: Config, 2: Selección, 3: Previsualización
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form Step 1
  const [fechaHasta, setFechaHasta] = useState<string>(todayStr);
  const [isGiris, setIsGiris] = useState<boolean>(false);
  
  // Catalogs
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [entidadesStandard, setEntidadesStandard] = useState<EntidadCatalog[]>([]);
  const [entidadesGiris, setEntidadesGiris] = useState<EntidadCatalog[]>([]);
  const [carguesPendientes, setCarguesPendientes] = useState<CargueItem[]>([]);
  const [loadingCatalogos, setLoadingCatalogos] = useState<boolean>(true);

  // Filter & selections Step 1
  const [profSearch, setProfSearch] = useState<string>('');
  const [selectedProf, setSelectedProf] = useState<Profesional | null>(null);
  
  // Non-Giris selection
  const [selectedCargueId, setSelectedCargueId] = useState<number | null>(null);
  const [selectedCargueInfo, setSelectedCargueInfo] = useState<{ entidad: string; convenio: string } | null>(null);

  // Giris selection
  const [selectedEntidadId, setSelectedEntidadId] = useState<number | null>(null);
  const [selectedConvenioId, setSelectedConvenioId] = useState<number | null>(null);
  const [selectedEspecialidadId, setSelectedEspecialidadId] = useState<number | null>(null);

  // Step 1 Validation and Error message
  const [step1Error, setStep1Error] = useState<string>('');
  const [validatingStep1, setValidatingStep1] = useState<boolean>(false);

  // Step 2 Data & Filters
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [citasGiris, setCitasGiris] = useState<CitaGiris[]>([]);
  const [loadingTableData, setLoadingTableData] = useState<boolean>(false);
  const [tableSearch, setTableSearch] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('nombre_paciente');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selected items in Step 2
  const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
  const [selectedCitaIds, setSelectedCitaIds] = useState<number[]>([]);

  // Debug Modal State & Data (Triggered by Ctrl + Alt + D)
  const [showDebugModal, setShowDebugModal] = useState<boolean>(false);
  const [lastDebugPayload, setLastDebugPayload] = useState<any>(null);
  const [lastDebugResponse, setLastDebugResponse] = useState<any>(null);

  // Keyboard shortcut listener for Ctrl + Alt + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setShowDebugModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Step 3 Data
  const [plantillaHtml, setPlantillaHtml] = useState<string>('');
  const [plantillaAsunto, setPlantillaAsunto] = useState<string>('');
  const [plantillaError, setPlantillaError] = useState<string>('');
  const [loadingPlantilla, setLoadingPlantilla] = useState<boolean>(false);
  const [envioExitoso, setEnvioExitoso] = useState<boolean>(false);
  const [mensajeResultado, setMensajeResultado] = useState<string>('');
  const [enviando, setEnviando] = useState<boolean>(false);

  // Load Initial Catalog Data
  useEffect(() => {
    async function loadInitialData() {
      setLoadingCatalogos(true);
      try {
        // Profesionales via pkgln_automatizaciones.p_obtener_profesionales_notificacion
        const resProf = await fetch('/api/autonotificaciones-profesionales');
        const dataProf = await resProf.json();
        if (dataProf.success && Array.isArray(dataProf.profesionales)) {
          setProfesionales(dataProf.profesionales);
        }

        // Entidades Estándar
        const resCat = await fetch('/api/autoprogramaciones-catalogos');
        const dataCat = await resCat.json();
        if (dataCat.success) {
          if (Array.isArray(dataCat.entidades)) setEntidadesStandard(dataCat.entidades);
          if (Array.isArray(dataCat.cargues_pendientes)) setCarguesPendientes(dataCat.cargues_pendientes);
        }

        // Entidades GIRIS (tipo_convenio IN ('GV', 'GO')) via pkgln_automatizaciones.p_obtener_entidades_giris
        const resGiris = await fetch('/api/autonotificaciones-entidades-giris');
        const dataGiris = await resGiris.json();
        if (dataGiris.success && Array.isArray(dataGiris.entidades)) {
          setEntidadesGiris(dataGiris.entidades);
        }
      } catch (err) {
        console.error('Error al cargar catálogos de autonotificaciones:', err);
      } finally {
        setLoadingCatalogos(false);
      }
    }

    loadInitialData();
  }, []);

  // Update selected cargue info
  useEffect(() => {
    if (selectedCargueId && carguesPendientes.length > 0) {
      const cargue = carguesPendientes.find(c => c.id === selectedCargueId);
      if (cargue) {
        setSelectedCargueInfo({
          entidad: cargue.nombre_entidad || 'Entidad Convenio Teker',
          convenio: cargue.nombre_convenio || 'Convenio General'
        });
      } else {
        setSelectedCargueInfo({ entidad: 'Coomeva MP Reg. Cali', convenio: 'Coomeva MP CALI' });
      }
    } else {
      setSelectedCargueInfo(null);
    }
  }, [selectedCargueId, carguesPendientes]);

  // Filtered Professionals List with Email and Phone Search
  const filteredProfesionales = useMemo(() => {
    if (!profSearch.trim()) return profesionales;
    const term = profSearch.toLowerCase();
    return profesionales.filter(p => {
      const matchName = p.fullName.toLowerCase().includes(term);
      const matchEmail = (p.correo_electronico || '').toLowerCase().includes(term);
      const matchPhone = (p.telefono || '').toLowerCase().includes(term);
      const matchSpec = p.specialty?.some(s => s.nombre_especialidad.toLowerCase().includes(term));
      return matchName || matchEmail || matchPhone || matchSpec;
    });
  }, [profesionales, profSearch]);

  // Modal estilizado para advertencia de fecha > 15 días
  const [showWarning15DaysModal, setShowWarning15DaysModal] = useState<boolean>(false);

  // Sorting state for Professionals Table
  const [profSortField, setProfSortField] = useState<'fullName' | 'specialty'>('fullName');
  const [profSortOrder, setProfSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSortProf = (field: 'fullName' | 'specialty') => {
    if (profSortField === field) {
      setProfSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProfSortField(field);
      setProfSortOrder('asc');
    }
  };

  const sortedFilteredProfesionales = useMemo(() => {
    const list = [...filteredProfesionales];
    list.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (profSortField === 'fullName') {
        valA = a.fullName || '';
        valB = b.fullName || '';
      } else if (profSortField === 'specialty') {
        valA = a.specialty && a.specialty.length > 0 ? a.specialty[0].nombre_especialidad : '';
        valB = b.specialty && b.specialty.length > 0 ? b.specialty[0].nombre_especialidad : '';
      }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return profSortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filteredProfesionales, profSortField, profSortOrder]);

  // Reset Step 1 error when parameters change
  useEffect(() => {
    setStep1Error('');
  }, [fechaHasta, isGiris, selectedCargueId, selectedEntidadId, selectedConvenioId, selectedProf]);

  // Active Entidades List depending on isGiris
  const activeEntidades = isGiris ? entidadesGiris : entidadesStandard;

  const selectedEntidadObj = useMemo(() => {
    return activeEntidades.find(e => e.id === selectedEntidadId);
  }, [activeEntidades, selectedEntidadId]);

  const selectedConvenioObj = useMemo(() => {
    if (!selectedEntidadObj) return null;
    return selectedEntidadObj.entidades_hijas?.find(h => (h.id_convenio ?? h.id) === selectedConvenioId);
  }, [selectedEntidadObj, selectedConvenioId]);

  const selectedCargueObj = useMemo(() => {
    return carguesPendientes.find(c => c.id === selectedCargueId);
  }, [carguesPendientes, selectedCargueId]);

  // Función ejecutora de consulta de pacientes/citas
  const executeFetchStep2Data = async () => {
    setValidatingStep1(true);
    setStep1Error('');
    setLoadingTableData(true);
    setSelectedPatientIds([]);
    setSelectedCitaIds([]);

    const payload = {
      is_giris: isGiris,
      fecha_hasta: fechaHasta,
      id_profesional: selectedProf?.id || null,
      id_cargue: selectedCargueId,
      id_entidad: selectedEntidadId,
      id_convenio: selectedConvenioId,
      id_especialidad: selectedEspecialidadId || null
    };
    setLastDebugPayload(payload);

    try {
      const res = await fetch('/api/autonotificaciones-pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      setLastDebugResponse(data);
      if (!res.ok || data.error || data.success === false) {
        setStep1Error(data.error || 'Error al consultar la base de datos. Verifique los filtros seleccionados.');
        return;
      }

      let rawRecords: any[] = [];
      if (Array.isArray(data.data)) {
        rawRecords = data.data;
      } else if (typeof data.data === 'string') {
        try {
          const parsed = JSON.parse(data.data);
          rawRecords = Array.isArray(parsed) ? parsed : [];
        } catch {
          rawRecords = [];
        }
      }

      const records = isGiris
        ? rawRecords.filter((c: CitaGiris) => Number(c.id_estado_cita) === 10 || Number(c.id_estado_cita) === 16)
        : rawRecords;

      if (records.length === 0) {
        setStep1Error('No se encontró información de citas o pacientes en la base de datos para los parámetros seleccionados.');
        setLoadingTableData(false);
        return; // Permanece en el Paso 1
      }

      if (isGiris) {
        setCitasGiris(records);
        setSelectedCitaIds(records.map((c: CitaGiris) => c.id_cita));
      } else {
        setPacientes(records);
        setSelectedPatientIds(records.map((p: Paciente) => p.id_usuario));
      }

      // Solo si existen registros pasa al Paso 2
      setStep(2);
    } catch (err) {
      console.error('Error al cargar datos del Paso 2:', err);
      setStep1Error('Error de conexión al consultar los datos. Por favor intente de nuevo.');
    } finally {
      setLoadingTableData(false);
      setValidatingStep1(false);
    }
  };

  // Manejador del avance al Paso 2
  const handleGoToStep2 = () => {
    executeFetchStep2Data();
  };

  // Filtered & Sorted Pacientes
  const filteredSortedPacientes = useMemo(() => {
    let result = [...pacientes];
    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase();
      result = result.filter(p => 
        p.abreviatura.toLowerCase().includes(term) ||
        p.identificacion.toLowerCase().includes(term) ||
        p.nombre_paciente.toLowerCase().includes(term) ||
        p.correo_electronico.toLowerCase().includes(term) ||
        p.telefono.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const valA = (a as any)[sortColumn] || '';
      const valB = (b as any)[sortColumn] || '';
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [pacientes, tableSearch, sortColumn, sortDirection]);

  // Filtered & Sorted Citas Giris
  const filteredSortedCitas = useMemo(() => {
    let result = [...citasGiris];
    if (tableSearch.trim()) {
      const term = tableSearch.toLowerCase();
      result = result.filter(c => 
        (c.codigo_cita || '').toLowerCase().includes(term) ||
        c.identificacion.toLowerCase().includes(term) ||
        c.nombre_paciente.toLowerCase().includes(term) ||
        c.fecha_cita.toLowerCase().includes(term) ||
        c.estado_cita.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      const valA = (a as any)[sortColumn] || '';
      const valB = (b as any)[sortColumn] || '';
      const comp = String(valA).localeCompare(String(valB), undefined, { numeric: true });
      return sortDirection === 'asc' ? comp : -comp;
    });

    return result;
  }, [citasGiris, tableSearch, sortColumn, sortDirection]);

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Toggle selection
  const togglePatient = (id: number) => {
    setSelectedPatientIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllPatients = () => {
    if (selectedPatientIds.length === filteredSortedPacientes.length) {
      setSelectedPatientIds([]);
    } else {
      setSelectedPatientIds(filteredSortedPacientes.map(p => p.id_usuario));
    }
  };

  const toggleCita = (id: number) => {
    setSelectedCitaIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllCitas = () => {
    if (selectedCitaIds.length === filteredSortedCitas.length) {
      setSelectedCitaIds([]);
    } else {
      setSelectedCitaIds(filteredSortedCitas.map(c => c.id_cita));
    }
  };

  // Total destinatarios (cantidad de usuarios únicos)
  const totalDestinatariosUsuarios = useMemo(() => {
    if (!isGiris) return selectedPatientIds.length;
    const uniqueUsers = new Set<number>();
    selectedCitaIds.forEach(citaId => {
      const citaObj = citasGiris.find(c => c.id_cita === citaId);
      if (citaObj?.id_usuario) {
        uniqueUsers.add(citaObj.id_usuario);
      }
    });
    return uniqueUsers.size;
  }, [isGiris, selectedCitaIds, selectedPatientIds, citasGiris]);

  // Step 3 Previsualización via pkgln_automatizaciones.p_obtener_plantilla_notificacion
  const handleGoToStep3 = async () => {
    setStep(3);
    setLoadingPlantilla(true);
    setEnvioExitoso(false);
    setMensajeResultado('');
    setPlantillaError('');
    setPlantillaHtml('');

    const templateId = isGiris ? 132 : 131;
    try {
      const res = await fetch(`/api/autonotificaciones-plantilla?id_plantilla=${templateId}`);
      const data = await res.json();
      if (data.success && data.texto_plantilla) {
        setPlantillaHtml(data.texto_plantilla);
        setPlantillaAsunto(data.asunto || 'Notificación de Atención Médica');
      } else {
        setPlantillaError(data.error || `La plantilla con ID ${templateId} no existe en la base de datos.`);
      }
    } catch (err) {
      console.error('Error al cargar plantilla:', err);
      setPlantillaError('Error de conexión al consultar la plantilla.');
    } finally {
      setLoadingPlantilla(false);
    }
  };

  // Handle final Submit via pkgln_automatizaciones.p_envio_notificaciones
  const handleEnviarNotificaciones = async () => {
    setEnviando(true);
    setMensajeResultado('');

    try {
      // Para pacientes GIRIS, se agrupan las citas por usuario y se pasa el listado de IDs de citas por cada paciente
      let pacientesPayload: any[] = [];
      if (isGiris) {
        const userCitasMap = new Map<number, number[]>();
        selectedCitaIds.forEach(citaId => {
          const citaObj = citasGiris.find(c => c.id_cita === citaId);
          const userId = citaObj?.id_usuario;
          if (userId) {
            if (!userCitasMap.has(userId)) {
              userCitasMap.set(userId, []);
            }
            userCitasMap.get(userId)!.push(citaId);
          }
        });

        pacientesPayload = Array.from(userCitasMap.entries()).map(([userId, citasArr]) => ({
          id_usuario: userId,
          citas: citasArr
        }));
      } else {
        pacientesPayload = selectedPatientIds.map(id => ({ id_usuario: id }));
      }

      const res = await fetch('/api/autonotificaciones-enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha_hasta: fechaHasta,
          id_profesional: selectedProf?.id,
          profesional_nombre: selectedProf?.fullName,
          is_giris: isGiris,
          id_temp_cargue: selectedCargueId,
          id_entidad: selectedEntidadId,
          id_convenio: selectedConvenioId,
          id_plantilla: isGiris ? 132 : 131,
          citas: selectedCitaIds,
          pacientes: pacientesPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setEnvioExitoso(true);
        setMensajeResultado(data.mensaje || 'Las notificaciones fueron enviadas correctamente.');
      } else {
        setEnvioExitoso(false);
        setMensajeResultado(data.error || 'Error al procesar el envío de notificaciones.');
      }
    } catch (err: any) {
      console.error('Error al enviar notificaciones:', err);
      setEnvioExitoso(false);
      setMensajeResultado('Error de conexión al enviar notificaciones.');
    } finally {
      setEnviando(false);
    }
  };

  // Step 1 Validation
  const canProceedStep1 = useMemo(() => {
    if (!fechaHasta || fechaHasta < todayStr) return false;
    if (!selectedProf) return false;
    if (isGiris) {
      return selectedEntidadId !== null && selectedConvenioId !== null;
    } else {
      return selectedCargueId !== null;
    }
  }, [fechaHasta, todayStr, selectedProf, isGiris, selectedEntidadId, selectedConvenioId, selectedCargueId]);

  // Step 2 Validation
  const canProceedStep2 = useMemo(() => {
    if (isGiris) return selectedCitaIds.length > 0;
    return selectedPatientIds.length > 0;
  }, [isGiris, selectedCitaIds, selectedPatientIds]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span>🔔</span> Autonotificaciones
            </h1>
            <p className="text-blue-100 text-sm mt-1">
              Envío automatizado de notificaciones por plantilla a pacientes estándar y programa GIRIS.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md text-xs font-semibold">
            <span>Paso {step} de 3</span>
          </div>
        </div>

        {/* Asistente Stepper */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
            step === 1 ? 'bg-white text-indigo-900 shadow font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</span>
            <span className="text-xs sm:text-sm truncate">1. Configuración</span>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
            step === 2 ? 'bg-white text-indigo-900 shadow font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">2</span>
            <span className="text-xs sm:text-sm truncate">2. Pacientes / Citas</span>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-3 transition-all ${
            step === 3 ? 'bg-white text-indigo-900 shadow font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">3</span>
            <span className="text-xs sm:text-sm truncate">3. Plantilla y Envío</span>
          </div>
        </div>
      </div>

      {/* ================= PASO 1: CONFIGURACIÓN ================= */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>⚙️</span> Configuración de Parámetros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Campo 1: Fecha Hasta */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Fecha Hasta <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={fechaHasta}
                onChange={(e) => {
                  const val = e.target.value;
                  setFechaHasta(val);
                  if (val) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const targetDate = new Date(val + 'T00:00:00');
                    const diffTime = targetDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays > 15) {
                      setShowWarning15DaysModal(true);
                    }
                  }
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
                La fecha seleccionada debe ser igual o posterior a la fecha de hoy.
              </span>
            </div>

            {/* Checkbox Pacientes GIRIS */}
            <div className="flex flex-col justify-center">
              <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:border-indigo-500 transition-all">
                <input
                  type="checkbox"
                  checked={isGiris}
                  onChange={(e) => {
                    setIsGiris(e.target.checked);
                    setSelectedCargueId(null);
                    setSelectedEntidadId(null);
                    setSelectedConvenioId(null);
                  }}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">Pacientes GIRIS</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marca esta opción si las notificaciones corresponden a convenios GV / GO (Programa GIRIS).
                  </p>
                </div>
              </label>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-700/60" />

          {/* Sección Entidad / Convenio / Cargue */}
          {!isGiris ? (
            /* SI NO ES PACIENTE GIRIS: SELECCIONAR NÚMERO DE CARGUE */
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>📁</span> Selección de Cargue de Archivo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Número de Cargue <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedCargueId || ''}
                    onChange={(e) => setSelectedCargueId(Number(e.target.value) || null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  >
                    <option value="">-- Seleccionar Cargue Pendiente --</option>
                    {carguesPendientes.map((cargue) => (
                      <option key={cargue.id} value={cargue.id}>
                        Cargue #{cargue.id} - {cargue.nombre_archivo || 'Archivo Pacientes'}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCargueInfo && (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-indigo-900 dark:text-indigo-300 block">
                        Entidad: {selectedCargueInfo.entidad}
                      </span>
                      <span className="text-indigo-700 dark:text-indigo-400">
                        Convenio: {selectedCargueInfo.convenio}
                      </span>
                    </div>
                    <span className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-2.5 py-1 rounded-full font-bold">
                      Asociado
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* SI ES PACIENTE GIRIS: SELECCIONAR ENTIDAD PADRE (GV/GO) Y CONVENIO */
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>🏥</span> Selección de Entidad y Convenio (Pacientes GIRIS - GV/GO)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Entidad GIRIS (Entidad Padre GV/GO) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedEntidadId || ''}
                    onChange={(e) => {
                      const id = Number(e.target.value) || null;
                      setSelectedEntidadId(id);
                      setSelectedConvenioId(null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 text-sm outline-none"
                  >
                    <option value="">-- Seleccionar Entidad GIRIS --</option>
                    {entidadesGiris.map((ent) => (
                      <option key={ent.id} value={ent.id}>
                        {ent.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Convenio GIRIS <span className="text-red-500">*</span>
                  </label>
                  <select
                    disabled={!selectedEntidadId}
                    value={selectedConvenioId || ''}
                    onChange={(e) => setSelectedConvenioId(Number(e.target.value) || null)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 text-sm outline-none disabled:opacity-50"
                  >
                    <option value="">-- Seleccionar Convenio --</option>
                    {selectedEntidadObj?.entidades_hijas.map((hija) => (
                      <option key={hija.id} value={hija.id_convenio || hija.id}>
                        {hija.nombre_entidad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <hr className="border-slate-100 dark:border-slate-700/60" />

          {/* Selector de Profesional Avanzado (con Teléfono y Correo) */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <span>👨‍⚕️</span> Selección de Profesional Médico
              </h3>
              <input
                type="text"
                placeholder="🔍 Buscar por nombre, especialidad, correo o teléfono..."
                value={profSearch}
                onChange={(e) => setProfSearch(e.target.value)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none sm:w-80"
              />
            </div>

            {loadingCatalogos ? (
              <div className="p-8 text-center text-slate-500 text-sm">Cargando lista de profesionales...</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                    <tr>
                      <th className="p-3 w-12 text-center">Sel.</th>
                      <th className="p-3 w-12 text-center">Foto</th>
                      <th
                        onClick={() => handleSortProf('fullName')}
                        className="p-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all select-none"
                        title="Haz clic para ordenar por Nombre"
                      >
                        <div className="flex items-center gap-1">
                          <span>Profesional Médico</span>
                          {profSortField === 'fullName' && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              {profSortOrder === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortProf('specialty')}
                        className="p-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all select-none"
                        title="Haz clic para ordenar por Especialidad"
                      >
                        <div className="flex items-center gap-1">
                          <span>Especialidades</span>
                          {profSortField === 'specialty' && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                              {profSortOrder === 'asc' ? '▲' : '▼'}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="p-3">Contacto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {sortedFilteredProfesionales.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No se encontraron profesionales médicos que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      sortedFilteredProfesionales.map((prof) => {
                        const isSelected = selectedProf?.id === prof.id;
                        return (
                          <tr
                            key={prof.id}
                            onClick={() => {
                              setSelectedProf(prof);
                              if (prof.specialty && prof.specialty.length > 0) {
                                setSelectedEspecialidadId(prof.specialty[0].id);
                              }
                            }}
                            className={`hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 cursor-pointer transition-all ${
                              isSelected ? 'bg-indigo-50/80 dark:bg-indigo-950/60 font-semibold' : ''
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name="selected_professional"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <img
                                src={prof.img_url || 'https://tekersalud.maxapex.net/FILES_DEV_TEKER/logo_circulo.png'}
                                alt={prof.fullName}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs mx-auto"
                              />
                            </td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-100">
                              {prof.fullName}
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {prof.specialty && prof.specialty.length > 0 ? (
                                  prof.specialty.map((sp) => (
                                    <span
                                      key={sp.id}
                                      className="inline-block bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    >
                                      {sp.nombre_especialidad}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400">General</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                              {prof.correo_electronico && (
                                <div className="truncate max-w-[200px]" title={prof.correo_electronico}>
                                  ✉️ {prof.correo_electronico}
                                </div>
                              )}
                              {prof.telefono && <div>📞 {prof.telefono}</div>}
                              {!prof.correo_electronico && !prof.telefono && <div>-</div>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Alerta de Error si no hay registros */}
          {step1Error && (
            <div className="p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 text-sm flex items-center gap-3 animate-fade-in">
              <span className="text-lg">⚠️</span>
              <span className="font-medium">{step1Error}</span>
            </div>
          )}

          {/* Botón Siguiente */}
          <div className="flex justify-end pt-4">
            <button
              disabled={!canProceedStep1 || validatingStep1}
              onClick={handleGoToStep2}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {validatingStep1 ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Verificando registros...</span>
                </>
              ) : (
                <>
                  <span>Siguiente: Seleccionar Registros</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= PASO 2: SELECCIÓN DE RECEPTORES ================= */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>📋</span> Paso 2: Selección de {isGiris ? 'Citas (GIRIS)' : 'Pacientes'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Selecciona los registros a los que se les enviará la notificación por correo.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <input
                type="text"
                placeholder="🔍 Filtrar registros..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-72"
              />
            </div>
          </div>

          {/* Tarjeta Resumen de Parámetros Seleccionados en Pantalla 1 */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">📅 Fecha Hasta:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{fechaHasta}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">👨‍⚕️ Profesional:</span>
              <span className="font-bold text-indigo-700 dark:text-indigo-300 truncate block" title={selectedProf?.fullName}>
                {selectedProf ? selectedProf.fullName : 'Todos los profesionales'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block font-medium">📋 Modalidad:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">
                {isGiris ? 'Pacientes GIRIS (GV/GO)' : 'Estándar (Cargue)'}
              </span>
            </div>
            {isGiris ? (
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">🏥 Entidad / Convenio:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate block" title={`${selectedEntidadObj?.label || 'N/A'} ${selectedConvenioObj ? `(${selectedConvenioObj.nombre_entidad})` : ''}`}>
                  {selectedEntidadObj?.label || 'N/A'} {selectedConvenioObj ? `(${selectedConvenioObj.nombre_entidad})` : ''}
                </span>
              </div>
            ) : (
              <div>
                <span className="text-slate-500 dark:text-slate-400 block font-medium">📁 Cargue de Archivo:</span>
                <span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
                  {selectedCargueId ? `Cargue #${selectedCargueId} ${selectedCargueObj?.nombre_archivo ? `- ${selectedCargueObj.nombre_archivo}` : ''}` : 'N/A'}
                </span>
              </div>
            )}
          </div>

          {loadingTableData ? (
            <div className="p-12 text-center text-slate-500 text-sm">Cargando registros disponibles...</div>
          ) : !isGiris ? (
            /* TABLA PACIENTES NO GIRIS */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedPatientIds.length > 0 && selectedPatientIds.length === filteredSortedPacientes.length}
                        onChange={toggleAllPatients}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('abreviatura')}>
                      Tipo ID {sortColumn === 'abreviatura' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('identificacion')}>
                      Identificación {sortColumn === 'identificacion' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('nombre_paciente')}>
                      Nombre Paciente {sortColumn === 'nombre_paciente' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('correo_electronico')}>
                      Correo Electrónico {sortColumn === 'correo_electronico' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('telefono')}>
                      Teléfono {sortColumn === 'telefono' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredSortedPacientes.map((p) => {
                    const isChecked = selectedPatientIds.includes(p.id_usuario);
                    return (
                      <tr key={p.id_usuario} className={isChecked ? 'bg-indigo-50/40 dark:bg-indigo-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePatient(p.id_usuario)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold">{p.abreviatura}</td>
                        <td className="p-3">{p.identificacion}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{p.nombre_paciente}</td>
                        <td className="p-3">{p.correo_electronico}</td>
                        <td className="p-3">{p.telefono}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* TABLA CITAS PACIENTES GIRIS */
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-800 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCitaIds.length > 0 && selectedCitaIds.length === filteredSortedCitas.length}
                        onChange={toggleAllCitas}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('codigo_cita')}>
                      Código Cita {sortColumn === 'codigo_cita' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('fecha_cita')}>
                      Fecha Cita {sortColumn === 'fecha_cita' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('hora_cita')}>
                      Hora {sortColumn === 'hora_cita' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('nombre_paciente')}>
                      Nombre Paciente {sortColumn === 'nombre_paciente' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('identificacion')}>
                      Identificación {sortColumn === 'identificacion' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('estado_cita')}>
                      Estado {sortColumn === 'estado_cita' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredSortedCitas.map((c) => {
                    const isChecked = selectedCitaIds.includes(c.id_cita);
                    return (
                      <tr key={c.id_cita} className={isChecked ? 'bg-emerald-50/40 dark:bg-emerald-950/30' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCita(c.id_cita)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold font-mono text-indigo-600 dark:text-indigo-400">{c.codigo_cita || `#${c.id_cita}`}</td>
                        <td className="p-3">{c.fecha_cita}</td>
                        <td className="p-3">{c.hora_cita}</td>
                        <td className="p-3 font-medium text-slate-900 dark:text-white">{c.nombre_paciente}</td>
                        <td className="p-3">{c.identificacion}</td>
                        <td className="p-3 font-semibold text-emerald-600 dark:text-emerald-400">{c.estado_cita}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pie de tabla con contadores y navegación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Seleccionados: {isGiris ? selectedCitaIds.length : selectedPatientIds.length} registro(s)
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                ⬅ Volver
              </button>
              <button
                disabled={!canProceedStep2}
                onClick={handleGoToStep3}
                className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Siguiente: Vista Previa y Envío ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PASO 3: VISTA PREVIA Y ENVÍO ================= */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>✉️</span> Paso 3: Vista Previa de la Notificación (Plantilla #{isGiris ? 132 : 131})
          </h2>

          {/* Resumen del envío */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Médico Asignado:</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm">{selectedProf?.fullName}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Fecha Hasta:</span>
              <strong className="text-slate-800 dark:text-slate-200 text-sm">{fechaHasta}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Total Destinatarios:</span>
              <strong className="text-indigo-600 dark:text-indigo-400 text-sm">
                {totalDestinatariosUsuarios} destinatario(s)
              </strong>
            </div>
          </div>

          {/* Vista Previa del HTML */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
              Asunto del Correo: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{plantillaAsunto}</span>
            </span>

            {plantillaError && (
              <div className="p-4 rounded-xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200 text-sm flex items-center gap-3">
                <span className="text-xl">🛑</span>
                <div>
                  <strong className="block font-bold">Plantilla No Encontrada</strong>
                  <span>{plantillaError}</span>
                </div>
              </div>
            )}

            {loadingPlantilla ? (
              <div className="p-12 text-center text-slate-500 text-sm">Cargando plantilla HTML...</div>
            ) : plantillaError ? (
              <div className="p-12 text-center border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 rounded-xl text-red-700 dark:text-red-300 text-sm font-semibold">
                ⚠️ No se puede previsualizar ni enviar la notificación porque la plantilla no existe en la base de datos.
              </div>
            ) : (
              <div className="border border-slate-300 dark:border-slate-600 rounded-xl p-4 bg-slate-100 dark:bg-slate-900/90 max-h-96 overflow-y-auto">
                <div
                  className="bg-white rounded-lg p-2 shadow-inner"
                  dangerouslySetInnerHTML={{ __html: plantillaHtml }}
                />
              </div>
            )}
          </div>

          {/* Mensaje de Resultado tras envío */}
          {mensajeResultado && (
            <div className={`p-4 rounded-xl border text-sm flex items-center gap-3 ${
              envioExitoso 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200' 
                : 'bg-red-50 dark:bg-red-950/50 border-red-300 text-red-800 dark:text-red-200'
            }`}>
              <span>{envioExitoso ? '✅' : '⚠️'}</span>
              <span>{mensajeResultado}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              disabled={enviando}
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              ⬅ Modificar Selección
            </button>

            <button
              disabled={enviando || loadingPlantilla || !plantillaHtml || !!plantillaError}
              onClick={handleEnviarNotificaciones}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {enviando ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span>🚀</span>
                  <span>Enviar Notificaciones Ahora</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================= MODAL DIAGNÓSTICO PL/SQL (Ctrl + Alt + D) ================= */}
      {showDebugModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Encabezado del Modal */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-xl">🛠️</span>
                <div>
                  <h3 className="font-bold text-base">Diagnóstico de Base de Datos PL/SQL</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Procedimiento: pkgln_automatizaciones.p_obtener_pacientes_notificacion
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDebugModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contenido Modal Scrollable */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs text-slate-800 dark:text-slate-200">
              
              {/* Información del llamado */}
              <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-200 block text-sm">
                  📌 Procedimiento Ejecutado:
                </span>
                <code className="text-indigo-700 dark:text-indigo-300 font-mono font-semibold block text-xs">
                  pkgln_automatizaciones.p_obtener_pacientes_notificacion(p_in_json IN CLOB, p_out_json OUT CLOB)
                </code>
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  Atajo de teclado activo: <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px] font-bold">Ctrl + Alt + D</kbd>
                </p>
              </div>

              {/* Pestañas / Secciones de JSON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* JSON Entrada */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📥</span> JSON Entrada (p_in_json)
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(lastDebugPayload || {}, null, 2))}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800">
                    {lastDebugPayload ? JSON.stringify(lastDebugPayload, null, 2) : '// No se ha ejecutado ninguna petición aún'}
                  </pre>
                </div>

                {/* JSON Salida */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>📤</span> JSON Salida (p_out_json)
                    </span>
                    <button
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(lastDebugResponse || {}, null, 2))}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 dark:text-slate-300 cursor-pointer font-semibold"
                    >
                      📋 Copiar
                    </button>
                  </div>
                  <pre className="bg-slate-950 text-indigo-300 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800">
                    {lastDebugResponse ? JSON.stringify(lastDebugResponse, null, 2) : '// Sin respuesta'}
                  </pre>
                </div>
              </div>

              {/* Documentación de Campos */}
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📖</span> Documentación de Campos
                </h4>

                {/* Campos de Entrada */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-indigo-600 dark:text-indigo-400">1. Campos del JSON de Entrada (p_in_json):</h5>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Campo</th>
                          <th className="p-2">Tipo DB</th>
                          <th className="p-2">Descripción y Regla de Negocio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">is_giris</td>
                          <td className="p-2 font-mono">BOOLEAN</td>
                          <td className="p-2">Si es TRUE, consulta citas del programa GIRIS (convenios GV/GO). Si es FALSE, consulta pacientes de cargue.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">fecha_hasta</td>
                          <td className="p-2 font-mono">VARCHAR2(20)</td>
                          <td className="p-2">Fecha límite superior para filtrar citas (formato YYYY-MM-DD). Debe ser superior o igual a hoy.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">id_profesional</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID del médico/profesional en tkr_usuarios (corresponde a c.id_profesional).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">id_entidad</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID de la Entidad Padre (id_entidad_padre en tkr_convenios con tipo GV o GO).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">id_convenio</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID del convenio específico asociado (c.id_convenio).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">id_especialidad</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID de la especialidad médica para filtrar las citas (c.id_especialidad).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-indigo-600">id_cargue</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID del cargue de archivo temporal (utilizado en la modalidad estándar no-GIRIS).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Campos de Salida */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-emerald-600 dark:text-emerald-400">2. Campos del JSON de Salida (p_out_json):</h5>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Campo</th>
                          <th className="p-2">Tipo DB</th>
                          <th className="p-2">Descripción y Mapeo en Tablas Oracle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">success</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Indica si la ejecución finalizó correctamente ('true' / 'false').</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.id_cita</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID numérico interno de la cita en tkr_citas (c.id). Oculto al usuario final.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.codigo_cita</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Código identificador de la cita visible en la tabla (c.id_hexadecimal).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.fecha_cita</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Fecha formateada de inicio de la cita (TO_CHAR(c.fecha_inicio_cita, 'YYYY-MM-DD')).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.hora_cita</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Hora formateada de la cita (TO_CHAR(c.fecha_inicio_cita, 'HH:MI AM')).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.nombre_paciente</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Nombre completo del paciente (u.nombres || ' ' || u.apellidos).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.identificacion</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Documento de identidad del paciente en tkr_usuarios (u.identificacion).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.id_estado_cita</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">Código de estado de la cita. Filtrado estrictamente para valores 10 o 16.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">data.estado_cita</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Nombre descriptivo del estado (ec.estado_cita en tkr_estados_cita: Programada / Confirmada).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Campos de Salida del Servicio de Profesionales */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-purple-600 dark:text-purple-400">3. Función de Profesionales (pkgln_automatizaciones.p_obtener_profesionales_notificacion):</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Invoca internamente la función <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300">pkgcn_varios.f_profesionales(0, 1, 5000)</code> y enriquece cada registro con <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300">correo_electronico</code> y <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300">telefono</code> desde la tabla <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">tkr_usuarios</code>.
                  </p>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Campo</th>
                          <th className="p-2">Tipo DB</th>
                          <th className="p-2">Descripción y Origen de Datos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">success</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Estado de la respuesta ('true' / 'false').</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.id</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID numérico primario del profesional (p.id / u.id).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.fullName</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Nombre completo formateado del profesional (ej: "65-Rodolfo Vargas").</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.trabaja_festivos</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Indicador 'S' o 'N' de disponibilidad en días festivos.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.slug</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Identificador amigable / alias del profesional.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.price</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">Valor de la consulta / tarifa del profesional.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.gender</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Género del profesional (Masculino / Femenino).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.specialty</td>
                          <td className="p-2 font-mono">JSON ARRAY</td>
                          <td className="p-2">Arreglo de especialidades médicas (id, nombre_especialidad, tipo_especialidad).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.days_of_service</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Días de atención en la semana (ej: "Lunes, Miércoles").</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.img_url</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">URL de la imagen/fotografía del profesional.</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.correo_electronico</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Correo electrónico en tkr_usuarios (u.correo_electronico).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-purple-600">profesionales.telefono</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Teléfono de contacto en tkr_usuarios (u.telefono).</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Registro y Envío de Notificaciones */}
                <div className="space-y-2">
                  <h5 className="font-semibold text-amber-600 dark:text-amber-400">4. Procedimiento de Envío de Notificaciones (pkgln_automatizaciones.p_envio_notificaciones):</h5>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Se ejecuta al seleccionar las citas y confirmar el envío en el Paso 3. Recibe el payload completo con los parámetros globales y la agrupación de pacientes con sus respectivas listas de citas asociadas.
                  </p>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-[11px] text-slate-700 dark:text-slate-300">
                      <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-2">Parámetro / Campo</th>
                          <th className="p-2">Tipo DB</th>
                          <th className="p-2">Descripción y Estructura del JSON</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.is_giris</td>
                          <td className="p-2 font-mono">BOOLEAN</td>
                          <td className="p-2">Indica si corresponde al programa GIRIS (TRUE) o a pacientes de cargue estándar (FALSE).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.fecha_hasta</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Fecha límite de citas (formato YYYY-MM-DD).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.id_profesional</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID numérico del profesional médico (c.id_profesional).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.id_plantilla</td>
                          <td className="p-2 font-mono">NUMBER</td>
                          <td className="p-2">ID de la plantilla de mensaje seleccionada (ej: 132 para GIRIS, 131 para estándar).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.citas</td>
                          <td className="p-2 font-mono">JSON ARRAY</td>
                          <td className="p-2">Lista plana con todos los IDs numéricos de las citas seleccionadas en la tabla (ej: [1651, 1652, 1653]).</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-amber-600">p_in_json.pacientes</td>
                          <td className="p-2 font-mono">JSON ARRAY</td>
                          <td className="p-2">Arreglo de objetos por paciente. Cada objeto contiene el <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">id_usuario</code> del paciente y el arreglo <code className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded">citas</code> con los IDs de las citas pertenecientes a dicho usuario: <br/><code className="font-mono text-[10px] text-amber-700 dark:text-amber-300 block mt-1">[&#123; "id_usuario": 5001, "citas": [1651, 1652] &#125;, &#123; "id_usuario": 5002, "citas": [1653] &#125;]</code></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">p_out_json.success</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Estado final de la ejecución ('true' / 'false').</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-mono font-bold text-emerald-600">p_out_json.mensaje</td>
                          <td className="p-2 font-mono">VARCHAR2</td>
                          <td className="p-2">Mensaje confirmando la cantidad de pacientes y citas procesadas.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            {/* Pie del Modal */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDebugModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs cursor-pointer"
              >
                Cerrar Ventana (Esc / ✕)
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Estilizado de Advertencia > 15 Días */}
      {showWarning15DaysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-7 border border-amber-200 dark:border-amber-900/60 shadow-2xl max-w-md w-full text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center text-3xl mx-auto shadow-xs border border-amber-200 dark:border-amber-800/60">
              ⚠️
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Advertencia de Rango de Fecha
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400 font-semibold leading-relaxed">
                La probabilidad de inasistencia cae drásticamente después de 15 días.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                ¿Deseas continuar con la fecha seleccionada (<span className="font-bold text-slate-700 dark:text-slate-200">{fechaHasta}</span>) o prefieres escoger otra fecha?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => {
                  setShowWarning15DaysModal(false);
                  setFechaHasta(todayStr);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-xs transition-all cursor-pointer"
              >
                Escoger Otra Fecha
              </button>
              <button
                onClick={() => {
                  setShowWarning15DaysModal(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md transition-all cursor-pointer"
              >
                Continuar De Todos Modos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
