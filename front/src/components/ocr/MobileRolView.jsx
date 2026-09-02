// src/components/ocr/MobileRolView.jsx
// VISTA MOVIL - ALINEADA CON PanelTrabajo: GUARDADO INMEDIATO + SINCRONIZACION
// Asignación directa + Botón manual ModalCambioTurno + Historial de cambios

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, X, ChevronLeft, ChevronRight, Save, 
  CheckCircle2, AlertTriangle, Clock, User, Loader2, Shield, FileText, Inbox,
  History, RefreshCw, XCircle, Square, CheckSquare, Trash2
} from 'lucide-react';
import { TURNO_MAP, NOMBRE_A_CODIGO, HOJA_CAMBIOS, MESES, COLOR_PRIMARIO, DEFAULT_GOOGLE_CONFIG, bodyAsciiJson, ordenarPersonalPorGrado, esPersonalCivil, soloHojasMes, hojaInicialParaArea, guardarHojaPreferida, hojaDelMesActual, mesDeHoja, verificarAppsScript } from './constantes';
import ModalCambioTurno from './ModalCambioTurno';
import ModalHistorial from './ModalHistorial';
import PanelControlAdmin from './PanelControlAdmin';
import ModalFrancosInvalidos from './ModalFrancosInvalidos';

const STORAGE_RESPALDO_LOCAL = 'ocr_respaldo_local';
const STORAGE_ESTADOS = 'ocr_estados_areas';
const STORAGE_SESION = 'ocr_sesion_activa';

const formatearFechaHistorial = (valor) => {
  if (!valor) return '-';
  if (typeof valor === 'number') {
    const f = new Date(Math.round((valor - 25569) * 86400 * 1000));
    if (!isNaN(f.getTime())) return f.toLocaleDateString('es-PE');
  }
  const s = String(valor).trim();
  if (s.includes('T')) {
    const f = new Date(s);
    if (!isNaN(f.getTime())) return f.toLocaleDateString('es-PE');
  }
  return s;
};

const guardarSesion = (mes, anio) => {
  try {
    const s = JSON.parse(sessionStorage.getItem(STORAGE_SESION) || '{}');
    s.mes = mes; s.anio = anio;
    sessionStorage.setItem(STORAGE_SESION, JSON.stringify(s));
  } catch { void 0; }
};

// ============================================
// FUNCIONES AUXILIARES
// ============================================
const getDiasSemana = (fechaBase, semana) => {
  const dias = [];
  const inicio = new Date(fechaBase);
  inicio.setDate(inicio.getDate() + (semana * 7));
  const mesActual = fechaBase.getMonth();
  
  for (let i = 0; i < 7; i++) {
    const fecha = new Date(inicio);
    fecha.setDate(fecha.getDate() + i);
    if (fecha.getMonth() !== mesActual) continue;
    
    dias.push({
      fecha: `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`,
      dia: fecha.getDate(),
      diaSemana: fecha.getDay(),
      esFinDeSemana: fecha.getDay() === 0 || fecha.getDay() === 6,
      esHoy: fecha.toDateString() === new Date().toDateString()
    });
  }
  return dias;
};

const DIAS_SEMANA_NOMBRES = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const columnaLetra = (numero) => {
  let letra = ''; let n = numero;
  while (n >= 0) { letra = String.fromCharCode(65 + (n % 26)) + letra; n = Math.floor(n / 26) - 1; }
  return letra;
};

