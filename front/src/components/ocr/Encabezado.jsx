// src/components/ocr/Encabezado.jsx
// Barra de herramientas - CON CAMBIAR CONTRASEÑA SIEMPRE VISIBLE

import React, { useState, useRef, useEffect } from 'react';
import { 
  Save, RefreshCw, Printer, LogOut, 
  Loader2, Search, Shield, ChevronDown, Check,
  Zap, Trash2, Copy, Repeat, ChevronUp, Plus, Minus, SaveIcon, Play, ChevronLeft, ChevronRight,
  UserPlus, X, Users, Building2, GraduationCap, Inbox,
  UserCog, Calendar, Clock, Key
} from 'lucide-react';
import { COLOR_PRIMARIO, MESES, ANIOS, DIAS_SEMANA, GRUPOS_DIAS_SEMANA, TURNO_MAP } from './constantes';

const TURNOS_RAPIDOS = Object.keys(TURNO_MAP);
const TURNOS_LISTA = Object.values(TURNO_MAP).filter((v, i, a) => a.findIndex(t => t.codigo === v.codigo) === i);
const STORAGE_PLANTILLAS = 'ocr_plantillas_rotativas';
const VISIBLES = 10;

const btnBase = "p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors";

const SelectPersonalizado = ({ value, onChange, opciones, placeholder, disabled = false, conBusqueda = false }) => {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  
  useEffect(() => {
    if (abierto && conBusqueda && inputRef.current) {
      inputRef.current.focus();
    }
  }, [abierto, conBusqueda]);
  
  const seleccionado = opciones.find(o => o.value === value);
  
  const opcionesFiltradas = conBusqueda && busqueda.trim()
    ? opciones.filter(o => o.label.toLowerCase().includes(busqueda.toLowerCase()))
    : opciones;
  
  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => !disabled && setAbierto(!abierto)}
        disabled={disabled}
        className={`h-8 flex items-center gap-2 px-3 rounded-lg text-xs font-medium border bg-white transition-all min-w-[70px] ${
          disabled ? 'border-gray-100 text-gray-400 cursor-not-allowed opacity-60' : 'border-gray-200 hover:border-gray-300 text-gray-600'
        }`}
      >
        <span className="flex-1 text-left truncate">{seleccionado?.label || placeholder || 'Seleccionar'}</span>
        {!disabled && <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform flex-shrink-0 ${abierto ? 'rotate-180' : ''}`} />}
      </button>
      {abierto && !disabled && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999] min-w-[200px] w-max max-h-72 overflow-hidden">
          {conBusqueda && (
            <div className="p-2 border-b border-gray-100">
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="w-full h-7 px-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-300"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="overflow-y-auto max-h-56">
            {opcionesFiltradas.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">Sin resultados</div>
            ) : (
              opcionesFiltradas.map((opcion) => {
                const sel = opcion.value === value;
                return (
                  <button key={opcion.value} onClick={() => { onChange(opcion.value); setAbierto(false); setBusqueda(''); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between gap-2 ${sel ? 'bg-gray-50 text-gray-800 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <span>{opcion.label}</span>
                    {sel && <Check className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Encabezado = ({
  esAdmin, areaAsignada, responsable, personalLength, rolHabilitado,
  onFinalizar, onHabilitar, onGuardar, onImprimir, onSalir, onPanelAdmin, onAbrirCambiosTurno, guardando,
  hojaSeleccionada, hojasDisponibles, onHojaChange,
  mesSeleccionado, onMesChange, anioSeleccionado, onAnioChange,
  onConfigClick, onRecargar, cargando,
  busqueda, onBusquedaChange,
  turnoActivo, onSelectTurno,
  diasSeleccionadosSemana, onToggleDia, onSeleccionarGrupo,
  diasAfectados, totalDiasMes,
  seleccionadosSize,
  onLimpiarSeleccion, onLimpiarTurnos,
  mostrarAgregar, onToggleAgregar, 
  personalDisponible, busquedaPersonalAgregar, onBusquedaPersonalAgregarChange,
  onAgregarPersonal,
  onAplicarPatron, onCopiarFila, onAplicarPatronRotativo,
  onRegistrarDescanso, onRegistrarVacaciones,
  totalTurnos, completos, totalHorasRol,
  onAbrirAdminUsuarios = null,
  onAbrirCambiarPassword = null,
  esJefe = false,
  esUsuario = false,
  user = null,
  areaSeleccionadaJefe = null,
  onAreaChangeJefe = null,
  areasDisponiblesJefe = [],
  areaSeleccionadaAdmin = null,
  onAreaChangeAdmin = null,
  areasDisponiblesAdmin = [],
  puedeEditar = false,
  puedeImprimir = false,
  puedeBandeja = false,
  puedeSolicitarCambio = false,
  puedeDescansoMedico = false,
  puedeVacaciones = false,
  rolGuardado = false
}) => {
  const opcionesHojas = hojasDisponibles.map(h => ({ value: h, label: h }));
  const opcionesMeses = MESES.map((nombre, i) => ({ value: i + 1, label: nombre }));
  const opcionesAnios = ANIOS.map(a => ({ value: a, label: String(a) }));
  const handleHojaChange = (val) => onHojaChange({ target: { value: val } });
  const handleMesChange = (val) => onMesChange({ target: { value: val } });
  const handleAnioChange = (val) => onAnioChange({ target: { value: val } });

  const opcionesAreaJefe = areasDisponiblesJefe.map(area => ({ value: area, label: area }));

  const [mostrarDias, setMostrarDias] = useState(false);
  const [mostrarRotacion, setMostrarRotacion] = useState(false);
  const [patron, setPatron] = useState(['M', 'T', 'N']);
  const [inicio, setInicio] = useState(0);
  const [plantillas, setPlantillas] = useState(() => {
    try { const g = localStorage.getItem(STORAGE_PLANTILLAS); return g ? JSON.parse(g) : []; } catch { return []; }
  });
  const [nombreNueva, setNombreNueva] = useState('');
  const [mostrarGuardar, setMostrarGuardar] = useState(false);
  const [indiceCarrusel, setIndiceCarrusel] = useState(0);

  useEffect(() => {
    const h = (e) => {
      if (mostrarDias) {
        const panel = document.getElementById('panel-turnos-rapidos');
        const btn = document.getElementById('btn-turnos-rapidos');
        if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
          setMostrarDias(false);
        }
      }
      if (mostrarRotacion) {
        const panel = document.getElementById('panel-rotacion');
        const btn = document.getElementById('btn-rotacion');
        if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
          setMostrarRotacion(false);
        }
      }
      if (mostrarAgregar) {
        const panel = document.getElementById('panel-agregar-personal');
        const btn = document.getElementById('btn-agregar-personal');
        if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
          onToggleAgregar();
        }
      }
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, [mostrarDias, mostrarRotacion, mostrarAgregar, onToggleAgregar]);

  useEffect(() => {
    const contenedor = document.getElementById('carrusel-turnos');
    if (!contenedor) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      if (e.deltaY > 0) {
        if (indiceCarrusel + VISIBLES < TURNOS_RAPIDOS.length) {
          setIndiceCarrusel(prev => Math.min(prev + 3, TURNOS_RAPIDOS.length - VISIBLES));
        }
      } else {
        if (indiceCarrusel > 0) {
          setIndiceCarrusel(prev => Math.max(prev - 3, 0));
        }
      }
    };

    contenedor.addEventListener('wheel', handleWheel, { passive: false });
    return () => contenedor.removeEventListener('wheel', handleWheel);
  }, [indiceCarrusel]);

  const turnosVisibles = TURNOS_RAPIDOS.slice(indiceCarrusel, indiceCarrusel + VISIBLES);

  const agregarPatron = () => { if (patron.length < 7) setPatron([...patron, 'M']); };
  const quitarPatron = (i) => { if (patron.length > 2) setPatron(patron.filter((_, idx) => idx !== i)); };
  const cambiarPatron = (i, v) => { const n = [...patron]; n[i] = v; setPatron(n); };
  const cargarPlantilla = (p) => { setPatron([...p.patron]); setInicio(0); };
  const guardarPlantilla = () => {
    if (!nombreNueva.trim()) return;
    const n = [...plantillas, { id: 'c-' + Date.now(), nombre: nombreNueva.trim(), patron: [...patron] }];
    setPlantillas(n); localStorage.setItem(STORAGE_PLANTILLAS, JSON.stringify(n));
    setNombreNueva(''); setMostrarGuardar(false);
  };
  const handleAplicarRotacion = () => {
    if (onAplicarPatronRotativo && seleccionadosSize > 0 && diasAfectados.length > 0) {
      onAplicarPatronRotativo(patron, diasAfectados, inicio);
    }
  };

  const btnDia = (sel) => `w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold border transition-all ${
    sel ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
  }`;
  const btnGrupo = (sel) => `px-2 py-1 rounded text-[10px] font-medium border transition-all ${
    sel ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'
  }`;

  const personalDisponibleFiltrado = busquedaPersonalAgregar 
    ? personalDisponible.filter(p => 
        p.nombre?.toLowerCase().includes(busquedaPersonalAgregar.toLowerCase()) ||
        p.grado?.toLowerCase().includes(busquedaPersonalAgregar.toLowerCase()) ||
        p.area?.toLowerCase().includes(busquedaPersonalAgregar.toLowerCase()) ||
        p.dni?.includes(busquedaPersonalAgregar)
      )
    : personalDisponible;

  const personalAgrupado = personalDisponibleFiltrado.reduce((acc, emp) => {
    const area = emp.area || 'Sin área';
    if (!acc[area]) acc[area] = [];
    acc[area].push(emp);
    return acc;
  }, {});

  const mostrarAreaLabel = esAdmin ? `Admin${areaSeleccionadaAdmin && areaSeleccionadaAdmin !== 'TODAS' ? ` - ${areaSeleccionadaAdmin}` : ''}` : (esJefe ? `Jefe de ${areaSeleccionadaJefe || areaAsignada}` : areaAsignada);
  const mostrarSelectorJefe = esJefe && areasDisponiblesJefe.length > 1;

  return (
    <header className="sticky top-0 z-30 print:hidden bg-white border-b border-gray-100">
      {/* ============================================================
          PRIMERA FILA: Logo, área, botones principales
          ============================================================ */}
      <div className="max-w-full mx-auto px-5 h-11 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <div className="w-7 h-7 rounded-md bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
            <img src="/images/escudo-sanidad.png" alt="HRPA" className="w-5 h-5 object-contain" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          
          <span className="text-sm font-semibold text-gray-800 truncate">
            {mostrarAreaLabel}
          </span>
          
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${
            rolHabilitado ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {rolHabilitado ? 'Abierto' : 'Cerrado'}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 overflow-visible">
          {/* Selector de Área - Admin (antes del mes) */}
          {esAdmin && onAreaChangeAdmin && areasDisponiblesAdmin.length > 1 && (
            <div className="flex-shrink-0">
              <SelectPersonalizado 
                value={areaSeleccionadaAdmin || 'TODAS'} 
                onChange={onAreaChangeAdmin} 
                opciones={areasDisponiblesAdmin.map(a => ({ value: a, label: a === 'TODAS' ? 'Todas las áreas' : a }))} 
                placeholder="Filtrar área"
                disabled={cargando || guardando}
                conBusqueda={true}
              />
            </div>
          )}

          {/* Selector de Área - Jefes (antes del mes) */}
          {mostrarSelectorJefe && onAreaChangeJefe && (
            <div className="flex-shrink-0">
              <SelectPersonalizado 
                value={areaSeleccionadaJefe || areaAsignada} 
                onChange={onAreaChangeJefe} 
                opciones={opcionesAreaJefe} 
                placeholder="Cambiar área"
                disabled={cargando || guardando}
                conBusqueda={areasDisponiblesJefe.length > 5}
              />
            </div>
          )}

          {/* Selector de Hoja (Mes) - Admin y Jefes */}
          {(esAdmin || esJefe) && (
            <div className="flex-shrink-0">
              <SelectPersonalizado 
                value={hojaSeleccionada} 
                onChange={handleHojaChange} 
                opciones={opcionesHojas} 
                placeholder="Mes"
                disabled={cargando || guardando}
              />
            </div>
          )}

          {/* ============================================================
              BOTONES ADMINISTRADOR
              ============================================================ */}
          {esAdmin && (
            <>
              {onPanelAdmin && (
                <button onClick={onPanelAdmin} className={btnBase} title="Panel de Control">
                  <Shield className="w-4 h-4" />
                </button>
              )}

              {onAbrirAdminUsuarios && (
                <button 
                  onClick={onAbrirAdminUsuarios} 
                  className={`${btnBase} relative`} 
                  title="Administrar Usuarios"
                >
                  <UserCog className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emerald-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {personalLength || 0}
                  </span>
                </button>
              )}

              <span className="w-px h-5 bg-gray-200 mx-1 flex-shrink-0" />

              {onRecargar && (
                <button onClick={onRecargar} disabled={cargando} className={btnBase} title="Recargar">
                  <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Admin: Sin botón Guardar (tiempo real), Imprimir siempre visible */}
              {puedeImprimir && onImprimir && (
                <button onClick={onImprimir} className={`${btnBase} flex-shrink-0`} title="Imprimir">
                  <Printer className="w-4 h-4" />
                </button>
              )}

              {puedeBandeja && onAbrirCambiosTurno && (
                <button onClick={onAbrirCambiosTurno} className={`${btnBase} flex-shrink-0`} title="Bandeja">
                  <Inbox className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* ============================================================
              BOTONES JEFE
              ============================================================ */}
          {esJefe && !esAdmin && (
            <>
              {onRecargar && (
                <button onClick={onRecargar} disabled={cargando} className={btnBase} title="Recargar">
                  <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                </button>
              )}

              {/* Jefe: Guardar para bloquear el rol */}
              {onGuardar && !rolGuardado && (
                <button onClick={onGuardar} disabled={guardando}
                  className="h-8 px-4 text-xs font-semibold text-white rounded-lg transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                  style={{ backgroundColor: COLOR_PRIMARIO }}>
                  {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : <Save className="w-3.5 h-3.5 flex-shrink-0" />}
                  Guardar
                </button>
              )}

              {puedeBandeja && onAbrirCambiosTurno && (
                <button onClick={onAbrirCambiosTurno} className={`${btnBase} flex-shrink-0`} title="Bandeja">
                  <Inbox className="w-4 h-4" />
                </button>
              )}

              {puedeImprimir && onImprimir && rolGuardado && (
                <button onClick={onImprimir} className={`${btnBase} flex-shrink-0`} title="Imprimir">
                  <Printer className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {/* ============================================================
              BOTONES USUARIO BASE
              ============================================================ */}
          {esUsuario && !esAdmin && !esJefe && (
            <>
              {puedeSolicitarCambio && onAbrirCambiosTurno && (
                <button onClick={onAbrirCambiosTurno} 
                  className="h-8 px-3 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" /> Solicitar Cambio
                </button>
              )}

              {puedeDescansoMedico && onRegistrarDescanso && (
                <button onClick={onRegistrarDescanso} 
                  className="h-8 px-3 text-xs font-medium rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0" /> Descanso Médico
                </button>
              )}
            </>
          )}

          {/* ============================================================
              BOTONES COMPARTIDOS (Todos los usuarios autenticados)
              ============================================================ */}
          
          {/* ⭐ Cambiar Contraseña - SIEMPRE VISIBLE para todos los usuarios autenticados */}
          <button 
            onClick={() => {
              if (onAbrirCambiarPassword) {
                onAbrirCambiarPassword();
              } else {
                console.warn('⚠️ [Encabezado] onAbrirCambiarPassword no está definido');
              }
            }} 
            className={`${btnBase} relative`} 
            title="Cambiar Contraseña"
          >
            <Key className="w-4 h-4" />
          </button>

          {/* Salir - Siempre visible */}
          <button onClick={onSalir} className={`${btnBase} hover:text-red-500 flex-shrink-0`} title="Salir">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================
          SEGUNDA FILA: Buscador, turnos, AGREGAR PERSONAL
          ============================================================ */}
      {rolHabilitado && (esAdmin || esJefe) && (
        <>
          <div className="px-5 py-2 border-t border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-3">
              
              {/* Buscador */}
              {(esAdmin || esJefe) && (
                <div className="relative flex-1 max-w-[200px] min-w-[160px] flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input 
                    value={busqueda} 
                    onChange={(e) => onBusquedaChange(e.target.value)} 
                    placeholder="Buscar empleado..."
                    className="w-full h-8 pl-8 pr-8 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300 focus:border-emerald-300 bg-white" 
                  />
                  {busqueda && (
                    <button onClick={() => onBusquedaChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <div className="w-px h-5 bg-gray-300 flex-shrink-0" />

              {/* Carrusel de Turnos */}
              <div 
                id="carrusel-turnos"
                className="flex items-center gap-1 flex-shrink-0"
              >
                <span className="text-[10px] text-gray-500 font-medium mr-1 whitespace-nowrap">Turno activo:</span>
                <button 
                  onClick={() => setIndiceCarrusel(prev => Math.max(prev - 1, 0))}
                  disabled={indiceCarrusel === 0}
                  className="w-6 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                
                <div className="flex items-center gap-1 transition-all duration-300 ease-out">
                  {turnosVisibles.map(codigo => {
                    const t = TURNO_MAP[codigo];
                    if (!t) return null;
                    const activo = turnoActivo === codigo;
                    return (
                      <div key={codigo} className="turno-wrapper">
                        <button 
                          onClick={() => onSelectTurno(codigo)}
                          className={`w-7 h-7 rounded-lg text-[10px] font-bold transition-all flex-shrink-0 ${
                            activo 
                              ? 'ring-2 ring-emerald-500 scale-110 shadow-md' 
                              : 'hover:scale-105 opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: t.color, color: t.texto }}
                        >
                          {codigo}
                        </button>
                        <div className="turno-tooltip">
                          <span className="font-semibold">{t.nombre}</span>
                          <span className="text-gray-400 mx-1">·</span>
                          <span>{t.horas}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button 
                  onClick={() => setIndiceCarrusel(prev => Math.min(prev + 1, TURNOS_RAPIDOS.length - VISIBLES))}
                  disabled={indiceCarrusel + VISIBLES >= TURNOS_RAPIDOS.length}
                  className="w-6 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-default transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-px h-5 bg-gray-300 flex-shrink-0" />

              {/* Agregar Personal */}
              {(esAdmin || esJefe) && onToggleAgregar && (
                <div className="relative flex-shrink-0">
                  <button 
                    id="btn-agregar-personal"
                    onClick={onToggleAgregar}
                    className={`h-8 px-3 text-[11px] font-medium rounded-lg border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      mostrarAgregar 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Agregar personal
                    <ChevronDown className={`w-3 h-3 transition-transform ${mostrarAgregar ? 'rotate-180' : ''}`} />
                  </button>

                  {mostrarAgregar && (
                    <div id="panel-agregar-personal" className="absolute top-full mt-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-2xl z-[9999]" style={{ width: '420px' }}>
                      <div className="px-5 py-3 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <Users className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-gray-800">Agregar Personal</h3>
                              <p className="text-[10px] text-gray-400">Traer empleados de otras areas a {areaAsignada}</p>
                            </div>
                          </div>
                          <button onClick={onToggleAgregar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={busquedaPersonalAgregar}
                            onChange={(e) => onBusquedaPersonalAgregarChange(e.target.value)}
                            placeholder="Buscar por nombre, grado, DNI o area..."
                            className="w-full h-9 pl-9 pr-4 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 bg-gray-50"
                          />
                          {busquedaPersonalAgregar && (
                            <button onClick={() => onBusquedaPersonalAgregarChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-[350px] overflow-y-auto">
                        {Object.keys(personalAgrupado).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 px-5">
                            <Users className="w-12 h-12 text-gray-200 mb-3" />
                            <p className="text-sm font-medium text-gray-400">
                              {busquedaPersonalAgregar ? 'Sin resultados' : 'No hay personal disponible'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {busquedaPersonalAgregar ? 'Intenta con otros terminos de busqueda' : 'Todo el personal ya esta asignado a esta area'}
                            </p>
                          </div>
                        ) : (
                          Object.entries(personalAgrupado).map(([area, empleados]) => (
                            <div key={area} className="border-b border-gray-50 last:border-b-0">
                              <div className="px-5 py-2 bg-gray-50/50 flex items-center gap-2 sticky top-0 z-10 backdrop-blur-sm">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{area}</span>
                                <span className="text-[10px] text-gray-400 ml-auto">{empleados.length} empleado{empleados.length > 1 ? 's' : ''}</span>
                              </div>
                              
                              <div className="divide-y divide-gray-50">
                                {empleados.map(emp => (
                                  <button
                                    key={emp.id}
                                    onClick={() => {
                                      onAgregarPersonal(emp);
                                    }}
                                    className="w-full text-left px-5 py-3 hover:bg-emerald-50/50 transition-all group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <GraduationCap className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                          <span className="text-[11px] font-semibold text-gray-500 truncate">{emp.grado}</span>
                                        </div>
                                        <p className="text-[13px] font-semibold text-gray-800 truncate ml-5.5">{emp.nombre}</p>
                                        {emp.dni && <p className="text-[10px] text-gray-400 ml-5.5 mt-0.5">DNI: {emp.dni}</p>}
                                      </div>
                                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                        <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">Agregar</span>
                                        <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all flex-shrink-0">
                                          <Plus className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">{personalDisponible.length} personas disponibles</span>
                          {busquedaPersonalAgregar && <span className="text-[10px] text-gray-400">{personalDisponibleFiltrado.length} resultados</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {seleccionadosSize > 0 && (
                <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                  <span className="text-[10px] text-gray-500">{seleccionadosSize} seleccionado{seleccionadosSize > 1 ? 's' : ''}</span>
                  <button onClick={onLimpiarSeleccion} className="h-7 px-2 text-[10px] font-medium text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">Cancelar</button>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              TERCERA FILA: Acciones rápidas
              ============================================================ */}
          <div className="px-5 py-1.5 border-t border-gray-100">
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Turnos Rápidos */}
              <div className="relative flex-shrink-0">
                <button 
                  id="btn-turnos-rapidos"
                  onClick={() => { setMostrarDias(!mostrarDias); setMostrarRotacion(false); }}
                  className={`h-7 px-3 text-[10px] font-medium rounded-lg border flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    mostrarDias ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  Turnos rapidos
                  {diasAfectados.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">{diasAfectados.length}</span>
                  )}
                  {mostrarDias ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
                </button>
                
                {mostrarDias && (
                  <div id="panel-turnos-rapidos" className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-3 w-80 z-[9999]">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Seleccionar dias de la semana</p>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {GRUPOS_DIAS_SEMANA.map(g => {
                        const sel = JSON.stringify([...diasSeleccionadosSemana].sort()) === JSON.stringify([...g.dias].sort());
                        return <button key={g.id} onClick={() => onSeleccionarGrupo(g)} className={btnGrupo(sel)}>{g.nombre}</button>;
                      })}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {DIAS_SEMANA.map(d => {
                        const sel = diasSeleccionadosSemana.includes(d.id);
                        return <button key={d.id} onClick={() => onToggleDia(d.id)} className={btnDia(sel)} title={d.nombre}>{d.inicial}</button>;
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">
                      {diasAfectados.length > 0 ? `${diasAfectados.length} dias seleccionados de ${totalDiasMes}` : 'Selecciona dias para activar acciones rapidas'}
                    </p>
                  </div>
                )}
              </div>

              {/* Rotación */}
              <div className="relative flex-shrink-0">
                <button 
                  id="btn-rotacion"
                  onClick={() => { setMostrarRotacion(!mostrarRotacion); setMostrarDias(false); }}
                  disabled={seleccionadosSize === 0 || diasAfectados.length === 0}
                  className={`h-7 px-3 text-[10px] font-medium rounded-lg border flex items-center gap-1.5 transition-all disabled:opacity-40 whitespace-nowrap ${
                    mostrarRotacion ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <Repeat className="w-3 h-3" /> 
                  Rotacion
                  {mostrarRotacion ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
                </button>
                
                {mostrarRotacion && (
                  <div id="panel-rotacion" className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[9999]" style={{ minWidth: '500px' }}>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Plantillas guardadas</p>
                        {plantillas.length === 0 ? (
                          <p className="text-[10px] text-gray-400 py-2">Sin plantillas guardadas.</p>
                        ) : (
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {plantillas.map(p => (
                              <button key={p.id} onClick={() => cargarPlantilla(p)}
                                className="w-full text-left p-1.5 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
                                <p className="text-[10px] font-semibold text-gray-700 truncate">{p.nombre}</p>
                                <div className="flex gap-0.5 mt-1">
                                  {p.patron.map((c, i) => {
                                    const t = TURNO_MAP[c];
                                    return <span key={i} className="w-4 h-4 rounded text-[7px] font-bold flex items-center justify-center"
                                      style={{ backgroundColor: t?.color, color: t?.texto }}>{c}</span>;
                                  })}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Patron ({patron.length})</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {patron.map((codigo, i) => {
                            return (
                              <div key={i} className={`flex items-center gap-1 bg-gray-50 rounded p-1 border ${inicio === i ? 'border-emerald-400 bg-emerald-50' : 'border-transparent'}`}>
                                <button onClick={() => setInicio(i)}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${inicio === i ? 'bg-emerald-600 text-white' : 'bg-white text-gray-500 border border-gray-300'}`}>
                                  {i + 1}
                                </button>
                                <select value={codigo} onChange={(e) => cambiarPatron(i, e.target.value)}
                                  className="flex-1 h-5 text-[10px] border border-gray-200 rounded bg-white px-1">
                                  {TURNOS_LISTA.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>)}
                                </select>
                                {patron.length > 2 && (
                                  <button onClick={() => quitarPatron(i)} className="p-0.5 text-gray-300 hover:text-red-500"><Minus className="w-2.5 h-2.5" /></button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          {patron.length < 7 && (
                            <button onClick={agregarPatron} className="flex-1 h-6 text-[10px] font-medium text-gray-500 border border-dashed border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center gap-1">
                              <Plus className="w-2.5 h-2.5" /> Agregar
                            </button>
                          )}
                          <button onClick={() => setMostrarGuardar(!mostrarGuardar)}
                            className="h-6 px-2 text-[10px] font-medium text-gray-500 border border-gray-200 rounded hover:bg-gray-50 flex items-center gap-1">
                            <SaveIcon className="w-2.5 h-2.5" /> Guardar
                          </button>
                        </div>
                        {mostrarGuardar && (
                          <div className="flex gap-1 mt-1.5">
                            <input value={nombreNueva} onChange={(e) => setNombreNueva(e.target.value)} placeholder="Nombre..." 
                              className="flex-1 h-6 text-[10px] border border-gray-200 rounded px-2" />
                            <button onClick={guardarPlantilla} disabled={!nombreNueva.trim()}
                              className="h-6 px-2 text-[10px] font-semibold text-white rounded disabled:opacity-40" style={{ backgroundColor: COLOR_PRIMARIO }}>OK</button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Vista previa</p>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <div className="flex gap-0.5 flex-wrap">
                              {diasAfectados.slice(0, 21).map((dia, idx) => {
                                const c = patron[(idx + inicio) % patron.length];
                                const t = TURNO_MAP[c];
                                return <span key={idx} className="w-5 h-5 rounded text-[8px] font-bold flex items-center justify-center"
                                  style={{ backgroundColor: t?.color, color: t?.texto }}>{c}</span>;
                              })}
                            </div>
                          </div>
                        </div>
                        <button onClick={handleAplicarRotacion} disabled={diasAfectados.length === 0 || seleccionadosSize === 0}
                          className="w-full h-8 mt-2 text-xs font-semibold text-white rounded-lg disabled:opacity-40 flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: '#4B5563' }}>
                          <Play className="w-3 h-3" /> Aplicar rotacion
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {seleccionadosSize > 0 && (
                <>
                  <div className="w-px h-5 bg-gray-300 flex-shrink-0" />
                  <button onClick={onAplicarPatron} disabled={diasAfectados.length === 0}
                    className="h-7 px-3 text-[10px] font-semibold text-white rounded-lg disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap transition-all hover:opacity-90 flex-shrink-0"
                    style={{ backgroundColor: COLOR_PRIMARIO }}>
                    <Zap className="w-3 h-3 flex-shrink-0" /> Aplicar {turnoActivo}
                  </button>
                  {seleccionadosSize > 1 && (
                    <button onClick={onCopiarFila} 
                      className="h-7 px-2.5 text-[10px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                      <Copy className="w-3 h-3 flex-shrink-0" /> Copiar fila
                    </button>
                  )}
                  <button onClick={onLimpiarTurnos} 
                    className="h-7 px-2.5 text-[10px] font-medium text-red-500 bg-white border border-red-200 rounded-lg hover:bg-red-50 hover:text-red-600 flex items-center gap-1.5 whitespace-nowrap flex-shrink-0">
                    <Trash2 className="w-3 h-3 flex-shrink-0" /> Limpiar turnos
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        .turno-wrapper {
          position: relative;
          display: inline-flex;
        }
        .turno-wrapper:hover {
          z-index: 10000;
        }
        .turno-tooltip {
          position: absolute;
          bottom: calc(100% + 8px);
          left: 0;
          transform: none;
          background: #ffffff;
          color: #1e293b;
          font-size: 10px;
          font-weight: 400;
          padding: 4px 10px;
          border-radius: 8px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.15s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          z-index: 10000;
        }
        .turno-wrapper:hover .turno-tooltip {
          opacity: 1;
        }
      `}</style>
    </header>
  );
};

export default Encabezado;