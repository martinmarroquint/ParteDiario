// src/components/ocr/ModalSolicitudCambioTurno.jsx
// BANDEJA DE SOLICITUDES — v2.1
// Cambio principal: tabs de pills compactas sin underline ni overflow-x.
// Filtros con conteo condicional, activo bg-slate-100, sin scroll horizontal.
// Toda la lógica intacta (no _skipAuthRedirect, no polling, sin useCallback loops).
import React, { useState, useEffect, useRef } from 'react';
import {
  X, Inbox, RefreshCw, Loader2, ChevronDown, Shield,
  AlertCircle, Check, Ban, Calendar, User, ArrowRight,
  UserPlus, ChevronRight, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { COLOR_PRIMARIO, MESES, TURNO_MAP } from './constantes';
import { apiClient } from './services/apiClient';
import { ESTADOS, ESTADOS_META } from './services/solicitudesService';
import SolicitudesCambioTurno from './SolicitudesCambioTurno';

const NIVEL_LABELS_APP = {
  1: 'Jefe de Área',
  2: 'Jefe de Departamento',
  3: 'Jefe de División',
  4: 'Administrador',
};

/* ============================================================
   CHIP DE TURNO
   ============================================================ */
const ChipTurno = ({ codigo }) => {
  const sin = !codigo;
  const etiqueta = sin ? 'S/T' : codigo;
  const t = TURNO_MAP[codigo];
  return (
    <span
      className="inline-flex items-center justify-center rounded-sm border-l-2 bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-slate-700"
      style={{ borderLeftColor: t?.color || '#CBD5E1' }}
    >
      {etiqueta}
    </span>
  );
};

/* ============================================================
   FILTRO TIPO PILL (reemplaza los tabs con underline)
   ============================================================ */
const FiltroPill = ({ conteo, etiqueta, activo, onClick }) => (
  <button
    type="button"
    role="tab"
    aria-selected={activo}
    onClick={onClick}
    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
      activo
        ? 'bg-slate-100 text-slate-800'
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
    }`}
  >
    {etiqueta}
    {conteo > 0 && (
      <span
        className={`rounded px-1 py-px text-[9px] font-semibold tabular-nums ${
          activo ? 'bg-white text-slate-700' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {conteo}
      </span>
    )}
  </button>
);

/* ============================================================
   TARJETA
   ============================================================ */
