// src/components/ocr/SolicitudesCambioTurno.jsx
// SOLICITUD DE CAMBIO DE TURNO — v5.2 (Notion contenido)
// Base: v5.1 que te gustó. Aplicados SOLO los retoques de bajo riesgo:
//  - Overlay sin backdrop-blur, modal con border-slate-200 + shadow-md (sin shadow-xl)
//  - Header sin cuadrado tintado (icono slate-400 inline)
//  - Stepper → breadcrumb de texto con pasos completados clickeables
//  - Calendario: día seleccionado neutro (slate-200), chip de turno más pequeño en la celda
//  - Chip de turno con border-l-2 (color como acento lateral, no bloque relleno)
//  - Delete en CambioRow solo en hover (opacity-0 group-hover:opacity-100)
//  - Sin active:scale en botones
//  - Tooltip dark compacto (slate-800, sin borde)
//  - Selector de turno: grid 2 columnas se conserva (es más rápido de escanear con muchos turnos),
//    pero cada fila baja a dot + código + nombre, sin borde ni ring, activo bg-slate-100.
//  - Toda la lógica, accesibilidad y payload INTACTOS.
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X, User, Users, ArrowRight, Loader2, CheckCircle2, Send, GitCompare,
  AlertCircle, ChevronLeft, ChevronRight, Plus, Trash2, UserCheck, UserPlus,
  Search, Info, Check, Scale,
} from 'lucide-react';
import { COLOR_PRIMARIO, TURNO_MAP, MESES, hojaDelMesActual } from './constantes';
import { solicitudesService } from './services/solicitudesService';

/* ============================================================
   CONSTANTES Y UTILIDADES
   ============================================================ */
const SIN_TURNO_VAL = 'S/T';
const FRANCO = 'F';
const TURNOS_RAPIDOS = Object.keys(TURNO_MAP);
const MAX_MOTIVO = 300;
const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getDiaSemana = (anio, mes, dia) => {
  try {
    return DIAS_SEMANA[new Date(anio, mes - 1, dia).getDay()] || '';
  } catch {
    return '';
  }
};

const etiquetaTurno = (codigo) => (!codigo || codigo === SIN_TURNO_VAL ? FRANCO : codigo);
const horasDe = (codigo) => TURNO_MAP[etiquetaTurno(codigo)]?.horas || 0;
const sumaHoras = (lista, campo) => lista.reduce((acc, c) => acc + horasDe(c[campo]), 0);
const plural = (n, s, p) => (n === 1 ? s : p);
const normalizar = (s) => (s || '').toLowerCase().trim();

const FOCO =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-slate-300';

/* ============================================================
   TOOLTIP — dark, compacto, sin borde
   ============================================================ */
const Tooltip = ({ text, children, delay = 150, className = 'inline-flex' }) => {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'top' });
  const ref = useRef(null);
  const timer = useRef(null);

  const updatePos = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const placement = r.top < 56 && window.innerHeight - r.bottom > r.top ? 'bottom' : 'top';
    setPos({
      top: placement === 'top' ? r.top - 8 : r.bottom + 8,
      left: r.left + r.width / 2,
      placement,
    });
  }, []);

  const open = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { updatePos(); setShow(true); }, delay);
  };
  const close = () => { clearTimeout(timer.current); setShow(false); };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!show) return undefined;
    window.addEventListener('scroll', updatePos, { passive: true, capture: true });
    window.addEventListener('resize', updatePos);
    return () => {
      window.removeEventListener('scroll', updatePos, { capture: true });
      window.removeEventListener('resize', updatePos);
    };
  }, [show, updatePos]);

  return (
    <>
      <span ref={ref} className={className} onMouseEnter={open} onMouseLeave={close} onFocus={open} onBlur={close}>
        {children}
      </span>
      {show && text && createPortal(
        <div
          role="tooltip"
          className="fixed z-[99999] pointer-events-none"
          style={{
            top: pos.top,
            left: pos.left,
            transform: pos.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          <div className="rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white whitespace-nowrap">
            {text}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

/* ============================================================
   DROPDOWN EN PORTAL
   ============================================================ */
const DropdownPortal = ({ anchorRef, abierto, onCerrar, children, anchoMin = 280, offset = 6 }) => {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!abierto || !anchorRef.current) return undefined;
    const calc = () => {
      if (!anchorRef.current) return;
      const r = anchorRef.current.getBoundingClientRect();
      const abrirArriba = window.innerHeight - r.bottom < 300 && r.top > 300;
      setPos({
        left: Math.max(8, Math.min(r.left, window.innerWidth - anchoMin - 8)),
        width: Math.max(anchoMin, r.width),
        top: abrirArriba ? undefined : r.bottom + offset,
        bottom: abrirArriba ? window.innerHeight - r.top + offset : undefined,
      });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('scroll', calc, true);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('scroll', calc, true);
    };
  }, [abierto, anchorRef, anchoMin, offset]);

  useEffect(() => {
    if (!abierto) return undefined;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-dd-panel]')) return;
      onCerrar();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [abierto, onCerrar, anchorRef]);

  if (!abierto || !pos) return null;

  return createPortal(
    <div
      data-dd-panel
      className="fixed overflow-hidden rounded-md border border-slate-200 bg-white shadow-md"
      style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, zIndex: 400 }}
    >
      {children}
    </div>,
    document.body
  );
};