// ============================================
// COMPONENTE
// ============================================
const MobileRolView = ({
  areaAsignada,
  responsable,
  esAdmin,
  onSalir,
  onAbrirCambiosTurno,
  todasLasAreas = []
}) => {
  const [config, setConfig] = useState(DEFAULT_GOOGLE_CONFIG);
  const [hojasDisponibles, setHojasDisponibles] = useState([]);
  const [personal, setPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [turnosBackup, setTurnosBackup] = useState({});
  const [turnoActivo, setTurnoActivo] = useState('M');
  const [rolHabilitado, setRolHabilitado] = useState(() => {
    if (esAdmin) return true;
    try {
      const key = `${STORAGE_ESTADOS}_${config.sheetName || hojaDelMesActual()}`;
      const g = localStorage.getItem(key);
      if (g) { const e = JSON.parse(g); if (e[areaAsignada] === true) return false; }
    } catch { void 0; }
    return true;
  });
  const [cargando, setCargando] = useState(true);
  const [appsScriptError, setAppsScriptError] = useState('');
  const [errorCarga, setErrorCarga] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [semanaActual, setSemanaActual] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);
  const guardadosPendientesRef = useRef(new Set());
  const turnosRef = useRef({});
  const turnosBackupRef = useRef({});

  // Modal de cambio manual
  const [modalCambioAbierto, setModalCambioAbierto] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);

  // Historial de cambios (alineado con PanelTrabajo)
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [historialCambios, setHistorialCambios] = useState([]);

  // Panel de control (administrador) - alineado con PanelTrabajo
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false);

  // Seleccion multiple + patrones (alineado con PanelTrabajo)
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [diasSeleccionadosSemana, setDiasSeleccionadosSemana] = useState([1, 2, 3, 4, 5]);
  const [modoPatron, setModoPatron] = useState(false);
  const [patronRotativo, setPatronRotativo] = useState(['M', 'T', 'N']);

  // Modal francos invalidos
  const [mostrarModalFrancos, setMostrarModalFrancos] = useState(false);

  // Mes desde hoja activa (mapa centralizado en constantes, sin duplicar)
  const mesSeleccionado = useMemo(() => mesDeHoja(config.sheetName || hojaDelMesActual()), [config.sheetName]);

  const anioSeleccionado = useMemo(() => new Date().getFullYear(), []);

  // francosDescartados DESPUÉS de declarar mesSeleccionado/anioSeleccionado (evita TDZ)
  const [francosDescartados, setFrancosDescartados] = useState(() => {
    try {
      const key = `ocr_francos_descartados_${mesSeleccionado}_${anioSeleccionado}`;
      return sessionStorage.getItem(key) === 'true';
    } catch { return false; }
  });
  const hojaSeleccionada = config.sheetName || hojaDelMesActual();
  const totalDiasMes = useMemo(() => new Date(anioSeleccionado, mesSeleccionado, 0).getDate(), [mesSeleccionado, anioSeleccionado]);

  const cargarHojasRef = useRef(false); // Prevent re-running cargarHojas
  const cargandoDatosRef = useRef(false); // Prevent concurrent data loads

  const cargarHojas = useCallback(async () => {
    if (!config.sheetId || !config.apiKey) return;
    try {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}?key=${config.apiKey}&fields=sheets.properties.title`);
      const d = await r.json();
      const h = d.sheets?.map(s => s.properties.title) || [];
      const hMeses = soloHojasMes(h);
      setHojasDisponibles(hMeses);

      try {
        if (config.appsScriptUrl) {
          const salud = await verificarAppsScript(config.appsScriptUrl);
          if (!salud.ok) {
            setAppsScriptError(salud.mensaje);
          } else {
            setAppsScriptError('');
            await fetch(config.appsScriptUrl, {
              method: 'POST', mode: 'no-cors',
              headers: { 'Content-Type': 'text/plain' },
              body: bodyAsciiJson({ accion: 'inicializarEstructura' })
            });
          }
        }
      } catch (e) { console.error('No se pudo inicializar estructura:', e); }

      // Sin mes global forzado: cada usuario abre su hoja preferida (por area).
      const hojaElegida = hojaInicialParaArea(areaAsignada, config, hMeses);
      // Only set config if sheet name actually changed
      setConfig(prev => {
        if (prev.sheetName === hojaElegida) return prev;
        return { ...prev, sheetName: hojaElegida };
      });
      setSemanaActual(0);
      setPersonal([]);
      setTurnos({});
      setTurnosBackup({});
      turnosRef.current = {};
      turnosBackupRef.current = {};
    } catch (e) { console.error('Error al cargar hojas:', e); }
  }, [config.sheetId, config.apiKey, config.appsScriptUrl, areaAsignada]); // Removed config.sheetName from deps

  const handleHojaChange = useCallback((nh) => {
    if (cargandoDatosRef.current) return; // Prevent switching while loading
    guardarHojaPreferida(areaAsignada, nh);
    setConfig(prev => (prev.sheetName === nh ? prev : { ...prev, sheetName: nh }));
    setSemanaActual(0);
    // Clear ALL stale state
    setPersonal([]);
    setTurnos({});
    setTurnosBackup({});
    setFrancosDescartados(false);
    turnosRef.current = {};
    turnosBackupRef.current = {};
  }, [areaAsignada]);

  useEffect(() => { 
    if (cargarHojasRef.current) return;
    cargarHojasRef.current = true;
    cargarHojas(); 
  }, [cargarHojas]);

  useEffect(() => { turnosRef.current = turnos; }, [turnos]);
  useEffect(() => { turnosBackupRef.current = turnosBackup; }, [turnosBackup]);

  // ============================================
  // CARGA DE DATOS
  // ============================================
  const cargarDatos = useCallback(async () => {
    if (cargandoDatosRef.current) return; // Prevent concurrent loads
    cargandoDatosRef.current = true;
    setErrorCarga(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(hojaSeleccionada)}!A:AJ?key=${config.apiKey}`;
      const r = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!r.ok) throw new Error('Error al cargar');
      const d = await r.json();
      const rows = d.values || [];
      
      if (rows.length < 2) { setPersonal([]); setTurnos({}); setTurnosBackup({}); return; }
      
      const todos = [], filtrados = [], tObj = {};
      
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (!cols || cols.length < 3) continue;
        
        const af = (cols[3] || '').trim();
        const emp = { id: i, fila: i + 1, dni: (cols[0]||'').trim(), grado: (cols[1]||'').trim(), nombre: (cols[2]||'').trim(), area: af };
        todos.push(emp);
        if (esAdmin || areaAsignada === 'ADMIN' || af === areaAsignada || af === 'SIN_SERVICIO') filtrados.push(emp);
        
        const te = {};
        for (let d = 0; d < totalDiasMes; d++) { te[d+1] = NOMBRE_A_CODIGO[(cols[5+d]||'').trim()] || ''; }
        tObj[i] = te;
      }
      
      const hayPendientes = JSON.stringify(turnosRef.current) !== JSON.stringify(turnosBackupRef.current);
      
      setPersonal(filtrados);
      if (!hayPendientes) {
        setTurnos(tObj);
        setTurnosBackup(JSON.parse(JSON.stringify(tObj)));
      }
      
      try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
        const rBloq = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/ESTADOS!A:C?key=${config.apiKey}`, { signal: controller2.signal });
        clearTimeout(timeoutId2);
        const dBloq = await rBloq.json();
        const filaBloq = (dBloq.values || []).find(f => f[0] === hojaSeleccionada && f[1] === areaAsignada);
        const bloqueado = !esAdmin && filaBloq && filaBloq[2] === 'FINALIZADO';
        if (esAdmin) setRolHabilitado(true);
        else setRolHabilitado(!bloqueado);
        // Persistir el estado local del area (alineado con PanelTrabajo).
        actualizarEstadoArea(areaAsignada, bloqueado);
      } catch { void 0; }
      
    } catch (e) {
      console.error('Error cargando:', e);
      setErrorCarga(e.message || 'Error al cargar datos');
      try {
        const b = localStorage.getItem(`${STORAGE_RESPALDO_LOCAL}_${areaAsignada}`);
        if (b) {
          const datos = JSON.parse(b);
          if (datos.turnos) {
            setTurnos(datos.turnos);
            setTurnosBackup(JSON.parse(JSON.stringify(datos.turnos)));
            setPersonal(datos.personal || []);
          }
        }
      } catch { void 0; }
    } finally {
      cargandoDatosRef.current = false;
    }
  }, [config, hojaSeleccionada, totalDiasMes, areaAsignada, esAdmin, actualizarEstadoArea]);

  useEffect(() => {
    const init = async () => { setCargando(true); await cargarDatos(); setCargando(false); };
    init();
  }, [cargarDatos]);

  useEffect(() => {
    const handleDesbloqueo = (e) => {
      if (e.detail.area === areaAsignada) {
        setRolHabilitado(true);
        cargarDatos();
      }
    };
    window.addEventListener('area-desbloqueada', handleDesbloqueo);
    return () => window.removeEventListener('area-desbloqueada', handleDesbloqueo);
  }, [areaAsignada, cargarDatos]);

  useEffect(() => {
    let timer = null;
    const handleSolicitudAprobada = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!guardando && !modalCambioAbierto) cargarDatos();
      }, 1500);
    };
    window.addEventListener('solicitud-aprobada', handleSolicitudAprobada);
    return () => {
      window.removeEventListener('solicitud-aprobada', handleSolicitudAprobada);
      if (timer) clearTimeout(timer);
    };
  }, [cargarDatos, guardando, modalCambioAbierto]);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      if (!guardando && !modalCambioAbierto) await cargarDatos();
    }, 30000);
    return () => clearInterval(intervalo);
  }, [cargarDatos, guardando, modalCambioAbierto]);

  useEffect(() => {
    const h = () => { if (!document.hidden && !guardando && !modalCambioAbierto) cargarDatos(); };
    document.addEventListener('visibilitychange', h);
    return () => document.removeEventListener('visibilitychange', h);
  }, [cargarDatos, guardando, modalCambioAbierto]);

  // ============================================
  // AUTO-GUARDADO
  // ============================================

  const guardarRespaldoLocal = useCallback(() => {
    try {
      localStorage.setItem(`${STORAGE_RESPALDO_LOCAL}_${areaAsignada}`, JSON.stringify({
        turnos, personal, timestamp: Date.now(), area: areaAsignada, hoja: hojaSeleccionada
      }));
    } catch { void 0; }
  }, [turnos, personal, areaAsignada, hojaSeleccionada]);

  const actualizarEstadoArea = useCallback((area, bloqueado) => {
    try {
      const key = `${STORAGE_ESTADOS}_${hojaSeleccionada}`;
      const g = localStorage.getItem(key);
      const e = g ? JSON.parse(g) : {};
      e[area] = bloqueado;
      localStorage.setItem(key, JSON.stringify(e));
    } catch { void 0; }
  }, [hojaSeleccionada]);

  const handleReintentarCarga = useCallback(() => {
    setErrorCarga(null);
    setCargando(true);
    cargarDatos();
  }, [cargarDatos]);

  const guardarCeldaInmediato = useCallback((fila, dia, valor) => {
    if (!config.appsScriptUrl || !hojaSeleccionada) return Promise.resolve(false);
    const columna = columnaLetra(4 + dia);
    const valorTexto = valor ? (TURNO_MAP[valor]?.nombre || valor) : '';

    // Escritura INMEDIATA en tiempo real (mismo patron que PanelTrabajo): sin cola ni espera.
    return fetch(config.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({ accion: 'guardarCelda', hoja: hojaSeleccionada, fila, columna, valor: valorTexto, responsable: responsable || 'ADMIN', area: areaAsignada, registrarHistorial: false })
    }).then(() => true).catch((_e) => { void _e; return false; });
  }, [config.appsScriptUrl, hojaSeleccionada, areaAsignada, responsable]);

  const autoGuardar = useCallback(async () => {
    if (!config.appsScriptUrl || !rolHabilitado || guardando) return;
    if (personal.length === 0) return;
    
    const celdas = [];
    for (const emp of personal) {
      const antes = turnosBackup[emp.id] || {};
      const ahora = turnos[emp.id] || {};
      for (let d = 1; d <= totalDiasMes; d++) {
        const vA = antes[d] || '';
        const vN = ahora[d] || '';
        if (vA !== vN) celdas.push({ fila: emp.fila, dia: d, valor: vN });
      }
    }
    if (celdas.length === 0) return;
    
    try {
      await Promise.all(celdas.map(c => guardarCeldaInmediato(c.fila, c.dia, c.valor)));
      setTurnosBackup(JSON.parse(JSON.stringify(turnos)));
      guardarRespaldoLocal();
    } catch (e) { console.error('Auto-guardado:', e); guardarRespaldoLocal(); }
  }, [config.appsScriptUrl, rolHabilitado, guardando, personal, turnos, turnosBackup, totalDiasMes, guardarCeldaInmediato, guardarRespaldoLocal]);

  useEffect(() => {
    if (!rolHabilitado) return;
    const intervalo = setInterval(() => { autoGuardar(); }, 45000);
    return () => clearInterval(intervalo);
  }, [rolHabilitado, autoGuardar]);

  useEffect(() => {
    const h1 = () => { autoGuardar(); };
    const h2 = () => { if (document.hidden) autoGuardar(); };
    window.addEventListener('beforeunload', h1);
    document.addEventListener('visibilitychange', h2);
    return () => { window.removeEventListener('beforeunload', h1); document.removeEventListener('visibilitychange', h2); };
  }, [autoGuardar]);

  // ============================================
  // CÁLCULOS
  // ============================================
  const fechaBase = useMemo(() => new Date(anioSeleccionado, mesSeleccionado - 1, 1), [anioSeleccionado, mesSeleccionado]);
  
  const totalSemanas = useMemo(() => {
    const ultimoDia = new Date(anioSeleccionado, mesSeleccionado, 0);
    const primerDiaSemana = new Date(anioSeleccionado, mesSeleccionado - 1, 1).getDay();
    return Math.ceil((ultimoDia.getDate() + primerDiaSemana) / 7);
  }, [anioSeleccionado, mesSeleccionado]);
  
  const diasSemana = useMemo(() => getDiasSemana(fechaBase, semanaActual), [fechaBase, semanaActual]);

  // Dias de la semana visible afectados por la seleccion de dias (alineado con PanelTrabajo)
  const diasAfectados = useMemo(() => diasSemana.filter(d => diasSeleccionadosSemana.includes(d.diaSemana)).map(d => d.dia), [diasSemana, diasSeleccionadosSemana]);

  const personalFiltrado = useMemo(() => {
    let r = personal;
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      r = r.filter(p => (p.nombre || '').toLowerCase().includes(term) || (p.grado || '').toLowerCase().includes(term) || (p.dni || '').includes(term));
    }
    return ordenarPersonalPorGrado(r);
  }, [personal, busqueda]);

  const francosInvalidos = useMemo(() => {
    const invalidaciones = {};
    personal.forEach(emp => {
      if (esPersonalCivil(emp.grado)) return;
      let contadorFrancos = 0, inicioFrancos = null;
      for (let d = 1; d <= totalDiasMes; d++) {
        const turno = turnos[emp.id]?.[d] || '';
        if (turno === 'F') {
          if (contadorFrancos === 0) inicioFrancos = d;
          contadorFrancos++;
        } else {
          if (contadorFrancos >= 3) {
            if (!invalidaciones[emp.id]) invalidaciones[emp.id] = [];
            invalidaciones[emp.id].push({ inicio: inicioFrancos, fin: d - 1, cantidad: contadorFrancos });
          }
          contadorFrancos = 0; inicioFrancos = null;
        }
      }
      if (contadorFrancos >= 3) {
        if (!invalidaciones[emp.id]) invalidaciones[emp.id] = [];
        invalidaciones[emp.id].push({ inicio: inicioFrancos, fin: totalDiasMes, cantidad: contadorFrancos });
      }
    });
    return invalidaciones;
  }, [personal, turnos, totalDiasMes]);

  const totalFrancosInvalidos = useMemo(() => Object.keys(francosInvalidos).length, [francosInvalidos]);
  const totalInfraccionesFrancos = useMemo(() => Object.values(francosInvalidos).reduce((s, i) => s + i.length, 0), [francosInvalidos]);
  const idsConFrancosInvalidos = useMemo(() => new Set(Object.keys(francosInvalidos).map(Number)), [francosInvalidos]);

  const todosLosTurnos = useMemo(() => Object.keys(TURNO_MAP), []);

  // ============================================
  // TOAST
  // ============================================
  const mostrarToast = useCallback((mensaje, tipo = 'info') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToast({ mensaje, tipo });
    toastTimeout.current = setTimeout(() => setToast(null), 2000);
  }, []);

  const descartarFrancos = useCallback(() => {
    setFrancosDescartados(true);
    try {
      const key = `ocr_francos_descartados_${mesSeleccionado}_${anioSeleccionado}`;
      sessionStorage.setItem(key, 'true');
    } catch { /* ignore */ }
  }, [mesSeleccionado, anioSeleccionado]);

  // ============================================
  // MANEJADORES
  // ============================================

  const handleDiaClick = useCallback(async (empId, fechaStr) => {
    if (!rolHabilitado) { mostrarToast('Rol bloqueado', 'warning'); return; }
    
    const dia = parseInt(fechaStr.split('-')[2]);
    const actual = turnos[empId]?.[dia] || '';
    const nuevo = actual === turnoActivo ? '' : turnoActivo;
    if (actual === nuevo) return;
    
    setTurnos(prev => ({ ...prev, [empId]: { ...prev[empId], [dia]: nuevo } }));
    
    const emp = personal.find(p => p.id === empId);
    if (emp) {
      const ok = await guardarCeldaInmediato(emp.fila, dia, nuevo);
      if (ok) {
        setTurnosBackup(prev => ({ ...prev, [empId]: { ...prev[empId], [dia]: nuevo } }));
      }
    }
    
    const t = TURNO_MAP[nuevo];
    mostrarToast(nuevo ? `${t?.nombre || turnoActivo} aplicado` : 'Turno removido', 'success');
  }, [rolHabilitado, turnoActivo, turnos, personal, guardarCeldaInmediato, mostrarToast]);

  // ============================================
  // SELECCION MULTIPLE + PATRONES (alineado con PanelTrabajo)
  // ============================================
  const toggleSeleccion = (empId) => { if (!rolHabilitado && !esAdmin) return; setSeleccionados(prev => { const n = new Set(prev); n.has(empId) ? n.delete(empId) : n.add(empId); return n; }); };
  const seleccionarTodos = () => { if (!rolHabilitado && !esAdmin) return; setSeleccionados(new Set(personalFiltrado.map(e => e.id))); };
  const limpiarSeleccion = () => setSeleccionados(new Set());
  const toggleDiaSemana = (di) => { if (!rolHabilitado && !esAdmin) return; setDiasSeleccionadosSemana(prev => prev.includes(di) ? prev.filter(d => d !== di) : [...prev, di]); };
  const seleccionarGrupo = (g) => { if (!rolHabilitado && !esAdmin) return; setDiasSeleccionadosSemana(g.dias); };

  const aplicarTurnoSeleccion = useCallback(() => {
    if (!rolHabilitado) return;
    if (seleccionados.size === 0) { mostrarToast('Seleccione al menos un trabajador', 'warning'); return; }
    if (diasAfectados.length === 0) { mostrarToast('Seleccione al menos un dia', 'warning'); return; }
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { if (!n[eid]) n[eid] = {}; diasAfectados.forEach(d => { n[eid][d] = turnoActivo; }); }); return n; });
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) diasAfectados.forEach(d => guardarCeldaInmediato(emp.fila, d, turnoActivo)); });
    mostrarToast(`${TURNO_MAP[turnoActivo]?.nombre || turnoActivo} aplicado a ${seleccionados.size} personal (${diasAfectados.length} dias)`, 'success');
  }, [rolHabilitado, seleccionados, diasAfectados, turnoActivo, personal, guardarCeldaInmediato, mostrarToast]);

  const aplicarPatronRotativo = useCallback(() => {
    if (!rolHabilitado) return;
    if (seleccionados.size === 0) { mostrarToast('Seleccione al menos un trabajador', 'warning'); return; }
    if (diasAfectados.length === 0) { mostrarToast('Seleccione al menos un dia', 'warning'); return; }
    const patron = patronRotativo.length ? patronRotativo : ['M'];
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { if (!n[eid]) n[eid] = {}; diasAfectados.forEach((d, idx) => { n[eid][d] = patron[idx % patron.length]; }); }); return n; });
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) diasAfectados.forEach((d, idx) => { guardarCeldaInmediato(emp.fila, d, patron[idx % patron.length]); }); });
    mostrarToast(`Patron rotativo aplicado a ${seleccionados.size} personal (${diasAfectados.length} dias)`, 'success');
    setModoPatron(false);
  }, [rolHabilitado, seleccionados, diasAfectados, patronRotativo, personal, guardarCeldaInmediato, mostrarToast]);

  const limpiarTurnosSeleccionados = useCallback(() => {
    if (!rolHabilitado || seleccionados.size === 0) return;
    if (!window.confirm(`Borrar TODOS los turnos de ${seleccionados.size} personal?`)) return;
    const todosDias = Array.from({ length: totalDiasMes }, (_, i) => i + 1);
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { n[eid] = {}; }); return n; });
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) todosDias.forEach(d => { if (turnos[eid]?.[d]) guardarCeldaInmediato(emp.fila, d, ''); }); });
    mostrarToast(`Turnos borrados de ${seleccionados.size} personal`, 'success');
    limpiarSeleccion();
  }, [rolHabilitado, seleccionados, personal, turnos, totalDiasMes, guardarCeldaInmediato, mostrarToast]);

  const handleAbrirModalCambio = useCallback((emp) => {
    setTrabajadorSeleccionado(emp);
    setModalCambioAbierto(true);
  }, []);

  const getTurnoDisplay = useCallback((empId, fechaStr) => {
    const dia = parseInt(fechaStr.split('-')[2]);
    return turnos[empId]?.[dia] || '';
  }, [turnos]);

  const getHorasSemana = useCallback((empId) => {
    let h = 0;
    diasSemana.forEach(d => { const t = TURNO_MAP[getTurnoDisplay(empId, d.fecha)]; if (t?.horas) h += t.horas; });
    return h;
  }, [diasSemana, getTurnoDisplay]);

  const registrarCambioTurno = useCallback((empId, cambios) => {
    setTurnos(prev => {
      const n = { ...prev };
      if (!n[empId]) n[empId] = {};
      cambios.forEach(c => { n[empId][c.dia] = c.turnoNuevoCodigo; });
      return n;
    });
    setTurnosBackup(prev => {
      const n = { ...prev };
      if (!n[empId]) n[empId] = {};
      cambios.forEach(c => { n[empId][c.dia] = c.turnoNuevoCodigo; });
      return n;
    });
    mostrarToast(`${cambios.length} cambio(s) registrado(s)`, 'success');
  }, [mostrarToast]);

  const guardarCeldaConRegistro = useCallback(async (fila, dia, valor) => {
    if (!config.appsScriptUrl || !hojaSeleccionada) throw new Error('Configuracion incompleta');
    const key = `${fila}-${dia}-modal`;
    if (guardadosPendientesRef.current.has(key)) return false;
    guardadosPendientesRef.current.add(key);
    try {
      const columna = columnaLetra(4 + dia);
      const valorTexto = valor ? (TURNO_MAP[valor]?.nombre || valor) : '';
      await fetch(config.appsScriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: bodyAsciiJson({ accion: 'guardarCelda', hoja: hojaSeleccionada, fila, columna, valor: valorTexto, responsable: responsable || 'ADMIN', area: areaAsignada, origen: 'modalCambioTurno', registrarHistorial: true }) });
      return true;
    } finally { setTimeout(() => { guardadosPendientesRef.current.delete(key); }, 1000); }
  }, [config.appsScriptUrl, hojaSeleccionada, areaAsignada, responsable]);

  // ============================================
  // HISTORIAL DE CAMBIOS (alineado con PanelTrabajo)
  // ============================================
  const cargarHistorialCambios = useCallback(async () => {
    if (!config.sheetId || !config.apiKey) return;
    try {
      const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${HOJA_CAMBIOS}!A:I?key=${config.apiKey}`);
      if (!r.ok) return;
      const d = await r.json();
      const rows = d.values || [];
      const lista = [];
      for (let i = 1; i < rows.length; i++) {
        const c = rows[i];
        if (!c || !String(c[0] || '').trim()) continue;
        const turnoNuevo = String(c[6] || '').trim();
        lista.push({
          fecha: formatearFechaHistorial(c[0]),
          hora: String(c[1] || '').trim(),
          responsable: String(c[2] || '').trim() || 'ADMIN',
          trabajador: String(c[3] || '').trim(),
          dia: String(c[4] || '').trim(),
          turnoAnterior: String(c[5] || '').trim() || '-',
          turnoNuevo: turnoNuevo || '-',
          turnoNuevoCodigo: NOMBRE_A_CODIGO[turnoNuevo.toUpperCase()] || '',
          tipo: String(c[7] || '').trim() || 'APROBADO_SOLICITUD',
          area: String(c[8] || '').trim()
        });
      }
      setHistorialCambios(lista);
    } catch { console.error('Error al cargar historial de cambios'); }
  }, [config.sheetId, config.apiKey]);

  const handleAbrirHistorial = useCallback(() => {
    cargarHistorialCambios();
    setModalHistorialAbierto(true);
  }, [cargarHistorialCambios]);

  // Alineado con PanelTrabajo: persiste estados de areas y sincroniza rol local
  const handleActualizarEstados = useCallback((ne) => {
    localStorage.setItem(`${STORAGE_ESTADOS}_${hojaSeleccionada}`, JSON.stringify(ne));
    if (ne[areaAsignada] === true && !esAdmin) setRolHabilitado(false);
    else if ((ne[areaAsignada] === false || ne[areaAsignada] === undefined) && !esAdmin) setRolHabilitado(true);
  }, [hojaSeleccionada, areaAsignada, esAdmin]);

  const registrarEnHistorial = useCallback(async (cambios) => {
    if (!config.appsScriptUrl || !config.sheetId) return;
    try {
      const registros = cambios.map(c => ({
        trabajador: c.trabajador || '',
        dia: c.dia || 0,
        turnoAnterior: c.turnoAnterior || '',
        turnoNuevo: c.turnoNuevoCodigo || '',
        responsable: responsable || 'ADMIN',
        area: areaAsignada || '',
        tipo: c.tipo || 'APROBADO_SOLICITUD'
      }));
      await fetch(config.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyAsciiJson({ accion: 'registrarCambiosOficiales', datos: registros })
      });
    } catch (e) { console.error('Error registrando en historial:', e); }
  }, [config.appsScriptUrl, config.sheetId, responsable, areaAsignada]);

  useEffect(() => {
    const handleRegistrarCambios = (e) => {
      const { solicitud, participantes } = e.detail;
      if (!participantes || participantes.length === 0) return;
      // ✅ El historial ya se registro en Apps Script via __aplicarDetalleMes_
      const totalCambios = participantes.reduce((acc, p) => acc + (p.cambios?.length || 0), 0);
      if (totalCambios > 0) {
        mostrarToast(`${totalCambios} cambio(s) aplicados correctamente`, 'success');
      }
    };
    window.addEventListener('registrar-cambios-aprobados', handleRegistrarCambios);
    return () => window.removeEventListener('registrar-cambios-aprobados', handleRegistrarCambios);
  }, [mostrarToast]);

  const handleGuardar = async () => {
    if (!config.appsScriptUrl) return;
    setGuardando(true);
    try {
      const filas = personal.map(emp => ({
        fila: emp.fila,
        valores: Array.from({ length: totalDiasMes }, (_, i) => {
          const c = turnos[emp.id]?.[i + 1];
          return c ? (TURNO_MAP[c]?.nombre || '') : '';
        })
      }));
      
      await fetch(config.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyAsciiJson({ accion: 'guardarLote', hoja: hojaSeleccionada, colInicio: 'F', area: areaAsignada, responsable: responsable || 'ADMIN', filas })
      });
      
      setTurnosBackup(JSON.parse(JSON.stringify(turnos)));
      guardarRespaldoLocal();
      
      await fetch(config.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyAsciiJson({ accion: 'marcarFinalizado', mes: hojaSeleccionada, area: areaAsignada })
      });
      
      if (!esAdmin) { setRolHabilitado(false); actualizarEstadoArea(areaAsignada, true); }
      mostrarToast('Guardado exitosamente', 'success');
    } catch (_e) { void _e; guardarRespaldoLocal(); mostrarToast('Error al guardar', 'error'); }
    finally { setGuardando(false); }
  };

  // ============================================
  // RENDER
  // ============================================
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: COLOR_PRIMARIO }} />
          <p className="text-gray-500 font-medium">Cargando datos...</p>
          <p className="text-xs text-gray-400 mt-1">{areaAsignada}</p>
        </div>
      </div>
    );
  }

  if (errorCarga && !cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800 mb-2">Error al cargar datos</h3>
          <p className="text-sm text-gray-600 mb-6">{errorCarga}</p>
          <button onClick={handleReintentarCarga} className="px-6 py-3 text-white rounded-xl font-bold flex items-center justify-center gap-2 mx-auto" style={{ backgroundColor: COLOR_PRIMARIO }}>
            <RefreshCw className="w-5 h-5" /> Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 animate-slide-down">
          <div className={`px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            toast.tipo === 'success' ? 'bg-emerald-500 text-white' : toast.tipo === 'warning' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm font-medium">{toast.mensaje}</span>
          </div>
        </div>
      )}

      <div className="text-white px-4 pt-4 pb-3 shadow-lg" style={{ backgroundColor: COLOR_PRIMARIO }}>
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="text-lg font-bold truncate">{areaAsignada}</h1>
            <p className="text-xs text-white/70 truncate">{responsable} · {MESES[mesSeleccionado - 1]} {anioSeleccionado}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {esAdmin && <span className="text-[9px] bg-yellow-400/30 text-yellow-100 px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
            <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${rolHabilitado ? 'bg-white/20 text-white' : 'bg-red-400/30 text-white'}`}>{rolHabilitado ? 'Abierto' : 'Cerrado'}</span>
            {esAdmin && <button onClick={handleAbrirHistorial} className="p-1.5 hover:bg-white/20 rounded-lg" title="Historial de cambios"><History className="w-5 h-5" /></button>}
            {esAdmin && <button onClick={() => setMostrarPanelAdmin(true)} className="p-1.5 hover:bg-white/20 rounded-lg" title="Panel de Control"><Shield className="w-5 h-5" /></button>}
            {esAdmin && onAbrirCambiosTurno && <button onClick={onAbrirCambiosTurno} className="p-1.5 hover:bg-white/20 rounded-lg" title="Bandeja de solicitudes"><Inbox className="w-5 h-5" /></button>}
            <button onClick={onSalir} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
          </div>
        </div>
        {hojasDisponibles.length > 1 && (
          <select
            value={hojaSeleccionada}
            onChange={(e) => handleHojaChange(e.target.value)}
            className="mt-2 w-full px-3 py-1.5 rounded-lg bg-white/15 text-white text-xs font-medium border border-white/20 focus:outline-none focus:bg-white/25"
          >
            {hojasDisponibles.map(h => <option key={h} value={h} className="text-gray-800">{h}</option>)}
          </select>
        )}
        <p className="text-xs text-white/50 mt-1">{personal.length} personal · {totalDiasMes} días</p>
      </div>

      {appsScriptError && (
        <div className="px-3 py-2 bg-amber-100 border-b-2 border-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium text-amber-800"><strong>Apps Script:</strong> {appsScriptError}</p>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, grado o DNI..." className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white" />
          {busqueda && <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X className="w-4 h-4" /></button>}
        </div>
        <p className="text-[10px] text-gray-400 mt-2">{personalFiltrado.length} de {personal.length} · S{semanaActual + 1}/{totalSemanas}</p>
      </div>

      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <button onClick={() => setSemanaActual(s => Math.max(0, s - 1))} disabled={semanaActual === 0} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
        <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /><span className="text-sm font-semibold text-gray-700">{diasSemana[0]?.dia} - {diasSemana[diasSemana.length - 1]?.dia} {MESES[mesSeleccionado - 1]}</span></div>
        <button onClick={() => setSemanaActual(s => Math.min(totalSemanas - 1, s + 1))} disabled={semanaActual >= totalSemanas - 1} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30"><ChevronRight className="w-5 h-5 text-gray-500" /></button>
      </div>

      <div className="bg-white px-4 pb-2 flex gap-1 justify-center">
        {Array.from({ length: totalSemanas }).map((_, i) => (<div key={i} className={`h-1 rounded-full transition-all ${i === semanaActual ? 'w-6 bg-emerald-500' : 'w-2 bg-gray-200'}`} />))}
      </div>

      {rolHabilitado && seleccionados.size > 0 && (
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-emerald-700 flex-shrink-0">{seleccionados.size} seleccionado{seleccionados.size > 1 ? 's' : ''}</span>
              <button onClick={seleccionarTodos} className="text-[10px] font-medium text-emerald-600 hover:underline flex-shrink-0">Todos</button>
              <button onClick={limpiarSeleccion} className="text-[10px] font-medium text-gray-400 hover:underline flex-shrink-0">Cancelar</button>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={limpiarTurnosSeleccionados} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Borrar turnos de los seleccionados"><Trash2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => setModoPatron(true)} className="px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 rounded-lg active:scale-95 transition-all">Patron</button>
              <button onClick={aplicarTurnoSeleccion} className="px-3 py-1.5 text-[10px] font-bold text-white rounded-lg active:scale-95 transition-all" style={{ backgroundColor: COLOR_PRIMARIO }}>Aplicar</button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2 overflow-x-auto scrollbar-hide">
            {DIAS_SEMANA_NOMBRES.map((inicial, di) => {
              const sel = diasSeleccionadosSemana.includes(di);
              return (
                <button key={di} onClick={() => toggleDiaSemana(di)} className={`w-8 h-8 rounded-lg text-[10px] font-bold flex-shrink-0 border transition-all active:scale-90 ${sel ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-400 border-gray-200'}`}>{inicial}</button>
              );
            })}
            <div className="w-px h-5 bg-emerald-100 mx-1 flex-shrink-0" />
            {[{ nombre: 'L-V', dias: [1, 2, 3, 4, 5] }, { nombre: 'FDS', dias: [0, 6] }, { nombre: 'Todos', dias: [0, 1, 2, 3, 4, 5, 6] }].map(g => (
              <button key={g.nombre} onClick={() => seleccionarGrupo(g)} className="px-2 h-8 rounded-lg text-[10px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 flex-shrink-0 active:scale-95 transition-all">{g.nombre}</button>
            ))}
            <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">{diasAfectados.length} dia{diasAfectados.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {totalFrancosInvalidos > 0 && rolHabilitado && !francosDescartados && (
          <div 
            className="px-4 py-3 rounded-xl text-sm font-medium bg-red-50 border-2 border-red-200 flex items-center gap-2 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => setMostrarModalFrancos(true)}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-red-700"><strong>{totalFrancosInvalidos}</strong> trabajador(es) con <strong>3 o más francos consecutivos</strong> ({totalInfraccionesFrancos} infracciones). Máximo permitido: 2. (No aplica a personal civil)</span>
            <span className="text-xs text-red-500 underline ml-auto flex-shrink-0">Ver</span>
            <button
              onClick={(e) => { e.stopPropagation(); descartarFrancos(); }}
              className="ml-2 px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-200 transition-colors flex-shrink-0"
            >
              Ocultar
            </button>
          </div>
        )}
        {personalFiltrado.length === 0 ? (
          <div className="text-center py-16"><User className="w-16 h-16 text-gray-200 mx-auto mb-4" /><p className="text-gray-400 font-medium">Sin resultados</p></div>
        ) : (
          personalFiltrado.map(emp => {
            const horasSemana = getHorasSemana(emp.id);
            const tieneFrancosInvalidos = idsConFrancosInvalidos.has(emp.id);
            return (
              <div key={emp.id} data-empleado-id={emp.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden active:scale-[0.98] transition-transform ${tieneFrancosInvalidos ? 'border-red-300 ring-1 ring-red-200' : ''} ${seleccionados.has(emp.id) ? 'border-emerald-400 ring-2 ring-emerald-200' : ''}`}>
                <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                  {rolHabilitado && (
                    <button onClick={() => toggleSeleccion(emp.id)} className={`p-1.5 rounded-lg flex-shrink-0 transition-colors mr-1 ${seleccionados.has(emp.id) ? 'bg-emerald-100 text-emerald-600' : 'text-gray-300 hover:text-gray-500'}`} title={seleccionados.has(emp.id) ? 'Quitar de la seleccion' : 'Seleccionar'}>
                      {seleccionados.has(emp.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase">{emp.grado}</p>
                    <p className="text-sm font-bold text-gray-800 truncate">{emp.nombre}</p>
                    {emp.dni && <p className="text-[10px] text-gray-400">DNI: {emp.dni}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="text-right"><p className="text-lg font-bold" style={{ color: COLOR_PRIMARIO }}>{horasSemana}h</p><p className="text-[10px] text-gray-400">semana</p></div>
                    {esAdmin && <button onClick={(e) => { e.stopPropagation(); handleAbrirModalCambio(emp); }} className="p-1.5 hover:bg-amber-50 rounded-lg transition-colors" title="Registrar cambio de turno"><FileText className="w-4 h-4 text-amber-500" /></button>}
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="grid grid-cols-7 gap-1 mb-1.5">
                    {DIAS_SEMANA_NOMBRES.map((d, i) => (<div key={i} className={`text-center text-[10px] font-semibold ${i === 0 || i === 6 ? 'text-gray-300' : 'text-gray-400'}`}>{d}</div>))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {diasSemana.map(d => {
                      const codigo = getTurnoDisplay(emp.id, d.fecha);
                      const turno = TURNO_MAP[codigo];
                      return (
                        <button key={d.fecha} onClick={() => handleDiaClick(emp.id, d.fecha)} disabled={!rolHabilitado}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all relative ${d.esHoy ? 'ring-2 ring-emerald-500 ring-offset-1' : ''} ${d.esFinDeSemana && !codigo ? 'opacity-50' : ''} ${!rolHabilitado ? 'opacity-60' : 'active:scale-90'}`}
                          style={{ backgroundColor: turno?.color || '#f9fafb', color: turno?.texto || '#94a3b8' }}>
                          <span className="text-[9px] leading-none">{d.dia}</span>
                          <span className="text-[8px] font-bold leading-none mt-0.5">{codigo || '·'}</span>
                        </button>
                      );
                    })}
                    {Array.from({ length: 7 - diasSemana.length }).map((_, i) => (<div key={`empty-${i}`} className="aspect-square" />))}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {rolHabilitado && (
        <div className="sticky bottom-0 bg-white border-t shadow-lg safe-area-bottom">
          <div className="px-3 py-2.5 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <span className="text-[10px] text-gray-400 mr-1 flex-shrink-0">Turno:</span>
            {todosLosTurnos.map(codigo => {
              const t = TURNO_MAP[codigo];
              if (!t) return null;
              const activo = turnoActivo === codigo;
              return (
                <button key={codigo} onClick={() => setTurnoActivo(codigo)}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg text-[10px] font-bold transition-all active:scale-90 ${activo ? 'ring-2 ring-emerald-500 scale-110' : 'opacity-70'}`}
                  style={{ backgroundColor: t.color, color: t.texto }}>{codigo}</button>
              );
            })}
          </div>
          <div className="px-4 py-2.5 border-t">
            <button onClick={handleGuardar} disabled={guardando}
              className="w-full py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: COLOR_PRIMARIO }}>
              {guardando ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</> : <><Save className="w-4 h-4" /> {esAdmin ? 'Guardar' : 'Finalizar'}</>}
            </button>
          </div>
        </div>
      )}

      {modoPatron && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-[250]" onClick={() => setModoPatron(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-md p-4 pb-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-gray-800">Patron rotativo</h3>
              <button onClick={() => setModoPatron(false)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Cerrar"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-[10px] text-gray-400 mb-3">Se repetira sobre {diasAfectados.length} dia(s) de la semana · {seleccionados.size} personal.</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              {patronRotativo.map((codigo, i) => {
                const t = TURNO_MAP[codigo];
                return (
                  <select key={i} value={codigo} onChange={(e) => setPatronRotativo(prev => prev.map((c, idx) => idx === i ? e.target.value : c))}
                    className="h-9 px-2 rounded-lg text-[10px] font-bold border border-gray-200 bg-white focus:outline-none" style={{ color: t?.texto, backgroundColor: t?.color }}>
                    {todosLosTurnos.map(c => <option key={c} value={c} style={{ color: TURNO_MAP[c]?.texto, backgroundColor: TURNO_MAP[c]?.color }}>{c}</option>)}
                  </select>
                );
              })}
              {patronRotativo.length < 7 && (
                <button onClick={() => setPatronRotativo(prev => [...prev, 'M'])} className="h-9 px-3 rounded-lg text-[10px] font-medium text-gray-500 border border-dashed border-gray-300 active:scale-95 transition-all">+</button>
              )}
            </div>
            <button onClick={aplicarPatronRotativo} disabled={diasAfectados.length === 0 || seleccionados.size === 0}
              className="w-full py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: COLOR_PRIMARIO }}>
              <CheckCircle2 className="w-4 h-4" /> Aplicar patron
            </button>
          </div>
        </div>
      )}

      {esAdmin && (
        <ModalCambioTurno 
          isOpen={modalCambioAbierto} onClose={() => setModalCambioAbierto(false)} 
          trabajador={trabajadorSeleccionado} turnos={turnos} 
          mes={mesSeleccionado} anio={anioSeleccionado} responsable={responsable} 
          onRegistrarCambio={registrarCambioTurno}
          onGuardarCelda={guardarCeldaConRegistro}
        />
      )}

      {esAdmin && (
        <ModalHistorial 
          isOpen={modalHistorialAbierto} onClose={() => setModalHistorialAbierto(false)} 
          historialCambios={historialCambios} 
        />
      )}

      {esAdmin && (
        <PanelControlAdmin
          isOpen={mostrarPanelAdmin} onClose={() => setMostrarPanelAdmin(false)}
          areas={todasLasAreas} config={config} onActualizar={handleActualizarEstados}
          hojaSeleccionada={hojaSeleccionada} hojasDisponibles={hojasDisponibles}
        />
      )}

      <ModalFrancosInvalidos
        isOpen={mostrarModalFrancos}
        onClose={() => setMostrarModalFrancos(false)}
        francosInvalidos={francosInvalidos}
        personal={personal}
        onIrAFila={(empId) => {
          setMostrarModalFrancos(false);
          const el = document.querySelector(`[data-empleado-id="${empId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-red-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-red-400'), 2000);
          }
        }}
      />

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 0px); }
        @keyframes slide-down { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-down { animation: slide-down 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default MobileRolView;