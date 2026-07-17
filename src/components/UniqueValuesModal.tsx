import React, { useState, useEffect, useMemo } from 'react';

interface UniqueValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  colName: string;
  getColumnLabel: (colKey: string) => string;
  fieldLabel: string;
  campoDestino: string | null;
  uniqueColValues: Array<{ value: string; count: number }>;
  initialMode: 'ver' | 'mapear';
  initialDraftMappings: Record<string, string>;
  onApply: (nuevosValores: Array<{ origen: string; destino: string }>) => void;
  foreignTable?: string;
  foreignRows: any[];
}

export const UniqueValuesModal: React.FC<UniqueValuesModalProps> = ({
  isOpen,
  onClose,
  colName,
  getColumnLabel,
  fieldLabel,
  campoDestino,
  uniqueColValues,
  initialMode,
  initialDraftMappings,
  onApply,
  foreignTable,
  foreignRows,
}) => {
  const [mode, setMode] = useState<'ver' | 'mapear'>('ver');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftMappings, setDraftMappings] = useState<Record<string, string>>({});
  const [activeRowCombobox, setActiveRowCombobox] = useState<string | null>(null);
  const [comboboxSearchTerm, setComboboxSearchTerm] = useState('');
  const [copiedValue, setCopiedValue] = useState<string | null>(null);

  // Sincronizar estados cuando se abre la modal
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setDraftMappings({ ...initialDraftMappings });
      setSearchTerm('');
      setActiveRowCombobox(null);
      setComboboxSearchTerm('');
      setCopiedValue(null);
    }
  }, [isOpen, initialMode, initialDraftMappings]);

  const filteredColValues = useMemo(() => {
    if (!searchTerm.trim()) return uniqueColValues;
    const term = searchTerm.toLowerCase();
    return uniqueColValues.filter((item) =>
      item.value.toLowerCase().includes(term)
    );
  }, [uniqueColValues, searchTerm]);

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedValue(value);
    setTimeout(() => setCopiedValue(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className={`bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200 ${foreignTable && mode === 'mapear' ? 'max-w-4xl' : 'max-w-xl'}`}>
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>📋 Valores Únicos</span>
              </h3>
              <code className="text-[10px] bg-purple-100 dark:bg-purple-950/65 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded font-mono font-bold truncate max-w-[280px]" title={getColumnLabel(colName)}>
                {getColumnLabel(colName)}
              </code>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Asociado al campo: <span className="font-bold text-slate-600 dark:text-slate-350">{fieldLabel}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            {/* Toggle Ver / Mapear */}
            {campoDestino && (
              <div className="flex rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden text-[9px] font-bold shadow-xs">
                <button
                  type="button"
                  onClick={() => setMode('ver')}
                  className={`px-3 py-1.5 cursor-pointer transition-all ${mode === 'ver' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                >👁 Ver</button>
                <button
                  type="button"
                  onClick={() => setMode('mapear')}
                  className={`px-3 py-1.5 cursor-pointer transition-all ${mode === 'mapear' ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                >🗂 Mapeo Directo</button>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-250 transition-colors p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Buscador */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950">
          <div className="relative">
            <input
              type="text"
              placeholder="🔎 Filtrar valores del archivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-880 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
              🔍
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Contenido / Listado */}
        <div className={`p-6 pb-16 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20 ${foreignTable && mode === 'mapear' ? 'min-h-[400px]' : ''}`}>
          {filteredColValues.length === 0 ? (
            <div className="text-center py-8 text-slate-455 text-xs">
              Ningún valor coincide con el filtro.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs bg-white dark:bg-slate-900">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-555 dark:text-slate-400 uppercase tracking-wider font-bold text-[9px]">
                    <th className="px-4 py-2">Valor Origen</th>
                    <th className="px-4 py-2 w-20 text-right">Reps.</th>
                    {mode === 'mapear' ? (
                      <>
                        <th className="px-4 py-2 w-32">Destino (ID)</th>
                        {foreignTable && (
                          <th className="px-4 py-2">Registro Relacionado ({foreignTable})</th>
                        )}
                      </>
                    ) : (
                      <th className="px-4 py-2 w-24 text-center">Acción</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                  {filteredColValues.map((item, idx) => {
                    const openUpward = filteredColValues.length > 4 && (idx >= filteredColValues.length - 2);
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono truncate max-w-[180px]" title={item.value}>
                          {item.value === '' ? (
                            <span className="text-slate-400 italic text-[10px]">&lt;Vacío&gt;</span>
                          ) : (
                            item.value
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">
                          {item.count}
                        </td>
                        {mode === 'mapear' ? (
                          <>
                            {/* Destino ID Input */}
                            <td className="px-3 py-1.5">
                              <input
                                type="text"
                                value={draftMappings[item.value] ?? ''}
                                onChange={(e) => {
                                  setDraftMappings((prev) => ({
                                    ...prev,
                                    [item.value]: e.target.value,
                                  }));
                                }}
                                placeholder="ID destino..."
                                className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 font-mono"
                              />
                            </td>
                            {/* Searchable selector for FK */}
                            {foreignTable && (
                              <td className="px-3 py-1.5 min-w-[280px]">
                                {foreignRows.length === 0 ? (
                                  <span className="text-[10px] text-slate-400 italic">Cargando registros...</span>
                                ) : (
                                  <div className="relative">
                                    {/* Trigger Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (activeRowCombobox === item.value) {
                                          setActiveRowCombobox(null);
                                          setComboboxSearchTerm('');
                                        } else {
                                          setActiveRowCombobox(item.value);
                                          setComboboxSearchTerm('');
                                        }
                                      }}
                                      className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-xs hover:border-indigo-550 dark:hover:border-indigo-400 transition-colors text-left"
                                    >
                                      <span className="truncate mr-2 text-slate-705 dark:text-slate-300">
                                        {(() => {
                                          const selectedId = draftMappings[item.value];
                                          if (selectedId) {
                                            const matchedRow = foreignRows.find((r) => String(r.ID) === String(selectedId));
                                            if (matchedRow) {
                                              const otherFields = Object.entries(matchedRow)
                                                .filter(([k]) => k !== 'ID')
                                                .map(([, v]) => v)
                                                .join(' - ');
                                              return `[${matchedRow.ID}] ${otherFields}`;
                                            }
                                            return `ID: ${selectedId}`;
                                          }
                                          return '🔍 Seleccionar registro...';
                                        })()}
                                      </span>
                                      <span className="text-slate-400 dark:text-slate-500 text-[9px] shrink-0">▼</span>
                                    </button>

                                    {/* Dropdown panel */}
                                    {activeRowCombobox === item.value && (
                                      <div className={`absolute left-0 right-0 z-50 bg-white dark:bg-slate-950 border border-slate-255 dark:border-slate-800 rounded-xl shadow-xl flex flex-col max-h-60 overflow-hidden animate-in fade-in-50 duration-100 w-[320px] md:w-[380px] ${openUpward ? 'bottom-full mb-1.5 origin-bottom slide-in-from-bottom-1' : 'top-full mt-1.5 origin-top slide-in-from-top-1'}`}>
                                        {/* Search Input */}
                                        <div className="p-2 border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-900/50">
                                          <input
                                            type="text"
                                            placeholder="Filtrar por ID, Nombre..."
                                            value={comboboxSearchTerm}
                                            onChange={(e) => setComboboxSearchTerm(e.target.value)}
                                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:outline-none focus:border-indigo-500 text-slate-855 dark:text-slate-100"
                                            autoFocus
                                          />
                                        </div>

                                        {/* Rows List */}
                                        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-850 max-h-44">
                                          {(() => {
                                            const term = comboboxSearchTerm.toLowerCase().trim();
                                            const filtered = foreignRows.filter((r) => {
                                              if (!term) return true;
                                              return Object.values(r).some((v) =>
                                                String(v).toLowerCase().includes(term)
                                              );
                                            });

                                            if (filtered.length === 0) {
                                              return (
                                                <div className="p-3 text-center text-slate-400 text-xs">
                                                  No se encontraron registros
                                                </div>
                                              );
                                            }

                                            return filtered.map((row: any) => {
                                              const isSelected = String(draftMappings[item.value]) === String(row.ID);
                                              const details = Object.entries(row)
                                                .filter(([k]) => k !== 'ID')
                                                .map(([k, v]) => (
                                                  <span key={k} className="inline-flex items-center text-[9px] text-slate-500 dark:text-slate-405 bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded leading-none mr-1 mt-1">
                                                    <span className="font-bold text-slate-400 dark:text-slate-500 mr-0.5 uppercase text-[8px]">{k}:</span>
                                                    {String(v)}
                                                  </span>
                                                ));

                                              return (
                                                <button
                                                  key={row.ID}
                                                  type="button"
                                                  onClick={() => {
                                                    setDraftMappings((prev) => ({
                                                      ...prev,
                                                      [item.value]: String(row.ID),
                                                    }));
                                                    setActiveRowCombobox(null);
                                                    setComboboxSearchTerm('');
                                                  }}
                                                  className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-1 transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer ${
                                                    isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : ''
                                                  }`}
                                                >
                                                  <div className="flex justify-between items-center">
                                                    <span className="font-bold text-indigo-655 dark:text-indigo-400 font-mono">
                                                      ID: {row.ID}
                                                    </span>
                                                    {isSelected && (
                                                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                                                        ✓ Seleccionado
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-wrap">
                                                    {details}
                                                  </div>
                                                </button>
                                              );
                                            });
                                          })()}
                                        </div>

                                        {/* Footer / Clear selection */}
                                        <div className="p-1.5 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDraftMappings((prev) => {
                                                const updated = { ...prev };
                                                delete updated[item.value];
                                                return updated;
                                              });
                                              setActiveRowCombobox(null);
                                              setComboboxSearchTerm('');
                                            }}
                                            className="px-2 py-1 text-[10px] text-red-655 hover:text-red-755 dark:hover:text-red-400 font-bold cursor-pointer transition-colors"
                                          >
                                            Limpiar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveRowCombobox(null);
                                              setComboboxSearchTerm('');
                                            }}
                                            className="px-2 py-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold cursor-pointer transition-colors"
                                          >
                                            Cerrar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                          </>
                        ) : (
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleCopyValue(item.value)}
                              className="px-2 py-0.5 text-[9px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350 rounded border border-slate-200/50 dark:border-slate-700/50 cursor-pointer active:scale-95 transition-all font-bold"
                              title="Copiar valor"
                            >
                              {copiedValue === item.value ? '✅ Copiado' : '📋 Copiar'}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Aviso modo mapear */}
          {mode === 'mapear' && (
            <p className="text-[10px] text-slate-400 mt-3 leading-relaxed">
              💡 Escribe el valor que deseas guardar en la base de datos para cada valor del archivo, o utiliza el selector de registros para escoger la llave foránea correspondiente. Los campos vacíos no generarán regla de homologación.
            </p>
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl text-[10px] text-slate-400">
          <span>{uniqueColValues.length} valores únicos encontrados</span>
          <div className="flex gap-2">
            {mode === 'mapear' && campoDestino && (
              <button
                type="button"
                onClick={() => {
                  // Construir array de valores a partir de draftMappings
                  const nuevosValores: Array<{ origen: string; destino: string }> = [];
                  Object.entries(draftMappings).forEach(([key, val]) => {
                    const origen = key;
                    const destino = (val as string)?.trim() || '';
                    if (destino) {
                      nuevosValores.push({ origen, destino });
                    }
                  });
                  onApply(nuevosValores);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                ✅ Aplicar Mapeo Directo
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-200 hover:bg-slate-700 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