/* ============================================================
   ELEMENTOS BASE
   ============================================================ */
// Chip neutro con color a la izquierda (border-l-2)
const TurnoChip = ({ codigo, size = 'md', tachado = false }) => {
  const etiqueta = etiquetaTurno(codigo);
  const t = TURNO_MAP[etiqueta];
  const sz = size === 'sm' ? 'min-w-[24px] pl-1.5 pr-1 py-0.5 text-[10px]' : 'min-w-[28px] pl-2 pr-1.5 py-1 text-[11px]';
  return (
    <span
      className={`${sz} inline-flex items-center justify-center rounded-sm border-l-2 bg-slate-100 font-semibold leading-none text-slate-700 ${tachado ? 'line-through opacity-60' : ''}`}
      style={{ borderLeftColor: t?.color || '#CBD5E1' }}
    >
      {etiqueta}
    </span>
  );
};

const Avatar = ({ tono = 'primario', icon: Icon = User }) => {
  const tonos = {
    primario: 'bg-emerald-50 text-emerald-600',
    ambar: 'bg-amber-50 text-amber-600',
  };
  return (
    <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${tonos[tono]}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
  );
};

const Aviso = ({ tipo = 'info', children, icon: Icon }) => {
  const estilos = {
    info: 'border-slate-200 bg-slate-50 text-slate-600',
    ok: 'border-emerald-100 bg-emerald-50/60 text-emerald-900',
    error: 'border-red-100 bg-red-50/60 text-red-800',
  };
  const IconoDef = tipo === 'error' ? AlertCircle : tipo === 'ok' ? CheckCircle2 : Info;
  const Ico = Icon || IconoDef;
  return (
    <div
      role={tipo === 'error' ? 'alert' : undefined}
      className={`flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-xs leading-relaxed ${estilos[tipo]}`}
    >
      <Ico className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-70" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
};

const Seccion = ({ titulo, icon: Icon, derecha, children }) => (
  <section>
    <div className="mb-2 flex items-center justify-between gap-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
        {titulo}
      </h4>
      {derecha && <span className="text-[11px] text-slate-400">{derecha}</span>}
    </div>
    {children}
  </section>
);

const EtiquetaPaso = ({ n, texto, detalle }) => (
  <div className="mb-2 flex items-center justify-between gap-2">
    <span className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">{n}</span>
      {texto}
    </span>
    {detalle && <span className="truncate text-[11px] text-slate-400">{detalle}</span>}
  </div>
);

/* ============================================================
   CALENDARIO — día seleccionado neutro, chip pequeño
   ============================================================ */
const SEMANA_INICIALES = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const CalendarioSeleccion = ({ anio, mes, turnosMap, cambios, estadoDia, seleccionado, onSelect }) => {
  const total = new Date(anio, mes, 0).getDate();
  const offset = (new Date(anio, mes - 1, 1).getDay() + 6) % 7;
  const celdas = [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {SEMANA_INICIALES.map((s) => (
          <span key={s} className="text-center text-[10px] font-medium text-slate-400">{s}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label="Días del mes">
        {celdas.map((d, i) => {
          if (d === null) return <span key={`v${i}`} />;
          const estado = estadoDia(d);
          const cambio = cambios.find((c) => c.dia === d);
          const original = turnosMap?.[d] || '';
          const codigo = etiquetaTurno(cambio ? cambio.turnoNuevo : original);
          const t = TURNO_MAP[codigo];
          const sel = seleccionado === d;
          const bloqueado = estado !== 'futuro' || !!cambio;

          let estilo = 'border-slate-100 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';
          if (sel) estilo = 'border-slate-300 bg-slate-100 text-slate-900';
          else if (cambio) estilo = 'border-amber-200 bg-amber-50/60 text-amber-800';
          else if (estado !== 'futuro') estilo = 'border-transparent bg-slate-50/60 text-slate-300';

          return (
            <button
              key={d}
              type="button"
              disabled={bloqueado}
              aria-pressed={sel}
              aria-label={`${getDiaSemana(anio, mes, d)} ${d}, turno ${codigo}${cambio ? ' (cambio agregado)' : ''}`}
              title={cambio ? `Día ${d}: ${etiquetaTurno(original)} → ${codigo}` : estado === 'hoy' ? 'Hoy' : undefined}
              onClick={() => onSelect(d)}
              className={`flex h-10 flex-col items-center justify-center rounded border text-xs transition-colors disabled:cursor-not-allowed ${FOCO} ${estilo} ${
                estado === 'hoy' && !sel ? 'ring-1 ring-inset ring-slate-300' : ''
              }`}
            >
              <span className="text-[11px] font-semibold leading-none tabular-nums">{d}</span>
              <span
                className="mt-0.5 rounded px-1 text-[8px] font-bold leading-[12px]"
                style={
                  cambio ? { color: '#B45309' }
                    : t ? { backgroundColor: t.color, color: t.texto }
                    : { color: '#94A3B8' }
                }
              >
                {codigo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* ============================================================
   SELECTOR DE TURNO — grid 2 cols, dot de color, activo neutro
   ============================================================ */
const SelectorTurno = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Nuevo turno"
    className="grid max-h-[272px] grid-cols-2 gap-1 overflow-y-auto rounded-md border border-slate-100 bg-white p-1"
  >
    {TURNOS_RAPIDOS.map((codigo) => {
      const t = TURNO_MAP[codigo];
      if (!t) return null;
      const activo = value === codigo;
      return (
        <button
          key={codigo}
          type="button"
          role="radio"
          aria-checked={activo}
          title={`${t.nombre}${t.horas > 0 ? ` · ${t.horas} h` : ''}`}
          onClick={() => onChange(codigo)}
          className={`flex h-8 items-center gap-1.5 rounded px-1.5 text-left transition-colors ${FOCO} ${
            activo ? 'bg-slate-100' : 'hover:bg-slate-50'
          }`}
        >
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: t.color }}
            aria-hidden="true"
          />
          <span className="flex-shrink-0 text-[11px] font-semibold tabular-nums text-slate-700">{codigo}</span>
          <span className="min-w-0 flex-1 truncate text-[11px] text-slate-600">{t.nombre}</span>
          {activo && <Check className="h-3 w-3 flex-shrink-0 text-slate-400" aria-hidden="true" />}
        </button>
      );
    })}
  </div>
);

/* ============================================================
   FILA DE CAMBIO
   ============================================================ */
const CambioRow = ({ cambio, anio, mes, onDelete, acento = 'emerald' }) => {
  const dot = acento === 'amber' ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <li className="group flex items-center gap-3 rounded-md border border-slate-100 bg-white px-3 py-2 hover:border-slate-200">
      <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <div className="w-[64px] flex-shrink-0 leading-tight">
        <p className="text-[11px] font-semibold text-slate-700">Día {cambio.dia}</p>
        <p className="text-[10px] text-slate-400">{getDiaSemana(anio, mes, cambio.dia)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <TurnoChip codigo={cambio.turnoActual} size="sm" tachado />
        <ArrowRight className="h-3 w-3 text-slate-300" aria-hidden="true" />
        <TurnoChip codigo={cambio.turnoNuevo} size="sm" />
      </div>
      <span className="ml-1 hidden truncate text-[11px] text-slate-500 sm:block">
        {TURNO_MAP[cambio.turnoNuevo]?.nombre}
      </span>
      {onDelete && (
        <Tooltip text="Quitar este cambio" className="ml-auto inline-flex">
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Quitar cambio del día ${cambio.dia}`}
            className={`rounded p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 focus-visible:opacity-100 ${FOCO}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Tooltip>
      )}
    </li>
  );
};

/* ============================================================
   EDITOR DE CAMBIOS
   ============================================================ */
const EditorCambios = ({
  titulo, tituloLista, turnosMap, cambios, estadoDia,
  anio, mes, onAgregar, onEliminar, acento = 'emerald',
}) => {
  const [diaSel, setDiaSel] = useState(null);
  const [turnoSel, setTurnoSel] = useState('');
  const [errorLocal, setErrorLocal] = useState('');

  const agregar = () => {
    const msg = onAgregar({ dia: diaSel, turnoNuevo: turnoSel });
    if (msg) { setErrorLocal(msg); return; }
    setDiaSel(null); setTurnoSel(''); setErrorLocal('');
  };

  const infoTurno = turnoSel ? TURNO_MAP[turnoSel] : null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
          <h4 className="text-sm font-semibold text-slate-700">{titulo}</h4>
          <span className="text-[11px] text-slate-400">
            {MESES[(mes || 1) - 1]} {anio}
            {cambios.length > 0 && ` · ${cambios.length} ${plural(cambios.length, 'cambio', 'cambios')}`}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-[1fr_1fr]">
          <div>
            <EtiquetaPaso
              n="1"
              texto="Elige el día"
              detalle={diaSel ? `${getDiaSemana(anio, mes, diaSel)} ${diaSel}` : null}
            />
            <CalendarioSeleccion
              anio={anio} mes={mes} turnosMap={turnosMap} cambios={cambios}
              estadoDia={estadoDia} seleccionado={diaSel}
              onSelect={(d) => { setDiaSel(d); setErrorLocal(''); }}
            />
          </div>
          <div>
            <EtiquetaPaso
              n="2"
              texto="Elige el nuevo turno"
              detalle={infoTurno ? `${infoTurno.nombre}${infoTurno.horas > 0 ? ` · ${infoTurno.horas} h` : ''}` : null}
            />
            <SelectorTurno value={turnoSel} onChange={(t) => { setTurnoSel(t); setErrorLocal(''); }} />
          </div>
        </div>

        {errorLocal && <div className="px-4 pb-3"><Aviso tipo="error">{errorLocal}</Aviso></div>}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <p className="min-w-0 truncate text-[11px] text-slate-500">
            {diaSel && turnoSel
              ? <>Día {diaSel}: <strong className="text-slate-700">{etiquetaTurno(turnosMap?.[diaSel])}</strong> → <strong className="text-slate-700">{turnoSel}</strong></>
              : 'Selecciona un día y un turno para agregar el cambio.'}
          </p>
          <button
            type="button"
            onClick={agregar}
            disabled={!diaSel || !turnoSel}
            className={`flex h-8 flex-shrink-0 items-center gap-1.5 rounded-md px-3 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`}
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Agregar
          </button>
        </div>
      </div>

      {cambios.length > 0 && (
        <Seccion titulo={`${tituloLista} (${cambios.length})`}>
          <ul className="space-y-1">
            {cambios.map((c, i) => (
              <CambioRow key={c.dia} cambio={c} anio={anio} mes={mes} acento={acento} onDelete={() => onEliminar(i)} />
            ))}
          </ul>
        </Seccion>
      )}
    </div>
  );
};

/* ============================================================
   BUSCADOR DE COMPAÑERO
   ============================================================ */
const BuscadorCompanero = ({ abierto, setAbierto, busqueda, setBusqueda, resultados, onSelect }) => {
  const inputRef = useRef(null);
  const [activo, setActivo] = useState(0);

  useEffect(() => { setActivo(0); }, [busqueda]);

  const elegir = (p) => { onSelect(p); setAbierto(false); setBusqueda(''); };

  const onKeyDown = (e) => {
    if (!abierto || !resultados.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => (i + 1) % resultados.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => (i - 1 + resultados.length) % resultados.length); }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(resultados[activo]); }
    else if (e.key === 'Escape') { e.stopPropagation(); setAbierto(false); }
  };

  return (
    <div>
      <label htmlFor="buscar-companero" className="mb-1.5 block text-xs font-semibold text-slate-600">
        Buscar compañero
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="buscar-companero"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={abierto}
          aria-controls="lista-companeros"
          autoComplete="off"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setAbierto(e.target.value.length >= 2); }}
          onFocus={() => { if (busqueda.length >= 2) setAbierto(true); }}
          onKeyDown={onKeyDown}
          placeholder="Nombre o DNI (mínimo 2 caracteres)"
          className="h-10 w-full rounded-md border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        {busqueda && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => { setBusqueda(''); setAbierto(false); inputRef.current?.focus(); }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600 ${FOCO}`}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <DropdownPortal anchorRef={inputRef} abierto={abierto} onCerrar={() => setAbierto(false)}>
        {resultados.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-400">No hay coincidencias. Prueba con otro nombre o DNI.</p>
        ) : (
          <ul id="lista-companeros" role="listbox" className="max-h-64 overflow-y-auto py-1">
            {resultados.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === activo}>
                <button
                  type="button"
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => elegir(p)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === activo ? 'bg-slate-50' : ''}`}
                >
                  <Avatar />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-700">{p.nombre}</span>
                    <span className="block truncate text-[11px] text-slate-400">{p.dni || 'Sin DNI'} · {p.area || 'Sin área'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DropdownPortal>
    </div>
  );
};

/* ============================================================
   BREADCRUMB (reemplaza al stepper; completados clickeables)
   ============================================================ */
const Breadcrumb = ({ pasos, indiceActivo, onIr }) => (
  <nav aria-label="Progreso" className="flex items-center gap-1.5 border-b border-slate-100 bg-white px-5 py-2.5">
    {pasos.map((p, i) => {
      const activo = i === indiceActivo;
      const completado = i < indiceActivo;
      const clickable = completado;
      return (
        <React.Fragment key={p.n}>
          <button
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onIr?.(p.n)}
            aria-current={activo ? 'step' : undefined}
            className={`rounded px-1 py-0.5 text-[12px] transition-colors ${FOCO} ${
              activo
                ? 'font-semibold text-slate-800'
                : completado
                  ? 'text-slate-500 hover:text-slate-800'
                  : 'cursor-default text-slate-300'
            } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            {p.l}
          </button>
          {i < pasos.length - 1 && (
            <ChevronRight className="h-3 w-3 flex-shrink-0 text-slate-300" aria-hidden="true" />
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

/* ============================================================
   RESUMEN POR PERSONA
   ============================================================ */
const PersonaResumen = ({ nombre, dni, area, cambios, anio, mes, acento = 'emerald' }) => {
  const antes = sumaHoras(cambios, 'turnoActual');
  const despues = sumaHoras(cambios, 'turnoNuevo');
  const delta = despues - antes;
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-3.5 py-2.5">
        <Avatar tono={acento === 'amber' ? 'ambar' : 'primario'} icon={acento === 'amber' ? Users : User} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-700">{nombre}</p>
          <p className="truncate text-[11px] text-slate-400">{[dni, area].filter(Boolean).join(' · ') || 'Sin datos adicionales'}</p>
        </div>
        <Tooltip text="Diferencia de horas respecto al horario actual">
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
              delta === 0
                ? 'bg-slate-100 text-slate-500'
                : delta > 0
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-sky-50 text-sky-700'
            }`}
          >
            {delta > 0 ? '+' : ''}{delta} h
          </span>
        </Tooltip>
      </div>
      <ul className="space-y-1 p-2.5">
        {cambios.map((c) => (
          <CambioRow key={c.dia} cambio={c} anio={anio} mes={mes} acento={acento} />
        ))}
      </ul>
    </div>
  );
};

/* ============================================================
   COMPONENTE PRINCIPAL
   ============================================================ */
const SolicitudesCambioTurno = ({
  isOpen, onClose, onEnviado = null,
  mes = 0,
  anio = new Date().getFullYear(),
  hoja = '',
  area = '',
  personal = [],
  turnosMap = {},
  userName = '',
  // eslint-disable-next-line no-unused-vars
  onCambioAplicado = null,
}) => {
  const turnos = useMemo(() => {
    if (!personal || !personal.length) return [];
    return personal.map((p) => ({ ...p, turnos: turnosMap[p.id] || {} }));
  }, [personal, turnosMap]);

  const [modo, setModo] = useState(null);
  const [paso, setPaso] = useState(0);
  const [cambios, setCambios] = useState([]);
  const [companero, setCompanero] = useState(null);
  const [cambiosCompanero, setCambiosCompanero] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [pormenores, setPormenores] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [busquedaComp, setBusquedaComp] = useState('');
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  const dialogRef = useRef(null);
  const bodyRef = useRef(null);

  /* ---------- fechas ---------- */
  const hoy = useMemo(() => new Date(), []);

  const estadoDia = useCallback((d) => {
    const y = hoy.getFullYear();
    const m = hoy.getMonth() + 1;
    if (anio > y || (anio === y && mes > m)) return 'futuro';
    if (anio < y || (anio === y && mes < m)) return 'pasado';
    if (d < hoy.getDate()) return 'pasado';
    return d === hoy.getDate() ? 'hoy' : 'futuro';
  }, [hoy, anio, mes]);

  /* ---------- usuario ---------- */
  const storedUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ocr_user_data') || '{}'); } catch { return {}; }
  }, []);

  const miPersonal = useMemo(() => {
    if (!turnos.length) return null;
    return turnos.find((t) =>
      normalizar(t.nombre) === normalizar(userName) ||
      (storedUser.nombre && normalizar(t.nombre) === normalizar(storedUser.nombre))
    ) || null;
  }, [turnos, userName, storedUser]);

  const misTurnos = miPersonal?.turnos || {};

  /* ---------- reset al abrir ---------- */
  useEffect(() => {
    if (!isOpen) return;
    setModo(null); setPaso(0); setCambios([]); setCompanero(null); setCambiosCompanero([]);
    setMotivo(''); setPormenores(''); setError(''); setBusquedaComp(''); setBuscadorAbierto(false);
    setEnviando(false);
  }, [isOpen]);

  /* ---------- teclado, foco y bloqueo de scroll ---------- */
  useEffect(() => {
    if (!isOpen) return undefined;
    const previo = document.activeElement;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { onClose?.(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!f.length) return;
      const primero = f[0];
      const ultimo = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrevio;
      previo?.focus?.();
    };
  }, [isOpen, onClose]);

  useEffect(() => { bodyRef.current?.scrollTo?.({ top: 0 }); }, [paso]);

  if (!isOpen) return null;

  /* ---------- acciones ---------- */
  const resultadosComp = (() => {
    const q = busquedaComp;
    if (!q || q.length < 2) return [];
    return turnos
      .filter((t) => (normalizar(t.nombre).includes(normalizar(q)) || t.dni?.includes(q)) && t.id !== miPersonal?.id)
      .slice(0, 10);
  })();

  const validarCambio = (lista, { dia, turnoNuevo }, mapaTurnos) => {
    if (!dia) return 'Elige un día en el paso 1.';
    if (!turnoNuevo) return 'Elige el nuevo turno en el paso 2.';
    if (lista.some((c) => c.dia === dia)) return 'Ya agregaste un cambio para ese día. Quítalo primero si quieres modificarlo.';
    if (etiquetaTurno(mapaTurnos?.[dia]) === turnoNuevo) return 'El turno elegido es igual al turno actual de ese día.';
    return null;
  };

  const agregarMio = (datos) => {
    const msg = validarCambio(cambios, datos, misTurnos);
    if (msg) return msg;
    setCambios((prev) => [...prev, {
      dia: datos.dia,
      turnoActual: misTurnos[datos.dia] || SIN_TURNO_VAL,
      turnoNuevo: datos.turnoNuevo,
    }]);
    setError('');
    return null;
  };

  const agregarCompanero = (datos) => {
    if (!companero) return 'Primero selecciona al compañero.';
    const mapa = companero.turnos || {};
    const msg = validarCambio(cambiosCompanero, datos, mapa);
    if (msg) return msg;
    setCambiosCompanero((prev) => [...prev, {
      dia: datos.dia,
      turnoActual: mapa[datos.dia] || SIN_TURNO_VAL,
      turnoNuevo: datos.turnoNuevo,
    }]);
    setError('');
    return null;
  };

  const ordenar = (lista) => [...lista].sort((a, b) => a.dia - b.dia);

  const seleccionarModo = (m) => { setModo(m); setPaso(1); setError(''); };

  const siguiente = () => {
    if (paso === 1) {
      if (!cambios.length) { setError('Agrega al menos un cambio de turno para continuar.'); return; }
      setError(''); setPaso(modo === 'COLEGA' ? 2 : 3);
    } else if (paso === 2) {
      if (!companero) { setError('Selecciona al compañero con quien harás el intercambio.'); return; }
      if (!cambiosCompanero.length) { setError('Agrega al menos un cambio para tu compañero.'); return; }
      setError(''); setPaso(3);
    }
  };

  const atras = () => {
    setError('');
    if (paso === 3) setPaso(modo === 'COLEGA' ? 2 : 1);
    else if (paso === 2) setPaso(1);
    else if (paso === 1) { setModo(null); setPaso(0); }
  };

  const irAPaso = (n) => {
    if (n === 1 && paso > 1) setPaso(1);
    else if (n === 2 && paso === 3 && modo === 'COLEGA') setPaso(2);
  };

  const mapaCambio = (c) => ({
    dia: c.dia,
    turno_actual: c.turnoActual,
    turno_nuevo: c.turnoNuevo,
    turno_nuevo_nombre: TURNO_MAP[c.turnoNuevo]?.nombre || c.turnoNuevo,
  });

  const enviar = async () => {
    if (!cambios.length) { setError('Agrega al menos un cambio antes de enviar.'); return; }
    if (!motivo.trim()) { setError('Escribe el motivo del cambio. Es obligatorio.'); return; }

    setEnviando(true); setError('');

    const participantes = [{
      nombre: miPersonal?.nombre || userName,
      dni: miPersonal?.dni || '',
      area: miPersonal?.area || area,
      fila: miPersonal?.fila || 0,
      cambios: cambios.map(mapaCambio),
    }];

    if (modo === 'COLEGA' && companero && cambiosCompanero.length) {
      participantes.push({
        nombre: companero.nombre,
        dni: companero.dni,
        area: companero.area || '',
        fila: companero.fila || 0,
        cambios: cambiosCompanero.map(mapaCambio),
      });
    }

    try {
      await solicitudesService.crearSolicitud({
        tipo_cambio: modo === 'COLEGA' ? 'INTERCAMBIO CON COMPAÑERO' : 'CAMBIO INDIVIDUAL',
        participantes,
        motivo: motivo.trim(),
        pormenores: pormenores.trim(),
        hoja: hoja || hojaDelMesActual(),
        mes,
        anio,
      });
      setEnviando(false);
      onEnviado?.();
      onClose?.();
    } catch (e) {
      setEnviando(false);
      setError(e?.message || 'No se pudo enviar la solicitud. Revisa tu conexión e inténtalo de nuevo.');
    }
  };

  /* ---------- pasos ---------- */
  const pasos = modo === 'COLEGA'
    ? [{ n: 1, l: 'Mis cambios' }, { n: 2, l: 'Compañero' }, { n: 3, l: 'Resumen' }]
    : [{ n: 1, l: 'Mis cambios' }, { n: 3, l: 'Resumen' }];
  const pasoIdx = modo === 'COLEGA' ? paso - 1 : (paso === 1 ? 0 : 1);
  const esUltimo = paso === 3;
  const nombreMio = miPersonal?.nombre || userName;

  /* ---------- vistas ---------- */
  const vistaModo = (
    <div className="mx-auto flex max-w-md flex-col gap-2 py-6">
      <div className="mb-2 text-center">
        <h4 className="text-sm font-semibold text-slate-700">¿Qué tipo de cambio necesitas?</h4>
        <p className="mt-0.5 text-xs text-slate-500">Elige una opción para comenzar.</p>
      </div>
      {[
        { id: 'INDIVIDUAL', t: 'Cambio individual', d: 'Modifico solo mis propios turnos.', Icon: UserCheck, tono: 'emerald' },
        { id: 'COLEGA', t: 'Intercambio con un compañero', d: 'Cambio turnos con otra persona del área.', Icon: UserPlus, tono: 'sky' },
      ].map(({ id, t, d, Icon, tono }) => (
        <button
          key={id}
          type="button"
          onClick={() => seleccionarModo(id)}
          className={`group flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3.5 text-left transition hover:border-slate-300 hover:bg-slate-50 ${FOCO}`}
        >
          <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md ${tono === 'emerald' ? 'bg-emerald-50 text-emerald-600' : 'bg-sky-50 text-sky-600'}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-700">{t}</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{d}</span>
          </span>
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
        </button>
      ))}
    </div>
  );

  const vistaMisCambios = (
    <div className="space-y-4">
      <Aviso>
        Elige el día, luego el nuevo turno y pulsa <strong className="font-semibold">Agregar</strong>. Puedes repetirlo las veces que necesites. Solo puedes elegir días posteriores a hoy.
      </Aviso>
      <EditorCambios
        titulo="Agregar un cambio"
        tituloLista="Cambios que solicitarás"
        turnosMap={misTurnos}
        cambios={cambios}
        estadoDia={estadoDia}
        anio={anio}
        mes={mes}
        onAgregar={agregarMio}
        onEliminar={(i) => setCambios((prev) => prev.filter((_, j) => j !== i))}
      />
    </div>
  );

  const vistaCompanero = companero ? (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar tono="ambar" icon={Users} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{companero.nombre}</p>
            <p className="truncate text-[11px] text-slate-400">{companero.dni || 'Sin DNI'} · {companero.area || 'Sin área'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCompanero(null); setCambiosCompanero([]); setError(''); }}
          className={`rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 ${FOCO}`}
        >
          Cambiar
        </button>
      </div>
      <Aviso>
        Indica qué días y turnos asumirá {companero.nombre}. Puedes agregar varios cambios.
      </Aviso>
      <EditorCambios
        titulo="Agregar un cambio al compañero"
        tituloLista="Cambios del compañero"
        turnosMap={companero.turnos || {}}
        cambios={cambiosCompanero}
        estadoDia={estadoDia}
        anio={anio}
        mes={mes}
        acento="amber"
        onAgregar={agregarCompanero}
        onEliminar={(i) => setCambiosCompanero((prev) => prev.filter((_, j) => j !== i))}
      />
    </div>
  ) : (
    <div className="space-y-4">
      <Aviso>Busca al compañero con quien harás el intercambio.</Aviso>
      <BuscadorCompanero
        abierto={buscadorAbierto}
        setAbierto={setBuscadorAbierto}
        busqueda={busquedaComp}
        setBusqueda={setBusquedaComp}
        resultados={resultadosComp}
        onSelect={(p) => { setCompanero(p); setCambiosCompanero([]); setError(''); }}
      />
    </div>
  );

  const horasMias = sumaHoras(cambios, 'turnoNuevo') - sumaHoras(cambios, 'turnoActual');
  const horasComp = sumaHoras(cambiosCompanero, 'turnoNuevo') - sumaHoras(cambiosCompanero, 'turnoActual');
  const desbalanceado = modo === 'COLEGA' && cambiosCompanero.length > 0 && horasMias + horasComp !== 0;

  const vistaResumen = (
    <div className="space-y-4">
      <Aviso tipo="ok">
        <p className="font-semibold">Revisa los datos antes de enviar</p>
        <p className="mt-0.5 opacity-90">
          {modo === 'COLEGA'
            ? 'Ambos participantes asumirán los turnos indicados. La solicitud se enviará para su aprobación.'
            : 'La solicitud se enviará a tu jefe para su aprobación.'}
        </p>
      </Aviso>

      <PersonaResumen
        nombre={nombreMio}
        dni={miPersonal?.dni}
        area={miPersonal?.area || area}
        cambios={ordenar(cambios)}
        anio={anio}
        mes={mes}
      />

      {modo === 'COLEGA' && companero && cambiosCompanero.length > 0 && (
        <PersonaResumen
          nombre={companero.nombre}
          dni={companero.dni}
          area={companero.area}
          cambios={ordenar(cambiosCompanero)}
          anio={anio}
          mes={mes}
          acento="amber"
        />
      )}

      {desbalanceado && (
        <Aviso icon={Scale}>
          Las horas del intercambio no están equilibradas ({horasMias > 0 ? '+' : ''}{horasMias} h para ti y {horasComp > 0 ? '+' : ''}{horasComp} h para tu compañero). Puedes enviarla igualmente, pero tu jefe podría pedirte ajustes.
        </Aviso>
      )}

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <label htmlFor="motivo" className="text-xs font-semibold text-slate-600">
            Motivo del cambio <span className="text-red-500" aria-hidden="true">*</span>
            <span className="ml-1 font-normal text-slate-400">(obligatorio)</span>
          </label>
          <span className={`text-[10px] tabular-nums ${motivo.length >= MAX_MOTIVO ? 'text-red-500' : 'text-slate-400'}`}>
            {motivo.length}/{MAX_MOTIVO}
          </span>
        </div>
        <textarea
          id="motivo"
          value={motivo}
          maxLength={MAX_MOTIVO}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          aria-required="true"
          placeholder="Ej.: cita médica, trámite personal, viaje familiar…"
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="pormenores" className="mb-1.5 block text-xs font-semibold text-slate-600">
          Pormenores <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <textarea
          id="pormenores"
          value={pormenores}
          onChange={(e) => setPormenores(e.target.value)}
          rows={2}
          placeholder="Número de documento, referencia u otros datos que ayuden a la aprobación"
          className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>
    </div>
  );

  /* ---------- render ---------- */
  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-solicitud"
        tabIndex={-1}
        style={{ '--cp': COLOR_PRIMARIO }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-slate-200 bg-white shadow-md outline-none sm:max-h-[90vh] sm:rounded-xl"
      >
        {/* Cabecera — sin cuadrado tintado */}
        <header className="flex flex-shrink-0 items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <GitCompare className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
            <div className="min-w-0">
              <h3 id="titulo-solicitud" className="truncate text-sm font-semibold leading-tight text-slate-800">
                Solicitud de cambio de turno
              </h3>
              <p className="truncate text-[11px] text-slate-400">
                {MESES[(mes || 1) - 1]} {anio}{hoja ? ` · Hoja ${hoja}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {modo && <Breadcrumb pasos={pasos} indiceActivo={pasoIdx} onIr={irAPaso} />}

        {/* Contenido */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {paso === 0 && vistaModo}
          {paso === 1 && vistaMisCambios}
          {paso === 2 && modo === 'COLEGA' && vistaCompanero}
          {paso === 3 && vistaResumen}

          {error && (
            <div className="mt-4"><Aviso tipo="error">{error}</Aviso></div>
          )}
        </div>

        {/* Pie */}
        <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
          <p className="hidden text-[11px] text-slate-400 sm:block">
            {paso === 0 ? 'Todos los pasos se pueden revisar antes de enviar.' : `Paso ${pasoIdx + 1} de ${pasos.length}`}
          </p>
          <div className="ml-auto flex gap-2">
            {paso === 0 ? (
              <button
                type="button"
                onClick={onClose}
                className={`h-9 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 ${FOCO}`}
              >
                Cancelar
              </button>
            ) : (
              <button
                type="button"
                onClick={atras}
                disabled={enviando}
                className={`flex h-9 items-center gap-1 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 ${FOCO}`}
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" /> Volver
              </button>
            )}

            {paso > 0 && !esUltimo && (
              <button
                type="button"
                onClick={siguiente}
                className={`flex h-9 items-center gap-1 rounded-md px-4 text-xs font-semibold text-white transition hover:brightness-95 ${FOCO}`}
                style={{ backgroundColor: COLOR_PRIMARIO }}
              >
                Continuar <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}

            {esUltimo && (
              <button
                type="button"
                onClick={enviar}
                disabled={enviando || !motivo.trim()}
                className={`flex h-9 items-center gap-1.5 rounded-md px-4 text-xs font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 ${FOCO}`}
                style={{ backgroundColor: COLOR_PRIMARIO }}
              >
                {enviando
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Enviando…</>
                  : <><Send className="h-3.5 w-3.5" aria-hidden="true" /> Enviar solicitud</>}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SolicitudesCambioTurno;