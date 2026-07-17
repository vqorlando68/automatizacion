import React, { useState, useMemo } from 'react';

interface DatabaseTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  loading: boolean;
  error: string | null;
  rows: any[];
}

export const DatabaseTableModal: React.FC<DatabaseTableModalProps> = ({
  isOpen,
  onClose,
  tableName,
  loading,
  error,
  rows,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((val) => String(val || '').toLowerCase().includes(term))
    );
  }, [rows, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-t-2xl">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📊 Registros de Tabla:</span>
              <code className="text-xs bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded font-mono">
                {tableName}
              </code>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Mostrando hasta 500 registros almacenados en la base de datos.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-450 hover:text-slate-600 dark:hover:text-slate-250 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-lg"
          >
            ✕
          </button>
        </div>

        {/* Buscador */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-950">
          <div className="relative">
            <input
              type="text"
              placeholder="🔎 Buscar en cualquier columna..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
              🔍
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 text-xs cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Contenido / Tabla */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-950/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-medium">Consultando registros en base de datos...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-450 text-xs">
              ⚠️ {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="text-center py-12 text-slate-450 text-xs">
              {rows.length === 0 ? 'No hay registros en esta tabla.' : 'Ningún registro coincide con la búsqueda.'}
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
              <div className="overflow-x-auto max-h-[40vh]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 uppercase tracking-wider font-bold">
                      {Object.keys(filteredRows[0] || {}).map((col) => (
                        <th key={col} className="px-4 py-2 text-[10px] whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 dark:divide-slate-800">
                    {filteredRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 text-slate-800 dark:text-slate-200 transition-colors"
                      >
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} className="px-4 py-2.5 max-w-[200px] truncate">
                            {val === null || val === undefined ? (
                              <span className="text-slate-350 dark:text-slate-650 italic text-[10px]">NULL</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl text-[10px] text-slate-400">
          <span>Registros filtrados: {filteredRows.length} de {rows.length}</span>
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
  );
};
