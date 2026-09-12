// src/components/ocr/ModalSolicitudCambioTurno.jsx
// BANDEJA DE SOLICITUDES - FastAPI Backend
// Vista unificada: pendientes / aprobadas / desaprobadas
import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Inbox, RefreshCw, Loader2, ChevronDown, Shield,
  AlertCircle, Check, Ban, Calendar, User, ArrowRightLeft, FileText,
  UserPlus, ChevronRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { COLOR_PRIMARIO, MESES, TURNO_MAP, hojaDelMesActual } from './constantes';
import {
  solicitudesService, ESTADOS, ESTADOS_META, getNivelLabel,
} from './services/solicitudesService';
import SolicitudesCambioTurno from './SolicitudesCambioTurno';

const NIVEL_LABELS_APP = {
  1: 'Jefe de Area',
  2: 'Jefe de Departamento',
  3: 'Jefe de Division',
  4: 'Administrador',
};

const ModalSolicitudCambioTurno = ({
  isOpen, onClose,
  config = null,
  hoja = '',
  mes = 0,
  anio = new Date().getFullYear(),
  area = '',
  userName = 'ADMIN',
  userRol: userRolProp = 0,
  userAreas: userAreasProp = [],
  personal = [],
  turnosMap = {},
}) => {
  const getUserFromStorage = () => {
    try { return JSON.parse(localStorage.getItem('ocr_user_data') || '{}'); } catch { return null; }
  };
  const storedUser = isOpen ? getUserFromStorage() : null;
  const userRol = storedUser?.rol_principal ??
    (storedUser?.roles?.length ? Math.max(...storedUser.roles) :
      ({ admin: 4, jefe_division: 3, jefe_departamento: 2, jefe_area: 1, tramite_documentario: 5 }[storedUser?.rol] ?? userRolProp));
  const userAreas = storedUser?.areas?.length > 0 ? storedUser.areas :
    (storedUser?.area ? [storedUser.area] : userAreasProp);
  const esAdmin = userRol === 4;
  const userId = storedUser?.id || storedUser?.user_id || 0;

  const [vista, setVista] = useState('lista'); // 'lista' | 'registro'
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(ESTADOS.PENDIENTE);
  const [expandida, setExpandida] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);

  // ---- Load ----
  const cargar = useCallback(async () => {
    if (!isOpen) return;
    setCargando(true); setError('');
    try {
      const [resBandeja, resMias] = await Promise.all([
        solicitudesService.getBandeja(),
        solicitudesService.getMisSolicitudes(),
      ]);

      // Check if both failed due to auth
      if (!resBandeja.success && !resMias.success &&
          (resBandeja.error?.includes('expirada') || resMias.error?.includes('expirada'))) {
        setError('Sesion expirada. Refresque la pagina para volver a iniciar sesion.');
        setCargando(false);
        return;
      }

      // Merge: bandeja (what I can act on) + mis solicitudes (what I created)
      const bandeja = resBandeja.success ? resBandeja.data : [];
      const mias = resMias.success ? resMias.data : [];
      const merged = [...bandeja];
      for (const s of mias) {
        if (!merged.find(m => m.id === s.id)) merged.push(s);
      }
      // Tag each item
      const tagged = merged.map(s => ({
        ...s,
        _esMia: s.solicitante_id === userId,
        _puedeActuar: esAdmin
          ? s.estado === ESTADOS.PENDIENTE
          : (userRol >= 1 && userRol <= 3)
            ? s.estado === ESTADOS.PENDIENTE && s.nivel_actual === userRol &&
              (s.area_solicitante === area || s.participantes?.some(p => userAreas.includes(p.area)))
            : false,
      }));
      setLista(tagged);
    } catch {
      setError('No se pudieron cargar las solicitudes.');
    } finally {
      setCargando(false);
    }
  }, [isOpen, esAdmin, userRol, userAreas, area, userId]);

  useEffect(() => {
    if (isOpen) {
      setVista('lista'); setTab(ESTADOS.PENDIENTE);
      setExpandida(null); setObservacion(''); setError('');
      cargar();
    }
  }, [isOpen, cargar]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen && vista === 'lista') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, vista]);

  if (!isOpen) return null;

  // ---- Registro ----
  if (vista === 'registro') {
    return (
      <SolicitudesCambioTurno
        isOpen
        onClose={() => { setVista('lista'); cargar(); }}
        onEnviado={() => { setVista('lista'); cargar(); }}
        hoja={hoja || hojaDelMesActual()}
        mes={mes} anio={anio} area={area}
        personal={personal} turnosMap={turnosMap} userName={userName}
      />
    );
  }

  // ---- Actions ----
  const procesar = async (sol, nuevoEstado) => {
    if (procesando) return;
    if (nuevoEstado === ESTADOS.DESAPROBADO && !observacion.trim()) {
      setError('Debe escribir la observacion / motivo para desaprobar.');
      setExpandida(sol.id); return;
    }
    setProcesando(true); setError('');
    try {
      if (nuevoEstado === ESTADOS.APROBADO) {
        const r = await solicitudesService.aprobarSolicitud(sol.id, observacion.trim());
        if (!r.success) throw new Error(r.error);
        setError('Solicitud aprobada.');
      } else {
        const r = await solicitudesService.rechazarSolicitud(sol.id, observacion.trim());
        if (!r.success) throw new Error(r.error);
        setError('Solicitud desaprobada.');
      }
      setObservacion(''); setExpandida(null);
      await cargar();
      setTimeout(() => setError(''), 4000);
    } catch (e) {
      setError(e.message || 'No se pudo procesar la solicitud.');
    } finally { setProcesando(false); }
  };

  const cancelarSolicitud = async (sol) => {
    if (procesando) return;
    if (!confirm('Desea cancelar esta solicitud?')) return;
    setProcesando(true);
    try {
      const r = await solicitudesService.cancelarSolicitud(sol.id);
      if (!r.success) throw new Error(r.error);
      setError('Solicitud cancelada.');
      await cargar();
      setTimeout(() => setError(''), 4000);
    } catch (e) {
      setError(e.message || 'No se pudo cancelar.');
    } finally { setProcesando(false); }
  };

  // ---- Filtered lists ----
  const pendientes = lista.filter(s => s.estado === ESTADOS.PENDIENTE);
  const aprobadas = lista.filter(s => s.estado === ESTADOS.APROBADO);
  const desaprobadas = lista.filter(s => s.estado === ESTADOS.DESAPROBADO);
  const canceladas = lista.filter(s => s.estado === ESTADOS.CANCELADO);
  const actual = tab === ESTADOS.APROBADO ? aprobadas
    : tab === ESTADOS.DESAPROBADO ? desaprobadas
    : tab === ESTADOS.CANCELADO ? canceladas
    : pendientes;

  // ---- Helpers ----
  const formatearFecha = (iso) => {
    if (!iso) return '';
    try {
      const f = new Date(iso);
      return isNaN(f.getTime()) ? iso : f.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const TabButton = ({ estado, conteo, etiqueta }) => (
    <button onClick={() => { setTab(estado); setExpandida(null); }}
      className={`flex-1 h-10 rounded-xl text-xs font-semibold border-2 transition-all flex items-center justify-center gap-1.5 ${
        tab === estado ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-400 hover:border-gray-200'
      }`}>
      {etiqueta}
      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${tab === estado ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{conteo}</span>
    </button>
  );

  const ChipTurno = ({ codigo }) => {
    const sin = !codigo;
    const t = TURNO_MAP[codigo];
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sin ? 'bg-gray-100 text-gray-400 border-gray-200' : 'bg-white border-gray-200'}`}
        style={t ? { backgroundColor: t.color, color: t.texto } : {}}>
        {sin ? 'S/T' : codigo}
      </span>
    );
  };

  // ============================================
  // TARJETA DE SOLICITUD
  // ============================================
  const Tarjeta = ({ s }) => {
    const abierta = expandida === s.id;
    const meta = ESTADOS_META[s.estado] || ESTADOS_META[ESTADOS.PENDIENTE];
    const participantes = s.participantes || [];
    const resumen = participantes.map(p => p.nombre || p.trabajador).filter(Boolean).join(' y ') || 'Sin trabajadores';
    const cadena = s.cadena || [];
    const historial = s.historial || [];
    const nivelActual = s.nivel_actual || 4;

    return (
      <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${abierta ? 'border-emerald-300 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
        <button onClick={() => { setExpandida(abierta ? null : s.id); setObservacion(''); setError(''); }}
          className="w-full text-left px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{resumen}</p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 flex-shrink-0" /> {MESES[(s.mes || 1) - 1]} {s.anio} · #{s.id}
              {s.area_solicitante && <span className="px-1.5 py-px rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold flex-shrink-0">{s.area_solicitante}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {s.estado === ESTADOS.PENDIENTE && s._puedeActuar && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                Nivel {nivelActual}/{cadena.length}
              </span>
            )}
            {s._esMia && <span className="text-[9px] text-gray-400">Mi solicitud</span>}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${meta.cls}`}>{meta.etiqueta}</span>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${abierta ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {abierta && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
            <div className="pt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Solicitante</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{s.solicitante_nombre || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Tipo</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{s.tipo_cambio || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Area</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5 truncate">{s.area_solicitante || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Fecha</p>
                <p className="text-[11px] font-semibold text-gray-700 mt-0.5">{formatearFecha(s.fecha_solicitud) || '-'}</p>
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              {participantes.map((p, i) => (
                <div key={i} className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-800 mb-1.5">{i + 1}. {p.nombre || 'Sin nombre'}</p>
                  {(p.cambios || []).length > 0 ? (
                    <div className="space-y-1">
                      {p.cambios.map((c, ci) => (
                        <div key={ci} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Dia {c.dia || c.dia_semana}:</span>
                          <ChipTurno codigo={c.turno_actual} />
                          <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                          <ChipTurno codigo={c.turno_nuevo} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <ChipTurno codigo={p.turno_actual} />
                      <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                      <ChipTurno codigo={p.turno_solicitado} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[9px] text-gray-400 uppercase font-semibold mb-1">Motivo</p>
              <p className="text-xs text-gray-700">{s.motivo || '-'}</p>
            </div>

            {/* Cadena de aprobación */}
            {cadena.length > 0 && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                <p className="text-[9px] text-blue-500 uppercase font-semibold mb-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Cadena de aprobacion
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {cadena.map((nivel, idx) => {
                    const esNivelActual = s.estado === ESTADOS.PENDIENTE && nivel.nivel === nivelActual;
                    const fueAprobado = historial.find(h => h.nivel === nivel.nivel && (h.accion === 'APROBADO' || h.estado === 'APROBADO'));
                    const fueRechazado = historial.find(h => h.nivel === nivel.nivel && (h.accion === 'DESAPROBADO' || h.estado === 'DESAPROBADO'));
                    return (
                      <React.Fragment key={idx}>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border ${
                          fueRechazado ? 'bg-red-50 text-red-600 border-red-200' :
                          fueAprobado ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          esNivelActual ? 'bg-amber-50 text-amber-600 border-amber-200 ring-1 ring-amber-300' :
                          'bg-white text-gray-500 border-gray-200'
                        }`}>
                          {fueAprobado ? <CheckCircle2 className="w-3 h-3" /> :
                           fueRechazado ? <XCircle className="w-3 h-3" /> :
                           esNivelActual ? <Clock className="w-3 h-3" /> : null}
                          <span>{nivel.nombre}</span>
                          <span className="text-[8px] opacity-60">({NIVEL_LABELS_APP[nivel.nivel] || `N${nivel.nivel}`})</span>
                        </div>
                        {idx < cadena.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-[9px] text-gray-400 uppercase font-semibold mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Historial
                </p>
                <div className="space-y-2">
                  {historial.map((h, i) => {
                    const esAprobado = h.accion === 'APROBADO' || h.estado === 'APROBADO';
                    return (
                      <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${esAprobado ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${esAprobado ? 'bg-emerald-500' : 'bg-red-500'}`}>
                          {esAprobado ? <Check className="w-3 h-3 text-white" /> : <Ban className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-semibold ${esAprobado ? 'text-emerald-700' : 'text-red-700'}`}>
                            {NIVEL_LABELS_APP[h.nivel] || `Nivel ${h.nivel}`} — {h.aprobador_nombre || h.nombre || '-'}
                          </p>
                          <p className="text-[9px] text-gray-400">{formatearFecha(h.fecha)}</p>
                          {h.observaciones && (
                            <p className="text-[10px] text-gray-600 mt-0.5 italic">"{h.observaciones || h.observacion}"</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {s.estado === ESTADOS.PENDIENTE && s._puedeActuar && (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Observacion {s._puedeActuar && <span className="text-gray-40">(obligatoria al desaprobar)</span>}
                  </label>
                  <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={2}
                    placeholder="Detalle de la revision..."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button onClick={() => procesar(s, ESTADOS.DESAPROBADO)} disabled={procesando}
                    className="px-4 py-2.5 text-red-600 bg-white border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center gap-1.5">
                    {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Desaprobar
                  </button>
                  <button onClick={() => procesar(s, ESTADOS.APROBADO)} disabled={procesando}
                    className="px-4 py-2.5 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md hover:shadow-lg"
                    style={{ backgroundColor: COLOR_PRIMARIO }}>
                    {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Aprobar
                  </button>
                </div>
              </>
            )}

            {/* Pendiente pero no puede actuar */}
            {s.estado === ESTADOS.PENDIENTE && !s._puedeActuar && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  {s._esMia
                    ? (s.nivel_actual === 4 ? 'Pendiente de aprobacion final por el administrador.' : `Pendiente con ${NIVEL_LABELS_APP[s.nivel_actual] || 'su jefe'}.`)
                    : `Pendiente con ${NIVEL_LABELS_APP[s.nivel_actual] || `nivel ${s.nivel_actual}`}.`}
                </p>
              </div>
            )}

            {/* Cancel — solo si es mia y esta pendiente */}
            {s.estado === ESTADOS.PENDIENTE && s._esMia && !s._puedeActuar && (
              <div className="flex justify-end">
                <button onClick={() => cancelarSolicitud(s)} disabled={procesando}
                  className="px-4 py-2 text-red-600 bg-white border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-50 flex items-center gap-1.5">
                  {procesando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Cancelar solicitud
                </button>
              </div>
            )}

            {/* Resultado final */}
            {s.estado !== ESTADOS.PENDIENTE && (
              <div className={`rounded-xl p-3 ${s.estado === ESTADOS.APROBADO ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                <p className={`text-[9px] uppercase font-semibold mb-1 ${s.estado === ESTADOS.APROBADO ? 'text-emerald-600' : 'text-red-500'}`}>
                  {s.estado === ESTADOS.APROBADO ? 'Aprobada' : s.estado === ESTADOS.CANCELADO ? 'Cancelada' : 'Desaprobada'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Solicitudes de Cambio</h3>
              <p className="text-[10px] sm:text-xs text-white/70">
                {MESES[(mes || 1) - 1]} {anio} · {esAdmin ? 'Administrador' : NIVEL_LABELS_APP[userRol] || 'Usuario'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={cargar} disabled={cargando} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Actualizar">
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Cerrar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-5 py-3 bg-white border-b border-gray-100 flex gap-2 flex-shrink-0">
          <TabButton estado={ESTADOS.PENDIENTE} conteo={pendientes.length} etiqueta="Pendientes" />
          <TabButton estado={ESTADOS.APROBADO} conteo={aprobadas.length} etiqueta="Aprobadas" />
          <TabButton estado={ESTADOS.DESAPROBADO} conteo={desaprobadas.length} etiqueta="Desaprobadas" />
        </div>

        {error && (
          <div className="px-4 sm:px-5 pt-3 flex-shrink-0">
            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
              error.includes('expirada')
                ? 'bg-amber-50 border border-amber-100 text-amber-700'
                : 'bg-red-50 border border-red-100 text-red-600'
            }`}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium flex-1">{error}</span>
              {error.includes('expirada') && (
                <button onClick={() => window.location.reload()}
                  className="px-3 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg text-xs font-bold transition-colors">
                  Refrescar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {cargando && actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: COLOR_PRIMARIO }} />
              <p className="text-sm text-gray-500">Cargando solicitudes...</p>
            </div>
          ) : actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="w-14 h-14 text-gray-200 mb-3" />
              <p className="text-sm font-medium text-gray-400">Sin solicitudes</p>
            </div>
          ) : (
            actual.map(s => <Tarjeta key={s.id} s={s} />)
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button onClick={() => setVista('registro')}
            className="w-full py-3 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.99]"
            style={{ backgroundColor: COLOR_PRIMARIO }}>
            <UserPlus className="w-4 h-4" /> Nuevo cambio de turno
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalSolicitudCambioTurno;
