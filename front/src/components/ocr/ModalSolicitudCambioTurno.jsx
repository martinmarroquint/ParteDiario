// src/components/ocr/ModalSolicitudCambioTurno.jsx
// MODULO DE CAMBIOS DE TURNO - SOLO PERMITE MES ACTUAL Y DIAS FUTUROS
// SIN EMOJIS
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Inbox, RefreshCw, Loader2, ChevronDown, Lock, Shield,
  AlertCircle, Check, Ban, Calendar, User, ArrowRightLeft, FileText,
  UserPlus
} from 'lucide-react';
import { COLOR_PRIMARIO, CLAVE_SECRETA, MESES, TURNO_MAP, hojaDelMesActual } from './constantes';
import {
  ESTADOS, ESTADOS_META, obtenerSolicitudesCambio, actualizarSolicitudCambio
} from './servicioSolicitudes';
import SolicitudesCambioTurno from './SolicitudesCambioTurno';

const ModalSolicitudCambioTurno = ({
  isOpen, onClose,
  config = null,
  hoja = '',
  mes = 0,
  anio = new Date().getFullYear(),
  area = '',
  userName = 'ADMIN'
}) => {
  const [vista, setVista] = useState('bandeja');
  const [esAdmin, setEsAdmin] = useState(false);
  const [claveModo, setClaveModo] = useState(false);
  const [claveInput, setClaveInput] = useState('');

  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(ESTADOS.PENDIENTE);
  const [expandida, setExpandida] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  // Usar el mes que viene del panel (ya es el mes actual)
  const [mesResuelto, setMesResuelto] = useState(mes);
  const [hojaResuelta, setHojaResuelta] = useState(hoja || config?.sheetName || hojaDelMesActual());

  // Validar que el mes sea el actual (por si acaso)
  const fechaActual = new Date();
  const mesActual = fechaActual.getMonth() + 1;
  const anioActual = fechaActual.getFullYear();

  // Usar el mes que viene del panel (ya no se fuerza al actual)
  useEffect(() => {
    setMesResuelto(mes);
    setHojaResuelta(hoja);
  }, [mes, anio, hoja]);

  const cargar = useCallback(async () => {
    if (!isOpen) return;
    setCargando(true);
    try {
      // Admin ve todo, jefe/usuario ven solo su área
      const filtroArea = esAdmin ? null : (area || null);
      const data = await obtenerSolicitudesCambio(config, filtroArea);
      setLista(data);
      setError('');
    } catch {
      setError('No se pudieron cargar las solicitudes.');
    } finally {
      setCargando(false);
    }
  }, [isOpen, config, esAdmin, area]);

  useEffect(() => {
    if (isOpen && vista === 'bandeja') {
      setVista('bandeja');
      setEsAdmin(false);
      setClaveModo(false);
      setClaveInput('');
      setExpandida(null);
      setObservacion('');
      cargar();

      const it = setInterval(cargar, 30000);
      return () => clearInterval(it);
    }
  }, [isOpen, cargar, vista]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen && vista === 'bandeja') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, vista]);

  if (!isOpen) return null;

  if (vista === 'registro') {
    return (
      <SolicitudesCambioTurno
        isOpen
        onClose={() => { setVista('bandeja'); setTab(ESTADOS.PENDIENTE); cargar(); }}
        onEnviado={() => { setVista('bandeja'); setTab(ESTADOS.PENDIENTE); cargar(); }}
        config={config}
        hoja={hojaResuelta}
        mes={mesResuelto}
        anio={anio}
        area={area}
      />
    );
  }

  const verificarClave = () => {
    if (claveInput.trim() === CLAVE_SECRETA) { setEsAdmin(true); setClaveModo(false); setClaveInput(''); setError(''); }
    else { setClaveInput(''); setError('Clave incorrecta'); }
  };

  const procesar = async (sol, nuevoEstado) => {
    if (procesando) return;
    if (nuevoEstado === ESTADOS.DESAPROBADO && !observacion.trim()) {
      setError('Debe escribir la observacion / motivos para desaprobar.');
      setExpandida(sol.id);
      return;
    }
    setProcesando(true);
    setError('');
    try {
      await actualizarSolicitudCambio(config, {
        id: sol.id, estado: nuevoEstado, revisadoPor: userName, observacion: observacion.trim()
      });
      setObservacion('');
      setExpandida(null);
      await cargar();

      if (nuevoEstado === ESTADOS.APROBADO) {
        window.dispatchEvent(new CustomEvent('registrar-cambios-aprobados', {
          detail: {
            solicitud: sol,
            participantes: sol.participantes || []
          }
        }));
        window.dispatchEvent(new CustomEvent('solicitud-aprobada'));
        setError('Solicitud aprobada. Cambios registrados en historial.');
      } else {
        setError('Solicitud desaprobada.');
      }

      setTimeout(() => setError(''), 4000);
    } catch {
      setError('No se pudo procesar la solicitud. Verifique el Apps Script.');
    } finally {
      setProcesando(false);
    }
  };

  const pendientes = lista.filter(s => s.estado === ESTADOS.PENDIENTE);
  const aprobadas = lista.filter(s => s.estado === ESTADOS.APROBADO);
  const desaprobadas = lista.filter(s => s.estado === ESTADOS.DESAPROBADO);
  const actual = tab === ESTADOS.APROBADO ? aprobadas : tab === ESTADOS.DESAPROBADO ? desaprobadas : pendientes;

  const formatearFecha = (iso) => {
    if (!iso) return '';
    try {
      const f = new Date(iso);
      if (isNaN(f.getTime())) return iso;
      return f.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const TabButton = ({ estado, conteo, etiqueta }) => (
    <button
      onClick={() => setTab(estado)}
      className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${
        tab === estado ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'
      }`}
    >
      {etiqueta}
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === estado ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{conteo}</span>
    </button>
  );

  const ChipTurno = ({ codigo, nombre }) => {
    const sinTurno = !codigo && !nombre;
    const t = TURNO_MAP[codigo];
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sinTurno ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-200'}`}
        style={t ? { backgroundColor: t.color, color: t.texto } : {}}
        title={t?.nombre || nombre || (sinTurno ? 'Sin turno' : '')}
      >
        {codigo || (sinTurno ? 'S/T' : '')}
      </span>
    );
  };

  const Tarjeta = ({ s }) => {
    const abierta = expandida === s.id;
    const meta = ESTADOS_META[s.estado] || ESTADOS_META[ESTADOS.PENDIENTE];
    const participantes = s.participantes || [];
    const resumen = participantes.map(p => p.trabajador).filter(Boolean).join(' y ') || 'Sin trabajadores';
    return (
      <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${abierta ? 'border-emerald-300 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
        <button
          onClick={() => { setExpandida(abierta ? null : s.id); setObservacion(''); setError(''); }}
          className="w-full text-left px-4 py-3 flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{resumen}</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" /> {MESES[(s.mes || 1) - 1]} {s.anio} · {s.dias.join(', ')} · #{s.id}
              {s.area_solicitante && <span className="px-1.5 py-px rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold flex-shrink-0">{s.area_solicitante}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.cls}`}>{meta.etiqueta}</span>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${abierta ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {abierta && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            <div className="pt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Area</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{s.area_solicitante || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Tipo</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{s.tipo_cambio === 'CON COMPANERO' ? 'Con companero' : 'Personal'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Dias</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{s.dias.join(', ')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Fecha solicitud</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{formatearFecha(s.fecha_solicitud) || '-'}</p>
              </div>
            </div>

            <div className="space-y-2">
              {participantes.map((p, i) => (
                <div key={i} className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-bold text-gray-800">{i + 1}. {p.trabajador || 'Sin nombre'}</p>
                    <span className="text-[10px] text-gray-400">{p.dni ? `DNI ${p.dni}` : ''}{p.area && p.area !== s.area_solicitante ? ` · ${p.area}` : ''}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-gray-500">Actual:</span>
                    <ChipTurno codigo={p.turno_actual} nombre={p.turno_actual_nombre} />
                    <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-gray-500">Propuesta:</span>
                    <ChipTurno codigo={p.turno_solicitado} nombre={p.turno_solicitado_nombre} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">{s.tipo_cambio || 'Tipo'} · Motivo</p>
              <p className="text-xs text-gray-700">{s.motivo || '-'}</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-[9px] text-amber-500 uppercase font-semibold mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Pormenores
              </p>
              <p className="text-xs text-amber-800 whitespace-pre-line">{s.pormenores || '-'}</p>
            </div>

            {s.estado !== ESTADOS.PENDIENTE && (
              <div className={`rounded-xl p-3 ${s.estado === ESTADOS.APROBADO ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-[9px] uppercase font-semibold mb-1 ${s.estado === ESTADOS.APROBADO ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.estado === ESTADOS.APROBADO ? 'Aprobada por' : 'Desaprobada por'} {s.revisado_por || '-'} · {formatearFecha(s.fecha_revision) || '-'}
                </p>
                {s.observacion_revision && (
                  <p className={`text-xs whitespace-pre-line ${s.estado === ESTADOS.APROBADO ? 'text-emerald-800' : 'text-red-700'}`}>
                    <strong>Observacion / motivos:</strong> {s.observacion_revision}
                  </p>
                )}
              </div>
            )}

            {s.estado === ESTADOS.PENDIENTE && esAdmin && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Observacion <span className="text-gray-400">(obligatoria al desaprobar)</span>
                  </label>
                  <textarea
                    value={observacion}
                    onChange={e => setObservacion(e.target.value)}
                    rows={2}
                    placeholder="Detalle de la revision, motivos del rechazo..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => procesar(s, ESTADOS.DESAPROBADO)}
                    disabled={procesando}
                    className="px-4 py-2.5 text-red-600 bg-white border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Desaprobar
                  </button>
                  <button
                    onClick={() => procesar(s, ESTADOS.APROBADO)}
                    disabled={procesando}
                    className="px-4 py-2.5 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md hover:shadow-lg"
                    style={{ backgroundColor: COLOR_PRIMARIO }}
                  >
                    {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                  </button>
                </div>
              </>
            )}
            {s.estado === ESTADOS.PENDIENTE && !esAdmin && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700">Solicitud pendiente de revision por el administrador.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Cambios de Turno</h3>
              <p className="text-[10px] sm:text-xs text-white/70">
                {MESES[(mesResuelto || 1) - 1]} {anio} · Bandeja de solicitudes {esAdmin ? '· Modo administrador' : ''}{area && area !== 'SIN AREA' ? ` · ${area}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!esAdmin && (
              <button onClick={() => setClaveModo(!claveModo)} className={`p-1.5 rounded-lg transition-colors ${claveModo ? 'bg-white/20' : 'hover:bg-white/20'}`} title={claveModo ? 'Cancelar' : 'Acceso administrador'}>
                <Shield className="w-4 h-4" />
              </button>
            )}
            {esAdmin && (
              <button onClick={() => setEsAdmin(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1 text-[10px]" title="Salir de modo administrador">
                <Lock className="w-4 h-4" />
              </button>
            )}
            <button onClick={cargar} disabled={cargando} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {claveModo && !esAdmin && (
          <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
            <input
              type="password"
              value={claveInput}
              onChange={e => { setClaveInput(e.target.value); setError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') verificarClave(); }}
              placeholder="Clave de administrador"
              autoFocus
              className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
            />
            <button onClick={verificarClave} className="px-4 py-2.5 text-white rounded-xl text-sm font-bold" style={{ backgroundColor: COLOR_PRIMARIO }}>
              Verificar
            </button>
          </div>
        )}

        <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-100 flex gap-2 flex-shrink-0">
          <TabButton estado={ESTADOS.PENDIENTE} conteo={pendientes.length} etiqueta="Pendientes" />
          <TabButton estado={ESTADOS.APROBADO} conteo={aprobadas.length} etiqueta="Aprobadas" />
          <TabButton estado={ESTADOS.DESAPROBADO} conteo={desaprobadas.length} etiqueta="Desaprobadas" />
        </div>

        {error && (
          <div className="px-4 sm:px-5 pt-3 flex-shrink-0">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {cargando && actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: COLOR_PRIMARIO }} />
              <p className="text-sm text-gray-500">Cargando solicitudes...</p>
            </div>
          ) : actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="w-14 h-14 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">Sin solicitudes {tab.toLowerCase()}s</p>
              <p className="text-xs text-gray-400 mt-1">Verifica que la hoja SOLICITUDES_CAMBIOS exista y el script este desplegado</p>
            </div>
          ) : (
            actual.map(s => <Tarjeta key={s.id} s={s} />)
          )}
        </div>

        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={() => setVista('registro')}
            className="w-full py-3 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <UserPlus className="w-4 h-4" /> Registrar cambio de turno
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSolicitudCambioTurno;