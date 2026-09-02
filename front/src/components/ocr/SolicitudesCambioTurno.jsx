// src/components/ocr/SolicitudesCambioTurno.jsx
// REGISTRO DE SOLICITUD DE CAMBIO DE TURNO - SOLO DIAS FUTUROS
// SIN EMOJIS - Version limpia
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Search, User, Users, ArrowRightLeft, Loader2, CheckCircle2, Send,
  GitCompare, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { COLOR_PRIMARIO, TURNOS, TURNO_MAP, MESES, NOMBRE_A_CODIGO, hojaDelMesActual } from './constantes';
import { enviarSolicitudCambio } from './servicioSolicitudes';

const SIN_TURNO_VAL = 'S/T';

const SolicitudesCambioTurno = ({
  isOpen, onClose, onEnviado = null,
  config = null, trabajador = null, turnos = null,
  hoja = '',
  mes = 0,
  anio = new Date().getFullYear(),
  area = ''
}) => {
  const [participantes, setParticipantes] = useState([]);
  const [modalidad, setModalidad] = useState('PERSONAL');
  const [paso, setPaso] = useState(0);
  const [busquedaSolicitante, setBusquedaSolicitante] = useState('');
  const [busquedaComp, setBusquedaComp] = useState('');
  const [motivo, setMotivo] = useState('');
  const [pormenores, setPormenores] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const [personal, setPersonal] = useState([]);
  const [turnosPersonal, setTurnosPersonal] = useState({});
  const [cargandoPersonal, setCargandoPersonal] = useState(false);
  const [errorPersonal, setErrorPersonal] = useState('');

  const [diaSel, setDiaSel] = useState(null);
  const [turnoNuevo, setTurnoNuevo] = useState('');
  const [motivoCambio, setMotivoCambio] = useState('');

  // Validar mes actual
  const fechaActual = useMemo(() => new Date(), []);
  const mesActual = useMemo(() => fechaActual.getMonth() + 1, [fechaActual]);
  const anioActual = useMemo(() => fechaActual.getFullYear(), [fechaActual]);
  const diaActual = useMemo(() => fechaActual.getDate(), [fechaActual]);

  // Usar el mes que viene del panel (ya no se fuerza al actual)
  const mesFinal = useMemo(() => mes, [mes]);
  const anioFinal = useMemo(() => anio, [anio]);

  const totalDias = useMemo(() => new Date(anioFinal, mesFinal, 0).getDate(), [anioFinal, mesFinal]);
  const DIAS = useMemo(() => Array.from({ length: totalDias }, (_, i) => i + 1), [totalDias]);

  // Solo dias futuros (desde hoy en adelante)
  const DIAS_FUTUROS = useMemo(() => DIAS.filter(d => d >= diaActual), [DIAS, diaActual]);

  const cargarPersonal = useCallback(async () => {
    if (config?.sheetId && config?.apiKey) {
      setCargandoPersonal(true);
      setErrorPersonal('');
      try {
        const hojaActiva = hoja || config.sheetName || hojaDelMesActual();
        const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${hojaActiva}!A:AJ?key=${config.apiKey}`);
        if (!r.ok) throw new Error('No se pudo leer la hoja de personal');
        const d = await r.json();
        const rows = d.values || [];
        const todos = [];
        const tObj = {};
        for (let i = 1; i < rows.length; i++) {
          const c = rows[i];
          if (!c || c.length < 3) continue;
          todos.push({ id: i, dni: (c[0] || '').trim(), grado: (c[1] || '').trim(), nombre: (c[2] || '').trim(), area: (c[3] || '').trim(), fila: i + 1 });
          // Turnos del rol completo (columnas F en adelante), mapeados igual que el resto del sistema
          const te = {};
          for (let d = 0; d < totalDias; d++) { te[d + 1] = NOMBRE_A_CODIGO[(c[5 + d] || '').trim()] || ''; }
          tObj[i] = te;
        }
        setPersonal(todos);
        setTurnosPersonal(tObj);
      } catch (e) {
        setErrorPersonal(e.message || 'Error al cargar personal');
      } finally {
        setCargandoPersonal(false);
      }
    }
  }, [config, hoja, totalDias]);

  useEffect(() => {
    if (isOpen) {
      setParticipantes(trabajador ? [{ emp: trabajador, cambios: [] }] : []);
      setModalidad('PERSONAL');
      setPaso(0);
      setMotivo('');
      setPormenores('');
      setError('');
      setDiaSel(null);
      setTurnoNuevo('');
      setMotivoCambio('');
      setBusquedaSolicitante('');
      setBusquedaComp('');
      cargarPersonal();
    }
  }, [isOpen, trabajador, cargarPersonal]);

  // Ya no se bloquea por mes — las solicitudes están disponibles siempre
  useEffect(() => {
    if (isOpen) {
      setBusquedaComp('');
      cargarPersonal();
    }
  }, [isOpen, cargarPersonal]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const turnoDe = (emp, d) => {
    if (!emp) return '';
    // Si el padre no pasa turnos (modal de registro), usar los del rol completo cargado de la hoja
    return turnos?.[emp.id]?.[d] || turnosPersonal?.[emp.id]?.[d] || '';
  };

  const candidatos = (t, idsExcluidos = []) => {
    const idsYa = new Set(idsExcluidos);
    let r = personal.filter(p => !idsYa.has(p.id));
    const q = String(t || '').trim().toLowerCase();
    if (q) r = r.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.dni?.includes(q) ||
      p.grado?.toLowerCase().includes(q) ||
      p.area?.toLowerCase().includes(q)
    );
    const agrupado = {};
    r.slice(0, 60).forEach(p => { const a = p.area || 'Sin area'; if (!agrupado[a]) agrupado[a] = []; agrupado[a].push(p); });
    return agrupado;
  };

  const seleccionarSolicitante = (emp) => {
    setParticipantes([{ emp, cambios: [] }]);
    setBusquedaSolicitante('');
    setError('');
  };

  const agregarCompanero = (emp) => {
    setParticipantes(prev => {
      if (prev.length >= 2 || prev.some(p => p.emp.id === emp.id)) return prev;
      return [...prev, { emp, cambios: [] }];
    });
    setBusquedaComp('');
    setError('');
  };

  const quitarCompanero = () => {
    setParticipantes(prev => prev.slice(0, 1));
    setError('');
  };

  // Agregar cambio con validacion de dia futuro
  const agregarCambio = (idx) => {
    if (!diaSel || !turnoNuevo) return;

    // Validar que el dia sea futuro
    if (diaSel < diaActual) {
      setError('No se pueden hacer cambios en dias pasados');
      return;
    }

    const emp = participantes[idx]?.emp;
    if (!emp) return;
    const actual = turnoDe(emp, diaSel);
    setParticipantes(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const cambios = [...p.cambios.filter(c => c.dia !== diaSel)];
      cambios.push({ dia: diaSel, actual: actual || '', nuevo: turnoNuevo, motivo: motivoCambio || 'Cambio de turno' });
      cambios.sort((a, b) => a.dia - b.dia);
      return { ...p, cambios };
    }));
    setDiaSel(null);
    setTurnoNuevo('');
    setMotivoCambio('');
    setError('');
  };

  const eliminarCambio = (idx, i) => {
    setParticipantes(prev => prev.map((p, j) => j === idx ? { ...p, cambios: p.cambios.filter((_, k) => k !== i) } : p));
  };

  const diasDeSolicitud = () => [...new Set(participantes.flatMap(p => p.cambios.map(c => c.dia)))].sort((a, b) => a - b);

  const validarPasoActual = () => {
    if (participantes.length === 0) return 'Seleccione quien solicita el cambio';
    if (paso === 0 && participantes[0].cambios.length === 0) return 'Indique al menos un cambio de turno del solicitante';
    if (paso === 1 && (!participantes[1] || participantes[1].cambios.length === 0)) return 'Indique al menos un cambio de turno del companero';
    if (paso === 2) {
      if (motivo.trim().length < 10) return 'El motivo debe estar justificado (minimo 10 caracteres)';
      if (!pormenores.trim()) return 'Los pormenores son obligatorios (quien autoriza, referencia, documento)';
    }
    return '';
  };

  const siguiente = () => {
    const err = validarPasoActual();
    if (err) { setError(err); return; }
    setError('');
    const pasos = modalidad === 'CON COMPANERO' ? [0, 1, 2] : [0, 2];
    const idx = pasos.indexOf(paso);
    if (idx < pasos.length - 1) setPaso(pasos[idx + 1]);
  };

  const atras = () => {
    setError('');
    const pasos = modalidad === 'CON COMPANERO' ? [0, 1, 2] : [0, 2];
    const idx = pasos.indexOf(paso);
    if (idx > 0) setPaso(pasos[idx - 1]);
  };

  const handleEnviar = async () => {
    const err = validarPasoActual();
    if (err) { setError(err); return; }

    // Validar que todos los dias sean futuros
    const diasSolicitados = diasDeSolicitud();
    const diasPasados = diasSolicitados.filter(d => d < diaActual);
    if (diasPasados.length > 0) {
      setError(`No se pueden solicitar cambios en dias pasados (${diasPasados.join(', ')})`);
      return;
    }

    const datos = {
      solicitante: `${participantes[0].emp.grado || ''} ${participantes[0].emp.nombre || ''}`.trim(),
      // El area del solicitante es la del trabajador seleccionado (fuente real),
      // con la prop `area` solo como respaldo (p.ej. cuando registra el admin).
      area_solicitante: participantes[0]?.emp?.area || area,
      hoja: hoja || config?.sheetName || hojaDelMesActual(),
      mes: mesFinal,
      anio: anioFinal,
      dias: diasSolicitados,
      tipo_cambio: modalidad,
      motivo: motivo.trim(),
      pormenores: pormenores.trim(),
      participantes: participantes.map(p => ({
        trabajador: `${p.emp.grado || ''} ${p.emp.nombre || ''}`.trim(),
        dni: p.emp.dni || '',
        fila: p.emp.fila || 0,
        area: p.emp.area || area,
        cambios: p.cambios
      }))
    };

    setGuardando(true);
    setError('');
    try {
      await enviarSolicitudCambio(config, datos);
      if (onEnviado) onEnviado(datos);
      onClose();
    } catch (e) {
      console.error('Error al enviar solicitud:', e);
      setError('No se pudo enviar la solicitud. Verifique la configuracion.');
    } finally {
      setGuardando(false);
    }
  };

  const Buscador = ({ placeholder, busqueda, setBusqueda, idsExcluidos, onSeleccionar, autoFocus }) => (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>
      {busqueda && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {cargandoPersonal ? (
            <p className="p-3 text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando personal...</p>
          ) : Object.keys(candidatos(busqueda, idsExcluidos)).length === 0 ? (
            <p className="p-3 text-xs text-gray-400">Sin resultados</p>
          ) : (
            Object.entries(candidatos(busqueda, idsExcluidos)).map(([a, list]) => (
              <div key={a}>
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{a}</p>
                {list.map(emp => (
                  <button key={emp.id} onClick={() => onSeleccionar(emp)} className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors">
                    <p className="text-xs font-semibold text-gray-700">{emp.grado} {emp.nombre}</p>
                    <p className="text-[10px] text-gray-400">{emp.dni || 'Sin DNI'} - {emp.area || 'Sin area'}</p>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  const EditorParticipante = ({ p, idx, etiqueta, colorCls }) => (
    <div className="space-y-4">
      <div className="p-3 rounded-xl border flex items-center justify-between gap-2" style={{ backgroundColor: colorCls.bg, borderColor: colorCls.bd }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorCls.ic}`}>
            {idx === 0 ? <User className="w-4 h-4 text-emerald-700" /> : <Users className="w-4 h-4 text-amber-700" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-700 truncate">{etiqueta}: {p.emp.grado} {p.emp.nombre}</p>
            <p className="text-[10px] text-gray-400 truncate">{p.emp.dni || 'Sin DNI'} - {p.emp.area || 'Sin area'}</p>
          </div>
        </div>
        {idx === 1 && (
          <button onClick={quitarCompanero} className="p-1.5 text-red-400 hover:text-red-600 rounded-lg flex-shrink-0" title="Quitar companero">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Horario Actual - {MESES[(mesFinal || 1) - 1]} {anioFinal}</h4>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {DIAS.map(dia => {
            const c = turnoDe(p.emp, dia);
            const cambiado = p.cambios.find(x => x.dia === dia);
            const codigoMostrar = cambiado ? cambiado.nuevo : c;
            const t = TURNO_MAP[codigoMostrar];
            const bg = cambiado ? 'bg-orange-50' : (c ? t?.color : 'white');
            const color = cambiado ? '#f97316' : (c ? t?.texto : '#D1D5DB');
            // Marcar dias pasados
            const esPasado = dia < diaActual;
            return (
              <div key={dia}
                className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] font-medium border transition-all ${
                  cambiado ? 'border-orange-400 ring-2 ring-orange-300' : 'border-gray-100'
                } ${esPasado ? 'opacity-40' : ''}`}
                style={{ backgroundColor: bg }}
                title={`Dia ${dia}: ${t?.nombre || 'Sin turno'}${esPasado ? ' (Pasado)' : ''}`}
              >
                <span className="text-gray-500 leading-none">{dia}</span>
                <span className="font-bold leading-none" style={{ color }}>{codigoMostrar || '-'}</span>
                {esPasado && <span className="text-[6px] text-red-400 leading-none mt-0.5">PASADO</span>}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-1">Los dias pasados (atenuados) no pueden ser modificados</p>
      </div>

      <div className="bg-gray-50 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Nuevo Cambio</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dia</label>
            <select
              value={diaSel || ''}
              onChange={e => setDiaSel(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar dia</option>
              {DIAS_FUTUROS.map(d => (
                <option key={d} value={d}>
                  Dia {d} {d === diaActual ? ' (Hoy)' : ''}
                </option>
              ))}
            </select>
            <p className="text-[9px] text-gray-400 mt-1">Solo dias desde hoy en adelante</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nuevo Turno</label>
            <select
              value={turnoNuevo}
              onChange={e => setTurnoNuevo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Seleccionar turno</option>
              <option value={SIN_TURNO_VAL}>S/T - SIN TURNO</option>
              {TURNOS.map(t => <option key={t.codigo} value={t.codigo}>{t.codigo} - {t.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Motivo</label>
            <input
              value={motivoCambio}
              onChange={e => setMotivoCambio(e.target.value)}
              placeholder="Opcional"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <button
          onClick={() => agregarCambio(idx)}
          disabled={!diaSel || !turnoNuevo}
          className="mt-3 px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-all touch-manipulation active:scale-95"
          style={{ backgroundColor: COLOR_PRIMARIO }}
        >
          + Agregar Cambio
        </button>
      </div>

      {p.cambios.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Cambios Pendientes ({p.cambios.length})</h4>
          <div className="space-y-2">
            {p.cambios.map((c, i) => {
              const tA = TURNO_MAP[c.actual];
              const tN = TURNO_MAP[c.nuevo];
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white line-through text-gray-400" style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#9ca3af' }}>
                    {c.actual || '-'}
                  </span>
                  <span className="text-xs">→</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white" style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                    {c.nuevo}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto truncate max-w-[120px]">{c.motivo}</span>
                  <button onClick={() => eliminarCambio(idx, i)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0" title="Quitar cambio">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const pasos = modalidad === 'CON COMPANERO' ? [
    { n: 1, etiqueta: 'Solicitante', icono: User },
    { n: 2, etiqueta: 'Companero', icono: Users },
    { n: 3, etiqueta: 'Resumen', icono: CheckCircle2 },
  ] : [
    { n: 1, etiqueta: 'Solicitante', icono: User },
    { n: 2, etiqueta: 'Resumen', icono: CheckCircle2 },
  ];
  const pasoIdx = pasos.findIndex(p => p.n === (paso === 0 ? 1 : paso === 1 ? 2 : 3));

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Solicitud de Cambio de Turno</h3>
              <p className="text-[10px] sm:text-xs text-white/70">{MESES[(mesFinal || 1) - 1]} {anioFinal} · Personal o con companero</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          {pasos.map((p, i) => {
            const Icono = p.icono;
            const activo = i === pasoIdx;
            const completado = i < pasoIdx;
            return (
              <div key={p.n} className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`flex items-center gap-1.5 min-w-0 ${activo ? 'text-emerald-700' : completado ? 'text-emerald-500' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${activo ? 'border-emerald-500 bg-emerald-50' : completado ? 'border-emerald-400 bg-emerald-100' : 'border-gray-200'}`}>
                    {completado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icono className="w-3 h-3" />}
                  </span>
                  <span className="text-[11px] font-semibold truncate">{p.etiqueta}</span>
                </div>
                {i < pasos.length - 1 && <div className={`flex-1 h-0.5 rounded ${i < pasoIdx ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorPersonal && !cargandoPersonal && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{errorPersonal}</span>
            </div>
          )}

          {paso === 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Quien solicita el cambio <span className="text-red-400">*</span>
                  </label>
                  {participantes.length > 0 && (
                    <button onClick={() => { setParticipantes([]); setError(''); }} className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">Cambiar solicitante</button>
                  )}
                </div>
                {participantes.length === 0 && (
                  <Buscador
                    placeholder="Buscar quien solicita por nombre, grado o DNI..."
                    busqueda={busquedaSolicitante}
                    setBusqueda={setBusquedaSolicitante}
                    idsExcluidos={[]}
                    onSeleccionar={seleccionarSolicitante}
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Tipo de cambio <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setModalidad('PERSONAL'); setParticipantes(prev => prev.slice(0, 1)); setPaso(0); setError(''); }}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all ${modalidad === 'PERSONAL' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-gray-200 bg-white hover:border-emerald-200'}`}
                  >
                    <User className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-gray-700">Personal</span>
                      <span className="block text-[10px] text-gray-400">Solo mi cambio</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setModalidad('CON COMPANERO'); setError(''); }}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all ${modalidad === 'CON COMPANERO' ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20' : 'border-gray-200 bg-white hover:border-emerald-200'}`}
                  >
                    <Users className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      <span className="block text-xs font-bold text-gray-700">Con companero</span>
                      <span className="block text-[10px] text-gray-400">Intercambio de turnos</span>
                    </span>
                  </button>
                </div>
              </div>

              {participantes.length > 0 && (
                <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                  <EditorParticipante
                    p={participantes[0]}
                    idx={0}
                    etiqueta="Solicitante"
                    colorCls={{ bg: 'rgba(16,185,129,0.06)', bd: '#d1fae5', ic: 'bg-emerald-100' }}
                  />
                </div>
              )}
            </>
          )}

          {paso === 1 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Companero (intercambio) <span className="text-red-400">*</span></label>
                  <span className="text-[10px] text-gray-400">{participantes.length}/2 participantes</span>
                </div>
                {participantes.length < 2 ? (
                  <Buscador
                    placeholder="Buscar companero por nombre, grado o DNI..."
                    busqueda={busquedaComp}
                    setBusqueda={setBusquedaComp}
                    idsExcluidos={participantes.map(p => p.emp.id)}
                    onSeleccionar={agregarCompanero}
                    autoFocus
                  />
                ) : (
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
                    <EditorParticipante
                      p={participantes[1]}
                      idx={1}
                      etiqueta="Companero"
                      colorCls={{ bg: 'rgba(245,158,11,0.06)', bd: '#fde68a', ic: 'bg-amber-100' }}
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-bold text-emerald-800">Resumen de la propuesta</p>
                </div>
                <p className="text-xs text-emerald-700">Revise los cambios de turno propuestos antes de enviar la solicitud.</p>
              </div>

              {participantes.map((p, idx) => (
                <div key={p.emp.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                      {idx === 0 ? <User className="w-4 h-4 text-emerald-700" /> : <Users className="w-4 h-4 text-amber-700" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{idx === 0 ? 'Solicitante' : 'Companero'}: {p.emp.grado} {p.emp.nombre}</p>
                      <p className="text-[10px] text-gray-400 truncate">{p.emp.dni || 'Sin DNI'} - {p.emp.area || 'Sin area'}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {p.cambios.map(c => {
                      const tA = TURNO_MAP[c.actual];
                      const tN = TURNO_MAP[c.nuevo];
                      return (
                        <div key={c.dia} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                          <span className="text-xs font-bold text-gray-600 w-12 flex-shrink-0">Dia {c.dia}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white" style={{ backgroundColor: tA?.color || 'transparent', color: tA?.texto || '#94a3b8' }}>
                            {c.actual || 'S/T'}
                          </span>
                          <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-gray-200 bg-white" style={{ backgroundColor: tN?.color || 'transparent', color: tN?.texto || '#334155' }}>
                            {c.nuevo}
                          </span>
                          {c.motivo && c.motivo !== 'Cambio de turno' && (
                            <span className="text-[10px] text-gray-400 ml-auto truncate max-w-[160px]">{c.motivo}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {modalidad === 'CON COMPANERO' && participantes.length === 2 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <p className="text-xs text-emerald-800">Intercambio: cada participante asume los turnos indicados en su propuesta. Ambas se enviaran para aprobacion.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Motivo justificado <span className="text-red-400">*</span>
                  <span className="text-gray-400 normal-case font-medium"> ({motivo.trim().length}/10 minimo)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={2}
                  placeholder="Detalle el motivo del cambio, de manera clara y justificada..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Pormenores <span className="text-red-400">*</span></label>
                <textarea
                  value={pormenores}
                  onChange={e => setPormenores(e.target.value)}
                  rows={3}
                  placeholder="Quien autoriza, referencia, documento sustentatorio, companero involucrado..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                />
              </div>
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

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
          {paso < 2 ? (
            <button
              onClick={siguiente}
              disabled={participantes.length === 0}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2 touch-manipulation active:scale-95"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleEnviar}
              disabled={guardando}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2 touch-manipulation active:scale-95"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4" /> Enviar Solicitud</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SolicitudesCambioTurno;