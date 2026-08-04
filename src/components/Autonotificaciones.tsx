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
  nombre_coordinador?: string;
}

interface DetalleEnvio {
  id_usuario: number;
  identificacion?: string;
  nombre_paciente: string;
  correo_electronico?: string;
  telefono?: string;
  nombre_especialidad?: string;
  nombre_coordinador?: string;
  enviado: boolean;
  motivo: string;
}

export function Autonotificaciones() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Pasos: 1: Config, 2: Selección, 3: Previsualización, 4: Log de Resultados
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form Step 1
  const [fechaHasta, setFechaHasta] = useState<string>(todayStr);
  const [isGiris, setIsGiris] = useState<boolean>(false);

  // Detalle de resultados del envío
  const [detallesEnvio, setDetallesEnvio] = useState<DetalleEnvio[]>([]);
  const [cantEnviados, setCantEnviados] = useState<number>(0);
  const [cantOmitidos, setCantOmitidos] = useState<number>(0);

  // Filtros para el Log de Resultados (Paso 4)
  const [logSearchText, setLogSearchText] = useState<string>('');
  const [logTabFilter, setLogTabFilter] = useState<'TODOS' | 'ENVIADOS' | 'SIN_COORDINADORA' | 'OMITIDOS'>('TODOS');
  
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

  // Reset Step 1 error and send status when parameters change
  useEffect(() => {
    setStep1Error('');
    setEnvioExitoso(false);
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
    try {
      const res = await fetch('/api/autonotificaciones-pacientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.error || data.success === false) {
        setStep1Error(data.error || 'Error al consultar la base de datos. Verifique los filtros seleccionados.');
        setValidatingStep1(false);
        setLoadingTableData(false);
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
        setValidatingStep1(false);
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
        (c.nombre_coordinador || '').toLowerCase().includes(term) ||
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
          id_entidad: isGiris ? selectedEntidadId : (selectedCargueObj?.id_entidad || selectedEntidadId),
          id_convenio: isGiris ? selectedConvenioId : (selectedCargueObj?.id_convenio || selectedConvenioId),
          id_plantilla: isGiris ? 132 : 131,
          citas: selectedCitaIds,
          pacientes: pacientesPayload
        })
      });

      const data = await res.json();
      if (data.success) {
        setEnvioExitoso(true);
        setMensajeResultado(data.mensaje || 'Las notificaciones fueron procesadas correctamente.');
        
        let rawDetalles = data.detalles;
        if (rawDetalles && typeof rawDetalles === 'object' && !Array.isArray(rawDetalles) && rawDetalles.detalles) {
          rawDetalles = rawDetalles.detalles;
        }

        let parsedDetalles: DetalleEnvio[] = [];
        if (Array.isArray(rawDetalles)) {
          parsedDetalles = rawDetalles;
        } else if (typeof rawDetalles === 'string') {
          try {
            parsedDetalles = JSON.parse(rawDetalles);
          } catch (e) {
            console.error('Error al parsear detalles:', e);
          }
        }
        setDetallesEnvio(parsedDetalles);

        const enviadosCount = parsedDetalles.filter(d => d.enviado === true || String(d.enviado).toLowerCase() === 'true').length;
        const omitidosCount = parsedDetalles.length - enviadosCount;
        setCantEnviados(data.cant_enviados ?? enviadosCount);
        setCantOmitidos(data.cant_omitidos ?? omitidosCount);

        // Avanzar automáticamente al Paso 4: Log de Resultados
        setStep(4);
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

  // Exportar Log de Resultados a Excel (CSV con UTF-8 BOM)
  const exportLogToExcel = () => {
    if (!detallesEnvio || detallesEnvio.length === 0) return;

    const headers = [
      'ID Usuario',
      'Identificación',
      'Nombre Paciente',
      'Correo Electrónico',
      'Teléfono',
      'Especialidad',
      'Coordinadora',
      'Estado Envío',
      'Motivo'
    ];

    const rows = detallesEnvio.map(item => {
      const isEnviado = item.enviado === true || String(item.enviado).toLowerCase() === 'true';
      return [
        item.id_usuario,
        `"${(item.identificacion || '').replace(/"/g, '""')}"`,
        `"${(item.nombre_paciente || '').replace(/"/g, '""')}"`,
        `"${(item.correo_electronico || '').replace(/"/g, '""')}"`,
        `"${(item.telefono || '').replace(/"/g, '""')}"`,
        `"${(item.nombre_especialidad || '').replace(/"/g, '""')}"`,
        `"${(item.nombre_coordinador || 'Sin Coordinadora').replace(/"/g, '""')}"`,
        isEnviado ? 'Enviado' : 'No Enviado',
        `"${(item.motivo || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fileName = `log_autonotificaciones_${fechaHasta || new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            <span>Paso {step} de 4</span>
          </div>
        </div>

        {/* Asistente Stepper (4 Pasos) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
            step === 1 ? 'bg-white shadow-md font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>1</span>
            <span className={`text-xs font-bold truncate ${step === 1 ? 'text-slate-900 dark:text-slate-900' : 'text-white'}`}>1. Configuración</span>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
            step === 2 ? 'bg-white shadow-md font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>2</span>
            <span className={`text-xs font-bold truncate ${step === 2 ? 'text-slate-900 dark:text-slate-900' : 'text-white'}`}>2. Pacientes / Citas</span>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
            step === 3 ? 'bg-white shadow-md font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === 3 ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>3</span>
            <span className={`text-xs font-bold truncate ${step === 3 ? 'text-slate-900 dark:text-slate-900' : 'text-white'}`}>3. Vista Previa</span>
          </div>
          <div className={`p-3 rounded-xl flex items-center gap-2.5 transition-all ${
            step === 4 ? 'bg-white shadow-md font-bold' : 'bg-white/10 text-white opacity-80'
          }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${step === 4 ? 'bg-indigo-600 text-white' : 'bg-white/20 text-white'}`}>4</span>
            <span className={`text-xs font-bold truncate ${step === 4 ? 'text-slate-900 dark:text-slate-900' : 'text-white'}`}>4. Resultados</span>
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
                    <th className="p-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => handleSort('nombre_coordinador')}>
                      Coordinadora {sortColumn === 'nombre_coordinador' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
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
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                          {c.nombre_coordinador ? (
                            <span className="inline-flex items-center gap-1">
                              <span>👤</span> {c.nombre_coordinador}
                            </span>
                          ) : (
                            <span className="text-red-500/80 dark:text-red-400/80 italic text-[11px]">Sin asignación</span>
                          )}
                        </td>
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

          {/* Listado y Reporte de Pacientes Procesados */}
          {detallesEnvio.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <span>📋</span> Reporte de Envío por Paciente
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Detalle del resultado de envío de cada destinatario.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    ✅ Enviados: <strong>{cantEnviados}</strong>
                  </span>
                  <span className="px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    ⚠️ Omitidos / Sin Coordinadora: <strong>{cantOmitidos}</strong>
                  </span>
                  <button
                    onClick={exportLogToExcel}
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer ml-auto sm:ml-2"
                  >
                    <span>📥</span>
                    <span>Exportar Log a Excel</span>
                  </button>
                </div>
              </div>

              {/* Tabla Resumen */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-100 dark:bg-slate-900/80 uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">Estado</th>
                      <th className="p-3">Paciente</th>
                      <th className="p-3">Especialidad</th>
                      <th className="p-3">Coordinadora</th>
                      <th className="p-3">Motivo / Detalle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {detallesEnvio.map((det, idx) => {
                      const isEnviado = det.enviado === true || String(det.enviado).toLowerCase() === 'true';
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="p-3">
                            {isEnviado ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <span>✅</span> Enviado
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <span>❌</span> No Enviado
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                            {det.nombre_paciente}
                            <span className="block text-[11px] text-slate-400 font-normal">ID Usuario: {det.id_usuario}</span>
                          </td>
                          <td className="p-3">{det.nombre_especialidad || 'Sin especialidad'}</td>
                          <td className="p-3">
                            {det.nombre_coordinador ? (
                              <span className="text-slate-700 dark:text-slate-300 font-medium">{det.nombre_coordinador}</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-400 font-semibold italic text-[11px] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                                ⚠️ Sin Coordinadora
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`text-xs ${isEnviado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400 font-medium'}`}>
                              {det.motivo}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botones de Acción Paso 3 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              disabled={enviando}
              onClick={() => setStep(2)}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ⬅ Modificar Selección
            </button>

            {envioExitoso ? (
              <button
                onClick={() => setStep(4)}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700"
              >
                <span>📋</span>
                <span>Ver Log de Resultados (Paso 4) ➔</span>
              </button>
            ) : (
              <button
                disabled={enviando || loadingPlantilla || !plantillaHtml || !!plantillaError}
                onClick={handleEnviarNotificaciones}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
              >
                {enviando ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    <span>Enviando y Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Enviar Notificaciones y Ver Log ➔</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= PASO 4: LOG DE RESULTADOS ================= */}
      {step === 4 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>📋</span> Log de Resultados de Envío de Notificaciones
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Detalle y estado de entrega de notificaciones para los pacientes procesados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={exportLogToExcel}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>📥</span>
                <span>Exportar Log a Excel</span>
              </button>

              <button
                onClick={() => {
                  setStep(1);
                  setEnvioExitoso(false);
                  setMensajeResultado('');
                  setDetallesEnvio([]);
                  setSelectedPatientIds([]);
                  setSelectedCitaIds([]);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>🔄</span>
                <span>Nueva Notificación</span>
              </button>
            </div>
          </div>

          {/* Banner de Resultado */}
          {mensajeResultado && (
            <div className={`p-4 rounded-xl border text-sm flex items-center justify-between gap-3 ${
              envioExitoso 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 text-emerald-800 dark:text-emerald-200' 
                : 'bg-red-50 dark:bg-red-950/50 border-red-300 text-red-800 dark:text-red-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{envioExitoso ? '✅' : '⚠️'}</span>
                <span className="font-medium">{mensajeResultado}</span>
              </div>
            </div>
          )}

          {/* Tarjetas Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-semibold">Total Procesados</span>
                <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{detallesEnvio.length}</span>
              </div>
              <span className="text-3xl">👥</span>
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-700 dark:text-emerald-300 block font-semibold">Notificaciones Enviadas</span>
                <span className="text-2xl font-black text-emerald-800 dark:text-emerald-200">{cantEnviados}</span>
              </div>
              <span className="text-3xl">✅</span>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-700 dark:text-amber-300 block font-semibold">Omitidas / Sin Coordinadora</span>
                <span className="text-2xl font-black text-amber-800 dark:text-amber-200">{cantOmitidos}</span>
              </div>
              <span className="text-3xl">⚠️</span>
            </div>
          </div>

          {/* Barra de Filtros y Búsqueda */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100 dark:bg-slate-900/80 p-3 rounded-xl">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              <button
                onClick={() => setLogTabFilter('TODOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logTabFilter === 'TODOS'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Todos ({detallesEnvio.length})
              </button>
              <button
                onClick={() => setLogTabFilter('ENVIADOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logTabFilter === 'ENVIADOS'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ✅ Enviados ({cantEnviados})
              </button>
              <button
                onClick={() => setLogTabFilter('SIN_COORDINADORA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logTabFilter === 'SIN_COORDINADORA'
                    ? 'bg-red-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ⚠️ Sin Coordinadora ({detallesEnvio.filter(d => !d.nombre_coordinador || d.motivo?.toLowerCase().includes('coordinadora')).length})
              </button>
              <button
                onClick={() => setLogTabFilter('OMITIDOS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  logTabFilter === 'OMITIDOS'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Omitidos / Duplicados
              </button>
            </div>

            {/* Búsqueda por Texto */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="🔍 Buscar paciente o ID..."
                value={logSearchText}
                onChange={(e) => setLogSearchText(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Tabla Resumen de Log */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/80 uppercase font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Identificación</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Correo Electrónico</th>
                  <th className="p-3">Teléfono</th>
                  <th className="p-3">Especialidad</th>
                  <th className="p-3">Coordinadora</th>
                  <th className="p-3">Detalle / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {detallesEnvio
                  .filter(det => {
                    const isEnviado = det.enviado === true || String(det.enviado).toLowerCase() === 'true';
                    const isSinCoord = !det.nombre_coordinador || det.motivo?.toLowerCase().includes('coordinadora');
                    
                    if (logTabFilter === 'ENVIADOS' && !isEnviado) return false;
                    if (logTabFilter === 'SIN_COORDINADORA' && !isSinCoord) return false;
                    if (logTabFilter === 'OMITIDOS' && isEnviado) return false;

                    if (logSearchText.trim()) {
                      const query = logSearchText.toLowerCase();
                      const matchName = det.nombre_paciente?.toLowerCase().includes(query);
                      const matchId = String(det.id_usuario).includes(query);
                      const matchIdent = det.identificacion?.toLowerCase().includes(query);
                      const matchEmail = det.correo_electronico?.toLowerCase().includes(query);
                      const matchPhone = det.telefono?.toLowerCase().includes(query);
                      const matchCoord = det.nombre_coordinador?.toLowerCase().includes(query);
                      return matchName || matchId || matchIdent || matchEmail || matchPhone || matchCoord;
                    }
                    return true;
                  })
                  .map((det, idx) => {
                    const isEnviado = det.enviado === true || String(det.enviado).toLowerCase() === 'true';
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                        <td className="p-3">
                          {isEnviado ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                              <span>✅</span> Enviado
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 text-[11px] font-bold inline-flex items-center gap-1">
                              <span>❌</span> No Enviado
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {det.identificacion || 'N/A'}
                        </td>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {det.nombre_paciente}
                          <span className="block text-[11px] text-slate-400 font-normal">ID Usuario: {det.id_usuario}</span>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {det.correo_electronico || 'Sin correo'}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {det.telefono || 'Sin teléfono'}
                        </td>
                        <td className="p-3">{det.nombre_especialidad || 'Sin especialidad'}</td>
                        <td className="p-3">
                          {det.nombre_coordinador ? (
                            <span className="text-slate-700 dark:text-slate-300 font-medium">{det.nombre_coordinador}</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 font-semibold italic text-[11px] bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded border border-red-200 dark:border-red-900">
                              ⚠️ Sin Coordinadora
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`text-xs ${isEnviado ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400 font-medium'}`}>
                            {det.motivo}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Botones de Navegación del Paso 4 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              ⬅ Volver a Vista Previa (Paso 3)
            </button>

            <button
              onClick={() => {
                setStep(1);
                setEnvioExitoso(false);
                setMensajeResultado('');
                setDetallesEnvio([]);
                setSelectedPatientIds([]);
                setSelectedCitaIds([]);
              }}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>🔄</span>
              <span>Iniciar Nueva Notificación</span>
            </button>
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
