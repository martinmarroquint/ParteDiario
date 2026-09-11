// src/components/ocr/TablaRol.jsx
// TABLA DE ROL - DISEÑO LIMPIO CON SELECT ESTILIZADO COMPACTO
// v2.1 - Z-INDEX CORREGIDO: no interfiere con dropdowns del Encabezado

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Square, CheckSquare, Clock, ChevronDown, Check, Search, X } from 'lucide-react';
import { DIAS_SEMANA, TURNO_MAP, MESES } from './constantes';

const FILAS_POR_PAGINA = 20;

// ============================================================
// SELECT DE ÁREA CON BÚSQUEDA + PORTAL
// ============================================================
const SelectArea = ({ value, opciones, onChange, disabled }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    const h = (e) => {
      const clickDentroTrigger = ref.current && ref.current.contains(e.target);
      const clickDentroDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
      if (!clickDentroTrigger && !clickDentroDropdown) setAbierto(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    if (abierto && inputRef.current) inputRef.current.focus();
  }, [abierto]);

  useEffect(() => {
    if (abierto && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 200) });
    }
  }, [abierto]);

  const filtradas = busqueda.trim()
    ? opciones.filter(o => o.toLowerCase().includes(busqueda.toLowerCase()))
    : opciones;

  const seleccionado = value || '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setAbierto(!abierto)}
        disabled={disabled}
        className={`w-full text-left h-8 flex items-center gap-1.5 px-2.5 text-xs rounded-lg border transition-all truncate ${
          disabled
            ? 'border-gray-100 text-gray-400 cursor-not-allowed bg-gray-50'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:shadow-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-300 focus:border-gray-300'
        }`}
        style={{ maxWidth: '150px' }}
      >
        <span className="flex-1 truncate font-medium">{seleccionado || 'Sin área'}</span>
        {!disabled && <ChevronDown className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />}
      </button>

      {abierto && !disabled && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden"
          style={{ position: 'absolute', top: pos.top, left: pos.left, minWidth: pos.width, zIndex: 99999 }}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar área..."
                className="w-full h-8 pl-8 pr-8 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              />
              {busqueda && (
                <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto max-h-52">
            {filtradas.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">Sin resultados</div>
            ) : (
              filtradas.map((opcion) => {
                const sel = opcion === value;
                return (
                  <button
                    key={opcion}
                    onClick={() => { onChange(opcion); setAbierto(false); setBusqueda(''); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${
                      sel ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{opcion}</span>
                    {sel && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const TablaRol = ({
  personalFiltrado, DIAS, turnos, cambiosArea, rolHabilitado, esAdmin,
  seleccionados, onToggleSeleccion, onSeleccionarTodos, onLimpiarSeleccion,
  onCambiarArea, onCeldaClick, onCeldaKeyDown, onLimpiarColumna,
  calcularComputo, onCambioTurno, todasLasAreas,
  mesSeleccionado, anioSeleccionado, areaAsignada, responsable,
  celdasModificadas = new Set()
}) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const cellRefs = useRef({});

  const updateTooltipPos = useCallback((cellKey) => {
    const el = cellRefs.current[cellKey];
    if (el) {
      const r = el.getBoundingClientRect();
      setTooltipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    }
  }, []);

  const handleCellEnter = useCallback((cellKey) => {
    updateTooltipPos(cellKey);
    setHoveredCell(cellKey);
  }, [updateTooltipPos]);

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
  }, []);

  // Re-posicionar tooltip al hacer scroll
  useEffect(() => {
    if (!hoveredCell) return;
    const onScroll = () => updateTooltipPos(hoveredCell);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', onScroll, { capture: true });
  }, [hoveredCell, updateTooltipPos]);

  // Calcular filas vacías para completar la tabla en impresión cuando hay más de 15 personas
  const filasVacias = personalFiltrado.length > 15 && personalFiltrado.length < FILAS_POR_PAGINA
    ? FILAS_POR_PAGINA - personalFiltrado.length
    : 0;

  return (
    <div className="p-3 print:p-1">
      <div className="hidden print:block text-center mb-4">
        <h2 className="text-lg font-bold uppercase">HOSPITAL REGIONAL POLICIAL AREQUIPA</h2>
        <h3 className="text-xl font-bold mt-1">ROL DE SERVICIO - {MESES[mesSeleccionado - 1].toUpperCase()} {anioSeleccionado}</h3>
        <p className="text-base mt-2">{areaAsignada} | Responsable: {responsable}</p>
        <p className="text-sm text-gray-500">Impreso: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-clip print:shadow-none print:border-none">
        <div className="overflow-x-auto relative" style={{ maxHeight: 'calc(100vh - 180px)', maxWidth: '100%' }}>
          <table className="w-max border-collapse text-sm print:text-xs relative">
            <colgroup>
              <col style={{ width: '40px' }} />
              <col style={{ width: '40px' }} />
              <col style={{ width: '80px' }} />
              <col style={{ width: '180px' }} />
              <col style={{ width: '140px' }} />
              {DIAS.map((_, i) => <col key={i} style={{ width: '38px' }} />)}
              <col style={{ width: '65px' }} />
              {esAdmin && <col style={{ width: '55px' }} />}
            </colgroup>

            <thead className="sticky top-0 z-[10]">
              <tr className="bg-gray-50 print:bg-gray-100">
                <th className="sticky left-0 top-0 z-[15] bg-gray-50 print:bg-gray-100 px-2 py-2.5 border-b-2 border-r text-center print:hidden shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.15)]">
                  {rolHabilitado && (
                    <button 
                      onClick={seleccionados.size === personalFiltrado.length ? onLimpiarSeleccion : onSeleccionarTodos} 
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {seleccionados.size === personalFiltrado.length ? 
                        <CheckSquare className="w-4 h-4 text-gray-500" /> : 
                        <Square className="w-4 h-4" />
                      }
                    </button>
                  )}
                </th>
                
                <th className="sticky left-[40px] top-0 z-[15] bg-gray-50 print:bg-gray-100 px-2 py-2.5 border-b-2 border-r text-center text-gray-600 font-bold text-xs shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.15)]">
                  N°
                </th>
                
                <th className="sticky left-[80px] top-0 z-[15] bg-gray-50 print:bg-gray-100 px-2 py-2.5 border-b-2 border-r text-left text-gray-600 font-semibold text-xs shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.15)]">
                  Grado
                </th>
                
                <th className="sticky left-[160px] top-0 z-[15] bg-gray-50 print:bg-gray-100 px-3 py-2.5 border-b-2 border-r text-left text-gray-600 font-semibold text-xs shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.15)]">
                  Apellidos y Nombres
                </th>
                
                <th className="sticky left-[340px] top-0 z-[15] bg-gray-50 print:bg-gray-100 px-3 py-2.5 border-b-2 border-r text-left text-gray-600 font-semibold text-xs shadow-[4px_2px_8px_-2px_rgba(0,0,0,0.2)]">
                  Area
                </th>

                {DIAS.map(dia => {
                  const fecha = new Date(anioSeleccionado, mesSeleccionado - 1, dia);
                  const diaSemana = fecha.getDay();
                  const esFinDeSemana = diaSemana === 0 || diaSemana === 6;
                  const inicialDia = DIAS_SEMANA.find(d => d.id === diaSemana)?.inicial || '';

                  return (
                    <th 
                      key={dia} 
                      onClick={() => onLimpiarColumna(dia)}
                      className="px-0 py-1 border-b-2 w-9 text-center font-semibold cursor-pointer hover:bg-red-50 transition-colors relative z-[5]"
                      style={{ backgroundColor: esFinDeSemana ? '#F8FAFC' : '#FFFFFF' }}
                      title={`Limpiar dia ${dia} - ${DIAS_SEMANA.find(d => d.id === diaSemana)?.nombre || ''}`}
                    >
                      <div className={`text-sm font-bold ${esFinDeSemana ? 'text-gray-500' : 'text-gray-600'}`}>
                        {dia}
                      </div>
                      <div className={`text-[11px] leading-none font-bold ${esFinDeSemana ? 'text-gray-400' : 'text-gray-400'}`}>
                        {inicialDia}
                      </div>
                    </th>
                  );
                })}

                <th className="px-3 py-2.5 border-b-2 text-center text-gray-600 font-semibold text-xs bg-white z-[5]">
                  Horas
                </th>
                
                {esAdmin && (
                  <th className="px-2 py-2.5 border-b-2 text-center text-gray-600 font-semibold text-xs print:hidden bg-white z-[5]">
                    Camb.
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {personalFiltrado.map((emp, idx) => {
                const computo = calcularComputo(emp.id);
                const sel = seleccionados.has(emp.id);
                const rowBg = sel ? '#F9FAFB' : '#FFFFFF';

                return (
                  <tr 
                    key={emp.id} 
                    data-empleado-id={emp.id}
                    className="hover:bg-gray-50 transition-colors relative group"
                    style={{ backgroundColor: rowBg }}
                  >
                    <td 
                      className="sticky left-0 z-[5] px-2 py-1.5 border-r text-center print:hidden shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      style={{ backgroundColor: rowBg }}
                    >
                      {rolHabilitado && (
                        <button 
                          onClick={() => onToggleSeleccion(emp.id)} 
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {sel ? 
                            <CheckSquare className="w-4 h-4 text-gray-400" /> : 
                            <Square className="w-4 h-4" />
                          }
                        </button>
                      )}
                    </td>
                    
                    <td 
                      className="sticky left-[40px] z-[5] px-2 py-1.5 border-r text-center text-gray-400 font-mono text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      style={{ backgroundColor: rowBg }}
                    >
                      {idx + 1}
                    </td>
                    
                    <td 
                      className="sticky left-[80px] z-[5] px-2 py-1.5 border-r text-gray-600 font-mono font-semibold text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      style={{ backgroundColor: rowBg }}
                    >
                      {emp.grado}
                    </td>
                    
                    <td 
                      className="sticky left-[160px] z-[5] px-3 py-1.5 border-r font-semibold text-gray-700 text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)]"
                      style={{ backgroundColor: rowBg }}
                    >
                      {emp.nombre}
                    </td>
                    
                    <td 
                      className="sticky left-[340px] z-[5] px-2 py-1 border-r text-xs shadow-[4px_0_8px_-2px_rgba(0,0,0,0.2)]"
                      style={{ backgroundColor: rowBg }}
                    >
                      {rolHabilitado ? (
                        <SelectArea
                          value={cambiosArea[emp.id] || emp.area}
                          opciones={todasLasAreas}
                          onChange={(val) => onCambiarArea(emp.id, val)}
                          disabled={!rolHabilitado}
                        />
                      ) : (
                        <span className="text-gray-600 text-xs">{emp.area}</span>
                      )}
                    </td>

                    {DIAS.map(dia => {
                      const turno = turnos[emp.id]?.[dia] || '';
                      const t = TURNO_MAP[turno];
                      const fecha = new Date(anioSeleccionado, mesSeleccionado - 1, dia);
                      const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
                      const infoMod = celdasModificadas.get(`${emp.id}-${dia}`);
                      const nombreTurnoAnt = infoMod?.turnoAnterior || infoMod?.valorAnterior || 'Sin turno';
                      const nombreTurnoNue = infoMod?.turnoNuevo || infoMod?.valorNuevo || 'Sin turno';

                      return (
                        <td 
                          key={dia} 
                          ref={el => { cellRefs.current[`${emp.id}-${dia}`] = el; }}
                          className="p-0 border-r relative"
                          style={{ 
                            backgroundColor: esFinDeSemana ? '#F8FAFC' : '#FFFFFF', 
                            borderColor: '#E5E7EB'
                          }}
                          onMouseEnter={() => infoMod && handleCellEnter(`${emp.id}-${dia}`)}
                          onMouseLeave={handleCellLeave}
                          onTouchStart={() => infoMod && handleCellEnter(`${emp.id}-${dia}`)}
                          onTouchEnd={handleCellLeave}
                        >
                          {infoMod && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_3px_rgba(16,185,129,0.6)]" />
                          )}
                          <button 
                            data-celda={`${emp.id}-${dia}`}
                            onClick={() => onCeldaClick && onCeldaClick(emp.id, dia)}
                            onKeyDown={(e) => onCeldaKeyDown && onCeldaKeyDown(e, emp.id, dia)}
                            tabIndex={0}
                            disabled={!rolHabilitado}
                            className={`w-9 h-9 text-xs font-bold rounded-lg transition-all outline-none ${
                              rolHabilitado 
                                ? 'hover:scale-110 cursor-pointer focus:ring-2 focus:ring-gray-400' 
                                : 'cursor-default'
                            }`}
                            style={{ 
                              backgroundColor: turno ? t?.color : 'transparent', 
                              color: turno ? t?.texto : '#D1D5DB' 
                            }}
                            title={turno ? `${t?.nombre} (${t?.horas}h) - Dia ${dia} | Tecla: ${t?.codigo}` : `Dia ${dia}`}
                          >
                            {turno || '-'}
                          </button>
                        </td>
                      );
                    })}

                    <td 
                      className="px-3 py-1.5 border-l text-center" 
                      style={{ backgroundColor: rowBg }}
                    >
                      <span className={`text-sm font-bold ${
                        computo >= 180 ? 'text-gray-700' : 
                        computo > 0 ? 'text-gray-500' : 
                        'text-gray-300'
                      }`}>
                        {computo}h
                      </span>
                    </td>

                    {esAdmin && (
                      <td 
                        className="px-2 py-1.5 border-l text-center print:hidden" 
                        style={{ backgroundColor: rowBg }}
                      >
                        <button 
                          onClick={() => onCambioTurno(emp)}
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" 
                          title="Cambio de turno"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              
              {filasVacias > 0 && Array.from({ length: filasVacias }).map((_, i) => {
                const idx = personalFiltrado.length + i;
                return (
                  <tr key={`empty-${i}`} className="hidden print:table-row">
                    <td className="px-2 py-1.5 border-r text-center" style={{ backgroundColor: '#fff' }} />
                    <td className="px-2 py-1.5 border-r text-center text-gray-300 font-mono text-xs" style={{ backgroundColor: '#fff' }}>{idx + 1}</td>
                    <td className="px-2 py-1.5 border-r" style={{ backgroundColor: '#fff' }} />
                    <td className="px-3 py-1.5 border-r" style={{ backgroundColor: '#fff' }} />
                    <td className="px-2 py-1 border-r" style={{ backgroundColor: '#fff' }} />
                    {DIAS.map(dia => {
                      const fecha = new Date(anioSeleccionado, mesSeleccionado - 1, dia);
                      const esFinDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
                      return (
                        <td key={dia} className="p-0 border-r" style={{ backgroundColor: esFinDeSemana ? '#F8FAFC' : '#FFFFFF', borderColor: '#E5E7EB' }}>
                          <div className="w-9 h-9" />
                        </td>
                      );
                    })}
                    <td className="px-3 py-1.5 border-l text-center" style={{ backgroundColor: '#fff' }} />
                    {esAdmin && <td className="px-2 py-1.5 border-l print:hidden" style={{ backgroundColor: '#fff' }} />}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="hidden print:block mt-10">
        <div className="grid grid-cols-3 gap-10 mt-10">
          <div className="text-center">
            <div className="border-b border-black mb-3 h-16"></div>
            <p className="text-sm font-medium">Jefe de Area</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-3 h-16"></div>
            <p className="text-sm font-medium">Jefe de Personal</p>
          </div>
          <div className="text-center">
            <div className="border-b border-black mb-3 h-16"></div>
            <p className="text-sm font-medium">Director</p>
          </div>
        </div>
      </div>
      {/* Tooltip fixed - escapa de cualquier overflow */}
      {hoveredCell && (() => {
        const info = celdasModificadas instanceof Map ? celdasModificadas.get(hoveredCell) : null;
        if (!info) return null;
        return (
          <div
            className="fixed px-3 py-2 bg-gray-900 text-white text-[10px] rounded-lg shadow-xl pointer-events-none z-[9999] whitespace-nowrap border border-gray-700"
            style={{ left: tooltipPos.x, top: tooltipPos.y, transform: 'translate(-50%, -100%)' }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-1.5 h-1.5 rounded-full ${info.tipo === 'solicitud' ? 'bg-blue-400' : 'bg-emerald-400'}`} />
              <span className="font-semibold">{info.tipo === 'solicitud' ? 'Solicitud' : 'Cambio directo'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <span className="line-through opacity-60">{info.turnoAnterior || info.valorAnterior || 'Sin turno'}</span>
              <span className="text-emerald-400 font-bold">→</span>
              <span className="font-medium text-white">{info.turnoNuevo || info.valorNuevo || 'Sin turno'}</span>
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          </div>
        );
      })()}
    </div>
  );
};

export default TablaRol;