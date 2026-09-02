// src/components/ocr/VistaUsuario.jsx
// VISTA PARA USUARIO BASE — Con separación entre celdas

import React, { useMemo, useCallback } from 'react';
import { User, ChevronLeft, ChevronRight, Calendar, Clock } from 'lucide-react';
import { TURNO_MAP, MESES, DIAS_SEMANA } from './constantes';

// Helper: hex a rgba con opacidad ajustable
const hexToRgba = (hex, alpha) => {
  if (!hex || !hex.startsWith('#')) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Formatear nombre completo
const formatearNombre = (emp) => {
  if (!emp) return '';
  const partes = [emp.grado || '', emp.nombre || ''].filter(Boolean);
  return partes.join(' ');
};

const VistaUsuario = ({
  personalFiltrado,
  turnos,
  DIAS,
  mesSeleccionado,
  anioSeleccionado,
  areaAsignada,
  responsable,
  user,
  onCeldaClick,
  rolHabilitado,
  onMesChange,
  onAnioChange,
  cargando,
}) => {
  const emp = personalFiltrado?.[0];
  if (!emp) return null;

  const today = new Date();
  const diaActual = today.getDate();
  const mesActual = today.getMonth() + 1;
  const anioActual = today.getFullYear();
  const esMesActual = mesSeleccionado === mesActual && anioSeleccionado === anioActual;

  const turnosEmpleado = turnos[emp.id] || {};

  // Stats
  const stats = useMemo(() => {
    let horas = 0, trabajo = 0, francos = 0;
    DIAS.forEach(d => {
      const cod = turnosEmpleado[d] || '';
      const t = TURNO_MAP[cod];
      if (!t) return;
      if (t.horas > 0) horas += t.horas;
      if (cod === 'F' || cod === 'FE') francos++;
      else if (t.horas > 0) trabajo++;
    });
    return { horas, trabajo, francos };
  }, [turnosEmpleado, DIAS]);

  // Calendar grid
  const calendarWeeks = useMemo(() => {
    const firstDay = new Date(anioSeleccionado, mesSeleccionado - 1, 1).getDay();
    const offset = firstDay === 0 ? 6 : firstDay - 1;
    const cells = [];

    for (let i = 0; i < offset; i++) cells.push({ empty: true, key: `e${i}` });
    for (let d = 1; d <= DIAS.length; d++) {
      const cod = turnosEmpleado[d] || '';
      const t = TURNO_MAP[cod];
      const fecha = new Date(anioSeleccionado, mesSeleccionado - 1, d);
      const dow = fecha.getDay();
      cells.push({
        empty: false, dia: d, cod, turno: t,
        esFinDeSemana: dow === 0 || dow === 6,
        esHoy: esMesActual && d === diaActual,
        key: d,
      });
    }
    while (cells.length % 7 !== 0) cells.push({ empty: true, key: `t${cells.length}` });

    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, [DIAS, turnosEmpleado, mesSeleccionado, anioSeleccionado, esMesActual, diaActual]);

  const turnoHoy = esMesActual ? turnosEmpleado[diaActual] : '';
  const turnoHoyInfo = TURNO_MAP[turnoHoy];

  // Colores con opacidad 0.45
  const bgColor = (turno, esFinDeSemana = false) => {
    if (!turno) return 'transparent';
    const alpha = esFinDeSemana ? 0.35 : 0.45;
    return hexToRgba(turno.color, alpha);
  };
  
  const borderColor = (turno) => {
    if (!turno) return '#E5E7EB';
    return hexToRgba(turno.color, 0.6);
  };

  const navigateMonth = useCallback((direction) => {
    let newMes = mesSeleccionado + direction;
    let newAnio = anioSeleccionado;
    if (newMes > 12) { newMes = 1; newAnio++; }
    if (newMes < 1) { newMes = 12; newAnio--; }
    // Solo llamar onAnioChange si el año cambió (evita limpieza redundante de estado)
    if (newAnio !== anioSeleccionado && onAnioChange) onAnioChange({ target: { value: newAnio } });
    if (onMesChange) onMesChange({ target: { value: newMes } });
  }, [mesSeleccionado, anioSeleccionado, onMesChange, onAnioChange]);

  const getBadgeStyle = (turno) => {
    if (!turno) return {};
    return {
      backgroundColor: hexToRgba(turno.color, 0.45),
      color: turno.texto,
      borderColor: hexToRgba(turno.color, 0.7),
      borderWidth: '1.5px',
      borderStyle: 'solid',
    };
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/30 print:bg-white">
      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-6 max-w-6xl mx-auto w-full min-h-0 print:p-4">

        {/* ===== SIDEBAR ===== */}
        <div className="lg:w-56 flex-shrink-0">
          {/* Perfil */}
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate" title={formatearNombre(emp)}>
                  {formatearNombre(emp)}
                </p>
                <p className="text-xs text-gray-400 truncate">{emp.area || 'Sin área'}</p>
              </div>
            </div>
            {!rolHabilitado && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  Solo consulta
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mt-3 bg-white rounded-lg border border-gray-100 p-4">
            <div className="flex justify-between text-center">
              <div>
                <p className="text-lg font-semibold text-gray-700">{stats.trabajo}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Turnos</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className="text-lg font-semibold text-gray-700">{stats.francos}</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Francos</p>
              </div>
              <div className="w-px bg-gray-100" />
              <div>
                <p className="text-lg font-semibold text-gray-700">{stats.horas}h</p>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Horas</p>
              </div>
            </div>
          </div>

          {/* Hoy */}
          {esMesActual && turnoHoyInfo && (
            <div className="mt-3 bg-white rounded-lg border border-gray-100 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Hoy</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: turnoHoyInfo.texto }}>
                    {turnoHoyInfo.nombre}
                  </span>
                  <span 
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={getBadgeStyle(turnoHoyInfo)}
                  >
                    {turnoHoy}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===== CALENDARIO CON SEPARACIÓN ===== */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 min-w-[120px] justify-center">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
                    {MESES[mesSeleccionado - 1]} <span className="text-gray-400">{anioSeleccionado}</span>
                  </span>
                </div>
                <button
                  onClick={() => navigateMonth(1)}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {!esMesActual && (
                <button
                  onClick={() => {
                    if (onMesChange) onMesChange({ target: { value: mesActual } });
                    if (onAnioChange) onAnioChange({ target: { value: anioActual } });
                  }}
                  className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Hoy
                </button>
              )}
            </div>

            {/* Días de la semana con separación */}
            <div className="grid grid-cols-7 gap-1 px-1 pt-2">
              {DIAS_SEMANA.map((d, i) => (
                <div 
                  key={d.id} 
                  className={`py-1.5 text-center text-[10px] font-medium uppercase tracking-wider ${
                    i >= 5 ? 'text-gray-300' : 'text-gray-400'
                  }`}
                >
                  {d.corto}
                </div>
              ))}
            </div>

            {/* Grid - celdas de 60px CON GAP y bordes redondeados */}
            <div className="p-1">
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 gap-1 mb-1 last:mb-0">
                  {week.map((cell) => {
                    if (cell.empty) return (
                      <div key={cell.key} style={{ height: '60px' }} />
                    );

                    const { dia, cod, turno, esFinDeSemana, esHoy } = cell;

                    return (
                      <div
                        key={cell.key}
                        onClick={() => onCeldaClick && onCeldaClick(emp.id, dia)}
                        className={`
                          relative cursor-pointer transition-all rounded-lg
                          hover:scale-[1.03] active:scale-[0.97]
                          ${esHoy ? 'ring-2 ring-emerald-500 ring-offset-1 z-10 shadow-sm' : ''}
                          ${esFinDeSemana && !turno ? 'bg-gray-50/50' : ''}
                        `}
                        style={{ 
                          height: '60px',
                          backgroundColor: bgColor(turno, esFinDeSemana),
                          borderBottom: turno ? `3px solid ${borderColor(turno)}` : 'none',
                        }}
                      >
                        {/* Número */}
                        <span className={`
                          absolute top-1 left-1.5 text-[10px] font-medium
                          ${esHoy ? 'text-emerald-600 font-bold' : ''}
                          ${!esHoy && turno ? 'text-gray-600' : ''}
                          ${!esHoy && !turno ? 'text-gray-300' : ''}
                        `}>
                          {dia}
                        </span>

                        {/* Turno */}
                        {turno && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span 
                              className="text-xs font-semibold"
                              style={{ color: turno.texto }}
                            >
                              {turno.nombre}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estado vacío */}
      {stats.trabajo === 0 && DIAS.length > 0 && turnosEmpleado[1] === undefined && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="text-center">
            <Calendar className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Sin turnos asignados</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VistaUsuario;