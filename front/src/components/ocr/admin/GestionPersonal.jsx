// src/components/ocr/admin/GestionPersonal.jsx
// Padron de personal (hoja PERSONAL) dentro del panel de usuarios:
//  - BannerPadron: crear el padron la primera vez (desde una pestana de mes)
//  - ModalPersona: alta / edicion / reactivacion de una persona
//  - ModalPrepararAnio: generar las 12 pestanas del anio siguiente
// Todo lo que se cambia aqui rige desde el mes elegido en adelante; los meses
// pasados no se modifican (quedan como historico).

import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Loader2, Save, AlertTriangle, CheckCircle2, CalendarPlus, Database, UserPlus,
} from 'lucide-react';
import apiClient from '../services/apiClient';
import { parseHoja, etiquetaHoja, soloHojasMes, MESES } from '../constantes';

const VERDE = '#188C5D';

const ordenHoja = (h) => { const p = parseHoja(h); return p ? p.anio * 100 + p.mes : 0; };

/** Pestanas desde el mes actual en adelante (opciones de "rige desde"). */
export const hojasVigentes = (hojas = [], hojaActual = '') => {
  const lista = soloHojasMes(hojas);
  const limite = ordenHoja(hojaActual);
  const futuras = lista.filter(h => ordenHoja(h) >= limite);
  return futuras.length ? futuras : lista.slice(-1);
};

