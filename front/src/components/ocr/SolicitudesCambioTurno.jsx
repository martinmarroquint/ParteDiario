// src/components/ocr/SolicitudesCambioTurno.jsx
// REGISTRO DE SOLICITUD DE CAMBIO DE TURNO - FastAPI Backend
// Flujo: Elegir Individual / Con Colega → cambios → resumen → enviar
import React, { useState, useEffect, useMemo } from 'react';
import {
  X, User, Users, ArrowRightLeft, Loader2, CheckCircle2, Send,
  GitCompare, AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2,
  UserCheck, UserPlus, Calendar, Clock,
} from 'lucide-react';
import { COLOR_PRIMARIO, TURNOS, TURNO_MAP, MESES, hojaDelMesActual } from './constantes';
import { solicitudesService } from './services/solicitudesService';

const SIN_TURNO_VAL = 'S/T';

// Day name from date
const getDiaSemana = (anio, mes, dia) => {
  try {
    const d = new Date(anio, mes - 1, dia);
    const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const map = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    return map[dayOfWeek] || '';
  } catch { return ''; }
};

const SolicitudesCambioTurno = ({
  isOpen, onClose, onEnviado = null,
  mes = 0,
  anio = new Date().getFullYear(),
  hoja = '',
  area = '',
  personal = [],
  turnosMap = {},
  userName = '',
  onCambioAplicado = null, // Callback when changes are applied to the sheet
}) => {
  const turnos = useMemo(() => {
    if (!personal || !personal.length) return [];
    return personal.map(p => ({ ...p, turnos: turnosMap[p.id] || {} }));
  }, [personal, turnosMap]);

  // ---- State ----
  const [modo, setModo] = useState(null);
  const [cambios, setCambios] = useState([]);
  const [compañero, setCompañero] = useState(null);
  const [cambiosCompañero, setCambiosCompañero] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [pormenores, setPormenores] = useState('');
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  const [diaSel, setDiaSel] = useState(null);
  const [turnoNuevo, setTurnoNuevo] = useState('');
  const [busquedaComp, setBusquedaComp] = useState('');
  const [diaSelComp, setDiaSelComp] = useState(null);
  const [turnoNuevoComp, setTurnoNuevoComp] = useState('');
  const [selectorDiaAbierto, setSelectorDiaAbierto] = useState(false);
  const [selectorTurnoAbierto, setSelectorTurnoAbierto] = useState(false);
  const [selectorDiaCompAbierto, setSelectorDiaCompAbierto] = useState(false);
  const [selectorTurnoCompAbierto, setSelectorTurnoCompAbierto] = useState(false);

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
      setSelectorDiaAbierto(false);
      setSelectorTurnoAbierto(false);
      setSelectorDiaCompAbierto(false);
      setSelectorTurnoCompAbierto(false);
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

  // ---- Actions ----
  const agregarCambioMio = () => {
    if (!diaSel || !turnoNuevo) return;
    if (cambios.some(c => c.dia === diaSel)) { setError('Ya existe un cambio para ese dia'); return; }
    setCambios(prev => [...prev, { dia: diaSel, turnoActual: misTurnos[diaSel] || SIN_TURNO_VAL, turnoNuevo }]);
    setDiaSel(null); setTurnoNuevo(''); setError('');
    setSelectorDiaAbierto(false);
    setSelectorTurnoAbierto(false);
  };

  const eliminarCambioMio = (i) => setCambios(prev => prev.filter((_, j) => j !== i));

  const agregarCambioCompañero = () => {
    if (!diaSelComp || !turnoNuevoComp || !compañero) return;
    if (cambiosCompañero.some(c => c.dia === diaSelComp)) { setError('Ya existe un cambio para ese dia en el companero'); return; }
    const turnoActual = compañero.turnos?.[diaSelComp] || SIN_TURNO_VAL;
    setCambiosCompañero(prev => [...prev, { dia: diaSelComp, turnoActual, turnoNuevo: turnoNuevoComp }]);
    setDiaSelComp(null); setTurnoNuevoComp(''); setError('');
    setSelectorDiaCompAbierto(false);
    setSelectorTurnoCompAbierto(false);
  };

  const eliminarCambioCompañero = (i) => setCambiosCompañero(prev => prev.filter((_, j) => j !== i));

  const seleccionarModo = (m) => {
    setModo(m);
    setPaso(1);
    setError('');
  };

  const siguiente = () => {
    if (paso === 1) {
      if (cambios.length === 0) { setError('Agrega al menos un cambio de turno'); return; }
      setError('');
      setPaso(modo === 'COLEGA' ? 2 : 3);
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
    try {
      const result = await solicitudesService.crearSolicitud({
        tipo_cambio: tipoCambio,
        participantes,
        motivo: motivo.trim(),
        pormenores: pormenores.trim(),
        hoja: hoja || hojaDelMesActual(),
        mes, anio,
      });
      setEnviando(false);
      // Service now returns raw response — success means no throw
      onEnviado?.();
      onClose?.();
    } catch (e) {
      setEnviando(false);
      setError(e.message || 'Error al enviar solicitud');
    }
  };

  // ---- Step labels ----
  const pasos = modo === 'COLEGA'
    ? [{ n: 1, l: 'Mis cambios', i: User }, { n: 2, l: 'Companero', i: Users }, { n: 3, l: 'Resumen', i: CheckCircle2 }]
    : [{ n: 1, l: 'Mis cambios', i: User }, { n: 3, l: 'Resumen', i: CheckCircle2 }];
  const pasoIdx = modo === 'COLEGA' ? (paso - 1) : (paso === 1 ? 0 : 1);

  // ============================================
  // CLICK-OUTSIDE WRAPPER
  // ============================================
  const ClickOutside = ({ children, onClickOutside, className = '' }) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) onClickOutside?.();
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [onClickOutside]);
    return <div ref={ref} className={className}>{children}</div>;
  };

  // ============================================
  // DROPDOWN PANEL (professional, no scrollbar)
  // ============================================
  const DropdownPanel = ({ abierto, children, className = '' }) => {
    const ref = React.useRef(null);
    React.useEffect(() => {
      if (!abierto) return;
      const handler = (e) => {
        if (ref.current && !ref.current.contains(e.target)) {
          // close is handled by parent
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [abierto]);
    if (!abierto) return null;
    return (
      <div ref={ref}
        className={`absolute left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden ${className}`}
        style={{ zIndex: 99999 }}>
        <div className="max-h-64 overflow-hidden">
          <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
            <div className="no-scrollbar">{children}</div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CUSTOM SELECTOR: DIA
  // ============================================
  const SelectorDia = ({ diasFuturos, diaSeleccionado, onSelect, turnoActualMap, label, abierto, setAbierto }) => (
    <ClickOutside className="relative" onClickOutside={() => setAbierto(false)}>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <button onClick={() => setAbierto(!abierto)}
        className="w-full px-3 py-2.5 bg-white border-2 rounded-xl text-left text-sm font-medium transition-all flex items-center gap-2"
        style={{ borderColor: diaSeleccionado ? COLOR_PRIMARIO : '#E5E7EB' }}>
        <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: diaSeleccionado ? COLOR_PRIMARIO : '#9CA3AF' }} />
        {diaSeleccionado ? (
          <span className="flex items-center gap-1.5">
            <span className="font-bold" style={{ color: COLOR_PRIMARIO }}>Dia {diaSeleccionado}</span>
            <span className="text-gray-400 text-xs">({getDiaSemana(anio, mes, diaSeleccionado)})</span>
            {turnoActualMap?.[diaSeleccionado] && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                style={{
                  backgroundColor: TURNO_MAP[turnoActualMap[diaSeleccionado]]?.color || '#f3f4f6',
                  color: TURNO_MAP[turnoActualMap[diaSeleccionado]]?.texto || '#6B7280',
                  borderColor: TURNO_MAP[turnoActualMap[diaSeleccionado]]?.color ? 'transparent' : '#E5E7EB',
                }}>
                {turnoActualMap[diaSeleccionado]}
              </span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">Seleccionar dia</span>
        )}
        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${abierto ? 'rotate-90' : ''} text-gray-400`} />
      </button>

      <DropdownPanel abierto={abierto}>
        {diasFuturos.map(d => {
          const diaHoy = d === diaActual;
          const turno = turnoActualMap?.[d];
          const t = turno ? TURNO_MAP[turno] : null;
          const esSel = diaSeleccionado === d;
          return (
            <button key={d} onClick={() => { onSelect(d); setAbierto(false); }}
              className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left transition-all text-sm ${
                esSel ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                diaHoy ? 'text-white shadow-md' : esSel ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}
                style={diaHoy ? { backgroundColor: COLOR_PRIMARIO } : {}}>
                {d}
              </span>
              <span className="text-[11px] text-gray-400 w-10 flex-shrink-0 font-medium">{getDiaSemana(anio, mes, d)}</span>
              {turno && (
                <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold border ml-auto"
                  style={{
                    backgroundColor: t?.color || '#f3f4f6',
                    color: t?.texto || '#6B7280',
                    borderColor: t?.color ? 'transparent' : '#E5E7EB',
                  }}>
                  {turno}
                </span>
              )}
              {esSel && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </DropdownPanel>
    </ClickOutside>
  );

  // ============================================
  // CUSTOM SELECTOR: TURNO (with color chips)
  // ============================================
  const SelectorTurno = ({ value, onChange, label, id }) => {
    const abierto = id === 'mi' ? selectorTurnoAbierto : selectorTurnoCompAbierto;
    const setAbierto = id === 'mi' ? setSelectorTurnoAbierto : setSelectorTurnoCompAbierto;
    return (
    <ClickOutside className="relative" onClickOutside={() => setAbierto(false)}>
      <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
      <button onClick={() => setAbierto(!abierto)}
        className="w-full px-3 py-2.5 bg-white border-2 rounded-xl text-left text-sm font-medium transition-all flex items-center gap-2"
        style={{ borderColor: value ? COLOR_PRIMARIO : '#E5E7EB' }}>
        {value && TURNO_MAP[value] ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-bold"
              style={{ backgroundColor: TURNO_MAP[value].color, color: TURNO_MAP[value].texto }}>
              {value}
            </span>
            <span className="text-gray-700">{TURNO_MAP[value].nombre}</span>
          </span>
        ) : value === SIN_TURNO_VAL ? (
          <span className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400">S/T</span>
            <span className="text-gray-500">Sin Turno</span>
          </span>
        ) : (
          <span className="text-gray-400">Seleccionar turno</span>
        )}
        <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${abierto ? 'rotate-90' : ''} text-gray-400`} />
      </button>

      <DropdownPanel abierto={abierto}>
        <button onClick={() => { onChange(SIN_TURNO_VAL); setAbierto(false); }}
          className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left text-sm transition-all ${value === SIN_TURNO_VAL ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>
          <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">S/T</span>
          <span className="text-gray-600 font-medium">Sin Turno</span>
          {value === SIN_TURNO_VAL && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
        </button>
        {TURNOS.map(t => (
          <button key={`${id}-${t.codigo}`} onClick={() => { onChange(t.codigo); setAbierto(false); }}
            className={`w-full px-3 py-2.5 flex items-center gap-2.5 text-left text-sm transition-all ${value === t.codigo ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
            <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: t.color, color: t.texto }}>
              {t.codigo}
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-gray-700 font-medium text-[13px]">{t.nombre}</span>
              {t.horas > 0 && <span className="text-[9px] text-gray-400 ml-1.5">{t.horas}h</span>}
            </div>
            {value === t.codigo && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
          </button>
        ))}
      </DropdownPanel>
    </ClickOutside>
    );
  };

  // ============================================
  // PASO 0: ELECCIÓN DE MODO
  // ============================================
  const PantallaModo = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <p className="text-sm text-gray-500 text-center mb-2">Que tipo de cambio deseas realizar?</p>
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
        <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-gray-400" /> Horario Actual — {MESES[(mes || 1) - 1]} {anio}
        </h4>
        <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
          {DIAS.map(dia => {
            const c = turnoDe(misTurnos, dia);
            const cambiado = cambios.find(x => x.dia === dia);
            const codigoMostrar = cambiado ? cambiado.turnoNuevo : c;
            const t = TURNO_MAP[codigoMostrar];
            const bg = cambiado ? 'bg-orange-50' : (c ? t?.color : 'white');
            const color = cambiado ? '#f97316' : (c ? t?.texto : '#D1D5DB');
            const esPasado = dia < diaActual;
            const esHoy = dia === diaActual;
            return (
              <div key={dia}
                className={`w-10 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${
                  cambiado ? 'border-orange-400 ring-2 ring-orange-300' :
                  esHoy ? 'border-emerald-400 ring-1 ring-emerald-300' :
                  'border-gray-100'
                } ${esPasado ? 'opacity-40' : ''}`}
                style={{ backgroundColor: bg }}>
                <span className="text-[8px] text-gray-400 leading-none mb-0.5">{getDiaSemana(anio, mes, dia)}</span>
                <span className="text-gray-500 leading-none font-bold">{dia}</span>
                <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Cambio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectorDia diasFuturos={DIAS_FUTUROS} diaSeleccionado={diaSel} onSelect={setDiaSel}
            turnoActualMap={misTurnos} label="Dia" abierto={selectorDiaAbierto} setAbierto={setSelectorDiaAbierto} />
          <SelectorTurno value={turnoNuevo} onChange={setTurnoNuevo} label="Nuevo Turno" id="mi" />
        </div>
        <button onClick={agregarCambioMio} disabled={!diaSel || !turnoNuevo}
          className="mt-3 px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all active:scale-95 flex items-center gap-1.5"
          style={{ backgroundColor: COLOR_PRIMARIO }}>
          <Plus className="w-4 h-4" /> Agregar Cambio
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
                <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">{getDiaSemana(anio, mes, c.dia)}</span>
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white line-through text-gray-400"
                    style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#9ca3af', borderColor: tA?.color ? 'transparent' : '#E5E7EB' }}>
                    {c.turnoActual || '-'}
                  </span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                    style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155', borderColor: tN?.color ? 'transparent' : '#E5E7EB' }}>
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
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-400" /> Horario del Companero — {MESES[(mes || 1) - 1]} {anio}
              </h4>
              <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                {DIAS.map(dia => {
                  const c = turnoDe(compTurnos, dia);
                  const cambiado = cambiosCompañero.find(x => x.dia === dia);
                  const codigoMostrar = cambiado ? cambiado.turnoNuevo : c;
                  const t = TURNO_MAP[codigoMostrar];
                  const bg = cambiado ? 'bg-orange-50' : (c ? t?.color : 'white');
                  const color = cambiado ? '#f97316' : (c ? t?.texto : '#D1D5DB');
                  const esHoy = dia === diaActual;
                  return (
                    <div key={dia}
                      className={`w-10 h-11 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${
                        cambiado ? 'border-orange-400 ring-2 ring-orange-300' :
                        esHoy ? 'border-emerald-400 ring-1 ring-emerald-300' :
                        'border-gray-100'
                      }`}
                      style={{ backgroundColor: bg }}>
                      <span className="text-[8px] text-gray-400 leading-none mb-0.5">{getDiaSemana(anio, mes, dia)}</span>
                      <span className="text-gray-500 leading-none font-bold">{dia}</span>
                      <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Agregar Cambio al Companero</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SelectorDia diasFuturos={DIAS_FUTUROS} diaSeleccionado={diaSelComp} onSelect={setDiaSelComp}
                  turnoActualMap={compTurnos} label="Dia" abierto={selectorDiaCompAbierto} setAbierto={setSelectorDiaCompAbierto} />
                <SelectorTurno value={turnoNuevoComp} onChange={setTurnoNuevoComp} label="Nuevo Turno" id="comp" />
              </div>
              <button onClick={agregarCambioCompañero} disabled={!diaSelComp || !turnoNuevoComp}
                className="mt-3 px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-all active:scale-95 flex items-center gap-1.5"
                style={{ backgroundColor: COLOR_PRIMARIO }}>
                <Plus className="w-4 h-4" /> Agregar Cambio
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
                      <div key={i} className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                        <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">{getDiaSemana(anio, mes, c.dia)}</span>
                        <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white line-through text-gray-400"
                          style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#9ca3af', borderColor: tA?.color ? 'transparent' : '#E5E7EB' }}>
                          {c.turnoActual || '-'}
                        </span>
                        <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                          style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155', borderColor: tN?.color ? 'transparent' : '#E5E7EB' }}>
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
  // RESUMEN
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
                <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">{getDiaSemana(anio, mes, c.dia)}</span>
                <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                  style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#94a3b8', borderColor: tA?.color ? 'transparent' : '#E5E7EB' }}>
                  {c.turnoActual || 'S/T'}
                </span>
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                  style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155', borderColor: tN?.color ? 'transparent' : '#E5E7EB' }}>
                  {c.turnoNuevo}
                </span>
              </div>
            );
          })}
        </div>
      </div>

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
                  <span className="text-[10px] text-gray-400 w-10 flex-shrink-0">{getDiaSemana(anio, mes, c.dia)}</span>
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                    style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#94a3b8', borderColor: tA?.color ? 'transparent' : '#E5E7EB' }}>
                    {c.turnoActual || 'S/T'}
                  </span>
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white"
                    style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155', borderColor: tN?.color ? 'transparent' : '#E5E7EB' }}>
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
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
          Motivo <span className="text-red-400">*</span>
          <span className="text-gray-400 normal-case font-medium ml-1">({motivo.trim().length} caracteres)</span>
        </label>
        <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={2}
          placeholder="Detalle el motivo del cambio..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" />
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pormenores</label>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4" onClick={onClose}>
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

        {/* Steps */}
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
