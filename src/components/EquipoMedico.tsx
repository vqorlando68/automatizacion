import { useState, useEffect, useMemo } from 'react';

interface AssignedProfessional {
  id_profesional: number;
  nombre_profesional: string;
  correo_profesional?: string;
}

interface GirisPatient {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  nombre_completo: string;
  identificacion: string;
  correo_electronico?: string;
  telefono?: string;
  direccion?: string;
  id_entidad?: number;
  nombre_convenio?: string;
  nombre_ciudad?: string;
  nombre_coordinador?: string;
  profesionales_asignados: AssignedProfessional[];
}

interface ProfessionalCatalogItem {
  id: number;
  fullName: string;
  documentNumber?: string;
  img_url?: string;
  correo_electronico?: string;
  telefono?: string;
  specialty?: { id: number; nombre_especialidad: string }[];
}

export function EquipoMedico() {
  // Data States
  const [pacientes, setPacientes] = useState<GirisPatient[]>([]);
  const [profesionales, setProfesionales] = useState<ProfessionalCatalogItem[]>([]);
  
  // Loading States
  const [loadingPacientes, setLoadingPacientes] = useState<boolean>(true);
  const [loadingProfesionales, setLoadingProfesionales] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  
  // UI Filter States
  const [searchPatient, setSearchPatient] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'todos' | 'sin_asignar' | 'con_equipo'>('todos');
  const [searchDoctor, setSearchDoctor] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('todas');
  
  // Selection States
  const [selectedPatient, setSelectedPatient] = useState<GirisPatient | null>(null);
  const [selectedProfIds, setSelectedProfIds] = useState<number[]>([]);
  
  // Bulk Selection States
  const [bulkMode, setBulkMode] = useState<boolean>(false);
  const [selectedBulkPatientIds, setSelectedBulkPatientIds] = useState<number[]>([]);
  
  // Notification & Feedback States
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal Copy Team State
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [searchCopyPatient, setSearchCopyPatient] = useState<string>('');

  // 1. Fetch Patients & Professionals on Mount
  useEffect(() => {
    fetchPacientes();
    fetchProfesionales();
  }, []);

  const fetchPacientes = async () => {
    setLoadingPacientes(true);
    try {
      const res = await fetch('/api/equipo-medico-pacientes');
      const data = await res.json();
      if (data.success && Array.isArray(data.pacientes)) {
        setPacientes(data.pacientes);
        if (data.pacientes.length > 0 && !selectedPatient) {
          const first = data.pacientes[0];
          setSelectedPatient(first);
          setSelectedProfIds(first.profesionales_asignados?.map(p => p.id_profesional) || []);
        }
      } else {
        showNotification('error', data.error || 'Error al cargar pacientes GIRIS.');
      }
    } catch (err) {
      console.error('Error cargando pacientes GIRIS:', err);
      showNotification('error', 'Error de conexión al cargar pacientes GIRIS.');
    } finally {
      setLoadingPacientes(false);
    }
  };

  const fetchProfesionales = async () => {
    setLoadingProfesionales(true);
    try {
      const res = await fetch('/api/autonotificaciones-profesionales');
      const data = await res.json();
      if (data.success && Array.isArray(data.profesionales)) {
        setProfesionales(data.profesionales);
      }
    } catch (err) {
      console.error('Error cargando profesionales médicos:', err);
    } finally {
      setLoadingProfesionales(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Switch Selected Patient in Single Mode
  const handleSelectPatient = (pat: GirisPatient) => {
    setSelectedPatient(pat);
    setSelectedProfIds(pat.profesionales_asignados?.map(p => p.id_profesional) || []);
  };

  // Toggle Doctor Checkbox
  const toggleDoctor = (id: number) => {
    setSelectedProfIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Patients who already have assigned medical team
  const patientsWithTeam = useMemo(() => {
    return pacientes.filter(p => Array.isArray(p.profesionales_asignados) && p.profesionales_asignados.length > 0);
  }, [pacientes]);

  // Filtered Patients List
  const filteredPatients = useMemo(() => {
    return pacientes.filter(p => {
      const name = p.nombre_completo || '';
      const docId = p.identificacion || '';
      const conv = p.nombre_convenio || '';
      const q = (searchPatient || '').toLowerCase();

      const matchSearch =
        !searchPatient.trim() ||
        name.toLowerCase().includes(q) ||
        docId.toLowerCase().includes(q) ||
        conv.toLowerCase().includes(q);

      const hasTeam = Array.isArray(p.profesionales_asignados) && p.profesionales_asignados.length > 0;
      if (filterTab === 'sin_asignar' && hasTeam) return false;
      if (filterTab === 'con_equipo' && !hasTeam) return false;

      return matchSearch;
    });
  }, [pacientes, searchPatient, filterTab]);

  // Unique Specialties List
  const availableSpecialties = useMemo(() => {
    const set = new Set<string>();
    profesionales.forEach(p => {
      if (Array.isArray(p.specialty)) {
        p.specialty.forEach(s => {
          if (s && s.nombre_especialidad) set.add(s.nombre_especialidad);
        });
      }
    });
    return Array.from(set).sort();
  }, [profesionales]);

  // Sorting State for Doctors Table
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

  // Filtered & Sorted Doctors List
  const sortedFilteredDoctors = useMemo(() => {
    let result = profesionales.filter(doc => {
      const docName = doc.fullName || '';
      const q = (searchDoctor || '').toLowerCase();

      const matchSearch =
        !searchDoctor.trim() ||
        docName.toLowerCase().includes(q) ||
        (Array.isArray(doc.specialty) && doc.specialty.some(s => (s?.nombre_especialidad || '').toLowerCase().includes(q)));

      const matchSpecialty =
        selectedSpecialty === 'todas' ||
        (Array.isArray(doc.specialty) && doc.specialty.some(s => s?.nombre_especialidad === selectedSpecialty));

      return matchSearch && matchSpecialty;
    });

    result.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (profSortField === 'fullName') {
        valA = (a.fullName || '').toLowerCase();
        valB = (b.fullName || '').toLowerCase();
      } else if (profSortField === 'specialty') {
        valA = (Array.isArray(a.specialty) && a.specialty.length > 0 ? a.specialty[0]?.nombre_especialidad || 'General' : 'General').toLowerCase();
        valB = (Array.isArray(b.specialty) && b.specialty.length > 0 ? b.specialty[0]?.nombre_especialidad || 'General' : 'General').toLowerCase();
      }

      if (valA < valB) return profSortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return profSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [profesionales, searchDoctor, selectedSpecialty, profSortField, profSortOrder]);

  // Filtered Patients for Copy Team Modal
  const filteredCopyPatients = useMemo(() => {
    return patientsWithTeam.filter(p => {
      if (selectedPatient && p.id_usuario === selectedPatient.id_usuario) return false;
      if (!searchCopyPatient.trim()) return true;
      const q = searchCopyPatient.toLowerCase();
      const name = p.nombre_completo || '';
      const docId = p.identificacion || '';
      const conv = p.nombre_convenio || '';
      return (
        name.toLowerCase().includes(q) ||
        docId.toLowerCase().includes(q) ||
        conv.toLowerCase().includes(q)
      );
    });
  }, [patientsWithTeam, selectedPatient, searchCopyPatient]);

  // Quick Copy Team from another Patient
  const handleCopyTeamFromPatient = (sourcePat: GirisPatient) => {
    if (sourcePat && sourcePat.profesionales_asignados) {
      const copiedIds = sourcePat.profesionales_asignados.map(p => p.id_profesional);
      setSelectedProfIds(copiedIds);
      showNotification('success', `Equipo médico copiado de ${sourcePat.nombre_completo}. ¡No olvides Guardar!`);
      setIsCopyModalOpen(false);
    }
  };

  // Bulk Selection Handlers
  const toggleBulkPatient = (id: number) => {
    setSelectedBulkPatientIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllBulkPatients = () => {
    if (selectedBulkPatientIds.length === filteredPatients.length) {
      setSelectedBulkPatientIds([]);
    } else {
      setSelectedBulkPatientIds(filteredPatients.map(p => p.id_usuario));
    }
  };

  // Save Assignment (Single or Bulk)
  const handleSaveAssignment = async () => {
    if (!bulkMode && !selectedPatient) {
      showNotification('error', 'Por favor selecciona un paciente GIRIS para asignar.');
      return;
    }
    if (bulkMode && selectedBulkPatientIds.length === 0) {
      showNotification('error', 'Por favor selecciona al menos un paciente para la asignación masiva.');
      return;
    }

    setSaving(true);
    try {
      const payload = bulkMode
        ? { pacientes: selectedBulkPatientIds, profesionales: selectedProfIds }
        : { id_usuario: selectedPatient?.id_usuario, profesionales: selectedProfIds };

      const res = await fetch('/api/equipo-medico-guardar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        showNotification('success', data.mensaje || 'Equipo médico guardado correctamente.');
        
        // Update Local State for smooth UX
        const updatedProfObjects: AssignedProfessional[] = selectedProfIds.map(id => {
          const doc = profesionales.find(p => p.id === id);
          return {
            id_profesional: id,
            nombre_profesional: doc ? doc.fullName : `Médico #${id}`,
            correo_profesional: doc?.correo_electronico
          };
        });

        if (bulkMode) {
          setPacientes(prev =>
            prev.map(p =>
              selectedBulkPatientIds.includes(p.id_usuario)
                ? { ...p, profesionales_asignados: updatedProfObjects }
                : p
            )
          );
        } else if (selectedPatient) {
          setPacientes(prev =>
            prev.map(p =>
              p.id_usuario === selectedPatient.id_usuario
                ? { ...p, profesionales_asignados: updatedProfObjects }
                : p
            )
          );
          setSelectedPatient(prev => (prev ? { ...prev, profesionales_asignados: updatedProfObjects } : null));
        }
      } else {
        showNotification('error', data.error || 'Error al guardar en la base de datos.');
      }
    } catch (err) {
      console.error('Error al guardar equipo médico:', err);
      showNotification('error', 'Error de conexión al guardar equipo médico.');
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-indigo-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👨‍⚕️</span>
            <h1 className="text-2xl font-bold tracking-tight">Gestión de Equipo Médico</h1>
          </div>
          <p className="text-xs text-teal-100/90 mt-1 max-w-2xl">
            Asigna profesionales de la salud a los usuarios con indicador <span className="font-bold underline text-teal-200">Paciente GIRIS</span>. Administra las cuadrillas médicas individualmente o de forma masiva.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const nextMode = !bulkMode;
              setBulkMode(nextMode);
              setSelectedBulkPatientIds([]);
              setSelectedProfIds([]);
              if (!nextMode && selectedPatient) {
                setSelectedProfIds(selectedPatient.profesionales_asignados?.map(p => p.id_profesional) || []);
              }
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer ${
              bulkMode
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 font-extrabold'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            <span>{bulkMode ? '⚡ MODO MASIVO ACTIVO' : '⚡ Activar Asignación Masiva'}</span>
          </button>
        </div>
      </div>

      {/* NOTIFICACIÓN / ALERTA TOAST */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-sm flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100'
              : 'bg-red-50 dark:bg-red-950/70 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{notification.type === 'success' ? '✅' : '🛑'}</span>
            <span className="font-medium">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-60 hover:opacity-100 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* CONTENEDOR PRINCIPAL: PANEL IZQUIERDO (PACIENTES) + PANEL DERECHO (MÉDICOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================= PANEL IZQUIERDO: LISTA DE PACIENTES GIRIS (5 cols) ================= */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <span>🩺</span> Pacientes GIRIS ({filteredPatients.length})
              </h2>
              <button
                onClick={fetchPacientes}
                title="Recargar pacientes"
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
              >
                🔄 Actualizar
              </button>
            </div>

            {/* Buscador de Paciente */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por paciente, cédula o convenio..."
                value={searchPatient}
                onChange={e => setSearchPatient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
            </div>

            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterTab('todos')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'todos' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({pacientes.length})
              </button>
              <button
                onClick={() => setFilterTab('sin_asignar')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'sin_asignar' ? 'bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sin Equipo ({pacientes.filter(p => !p.profesionales_asignados || p.profesionales_asignados.length === 0).length})
              </button>
              <button
                onClick={() => setFilterTab('con_equipo')}
                className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterTab === 'con_equipo' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Con Equipo ({pacientes.filter(p => p.profesionales_asignados && p.profesionales_asignados.length > 0).length})
              </button>
            </div>

            {/* Asignación Masiva: Checkbox Seleccionar Todos */}
            {bulkMode && (
              <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-900 dark:text-amber-200">
                  <input
                    type="checkbox"
                    checked={selectedBulkPatientIds.length > 0 && selectedBulkPatientIds.length === filteredPatients.length}
                    onChange={toggleAllBulkPatients}
                    className="w-4 h-4 text-amber-600 rounded cursor-pointer"
                  />
                  <span>Seleccionar Todos ({filteredPatients.length})</span>
                </label>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  {selectedBulkPatientIds.length} marcado(s)
                </span>
              </div>
            )}

            {/* LISTA DE PACIENTES GIRIS */}
            {loadingPacientes ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                <span className="animate-spin text-xl inline-block">⏳</span>
                <p>Cargando pacientes GIRIS...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                No se encontraron pacientes GIRIS que coincidan con la búsqueda.
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1 pb-44">
                {filteredPatients.map(pat => {
                  const isSelected = !bulkMode && selectedPatient?.id_usuario === pat.id_usuario;
                  const isBulkChecked = bulkMode && selectedBulkPatientIds.includes(pat.id_usuario);
                  const teamCount = pat.profesionales_asignados?.length || 0;

                  return (
                    <div
                      key={pat.id_usuario}
                      onClick={() => {
                        if (bulkMode) {
                          toggleBulkPatient(pat.id_usuario);
                        } else {
                          handleSelectPatient(pat);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        bulkMode
                          ? isBulkChecked
                            ? 'bg-amber-50/80 dark:bg-amber-950/50 border-amber-400 dark:border-amber-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:bg-slate-50'
                          : isSelected
                          ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 shadow-xs font-medium'
                          : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {bulkMode && (
                          <input
                            type="checkbox"
                            checked={isBulkChecked}
                            onChange={() => {}}
                            className="w-4 h-4 text-amber-600 rounded cursor-pointer shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-1.5 relative group flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 cursor-help border-b border-dotted border-slate-400 dark:border-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                                {pat.nombre_completo}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 font-bold shrink-0">
                                {pat.nombre_convenio || 'Sin Convenio'}
                              </span>

                              {/* TARJETA CON DETALLES AL PASAR EL MOUSE (HOVER) */}
                              <div className="hidden group-hover:block absolute left-0 top-full mt-1.5 w-72 p-3.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs rounded-2xl shadow-2xl backdrop-blur-md border border-slate-200 dark:border-slate-700 z-50 pointer-events-none space-y-2 transition-all">
                                <div className="font-bold text-teal-700 dark:text-teal-300 pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                  <span className="truncate">{pat.nombre_completo}</span>
                                  <span className="text-[10px] text-slate-400 font-normal shrink-0">ID #{pat.id_usuario}</span>
                                </div>
                                <div className="space-y-1.5 text-[11px]">
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">📧 Correo:</span>
                                    <span className="truncate text-slate-700 dark:text-slate-200">{pat.correo_electronico || 'No registrado'}</span>
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">📞 Teléfono:</span>
                                    <span className="text-slate-700 dark:text-slate-200">{pat.telefono || 'No registrado'}</span>
                                  </p>
                                  <p className="flex items-start gap-1.5">
                                    <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">🏠 Dirección:</span>
                                    <span className="line-clamp-2 text-slate-700 dark:text-slate-200">{pat.direccion || 'No registrada'}</span>
                                  </p>
                                  <p className="flex items-center gap-1.5">
                                    <span className="text-teal-600 dark:text-teal-400 font-bold shrink-0">🏙️ Ciudad:</span>
                                    <span className="text-slate-700 dark:text-slate-200">{pat.nombre_ciudad || 'No registrada'}</span>
                                  </p>
                                  <p className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                                    <span className="text-indigo-600 dark:text-indigo-300 font-bold shrink-0">👤 Coordinador:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{pat.nombre_coordinador || 'No asignado'}</span>
                                  </p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              Doc: <span className="font-mono">{pat.identificacion}</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* BADGE DE EQUIPO ASIGNADO */}
                      <div className="shrink-0 text-right">
                        {teamCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                            ✓ {teamCount} médico(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                            Sin equipo
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================= PANEL DERECHO: ASIGNACIÓN DE PROFESIONALES (7 cols) ================= */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 flex flex-col justify-between">
          
          <div className="space-y-5">
            {/* CABECERA DEL PACIENTE SELECCIONADO O MODO MASIVO */}
            {bulkMode ? (
              <div className="bg-amber-50 dark:bg-amber-950/60 p-4 rounded-xl border border-amber-300 dark:border-amber-700 space-y-1">
                <span className="text-xs font-extrabold uppercase text-amber-800 dark:text-amber-300 tracking-wider">
                  ⚡ Asignación Masiva Activa
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {selectedBulkPatientIds.length} paciente(s) seleccionado(s)
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Los profesionales médicos marcados a continuación se asignarán al mismo tiempo a todos los pacientes seleccionados en la lista.
                </p>
              </div>
            ) : selectedPatient ? (
              <div className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Paciente Seleccionado
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedPatient.nombre_completo}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    <span>Identificación: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedPatient.identificacion}</strong></span>
                    {selectedPatient.correo_electronico && <span>• {selectedPatient.correo_electronico}</span>}
                    {selectedPatient.telefono && <span>• 📞 {selectedPatient.telefono}</span>}
                  </div>
                </div>

                {/* BOTÓN PARA ABRIR MODAL DE COPIAR EQUIPO */}
                {patientsWithTeam.length > 0 && (
                  <button
                    onClick={() => {
                      setSearchCopyPatient('');
                      setIsCopyModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0 self-start md:self-center"
                    title="Copiar equipo asignado desde otro paciente"
                  >
                    <span>📋</span>
                    <span>Copiar Equipo Médico</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                Selecciona un paciente GIRIS de la izquierda para gestionar su equipo médico.
              </div>
            )}

            {/* SECCIÓN DE SELECCIÓN DE PROFESIONALES */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Profesionales de Salud Disponibles ({selectedProfIds.length} seleccionados)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProfIds(profesionales.map(p => p.id))}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Marcar Todos
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={() => setSelectedProfIds([])}
                    className="text-[11px] font-bold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                  >
                    Desmarcar Todos
                  </button>
                </div>
              </div>

              {/* Filtros de Médicos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="🔍 Filtrar médico o especialidad..."
                  value={searchDoctor}
                  onChange={e => setSearchDoctor(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={selectedSpecialty}
                  onChange={e => setSelectedSpecialty(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="todas">Todas las Especialidades</option>
                  {availableSpecialties.map(sp => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>

              {/* TABLA DE PROFESIONALES CON ENCABEZADOS ORDENABLES */}
              {loadingProfesionales ? (
                <div className="p-8 text-center text-slate-400 text-xs">Cargando médicos disponibles...</div>
              ) : (
                <div className="max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 font-bold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 backdrop-blur-md">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3 w-12 text-center">Foto</th>
                        <th
                          onClick={() => handleSortProf('fullName')}
                          className="p-3 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-all select-none"
                          title="Haz clic para ordenar por Nombre"
                        >
                          <div className="flex items-center gap-1">
                            <span>Profesional Médico</span>
                            {profSortField === 'fullName' && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
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
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {profSortOrder === 'asc' ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </th>
                        <th className="p-3">Contacto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {sortedFilteredDoctors.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-slate-400">
                            No se encontraron médicos que coincidan con la búsqueda.
                          </td>
                        </tr>
                      ) : (
                        sortedFilteredDoctors.map((doc) => {
                          const isChecked = selectedProfIds.includes(doc.id);
                          return (
                            <tr
                              key={doc.id}
                              onClick={() => toggleDoctor(doc.id)}
                              className={`hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 cursor-pointer transition-all ${
                                isChecked ? 'bg-emerald-50/80 dark:bg-emerald-950/60 font-semibold' : ''
                              }`}
                            >
                              <td className="p-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <img
                                  src={doc.img_url || 'https://tekersalud.maxapex.net/FILES_DEV_TEKER/logo_circulo.png'}
                                  alt={doc.fullName}
                                  className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs mx-auto"
                                />
                              </td>
                              <td className="p-3 font-medium text-slate-800 dark:text-slate-100">
                                {doc.fullName}
                              </td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-1">
                                  {doc.specialty && doc.specialty.length > 0 ? (
                                    doc.specialty.map((s) => (
                                      <span
                                        key={s.id}
                                        className="inline-block bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-medium"
                                      >
                                        {s.nombre_especialidad}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-slate-400">General</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                {doc.correo_electronico && (
                                  <div className="truncate max-w-[160px]" title={doc.correo_electronico}>
                                    ✉️ {doc.correo_electronico}
                                  </div>
                                )}
                                {doc.telefono && (
                                  <div>
                                    📞 {doc.telefono}
                                  </div>
                                )}
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
          </div>

          {/* BOTÓN INFERIOR DE GUARDADO */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              {bulkMode
                ? `Asignar a ${selectedBulkPatientIds.length} paciente(s) seleccionado(s)`
                : selectedPatient
                ? `Asignar ${selectedProfIds.length} médico(s) a ${selectedPatient.nombre_completo}`
                : 'Sin paciente seleccionado'}
            </span>

            <button
              disabled={saving || (!bulkMode && !selectedPatient) || (bulkMode && selectedBulkPatientIds.length === 0)}
              onClick={handleSaveAssignment}
              className="w-full sm:w-auto px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>Guardar Equipo Médico</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE COPIAR EQUIPO MÉDICO */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>📋</span>
                  <span>Copiar Equipo Médico desde otro Paciente</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Selecciona un paciente de la lista para duplicar sus médicos asignados.
                </p>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Buscador dentro del Modal */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar por paciente, documento o convenio..."
                  value={searchCopyPatient}
                  onChange={e => setSearchCopyPatient(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Tabla de Pacientes en el Modal */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCopyPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                  No se encontraron otros pacientes con equipo médico asignado que coincidan con la búsqueda.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Paciente</th>
                        <th className="p-3">Convenio</th>
                        <th className="p-3">Equipo Asignado</th>
                        <th className="p-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredCopyPatients.map(pat => (
                        <tr key={pat.id_usuario} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all">
                          <td className="p-3 font-medium text-slate-900 dark:text-slate-100">
                            <div>{pat.nombre_completo}</div>
                            <div className="text-[10px] text-slate-400 font-mono">Doc: {pat.identificacion}</div>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800/80">
                              {pat.nombre_convenio || 'Sin Convenio'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1 items-center">
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                                {pat.profesionales_asignados.length} médico(s)
                              </span>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                                {pat.profesionales_asignados.map(p => p.nombre_profesional).join(', ')}
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleCopyTeamFromPatient(pat)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                            >
                              Copiar Equipo
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pie del Modal */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
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