function Encabezado({ icono: Icono, titulo, subtitulo, onClose }) {
  return (
    <div className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0" style={{ backgroundColor: VERDE }}>
      <div className="flex items-center gap-3 min-w-0">
        <Icono className="w-5 h-5 flex-shrink-0" />
        <div className="min-w-0">
          <h3 className="font-bold text-sm sm:text-base">{titulo}</h3>
          {subtitulo && <p className="text-[10px] sm:text-xs text-white/70 truncate">{subtitulo}</p>}
        </div>
      </div>
      <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" aria-label="Cerrar">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white';
const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5';

// ============================================================
// BANNER: el padron aun no existe
// ============================================================
export function BannerPadron({ origen, hojas, onCreado }) {
  const opciones = soloHojasMes(hojas);
  const [hoja, setHoja] = useState(origen || opciones[opciones.length - 1] || '');
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { if (!hoja && origen) setHoja(origen); }, [origen, hoja]);

  const crear = async () => {
    if (!hoja) return;
    if (!window.confirm(`Crear el padron PERSONAL copiando el personal de ${etiquetaHoja(hoja)}?\n\nDesde ese momento las altas, bajas y traslados se hacen aqui, una sola vez.`)) return;
    setTrabajando(true); setError('');
    try {
      const r = await apiClient.inicializarPadron(hoja);
      setResultado(r);
      onCreado?.();
    } catch (e) {
      setError(e.message || 'No se pudo crear el padron');
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
      <div className="flex flex-wrap items-center gap-3">
        <Database className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800 flex-1 min-w-[220px]">
          El padrón <strong>PERSONAL</strong> aún no existe. Se muestra el personal de <strong>{etiquetaHoja(origen) || '—'}</strong>.
          Créelo para registrar altas, bajas y traslados una sola vez.
        </p>
        <select value={hoja} onChange={e => setHoja(e.target.value)} className="px-3 py-2 border border-amber-300 rounded-xl text-sm bg-white">
          {opciones.map(h => <option key={h} value={h}>{etiquetaHoja(h)}</option>)}
        </select>
        <button onClick={crear} disabled={trabajando || !hoja}
          className="px-4 py-2 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: VERDE }}>
          {trabajando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          Crear padrón
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {resultado && <ResumenInicializacion r={resultado} />}
    </div>
  );
}

function ResumenInicializacion({ r }) {
  const sinDni = r.sinDni || [];
  const dups = r.dniDuplicados || [];
  return (
    <div className="mt-2 text-xs text-gray-700 space-y-1">
      <p className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Padrón creado con {r.total} personas.</p>
      {(sinDni.length > 0 || dups.length > 0) && (
        <div className="bg-white border border-amber-200 rounded-lg p-2">
          <p className="font-semibold text-amber-700 mb-1">Corrija estos datos (botón editar de cada persona):</p>
          {sinDni.map(n => <p key={n}>• Sin DNI: {n}</p>)}
          {dups.map(d => <p key={d.dni}>• DNI {d.dni} repetido: {d.nombres.join(' / ')}</p>)}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL: alta / edicion / reactivacion de una persona
// ============================================================
export function ModalPersona({ modo, persona, areas, grados, hojas, hojaActual, onClose, onGuardado }) {
  const vigentes = useMemo(() => hojasVigentes(hojas, hojaActual), [hojas, hojaActual]);
  const [form, setForm] = useState(() => ({
    dni: persona?.dni || '',
    grado: persona?.grado || '',
    nombre: persona?.nombre || '',
    area: modo === 'reactivar' ? '' : (persona?.area || ''),
    medico: !!persona?.es_medico,
  }));
  const [desde, setDesde] = useState(vigentes.includes(hojaActual) ? hojaActual : (vigentes[0] || ''));
  const [crearUsuario, setCrearUsuario] = useState(modo === 'alta');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const titulo = modo === 'alta' ? 'Nuevo personal' : modo === 'reactivar' ? 'Reactivar personal' : 'Editar datos del personal';
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const guardar = async () => {
    setError('');
    const p = {
      dni: form.dni.trim(),
      grado: form.grado.trim().toUpperCase(),
      nombre: form.nombre.trim().toUpperCase().replace(/\s+/g, ' '),
      area: form.area.trim().toUpperCase(),
      medico: !!form.medico,
    };
    if (modo === 'alta' && !/^[0-9A-Za-z]{6,12}$/.test(p.dni)) { setError('Ingrese un DNI válido (solo números/letras, 6 a 12).'); return; }
    if (modo !== 'reactivar' && (!p.grado || p.nombre.length < 5)) { setError('Complete grado y apellidos y nombres.'); return; }
    if (!p.area) { setError('Seleccione el área.'); return; }
    setGuardando(true);
    try {
      const clave = { dni: persona?.dni || '', nombre: persona?.nombre || '' };
      let r;
      if (modo === 'alta') r = await apiClient.altaPersonal(p, desde);
      else if (modo === 'editar') r = await apiClient.editarPersonal(clave, p, desde);
      else r = await apiClient.reactivarPersonal(clave, p.area, desde);
      onGuardado?.({ ...persona, ...p, es_medico: p.medico, estado: 'ACTIVO' }, { crearUsuario: modo === 'alta' && crearUsuario, resultado: r });
    } catch (e) {
      setError(e.message || 'No se pudo guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[550] p-2 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <Encabezado icono={UserPlus} titulo={titulo} subtitulo={persona?.nombre} onClose={onClose} />
        <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1">
          {modo !== 'reactivar' && (
            <>
              <div>
                <label className={labelCls}>DNI {modo === 'alta' && <span className="text-red-400">*</span>}</label>
                <input value={form.dni} onChange={set('dni')} inputMode="numeric" maxLength={12} className={`${inputCls} font-mono`} placeholder="Ej: 45678912" />
                {modo === 'alta' && <p className="text-[10px] text-gray-400 mt-1">Será también su usuario de acceso.</p>}
              </div>
              <div>
                <label className={labelCls}>Grado <span className="text-red-400">*</span></label>
                <input value={form.grado} onChange={set('grado')} list="lista-grados" className={inputCls} placeholder="Ej: SO2 PNP, CIVIL" />
                <datalist id="lista-grados">{grados.map(g => <option key={g} value={g} />)}</datalist>
              </div>
              <div>
                <label className={labelCls}>Apellidos y nombres <span className="text-red-400">*</span></label>
                <input value={form.nombre} onChange={set('nombre')} className={inputCls} placeholder="APELLIDO APELLIDO, NOMBRES" />
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Área <span className="text-red-400">*</span></label>
            <input value={form.area} onChange={set('area')} list="lista-areas" className={inputCls} placeholder="Escriba o elija un área" />
            <datalist id="lista-areas">{areas.filter(a => a !== 'SIN_SERVICIO').map(a => <option key={a} value={a} />)}</datalist>
          </div>
          {modo !== 'reactivar' && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.medico} onChange={set('medico')} className="w-4 h-4 text-emerald-600 rounded" />
              Es médico
            </label>
          )}
          <div>
            <label className={labelCls}>Rige desde</label>
            <select value={desde} onChange={e => setDesde(e.target.value)} className={inputCls}>
              {vigentes.map(h => <option key={h} value={h}>{etiquetaHoja(h)}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Se aplica a esa pestaña y a las siguientes que ya existan. Los meses anteriores no cambian.
            </p>
          </div>
          {modo === 'alta' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <input type="checkbox" checked={crearUsuario} onChange={e => setCrearUsuario(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              Crear también su usuario de acceso (rol y permisos)
            </label>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100">Cancelar</button>
          <button onClick={guardar} disabled={guardando || !desde}
            className="px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: VERDE }}>
            {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MODAL: preparar el anio (generar las pestanas de mes)
// ============================================================
export function ModalPrepararAnio({ hojas, onClose, onGenerado }) {
  const anioSiguiente = new Date().getFullYear() + 1;
  const [anio, setAnio] = useState(Math.max(anioSiguiente, 2027));
  const [estado, setEstado] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [plantilla, setPlantilla] = useState('');
  const [progreso, setProgreso] = useState({});
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState('');

  const modelos = useMemo(() => soloHojasMes(hojas), [hojas]);
  useEffect(() => { if (!plantilla && modelos.length) setPlantilla(modelos[modelos.length - 1]); }, [modelos, plantilla]);

  const cargar = async (a = anio) => {
    setCargando(true); setError('');
    try {
      const r = await apiClient.estadoAnio(a);
      setEstado(r.meses || []);
    } catch (e) {
      setError(e.message || 'No se pudo consultar el año');
    } finally {
      setCargando(false);
    }
  };
  useEffect(() => { cargar(anio); }, [anio]); // eslint-disable-line react-hooks/exhaustive-deps

  const faltantes = estado.filter(m => !m.existe);

  const generar = async () => {
    if (!faltantes.length) return;
    if (!window.confirm(`Se crearán ${faltantes.length} pestaña(s) de ${anio} copiando el formato de ${etiquetaHoja(plantilla)} y el personal ACTIVO del padrón.\n\nLos meses que ya existen no se tocan. ¿Continuar?`)) return;
    setTrabajando(true); setError('');
    for (const m of faltantes) {
      setProgreso(p => ({ ...p, [m.mes]: 'trabajando' }));
      try {
        const r = await apiClient.generarMes(m.mes, anio, plantilla);
        setProgreso(p => ({ ...p, [m.mes]: r?.creada === false ? 'existia' : 'ok' }));
      } catch (e) {
        setProgreso(p => ({ ...p, [m.mes]: 'error' }));
        setError(`${MESES[m.mes - 1]}: ${e.message || 'error'}. Puede volver a intentar: los meses ya creados no se duplican.`);
        break;
      }
    }
    setTrabajando(false);
    await cargar(anio);
    onGenerado?.();
  };

  const icono = (m) => {
    const p = progreso[m.mes];
    if (p === 'trabajando') return <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />;
    if (p === 'error') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (m.existe || p === 'ok' || p === 'existia') return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
    return <span className="w-4 h-4 rounded-full border-2 border-gray-300 inline-block" />;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[550] p-2 sm:p-4" onClick={trabajando ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <Encabezado icono={CalendarPlus} titulo="Preparar año" subtitulo="Crea las pestañas de cada mes con el personal del padrón" onClose={trabajando ? () => {} : onClose} />
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Año</label>
              <select value={anio} onChange={e => { setProgreso({}); setAnio(Number(e.target.value)); }} disabled={trabajando} className={inputCls}>
                {[anioSiguiente - 1, anioSiguiente, anioSiguiente + 1].filter(a => a >= 2027).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Copiar formato de</label>
              <select value={plantilla} onChange={e => setPlantilla(e.target.value)} disabled={trabajando} className={inputCls}>
                {modelos.map(h => <option key={h} value={h}>{etiquetaHoja(h)}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl p-3">
            Cada pestaña nueva copia colores, fórmulas y validaciones del modelo, pone las fechas del mes y carga el personal <strong>ACTIVO</strong> del padrón con los turnos en blanco.
            Las altas, bajas y traslados posteriores se aplican solos a los meses ya creados.
          </p>
          {cargando ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {estado.map(m => (
                <div key={m.mes} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${m.existe ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {icono(m)}<span className="truncate">{MESES[m.mes - 1]}</span>
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500">{faltantes.length ? `${faltantes.length} mes(es) por crear` : `${anio} completo`}</span>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={trabajando} className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 disabled:opacity-50">Cerrar</button>
            <button onClick={generar} disabled={trabajando || cargando || !faltantes.length || !plantilla}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2" style={{ backgroundColor: VERDE }}>
              {trabajando ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><CalendarPlus className="w-4 h-4" /> Generar meses</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