const Tarjeta = ({
  s, abierta, observacion, setObservacion, procesando,
  onToggle, onProcesar, onCancelar, formatearFecha,
}) => {
  const meta = ESTADOS_META[s.estado] || ESTADOS_META[ESTADOS.PENDIENTE];
  const participantes = s.participantes || [];
  const resumen = participantes.map(p => p.nombre || p.trabajador).filter(Boolean).join(' y ') || 'Sin trabajadores';
  const cadena = s.cadena || [];
  const historial = s.historial || [];
  const nivelActual = s.nivel_actual || 4;

  const aprobadosCount = historial.filter(h => (h.accion || h.estado) === 'APROBADO').length;
  const ultimoRechazo = [...historial].reverse().find(h => (h.accion || h.estado) === 'DESAPROBADO');
  const motivoFinal = ultimoRechazo?.observaciones || ultimoRechazo?.observacion || '';

  return (
    <div className={`overflow-hidden rounded-md border bg-white transition-colors ${
      abierta ? 'border-slate-300' : 'border-slate-100 hover:border-slate-200'
    }`}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-slate-100 text-slate-500">
          <User className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-800">{resumen}</p>
          <p className="flex items-center gap-1 truncate text-[11px] text-slate-400">
            <Calendar className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
            {MESES[(s.mes || 1) - 1]} {s.anio} · #{s.id}
            {s.area_solicitante && (
              <span className="ml-1 flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                {s.area_solicitante}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {s.estado === ESTADOS.PENDIENTE && s._puedeActuar && (
            <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
              Nivel {nivelActual}/{cadena.length}
            </span>
          )}
          {s._esMia && <span className="text-[10px] text-slate-400">Mi solicitud</span>}
          <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${meta.cls}`}>{meta.etiqueta}</span>
          <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${abierta ? 'rotate-180' : ''}`} aria-hidden="true" />
        </div>
      </button>

      {abierta && (
        <div className="space-y-3 border-t border-slate-100 px-3.5 pb-3.5 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: 'Solicitante', v: s.solicitante_nombre || '-' },
              { k: 'Tipo', v: s.tipo_cambio || '-' },
              { k: 'Área', v: s.area_solicitante || '-' },
              { k: 'Fecha', v: formatearFecha(s.fecha_solicitud) || '-' },
            ].map(({ k, v }) => (
              <div key={k} className="rounded bg-slate-50 px-2.5 py-2">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-700">{v}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {participantes.map((p, i) => (
              <div key={i} className="rounded border border-slate-100 bg-white p-2.5">
                <p className="mb-1.5 text-[12px] font-semibold text-slate-700">
                  {i + 1}. {p.nombre || 'Sin nombre'}
                </p>
                {(p.cambios || []).length > 0 ? (
                  <div className="space-y-1">
                    {p.cambios.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">Día {c.dia || c.dia_semana}:</span>
                        <ChipTurno codigo={c.turno_actual} />
                        <ArrowRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
                        <ChipTurno codigo={c.turno_nuevo} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <ChipTurno codigo={p.turno_actual} />
                    <ArrowRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
                    <ChipTurno codigo={p.turno_solicitado} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="rounded bg-slate-50 px-3 py-2">
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Motivo</p>
            <p className="text-[12px] text-slate-700">{s.motivo || '-'}</p>
          </div>

          {cadena.length > 0 && (
            <div className="rounded border border-slate-100 bg-slate-50/60 p-2.5">
              <p className="mb-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                <Shield className="h-3 w-3" aria-hidden="true" /> Cadena de aprobación
              </p>
              <div className="flex flex-wrap items-center gap-1">
                {cadena.map((nivel, idx) => {
                  const fueAprobado = idx < aprobadosCount;
                  const fueRechazado = !!ultimoRechazo && idx === aprobadosCount;
                  const esNivelActual = s.estado === ESTADOS.PENDIENTE && idx === aprobadosCount;
                  return (
                    <React.Fragment key={idx}>
                      <div className={`flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium ${
                        fueRechazado
                          ? 'bg-red-50 text-red-700'
                          : fueAprobado
                            ? 'bg-emerald-50 text-emerald-700'
                            : esNivelActual
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : 'bg-white text-slate-500'
                      }`}>
                        {fueAprobado && <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
                        {fueRechazado && <XCircle className="h-3 w-3" aria-hidden="true" />}
                        {esNivelActual && <Clock className="h-3 w-3" aria-hidden="true" />}
                        <span>{nivel.nombre}</span>
                        <span className="text-[9px] opacity-60">
                          ({NIVEL_LABELS_APP[nivel.nivel] || `N${nivel.nivel}`})
                        </span>
                      </div>
                      {idx < cadena.length - 1 && (
                        <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-300" aria-hidden="true" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}

          {historial.length > 0 && (
            <div className="rounded border border-slate-100 bg-slate-50/60 p-2.5">
              <p className="mb-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                <Clock className="h-3 w-3" aria-hidden="true" /> Historial
              </p>
              <div className="space-y-1.5">
                {historial.map((h, i) => {
                  const esAprobado = h.accion === 'APROBADO' || h.estado === 'APROBADO';
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded p-2 ${esAprobado ? 'bg-emerald-50/60' : 'bg-red-50/60'}`}>
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                        esAprobado ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {esAprobado ? <Check className="h-3 w-3" aria-hidden="true" /> : <Ban className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] font-medium ${esAprobado ? 'text-emerald-800' : 'text-red-800'}`}>
                          {NIVEL_LABELS_APP[h.nivel] || `Nivel ${h.nivel}`} — {h.aprobador_nombre || h.nombre || '-'}
                        </p>
                        <p className="text-[10px] text-slate-400">{formatearFecha(h.fecha)}</p>
                        {(h.observaciones || h.observacion) && (
                          <p className="mt-0.5 text-[11px] italic text-slate-600">"{h.observaciones || h.observacion}"</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {s.estado === ESTADOS.PENDIENTE && s._puedeActuar && (
            <>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Observación <span className="font-normal normal-case text-slate-400">(obligatoria al desaprobar)</span>
                </label>
                <textarea
                  value={observacion}
                  onChange={e => setObservacion(e.target.value)}
                  rows={2}
                  placeholder="Detalle de la revisión..."
                  className="w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onProcesar(s, ESTADOS.DESAPROBADO)}
                  disabled={procesando}
                  className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                  Desaprobar
                </button>
                <button
                  type="button"
                  onClick={() => onProcesar(s, ESTADOS.APROBADO)}
                  disabled={procesando}
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-50"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                  Aprobar
                </button>
              </div>
            </>
          )}

          {s.estado === ESTADOS.PENDIENTE && !s._puedeActuar && (
            <div className="rounded border border-amber-100 bg-amber-50/60 px-3 py-2">
              <p className="text-[11px] text-amber-800">
                {s._esMia
                  ? (s.nivel_actual === 4
                      ? 'Pendiente de aprobación final por el administrador.'
                      : `Pendiente con ${NIVEL_LABELS_APP[s.nivel_actual] || 'su jefe'}.`)
                  : `Pendiente con ${NIVEL_LABELS_APP[s.nivel_actual] || `nivel ${s.nivel_actual}`}.`}
              </p>
            </div>
          )}

          {s.estado === ESTADOS.PENDIENTE && s._esMia && !s._puedeActuar && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCancelar(s)}
                disabled={procesando}
                className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {procesando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Ban className="h-3.5 w-3.5" aria-hidden="true" />}
                Cancelar solicitud
              </button>
            </div>
          )}

          {s.estado !== ESTADOS.PENDIENTE && (
            <div className={`rounded border px-3 py-2 ${
              s.estado === ESTADOS.APROBADO
                ? 'border-emerald-100 bg-emerald-50/60'
                : s.estado === ESTADOS.CANCELADO
                  ? 'border-slate-200 bg-slate-50'
                  : 'border-red-100 bg-red-50/60'
            }`}>
              <p className={`mb-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                s.estado === ESTADOS.APROBADO
                  ? 'text-emerald-700'
                  : s.estado === ESTADOS.CANCELADO
                    ? 'text-slate-500'
                    : 'text-red-700'
              }`}>
                {s.estado === ESTADOS.APROBADO ? 'Aprobada' : s.estado === ESTADOS.CANCELADO ? 'Cancelada' : 'Desaprobada'}
              </p>
              {s.estado === ESTADOS.DESAPROBADO && motivoFinal && (
                <p className="text-[12px] font-medium text-red-800">{motivoFinal}</p>
              )}
              {s.estado === ESTADOS.APROBADO && (
                <p className="text-[11px] text-emerald-800">Los cambios fueron aplicados al rol.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
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
  onCambioAplicado = null,
  vistaInicial = 'lista',
}) => {
  const storedUserRef = useRef(null);
  if (isOpen && !storedUserRef.current) {
    try { storedUserRef.current = JSON.parse(localStorage.getItem('ocr_user_data') || '{}'); } catch { storedUserRef.current = {}; }
  }

  const storedUser = storedUserRef.current || {};
  const userRol = storedUser?.rol_principal ??
    (storedUser?.roles?.length ? Math.max(...storedUser.roles) : userRolProp);
  const esAdmin = userRol === 4;
  const esJefe = [1, 2, 3].includes(userRol);

  const [vista, setVista] = useState('lista');
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(ESTADOS.PENDIENTE);
  const [expandida, setExpandida] = useState(null);
  const [observacion, setObservacion] = useState('');
  const [procesando, setProcesando] = useState(false);
  const procesandoRef = useRef(false);

  const cargar = async () => {
    if (!isOpen) return;
    setCargando(true);
    setError('');
    try {
      const [resBandeja, resMias] = await Promise.allSettled([
        apiClient.getBandejaSolicitudes(),
        apiClient.getSolicitudes(),
      ]);

      const bandeja = resBandeja.status === 'fulfilled' ? (resBandeja.value.solicitudes || []) : [];
      const mias = resMias.status === 'fulfilled' ? (resMias.value.solicitudes || []) : [];

      const bandejaErr = resBandeja.status === 'rejected' ? resBandeja.reason?.message : null;
      const miasErr = resMias.status === 'rejected' ? resMias.reason?.message : null;
      if (bandeja.length === 0 && mias.length === 0 && bandejaErr && miasErr) {
        const errMsg = bandejaErr || miasErr;
        if (errMsg.includes('expirada') || errMsg.includes('Sesión')) {
          setError('Sesión expirada. Refresque la página para volver a iniciar sesión.');
          setCargando(false);
          return;
        }
      }

      const idsBandeja = new Set(bandeja.map(s => s.id));
      const idsMias = new Set(mias.map(s => s.id));

      const merged = [...bandeja];
      for (const s of mias) {
        if (!merged.find(m => m.id === s.id)) merged.push(s);
      }

      const tagged = merged.map(s => ({
        ...s,
        _esMia: idsMias.has(s.id),
        _puedeActuar: s.estado === ESTADOS.PENDIENTE && idsBandeja.has(s.id),
      }));

      setLista(tagged);
    } catch (e) {
      console.error('Error cargando solicitudes:', e);
      setError('No se pudieron cargar las solicitudes. Intente de nuevo.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setVista(vistaInicial);
      setTab(ESTADOS.PENDIENTE);
      setExpandida(null);
      setObservacion('');
      setError('');
      storedUserRef.current = null;
      cargar();
    }
  }, [isOpen, vistaInicial]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape' && isOpen && vista === 'lista') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose, vista]);

  if (!isOpen) return null;

  if (vista === 'registro') {
    return (
      <SolicitudesCambioTurno
        isOpen
        onClose={() => {
          if (vistaInicial === 'registro') { onClose(); return; }
          setVista('lista'); cargar();
        }}
        onEnviado={() => { setVista('lista'); cargar(); }}
        hoja={hoja || ''}
        mes={mes} anio={anio} area={area}
        personal={personal} turnosMap={turnosMap} userName={userName}
      />
    );
  }

  const procesar = async (sol, nuevoEstado) => {
    if (procesandoRef.current) return;
    if (nuevoEstado === ESTADOS.DESAPROBADO && !observacion.trim()) {
      setError('Debe escribir la observación / motivo para desaprobar.');
      setExpandida(sol.id);
      return;
    }
    procesandoRef.current = true;
    setProcesando(true);
    setError('');
    try {
      if (nuevoEstado === ESTADOS.APROBADO) {
        const res = await apiClient.aprobarSolicitud(sol.id, { observaciones: observacion.trim() });
        const estado = res?.solicitud?.estado;
        setError(estado === ESTADOS.APROBADO
          ? 'Solicitud aprobada. Cambios aplicados al rol.'
          : 'Solicitud aprobada. Pasa al siguiente nivel de la cadena.');
        onCambioAplicado?.();
        window.dispatchEvent(new CustomEvent('solicitud-aprobada'));
      } else {
        await apiClient.rechazarSolicitud(sol.id, { motivo_rechazo: observacion.trim() });
        setError('Solicitud desaprobada.');
      }
      setObservacion('');
      setExpandida(null);
      await cargar();
      setTimeout(() => setError(''), 4000);
    } catch (e) {
      setError(e.message || 'No se pudo procesar la solicitud.');
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  };

  const cancelarSolicitud = async (sol) => {
    if (procesandoRef.current) return;
    if (!confirm('¿Desea cancelar esta solicitud?')) return;
    procesandoRef.current = true;
    setProcesando(true);
    try {
      await apiClient.cancelarSolicitud(sol.id, {});
      setError('Solicitud cancelada.');
      await cargar();
      setTimeout(() => setError(''), 4000);
    } catch (e) {
      setError(e.message || 'No se pudo cancelar.');
    } finally {
      procesandoRef.current = false;
      setProcesando(false);
    }
  };

  const pendientes = lista.filter(s => s.estado === ESTADOS.PENDIENTE);
  const aprobadas = lista.filter(s => s.estado === ESTADOS.APROBADO);
  const desaprobadas = lista.filter(s => s.estado === ESTADOS.DESAPROBADO);
  const canceladas = lista.filter(s => s.estado === ESTADOS.CANCELADO);
  const actual = tab === ESTADOS.APROBADO ? aprobadas
    : tab === ESTADOS.DESAPROBADO ? desaprobadas
    : tab === ESTADOS.CANCELADO ? canceladas
    : pendientes;

  const formatearFecha = (iso) => {
    if (!iso) return '';
    try {
      const f = new Date(iso);
      return isNaN(f.getTime()) ? iso : f.toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-md sm:max-h-[90vh] sm:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Inbox className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight text-slate-800">
                {esAdmin || esJefe ? 'Bandeja de solicitudes' : 'Mis solicitudes'}
              </h3>
              <p className="truncate text-[11px] text-slate-400">
                {esAdmin ? 'Administrador' : NIVEL_LABELS_APP[userRol] || 'Usuario'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cargar}
              disabled={cargando}
              aria-label="Actualizar"
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${cargando ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Filtros — pills compactas, sin underline, sin overflow-x */}
        <div className="flex flex-shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-100 px-4 pb-2.5 pt-0.5 sm:px-5" role="tablist">
          <FiltroPill
            conteo={pendientes.length}
            etiqueta="Pendientes"
            activo={tab === ESTADOS.PENDIENTE}
            onClick={() => { setTab(ESTADOS.PENDIENTE); setExpandida(null); }}
          />
          <FiltroPill
            conteo={aprobadas.length}
            etiqueta="Aprobadas"
            activo={tab === ESTADOS.APROBADO}
            onClick={() => { setTab(ESTADOS.APROBADO); setExpandida(null); }}
          />
          <FiltroPill
            conteo={desaprobadas.length}
            etiqueta="Desaprobadas"
            activo={tab === ESTADOS.DESAPROBADO}
            onClick={() => { setTab(ESTADOS.DESAPROBADO); setExpandida(null); }}
          />
          <FiltroPill
            conteo={canceladas.length}
            etiqueta="Canceladas"
            activo={tab === ESTADOS.CANCELADO}
            onClick={() => { setTab(ESTADOS.CANCELADO); setExpandida(null); }}
          />
        </div>

        {error && (
          <div className="flex-shrink-0 px-5 pt-3">
            <div className={`flex items-center gap-2 rounded-md border px-3 py-2 text-[12px] ${
              error.includes('expirada')
                ? 'border-amber-100 bg-amber-50/60 text-amber-800'
                : 'border-red-100 bg-red-50/60 text-red-700'
            }`}>
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="flex-1 font-medium">{error}</span>
              {error.includes('expirada') && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 transition-colors hover:bg-amber-200"
                >
                  Refrescar
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
          {cargando && actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-slate-300" aria-hidden="true" />
              <p className="text-[12px] text-slate-500">Cargando solicitudes…</p>
            </div>
          ) : actual.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Inbox className="mb-3 h-10 w-10 text-slate-200" aria-hidden="true" />
              <p className="text-[12px] font-medium text-slate-400">Sin solicitudes</p>
            </div>
          ) : (
            actual.map(s => (
              <Tarjeta
                key={s.id}
                s={s}
                abierta={expandida === s.id}
                observacion={observacion}
                setObservacion={setObservacion}
                procesando={procesando}
                formatearFecha={formatearFecha}
                onToggle={() => { setExpandida(expandida === s.id ? null : s.id); setObservacion(''); setError(''); }}
                onProcesar={procesar}
                onCancelar={cancelarSolicitud}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <footer className="flex-shrink-0 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => setVista('registro')}
            className="flex w-full items-center justify-center gap-1.5 rounded-md py-2 text-[12px] font-semibold text-white transition-colors hover:brightness-95"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Nuevo cambio de turno
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ModalSolicitudCambioTurno;