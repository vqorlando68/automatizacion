import { useState, useEffect, useMemo } from 'react'
import * as XLSX from 'xlsx'
import type { ParsedRow, UploadedCargue, FieldMapping } from './utils/mappingUtils'
import {
  COMMON_DATE_FORMATS,
  FK_TABLES_MAP,
  buildParsedRow,
  suggestInitialMappings,
  getHomologatedValue
} from './utils/mappingUtils'
import { DatabaseTableModal } from './components/DatabaseTableModal'
import { UniqueValuesModal } from './components/UniqueValuesModal'
import { Autoprogramaciones } from './components/Autoprogramaciones'
import { Autonotificaciones } from './components/Autonotificaciones'
import { EquipoMedico } from './components/EquipoMedico'

type Tab = 'cargue' | 'crear_usuarios' | 'autoprogramaciones' | 'autonotificaciones' | 'equipo_medico';
type WizardStep = '1' | '2_text' | '2_excel' | '3' | '4';
type UserWizardStep = '1' | '2' | '3' | '4' | '5';

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

// Lista completa de columnas de la tabla tkr_usuarios
const TKR_USUARIOS_COLUMNS: Omit<FieldMapping, 'columna_origen'>[] = [
  { campo_destino: 'nombres', label: 'Nombres', tipo: 'VARCHAR2', required: true },
  { campo_destino: 'apellidos', label: 'Apellidos', tipo: 'VARCHAR2', required: true },
  { campo_destino: 'usuario', label: 'Usuario (Username)', tipo: 'VARCHAR2' },
  { campo_destino: 'clave', label: 'Clave / Contraseña', tipo: 'VARCHAR2' },
  { campo_destino: 'identificacion', label: 'Número Identificación', tipo: 'VARCHAR2' },
  { campo_destino: 'id_tipo_identificacion', label: 'ID Tipo Identificación', tipo: 'NUMBER' },
  { campo_destino: 'id_genero', label: 'ID Género', tipo: 'NUMBER' },
  { campo_destino: 'correo_electronico', label: 'Correo Electrónico', tipo: 'VARCHAR2' },
  { campo_destino: 'telefono', label: 'Teléfono Principal', tipo: 'VARCHAR2' },
  { campo_destino: 'telefono_2', label: 'Teléfono Secundario', tipo: 'VARCHAR2' },
  { campo_destino: 'fecha_nacimiento', label: 'Fecha de Nacimiento', tipo: 'DATE' },
  { campo_destino: 'direccion', label: 'Dirección Residencia', tipo: 'VARCHAR2' },
  { campo_destino: 'detalle_direccion', label: 'Detalle Dirección', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ciudad_residencia', label: 'ID Ciudad Residencia', tipo: 'NUMBER' },
  { campo_destino: 'barrio', label: 'Barrio (Texto)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_barrio', label: 'ID Barrio', tipo: 'NUMBER' },
  { campo_destino: 'id_estado_usuario', label: 'ID Estado Usuario', tipo: 'NUMBER' },
  { campo_destino: 'estado', label: 'Estado (A/I)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_rol', label: 'ID Rol', tipo: 'NUMBER' },
  { campo_destino: 'cedula_profesional', label: 'Cédula Profesional', tipo: 'VARCHAR2' },
  { campo_destino: 'lugar_practica', label: 'Lugar de Práctica', tipo: 'VARCHAR2' },
  { campo_destino: 'medico_cabecera', label: 'Médico Cabecera', tipo: 'VARCHAR2' },
  { campo_destino: 'correo_medico_cabecera', label: 'Correo Médico Cabecera', tipo: 'VARCHAR2' },
  { campo_destino: 'id_prestador_salud', label: 'ID Prestador Salud', tipo: 'NUMBER' },
  { campo_destino: 'asegurador_2', label: 'Asegurador 2', tipo: 'VARCHAR2' },
  { campo_destino: 'disponible', label: 'Disponible (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'autorizacion_medico', label: 'Autorización Médico (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'enlace_clave', label: 'Enlace Clave', tipo: 'VARCHAR2' },
  { campo_destino: 'otro_barrio', label: 'Otro Barrio', tipo: 'VARCHAR2' },
  { campo_destino: 'otra_ciudad', label: 'Otra Ciudad', tipo: 'VARCHAR2' },
  { campo_destino: 'descripcion', label: 'Descripción / CV', tipo: 'VARCHAR2' },
  { campo_destino: 'id_perfil_doctor', label: 'ID Perfil Doctor', tipo: 'NUMBER' },
  { campo_destino: 'id_usuario_creacion', label: 'ID Usuario Creación', tipo: 'NUMBER' },
  { campo_destino: 'id_usuario_activa', label: 'ID Usuario Activa', tipo: 'NUMBER' },
  { campo_destino: 'fecha_creacion', label: 'Fecha Creación', tipo: 'DATE' },
  { campo_destino: 'fecha_activacion', label: 'Fecha Activación', tipo: 'DATE' },
  { campo_destino: 'fecha_vencimiento_clave', label: 'Fecha Vencimiento Clave', tipo: 'DATE' },
  { campo_destino: 'fecha_disponible', label: 'Fecha Disponible', tipo: 'DATE' },
  { campo_destino: 'fecha_expedicion_identificacion', label: 'Fecha Expedición Identificación', tipo: 'DATE' },
  { campo_destino: 'fecha_ultima_epicrisis', label: 'Fecha Última Epicrisis', tipo: 'DATE' },
  { campo_destino: 'id_codigo_tarifa', label: 'ID Código Tarifa', tipo: 'NUMBER' },
  { campo_destino: 'tipo_tarifa', label: 'Tipo Tarifa (C/P)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_regimen_aseguramiento', label: 'ID Régimen Aseguramiento', tipo: 'NUMBER' },
  { campo_destino: 'id_medio', label: 'ID Medio Enteró', tipo: 'NUMBER' },
  { campo_destino: 'otro_medio', label: 'Otro Medio Enteró', tipo: 'VARCHAR2' },
  { campo_destino: 'clave_inicial', label: 'Clave Inicial', tipo: 'NUMBER' },
  { campo_destino: 'flag_foto', label: 'Flag Foto (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'codigo_cambio_clave', label: 'Código Cambio Clave', tipo: 'NUMBER' },
  { campo_destino: 'duracion_minutos_cita', label: 'Duración Cita (Minutos)', tipo: 'NUMBER' },
  { campo_destino: 'numero_fila_gsheet', label: 'Número Fila GSheet', tipo: 'NUMBER' },
  { campo_destino: 'trabaja_festivos', label: 'Trabaja Festivos (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'linea_servicio', label: 'Línea Servicio', tipo: 'VARCHAR2' },
  { campo_destino: 'lineas_servicio', label: 'Líneas Servicio', tipo: 'VARCHAR2' },
  { campo_destino: 'bloqueado', label: 'Bloqueado (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_activecampaign', label: 'ID Active Campaign', tipo: 'NUMBER' },
  { campo_destino: 'idiomas', label: 'Idiomas', tipo: 'VARCHAR2' },
  { campo_destino: 'url_video', label: 'URL Video Presentación', tipo: 'VARCHAR2' },
  { campo_destino: 'codigo_referencia', label: 'Código Referencia', tipo: 'VARCHAR2' },
  { campo_destino: 'id_referenciado_por', label: 'ID Referenciado Por', tipo: 'NUMBER' },
  { campo_destino: 'regimen_simple', label: 'Régimen Simple (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'saldo_referencias', label: 'Saldo Referencias', tipo: 'NUMBER' },
  { campo_destino: 'id_referido_por', label: 'ID Referido Por', tipo: 'NUMBER' },
  { campo_destino: 'etiqueta_firma', label: 'Etiqueta Firma', tipo: 'VARCHAR2' },
  { campo_destino: 'codigo_autorizacion', label: 'Código Autorización', tipo: 'NUMBER' },
  { campo_destino: 'excluir_encuestas', label: 'Excluir Encuestas (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_pais', label: 'ID País', tipo: 'NUMBER' },
  { campo_destino: 'id_plan_asegurador', label: 'ID Plan Asegurador', tipo: 'NUMBER' },
  { campo_destino: 'zona', label: 'Zona (U/R)', tipo: 'VARCHAR2' },
  { campo_destino: 'sisben', label: 'Sisbén (0,1,2,3)', tipo: 'NUMBER' },
  { campo_destino: 'etnia', label: 'Etnia', tipo: 'NUMBER' },
  { campo_destino: 'nombre_madre', label: 'Nombre de la Madre', tipo: 'VARCHAR2' },
  { campo_destino: 'id_estado_civil', label: 'ID Estado Civil', tipo: 'NUMBER' },
  { campo_destino: 'deshabilitar_encuesta', label: 'Deshabilitar Encuesta (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ghl', label: 'ID GHL', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ocupacion', label: 'ID Ocupación', tipo: 'NUMBER' },
  { campo_destino: 'otra_ocupacion', label: 'Otra Ocupación', tipo: 'VARCHAR2' },
  { campo_destino: 'consideraciones', label: 'Consideraciones', tipo: 'VARCHAR2' },
  { campo_destino: 'paciente_giris', label: 'Paciente GIRIS (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'ocultar_tarifa', label: 'Ocultar Tarifa (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ghl_soporte', label: 'ID GHL Soporte', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ghl_obligatorio', label: 'ID GHL Obligatorio', tipo: 'VARCHAR2' },
  { campo_destino: 'id_ghl_giris', label: 'ID GHL GIRIS', tipo: 'VARCHAR2' },
  { campo_destino: 'ocultar_directorio', label: 'Ocultar Directorio (S/N)', tipo: 'VARCHAR2' },
  { campo_destino: 'comentarios', label: 'Comentarios', tipo: 'VARCHAR2' },
  { campo_destino: 'epicrisis', label: 'Epicrisis', tipo: 'CLOB' },
  { campo_destino: 'evolucion', label: 'Evolución', tipo: 'CLOB' }
];



function App() {
  // --- Estados de Rutas y Sesión ---
  const [user, setUser] = useState<string | null>(() => localStorage.getItem('username'));
  const [currentTab, setCurrentTab] = useState<Tab>('cargue');

  // --- Estados de Autenticación ---
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // --- Estados del Asistente de Carga (Wizard) ---
  const [wizardStep, setWizardStep] = useState<WizardStep>('1');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'text' | 'excel' | null>(null);
  
  // Parámetros de texto
  const [delimiter, setDelimiter] = useState<string>(',');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [rawTextContent, setRawTextContent] = useState<string>('');

  // Parámetros de Excel
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);

  // Vista previa e inserción de cargue
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<ParsedRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccessId, setUploadSuccessId] = useState<number | null>(null);

  // Datos del cargue guardados (obtenidos del servidor)
  const [loadedRows, setLoadedRows] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Catálogos para selección de Entidad, Convenio y Régimen en el Asistente de Cargue
  const [entidadesCatalog, setEntidadesCatalog] = useState<EntidadCatalog[]>([]);
  const [selectedEntidadId, setSelectedEntidadId] = useState<string>('');
  const [selectedConvenioId, setSelectedConvenioId] = useState<string>('');
  const [regimenesCatalog, setRegimenesCatalog] = useState<{ id: number; descripcion: string }[]>([]);
  const [selectedRegimenId, setSelectedRegimenId] = useState<string>('');
  const [loadingCatalogosApp, setLoadingCatalogosApp] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCatalogosApp();
    }
  }, [user]);

  const fetchCatalogosApp = async () => {
    setLoadingCatalogosApp(true);
    try {
      const res = await fetch('/api/autoprogramaciones-catalogos');
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.entidades)) {
        setEntidadesCatalog(data.entidades);
      }

      const resReg = await fetch('/api/regimenes-aseguramiento');
      const dataReg = await resReg.json();
      if (resReg.ok && dataReg.success && Array.isArray(dataReg.regimenes)) {
        setRegimenesCatalog(dataReg.regimenes);
      }
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    } finally {
      setLoadingCatalogosApp(false);
    }
  };

  const conveniosDisponibles = useMemo(() => {
    if (!selectedEntidadId) return [];
    const ent = entidadesCatalog.find(e => String(e.id) === String(selectedEntidadId));
    return ent?.entidades_hijas || [];
  }, [entidadesCatalog, selectedEntidadId]);

  // Filtrar solo entidades que tienen al menos un convenio (entidades_hijas)
  const entidadesConConvenio = useMemo(() => {
    return entidadesCatalog.filter(ent => Array.isArray(ent.entidades_hijas) && ent.entidades_hijas.length > 0);
  }, [entidadesCatalog]);

  const getCargueEntidadLabel = (cargue?: UploadedCargue) => {
    if (!cargue) return 'N/A';
    if (cargue.nombre_entidad) return cargue.nombre_entidad;
    if (cargue.id_entidad !== undefined && cargue.id_entidad !== null) {
      const ent = entidadesCatalog.find(e => String(e.id) === String(cargue.id_entidad));
      if (ent) return ent.label;
      return `ID #${cargue.id_entidad}`;
    }
    return 'No especificada';
  };

  const getCargueConvenioLabel = (cargue?: UploadedCargue) => {
    if (!cargue) return 'N/A';
    if (cargue.nombre_convenio) return cargue.nombre_convenio;
    if (cargue.id_convenio !== undefined && cargue.id_convenio !== null) {
      for (const ent of entidadesCatalog) {
        const conv = ent.entidades_hijas?.find(c => String(c.id_convenio ?? c.id) === String(cargue.id_convenio));
        if (conv) return conv.nombre_entidad;
      }
      return `ID #${cargue.id_convenio}`;
    }
    return 'No especificado';
  };

  const getCargueRegimenLabel = (cargue?: UploadedCargue) => {
    if (!cargue) return 'N/A';
    if (cargue.nombre_regimen) return cargue.nombre_regimen;
    if (cargue.id_regimen_aseguramiento !== undefined && cargue.id_regimen_aseguramiento !== null) {
      const reg = regimenesCatalog.find(r => String(r.id) === String(cargue.id_regimen_aseguramiento));
      if (reg) return reg.descripcion;
      return `ID #${cargue.id_regimen_aseguramiento}`;
    }
    return 'No especificado';
  };

  // --- Estados de Sub-pestaña y Eliminación en Cargue ---
  const [cargueSubTab, setCargueSubTab] = useState<'nuevo' | 'historial'>('nuevo');
  const [historialCargueId, setHistorialCargueId] = useState<string>('');
  const [historialRows, setHistorialRows] = useState<any[]>([]);
  const [loadingHistorialDetails, setLoadingHistorialDetails] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingCargue, setDeletingCargue] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);

  // --- Estados del Asistente de Crear Usuarios ---
  const [userWizardStep, setUserWizardStep] = useState<UserWizardStep>('1');
  const [carguesList, setCarguesList] = useState<UploadedCargue[]>([]);
  const [loadingCargues, setLoadingCargues] = useState(false);
  const [selectedCargueId, setSelectedCargueId] = useState<string>('');
  const [loadingCargueDetails, setLoadingCargueDetails] = useState(false);
  const [cargueDetailRows, setCargueDetailRows] = useState<ParsedRow[]>([]);

  // Mapeo dinámico de columnas del archivo
  const [userMappings, setUserMappings] = useState<FieldMapping[]>([
    { campo_destino: 'nombres', label: 'Nombres', tipo: 'VARCHAR2', columna_origen: 'columna_1', required: true },
    { campo_destino: 'apellidos', label: 'Apellidos', tipo: 'VARCHAR2', columna_origen: 'columna_2', required: true },
    { campo_destino: 'usuario', label: 'Usuario (Username)', tipo: 'VARCHAR2', columna_origen: 'columna_3' },
    { campo_destino: 'clave', label: 'Clave / Contraseña', tipo: 'VARCHAR2', columna_origen: 'columna_4' },
    { campo_destino: 'identificacion', label: 'Número Identificación', tipo: 'VARCHAR2', columna_origen: 'columna_5' }
  ]);

  // Campo seleccionado en el desplegable para agregar nuevo mapeo
  const [selectedFieldToAdd, setSelectedFieldToAdd] = useState<string>('');

  // Buscar y ordenar campos de tkr_usuarios
  const [columnSearchTerm, setColumnSearchTerm] = useState('');
  const [columnSortBy, setColumnSortBy] = useState<'original' | 'alphabetical'>('original');

  // Anchos de columnas en la grilla de validación (Paso 4)
  const [validationColWidths, setValidationColWidths] = useState<Record<string, number>>({});

  const handleResizeMouseDown = (e: React.MouseEvent, campoDestino: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = validationColWidths[campoDestino] || 160;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(80, startWidth + deltaX);
      setValidationColWidths(prev => ({
        ...prev,
        [campoDestino]: newWidth
      }));
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const filteredAndSortedColumns = useMemo(() => {
    let cols = TKR_USUARIOS_COLUMNS.filter(
      col => !userMappings.some(m => m.campo_destino === col.campo_destino)
    );

    if (columnSearchTerm.trim() !== '') {
      const term = columnSearchTerm.toLowerCase();
      cols = cols.filter(
        col =>
          col.label.toLowerCase().includes(term) ||
          col.campo_destino.toLowerCase().includes(term)
      );
    }

    if (columnSortBy === 'alphabetical') {
      cols = [...cols].sort((a, b) => a.label.localeCompare(b.label));
    }

    return cols;
  }, [userMappings, columnSearchTerm, columnSortBy]);

  // Modal para visualizar datos de tablas foráneas
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [modalTableName, setModalTableName] = useState('');
  const [modalTableRows, setModalTableRows] = useState<Array<Record<string, any>>>([]);
  const [loadingModalTable, setLoadingModalTable] = useState(false);
  const [modalTableError, setModalTableError] = useState<string | null>(null);

  const openForeignTableModal = async (tableName: string) => {
    if (!tableName) return;
    setModalTableName(tableName);
    setIsTableModalOpen(true);
    setLoadingModalTable(true);
    setModalTableError(null);
    setModalTableRows([]);
    try {
      const res = await fetch(`/api/tabla-datos?tabla=${encodeURIComponent(tableName)}`);
      const data = await res.json();
      if (data.success) {
        setModalTableRows(data.rows);
      } else {
        setModalTableError(data.error || 'Error al cargar los datos.');
      }
    } catch (err: any) {
      setModalTableError(err.message || 'Error de red al consultar la tabla.');
    } finally {
      setLoadingModalTable(false);
    }
  };

  // Modal para visualizar valores únicos de una columna
  const [isUniqueModalOpen, setIsUniqueModalOpen] = useState(false);
  const [uniqueModalColName, setUniqueModalColName] = useState('');
  const [uniqueModalFieldLabel, setUniqueModalFieldLabel] = useState('');
  const [uniqueModalCampoDestino, setUniqueModalCampoDestino] = useState<string>('');
  const [foreignTable, setForeignTable] = useState<string>('');
  const [foreignRows, setForeignRows] = useState<Array<any>>([]);

  const initialDraftMappings = useMemo(() => {
    if (!uniqueModalCampoDestino) return {};
    const mapping = userMappings.find(m => m.campo_destino === uniqueModalCampoDestino);
    const existingVals = mapping?.homologacion?.valores || [];
    const draft: Record<string, string> = {};
    existingVals.forEach(v => { draft[v.origen] = v.destino; });
    return draft;
  }, [uniqueModalCampoDestino, userMappings]);

  // Load foreign table rows when modal opens for a field with foreign table
  useEffect(() => {
    if (isUniqueModalOpen && uniqueModalCampoDestino) {
      const mapping = userMappings.find(m => m.campo_destino === uniqueModalCampoDestino);
      const tabla = mapping?.homologacion?.tabla_destino || '';
      setForeignTable(tabla);
      if (tabla) {
        fetch(`/api/tabla-datos?tabla=${encodeURIComponent(tabla)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && Array.isArray(data.rows)) {
              setForeignRows(data.rows);
            } else {
              setForeignRows([]);
            }
          })
          .catch(() => setForeignRows([]));
      } else {
        setForeignRows([]);
      }
    } else {
      setForeignRows([]);
      setForeignTable('');
    }
  }, [isUniqueModalOpen, uniqueModalCampoDestino, userMappings]);

  const openUniqueValuesModal = (colName: string, fieldLabel: string, campoDestino?: string) => {
    setUniqueModalColName(colName);
    setUniqueModalFieldLabel(fieldLabel);
    setUniqueModalCampoDestino(campoDestino || '');
    setIsUniqueModalOpen(true);
  };

  const uniqueColValues = useMemo(() => {
    if (!uniqueModalColName) return [];

    const idx = Number(uniqueModalColName.replace('columna_', ''));
    const key = `c${idx}`;

    const counts: Record<string, number> = {};
    cargueDetailRows.forEach(row => {
      const val = String(row[key] ?? '').trim();
      counts[val] = (counts[val] || 0) + 1;
    });

    const uniqueList = Object.entries(counts).map(([value, count]) => ({
      value,
      count
    }));

    uniqueList.sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
    return uniqueList;
  }, [cargueDetailRows, uniqueModalColName]);

  const [creatingUsers, setCreatingUsers] = useState(false);
  const [userCreationError, setUserCreationError] = useState<string | null>(null);
  const [modoCarga, setModoCarga] = useState<'TODO' | 'PARCIAL'>('PARCIAL');
  const [creationSummary, setCreationSummary] = useState<{
    rows_processed: number;
    exitosos: number;
    errores: number;
    any_error: boolean;
  } | null>(null);
  const [cargueResultDetails, setCargueResultDetails] = useState<any[]>([]);
  const [loadingResultDetails, setLoadingResultDetails] = useState(false);

  // --- Estados de Tema (Claro / Oscuro) ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Efecto para sincronizar el tema en el DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Cargar lista de cargues al seleccionar la pestaña o cambiar de sub-pestaña
  useEffect(() => {
    if ((currentTab === 'crear_usuarios' || currentTab === 'cargue') && user) {
      fetchCargues();
    }
  }, [currentTab, cargueSubTab, user]);

  const fetchCargues = async (preferredSelectedId?: string) => {
    setLoadingCargues(true);
    try {
      const response = await fetch('/api/cargues-lista');
      const data = await response.json();
      if (response.ok && data.success) {
        const list: UploadedCargue[] = data.cargues || [];
        setCarguesList(list);

        if (list.length > 0) {
          const targetId = preferredSelectedId && list.some(c => String(c.id) === String(preferredSelectedId))
            ? preferredSelectedId
            : (historialCargueId && list.some(c => String(c.id) === String(historialCargueId)))
              ? historialCargueId
              : String(list[0].id);

          if (!selectedCargueId || !list.some(c => String(c.id) === String(selectedCargueId))) {
            setSelectedCargueId(targetId);
          }

          // Cargar automáticamente los datos del cargue en la vista de Historial
          handleSelectHistorialCargue(targetId);
        } else {
          setHistorialCargueId('');
          setHistorialRows([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar lista de archivos:', err);
    } finally {
      setLoadingCargues(false);
    }
  };

  const handleSelectHistorialCargue = async (cargueIdStr: string) => {
    setHistorialCargueId(cargueIdStr);
    if (!cargueIdStr) {
      setHistorialRows([]);
      return;
    }
    setLoadingHistorialDetails(true);
    setDeleteErrorMsg(null);
    try {
      const response = await fetch('/api/cargue-detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_temp_cargue: Number(cargueIdStr) }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setHistorialRows(data.rows || []);
      } else {
        setHistorialRows([]);
      }
    } catch (err) {
      console.error('Error al consultar detalle del historial:', err);
      setHistorialRows([]);
    } finally {
      setLoadingHistorialDetails(false);
    }
  };

  const handleExecuteDeleteCargue = async () => {
    if (!historialCargueId) return;
    setDeletingCargue(true);
    setDeleteErrorMsg(null);
    setDeleteSuccessMsg(null);

    try {
      const response = await fetch('/api/cargue-eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_temp_cargue: Number(historialCargueId) }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setDeleteSuccessMsg(`El cargue #${historialCargueId} fue eliminado exitosamente junto con sus registros.`);
        setShowDeleteConfirmModal(false);
        setHistorialCargueId('');
        setHistorialRows([]);
        await fetchCargues();
      } else {
        setDeleteErrorMsg(data.error || 'Ocurrió un error al intentar eliminar el cargue.');
        setShowDeleteConfirmModal(false);
      }
    } catch (err: any) {
      console.error('Error al eliminar cargue:', err);
      setDeleteErrorMsg('Error de conexión al eliminar el cargue.');
      setShowDeleteConfirmModal(false);
    } finally {
      setDeletingCargue(false);
    }
  };

  // Manejar Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim() || !passwordInput) {
      setAuthError('Por favor, ingresa el usuario y la contraseña.');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput, password: passwordInput }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.username);
        localStorage.setItem('username', data.username);
      } else {
        setAuthError(data.error || 'Ocurrió un error al validar las credenciales.');
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      setAuthError('Error al conectar con el servidor de autenticación.');
    } finally {
      setLoading(false);
    }
  };

  // Manejar Logout
  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('username');
    setUsernameInput('');
    setPasswordInput('');
    setAuthError(null);
    resetWizard();
    resetUserWizard();
  };

  // Alternar Tema
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // --- WIZARD: Acciones de Carga ---
  const resetWizard = () => {
    setWizardStep('1');
    setSelectedFile(null);
    setFileType(null);
    setDelimiter(',');
    setHasHeader(true);
    setRawTextContent('');
    setSheetNames([]);
    setSelectedSheet('');
    setExcelWorkbook(null);
    setPreviewRows([]);
    setAllParsedRows([]);
    setSelectedEntidadId('');
    setSelectedConvenioId('');
    setSelectedRegimenId('');
    setStep1Error(null);
    setUploadError(null);
    setUploadSuccessId(null);
    setLoadedRows([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validación de campos obligatorios en el Paso 1
    const faltantes: string[] = [];
    if (!selectedEntidadId) faltantes.push('Entidad');
    if (!selectedConvenioId) faltantes.push('Convenio');
    if (!selectedRegimenId) faltantes.push('Régimen de Aseguramiento');

    if (faltantes.length > 0) {
      setStep1Error(`Debe seleccionar todos los campos obligatorios antes de avanzar: ${faltantes.join(', ')}.`);
      e.target.value = '';
      return;
    }

    setStep1Error(null);
    const file = files[0];
    setSelectedFile(file);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'xlsx' || ext === 'xls') {
      setFileType('excel');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setExcelWorkbook(workbook);
        setSheetNames(workbook.SheetNames);
        if (workbook.SheetNames.length > 0) {
          setSelectedSheet(workbook.SheetNames[0]);
        }
        setWizardStep('2_excel');
      };
      reader.readAsArrayBuffer(file);
    } else {
      setFileType('text');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setRawTextContent(text);
        setWizardStep('2_text');
      };
      reader.readAsText(file);
    }
  };

  const processTextFile = () => {
    if (!rawTextContent) return;
    const lines = rawTextContent.split(/\r?\n/).filter(line => line.trim() !== '');

    const rows: ParsedRow[] = lines.map((line, index) => {
      const cols = line.split(delimiter);
      return buildParsedRow(line, cols, index + 1);
    });

    setAllParsedRows(rows);
    setPreviewRows(rows.slice(0, 5));
    setWizardStep('3');
  };

  const processExcelFile = () => {
    if (!excelWorkbook || !selectedSheet) return;
    const worksheet = excelWorkbook.Sheets[selectedSheet];
    const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

    const rows: ParsedRow[] = [];
    jsonData.forEach((rowArray, index) => {
      if (!rowArray || rowArray.length === 0) return;
      const rowStr = rowArray.join(',');
      rows.push(buildParsedRow(rowStr, rowArray, index + 1));
    });

    setAllParsedRows(rows);
    setPreviewRows(rows.slice(0, 5));
    setWizardStep('3');
  };

  const handleUploadToOracle = async () => {
    if (!selectedFile || allParsedRows.length === 0 || !user) return;

    if (!selectedEntidadId || !selectedConvenioId || !selectedRegimenId) {
      setUploadError('Por favor, selecciona la Entidad, el Convenio y el Régimen de Aseguramiento antes de procesar la carga.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/cargue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_archivo: selectedFile.name,
          tiene_encabezado: hasHeader ? 'S' : 'N',
          usuario: user,
          id_entidad: Number(selectedEntidadId),
          id_convenio: Number(selectedConvenioId),
          id_regimen_aseguramiento: Number(selectedRegimenId),
          rows: allParsedRows,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newCargueId = String(data.id_temp_cargue);
        setUploadSuccessId(data.id_temp_cargue);
        setWizardStep('4');
        fetchLoadedDetails(data.id_temp_cargue);
        // Refrescar inmediatamente la lista de cargues y pre-seleccionar el nuevo cargue para la pestaña Historial
        fetchCargues(newCargueId);
      } else {
        setUploadError(data.error || 'Error al guardar los datos en la base de datos Oracle.');
      }
    } catch (err: any) {
      console.error('Error al realizar el cargue:', err);
      setUploadError('Error de red al conectar con el servidor.');
    } finally {
      setUploading(false);
    }
  };

  const fetchLoadedDetails = async (idCargue: number) => {
    setLoadingDetails(true);
    try {
      const response = await fetch('/api/cargue-detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_temp_cargue: idCargue }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setLoadedRows(data.rows || []);
      }
    } catch (err) {
      console.error('Error al consultar detalle cargado:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // --- WIZARD: Crear Usuarios ---
  const resetUserWizard = () => {
    setUserWizardStep('1');
    setSelectedCargueId('');
    setCargueDetailRows([]);
    setUserMappings([
      { campo_destino: 'nombres', label: 'Nombres', tipo: 'VARCHAR2', columna_origen: 'columna_1', required: true },
      { campo_destino: 'apellidos', label: 'Apellidos', tipo: 'VARCHAR2', columna_origen: 'columna_2', required: true },
      { campo_destino: 'usuario', label: 'Usuario (Username)', tipo: 'VARCHAR2', columna_origen: 'columna_3' },
      { campo_destino: 'clave', label: 'Clave / Contraseña', tipo: 'VARCHAR2', columna_origen: 'columna_4' },
      { campo_destino: 'identificacion', label: 'Número Identificación', tipo: 'VARCHAR2', columna_origen: 'columna_5' }
    ]);
    setSelectedFieldToAdd('');
    setUserCreationError(null);
    setCreationSummary(null);
    setCargueResultDetails([]);
    fetchCargues();
  };

  const handleSelectCargue = async () => {
    if (!selectedCargueId) return;
    setLoadingCargueDetails(true);
    setUserCreationError(null);

    try {
      const response = await fetch('/api/cargue-detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_temp_cargue: Number(selectedCargueId) }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCargueDetailRows(data.rows || []);
        
        // Auto-mapeo inicial sugerido
        const firstRow = data.rows?.[0];
        if (firstRow) {
          const currentCargue = carguesList.find(c => String(c.id) === String(selectedCargueId));
          const hasFileHeader = currentCargue?.tiene_encabezado === 'S';

          if (hasFileHeader) {
            setUserMappings(prev => suggestInitialMappings(firstRow, prev));
          }
        }

        // Preseleccionar el primer campo disponible para agregar en la lista desplegable
        const available = TKR_USUARIOS_COLUMNS.filter(col => !userMappings.some(m => m.campo_destino === col.campo_destino));
        if (available.length > 0) {
          setSelectedFieldToAdd(available[0].campo_destino);
        }

        setUserWizardStep('2');
      } else {
        setUserCreationError(data.error || 'Error al obtener registros del cargue seleccionado.');
      }
    } catch (err) {
      console.error('Error al cargar detalles del cargue:', err);
      setUserCreationError('Error al conectar con el servidor.');
    } finally {
      setLoadingCargueDetails(false);
    }
  };

  // Agregar nuevo campo dinámico de tkr_usuarios para mapeo
  const handleAddMappingField = () => {
    if (!selectedFieldToAdd) return;
    const colDef = TKR_USUARIOS_COLUMNS.find(c => c.campo_destino === selectedFieldToAdd);
    if (!colDef) return;

    const newMapping: FieldMapping = {
      campo_destino: colDef.campo_destino,
      label: colDef.label,
      tipo: colDef.tipo,
      columna_origen: '', // empieza sin mapear
      required: colDef.required
    };

    if (colDef.tipo === 'DATE') {
      newMapping.formato_fecha = 'DD/MM/YYYY'; // formato por defecto
    }

    setUserMappings(prev => [...prev, newMapping]);
    
    // Actualizar la lista desplegable de campos disponibles
    const updatedMappings = [...userMappings, newMapping];
    const available = TKR_USUARIOS_COLUMNS.filter(col => !updatedMappings.some(m => m.campo_destino === col.campo_destino));
    if (available.length > 0) {
      setSelectedFieldToAdd(available[0].campo_destino);
    } else {
      setSelectedFieldToAdd('');
    }
  };

  // Remover campo del mapeo dinámico
  const handleRemoveMappingField = (campoDestino: string) => {
    setUserMappings(prev => prev.filter(m => m.campo_destino !== campoDestino));
    
    // Volver a calcular los campos disponibles para agregar
    setTimeout(() => {
      const updated = userMappings.filter(m => m.campo_destino !== campoDestino);
      const available = TKR_USUARIOS_COLUMNS.filter(col => !updated.some(m => m.campo_destino === col.campo_destino));
      if (available.length > 0) {
        setSelectedFieldToAdd(available[0].campo_destino);
      }
    }, 0);
  };

  // Manejar cambio en un mapeo individual
  const handleMappingChange = (campoDestino: string, key: keyof FieldMapping, value: any) => {
    setUserMappings(prev => prev.map(m => {
      if (m.campo_destino === campoDestino) {
        return { ...m, [key]: value };
      }
      return m;
    }));
  };

  const handleConfirmMapping = () => {
    // Validar que los campos obligatorios de tkr_usuarios estén mapeados a alguna columna o tengan concatenación
    const missingRequired = userMappings.filter(m => m.required && !m.columna_origen && !(m.concatenacion && m.concatenacion.columnas.length > 0));
    if (missingRequired.length > 0) {
      setUserCreationError(`Por favor, selecciona una columna de origen para los campos obligatorios: ${missingRequired.map(m => m.label).join(', ')}.`);
      return;
    }

    // Filtrar los mapeos activos (aquellos que tienen asignada una columna de origen o concatenación)
    const activeMappings = userMappings.filter(m => m.columna_origen !== '' || (m.concatenacion && m.concatenacion.columnas.length > 0));
    if (activeMappings.length === 0) {
      setUserCreationError('Debe mapear al menos una columna antes de proceder.');
      return;
    }

    setUserCreationError(null);
    setUserWizardStep('3'); // Avanzar a homologaciones
  };

  const handleConfirmHomologations = () => {
    setUserCreationError(null);
    setUserWizardStep('4'); // Avanzar a validación previa
  };

  const fetchCargueResultDetails = async () => {
    setLoadingResultDetails(true);
    try {
      const response = await fetch('/api/cargue-detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_temp_cargue: Number(selectedCargueId) }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setCargueResultDetails(data.rows || []);
      }
    } catch (err) {
      console.error('Error al obtener los detalles del resultado de creación:', err);
    } finally {
      setLoadingResultDetails(false);
    }
  };

  const exportToCSV = () => {
    if (cargueResultDetails.length === 0) return;
    
    const activeMaps = getActiveMappings();
    
    const headers = [
      'Línea', 
      'Fila', 
      ...activeMaps.map(m => m.label),
      'ID Usuario Generado', 
      'Estado', 
      'Detalle de Error'
    ];
    
    const csvRows = cargueResultDetails.map(r => {
      const isSuccess = !!r.id_usuario;
      const dynamicVals = activeMaps.map(m => getHomologatedValue(m, r) || '');
      return [
        r.linea || '',
        r.numero_linea,
        ...dynamicVals,
        r.id_usuario || 'N/A',
        isSuccess ? 'EXITOSO' : 'FALLIDO',
        r.error || ''
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `resultado_cargue_${selectedCargueId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    if (cargueResultDetails.length === 0) return;
    
    const activeMaps = getActiveMappings();
    
    const dataToExport = cargueResultDetails.map(r => {
      const rowObj: Record<string, any> = {
        'Línea': r.linea || '',
        'Fila': r.numero_linea
      };
      
      activeMaps.forEach(m => {
        rowObj[m.label] = getHomologatedValue(m, r) || '';
      });
      
      rowObj['ID Usuario Generado'] = r.id_usuario || 'N/A';
      rowObj['Estado'] = r.id_usuario ? 'EXITOSO' : 'FALLIDO';
      rowObj['Detalle de Error'] = r.error || '';
      
      return rowObj;
    });
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
    
    const maxLens = Object.keys(dataToExport[0] || {}).map(key => 
      Math.max(key.length, ...dataToExport.map(row => String((row as any)[key] || '').length))
    );
    worksheet['!cols'] = maxLens.map(len => ({ wch: len + 3 }));
    
    XLSX.writeFile(workbook, `resultado_cargue_${selectedCargueId}.xlsx`);
  };

  const handleCreateUsersInDB = async () => {
    setCreatingUsers(true);
    setUserCreationError(null);

    // Mandar mapeos activos (aquellos con columna_origen, constante o aquellos con concatenación activa)
    const activeMappings = userMappings.filter(m => m.columna_origen !== '' || m.homologacion?.tipo === 'constante' || (m.concatenacion && m.concatenacion.columnas.length > 0));

    try {
      const response = await fetch('/api/crear-usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_temp_cargue: Number(selectedCargueId),
          modo_carga: modoCarga,
          mappings: activeMappings.map(m => ({
            campo_destino: m.campo_destino,
            columna_origen: m.columna_origen,
            tipo: m.tipo,
            formato_fecha: m.tipo === 'DATE' ? m.formato_fecha || 'DD/MM/YYYY' : null,
            concatenacion: m.concatenacion ? {
              columnas: m.concatenacion.columnas || [],
              separador: m.concatenacion.separador || ' '
            } : null,
            homologacion: m.homologacion ? {
              tipo: m.homologacion.tipo,
              valor_constante: m.homologacion.valor_constante || null,
              tabla_destino: m.homologacion.tabla_destino || null,
              criterio: m.homologacion.criterio || null,
              valores: m.homologacion.valores || null
            } : null
          }))
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCreationSummary({
          rows_processed: data.rows_processed,
          exitosos: data.exitosos,
          errores: data.errores,
          any_error: data.any_error
        });
        await fetchCargueResultDetails();
        setUserWizardStep('5'); // Paso 5 es Éxito y detalle
      } else {
        setUserCreationError(data.error || 'Error al crear usuarios en la base de datos.');
      }
    } catch (err) {
      console.error('Error al insertar usuarios:', err);
      setUserCreationError('Error de conexión al procesar los usuarios.');
    } finally {
      setCreatingUsers(false);
    }
  };



  // Obtener nombres de columnas dinámicas del archivo con valores de prueba (por ejemplo, primer registro)
  const getColumnLabel = (colKey: string) => {
    if (!colKey) return 'Ninguno';
    const index = Number(colKey.replace('columna_', ''));
    const firstRow = cargueDetailRows[0];
    const previewVal = firstRow ? String(firstRow[`c${index}`] || '') : '';
    const fileHeader = carguesList.find(c => String(c.id) === String(selectedCargueId))?.tiene_encabezado === 'S';
    
    return `Columna ${index} ${previewVal ? `(${previewVal.substring(0, 15)}${previewVal.length > 15 ? '...' : ''})` : ''} ${fileHeader && firstRow ? '[Cabecera]' : ''}`;
  };

  // Filtrar filas de visualización (omitir cabecera física si aplica en la vista de confirmación del paso 3)
  const getMappedPreviewRows = () => {
    const currentCargue = carguesList.find(c => String(c.id) === String(selectedCargueId));
    const skipHeader = currentCargue?.tiene_encabezado === 'S';
    const dataRows = skipHeader ? cargueDetailRows.slice(1) : cargueDetailRows;
    return dataRows; // Mostrar todos los registros
  };

  // Obtener los mapeos activos
  const getActiveMappings = () => {
    return userMappings.filter(m => m.columna_origen !== '' || m.homologacion?.tipo === 'constante' || (m.concatenacion && m.concatenacion.columnas.length > 0));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans relative overflow-hidden flex flex-col">
      
      {/* Fondo con Degradados Sutiles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-[150px] pointer-events-none" />

      {/* Cabecera Flotante */}
      <header className="w-full max-w-7xl mx-auto px-6 py-4 flex justify-between items-center z-20 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚙️</span>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent">
            TEKER AUTOMATIZACIÓN
          </span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20">
              👤 {user}
            </span>
          )}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 17.657l.707.707M6.343 6.343l.707-.707M14.25 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* --- VISTA: LOGIN --- */}
      {!user ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Iniciar Sesión
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Ingresa tus credenciales autorizadas de Oracle Database (Teker Dev)
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Usuario
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Ej: TEKER_DEV"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white transition-all duration-200 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-slate-900 dark:text-white transition-all duration-200 placeholder-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all duration-200 shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Validando en Oracle...</span>
                  </>
                ) : (
                  <span>Ingresar al Aplicativo</span>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        // --- VISTA: MENÚ PRINCIPAL ---
        <div className="flex-1 flex max-w-7xl w-full mx-auto p-6 gap-6 z-10 overflow-hidden">
          
          {/* Navegación Lateral (Sidebar) */}
          <aside className="w-64 shrink-0 flex flex-col justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm">
            <div className="space-y-6">
              <div className="px-2 py-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Menú de Opciones
                </span>
              </div>
              
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setCurrentTab('cargue');
                    resetWizard();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    currentTab === 'cargue'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>📤</span>
                  Cargue
                </button>

                <button
                  onClick={() => {
                    setCurrentTab('crear_usuarios');
                    resetUserWizard();
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    currentTab === 'crear_usuarios'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>👥</span>
                  Crear Usuarios
                </button>

                {/* Pestaña Autoprogramaciones (Deshabilitada por ahora) */}
                <button
                  disabled
                  title="Opción deshabilitada por el momento"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 dark:text-slate-600 bg-slate-100/50 dark:bg-slate-800/30 cursor-not-allowed opacity-60"
                >
                  <span>🗓️</span>
                  <span>Autoprogramaciones</span>
                </button>

                {/* Pestaña Autonotificaciones */}
                <button
                  onClick={() => {
                    setCurrentTab('autonotificaciones');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    currentTab === 'autonotificaciones'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>🔔</span>
                  Autonotificaciones
                </button>

                {/* Pestaña Equipo Médico */}
                <button
                  onClick={() => {
                    setCurrentTab('equipo_medico');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    currentTab === 'equipo_medico'
                      ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-l-4 border-indigo-600'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <span>👨‍⚕️</span>
                  Equipo Médico
                </button>
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
            >
              <span>🚪</span>
              Cerrar Sesión
            </button>
          </aside>

          {/* Panel Principal */}
          <main className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-sm flex flex-col justify-between overflow-y-auto">
            {/* Contenido Dinámico por Pestaña */}
            <div className="space-y-6">
              
              {/* --- CONTENIDO: AUTOPROGRAMACIONES --- */}
              {currentTab === 'autoprogramaciones' && (
                <Autoprogramaciones />
              )}
              
              {/* --- CONTENIDO: AUTONOTIFICACIONES --- */}
              {currentTab === 'autonotificaciones' && (
                <Autonotificaciones />
              )}
              
              {/* --- CONTENIDO: EQUIPO MÉRICO --- */}
              {currentTab === 'equipo_medico' && (
                <EquipoMedico />
              )}
              


              {/* --- CONTENIDO: CARGUE (ASISTENTE / WIZARD & HISTORIAL) --- */}
              {currentTab === 'cargue' && (
                <div className="space-y-6">
                  {/* Encabezado y Selector de Sub-pestañas */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {cargueSubTab === 'nuevo' ? 'Asistente de Cargue de Archivos' : 'Historial y Administración de Cargues'}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5 leading-relaxed">
                        {cargueSubTab === 'nuevo'
                          ? 'Carga y estructura datos masivos directamente en las tablas de Oracle Database.'
                          : 'Consulta cargues almacenados previamente, examina sus datos o elimínalos de la base de datos.'}
                      </p>
                    </div>

                    <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setCargueSubTab('nuevo')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cargueSubTab === 'nuevo'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        ➕ Nuevo Cargue
                      </button>
                      <button
                        onClick={() => {
                          setCargueSubTab('historial');
                          fetchCargues();
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cargueSubTab === 'historial'
                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        🗂️ Historial / Borrar Cargue
                      </button>
                    </div>
                  </div>

                  {cargueSubTab === 'nuevo' && (
                    <div className="space-y-6">
                      {/* Pasos del Wizard */}
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${wizardStep === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>1</span>
                        <span className="text-xs text-slate-400">Seleccionar Archivo</span>
                        <span className="text-slate-300">→</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${wizardStep.startsWith('2') ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>2</span>
                        <span className="text-xs text-slate-400">Configuración</span>
                        <span className="text-slate-300">→</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${wizardStep === '3' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>3</span>
                        <span className="text-xs text-slate-400">Verificación</span>
                        <span className="text-slate-300">→</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${wizardStep === '4' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>4</span>
                        <span className="text-xs text-slate-400">Resultado</span>
                      </div>

                  {/* PASO 1: Seleccionar Archivo */}
                  {wizardStep === '1' && (
                    <div className="space-y-6">
                      {step1Error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center justify-between animate-in fade-in">
                          <div className="flex items-center gap-2">
                            <span className="text-base">⚠️</span>
                            <span className="font-semibold">{step1Error}</span>
                          </div>
                          <button onClick={() => setStep1Error(null)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">✕</button>
                        </div>
                      )}

                      {/* Selección de Entidad y Convenio */}
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              Información de Entidad y Convenio
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Selecciona la entidad y el convenio correspondientes a los datos que vas a cargar.
                            </p>
                          </div>
                          {loadingCatalogosApp && (
                            <span className="text-xs text-indigo-500 font-medium animate-pulse">Cargando catálogos...</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Entidad <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedEntidadId}
                              onChange={(e) => {
                                const entId = e.target.value;
                                setSelectedEntidadId(entId);
                                setStep1Error(null);
                                const ent = entidadesConConvenio.find((item) => String(item.id) === String(entId));
                                const firstConvenio = ent?.entidades_hijas?.[0];
                                const convVal = firstConvenio ? String(firstConvenio.id_convenio ?? firstConvenio.id) : '';
                                setSelectedConvenioId(convVal);
                              }}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              <option value="">-- Seleccionar Entidad --</option>
                              {entidadesConConvenio.map((ent) => (
                                <option key={ent.id} value={ent.id}>
                                  {ent.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Convenio <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedConvenioId}
                              onChange={(e) => {
                                setSelectedConvenioId(e.target.value);
                                setStep1Error(null);
                              }}
                              disabled={!selectedEntidadId}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <option value="">-- Seleccionar Convenio --</option>
                              {conveniosDisponibles.map((conv) => {
                                const convIdVal = String(conv.id_convenio ?? conv.id);
                                return (
                                  <option key={conv.id + '_' + convIdVal} value={convIdVal}>
                                    {conv.nombre_entidad}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Régimen de Aseguramiento <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={selectedRegimenId}
                              onChange={(e) => {
                                setSelectedRegimenId(e.target.value);
                                setStep1Error(null);
                              }}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              <option value="">-- Seleccionar Régimen --</option>
                              {regimenesCatalog.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.descripcion}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Opción de Encabezado */}
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasHeader}
                              onChange={(e) => setHasHeader(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                            />
                            <div className="text-xs">
                              <span className="font-bold block text-slate-700 dark:text-slate-300">¿El archivo tiene Encabezado?</span>
                              <span className="text-slate-400">La primera línea contiene el nombre de cada columna (se almacenará en tiene_encabezado).</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Dropzone para cargar archivo */}
                      <div className={`border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-500 rounded-2xl p-10 text-center transition-all relative group flex flex-col items-center justify-center gap-4 ${(!selectedEntidadId || !selectedConvenioId || !selectedRegimenId) ? 'opacity-60' : ''}`}>
                        <span className="text-4xl">📁</span>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Selecciona tu archivo de datos</h3>
                          <p className="text-xs text-slate-400 mt-1">Soporta formatos delimitados (.csv, .txt) o plantillas Excel (.xlsx, .xls)</p>
                        </div>

                        {(!selectedEntidadId || !selectedConvenioId || !selectedRegimenId) ? (
                          <p className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                            ⚠️ Selecciona la Entidad, el Convenio y el Régimen de Aseguramiento para habilitar la carga.
                          </p>
                        ) : null}

                        <label className={`px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm ${(!selectedEntidadId || !selectedConvenioId || !selectedRegimenId) ? 'pointer-events-none opacity-50' : ''}`}>
                          Examinar Archivos
                          <input
                            type="file"
                            accept=".csv,.txt,.xlsx,.xls"
                            onChange={handleFileChange}
                            disabled={!selectedEntidadId || !selectedConvenioId || !selectedRegimenId}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: Configuración (Archivo Plano) */}
                  {wizardStep === '2_text' && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white">Ajustes del Archivo de Texto</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Define los separadores para una división correcta de las columnas.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Delimitador / Separador
                          </label>
                          <select
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                          >
                            <option value=",">Coma ( , )</option>
                            <option value=";">Punto y coma ( ; )</option>
                            <option value="&#9;">Tabulación ( Tab )</option>
                            <option value="|">Barra vertical ( | )</option>
                          </select>
                        </div>

                        <div className="flex items-center pt-6">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasHeader}
                              onChange={(e) => setHasHeader(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <div className="text-xs">
                              <span className="font-bold block text-slate-700 dark:text-slate-300">¿Tiene Encabezado?</span>
                              <span className="text-slate-400">La primera línea contiene el nombre de cada columna.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={resetWizard} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer">
                          Atrás
                        </button>
                        <button onClick={processTextFile} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                          Siguiente: Vista Previa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 2: Configuración (Excel) */}
                  {wizardStep === '2_excel' && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white">Ajustes de la Hoja de Cálculo</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Selecciona de qué hoja deseas extraer la información.</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Nombre de la Hoja
                          </label>
                          <select
                            value={selectedSheet}
                            onChange={(e) => setSelectedSheet(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                          >
                            {sheetNames.map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center pt-6">
                          <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={hasHeader}
                              onChange={(e) => setHasHeader(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                            />
                            <div className="text-xs">
                              <span className="font-bold block text-slate-700 dark:text-slate-300">¿Tiene Encabezado?</span>
                              <span className="text-slate-400">La primera fila contiene el nombre de cada columna.</span>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={resetWizard} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer">
                          Atrás
                        </button>
                        <button onClick={processExcelFile} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                          Siguiente: Vista Previa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 3: Vista Previa y Carga */}
                  {wizardStep === '3' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div>
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">Vista Previa de los Datos</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Mostrando los primeros 5 registros de {allParsedRows.length} encontrados.</p>
                        </div>
                        {selectedFile && (
                          <span className="text-xs px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-mono">
                            📄 {selectedFile.name}
                          </span>
                        )}
                      </div>

                      {uploadError && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                          {uploadError}
                        </div>
                      )}

                      {/* Tabla de Vista Previa */}
                      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                        <table className="w-full border-collapse text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                              <th className="px-4 py-3">Línea</th>
                              <th className="px-4 py-3">Registro Original</th>
                              <th className="px-4 py-3">Columna 1</th>
                              <th className="px-4 py-3">Columna 2</th>
                              <th className="px-4 py-3">Columna 3</th>
                              <th className="px-4 py-3">Columna 4</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {previewRows.map((row) => (
                              <tr key={row.numero_linea} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                <td className="px-4 py-3 text-slate-400">{row.numero_linea}</td>
                                <td className="px-4 py-3 max-w-[200px] truncate">{row.linea}</td>
                                <td className="px-4 py-3 truncate">{row.c1}</td>
                                <td className="px-4 py-3 truncate">{row.c2}</td>
                                <td className="px-4 py-3 truncate">{row.c3}</td>
                                <td className="px-4 py-3 truncate">{row.c4}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => setWizardStep(fileType === 'excel' ? '2_excel' : '2_text')}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={handleUploadToOracle}
                          disabled={uploading}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center gap-2"
                        >
                          {uploading ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Cargando a Oracle...</span>
                            </>
                          ) : (
                            <span>Procesar y Cargar a Oracle</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PASO 4: Resultado del Cargue y Grilla */}
                  {wizardStep === '4' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
                        <div>
                          <h3 className="text-md font-bold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
                            <span>✅</span> ¡Cargue Finalizado Exitosamente!
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Los datos del archivo {selectedFile?.name} han sido guardados en la tabla <code className="font-mono text-[10px] bg-slate-200/50 dark:bg-slate-800 px-1 py-0.5 rounded">tkr_temp_detalle_cargue</code>.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-slate-900 dark:bg-slate-950 text-slate-300 border border-slate-850 px-2.5 py-1 rounded font-mono">
                            ID CARGUE: {uploadSuccessId}
                          </span>
                          <button onClick={resetWizard} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer transition-all active:scale-95">
                            Nueva Carga
                          </button>
                        </div>
                      </div>

                      {/* Grilla de Resultados */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                          Datos Almacenados (Lectura de Oracle)
                        </h4>

                        {loadingDetails ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-2">
                            <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-xs text-slate-500">Consultando base de datos...</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[350px]">
                            <table className="w-full border-collapse text-left text-xs table-fixed">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0">
                                  <th className="px-4 py-3 w-16">Línea</th>
                                  <th className="px-4 py-3 w-64">Contenido Original (Fila Completa)</th>
                                  <th className="px-4 py-3 w-32">Columna 1</th>
                                  <th className="px-4 py-3 w-32">Columna 2</th>
                                  <th className="px-4 py-3 w-32">Columna 3</th>
                                  <th className="px-4 py-3 w-32">Columna 4</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {loadedRows.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                                      No se obtuvieron registros de la base de datos.
                                    </td>
                                  </tr>
                                ) : (
                                  loadedRows.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                      <td className="px-4 py-3 text-slate-400">{row.numero_linea}</td>
                                      <td className="px-4 py-3 truncate" title={row.linea}>{row.linea}</td>
                                      <td className="px-4 py-3 truncate" title={row.c1}>{row.c1}</td>
                                      <td className="px-4 py-3 truncate" title={row.c2}>{row.c2}</td>
                                      <td className="px-4 py-3 truncate" title={row.c3}>{row.c3}</td>
                                      <td className="px-4 py-3 truncate" title={row.c4}>{row.c4}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

                  {/* VISTA: HISTORIAL Y ELIMINACIÓN DE CARGUES */}
                  {cargueSubTab === 'historial' && (
                    <div className="space-y-6">
                      {deleteSuccessMsg && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-semibold">✅ {deleteSuccessMsg}</span>
                          <button onClick={() => setDeleteSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700 font-bold cursor-pointer">✕</button>
                        </div>
                      )}

                      {deleteErrorMsg && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center justify-between">
                          <span className="font-semibold">⚠️ {deleteErrorMsg}</span>
                          <button onClick={() => setDeleteErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">✕</button>
                        </div>
                      )}

                      {/* Selector de Cargue e información general */}
                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-1 w-full sm:w-auto">
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Seleccionar Cargue Realizado
                            </label>
                            <select
                              value={historialCargueId}
                              onChange={(e) => handleSelectHistorialCargue(e.target.value)}
                              className="w-full px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              <option value="">-- Selecciona un cargue --</option>
                              {carguesList.map((cargue) => (
                                <option key={cargue.id} value={cargue.id}>
                                  Cargue #{cargue.id} - {cargue.nombre_archivo} ({cargue.fecha_cargue || 'Fecha N/A'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {historialCargueId && (
                            <div className="pt-2 sm:pt-6">
                              <button
                                onClick={() => setShowDeleteConfirmModal(true)}
                                className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shadow-sm flex items-center gap-2"
                              >
                                <span>🗑️</span>
                                <span>Eliminar Cargue #{historialCargueId}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vista de datos del cargue e Información Detallada */}
                      {historialCargueId && (
                        <div className="space-y-6">
                          {/* Panel de Metadatos del Cargue */}
                          {(() => {
                            const selectedHistorialCargue = carguesList.find(c => String(c.id) === String(historialCargueId));
                            if (!selectedHistorialCargue) return null;
                            return (
                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 animate-in fade-in">
                                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-xs">
                                      ID #{selectedHistorialCargue.id}
                                    </span>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {selectedHistorialCargue.nombre_archivo}
                                      </h4>
                                      <p className="text-[11px] text-slate-400">
                                        Información detallada y metadatos registrados en Oracle DB
                                      </p>
                                    </div>
                                  </div>
                                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    Estado: {selectedHistorialCargue.estado === 'C' ? 'Cargado' : selectedHistorialCargue.estado === 'P' ? 'Procesado' : selectedHistorialCargue.estado}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">🏥 Entidad</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={getCargueEntidadLabel(selectedHistorialCargue)}>
                                      {getCargueEntidadLabel(selectedHistorialCargue)}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">📄 Convenio</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={getCargueConvenioLabel(selectedHistorialCargue)}>
                                      {getCargueConvenioLabel(selectedHistorialCargue)}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">🛡️ Régimen</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={getCargueRegimenLabel(selectedHistorialCargue)}>
                                      {getCargueRegimenLabel(selectedHistorialCargue)}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">👤 Usuario de Carga</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                                      {selectedHistorialCargue.usuario || user || 'N/A'}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">📅 Fecha de Cargue</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {selectedHistorialCargue.fecha_cargue || 'N/A'}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">📌 Tiene Encabezado</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {selectedHistorialCargue.tiene_encabezado === 'S' ? 'Sí (1ra línea es nombre)' : 'No'}
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">📊 Registros en BD</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                      {historialRows.length} registros
                                    </span>
                                  </div>

                                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">📂 Nombre Archivo</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block" title={selectedHistorialCargue.nombre_archivo}>
                                      {selectedHistorialCargue.nombre_archivo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Tabla de registros almacenados */}
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Registros Almacenados en la Tabla Temporal ({historialRows.length} registros)
                              </h3>
                              {loadingHistorialDetails && (
                                <span className="text-xs text-indigo-500 font-medium animate-pulse">Cargando registros...</span>
                              )}
                            </div>

                            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[450px]">
                              <table className="w-full border-collapse text-left text-xs">
                                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold z-10">
                                  <tr>
                                    <th className="px-4 py-3">Línea</th>
                                    <th className="px-4 py-3">Registro Original</th>
                                    <th className="px-4 py-3">Columna 1</th>
                                    <th className="px-4 py-3">Columna 2</th>
                                    <th className="px-4 py-3">Columna 3</th>
                                    <th className="px-4 py-3">Columna 4</th>
                                    <th className="px-4 py-3">Columna 5</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                  {historialRows.length === 0 ? (
                                    <tr>
                                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 font-sans">
                                        No hay datos disponibles para mostrar.
                                      </td>
                                    </tr>
                                  ) : (
                                    historialRows.map((row, idx) => (
                                      <tr key={row.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="px-4 py-3 text-slate-400">{row.numero_linea || idx + 1}</td>
                                        <td className="px-4 py-3 max-w-[200px] truncate">{row.linea}</td>
                                        <td className="px-4 py-3 truncate">{row.c1}</td>
                                        <td className="px-4 py-3 truncate">{row.c2}</td>
                                        <td className="px-4 py-3 truncate">{row.c3}</td>
                                        <td className="px-4 py-3 truncate">{row.c4}</td>
                                        <td className="px-4 py-3 truncate">{row.c5}</td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* --- CONTENIDO: CREAR USUARIOS (ASISTENTE / WIZARD) --- */}
              {currentTab === 'crear_usuarios' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      Asistente para Creación de Usuarios
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                      Crea cuentas de usuario en la tabla <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">tkr_usuarios</code> mapeando columnas de una carga previa y realizando conversiones de tipos de datos.
                    </p>
                  </div>

                  {/* Pasos del Wizard */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-xl mb-4 overflow-x-auto">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${userWizardStep === '1' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>1</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">Seleccionar Cargue</span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${userWizardStep === '2' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>2</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">Equivalencias</span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${userWizardStep === '3' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>3</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">Homologaciones</span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${userWizardStep === '4' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>4</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">Validar y Confirmar</span>
                    <span className="text-slate-300">→</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${userWizardStep === '5' ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'}`}>5</span>
                    <span className="text-xs text-slate-400 whitespace-nowrap">Resultado</span>
                  </div>

                  {userCreationError && (
                    <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-xs">
                      {userCreationError}
                    </div>
                  )}

                  {/* USER STEP 1: Seleccionar Cargue */}
                  {userWizardStep === '1' && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white">Selecciona una Carga Temporal</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Elige el archivo importado previamente cuyos datos estructurados servirán para crear los usuarios.</p>
                      </div>

                      {loadingCargues ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-2">
                          <svg className="animate-spin h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="text-xs text-slate-500">Cargando lista de archivos...</span>
                        </div>
                      ) : carguesList.filter(c => c.estado !== 'P').length === 0 ? (
                        <div className="py-8 text-center italic text-slate-500 text-xs">
                          No se encontraron archivos cargados pendientes de procesamiento (estado diferente a 'P'). Ve a la pestaña "Cargue" primero para importar un nuevo archivo.
                        </div>
                      ) : (
                        <div className="max-w-md space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                              Archivos Disponibles
                            </label>
                            <select
                              value={selectedCargueId}
                              onChange={(e) => setSelectedCargueId(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:border-indigo-500 text-slate-900 dark:text-white"
                            >
                              <option value="">-- Selecciona un archivo --</option>
                              {carguesList.filter(c => c.estado !== 'P').map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nombre_archivo} (ID: {c.id} - {c.fecha_cargue})
                                </option>
                              ))}
                            </select>
                          </div>

                          <button
                            onClick={handleSelectCargue}
                            disabled={loadingCargueDetails}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center gap-2"
                          >
                            {loadingCargueDetails && (
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            <span>Siguiente: Equivalencias</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* USER STEP 2: Definir Equivalencias (Mapeo) */}
                  {userWizardStep === '2' && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <h3 className="text-md font-bold text-slate-900 dark:text-white">Establecer Equivalencias de Columnas</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Asigna qué columna de tu cargue corresponde a cada campo de `tkr_usuarios` y define formatos de conversión.</p>
                        </div>

                        {/* Agregar Nuevo Campo de tkr_usuarios */}
                        <div className="flex flex-col gap-2 w-full sm:w-auto bg-white dark:bg-slate-900 p-3 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs shrink-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              placeholder="🔎 Buscar campo..."
                              value={columnSearchTerm}
                              onChange={(e) => setColumnSearchTerm(e.target.value)}
                              className="px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-900 dark:text-white"
                            />
                            <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-[9px] font-bold">
                              <button
                                type="button"
                                onClick={() => setColumnSortBy('original')}
                                className={`px-2 py-1 cursor-pointer transition-all ${columnSortBy === 'original' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400'}`}
                              >
                                Posición
                              </button>
                              <button
                                type="button"
                                onClick={() => setColumnSortBy('alphabetical')}
                                className={`px-2 py-1 cursor-pointer transition-all ${columnSortBy === 'alphabetical' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400'}`}
                              >
                                A-Z
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={selectedFieldToAdd}
                              onChange={(e) => setSelectedFieldToAdd(e.target.value)}
                              className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-900 dark:text-white min-w-[150px]"
                            >
                              <option value="" disabled>-- Selecciona Campo --</option>
                              {filteredAndSortedColumns.map(col => (
                                <option key={col.campo_destino} value={col.campo_destino}>
                                  {col.label} ({col.tipo})
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleAddMappingField}
                              disabled={!selectedFieldToAdd}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer active:scale-95 transition-all shadow-xs whitespace-nowrap"
                            >
                              ➕ Agregar
                            </button>
                          </div>
                        </div>
                      </div>

                      {cargueDetailRows.length === 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs flex items-center gap-2">
                          <span>⚠️</span>
                          <span>Nota: No se detectaron registros de detalle previos para este cargue en la base de datos, pero puedes mapear las columnas por su índice numérico.</span>
                        </div>
                      )}

                      {/* Vista Previa de Datos del Cargue Seleccionado (5 Primeras Filas) */}
                      {cargueDetailRows.length > 0 && (
                        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-2.5">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                            <span>📋</span> Datos crudos cargados (Primeras 5 filas)
                          </h4>
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-[220px]">
                            <table className="w-full border-collapse text-left text-xs table-fixed">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0">
                                  <th className="px-3 py-2 w-16 sticky left-0 bg-slate-50 dark:bg-slate-950 z-10">Fila</th>
                                  {Array.from({ length: 15 }).map((_, idx) => (
                                    <th key={idx} className="px-3 py-2 w-36 truncate">Columna {idx + 1}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {cargueDetailRows.slice(0, 5).map((row) => (
                                  <tr key={row.id || row.numero_linea} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                    <td className="px-3 py-2 text-slate-400 font-bold sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-150 dark:border-slate-800/80">{row.numero_linea}</td>
                                    {Array.from({ length: 15 }).map((_, idx) => {
                                      const val = row[`c${idx + 1}`];
                                      return (
                                        <td key={idx} className="px-3 py-2 truncate" title={val}>
                                          {val !== undefined && val !== '' ? val : <span className="text-slate-400/30 italic">empty</span>}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <span className="text-[10px] text-slate-400 block leading-tight">Puedes deslizar horizontalmente la tabla anterior para ver más columnas de tu archivo de origen.</span>
                        </div>
                      )}

                      {/* Lista de Equivalencias Dinámicas */}
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                        {userMappings.map((mapping) => (
                          <div
                            key={mapping.campo_destino}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 p-4 rounded-xl shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            {/* Columna Destino */}
                            <div className="md:w-1/3 flex items-center gap-2.5">
                              <div className="w-1.5 h-7 rounded bg-indigo-600 shrink-0" />
                              <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                  {mapping.label}
                                  {mapping.required && <span className="text-red-500">*</span>}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 font-mono uppercase">
                                  Campo: {mapping.campo_destino} | 
                                  <span className={`px-1 py-0.2 rounded text-[9px] ${
                                    mapping.tipo === 'DATE' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                    mapping.tipo === 'NUMBER' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                    mapping.tipo === 'CLOB' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                                    'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {mapping.tipo}
                                  </span>
                                </span>
                              </div>
                            </div>

                            {/* Columna Origen (Select / Concatenacion) */}
                            <div className={`flex-1 grid gap-4 items-center ${mapping.tipo === 'DATE' && mapping.columna_origen !== '' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Origen de Datos</label>
                                  <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-indigo-650 dark:text-indigo-400 font-bold hover:underline">
                                    <input
                                      type="checkbox"
                                      checked={!!mapping.concatenacion}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleMappingChange(mapping.campo_destino, 'concatenacion', {
                                            columnas: [mapping.columna_origen || 'columna_1'],
                                            separador: ' '
                                          });
                                          handleMappingChange(mapping.campo_destino, 'columna_origen', '');
                                        } else {
                                          const firstCol = mapping.concatenacion?.columnas[0] || '';
                                          handleMappingChange(mapping.campo_destino, 'concatenacion', undefined);
                                          handleMappingChange(mapping.campo_destino, 'columna_origen', firstCol);
                                        }
                                      }}
                                      className="w-3 h-3 text-indigo-600 focus:ring-indigo-500 rounded"
                                    />
                                    <span>🔗 Concatenar</span>
                                  </label>
                                </div>

                                {mapping.concatenacion ? (
                                  <div className="space-y-2 border border-dashed border-slate-200 dark:border-slate-800 p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
                                    <div className="space-y-1.5">
                                      {mapping.concatenacion.columnas.map((col: string, cIdx: number) => (
                                        <div key={cIdx} className="flex gap-1.5 items-center">
                                          <select
                                            value={col}
                                            onChange={(e) => {
                                              const newCols = [...mapping.concatenacion!.columnas];
                                              newCols[cIdx] = e.target.value;
                                              handleMappingChange(mapping.campo_destino, 'concatenacion', {
                                                ...mapping.concatenacion,
                                                columnas: newCols
                                              });
                                            }}
                                            className="flex-1 px-2.5 py-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                          >
                                            {Array.from({ length: 50 }).map((_, i) => (
                                              <option key={i} value={`columna_${i + 1}`}>
                                                {getColumnLabel(`columna_${i + 1}`)}
                                              </option>
                                            ))}
                                          </select>
                                          {mapping.concatenacion!.columnas.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newCols = mapping.concatenacion!.columnas.filter((_: string, idx: number) => idx !== cIdx);
                                                handleMappingChange(mapping.campo_destino, 'concatenacion', {
                                                  ...mapping.concatenacion,
                                                  columnas: newCols
                                                });
                                              }}
                                              className="p-1 rounded text-red-500 hover:bg-red-500/10 text-xs cursor-pointer font-bold"
                                              title="Eliminar columna de concatenación"
                                            >
                                              ✕
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex justify-between items-center gap-4 pt-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleMappingChange(mapping.campo_destino, 'concatenacion', {
                                            ...mapping.concatenacion,
                                            columnas: [...mapping.concatenacion!.columnas, 'columna_1']
                                          });
                                        }}
                                        className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                                      >
                                        ➕ Agregar Columna
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-slate-400 font-bold">Separador:</span>
                                        <input
                                          type="text"
                                          value={mapping.concatenacion.separador}
                                          onChange={(e) => {
                                            handleMappingChange(mapping.campo_destino, 'concatenacion', {
                                              ...mapping.concatenacion,
                                              separador: e.target.value
                                            });
                                          }}
                                          placeholder="Ej: espacio"
                                          className="w-16 px-1.5 py-0.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-center text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <select
                                    value={mapping.columna_origen}
                                    onChange={(e) => handleMappingChange(mapping.campo_destino, 'columna_origen', e.target.value)}
                                    className="w-full px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                                  >
                                    <option value="">-- No Mapear (Guardar NULL/Defecto) --</option>
                                    {Array.from({ length: 50 }).map((_, i) => (
                                      <option key={i} value={`columna_${i + 1}`}>
                                        {getColumnLabel(`columna_${i + 1}`)}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>

                              {/* Formato de Fecha si es tipo DATE */}
                              {mapping.tipo === 'DATE' && mapping.columna_origen !== '' && (
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Formato de Fecha (Oracle)</label>
                                  <div className="flex items-center gap-1.5">
                                    <select
                                      value={mapping.formato_fecha || 'DD/MM/YYYY'}
                                      onChange={(e) => handleMappingChange(mapping.campo_destino, 'formato_fecha', e.target.value)}
                                      className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                                    >
                                      {COMMON_DATE_FORMATS.map(f => (
                                        <option key={f.value} value={f.value}>{f.label}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={mapping.formato_fecha || 'DD/MM/YYYY'}
                                      onChange={(e) => handleMappingChange(mapping.campo_destino, 'formato_fecha', e.target.value)}
                                      placeholder="Otro formato (Ej: YYYYMMDD)"
                                      title="Ingresa formato personalizado si no está en la lista"
                                      className="w-24 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Botón de Borrar (Solo para campos opcionales) */}
                            <div className="md:w-16 flex justify-end">
                              {!mapping.required && (
                                <button
                                  onClick={() => handleRemoveMappingField(mapping.campo_destino)}
                                  className="p-1.5 rounded-lg border border-red-500/10 hover:border-red-500/20 hover:bg-red-500/10 text-red-500 cursor-pointer active:scale-95 transition-all text-xs"
                                  title="Quitar campo del mapeo"
                                >
                                  🗑️ Quitar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={resetUserWizard} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer">
                          Atrás
                        </button>
                        <button onClick={handleConfirmMapping} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                          Siguiente: Homologaciones
                        </button>
                      </div>
                    </div>
                  )}

                  {/* USER STEP 3: Establecer Homologaciones */}
                  {userWizardStep === '3' && (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white">Establecer Homologaciones y Constantes</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Configura mapeos de datos uno a uno, búsquedas relacionales en tablas foráneas, o valores fijos estáticos.</p>
                      </div>

                      {/* Grilla con 5 filas crudas */}
                      {cargueDetailRows.length > 0 && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs space-y-2">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            📋 Datos Crudos Cargados (Primeras 5 Filas)
                          </h4>
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg max-h-[160px]">
                            <table className="w-full border-collapse text-left text-[11px] table-fixed">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold sticky top-0">
                                  <th className="px-3 py-1.5 w-16 sticky left-0 bg-slate-50 dark:bg-slate-950 z-10">Fila</th>
                                  {Array.from({ length: 15 }).map((_, idx) => (
                                    <th key={idx} className="px-3 py-1.5 w-36 truncate">Columna {idx + 1}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {cargueDetailRows.slice(0, 5).map((row) => (
                                  <tr key={row.id || row.numero_linea} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                    <td className="px-3 py-1.5 text-slate-400 font-bold sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-150 dark:border-slate-800/80">{row.numero_linea}</td>
                                    {Array.from({ length: 15 }).map((_, idx) => {
                                      const val = row[`c${idx + 1}`];
                                      return (
                                        <td key={idx} className="px-3 py-1.5 truncate" title={val}>
                                          {val !== undefined && val !== '' ? val : '-'}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Lista de Campos Mapeados para Homologar */}
                      <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                        {userMappings.map((mapping) => {
                          const isConstant = mapping.homologacion?.tipo === 'constante';
                          if (!mapping.columna_origen && !isConstant && !(mapping.concatenacion && mapping.concatenacion.columnas.length > 0)) return null;

                          const hasHomol = !!mapping.homologacion;
                          const currentType = mapping.homologacion?.tipo || 'directo';
                          const suggestedTable = FK_TABLES_MAP[mapping.campo_destino];

                          return (
                            <div key={mapping.campo_destino} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs transition-all space-y-4">
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-6 rounded bg-purple-600" />
                                  <div>
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{mapping.label}</span>
                                    {isConstant ? (
                                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block font-mono">
                                        Valor Constante / Fijo
                                      </span>
                                    ) : (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                          Mapeado a: {mapping.concatenacion 
                                            ? mapping.concatenacion.columnas.map((c: string) => getColumnLabel(c)).join(' + ') 
                                            : getColumnLabel(mapping.columna_origen)}
                                        </span>
                                        {hasHomol && (
                                          <button
                                            type="button"
                                            onClick={() => openUniqueValuesModal(mapping.columna_origen || mapping.concatenacion?.columnas[0] || '', mapping.label, mapping.campo_destino)}
                                            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold text-[9px] uppercase tracking-wide flex items-center gap-0.5 transition-all cursor-pointer hover:underline"
                                            title="Ver valores únicos en el archivo"
                                          >
                                            📋 Ver únicos
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Checkbox para activar homologación si es de archivo */}
                                {!isConstant && (
                                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={hasHomol}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          handleMappingChange(mapping.campo_destino, 'homologacion', {
                                            tipo: suggestedTable ? 'tabla' : 'directo',
                                            tabla_destino: suggestedTable || '',
                                            criterio: 'nombre',
                                            valores: [],
                                            defecto: ''
                                          });
                                        } else {
                                          handleMappingChange(mapping.campo_destino, 'homologacion', undefined);
                                        }
                                      }}
                                      className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs text-slate-500">¿Homologar?</span>
                                  </label>
                                )}

                                {/* Botón eliminar constante */}
                                {isConstant && !mapping.required && (
                                  <button
                                    onClick={() => handleRemoveMappingField(mapping.campo_destino)}
                                    className="px-2 py-0.5 rounded border border-red-500/20 hover:bg-red-500/10 text-red-500 text-[10px] cursor-pointer"
                                  >
                                    🗑 Eliminar
                                  </button>
                                )}
                              </div>

                              {/* Formulario de Homologación si está activo */}
                              {hasHomol && (
                                <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-lg space-y-4">
                                  {/* Pestañas de Tipo de Homologación */}
                                  <div className="flex gap-2">
                                    {!isConstant && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = mapping.homologacion;
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...current,
                                              tipo: 'directo'
                                            });
                                          }}
                                          className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                            currentType === 'directo'
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                          }`}
                                        >
                                          Mapeo Directo
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const current = mapping.homologacion;
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...current,
                                              tipo: 'tabla',
                                              tabla_destino: current?.tabla_destino || suggestedTable || '',
                                              criterio: current?.criterio || 'nombre'
                                            });
                                          }}
                                          className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                            currentType === 'tabla'
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                          }`}
                                        >
                                          Tabla Foránea (FK)
                                        </button>
                                      </>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = mapping.homologacion;
                                        handleMappingChange(mapping.campo_destino, 'homologacion', {
                                          ...current,
                                          tipo: 'constante',
                                          valor_constante: current?.valor_constante || ''
                                        });
                                      }}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                                        currentType === 'constante'
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      Valor Constante
                                    </button>
                                  </div>

                                  {/* CONFIG: Mapeo Directo */}
                                  {currentType === 'directo' && (
                                    <div className="space-y-3">
                                      <div className="space-y-2">
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Reglas de Equivalencia</label>
                                        {(mapping.homologacion?.valores || []).map((val, vidx) => (
                                          <div key={vidx} className="flex gap-2 items-center">
                                            <input
                                              type="text"
                                              value={val.origen}
                                              onChange={(e) => {
                                                const newVals = [...(mapping.homologacion?.valores || [])];
                                                newVals[vidx].origen = e.target.value;
                                                handleMappingChange(mapping.campo_destino, 'homologacion', {
                                                  ...mapping.homologacion,
                                                  valores: newVals
                                                });
                                              }}
                                              placeholder="Si el archivo trae..."
                                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                            />
                                            <span className="text-slate-400 text-xs">➔</span>
                                            <input
                                              type="text"
                                              value={val.destino}
                                              onChange={(e) => {
                                                const newVals = [...(mapping.homologacion?.valores || [])];
                                                newVals[vidx].destino = e.target.value;
                                                handleMappingChange(mapping.campo_destino, 'homologacion', {
                                                  ...mapping.homologacion,
                                                  valores: newVals
                                                });
                                              }}
                                              placeholder="Homologar a..."
                                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newVals = (mapping.homologacion?.valores || []).filter((_, k) => k !== vidx);
                                                handleMappingChange(mapping.campo_destino, 'homologacion', {
                                                  ...mapping.homologacion,
                                                  valores: newVals
                                                });
                                              }}
                                              className="p-1 rounded text-red-500 hover:bg-red-500/10 text-xs cursor-pointer"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newVals = [...(mapping.homologacion?.valores || []), { origen: '', destino: '' }];
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...mapping.homologacion,
                                              valores: newVals
                                            });
                                          }}
                                          className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                                        >
                                          ➕ Agregar Fila de Mapeo
                                        </button>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Valor por Defecto (Fallback)</label>
                                        <input
                                          type="text"
                                          value={mapping.homologacion?.defecto || ''}
                                          onChange={(e) => {
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...mapping.homologacion,
                                              defecto: e.target.value
                                            });
                                          }}
                                          placeholder="Valor si no coincide con ninguna regla (opcional)"
                                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {/* CONFIG: Búsqueda en Tabla */}
                                  {currentType === 'tabla' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div>
                                        <div className="flex justify-between items-center mb-1">
                                          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Tabla Relacionada (FK)</label>
                                          {mapping.homologacion?.tabla_destino && (
                                            <button
                                              type="button"
                                              onClick={() => openForeignTableModal(mapping.homologacion?.tabla_destino || '')}
                                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold text-[9px] uppercase tracking-wide flex items-center gap-1 transition-all cursor-pointer"
                                              title="Ver registros de la tabla"
                                            >
                                              👁️ Ver Tabla
                                            </button>
                                          )}
                                        </div>
                                        <select
                                          value={mapping.homologacion?.tabla_destino || ''}
                                          onChange={(e) => {
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...mapping.homologacion,
                                              tabla_destino: e.target.value
                                            });
                                          }}
                                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                                        >
                                          <option value="">-- Seleccione Tabla --</option>
                                          <option value="TKR_CIUDADES">TKR_CIUDADES (Ciudades)</option>
                                          <option value="TKR_BARRIOS">TKR_BARRIOS (Barrios)</option>
                                          <option value="TKR_PERFILES_DOCTOR">TKR_PERFILES_DOCTOR (Perfiles Doctor)</option>
                                          <option value="TKR_MEDIOS">TKR_MEDIOS (Medios de Captura)</option>
                                          <option value="TKR_PLANES_ASEGURADORES">TKR_PLANES_ASEGURADORES (Aseguradoras)</option>
                                          <option value="TKR_REGIMEN_ASEGURAMIENTO">TKR_REGIMEN_ASEGURAMIENTO (Regímenes)</option>
                                          <option value="TKR_TIPOS_IDENTIFICACION">TKR_TIPOS_IDENTIFICACION (Tipos ID)</option>
                                          <option value="TKR_GENEROS">TKR_GENEROS (Géneros)</option>
                                        </select>
                                      </div>

                                      <div>
                                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Criterio de Búsqueda</label>
                                        <select
                                          value={mapping.homologacion?.criterio || 'nombre'}
                                          onChange={(e) => {
                                            handleMappingChange(mapping.campo_destino, 'homologacion', {
                                              ...mapping.homologacion,
                                              criterio: e.target.value as any
                                            });
                                          }}
                                          className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                                        >
                                          <option value="id">Buscar por Código / ID Numérico</option>
                                          <option value="nombre">Buscar por Nombre / Descripción Textual</option>
                                        </select>
                                      </div>
                                    </div>
                                  )}

                                  {/* CONFIG: Valor Constante */}
                                  {currentType === 'constante' && (
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">Valor Fijo a Asignar</label>
                                      <input
                                        type="text"
                                        value={mapping.homologacion?.valor_constante || ''}
                                        onChange={(e) => {
                                          handleMappingChange(mapping.campo_destino, 'homologacion', {
                                            ...mapping.homologacion,
                                            valor_constante: e.target.value
                                          });
                                        }}
                                        placeholder="Ingrese el valor constante que se guardará"
                                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Agregar Nuevos Campos Constantes */}
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl shadow-xs space-y-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                            📌 Asignar Constante a un Campo Vacío
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">Puedes asignar un valor estático a cualquier columna de `tkr_usuarios` que no provenga del archivo cargado.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end gap-3">
                          <div className="flex-1 w-full space-y-1.5">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Seleccionar Campo Destino</label>
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="text"
                                placeholder="🔎 Buscar campo..."
                                value={columnSearchTerm}
                                onChange={(e) => setColumnSearchTerm(e.target.value)}
                                className="px-3 py-2 flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none text-slate-900 dark:text-white"
                              />
                              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-[9px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setColumnSortBy('original')}
                                  className={`px-2.5 py-2 cursor-pointer transition-all ${columnSortBy === 'original' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-550 dark:text-slate-400'}`}
                                >
                                  Posición
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setColumnSortBy('alphabetical')}
                                  className={`px-2.5 py-2 cursor-pointer transition-all ${columnSortBy === 'alphabetical' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-550 dark:text-slate-400'}`}
                                >
                                  A-Z
                                </button>
                              </div>
                            </div>
                            <select
                              value={selectedFieldToAdd}
                              onChange={(e) => setSelectedFieldToAdd(e.target.value)}
                              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-850 dark:text-slate-100 focus:outline-none"
                            >
                              <option value="" disabled>-- Selecciona Campo --</option>
                              {filteredAndSortedColumns.map(col => (
                                <option key={col.campo_destino} value={col.campo_destino}>
                                  {col.label} ({col.tipo})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <button
                            type="button"
                            disabled={!selectedFieldToAdd}
                            onClick={() => {
                              if (!selectedFieldToAdd) return;
                              const colDef = TKR_USUARIOS_COLUMNS.find(c => c.campo_destino === selectedFieldToAdd);
                              if (!colDef) return;

                              const newMapping: FieldMapping = {
                                campo_destino: colDef.campo_destino,
                                label: colDef.label,
                                tipo: colDef.tipo,
                                columna_origen: '', // sin columna de origen
                                homologacion: {
                                  tipo: 'constante',
                                  valor_constante: ''
                                }
                              };

                              setUserMappings(prev => [...prev, newMapping]);
                              setSelectedFieldToAdd('');
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 h-[38px] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            ➕ Agregar Campo Constante
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button onClick={() => setUserWizardStep('2')} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer">
                          Atrás
                        </button>
                        <button onClick={handleConfirmHomologations} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                          Siguiente: Validar Vista Previa
                        </button>
                      </div>
                    </div>
                  )}

                  {/* USER STEP 4: Validar y Confirmar */}
                  {userWizardStep === '4' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div>
                        <h3 className="text-md font-bold text-slate-900 dark:text-white">Validar Estructura antes de la Creación</h3>
                        <p className="text-xs text-slate-400 mt-0.5">Comprueba cómo quedarán mapeados y homologados los registros a insertar en la base de datos Oracle.</p>
                      </div>

                      {/* Selección de Modo de Carga */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                          ⚙️ Modo de Procesamiento Transaccional
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Opción 1: Todo o Nada */}
                          <div
                            onClick={() => setModoCarga('TODO')}
                            className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${
                              modoCarga === 'TODO'
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-750'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modo_carga"
                              checked={modoCarga === 'TODO'}
                              onChange={() => setModoCarga('TODO')}
                              className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Todo o Nada (All or Nothing)</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">
                                Si ocurre algún error en cualquier fila del archivo, se cancela todo el lote. Útil para garantizar consistencia absoluta.
                              </span>
                            </div>
                          </div>

                          {/* Opción 2: Carga Parcial */}
                          <div
                            onClick={() => setModoCarga('PARCIAL')}
                            className={`p-3.5 rounded-xl border cursor-pointer select-none transition-all flex items-start gap-3 ${
                              modoCarga === 'PARCIAL'
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:border-slate-350 dark:hover:border-slate-750'
                            }`}
                          >
                            <input
                              type="radio"
                              name="modo_carga"
                              checked={modoCarga === 'PARCIAL'}
                              onChange={() => setModoCarga('PARCIAL')}
                              className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Carga Parcial (Insertar Válidos)</span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-relaxed">
                                Se insertarán todas las filas que pasen las validaciones. Las filas con errores se marcarán para su corrección futura.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Grilla de Validación Dinámica */}
                      <div className="overflow-auto max-h-[500px] border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs relative">
                        <table className="border-collapse text-left text-xs table-fixed" style={{ width: 'max-content', minWidth: '100%' }}>
                          <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
                              <th className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-950 z-30 border-r border-slate-100 dark:border-slate-800/80" style={{ width: '64px', minWidth: '64px' }}>Fila</th>
                              {getActiveMappings().map((m: FieldMapping) => {
                                const colWidth = validationColWidths[m.campo_destino] || 160;
                                return (
                                  <th
                                    key={m.campo_destino}
                                    className="px-4 py-3 relative select-none group"
                                    style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                                    title={`${m.label} (${m.campo_destino})`}
                                  >
                                    <div className="font-bold text-slate-700 dark:text-slate-200 truncate pr-2">{m.label}</div>
                                    <div className="text-[9px] text-slate-400 font-mono font-normal uppercase truncate pr-2">{m.campo_destino} ({m.tipo})</div>
                                    
                                    {/* Handle de redimensionamiento */}
                                    <div
                                      onMouseDown={(e) => handleResizeMouseDown(e, m.campo_destino)}
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/40 active:bg-indigo-650 z-30 transition-colors"
                                      title="Arrastrar para redimensionar"
                                    />
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {getMappedPreviewRows().length === 0 ? (
                              <tr>
                                <td colSpan={getActiveMappings().length + 1} className="px-4 py-8 text-center italic text-slate-400">
                                  No hay registros para previsualizar.
                                </td>
                              </tr>
                            ) : (
                              getMappedPreviewRows().map((row) => (
                                <tr key={row.id || row.numero_linea} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                  <td className="px-4 py-3 text-slate-400 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80" style={{ width: '64px', minWidth: '64px' }}>{row.numero_linea}</td>
                                  {getActiveMappings().map((m: FieldMapping) => {
                                    const val = getHomologatedValue(m, row);
                                    const isPassword = m.campo_destino.toLowerCase().includes('clave') || m.campo_destino.toLowerCase().includes('pass');
                                    const colWidth = validationColWidths[m.campo_destino] || 160;
                                    
                                    return (
                                      <td
                                        key={m.campo_destino}
                                        className="px-4 py-3 truncate"
                                        style={{ width: `${colWidth}px`, minWidth: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                                        title={val}
                                      >
                                        {isPassword && val ? '••••••••' : val || <span className="text-slate-400 italic">NULL</span>}
                                        {m.tipo === 'DATE' && val && !m.homologacion && (
                                          <span className="block text-[8px] text-amber-500 font-bold mt-0.5">
                                            Conv: TO_DATE(..., '{m.formato_fecha}')
                                          </span>
                                        )}
                                        {m.tipo === 'NUMBER' && val && !m.homologacion && (
                                          <span className="block text-[8px] text-blue-500 font-bold mt-0.5">
                                            Conv: TO_NUMBER(...)
                                          </span>
                                        )}
                                        {m.homologacion?.tipo === 'tabla' && (
                                          <span className="block text-[8px] text-purple-500 font-bold mt-0.5">
                                            Homol: Relación FK
                                          </span>
                                        )}
                                        {m.homologacion?.tipo === 'constante' && (
                                          <span className="block text-[8px] text-emerald-500 font-bold mt-0.5">
                                            Valor Estático
                                          </span>
                                        )}
                                        {m.homologacion?.tipo === 'directo' && (
                                          <span className="block text-[8px] text-indigo-500 font-bold mt-0.5">
                                            Mapeo Directo
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => setUserWizardStep('3')}
                          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
                        >
                          Atrás
                        </button>
                        
                        <button
                          onClick={handleCreateUsersInDB}
                          disabled={creatingUsers}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center gap-2"
                        >
                          {creatingUsers ? (
                            <>
                              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Insertando en Oracle...</span>
                            </>
                          ) : (
                            <span>Confirmar e Insertar en Oracle</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* USER STEP 5: Éxito/Resultado */}
                  {userWizardStep === '5' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
                      <div className="text-center max-w-lg mx-auto space-y-2">
                        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto shadow-xs">
                          ✓
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Procesamiento de Carga Completado</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Se ha ejecutado la importación de usuarios en la base de datos Oracle aplicando el modo transaccional configurado.
                        </p>
                      </div>

                      {/* Tarjetas de Métricas */}
                      {creationSummary && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Registros Procesados</span>
                            <span className="text-2xl font-black text-slate-800 dark:text-slate-100 block font-mono">{creationSummary.rows_processed}</span>
                          </div>

                          <div className="p-4 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Exitosos (Creados)</span>
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block font-mono">{creationSummary.exitosos}</span>
                          </div>

                          <div className="p-4 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
                            <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider block">Con Errores</span>
                            <span className="text-2xl font-black text-red-600 dark:text-red-400 block font-mono">{creationSummary.errores}</span>
                          </div>
                        </div>
                      )}

                      {/* Tabla detallada de cada fila */}
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wide">
                              📄 Detalle de Ejecución por Registro
                            </h4>
                            <p className="text-[11px] text-slate-400">Verifica el estado individual de cada línea importada o corregida.</p>
                          </div>
                          
                          {/* Botones de exportación */}
                          <div className="flex gap-2">
                            <button
                              onClick={exportToCSV}
                              disabled={cargueResultDetails.length === 0}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              📥 Exportar CSV
                            </button>
                            <button
                              onClick={exportToExcel}
                              disabled={cargueResultDetails.length === 0}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              📊 Exportar Excel
                            </button>
                          </div>
                        </div>

                        {loadingResultDetails ? (
                          <div className="py-8 flex flex-col items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-xs text-slate-500">Cargando reporte de filas...</span>
                          </div>
                        ) : (
                          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-[300px]">
                            <table className="w-full border-collapse text-left text-xs table-fixed">
                              <thead className="sticky top-0 z-20">
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold shadow-xs">
                                  <th className="px-4 py-2.5 w-16 sticky left-0 bg-slate-50 dark:bg-slate-950 z-30 border-r border-slate-100 dark:border-slate-800/80">Fila</th>
                                  {getActiveMappings().map((m) => (
                                    <th key={m.campo_destino} className="px-4 py-2.5 w-36 truncate" title={`${m.label} (${m.campo_destino})`}>
                                      {m.label}
                                    </th>
                                  ))}
                                  <th className="px-4 py-2.5 w-24">Estado</th>
                                  <th className="px-4 py-2.5 w-32">ID de Usuario</th>
                                  <th className="px-4 py-2.5 w-80">Detalle del Error</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                                {cargueResultDetails.length === 0 ? (
                                  <tr>
                                    <td colSpan={getActiveMappings().length + 4} className="px-4 py-8 text-center text-slate-400 italic">
                                      No se recuperaron detalles de ejecución.
                                    </td>
                                  </tr>
                                ) : (
                                  cargueResultDetails.map((row) => {
                                    const isSuccess = !!row.id_usuario;
                                    return (
                                      <tr key={row.id || row.numero_linea} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="px-4 py-2.5 text-slate-400 font-bold sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80">{row.numero_linea}</td>
                                        
                                        {/* Dynamic mapped values */}
                                        {getActiveMappings().map((m) => {
                                          const val = getHomologatedValue(m, row);
                                          const isPassword = m.campo_destino.toLowerCase().includes('clave') || m.campo_destino.toLowerCase().includes('pass');
                                          return (
                                            <td key={m.campo_destino} className="px-4 py-2.5 truncate" title={val}>
                                              {isPassword && val ? '••••••••' : val || <span className="text-slate-400 italic">-</span>}
                                            </td>
                                          );
                                        })}

                                        <td className="px-4 py-2.5">
                                          {isSuccess ? (
                                            <span className="px-1.8 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                                              EXITOSO
                                            </span>
                                          ) : (
                                            <span className="px-1.8 py-0.5 rounded-full text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-500">
                                              FALLIDO
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 font-bold text-indigo-650 dark:text-indigo-400">
                                          {row.id_usuario || <span className="text-slate-400 font-normal italic">N/A</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-red-500 truncate" title={row.error}>
                                          {row.error || <span className="text-slate-400 italic font-normal">Sin errores</span>}
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

                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                        <button
                          onClick={resetUserWizard}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm"
                        >
                          Volver al Asistente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>

            <footer className="text-center text-[10px] text-slate-400 dark:text-slate-500 pt-6 border-t border-slate-100 dark:border-slate-800 mt-12 flex justify-between">
              <span>Teker Automatización © 2026</span>
              <span>Conexión cifrada a Oracle DB</span>
            </footer>
          </main>
        </div>
      )}

      {/* Modal de Tabla Foránea */}
      <DatabaseTableModal
        isOpen={isTableModalOpen}
        onClose={() => setIsTableModalOpen(false)}
        tableName={modalTableName}
        loading={loadingModalTable}
        error={modalTableError}
        rows={modalTableRows}
      />

      {/* Modal de Valores Únicos */}
      <UniqueValuesModal
        isOpen={isUniqueModalOpen}
        onClose={() => setIsUniqueModalOpen(false)}
        colName={uniqueModalColName}
        getColumnLabel={getColumnLabel}
        fieldLabel={uniqueModalFieldLabel}
        campoDestino={uniqueModalCampoDestino || null}
        uniqueColValues={uniqueColValues}
        initialMode={uniqueModalCampoDestino ? 'mapear' : 'ver'}
        initialDraftMappings={initialDraftMappings}
        onApply={(nuevosValores) => {
          if (!uniqueModalCampoDestino) return;
          const mapping = userMappings.find(m => m.campo_destino === uniqueModalCampoDestino);
          handleMappingChange(uniqueModalCampoDestino, 'homologacion', {
            ...mapping?.homologacion,
            tipo: 'directo',
            valores: nuevosValores,
            defecto: mapping?.homologacion?.defecto || ''
          });
          setIsUniqueModalOpen(false);
        }}
        foreignTable={foreignTable || undefined}
        foreignRows={foreignRows}
      />

      {/* Modal de Confirmación de Eliminación de Cargue */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center text-lg font-bold">
                ⚠️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  ¿Confirmar eliminación del cargue?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta acción eliminará permanentemente la cabecera y el detalle en la base de datos.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2 font-sans">
              <div className="flex justify-between font-mono font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                <span>Cargue ID: #{historialCargueId}</span>
                <span>{carguesList.find(c => String(c.id) === String(historialCargueId))?.fecha_cargue || ''}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 font-medium truncate">
                📁 <strong>Archivo:</strong> {carguesList.find(c => String(c.id) === String(historialCargueId))?.nombre_archivo || 'N/A'}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium truncate">
                🏥 <strong>Entidad:</strong> {getCargueEntidadLabel(carguesList.find(c => String(c.id) === String(historialCargueId)))}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium truncate">
                📄 <strong>Convenio:</strong> {getCargueConvenioLabel(carguesList.find(c => String(c.id) === String(historialCargueId)))}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium truncate">
                🛡️ <strong>Régimen:</strong> {getCargueRegimenLabel(carguesList.find(c => String(c.id) === String(historialCargueId)))}
              </p>
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                👤 <strong>Usuario:</strong> {carguesList.find(c => String(c.id) === String(historialCargueId))?.usuario || user || 'N/A'}
              </p>
              <p className="text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800 font-mono">
                Registros a eliminar: {historialRows.length}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={deletingCargue}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteDeleteCargue}
                disabled={deletingCargue}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl cursor-pointer active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                {deletingCargue ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <span>Sí, Eliminar Cargue</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
