// src/components/ocr/ModalDescansoMedico.jsx
// REGISTRO DE DESCANSO MÉDICO — v2.2
// Notion contenido, con contraste equilibrado. Sin saturar, sin apagar.
//  - Header con COLOR_PRIMARIO pero contenido (icono sutil, sin cuadrado)
//  - Inputs con borde slate-200 y foco slate-400 (limpio)
//  - Chips seleccionados sobrios: dot de color + texto slate, sin fondo de color
//  - Calendario: extremos con COLOR_PRIMARIO, rango slate-100, hoy ring slate-400
//  - Leyenda minimalista
//  - Footer con botón primario sin shadow
// Toda la lógica intacta.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X, User, Stethoscope, Clock,
  FileText, AlertCircle, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight, RotateCcw, Search,
} from 'lucide-react';
import { COLOR_PRIMARIO, MESES } from './constantes';
import SelectorCIE10 from '../hojaReferencia/SelectorCIE10';

const crearFechaLocal = (anio, mes, dia) =>
  `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;

const formatearFechaLegible = (fechaStr) => {
  if (!fechaStr) return '';
  const [a, m, d] = fechaStr.split('-');
  return `${d}/${m}/${a}`;
};

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-300';

/* ============================================================
   CAMPO DE BÚSQUEDA CON DROPDOWN
   ============================================================ */
const BuscadorSeleccion = ({
  label, icon: Icon, placeholder, value, inputValue, onChangeInput, onFocus,
  onClear, abierto, dropdownRef, conteo, resultados, renderItem, itemKey,
  seleccionado, chipLabel, chipSublabel, colorDot,
}) => (
  <div>
    <label className="mb-1.5 block text-[11px] font-medium text-slate-600">{label}</label>
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={value ? chipLabel : inputValue}
          onChange={(e) => onChangeInput(e.target.value)}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete="off"
          className="h-9 w-full rounded-md border border-slate-200 bg-white pl-8 pr-8 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        {(inputValue || value) && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Limpiar"
            className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 ${FOCO}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {abierto && !value && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 bg-slate-50 px-2.5 py-1 text-[10px] text-slate-500">
            {conteo} resultado{conteo === 1 ? '' : 's'}
          </div>
          <div className="max-h-44 overflow-y-auto py-0.5">
            {resultados.length > 0 ? (
              resultados.map((item) => (
                <button
                  key={itemKey(item)}
                  type="button"
                  onClick={() => renderItem(item).onClick()}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-slate-50"
                >
                  {renderItem(item).content}
                </button>
              ))
            ) : (
              <p className="px-3 py-4 text-center text-[11px] text-slate-400">
                No se encontraron resultados
              </p>
            )}
          </div>
        </div>
      )}
    </div>

    {seleccionado && (
      <div className="mt-1.5 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5">
        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: colorDot }} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-slate-800">{chipLabel}</p>
          {chipSublabel && <p className="truncate text-[10px] text-slate-500">{chipSublabel}</p>}
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Cambiar"
          className={`rounded p-0.5 text-slate-400 transition-colors hover:bg-white hover:text-red-600 ${FOCO}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    )}
  </div>
);

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
const ModalDescansoMedico = ({
  isOpen, onClose, personal = [], medicos = [], onGuardarDescanso, onSuccess,
}) => {
  const [personalId, setPersonalId] = useState('');
  const [medicoId, setMedicoId] = useState('');
  const [diagnosticosCIE10, setDiagnosticosCIE10] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const hoy = useMemo(() => new Date(), []);
  const [mesCalendario, setMesCalendario] = useState(hoy.getMonth());
  const [anioCalendario, setAnioCalendario] = useState(hoy.getFullYear());
  const [fechaInicio, setFechaInicio] = useState(null);
  const [fechaFin, setFechaFin] = useState(null);
  const [seleccionando, setSeleccionando] = useState('inicio');

  const [busquedaPersonal, setBusquedaPersonal] = useState('');
  const [busquedaPersonalInput, setBusquedaPersonalInput] = useState('');
  const [mostrarDropdownPersonal, setMostrarDropdownPersonal] = useState(false);
  const dropdownPersonalRef = useRef(null);

  const [busquedaMedico, setBusquedaMedico] = useState('');
  const [busquedaMedicoInput, setBusquedaMedicoInput] = useState('');
  const [mostrarDropdownMedico, setMostrarDropdownMedico] = useState(false);
  const dropdownMedicoRef = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (dropdownPersonalRef.current && !dropdownPersonalRef.current.contains(e.target)) {
        setMostrarDropdownPersonal(false);
      }
      if (dropdownMedicoRef.current && !dropdownMedicoRef.current.contains(e.target)) {
        setMostrarDropdownMedico(false);
      }
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('touchstart', h);
    };
  }, []);

  const resetForm = useCallback(() => {
    setPersonalId('');
    setMedicoId('');
    setFechaInicio(null);
    setFechaFin(null);
    setDiagnosticosCIE10([]);
    setObservaciones('');
    setBusquedaPersonal('');
    setBusquedaPersonalInput('');
    setBusquedaMedico('');
    setBusquedaMedicoInput('');
    setError('');
    setMostrarDropdownPersonal(false);
    setMostrarDropdownMedico(false);
    setSeleccionando('inicio');
    setMesCalendario(hoy.getMonth());
    setAnioCalendario(hoy.getFullYear());
  }, [hoy]);

  const totalDias = useMemo(() => new Date(anioCalendario, mesCalendario + 1, 0).getDate(), [mesCalendario, anioCalendario]);
  const primerDiaSemana = useMemo(() => new Date(anioCalendario, mesCalendario, 1).getDay(), [mesCalendario, anioCalendario]);
  const hoyStr = crearFechaLocal(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

  const mesAnterior = () => {
    if (mesCalendario === 0) { setMesCalendario(11); setAnioCalendario(a => a - 1); }
    else { setMesCalendario(m => m - 1); }
  };

  const mesSiguiente = () => {
    if (mesCalendario === 11) { setMesCalendario(0); setAnioCalendario(a => a + 1); }
    else { setMesCalendario(m => m + 1); }
  };

  const diaEnRango = (dia) => {
    if (!fechaInicio || !fechaFin) return false;
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    return fechaDia >= fechaInicio && fechaDia <= fechaFin;
  };

  const esDiaExtremo = (dia) => {
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    return fechaDia === fechaInicio || fechaDia === fechaFin;
  };

  const handleClickDia = (dia) => {
    const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
    setError('');
    if (seleccionando === 'inicio') {
      setFechaInicio(fechaDia);
      setFechaFin(null);
      setSeleccionando('fin');
    } else {
      if (fechaInicio && fechaDia < fechaInicio) {
        setFechaFin(fechaInicio);
        setFechaInicio(fechaDia);
      } else {
        setFechaFin(fechaDia);
      }
      setSeleccionando('inicio');
    }
  };

  const limpiarFechas = () => {
    setFechaInicio(null);
    setFechaFin(null);
    setSeleccionando('inicio');
    setError('');
  };

  const diasDescanso = useMemo(() => {
    if (!fechaInicio || !fechaFin) return 0;
    const [ai, mi, di] = fechaInicio.split('-').map(Number);
    const [af, mf, df] = fechaFin.split('-').map(Number);
    const inicio = new Date(ai, mi - 1, di);
    const fin = new Date(af, mf - 1, df);
    const diasCalendario = Math.round((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diasCalendario - 1);
  }, [fechaInicio, fechaFin]);

  const personalFiltrado = useMemo(() => {
    if (!busquedaPersonalInput.trim()) return personal.slice(0, 20);
    const t = busquedaPersonalInput.toLowerCase().trim();
    return personal.filter(p =>
      (p.nombre || '').toLowerCase().includes(t) ||
      (p.grado || '').toLowerCase().includes(t) ||
      (p.dni || '').includes(t)
    ).slice(0, 20);
  }, [personal, busquedaPersonalInput]);

  const medicosFiltrados = useMemo(() => {
    if (!busquedaMedicoInput.trim()) return medicos.slice(0, 20);
    const t = busquedaMedicoInput.toLowerCase().trim();
    return medicos.filter(m =>
      (m.medico_nombre || m.nombre || '').toLowerCase().includes(t)
    ).slice(0, 20);
  }, [medicos, busquedaMedicoInput]);

  const personalSeleccionado = useMemo(() =>
    personalId ? personal.find(p => String(p.id) === String(personalId)) : null,
  [personal, personalId]);

  const medicoSeleccionado = useMemo(() =>
    medicoId ? medicos.find(m => String(m.medico_dni || m.id) === String(medicoId)) : null,
  [medicos, medicoId]);

  const esValido = personalId && medicoId && fechaInicio && fechaFin && diasDescanso > 0;

  const seleccionarPersonal = (p) => {
    setPersonalId(String(p.id));
    setBusquedaPersonal(`${p.grado || ''} ${p.nombre}`);
    setBusquedaPersonalInput('');
    setMostrarDropdownPersonal(false);
    setError('');
  };

  const limpiarPersonal = () => {
    setPersonalId('');
    setBusquedaPersonal('');
    setBusquedaPersonalInput('');
    setError('');
  };

  const seleccionarMedico = (m) => {
    setMedicoId(String(m.medico_dni || m.id));
    setBusquedaMedico(`Dr(a). ${m.medico_nombre || m.nombre}`);
    setBusquedaMedicoInput('');
    setMostrarDropdownMedico(false);
    setError('');
  };

  const limpiarMedico = () => {
    setMedicoId('');
    setBusquedaMedico('');
    setBusquedaMedicoInput('');
    setError('');
  };

  const handleGuardar = () => {
    if (!personalId) { setError('Seleccione el personal'); return; }
    if (!medicoId) { setError('Seleccione el médico'); return; }
    if (!fechaInicio || !fechaFin) { setError('Seleccione las fechas en el calendario'); return; }
    if (diasDescanso <= 0) { setError('La fecha de fin debe ser posterior a la de inicio'); return; }

    setGuardando(true);
    setError('');

    const diagnosticoTexto = diagnosticosCIE10.length > 0
      ? diagnosticosCIE10.map(d => `${d.codigo} - ${d.descripcion}`).join(' | ')
      : 'No especificado';

    const descanso = {
      personal_id: personalId,
      personal_nombre: personalSeleccionado?.nombre || '',
      personal_grado: personalSeleccionado?.grado || '',
      personal_dni: personalSeleccionado?.dni || '',
      personal_area: personalSeleccionado?.area || '',
      medico_id: medicoId,
      medico_nombre: medicoSeleccionado?.medico_nombre || medicoSeleccionado?.nombre || '',
      medico_especialidad: medicoSeleccionado?.especialidad || 'Medicina General',
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      dias_descanso: diasDescanso,
      diagnostico: diagnosticoTexto,
      diagnosticos_cie10: diagnosticosCIE10,
      observaciones: observaciones || 'Sin observaciones',
      fecha_registro: new Date().toISOString(),
      registrado_por: 'Sistema PNP',
    };

    if (onGuardarDescanso) onGuardarDescanso(descanso);
    if (onSuccess) {
      onSuccess({
        titulo: 'Descanso Médico Registrado',
        mensaje: `${personalSeleccionado?.grado || ''} ${personalSeleccionado?.nombre || ''} - ${diasDescanso} día(s) de descanso`,
        tipo: 'success',
      });
    }

    resetForm();
    onClose();
    setGuardando(false);
  };

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape' && isOpen) {
        resetForm();
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, resetForm, onClose]);

  if (!isOpen) return null;

  const renderCalendario = () => {
    const celdas = [];

    for (let i = 0; i < primerDiaSemana; i++) {
      celdas.push(<div key={`v-${i}`} className="h-9 w-10 sm:h-10 sm:w-11" />);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      const fechaDia = crearFechaLocal(anioCalendario, mesCalendario, dia);
      const esHoy = fechaDia === hoyStr;
      const enRango = diaEnRango(dia);
      const esExtremo = esDiaExtremo(dia);
      const esPasado = fechaDia < hoyStr;

      let clases = 'h-9 w-10 sm:h-10 sm:w-11 rounded text-[12px] font-medium flex items-center justify-center transition-colors ';
      let estilo = {};

      if (esExtremo) {
        clases += 'text-white shadow-sm';
        estilo = { backgroundColor: COLOR_PRIMARIO };
      } else if (enRango) {
        clases += 'bg-slate-200 text-slate-800';
      } else if (esHoy) {
        clases += 'bg-white text-slate-900 ring-1 ring-inset ring-slate-400';
      } else if (esPasado) {
        clases += 'text-slate-300 hover:bg-slate-100';
      } else {
        clases += 'text-slate-700 hover:bg-slate-100';
      }

      celdas.push(
        <button
          key={dia}
          type="button"
          onClick={() => handleClickDia(dia)}
          className={clases}
          style={{ ...estilo, touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
        >
          {dia}
        </button>
      );
    }

    return celdas;
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={() => { resetForm(); onClose(); }}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-md sm:max-h-[90vh] sm:rounded-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con marca pero contenido */}
        <header
          className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-3 text-white"
          style={{ backgroundColor: COLOR_PRIMARIO }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 flex-shrink-0 opacity-90" aria-hidden="true" />
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold leading-tight">
                Registrar descanso médico
              </h3>
              <p className="truncate text-[11px] text-white/75">Sistema de registro PNP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            aria-label="Cerrar"
            className="rounded p-1 text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">

          {/* Personal + Médico */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <BuscadorSeleccion
              label="Personal PNP"
              icon={User}
              placeholder="Buscar personal…"
              value={personalId}
              inputValue={busquedaPersonalInput}
              onChangeInput={(v) => {
                setBusquedaPersonalInput(v);
                if (personalId) limpiarPersonal();
                setMostrarDropdownPersonal(true);
                setError('');
              }}
              onFocus={() => {
                setMostrarDropdownPersonal(true);
                if (personalId) { setBusquedaPersonalInput(''); limpiarPersonal(); }
              }}
              onClear={limpiarPersonal}
              abierto={mostrarDropdownPersonal}
              dropdownRef={dropdownPersonalRef}
              conteo={personalFiltrado.length}
              resultados={personalFiltrado}
              itemKey={(p) => p.id}
              renderItem={(p) => ({
                onClick: () => seleccionarPersonal(p),
                content: (
                  <>
                    <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-slate-800">{p.grado} {p.nombre}</span>
                      <span className="block truncate text-[10px] text-slate-500">{p.dni} · {p.area}</span>
                    </span>
                  </>
                ),
              })}
              seleccionado={personalSeleccionado}
              chipLabel={personalSeleccionado ? `${personalSeleccionado.grado || ''} ${personalSeleccionado.nombre || ''}` : ''}
              chipSublabel={personalSeleccionado ? [personalSeleccionado.dni, personalSeleccionado.area].filter(Boolean).join(' · ') : ''}
              colorDot="#10b981"
            />

            <BuscadorSeleccion
              label="Médico tratante"
              icon={Stethoscope}
              placeholder="Buscar médico…"
              value={medicoId}
              inputValue={busquedaMedicoInput}
              onChangeInput={(v) => {
                setBusquedaMedicoInput(v);
                if (medicoId) limpiarMedico();
                setMostrarDropdownMedico(true);
                setError('');
              }}
              onFocus={() => {
                setMostrarDropdownMedico(true);
                if (medicoId) { setBusquedaMedicoInput(''); limpiarMedico(); }
              }}
              onClear={limpiarMedico}
              abierto={mostrarDropdownMedico}
              dropdownRef={dropdownMedicoRef}
              conteo={medicosFiltrados.length}
              resultados={medicosFiltrados}
              itemKey={(m) => m.medico_dni || m.id}
              renderItem={(m) => ({
                onClick: () => seleccionarMedico(m),
                content: (
                  <>
                    <Stethoscope className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-slate-800">
                        Dr(a). {m.medico_nombre || m.nombre}
                      </span>
                      {m.especialidad && (
                        <span className="block truncate text-[10px] text-slate-500">{m.especialidad}</span>
                      )}
                    </span>
                  </>
                ),
              })}
              seleccionado={medicoSeleccionado}
              chipLabel={medicoSeleccionado ? `Dr(a). ${medicoSeleccionado.medico_nombre || medicoSeleccionado.nombre || ''}` : ''}
              chipSublabel={medicoSeleccionado?.especialidad || ''}
              colorDot="#0ea5e9"
            />
          </div>

          {/* Diagnóstico + Observaciones */}
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
                Diagnóstico (CIE-10)
              </label>
              <SelectorCIE10
                onSelect={setDiagnosticosCIE10}
                seleccionados={diagnosticosCIE10}
                maxSelecciones={5}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-slate-600">
                Observaciones
              </label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Observaciones adicionales, recomendaciones, tratamiento…"
                rows={2}
                className="w-full resize-none rounded-md border border-slate-200 bg-white px-2.5 py-2 text-[12px] text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Calendario */}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-600">
                {seleccionando === 'inicio' ? 'Fecha de inicio' : 'Fecha de fin'}
              </span>
              <button
                type="button"
                onClick={limpiarFechas}
                className={`flex items-center gap-1 text-[10px] font-medium text-slate-400 transition-colors hover:text-red-600 ${FOCO}`}
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" /> Limpiar
              </button>
            </div>

            <div className="mb-3 flex items-center gap-2">
              <div className={`flex-1 rounded-md border px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                fechaInicio
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}>
                {fechaInicio ? formatearFechaLegible(fechaInicio) : 'Inicio'}
              </div>
              <span className="text-slate-300">—</span>
              <div className={`flex-1 rounded-md border px-3 py-2 text-center text-[12px] font-medium transition-colors ${
                fechaFin
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}>
                {fechaFin ? formatearFechaLegible(fechaFin) : 'Fin'}
              </div>
            </div>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={mesAnterior}
                aria-label="Mes anterior"
                className={`rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${FOCO}`}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="select-none text-[12px] font-semibold text-slate-800">
                {MESES[mesCalendario]} {anioCalendario}
              </span>
              <button
                type="button"
                onClick={mesSiguiente}
                aria-label="Mes siguiente"
                className={`rounded p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 ${FOCO}`}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
              {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
                <div key={i} className={`flex h-6 w-10 items-center justify-center text-[10px] font-medium sm:w-11 ${
                  i === 0 ? 'text-red-400' : 'text-slate-400'
                }`}>{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {renderCalendario()}
            </div>

            {diasDescanso > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-700" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-amber-900">
                      {diasDescanso} día{diasDescanso === 1 ? '' : 's'} de descanso médico
                    </p>
                    {fechaInicio && fechaFin && (
                      <p className="mt-0.5 text-[10px] text-amber-800">
                        Del {formatearFechaLegible(fechaInicio)} al {formatearFechaLegible(fechaFin)}
                        {fechaInicio < hoyStr ? ' · Registro retroactivo' : fechaInicio > hoyStr ? ' · Programado' : ' · Incluye hoy'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex flex-shrink-0 justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={() => { resetForm(); onClose(); }}
            className={`h-9 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 ${FOCO}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleGuardar}
            disabled={!esValido || guardando}
            className={`flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`}
            style={{ backgroundColor: esValido ? COLOR_PRIMARIO : '#94A3B8' }}
          >
            {guardando ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Registrando…</>
            ) : (
              <><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Registrar descanso</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default ModalDescansoMedico;