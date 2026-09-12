// src/components/ocr/SolicitudesCambioTurno.jsx
// REGISTRO DE SOLICITUD DE CAMBIO DE TURNO - FastAPI Backend
// Flujo: Elegir Individual / Con Colega → cambios → resumen → enviar
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, User, Users, ArrowRightLeft, Loader2, CheckCircle2, Send,
  GitCompare, AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2,
  UserCheck, UserPlus,
} from 'lucide-react';
import { COLOR_PRIMARIO, TURNOS, TURNO_MAP, MESES, NOMBRE_A_CODIGO, hojaDelMesActual } from './constantes';
import { solicitudesService } from './services/solicitudesService';

const SIN_TURNO_VAL = 'S/T';

const SolicitudesCambioTurno = ({
  isOpen, onClose, onEnviado = null,
  mes = 0,
  anio = new Date().getFullYear(),
  hoja = '',
  area = '',
  personal = [],
  turnosMap = {},
  userName = '',
}) => {
  const turnos = useMemo(() => {
    if (!personal || !personal.length) return [];
    return personal.map(p => ({ ...p, turnos: turnosMap[p.id] || {} }));
  }, [personal, turnosMap]);

  // ---- State ----
  const [modo, setModo] = useState(null);        // null = elegir, 'INDIVIDUAL' | 'COLEGA'
  const [cambios, setCambios] = useState([]);
  const [compañero, setCompañero] = useState(null);
  const [cambiosCompañero, setCambiosCompañero] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [pormenores, setPormenores] = useState('');
  const [paso, setPaso] = useState(0);            // 0=elección, 1=mis cambios, 2=compañero(solo coleoga), 3=resumen
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [diaSel, setDiaSel] = useState(null);
  const [turnoNuevo, setTurnoNuevo] = useState('');
  const [busquedaComp, setBusquedaComp] = useState('');
  const [diaSelComp, setDiaSelComp] = useState(null);
  const [turnoNuevoComp, setTurnoNuevoComp] = useState('');

  // ---- Derived ----
  const fechaActual = useMemo(() => new Date(), []);
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();
  const diaActual = fechaActual.getDate();
  const totalDias = useMemo(() => new Date(anio, mes, 0).getDate(), [anio, mes]);
  const DIAS = useMemo(() => Array.from({ length: totalDias }, (_, i) => i + 1), [totalDias]);
  const DIAS_FUTUROS = useMemo(() => DIAS.filter(d => {
    if (mes > mesActual || anio > anioActual) return true;
    if (mes === mesActual && anio === anioActual) return d >= diaActual;
    return false;
  }), [DIAS, mes, anio, mesActual, anioActual, diaActual]);

  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ocr_user_data') || '{}'); } catch { return {}; }
  }, []);

  const miPersonal = useMemo(() => {
    if (!turnos.length) return null;
    return turnos.find(t =>
      t.nombre?.toLowerCase().trim() === userName?.toLowerCase().trim() ||
      (storedUser.nombre && t.nombre?.toLowerCase().trim() === storedUser.nombre?.toLowerCase().trim())
    ) || null;
  }, [turnos, userName, storedUser]);

  const misTurnos = miPersonal?.turnos || {};

  // ---- Reset on open ----
  useEffect(() => {
    if (isOpen) {
      setModo(null);
      setCambios([]);
      setCompañero(null);
      setCambiosCompañero([]);
      setMotivo('');
      setPormenores('');
      setPaso(0);
      setError('');
      setDiaSel(null);
      setTurnoNuevo('');
      setBusquedaComp('');
      setDiaSelComp(null);
      setTurnoNuevoComp('');
    }
  }, [isOpen]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ---- Helpers ----
  const turnoDe = (turnosObj, d) => turnosObj?.[d] || '';

  const buscarCompañero = (query) => {
    if (!query || query.length < 2) return [];
    return turnos.filter(t =>
      (t.nombre?.toLowerCase().includes(query.toLowerCase()) || t.dni?.includes(query))
      && t.id !== miPersonal?.id
    ).slice(0, 10);
  };

  // ---- Acciones de cambios ----
  const agregarCambioMio = () => {
    if (!diaSel || !turnoNuevo) return;
    if (cambios.some(c => c.dia === diaSel)) { setError('Ya existe un cambio para ese dia'); return; }
    setCambios(prev => [...prev, { dia: diaSel, turnoActual: misTurnos[diaSel] || SIN_TURNO_VAL, turnoNuevo }]);
    setDiaSel(null); setTurnoNuevo(''); setError('');
  };

  const eliminarCambioMio = (i) => setCambios(prev => prev.filter((_, j) => j !== i));

  const agregarCambioCompañero = () => {
    if (!diaSelComp || !turnoNuevoComp || !compañero) return;
    if (cambiosCompañero.some(c => c.dia === diaSelComp)) { setError('Ya existe un cambio para ese dia en el companero'); return; }
    const turnoActual = compañero.turnos?.[diaSelComp] || SIN_TURNO_VAL;
    setCambiosCompañero(prev => [...prev, { dia: diaSelComp, turnoActual, turnoNuevo: turnoNuevoComp }]);
    setDiaSelComp(null); setTurnoNuevoComp(''); setError('');
  };

  const eliminarCambioCompañero = (i) => setCambiosCompañero(prev => prev.filter((_, j) => j !== i));

  // ---- Navegación ----
  const seleccionarModo = (m) => {
    setModo(m);
    setPaso(1); // Ir directo a mis cambios
    setError('');
  };

  const siguiente = () => {
    if (paso === 1) {
      if (cambios.length === 0) { setError('Agrega al menos un cambio de turno'); return; }
      setError('');
      setPaso(modo === 'COLEGA' ? 2 : 3); // Colega → paso 2, Individual → directo a resumen
    } else if (paso === 2) {
      if (!compañero) { setError('Selecciona un companero'); return; }
      if (cambiosCompañero.length === 0) { setError('Agrega al menos un cambio para el companero'); return; }
      setError('');
      setPaso(3);
    }
  };

  const atras = () => {
    setError('');
    if (paso === 3) setPaso(modo === 'COLEGA' ? 2 : 1);
    else if (paso === 2) setPaso(1);
    else if (paso === 1) { setModo(null); setPaso(0); }
  };

  // ---- Enviar ----
  const enviar = async () => {
    if (cambios.length === 0) { setError('Agrega al menos un cambio'); return; }
    if (!motivo.trim()) { setError('Escribe el motivo del cambio'); return; }
    if (cambios.some(c => !c.turnoNuevo)) { setError('Selecciona el turno nuevo para cada cambio'); return; }

    setEnviando(true); setError('');

    const participantes = [{
      nombre: miPersonal?.nombre || userName,
      dni: miPersonal?.dni || '',
      area: miPersonal?.area || area,
      fila: miPersonal?.fila || 0,
      cambios: cambios.map(c => ({ dia: c.dia, turno_actual: c.turnoActual, turno_nuevo: c.turnoNuevo })),
    }];

    if (modo === 'COLEGA' && compañero && cambiosCompañero.length > 0) {
      participantes.push({
        nombre: compañero.nombre,
        dni: compañero.dni,
        area: compañero.area || '',
        fila: compañero.fila || 0,
        cambios: cambiosCompañero.map(c => ({ dia: c.dia, turno_actual: c.turnoActual, turno_nuevo: c.turnoNuevo })),
      });
    }

    const tipoCambio = modo === 'COLEGA' ? 'INTERCAMBIO CON COMPAÑERO' : 'CAMBIO INDIVIDUAL';
    const result = await solicitudesService.crearSolicitud({
      tipo_cambio: tipoCambio,
      participantes,
      motivo: motivo.trim(),
      pormenores: pormenores.trim(),
      hoja: hoja || hojaDelMesActual(),
      mes, anio,
    });
    setEnviando(false);
    if (result.success) { onEnviado?.(); onClose?.(); }
    else { setError(result.error || 'Error al enviar solicitud'); }
  };

  // ---- Step labels ----
  const pasos = modo === 'COLEGA'
    ? [{ n: 1, l: 'Mis cambios', i: User }, { n: 2, l: 'Companero', i: Users }, { n: 3, l: 'Resumen', i: CheckCircle2 }]
    : [{ n: 1, l: 'Mis cambios', i: User }, { n: 2, l: 'Resumen', i: CheckCircle2 }];
  const pasoIdx = modo === 'COLEGA' ? (paso - 1) : (paso === 1 ? 0 : 1);

  // ---- Sub-componentes ----
  const TurnoChip = ({ codigo }) => {
    const t = TURNO_MAP[codigo];
    const sin = !codigo || codigo === SIN_TURNO_VAL;
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sin ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-200'}`}
        style={t ? { backgroundColor: t.color, color: t.texto } : {}}>
        {sin ? 'S/T' : codigo}
      </span>
    );
  };

  const SelectorTurno = ({ value, onChange, label, id }) => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <option value="">Seleccionar turno</option>
        <option value={SIN_TURNO_VAL}>S/T - SIN TURNO</option>
        {TURNOS.map(t => <option key={`${id}-${t.codigo}`} value={t.codigo}>{t.codigo} - {t.nombre}</option>)}
      </select>
    </div>
  );

  // ============================================
  // PASO 0: ELECCIÓN DE MODO
  // ============================================
  const PantallaModo = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <p className="text-sm text-gray-500 text-center mb-2">¿Que tipo de cambio deseas realizar?</p>
      <button onClick={() => seleccionarModo('INDIVIDUAL')}
        className="w-full max-w-sm p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all group text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Cambio Individual</p>
            <p className="text-xs text-gray-400 mt-0.5">Solo mis cambios de turno</p>
          </div>
        </div>
      </button>
      <button onClick={() => seleccionarModo('COLEGA')}
        className="w-full max-w-sm p-5 bg-white border-2 border-gray-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group text-left">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            <UserPlus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-800">Cambio con Colega</p>
            <p className="text-xs text-gray-400 mt-0.5">Intercambio con un companero</p>
          </div>
        </div>
      </button>
    </div>
  );

  // ============================================
  // PASO 1: MIS CAMBIOS
  // ============================================
  const PanelMisCambios = () => (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Horario Actual — {MESES[(mes || 1) - 1]} {anio}</h4>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {DIAS.map(dia => {
            const c = turnoDe(misTurnos, dia);
            const cambiado = cambios.find(x => x.dia === dia);
            const codigoMostrar = cambiado ? cambiado.turnoNuevo : c;
            const t = TURNO_MAP[codigoMostrar];
            const bg = cambiado ? 'bg-orange-50' : (c ? t?.color : 'white');
            const color = cambiado ? '#f97316' : (c ? t?.texto : '#D1D5DB');
            const esPasado = dia < diaActual;
            return (
              <div key={dia}
                className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${cambiado ? 'border-orange-400 ring-2 ring-orange-300' : 'border-gray-100'} ${esPasado ? 'opacity-40' : ''}`}
                style={{ backgroundColor: bg }}>
                <span className="text-gray-500 leading-none">{dia}</span>
                <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Cambio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dia</label>
            <select value={diaSel || ''} onChange={e => setDiaSel(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Seleccionar dia</option>
              {DIAS_FUTUROS.map(d => <option key={d} value={d}>Dia {d} {d === diaActual ? '(Hoy)' : ''}</option>)}
            </select>
          </div>
          <SelectorTurno value={turnoNuevo} onChange={setTurnoNuevo} label="Nuevo Turno" id="mi" />
        </div>
        <button onClick={agregarCambioMio} disabled={!diaSel || !turnoNuevo}
          className="mt-3 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
          style={{ backgroundColor: COLOR_PRIMARIO }}>
          + Agregar Cambio
        </button>
      </div>

      {cambios.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios ({cambios.length})</h4>
          <div className="space-y-2">
            {cambios.map((c, i) => {
              const tA = TURNO_MAP[c.turnoActual];
              const tN = TURNO_MAP[c.turnoNuevo];
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white line-through text-gray-400"
                    style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#9ca3af' }}>
                    {c.turnoActual || '-'}
                  </span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                    style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                    {c.turnoNuevo}
                  </span>
                  <button onClick={() => eliminarCambioMio(i)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // PASO 2: COMPAÑERO (solo modo COLEGA)
  // ============================================
  const PanelCompanero = () => {
    const compTurnos = compañero?.turnos || {};
    return (
      <div className="space-y-4">
        {compañero ? (
          <>
            <div className="p-3 rounded-xl border flex items-center justify-between gap-2" style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderColor: '#fde68a' }}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100">
                  <Users className="w-4 h-4 text-amber-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-700 truncate">{compañero.nombre}</p>
                  <p className="text-[10px] text-gray-400 truncate">{compañero.dni || 'Sin DNI'} — {compañero.area || 'Sin area'}</p>
                </div>
              </div>
              <button onClick={() => { setCompañero(null); setCambiosCompañero([]); setError(''); }}
                className="p-1.5 text-red-400 hover:text-red-600 rounded-lg flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Horario del Companero — {MESES[(mes || 1) - 1]} {anio}</h4>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {DIAS.map(dia => {
                  const c = turnoDe(compTurnos, dia);
                  const cambiado = cambiosCompañero.find(x => x.dia === dia);
                  const codigoMostrar = cambiado ? cambiado.turnoNuevo : c;
                  const t = TURNO_MAP[codigoMostrar];
                  const bg = cambiado ? 'bg-orange-50' : (c ? t?.color : 'white');
                  const color = cambiado ? '#f97316' : (c ? t?.texto : '#D1D5DB');
                  return (
                    <div key={dia} className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${cambiado ? 'border-orange-400 ring-2 ring-orange-300' : 'border-gray-100'}`}
                      style={{ backgroundColor: bg }}>
                      <span className="text-gray-500 leading-none">{dia}</span>
                      <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Cambio al Companero</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dia</label>
                  <select value={diaSelComp || ''} onChange={e => setDiaSelComp(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Seleccionar dia</option>
                    {DIAS_FUTUROS.map(d => <option key={d} value={d}>Dia {d} {d === diaActual ? '(Hoy)' : ''}</option>)}
                  </select>
                </div>
                <SelectorTurno value={turnoNuevoComp} onChange={setTurnoNuevoComp} label="Nuevo Turno" id="comp" />
              </div>
              <button onClick={agregarCambioCompañero} disabled={!diaSelComp || !turnoNuevoComp}
                className="mt-3 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all active:scale-95"
                style={{ backgroundColor: COLOR_PRIMARIO }}>
                + Agregar Cambio
              </button>
            </div>

            {cambiosCompañero.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios del Companero ({cambiosCompañero.length})</h4>
                <div className="space-y-2">
                  {cambiosCompañero.map((c, i) => {
                    const tA = TURNO_MAP[c.turnoActual];
                    const tN = TURNO_MAP[c.turnoNuevo];
                    return (
                      <div key={i} className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                        <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white line-through text-gray-400"
                          style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#9ca3af' }}>
                          {c.turnoActual || '-'}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                          style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                          {c.turnoNuevo}
                        </span>
                        <button onClick={() => eliminarCambioCompañero(i)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0 ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderColor: '#fde68a' }}>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs font-semibold text-amber-700">Busca al companero para el intercambio</p>
              </div>
            </div>
            <div className="relative">
              <input type="text" value={busquedaComp} onChange={e => setBusquedaComp(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" autoFocus />
              {busquedaComp && (
                <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                  {buscarCompañero(busquedaComp).length === 0 ? (
                    <p className="p-3 text-xs text-gray-400">Sin resultados</p>
                  ) : buscarCompañero(busquedaComp).map(p => (
                    <button key={p.id} onClick={() => { setCompañero(p); setCambiosCompañero([]); setBusquedaComp(''); setError(''); }}
                      className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors">
                      <p className="text-xs font-semibold text-gray-700">{p.nombre}</p>
                      <p className="text-[10px] text-gray-400">{p.dni || 'Sin DNI'} — {p.area || 'Sin area'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RESUMEN (solo aqui se muestra el nombre del solicitante)
  // ============================================
  const PanelResumen = () => (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-bold text-emerald-800">Resumen de la propuesta</p>
        </div>
        <p className="text-xs text-emerald-700">Revise los cambios antes de enviar la solicitud.</p>
      </div>

      {/* Solicitante — solo en resumen */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-emerald-100">
            <User className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800 truncate">{miPersonal?.nombre || userName}</p>
            <p className="text-[10px] text-gray-400 truncate">{miPersonal?.dni || ''} — {miPersonal?.area || area}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {cambios.map(c => {
            const tA = TURNO_MAP[c.turnoActual];
            const tN = TURNO_MAP[c.turnoNuevo];
            return (
              <div key={c.dia} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                  style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#94a3b8' }}>
                  {c.turnoActual || 'S/T'}
                </span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                  style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                  {c.turnoNuevo}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compañero — solo en modo COLEGA */}
      {modo === 'COLEGA' && compañero && cambiosCompañero.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-100">
              <Users className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-800 truncate">{compañero.nombre}</p>
              <p className="text-[10px] text-gray-400 truncate">{compañero.dni || ''} — {compañero.area || ''}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            {cambiosCompañero.map(c => {
              const tA = TURNO_MAP[c.turnoActual];
              const tN = TURNO_MAP[c.turnoNuevo];
              return (
                <div key={c.dia} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                    style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#94a3b8' }}>
                    {c.turnoActual || 'S/T'}
                  </span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white"
                    style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                    {c.turnoNuevo}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-xs text-blue-800">
          {modo === 'COLEGA'
            ? 'Intercambio: ambos participantes asumen los turnos indicados. Se enviara para aprobacion.'
            : 'Su solicitud sera enviada para aprobacion.'}
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Motivo <span className="text-red-400">*</span>
          <span className="text-gray-400 normal-case font-medium ml-1">({motivo.trim().length} caracteres)</span>
        </label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
          placeholder="Detalle el motivo del cambio..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pormenores</label>
        <textarea value={pormenores} onChange={e => setPormenores(e.target.value)} rows={3}
          placeholder="Referencia, documento sustentatorio, companero involucrado..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" />
      </div>
    </div>
  );

  // ============================================
  // RENDER PRINCIPAL
  // ============================================
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Solicitud de Cambio de Turno</h3>
              <p className="text-[10px] sm:text-xs text-white/70">{MESES[(mes || 1) - 1]} {anio} · {hoja}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Steps — solo si ya eligió modo */}
        {modo && (
          <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            {pasos.map((p, i) => {
              const Icono = p.i;
              const activo = i === pasoIdx;
              const completado = i < pasoIdx;
              return (
                <React.Fragment key={p.n}>
                  <div className={`flex items-center gap-1.5 min-w-0 ${activo ? 'text-emerald-700' : completado ? 'text-emerald-500' : 'text-gray-400'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${activo ? 'border-emerald-500 bg-emerald-50' : completado ? 'border-emerald-400 bg-emerald-100' : 'border-gray-200'}`}>
                      {completado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icono className="w-3 h-3" />}
                    </span>
                    <span className="text-[11px] font-semibold truncate">{p.l}</span>
                  </div>
                  {i < pasos.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < pasoIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {paso === 0 && <PantallaModo />}
          {paso === 1 && <PanelMisCambios />}
          {paso === 2 && modo === 'COLEGA' && <PanelCompanero />}
          {paso === 3 && <PanelResumen />}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 sm:gap-3 flex-shrink-0">
          {paso === 0 ? (
            <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
          ) : (
            <button onClick={atras} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Volver
            </button>
          )}

          {paso < (modo === 'COLEGA' ? 3 : 2) ? (
            <button onClick={siguiente} disabled={paso === 1 && cambios.length === 0}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
              style={{ backgroundColor: COLOR_PRIMARIO }}>
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : paso > 0 ? (
            <button onClick={enviar} disabled={enviando}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2 active:scale-95"
              style={{ backgroundColor: COLOR_PRIMARIO }}>
              {enviando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar Solicitud</>}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default SolicitudesCambioTurno;
