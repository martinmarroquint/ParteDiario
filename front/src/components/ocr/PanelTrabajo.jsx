// src/components/ocr/PanelTrabajo.jsx
// VERSION COMPLETA - CON CAMBIO DE CONTRASEÑA Y TODOS LOS ROLES
// ADMIN, JEFE (Área/Departamento/División), USUARIO BASE

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, AlertTriangle, Loader2, RefreshCw, CheckCircle2, XCircle, User,
  Save, Eye, Printer, LogOut, Shield, Settings, Undo2, History,
  Search, Zap, Trash2, Copy, Repeat, ChevronUp, Plus, Minus, SaveIcon, 
  Play, ChevronLeft, ChevronRight, UserPlus, Users, Building2, GraduationCap,
  EyeOff
} from 'lucide-react';
import { 
  TURNO_MAP, NOMBRE_A_CODIGO, HOJA_CAMBIOS, COLOR_PRIMARIO, MESES, 
  DEFAULT_GOOGLE_CONFIG, bodyAsciiJson, ordenarPersonalPorGrado, esPersonalCivil, soloHojasMes,
  hojaInicialParaArea, guardarHojaPreferida, hojaDelMesActual, verificarAppsScript
} from './constantes';
import Encabezado from './Encabezado';
import TablaRol from './TablaRol';
import VistaUsuario from './VistaUsuario';
import ModalCambioTurno from './ModalCambioTurno';
import ModalDescansoMedico from './ModalDescansoMedico';
import ModalRegistroVacaciones from './ModalRegistroVacaciones';
import ModalHistorial from './ModalHistorial';
import ImpresionRol from './ImpresionRol';
import PanelControlAdmin from './PanelControlAdmin';
import ModalVistaPrevia from './ModalVistaPrevia';
import ModalSolicitudCambioTurno from './ModalSolicitudCambioTurno';
import ModalCambiarPassword from './auth/ModalCambiarPassword';
import ModalFrancosInvalidos from './ModalFrancosInvalidos';

const STORAGE_ESTADOS = 'ocr_estados_areas';
const STORAGE_RESPALDO_LOCAL = 'ocr_respaldo_local';
const STORAGE_SESION = 'ocr_sesion_activa';
const MAX_HISTORIAL_DESHACER = 50;

const columnaLetra = (numero) => {
  let letra = ''; let n = numero;
  while (n >= 0) { letra = String.fromCharCode(65 + (n % 26)) + letra; n = Math.floor(n / 26) - 1; }
  return letra;
};

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

const sesionGuardada = (() => {
  try { const saved = sessionStorage.getItem(STORAGE_SESION); return saved ? JSON.parse(saved) : null; } catch { return null; }
})();

const guardarSesion = (mes, anio) => {
  try { 
    const s = JSON.parse(sessionStorage.getItem(STORAGE_SESION) || '{}'); 
    s.mes = mes; s.anio = anio; 
    sessionStorage.setItem(STORAGE_SESION, JSON.stringify(s)); 
  } catch { /* almacenamiento no disponible */ }
};

const PanelTrabajo = ({ 
  areaAsignada, 
  responsable, 
  esAdmin, 
  onSalir, 
  todasLasAreas, 
  medicos = [], 
  onAbrirCambiosTurno,
  onAbrirAdminUsuarios = null,
  esJefe = false,
  esUsuario = false,
  user = null
}) => {
  const [config, setConfig] = useState(DEFAULT_GOOGLE_CONFIG);
  const [mostrarConfig, setMostrarConfig] = useState(false);
  const [hojasDisponibles, setHojasDisponibles] = useState([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState(config.sheetName || hojaDelMesActual());

  const [mesSeleccionado, setMesSeleccionado] = useState(() => {
    const hoja = (config.sheetName || hojaDelMesActual()).toUpperCase();
    const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 };
    return mapa[hoja] || new Date().getMonth() + 1;
  });

  const [anioSeleccionado, setAnioSeleccionado] = useState(new Date().getFullYear());
  const [personal, setPersonal] = useState([]);
  const [todoElPersonal, setTodoElPersonal] = useState([]);
  const [turnos, setTurnos] = useState({});
  const [turnosBackup, setTurnosBackup] = useState({});
  const [cargando, setCargando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);
  const [appsScriptError, setAppsScriptError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [turnoActivo, setTurnoActivo] = useState('M');
  const [diasSeleccionadosSemana, setDiasSeleccionadosSemana] = useState([1, 2, 3, 4, 5]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [cambiosArea, setCambiosArea] = useState({});
  const [historialDeshacer, setHistorialDeshacer] = useState([]);
  const [celdasModificadas, setCeldasModificadas] = useState(() => {
    try {
      const key = `ocr_celdas_modificadas_${hojaSeleccionada || hojaDelMesActual()}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw);
        return new Map(arr);
      }
    } catch { void 0; }
    return new Map();
  });
  // Persistir celdas modificadas: localStorage (fast) + Apps Script (cross-device)
  const celdasPersistidasRef = useRef(new Set());
  useEffect(() => {
    try {
      const key = `ocr_celdas_modificadas_${hojaSeleccionada || hojaDelMesActual()}`;
      if (celdasModificadas.size > 0) {
        localStorage.setItem(key, JSON.stringify([...celdasModificadas]));
        // Persistir entradas nuevas en Apps Script (cross-device)
        if (config.appsScriptUrl) {
          celdasModificadas.forEach((info, k) => {
            if (!celdasPersistidasRef.current.has(k)) {
              celdasPersistidasRef.current.add(k);
              const [fila, dia] = k.split('-').map(Number);
              fetch(config.appsScriptUrl, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: bodyAsciiJson({
                  accion: 'registrarCeldaModificada',
                  hoja: hojaSeleccionada, fila, dia,
                  valorAnterior: info.turnoAnterior || info.valorAnterior || '',
                  valorNuevo: info.turnoNuevo || info.valorNuevo || '',
                  responsable: responsable || 'ADMIN',
                  tipo: info.tipo || 'directo'
                })
              }).catch(() => {});
            }
          });
        }
      } else {
        localStorage.removeItem(key);
      }
    } catch { void 0; }
  }, [celdasModificadas, hojaSeleccionada, config.appsScriptUrl, responsable]);

  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [areaSeleccionadaJefe, setAreaSeleccionadaJefe] = useState(areaAsignada);
  const [areaSeleccionadaAdmin, setAreaSeleccionadaAdmin] = useState('TODAS');
  const [rolGuardado, setRolGuardado] = useState(false);
  const [mostrarCambiarPassword, setMostrarCambiarPassword] = useState(false);

  const [rolHabilitado, setRolHabilitado] = useState(() => {
    if (esAdmin) return true;
    try { const g = localStorage.getItem(`${STORAGE_ESTADOS}_${config.sheetName || hojaDelMesActual()}`); if (g) { const e = JSON.parse(g); if (e[areaAsignada] === true) return false; } } catch { /* sin estado guardado */ }
    return true;
  });

  const [modalCambioAbierto, setModalCambioAbierto] = useState(false);
  const [modalDescansoAbierto, setModalDescansoAbierto] = useState(false);
  const [modalVacacionesAbierto, setModalVacacionesAbierto] = useState(false);
  const [modalSolicitudAbierto, setModalSolicitudAbierto] = useState(false);
  const [trabajadorSeleccionado, setTrabajadorSeleccionado] = useState(null);
  const [historialCambios, setHistorialCambios] = useState([]);
  const [modalHistorialAbierto, setModalHistorialAbierto] = useState(false);
  const [mostrarImpresion, setMostrarImpresion] = useState(false);
  const [mostrarPanelAdmin, setMostrarPanelAdmin] = useState(false);
  const [areaDestino, setAreaDestino] = useState('');
  const [mostrarAgregarPersonal, setMostrarAgregarPersonal] = useState(false);
  const [personalAAgregar, setPersonalAAgregar] = useState('');
  const [busquedaPersonalAgregar, setBusquedaPersonalAgregar] = useState('');
  const [mostrarModalFrancos, setMostrarModalFrancos] = useState(false);
  const [francosDescartados, setFrancosDescartados] = useState(() => {
    try {
      const key = `ocr_francos_descartados_${mesSeleccionado}_${anioSeleccionado}`;
      return sessionStorage.getItem(key) === 'true';
    } catch { return false; }
  });

  const [toast, setToast] = useState(null);

  const mensajeTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const cargadoRef = useRef(false);
  const cargandoRef = useRef(false); // Prevent concurrent loads
  const cargarHojasUnavezRef = useRef(false);
  const hojaActualRef = useRef(hojaSeleccionada);
  const agregandoRef = useRef(false);
  const cargarDatosRef = useRef(null); // Ref to hold latest cargarDatosIniciales

  useEffect(() => {
    hojaActualRef.current = hojaSeleccionada;
  }, [hojaSeleccionada]);

  const fechaActual = useMemo(() => new Date(), []);
  const mesActual = useMemo(() => fechaActual.getMonth() + 1, [fechaActual]);
  const anioActual = useMemo(() => fechaActual.getFullYear(), [fechaActual]);
  const nombreMesActual = useMemo(() => MESES[mesActual - 1].toUpperCase(), [mesActual]);
  const diaActual = useMemo(() => fechaActual.getDate(), [fechaActual]);

  const totalDiasMes = useMemo(() => new Date(anioSeleccionado, mesSeleccionado, 0).getDate(), [mesSeleccionado, anioSeleccionado]);
  const DIAS = useMemo(() => Array.from({ length: totalDiasMes }, (_, i) => i + 1), [totalDiasMes]);

  const diasDelMes = useMemo(() => {
    const dias = [];
    for (let d = 1; d <= totalDiasMes; d++) {
      const fecha = new Date(anioSeleccionado, mesSeleccionado - 1, d);
      dias.push({ diaNum: d, diaSemana: fecha.getDay(), esSeleccionado: diasSeleccionadosSemana.includes(fecha.getDay()) });
    }
    return dias;
  }, [totalDiasMes, anioSeleccionado, mesSeleccionado, diasSeleccionadosSemana]);

  const diasAfectados = useMemo(() => diasDelMes.filter(d => d.esSeleccionado).map(d => d.diaNum), [diasDelMes]);
  
  // Áreas disponibles para el selector (según rol)
  const areasDisponiblesSelector = useMemo(() => {
    if (esAdmin) {
      return todasLasAreas;
    } else if (esJefe && user) {
      return user.areas || [];
    } else if (esUsuario) {
      return user?.area ? [user.area] : [];
    }
    return [];
  }, [esAdmin, esJefe, esUsuario, todasLasAreas, user]);

  // Personal filtrado según rol y área seleccionada
  const personalFiltradoPorRol = useMemo(() => {
    if (esAdmin) {
      // Admin: si areaSeleccionadaAdmin es 'TODAS' o null, mostrar todo
      if (!areaSeleccionadaAdmin || areaSeleccionadaAdmin === 'TODAS') {
        return personal;
      }
      return personal.filter(p => p.area === areaSeleccionadaAdmin);
    } else if (esJefe) {
      const areaActual = areaSeleccionadaJefe || areaAsignada;
      return personal.filter(p => p.area === areaActual);
    } else if (esUsuario) {
      // Filtrar por nombre (consistente entre USUARIOS_OCR y PERSONAL)
      const nombreUser = (user?.nombre || '').toLowerCase().trim();
      return personal.filter(p => (p.nombre || '').toLowerCase().trim() === nombreUser);
    }
    return personal;
  }, [esAdmin, esJefe, esUsuario, personal, areaSeleccionadaAdmin, areaSeleccionadaJefe, areaAsignada, user]);

  const personalFiltrado = useMemo(() => {
    let r = personalFiltradoPorRol;
    
    if (busqueda.trim()) { 
      const t = busqueda.toLowerCase(); 
      r = r.filter(p => 
        p.nombre?.toLowerCase().includes(t) || 
        p.dni?.includes(t) || 
        p.grado?.toLowerCase().includes(t) || 
        p.area?.toLowerCase().includes(t)
      ); 
    }
    return ordenarPersonalPorGrado(r);
  }, [personalFiltradoPorRol, busqueda]);

  const personalOrdenado = useMemo(() => ordenarPersonalPorGrado(personal), [personal]);
  
  const personalDisponible = useMemo(() => {
    if (!esAdmin && !esJefe) return [];
    const areaActual = esJefe ? (areaSeleccionadaJefe || areaAsignada) : areaAsignada;
    const filtrado = todoElPersonal.filter(p => p.area !== areaActual);
    return ordenarPersonalPorGrado(filtrado);
  }, [todoElPersonal, areaAsignada, esAdmin, esJefe, areaSeleccionadaJefe]);

  const francosInvalidos = useMemo(() => {
    const invalidaciones = {};
    const personalAValidar = esAdmin ? personal : personalFiltradoPorRol;
    personalAValidar.forEach(emp => {
      if (esPersonalCivil(emp.grado)) return;
      let contadorFrancos = 0, inicioFrancos = null;
      for (let idx = 0; idx < DIAS.length; idx++) {
        const dia = DIAS[idx], turno = turnos[emp.id]?.[dia] || '';
        if (turno === 'F') { 
          if (contadorFrancos === 0) inicioFrancos = dia; 
          contadorFrancos++; 
        } else { 
          if (contadorFrancos >= 3) { 
            if (!invalidaciones[emp.id]) invalidaciones[emp.id] = []; 
            invalidaciones[emp.id].push({ inicio: inicioFrancos, fin: dia - 1, cantidad: contadorFrancos, dias: DIAS.slice(idx - contadorFrancos, idx) }); 
          } 
          contadorFrancos = 0; inicioFrancos = null; 
        }
      }
      if (contadorFrancos >= 3) { 
        if (!invalidaciones[emp.id]) invalidaciones[emp.id] = []; 
        invalidaciones[emp.id].push({ inicio: inicioFrancos, fin: DIAS[DIAS.length - 1], cantidad: contadorFrancos, dias: DIAS.slice(DIAS.length - contadorFrancos) }); 
      }
    });
    return invalidaciones;
  }, [personal, turnos, DIAS, esAdmin, personalFiltradoPorRol]);

  const totalFrancosInvalidos = useMemo(() => Object.keys(francosInvalidos).length, [francosInvalidos]);
  const totalInfraccionesFrancos = useMemo(() => Object.values(francosInvalidos).reduce((s, i) => s + i.length, 0), [francosInvalidos]);
  const idsConFrancosInvalidos = useMemo(() => new Set(Object.keys(francosInvalidos).map(Number)), [francosInvalidos]);

  // Permisos según rol — solo se puede editar si el rol está habilitado (abierto)
  const puedeEditar = rolHabilitado && (esAdmin || esJefe);
  const puedeAgregarPersonal = esAdmin || esJefe;
  const puedeAdministrarUsuarios = esAdmin;
  const puedePanelControl = esAdmin;
  const puedeImprimir = esJefe || esAdmin;
  const puedeGuardar = esAdmin || esJefe;
  const puedeRecargar = esAdmin || esJefe;
  const puedeBandeja = esAdmin || esJefe;
  const puedeSolicitarCambio = true;
  const puedeDescansoMedico = true;
  const puedeVacaciones = esAdmin || esJefe;

  const mostrarMensajeTemporal = useCallback((tipo, texto, duracion = 5000) => {
    if (mensajeTimeoutRef.current) clearTimeout(mensajeTimeoutRef.current);
    setMensaje({ tipo, texto });
    mensajeTimeoutRef.current = setTimeout(() => setMensaje(null), duracion);
  }, []);

  const mostrarToast = useCallback((data) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast(data);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const descartarFrancos = useCallback(() => {
    setFrancosDescartados(true);
    try {
      const key = `ocr_francos_descartados_${mesSeleccionado}_${anioSeleccionado}`;
      sessionStorage.setItem(key, 'true');
    } catch { /* ignore */ }
  }, [mesSeleccionado, anioSeleccionado]);

  const irAFilaEmpleado = useCallback((empId) => {
    setMostrarModalFrancos(false);
    const fila = document.querySelector(`tr[data-empleado-id="${empId}"]`);
    if (fila) {
      fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fila.classList.add('ring-2', 'ring-red-400');
      setTimeout(() => fila.classList.remove('ring-2', 'ring-red-400'), 2000);
    }
  }, []);

  const actualizarEstadoArea = useCallback((area, bloqueado) => {
    try { 
      const key = `${STORAGE_ESTADOS}_${hojaSeleccionada}`;
      const g = localStorage.getItem(key); 
      const e = g ? JSON.parse(g) : {}; 
      e[area] = bloqueado; 
      localStorage.setItem(key, JSON.stringify(e)); 
    } catch { /* almacenamiento no disponible */ }
  }, [hojaSeleccionada]);

  const guardarRespaldoLocal = useCallback(() => {
    try { 
      localStorage.setItem(`${STORAGE_RESPALDO_LOCAL}_${areaAsignada}`, JSON.stringify({ 
        turnos, cambiosArea, timestamp: Date.now(), area: areaAsignada, hoja: hojaSeleccionada 
      })); 
    } catch { /* almacenamiento no disponible */ }
  }, [turnos, cambiosArea, areaAsignada, hojaSeleccionada]);

  const verificarAreaFinalizadaEnSheets = useCallback(async () => {
    if (esAdmin) return false;
    try { 
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/ESTADOS!A:C?key=${config.apiKey}`; 
      const r = await fetch(url, { signal: controller.signal }); 
      clearTimeout(timeoutId);
      if (!r.ok) return false; 
      const d = await r.json(); 
      const filas = d.values || []; 
      for (const fila of filas) { 
        if (fila[0] === hojaSeleccionada && fila[1] === areaAsignada && fila[2] === 'FINALIZADO') return true; 
      } 
      return false; 
    } catch { 
      return false; 
    }
  }, [config, areaAsignada, esAdmin, hojaSeleccionada]);

  const marcarAreaComoFinalizada = useCallback(async () => { 
    if (!config.appsScriptUrl) return; 
    try { 
      await fetch(config.appsScriptUrl, { 
        method: 'POST', mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' }, 
        body: bodyAsciiJson({ accion: 'marcarFinalizado', mes: hojaSeleccionada, area: areaAsignada }) 
      }); 
      setRolGuardado(true);
    } catch (e) { console.error('Error al marcar area:', e); } 
  }, [config.appsScriptUrl, areaAsignada, hojaSeleccionada]);
  
  const desmarcarArea = useCallback(async () => { 
    if (!config.appsScriptUrl) return; 
    try { 
      await fetch(config.appsScriptUrl, { 
        method: 'POST', mode: 'no-cors', 
        headers: { 'Content-Type': 'text/plain' }, 
        body: bodyAsciiJson({ accion: 'desmarcarFinalizado', mes: hojaSeleccionada, area: areaAsignada }) 
      }); 
      setRolGuardado(false);
    } catch (e) { console.error('Error al desmarcar area:', e); } 
  }, [config.appsScriptUrl, areaAsignada, hojaSeleccionada]);

  const hojaAMes = useCallback((hoja) => { const mapa = { ENERO:1, FEBRERO:2, MARZO:3, ABRIL:4, MAYO:5, JUNIO:6, JULIO:7, AGOSTO:8, SEPTIEMBRE:9, OCTUBRE:10, NOVIEMBRE:11, DICIEMBRE:12 }; return mapa[String(hoja).toUpperCase()] || new Date().getMonth() + 1; }, []);

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

      // Solo guardar la lista de hojas disponibles, NO cambiar la hoja seleccionada.
      // La hoja siempre inicia en el mes actual (hojaDelMesActual).
    } catch (e) { console.error('Error al cargar hojas:', e); } 
  }, [config]);

  const cargarDatosIniciales = useCallback(async () => {
    if (!config.sheetId || !hojaSeleccionada) return;
    if (cargadoRef.current || cargandoRef.current) return;
    
    cargandoRef.current = true;
    setCargando(true); 
    setErrorCarga(null);
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(hojaSeleccionada)}!A:AJ?key=${config.apiKey}`;
      const r = await fetch(url); 
      if (!r.ok) { const ed = await r.json(); throw new Error(ed.error?.message || `Error HTTP ${r.status}`); }
      const d = await r.json(); const rows = d.values || [];
      if (rows.length < 2) { 
        setPersonal([]); setTodoElPersonal([]); setTurnos({}); setTurnosBackup({}); setCambiosArea({}); 
        cargadoRef.current = true; return; 
      }
      
      const todos = [], tObj = {}, cObj = {};
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i]; 
        if (!cols || cols.length < 3) continue;
        const af = (cols[3] || '').trim();
        const emp = { id: i, fila: i + 1, dni: (cols[0]||'').trim(), grado: (cols[1]||'').trim(), nombre: (cols[2]||'').trim(), area: af, areaOriginal: af };
        todos.push(emp);
        const te = {}; 
        for (let d = 0; d < totalDiasMes; d++) { te[d+1] = NOMBRE_A_CODIGO[(cols[5+d]||'').trim()] || ''; }
        tObj[i] = te; cObj[i] = af;
      }
      
      const bloqueadoPorBoton = await verificarAreaFinalizadaEnSheets();
      if (esAdmin) { setRolHabilitado(true); }
      else { setRolHabilitado(!bloqueadoPorBoton); actualizarEstadoArea(areaAsignada, bloqueadoPorBoton); }
      
      setTodoElPersonal(todos); 
      
      let personalInicial = todos;
      if (esUsuario && user) {
        // Filtrar por nombre (consistente entre USUARIOS_OCR y PERSONAL)
        const nombreUser = (user.nombre || '').toLowerCase().trim();
        personalInicial = todos.filter(p => (p.nombre || '').toLowerCase().trim() === nombreUser);
      } else if (esJefe) {
        const areaActual = areaSeleccionadaJefe || areaAsignada;
        personalInicial = todos.filter(p => p.area === areaActual);
      }
      
      setPersonal(ordenarPersonalPorGrado(personalInicial)); 
      setTurnos(tObj); setTurnosBackup(JSON.parse(JSON.stringify(tObj))); setCambiosArea(cObj); 
      
      // Cargar celdas modificadas desde Google Sheets API (cross-device)
      try {
        const rMod = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/CELDA_MODIFICADA!A:H?key=${config.apiKey}`
        );
        if (rMod.ok) {
          const dMod = await rMod.json();
          const rowsMod = dMod.values || [];
          const mapaMod = new Map();
          for (let m = 1; m < rowsMod.length; m++) {
            const row = rowsMod[m];
            if (String(row[0] || '') !== hojaSeleccionada) continue;
            const fila = parseInt(row[1]);
            const dia = parseInt(row[2]);
            if (!fila || !dia) continue;
            mapaMod.set(`${fila}-${dia}`, {
              valorAnterior: String(row[3] || ''),
              valorNuevo: String(row[4] || ''),
              responsable: String(row[5] || ''),
              fecha: row[6] || '',
              tipo: String(row[7] || 'directo')
            });
          }
          if (mapaMod.size > 0) setCeldasModificadas(mapaMod);
        }
      } catch { void 0; }
      
      const estadoGuardado = localStorage.getItem(`${STORAGE_ESTADOS}_${hojaSeleccionada}`);
      if (estadoGuardado) {
        const e = JSON.parse(estadoGuardado);
        setRolGuardado(e[areaAsignada] === true);
      }
      
      cargadoRef.current = true;
    } catch (e) { console.error('Error al cargar datos:', e); setErrorCarga(e.message); } 
    finally { cargandoRef.current = false; setCargando(false); }
  }, [config.sheetId, config.apiKey, hojaSeleccionada, totalDiasMes, areaAsignada, esAdmin, verificarAreaFinalizadaEnSheets, actualizarEstadoArea, esJefe, esUsuario, user, areaSeleccionadaJefe]);

  // Guardar referencia a cargarDatosIniciales para uso en otros handlers
  useEffect(() => {
    cargarDatosRef.current = cargarDatosIniciales;
  }, [cargarDatosIniciales]);

  useEffect(() => {
    if (cargarHojasUnavezRef.current) return;
    cargarHojasUnavezRef.current = true;
    cargarHojas();
  }, [cargarHojas]);

  // Initial load: only fires when hojaSeleccionada first becomes available
  useEffect(() => {
    if (hojaSeleccionada && config.sheetId && !cargadoRef.current && !cargandoRef.current) {
      cargarDatosIniciales();
    }
  }, [hojaSeleccionada, config.sheetId, cargarDatosIniciales]);

  // Sync mesSeleccionado with hojaSeleccionada
  useEffect(() => {
    if (!hojaSeleccionada) return;
    const mesDeLaHoja = hojaAMes(hojaSeleccionada);
    if (mesSeleccionado !== mesDeLaHoja) {
      setMesSeleccionado(mesDeLaHoja);
      guardarSesion(mesDeLaHoja, anioSeleccionado);
    }
  }, [hojaSeleccionada, hojaAMes, anioSeleccionado]);

  // Reload when jefe changes area
  useEffect(() => {
    if (esJefe && cargadoRef.current && !cargandoRef.current) {
      cargadoRef.current = false;
      cargarDatosIniciales();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaSeleccionadaJefe]);

  const recargarDatos = useCallback(async () => { 
    if (cargandoRef.current) return;
    cargadoRef.current = false; 
    await cargarDatosIniciales(); 
  }, [cargarDatosIniciales, cargando]);
  
  const handleHojaChange = useCallback((e) => { 
    if (cargandoRef.current) return;
    const nh = e.target.value; 
    guardarHojaPreferida(areaAsignada, nh); 
    setHojaSeleccionada(nh); 
    setConfig(prev => (prev.sheetName === nh ? prev : { ...prev, sheetName: nh })); 
    setMesSeleccionado(hojaAMes(nh)); 
    guardarSesion(hojaAMes(nh), anioSeleccionado); 
    setPersonal([]); 
    setTodoElPersonal([]);
    setTurnos({}); 
    setTurnosBackup({}); 
    setCambiosArea({}); 
    setFrancosDescartados(false);
    setSeleccionados(new Set());
    setHistorialDeshacer([]);
    setBusqueda('');
    setMensaje(null);
    setErrorCarga(null);
    cargadoRef.current = false; 
    cargandoRef.current = false;
  }, [hojaAMes, anioSeleccionado, areaAsignada]);

  const handleAreaChangeJefe = useCallback((nuevaArea) => {
    if (nuevaArea !== areaSeleccionadaJefe) {
      setAreaSeleccionadaJefe(nuevaArea);
      // Preserve mes/anio when saving area change
      const sesionActual = JSON.parse(sessionStorage.getItem(STORAGE_SESION) || '{}');
      sessionStorage.setItem(STORAGE_SESION, JSON.stringify({
        ...sesionActual,
        area: nuevaArea,
        responsable,
        esAdmin,
        timestamp: Date.now()
      }));
    }
  }, [areaSeleccionadaJefe, responsable, esAdmin]);

  const handleAreaChangeAdmin = useCallback((nuevaArea) => {
    if (nuevaArea !== areaSeleccionadaAdmin) {
      setAreaSeleccionadaAdmin(nuevaArea);
      // Preserve mes/anio when saving area change
      const sesionActual = JSON.parse(sessionStorage.getItem(STORAGE_SESION) || '{}');
      sessionStorage.setItem(STORAGE_SESION, JSON.stringify({
        ...sesionActual,
        area: nuevaArea,
        responsable,
        esAdmin,
        timestamp: Date.now()
      }));
    }
  }, [areaSeleccionadaAdmin, responsable, esAdmin]);

  const handleCambiarPassword = async (passwordActual, passwordNueva) => {
    try {
      // Aquí iría la llamada al servicio de cambio de contraseña
      console.log('Cambiando contraseña:', { passwordActual, passwordNueva });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

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
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: bodyAsciiJson({ 
          accion: 'registrarCambiosOficiales',
          datos: registros 
        })
      });
      
      console.log('Cambios registrados en historial oficial');
    } catch (e) {
      console.error('Error registrando en historial:', e);
    }
  }, [config.appsScriptUrl, config.sheetId, responsable, areaAsignada]);

  useEffect(() => {
    const handleRegistrarCambios = (e) => {
      const { solicitud, participantes } = e.detail;
      
      if (!participantes || participantes.length === 0) return;
      
      // ✅ El historial ya se registro en Apps Script via __aplicarDetalleMes_
      // Solo mostrar confirmacion y recargar datos
      const totalCambios = participantes.reduce((acc, p) => acc + (p.cambios?.length || 0), 0);
      if (totalCambios > 0) {
        mostrarMensajeTemporal('success', `${totalCambios} cambio(s) aplicados correctamente`, 3000);
      }
    };
    
    window.addEventListener('registrar-cambios-aprobados', handleRegistrarCambios);
    return () => window.removeEventListener('registrar-cambios-aprobados', handleRegistrarCambios);
  }, [mostrarMensajeTemporal]);

  useEffect(() => {
    const handleDesbloqueo = (e) => { if (e.detail.area === areaAsignada) { setRolHabilitado(true); actualizarEstadoArea(areaAsignada, false); } };
    window.addEventListener('area-desbloqueada', handleDesbloqueo);
    return () => window.removeEventListener('area-desbloqueada', handleDesbloqueo);
  }, [areaAsignada, actualizarEstadoArea]);

  useEffect(() => {
    let timer = null;
    const handleSolicitudAprobada = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => recargarDatos(), 1500);
    };
    window.addEventListener('solicitud-aprobada', handleSolicitudAprobada);
    return () => {
      window.removeEventListener('solicitud-aprobada', handleSolicitudAprobada);
      if (timer) clearTimeout(timer);
    };
  }, [recargarDatos]);

  const handleAbrirSolicitudCambio = useCallback(() => {
    setModalSolicitudAbierto(true);
  }, []);

  const toggleSeleccion = (empId) => { if (!puedeEditar) return; setSeleccionados(prev => { const n = new Set(prev); n.has(empId) ? n.delete(empId) : n.add(empId); return n; }); };
  const seleccionarTodos = () => { if (!puedeEditar) return; setSeleccionados(new Set(personalFiltrado.map(e => e.id))); };
  const limpiarSeleccion = () => setSeleccionados(new Set());

  const cambiarArea = useCallback(async (empActual, nuevaArea, recargar = true) => {
    if (!puedeEditar) return;
    
    if (!empActual) {
      console.warn('Empleado no encontrado');
      mostrarMensajeTemporal('error', 'Empleado no encontrado', 2000);
      return;
    }
    
    if (empActual.area === nuevaArea) {
      console.log('El area ya es:', nuevaArea);
      return;
    }
    
    console.log('Cambiando area:', { 
      empId: empActual.id, 
      nuevaArea, 
      areaActual: empActual.area,
      hojaActual: hojaActualRef.current 
    });
    
    setCambiosArea(prev => ({ ...prev, [empActual.id]: nuevaArea }));
    
    setTodoElPersonal(prev => 
      prev.map(p => p.id === empActual.id ? { ...p, area: nuevaArea } : p)
    );
    
    setPersonal(prev => {
      const existe = prev.some(p => p.id === empActual.id);
      
      if (existe) {
        const actualizado = prev.map(p => 
          p.id === empActual.id ? { ...p, area: nuevaArea } : p
        );
        return ordenarPersonalPorGrado(actualizado);
      } else {
        if (nuevaArea === areaAsignada || nuevaArea === 'SIN_SERVICIO') {
          const empleadoActualizado = { ...empActual, area: nuevaArea };
          return ordenarPersonalPorGrado([...prev, empleadoActualizado]);
        }
        return prev;
      }
    });
    
    if (config.appsScriptUrl) {
      try {
        await fetch(config.appsScriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: bodyAsciiJson({
            accion: 'guardarIndividual',
            hoja: hojaActualRef.current,
            fila: empActual.fila,
            colInicio: 'D',
            valores: [nuevaArea]
          })
        });
        
        console.log('Area guardada en Sheets:', nuevaArea);
        
        if (recargar) {
          await recargarDatos();
        }
        
        if (nuevaArea === areaAsignada) {
          mostrarMensajeTemporal('success', `${empActual.nombre} agregado a ${areaAsignada}`, 2500);
        } else if (nuevaArea === 'SIN_SERVICIO') {
          mostrarMensajeTemporal('success', `${empActual.nombre} movido a SIN_SERVICIO`, 2500);
        } else {
          mostrarMensajeTemporal('success', `${empActual.nombre} trasladado a: ${nuevaArea}`, 2500);
        }
      } catch (error) {
        console.error('Error guardando area:', error);
        mostrarMensajeTemporal('error', 'Error al guardar en Sheets. Cambio solo local.', 3000);
      }
    } else {
      console.warn('No se pudo guardar en Sheets: falta Apps Script URL');
    }
  }, [puedeEditar, config.appsScriptUrl, areaAsignada, mostrarMensajeTemporal, recargarDatos]);

  const agregarPersonalDirecto = useCallback(async (emp) => {
    if (agregandoRef.current) {
      console.log('Ya hay una operacion en curso');
      return;
    }
    
    if (!puedeAgregarPersonal) {
      mostrarMensajeTemporal('warning', 'No tienes permisos para agregar personal', 2000);
      return;
    }
    
    if (!emp) {
      mostrarMensajeTemporal('error', 'Personal no encontrado', 2000);
      return;
    }
    
    const areaActual = esJefe ? (areaSeleccionadaJefe || areaAsignada) : areaAsignada;
    
    if (emp.area === areaActual) {
      mostrarMensajeTemporal('warning', `${emp.nombre} ya esta en ${areaActual}`, 2000);
      setMostrarAgregarPersonal(false);
      return;
    }
    
    if (!window.confirm(`Agregar a ${emp.grado} ${emp.nombre} a ${areaActual}?`)) return;
    
    agregandoRef.current = true;
    
    try {
      await cambiarArea(emp, areaActual, true);
      
      setPersonalAAgregar('');
      setBusquedaPersonalAgregar('');
      setMostrarAgregarPersonal(false);
      
    } catch (error) {
      console.error('Error al agregar personal:', error);
      mostrarMensajeTemporal('error', 'Error al agregar personal', 3000);
    } finally {
      agregandoRef.current = false;
    }
  }, [puedeAgregarPersonal, esJefe, areaSeleccionadaJefe, areaAsignada, cambiarArea, mostrarMensajeTemporal]);

  const toggleDiaSemana = (di) => { if (!puedeEditar) return; setDiasSeleccionadosSemana(prev => prev.includes(di) ? prev.filter(d => d !== di) : [...prev, di]); };
  const seleccionarGrupo = (g) => { if (!puedeEditar) return; setDiasSeleccionadosSemana(g.dias); };
  
  const darDeBaja = () => { 
    if (!puedeEditar || seleccionados.size === 0) return; 
    if (!window.confirm(`Mover ${seleccionados.size} personal a SIN_SERVICIO?`)) return; 
    const empleados = personal.filter(p => seleccionados.has(p.id));
    empleados.forEach(emp => cambiarArea(emp, 'SIN_SERVICIO', true)); 
  };
  
  const moverSeleccionados = () => { 
    if (!puedeEditar || !areaDestino || seleccionados.size === 0) return; 
    if (!window.confirm(`Mover ${seleccionados.size} personal a "${areaDestino}"?`)) return; 
    const empleados = personal.filter(p => seleccionados.has(p.id));
    empleados.forEach(emp => cambiarArea(emp, areaDestino, true)); 
    setAreaDestino(''); 
  };
  
  const limpiarColumna = (dia) => { if (!puedeEditar) return; if (!window.confirm(`Borrar dia ${dia}?`)) return; setTurnos(prev => { const n = { ...prev }; personal.forEach(e => { if (!n[e.id]) n[e.id] = {}; n[e.id][dia] = ''; }); return n; }); mostrarMensajeTemporal('success', `Dia ${dia} limpiado (solo local)`, 1500); };
  
  const deshacerCambios = () => { if (!puedeEditar) return; if (!window.confirm('Restaurar estado original? Se perderan todos los cambios no guardados.')) return; setTurnos(JSON.parse(JSON.stringify(turnosBackup))); setHistorialDeshacer([]); mostrarMensajeTemporal('success', 'Restaurado al estado original'); };

  const agregarAlHistorialDeshacer = useCallback((c) => { setHistorialDeshacer(prev => { if (prev.length >= MAX_HISTORIAL_DESHACER) return [c, ...prev.slice(0, MAX_HISTORIAL_DESHACER - 1)]; return [c, ...prev]; }); }, []);
  
  const handleDeshacerUltimoCambio = useCallback(() => { if (historialDeshacer.length === 0) { mostrarMensajeTemporal('error', 'No hay cambios para deshacer', 2000); return; } const [u, ...r] = historialDeshacer; setHistorialDeshacer(r); setTurnos(prev => ({ ...prev, [u.empId]: { ...prev[u.empId], [u.dia]: u.turnoAnterior } })); mostrarMensajeTemporal('success', `Deshecho (Dia ${u.dia})`, 2500); }, [historialDeshacer, mostrarMensajeTemporal]);
  
  useEffect(() => { const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { const t = document.activeElement?.tagName?.toLowerCase(); if (t === 'input' || t === 'select' || t === 'textarea') return; e.preventDefault(); handleDeshacerUltimoCambio(); } }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [handleDeshacerUltimoCambio]);

  const guardarCeldaInmediato = useCallback((fila, dia, valor) => {
    if (!config.appsScriptUrl || !hojaSeleccionada) return;

    const columna = columnaLetra(4 + dia);
    const valorTexto = valor ? (TURNO_MAP[valor]?.nombre || valor) : '';

    fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({
        accion: 'guardarCelda',
        hoja: hojaSeleccionada,
        fila,
        columna,
        valor: valorTexto,
        responsable: responsable || 'ADMIN',
        area: areaAsignada,
        registrarHistorial: false
      })
    }).catch(err => console.warn('Error guardando celda:', err));

  }, [config.appsScriptUrl, hojaSeleccionada, areaAsignada, responsable]);

  // Persistir celda modificada en Google Sheets via Apps Script
  const persistirCeldaModificada = useCallback((fila, dia, valorAnterior, valorNuevo, tipo = 'directo') => {
    if (!config.appsScriptUrl || !hojaSeleccionada) return;
    fetch(config.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({
        accion: 'registrarCeldaModificada',
        hoja: hojaSeleccionada,
        fila, dia,
        valorAnterior: valorAnterior || '',
        valorNuevo: valorNuevo || '',
        responsable: responsable || 'ADMIN',
        tipo
      })
    }).catch(() => {});
  }, [config.appsScriptUrl, hojaSeleccionada, responsable]);

  // Leer celdas modificadas desde Google Sheets API (CORS OK, funciona cross-device)
  const cargarCeldasModificadasDeSheet = useCallback(async () => {
    if (!config.sheetId || !config.apiKey || !hojaSeleccionada) return new Map();
    try {
      const r = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/CELDA_MODIFICADA!A:H?key=${config.apiKey}`
      );
      if (!r.ok) return new Map();
      const d = await r.json();
      const rows = d.values || [];
      const mapa = new Map();
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (String(row[0] || '') !== hojaSeleccionada) continue;
        const fila = parseInt(row[1]);
        const dia = parseInt(row[2]);
        if (!fila || !dia) continue;
        mapa.set(`${fila}-${dia}`, {
          valorAnterior: String(row[3] || ''),
          valorNuevo: String(row[4] || ''),
          responsable: String(row[5] || ''),
          fecha: row[6] || '',
          tipo: String(row[7] || 'directo')
        });
      }
      return mapa;
    } catch { return new Map(); }
  }, [config.sheetId, config.apiKey, hojaSeleccionada]);

  // Limpiar celdas modificadas después de guardar (via Apps Script)
  const limpiarCeldasModificadasPersistidas = useCallback(() => {
    if (!config.appsScriptUrl || !hojaSeleccionada) return;
    fetch(config.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({ accion: 'limpiarCeldasModificadas', hoja: hojaSeleccionada })
    }).catch(() => {});
  }, [config.appsScriptUrl, hojaSeleccionada]);

  const guardarCeldaConRegistro = useCallback(async (fila, dia, valor) => {
    if (!config.appsScriptUrl || !hojaSeleccionada) throw new Error('Configuracion incompleta');
    
    const columna = columnaLetra(4 + dia);
    const valorTexto = valor ? (TURNO_MAP[valor]?.nombre || valor) : '';

    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({
        accion: 'guardarCelda',
        hoja: hojaSeleccionada,
        fila,
        columna,
        valor: valorTexto,
        responsable: responsable || 'ADMIN',
        area: areaAsignada,
        origen: 'modalCambioTurno',
        registrarHistorial: true
      })
    });
    
    return true;
  }, [config.appsScriptUrl, hojaSeleccionada, areaAsignada, responsable]);

  const guardarDescansoMedico = useCallback((descanso) => {
    if (!config.appsScriptUrl) return;
    
    fetch(config.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({ accion: 'registrarDescansoMedico', datos: descanso })
    }).catch(err => console.warn('Error guardando descanso:', err));
    
    const emp = personal.find(p => p.dni === descanso.personal_dni);
    if (!emp) return;
    
    const inicio = new Date(descanso.fecha_inicio + 'T00:00:00');
    const fin = new Date(descanso.fecha_fin + 'T00:00:00');
    const ultimoDia = fin > inicio ? new Date(fin) : new Date(inicio);
    if (fin > inicio) ultimoDia.setDate(ultimoDia.getDate() - 1);
    
    let d = new Date(inicio);
    while (d <= ultimoDia) {
      const dia = d.getDate(), mes = d.getMonth() + 1, anio = d.getFullYear();
      if (mes === mesSeleccionado && anio === anioSeleccionado) {
        setTurnos(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], [dia]: 'DM' } }));
        guardarCeldaInmediato(emp.fila, dia, 'DM');
      }
      d.setDate(d.getDate() + 1);
    }
  }, [config.appsScriptUrl, personal, mesSeleccionado, anioSeleccionado, guardarCeldaInmediato, setTurnos]);

  const guardarVacaciones = useCallback((vacaciones) => {
    if (!config.appsScriptUrl) return;
    
    fetch(config.appsScriptUrl, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: bodyAsciiJson({ accion: 'registrarVacaciones', datos: vacaciones })
    }).catch(err => console.warn('Error guardando vacaciones:', err));
    
    const emp = personal.find(p => p.dni === vacaciones.personal_dni);
    if (!emp) return;
    
    const codigo = vacaciones.codigo || vacaciones.tipo || 'V';
    const inicio = new Date(vacaciones.fecha_inicio + 'T00:00:00');
    const fin = new Date(vacaciones.fecha_fin + 'T00:00:00');
    const ultimoDia = fin > inicio ? new Date(fin) : new Date(inicio);
    if (fin > inicio) ultimoDia.setDate(ultimoDia.getDate() - 1);
    
    let d = new Date(inicio);
    while (d <= ultimoDia) {
      const dia = d.getDate(), mes = d.getMonth() + 1, anio = d.getFullYear();
      if (mes === mesSeleccionado && anio === anioSeleccionado) {
        setTurnos(prev => ({ ...prev, [emp.id]: { ...prev[emp.id], [dia]: codigo } }));
        guardarCeldaInmediato(emp.fila, dia, codigo);
      }
      d.setDate(d.getDate() + 1);
    }
  }, [config.appsScriptUrl, personal, mesSeleccionado, anioSeleccionado, guardarCeldaInmediato, setTurnos]);

  const aplicarPatronAsignacion = useCallback(() => { 
    if (!puedeEditar || seleccionados.size === 0 || diasAfectados.length === 0) { if (seleccionados.size === 0) mostrarMensajeTemporal('warning', 'Seleccione al menos un trabajador', 2000); if (diasAfectados.length === 0) mostrarMensajeTemporal('warning', 'Seleccione al menos un dia de la semana', 2000); return; }
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { if (!n[eid]) n[eid] = {}; diasAfectados.forEach(d => { n[eid][d] = turnoActivo; }); }); return n; });
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) diasAfectados.forEach(d => guardarCeldaInmediato(emp.fila, d, turnoActivo)); });
    mostrarMensajeTemporal('success', `${TURNO_MAP[turnoActivo]?.nombre || turnoActivo} aplicado a ${seleccionados.size} personal (${diasAfectados.length} dias)`, 3000); 
  }, [puedeEditar, seleccionados, diasAfectados, turnoActivo, personal, guardarCeldaInmediato, mostrarMensajeTemporal]);

  const aplicarPatronRotativo = useCallback((patron, dias, inicio = 0) => { 
    if (!puedeEditar || seleccionados.size === 0 || dias.length === 0) return; 
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { if (!n[eid]) n[eid] = {}; dias.forEach((d, idx) => { n[eid][d] = patron[(idx + inicio) % patron.length]; }); }); return n; });
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) dias.forEach((d, idx) => { const valor = patron[(idx + inicio) % patron.length]; guardarCeldaInmediato(emp.fila, d, valor); }); });
    mostrarMensajeTemporal('success', `Patron rotativo aplicado a ${seleccionados.size} personal`, 3000); 
  }, [puedeEditar, seleccionados, personal, guardarCeldaInmediato, mostrarMensajeTemporal]);

  const copiarFila = useCallback((desdeId) => { 
    if (!puedeEditar || seleccionados.size === 0) return; const o = turnos[desdeId] || {}; 
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { if (eid !== desdeId) n[eid] = { ...o }; }); return n; });
    seleccionados.forEach(eid => { if (eid !== desdeId) { const empDestino = personal.find(p => p.id === eid); if (empDestino) Object.entries(o).forEach(([dia, valor]) => { if (valor) guardarCeldaInmediato(empDestino.fila, parseInt(dia), valor); }); } });
    mostrarMensajeTemporal('success', `Fila copiada a ${seleccionados.size - 1} personal`, 3000); 
  }, [puedeEditar, seleccionados, turnos, personal, guardarCeldaInmediato, mostrarMensajeTemporal]);

  const limpiarTurnosSeleccionados = useCallback(() => { 
    if (!puedeEditar || seleccionados.size === 0) return; if (!window.confirm(`Borrar TODOS los turnos de ${seleccionados.size} personal?`)) return; 
    setTurnos(prev => { const n = { ...prev }; seleccionados.forEach(eid => { n[eid] = {}; }); return n; }); 
    seleccionados.forEach(eid => { const emp = personal.find(p => p.id === eid); if (emp) DIAS.forEach(d => { if (turnos[eid]?.[d]) guardarCeldaInmediato(emp.fila, d, ''); }); });
    mostrarMensajeTemporal('success', `Turnos borrados de ${seleccionados.size} personal`, 3000); 
  }, [puedeEditar, seleccionados, personal, turnos, DIAS, guardarCeldaInmediato, mostrarMensajeTemporal]);

  // Ref para comunicar cambios del updater a los side effects
  const pendingChangeRef = useRef(null);

  const handleCeldaClick = useCallback((empId, dia) => { 
    if (!puedeEditar) return;
    pendingChangeRef.current = null;
    setTurnos(prev => { 
      const turnoActual = prev[empId]?.[dia] || ''; 
      const turnoNuevo = turnoActual === turnoActivo ? '' : turnoActivo; 
      if (turnoActual === turnoNuevo) return prev;
      pendingChangeRef.current = { empId, dia, turnoAnterior: turnoActual, turnoNuevo };
      return { ...prev, [empId]: { ...prev[empId], [dia]: turnoNuevo } }; 
    }); 
    if (pendingChangeRef.current) {
      const { empId: eId, dia: d, turnoAnterior, turnoNuevo: tn } = pendingChangeRef.current;
      const emp = personal.find(p => p.id === eId);
      if (emp) guardarCeldaInmediato(emp.fila, d, tn);
      agregarAlHistorialDeshacer({ empId: eId, dia: d, turnoAnterior, turnoNuevo: tn, timestamp: Date.now() }); 
      setCeldasModificadas(prev => {
        const next = new Map(prev);
        next.set(`${eId}-${d}`, { turnoAnterior, turnoNuevo: tn, tipo: 'directo' });
        return next;
      });
      pendingChangeRef.current = null;
    }
  }, [puedeEditar, turnoActivo, personal, guardarCeldaInmediato, agregarAlHistorialDeshacer]);

  const handleKeyDownCelda = useCallback((e, empId, dia) => {
    if (!puedeEditar) return;
    const letra = e.key.toUpperCase(); const teclaTurno = TURNO_MAP[letra];
    if (teclaTurno) { e.preventDefault(); e.stopPropagation(); 
      pendingChangeRef.current = null;
      setTurnos(prev => { 
        const turnoActual = prev[empId]?.[dia] || ''; 
        const turnoNuevo = turnoActual === letra ? '' : letra; 
        if (turnoActual !== turnoNuevo) { 
          pendingChangeRef.current = { empId, dia, turnoAnterior: turnoActual, turnoNuevo };
          return { ...prev, [empId]: { ...prev[empId], [dia]: turnoNuevo } }; 
        } 
        return prev; 
      }); 
      if (pendingChangeRef.current) {
        const { empId: eId, dia: d, turnoAnterior, turnoNuevo: tn } = pendingChangeRef.current;
        const emp = personal.find(p => p.id === eId);
        if (emp) guardarCeldaInmediato(emp.fila, d, tn);
        agregarAlHistorialDeshacer({ empId: eId, dia: d, turnoAnterior, turnoNuevo: tn, timestamp: Date.now() }); 
        setCeldasModificadas(prev => {
          const next = new Map(prev);
          next.set(`${eId}-${d}`, { turnoAnterior, turnoNuevo: tn, tipo: 'directo' });
          return next;
        });
        pendingChangeRef.current = null;
      }
      const idx = DIAS.indexOf(dia); if (idx < DIAS.length - 1) setTimeout(() => { const nc = document.querySelector(`[data-celda="${empId}-${DIAS[idx+1]}"]`); if (nc) nc.focus(); }, 50); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); e.stopPropagation(); 
      pendingChangeRef.current = null;
      setTurnos(prev => { 
        const turnoActual = prev[empId]?.[dia] || ''; 
        if (turnoActual) { 
          pendingChangeRef.current = { empId, dia, turnoAnterior: turnoActual, turnoNuevo: '' };
          return { ...prev, [empId]: { ...prev[empId], [dia]: '' } }; 
        } 
        return prev; 
      }); 
      if (pendingChangeRef.current) {
        const { empId: eId, dia: d, turnoAnterior } = pendingChangeRef.current;
        const emp = personal.find(p => p.id === eId);
        if (emp) guardarCeldaInmediato(emp.fila, d, '');
        agregarAlHistorialDeshacer({ empId: eId, dia: d, turnoAnterior, turnoNuevo: '', timestamp: Date.now() }); 
        setCeldasModificadas(prev => {
          const next = new Map(prev);
          next.set(`${eId}-${d}`, { turnoAnterior, turnoNuevo: '', tipo: 'directo' });
          return next;
        });
        pendingChangeRef.current = null;
      }
      return; }
    if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key)) { e.preventDefault(); e.stopPropagation(); 
      const ie = personalFiltrado.findIndex(p => p.id === empId); const id = DIAS.indexOf(dia); let ne = empId, nd = dia; 
      switch(e.key) { case 'ArrowRight': if(id < DIAS.length-1) nd = DIAS[id+1]; break; case 'ArrowLeft': if(id > 0) nd = DIAS[id-1]; break; case 'ArrowDown': if(ie < personalFiltrado.length-1) ne = personalFiltrado[ie+1].id; break; case 'ArrowUp': if(ie > 0) ne = personalFiltrado[ie-1].id; break; } 
      setTimeout(() => { const nc = document.querySelector(`[data-celda="${ne}-${nd}"]`); if(nc) { nc.focus(); nc.style.boxShadow = '0 0 0 3px rgba(24,140,93,0.5)'; setTimeout(() => { nc.style.boxShadow = ''; }, 300); } }, 30); return; }
  }, [puedeEditar, DIAS, personalFiltrado, personal, agregarAlHistorialDeshacer, guardarCeldaInmediato]);

  const calcularComputo = useCallback((empId) => { let h = 0; DIAS.forEach(d => { const t = TURNO_MAP[turnos[empId]?.[d]||'']; if (t?.horas) h += t.horas; }); return h; }, [turnos, DIAS]);
  
  // Handler para admin/jefe: cambiar mes SOLO actualiza el estado (no recarga hoja)
  const handleMesChange = useCallback((e) => { 
    const nm = parseInt(e.target.value); 
    setMesSeleccionado(nm); 
    guardarSesion(nm, anioSeleccionado); 
  }, [anioSeleccionado]);
  
  const handleAnioChange = useCallback((e) => { 
    const na = parseInt(e.target.value); 
    setAnioSeleccionado(na); 
    guardarSesion(mesSeleccionado, na); 
  }, [mesSeleccionado]);

  // Handler para VistaUsuario: cambiar mes = cambiar hoja y recargar datos
  // IMPORTANTE: Debe limpiar TODO el estado anterior para evitar escribir datos de un mes en otro
  const handleMesChangeUsuario = useCallback((e) => {
    if (cargandoRef.current) return;
    const nm = parseInt(e.target.value);
    const nuevaHoja = MESES[nm - 1].toUpperCase();
    guardarHojaPreferida(areaAsignada, nuevaHoja);
    setHojaSeleccionada(nuevaHoja);
    setConfig(prev => (prev.sheetName === nuevaHoja ? prev : { ...prev, sheetName: nuevaHoja }));
    setMesSeleccionado(nm);
    guardarSesion(nm, anioSeleccionado);
    // Limpiar todo el estado anterior para que no queden datos del mes viejo
    setPersonal([]);
    setTodoElPersonal([]);
    setTurnos({});
    setTurnosBackup({});
    setCambiosArea({});
    setFrancosDescartados(false);
    setSeleccionados(new Set());
    setHistorialDeshacer([]);
    setBusqueda('');
    setMensaje(null);
    setErrorCarga(null);
    cargadoRef.current = false;
    cargandoRef.current = false;
  }, [anioSeleccionado, areaAsignada]);
  
  const handleAnioChangeUsuario = useCallback((e) => {
    if (cargandoRef.current) return;
    const na = parseInt(e.target.value);
    setAnioSeleccionado(na);
    guardarSesion(mesSeleccionado, na);
    // Limpiar todo para evitar datos stale durante la recarga (igual que handleMesChangeUsuario)
    setPersonal([]);
    setTodoElPersonal([]);
    setTurnos({});
    setTurnosBackup({});
    setCambiosArea({});
    setFrancosDescartados(false);
    setSeleccionados(new Set());
    setHistorialDeshacer([]);
    setBusqueda('');
    setMensaje(null);
    setErrorCarga(null);
    cargadoRef.current = false;
    cargandoRef.current = false;
  }, [mesSeleccionado]);
  
  const registrarCambioTurno = useCallback((empId, cambios) => { 
    setTurnos(prev => { 
      const n = { ...prev }; 
      if (!n[empId]) n[empId] = {}; 
      cambios.forEach(c => { 
        n[empId][c.dia] = c.turnoNuevoCodigo; 
      }); 
      return n; 
    }); 
    setCeldasModificadas(prev => {
      const next = new Map(prev);
      cambios.forEach(c => next.set(`${empId}-${c.dia}`, { 
        turnoAnterior: c.turnoAnterior || '', 
        turnoNuevo: c.turnoNuevoCodigo || '', 
        tipo: 'solicitud' 
      }));
      return next;
    });
    mostrarMensajeTemporal('success', `${cambios.length} cambio(s) registrado(s) en el panel`, 3000); 
  }, [mostrarMensajeTemporal]);

  const handleGuardar = async () => { 
    if (!config.appsScriptUrl) { mostrarMensajeTemporal('error', 'Configure Apps Script primero'); return; } 
    setGuardando(true); 
    try { 
      const filas = personal.map(emp => ({ fila: emp.fila, valores: DIAS.map(d => { const c = turnos[emp.id]?.[d]; return c ? (TURNO_MAP[c]?.nombre || '') : ''; }), area: cambiosArea[emp.id] && cambiosArea[emp.id] !== emp.areaOriginal ? cambiosArea[emp.id] : null })); 
      await fetch(config.appsScriptUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: bodyAsciiJson({ accion: 'guardarLote', hoja: hojaSeleccionada, colInicio: 'F', area: areaAsignada, responsable: responsable || 'ADMIN', filas }) }); 
      setTurnosBackup(JSON.parse(JSON.stringify(turnos))); guardarRespaldoLocal(); await marcarAreaComoFinalizada(); 
      setCeldasModificadas(new Map());
      celdasPersistidasRef.current = new Set();
      limpiarCeldasModificadasPersistidas(); // Limpiar en Google Sheets también
      if (!esAdmin) { setRolHabilitado(false); actualizarEstadoArea(areaAsignada, true); } 
      setRolGuardado(true);
      mostrarMensajeTemporal('success', 'Guardado exitoso. ' + (!esAdmin ? 'Rol bloqueado.' : ''), 6000); 
    } catch { guardarRespaldoLocal(); mostrarMensajeTemporal('error', 'Error al guardar. Se guardo respaldo local.', 5000); } 
    finally { setGuardando(false); } 
  };

  const handleVistaPrevia = () => setMostrarVistaPrevia(true);
  const handleConfirmarVistaPrevia = async () => { setMostrarVistaPrevia(false); await handleGuardar(); };
  const handleFinalizar = async () => { if (esAdmin) { await handleGuardar(); return; } if (!window.confirm('Finalizar y guardar el rol? Una vez guardado no podra editarlo.')) return; await handleGuardar(); };
  const handleHabilitar = () => { if (!esAdmin) { mostrarMensajeTemporal('error', 'Solo el administrador puede habilitar.'); return; } if (!window.confirm('Habilitar edicion?')) return; setRolHabilitado(true); actualizarEstadoArea(areaAsignada, false); desmarcarArea(); setRolGuardado(false); mostrarMensajeTemporal('success', 'Rol habilitado para edicion'); };
  const handleAbrirImpresion = () => setMostrarImpresion(true);
  const handleActualizarEstados = (ne) => { localStorage.setItem(`${STORAGE_ESTADOS}_${hojaSeleccionada}`, JSON.stringify(ne)); if (ne[areaAsignada] === true && !esAdmin) { setRolHabilitado(false); setRolGuardado(true); } else if ((ne[areaAsignada] === false || ne[areaAsignada] === undefined) && !esAdmin) { setRolHabilitado(true); setRolGuardado(false); } };
  const handleGuardarConfig = () => { setConfig(prev => ({ ...prev, sheetName: hojaSeleccionada })); setMostrarConfig(false); cargadoRef.current = false; recargarDatos(); mostrarMensajeTemporal('success', 'Configuracion aplicada', 4000); };

  const totalTurnos = Object.values(turnos).reduce((s, e) => s + Object.values(e).filter(t => t).length, 0);
  const completos = personal.filter(e => Object.values(turnos[e.id]||{}).filter(t => t).length >= totalDiasMes - 3).length;
  const totalHorasRol = useMemo(() => personal.reduce((s, e) => s + calcularComputo(e.id), 0), [personal, calcularComputo]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col print:bg-white">
      {toast && (
        <div className="fixed top-4 right-4 z-[300] animate-slideInRight max-w-sm">
          <div className={`rounded-xl shadow-2xl border-2 p-4 ${toast.tipo === 'success' ? 'bg-emerald-50 border-emerald-300' : toast.tipo === 'error' ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-300'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${toast.tipo === 'success' ? 'bg-emerald-500' : toast.tipo === 'error' ? 'bg-red-500' : 'bg-blue-500'}`}>
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-800">{toast.titulo}</p><p className="text-xs text-gray-600 mt-0.5">{toast.mensaje}</p></div>
              <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}
      {cargando && <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50"><div className="text-center"><Loader2 className="w-16 h-16 animate-spin mx-auto mb-4" style={{color:COLOR_PRIMARIO}} /><p className="text-lg font-semibold text-gray-700">Cargando datos del rol...</p><p className="text-sm text-gray-500 mt-2">{esAdmin ? areaSeleccionadaAdmin : areaAsignada} - {MESES[mesSeleccionado-1]} {anioSeleccionado}</p></div></div>}
      {errorCarga && !cargando && <div className="fixed inset-0 bg-white flex items-center justify-center z-50"><div className="text-center max-w-md p-8"><XCircle className="w-20 h-20 text-red-400 mx-auto mb-4" /><h3 className="text-xl font-bold text-gray-800 mb-2">Error al cargar datos</h3><p className="text-gray-600 mb-6">{errorCarga}</p><button onClick={recargarDatos} className="px-6 py-3 text-white rounded-xl font-bold" style={{backgroundColor:COLOR_PRIMARIO}}><RefreshCw className="w-5 h-5 inline mr-2"/>Reintentar</button></div></div>}

      <Encabezado 
        esAdmin={esAdmin} 
        areaAsignada={esAdmin ? areaSeleccionadaAdmin : (esJefe ? areaSeleccionadaJefe : areaAsignada)}
        responsable={responsable} 
        personalLength={personal.length} 
        rolHabilitado={rolHabilitado}
        onFinalizar={handleFinalizar} 
        onHabilitar={handleHabilitar} 
        onGuardar={handleGuardar} 
        onImprimir={handleAbrirImpresion} 
        onSalir={onSalir} 
        onPanelAdmin={esAdmin ? () => setMostrarPanelAdmin(true) : null} 
        onAbrirCambiosTurno={handleAbrirSolicitudCambio} 
        guardando={guardando}
        onAbrirAdminUsuarios={esAdmin ? onAbrirAdminUsuarios : null}
        // Cambiar Contraseña - Visible para todos
        onAbrirCambiarPassword={() => setMostrarCambiarPassword(true)}
        // Selector de área para jefes
        areaSeleccionadaJefe={areaSeleccionadaJefe}
        onAreaChangeJefe={esJefe ? handleAreaChangeJefe : null}
        areasDisponiblesJefe={areasDisponiblesSelector}
        // Selector de área para admin
        areaSeleccionadaAdmin={areaSeleccionadaAdmin}
        onAreaChangeAdmin={esAdmin ? handleAreaChangeAdmin : null}
        areasDisponiblesAdmin={['TODAS', ...todasLasAreas.filter(a => a !== 'TODAS' && a !== 'SIN_SERVICIO')]}
        hojaSeleccionada={hojaSeleccionada} 
        hojasDisponibles={hojasDisponibles} 
        onHojaChange={handleHojaChange}
        mesSeleccionado={mesSeleccionado} 
        onMesChange={esUsuario ? handleMesChangeUsuario : handleMesChange}
        anioSeleccionado={anioSeleccionado} 
        onAnioChange={esUsuario ? handleAnioChangeUsuario : handleAnioChange}
        onConfigClick={()=>setMostrarConfig(true)} 
        onRecargar={esAdmin || esJefe ? recargarDatos : null} 
        cargando={cargando} 
        onDeshacer={null}
        onHistorial={handleAbrirHistorial}
        busqueda={busqueda} 
        onBusquedaChange={setBusqueda} 
        turnoActivo={turnoActivo} 
        onSelectTurno={setTurnoActivo}
        diasSeleccionadosSemana={diasSeleccionadosSemana} 
        onToggleDia={toggleDiaSemana} 
        onSeleccionarGrupo={seleccionarGrupo}
        diasAfectados={diasAfectados} 
        totalDiasMes={totalDiasMes} 
        seleccionadosSize={seleccionados.size} 
        personalFiltradoLength={personalFiltrado.length}
        onSeleccionarTodos={puedeEditar ? seleccionarTodos : null} 
        onLimpiarSeleccion={puedeEditar ? limpiarSeleccion : null} 
        onLimpiarTurnos={puedeEditar ? limpiarTurnosSeleccionados : null}
        mostrarAgregar={mostrarAgregarPersonal} 
        onToggleAgregar={puedeAgregarPersonal ? () => setMostrarAgregarPersonal(!mostrarAgregarPersonal) : null}
        todasLasAreas={todasLasAreas} 
        personalDisponible={personalDisponible}
        busquedaPersonalAgregar={busquedaPersonalAgregar} 
        onBusquedaPersonalAgregarChange={setBusquedaPersonalAgregar}
        onAgregarPersonal={puedeAgregarPersonal ? agregarPersonalDirecto : null}
        totalTurnos={totalTurnos} 
        completos={completos} 
        totalHorasRol={totalHorasRol}
        onAplicarPatron={puedeEditar ? aplicarPatronAsignacion : null} 
        onCopiarFila={puedeEditar ? () => copiarFila([...seleccionados][0]) : null}
        onLimpiarSeleccionados={puedeEditar ? limpiarTurnosSeleccionados : null} 
        onAplicarPatronRotativo={puedeEditar ? aplicarPatronRotativo : null}
        onRegistrarDescanso={() => setModalDescansoAbierto(true)}
        onRegistrarVacaciones={puedeVacaciones ? () => setModalVacacionesAbierto(true) : null}
        // Nuevas props para roles
        esJefe={esJefe}
        esUsuario={esUsuario}
        user={user}
        // Permisos para el encabezado
        puedeEditar={puedeEditar}
        puedeImprimir={puedeImprimir}
        puedeBandeja={puedeBandeja}
        puedeSolicitarCambio={puedeSolicitarCambio}
        puedeDescansoMedico={puedeDescansoMedico}
        puedeVacaciones={puedeVacaciones}
        rolGuardado={rolGuardado}
        onVistaPrevia={null}
      />

      {mensaje && <div className={`px-4 py-3 text-center text-sm font-medium print:hidden flex items-center justify-center gap-2 ${mensaje.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200' : mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border-b border-red-200' : mensaje.tipo === 'warning' ? 'bg-amber-50 text-amber-700 border-b border-amber-200' : 'bg-blue-50 text-blue-700 border-b border-blue-200'}`}>{mensaje.tipo === 'success' && <CheckCircle2 className="w-4 h-4" />}{mensaje.tipo === 'error' && <XCircle className="w-4 h-4" />}{mensaje.tipo === 'warning' && <AlertTriangle className="w-4 h-4" />}{mensaje.tipo === 'info' && <Loader2 className="w-4 h-4 animate-spin" />}{mensaje.texto}</div>}
      {totalFrancosInvalidos > 0 && puedeEditar && !francosDescartados && (
        <div 
          className="px-4 py-3 text-center text-sm font-medium print:hidden bg-red-50 border-b-2 border-red-200 flex items-center justify-center gap-2 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setMostrarModalFrancos(true)}
          title="Click para ver detalles"
        >
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0"/>
          <span className="text-red-700">
            <strong>{totalFrancosInvalidos}</strong> trabajador(es) con <strong>3 o mas francos (F) consecutivos</strong> 
            ({totalInfraccionesFrancos} infracciones). 
            <span className="font-semibold"> Maximo permitido: 2 francos consecutivos. (No aplica a personal civil)</span>
            <span className="ml-2 text-xs text-red-500 underline">[Ver detalles]</span>
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); descartarFrancos(); }}
            className="ml-3 px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-200 transition-colors"
            title="Descartar aviso por esta sesion"
          >
            Ocultar
          </button>
        </div>
      )}
      {appsScriptError && <div className="px-4 py-2.5 text-center text-xs font-medium print:hidden bg-amber-50 border-b border-amber-300 flex items-center justify-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0"/><span className="text-amber-800"><strong>Apps Script:</strong> {appsScriptError}</span></div>}

      <div className="flex-1 overflow-auto print:overflow-visible">
        {personalFiltrado.length === 0 && !cargando ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4"/>
              <p className="text-base text-gray-400">
                {esUsuario ? 'No se encontró su información' : 'Sin personal en esta area'}
              </p>
              {!rolHabilitado && <p className="text-sm text-gray-400 mt-2">El rol esta bloqueado</p>}
            </div>
          </div>
        ) : esUsuario && personalFiltrado.length === 1 ? (
          <VistaUsuario
            personalFiltrado={personalFiltrado}
            turnos={turnos}
            DIAS={DIAS}
            mesSeleccionado={mesSeleccionado}
            anioSeleccionado={anioSeleccionado}
            areaAsignada={areaAsignada}
            responsable={responsable}
            user={user}
            onCeldaClick={handleCeldaClick}
            // ✅ USAR HANDLERS DE USUARIO (cambian hoja + recargan)
            onMesChange={handleMesChangeUsuario}
            onAnioChange={handleAnioChangeUsuario}
            cargando={cargando}
            rolHabilitado={rolHabilitado}
          />
        ) : (
          <TablaRol 
            personalFiltrado={personalFiltrado} 
            DIAS={DIAS} 
            turnos={turnos} 
            cambiosArea={cambiosArea} 
            rolHabilitado={rolHabilitado} 
            esAdmin={esAdmin} 
            seleccionados={seleccionados} 
            onToggleSeleccion={toggleSeleccion} 
            onSeleccionarTodos={puedeEditar ? seleccionarTodos : null} 
            onLimpiarSeleccion={puedeEditar ? limpiarSeleccion : null} 
            onCambiarArea={(empId, nuevaArea) => {
              const emp = personal.find(p => p.id === empId);
              if (emp && puedeEditar) cambiarArea(emp, nuevaArea, true);
            }} 
            onCeldaClick={puedeEditar ? handleCeldaClick : null} 
            onCeldaKeyDown={puedeEditar ? handleKeyDownCelda : null} 
            onLimpiarColumna={puedeEditar ? limpiarColumna : null} 
            calcularComputo={calcularComputo} 
            onCambioTurno={(emp)=>{if(puedeEditar){setTrabajadorSeleccionado(emp);setModalCambioAbierto(true);}}} 
            todasLasAreas={todasLasAreas} 
            mesSeleccionado={mesSeleccionado} 
            anioSeleccionado={anioSeleccionado} 
            areaAsignada={esAdmin ? areaSeleccionadaAdmin : areaAsignada}
            responsable={responsable} 
            francosInvalidos={francosInvalidos} 
            idsConFrancosInvalidos={idsConFrancosInvalidos}
            celdasModificadas={celdasModificadas}
            esUsuario={esUsuario}
            user={user}
            soloLectura={!puedeEditar}
          />
        )}
      </div>

      <ModalCambioTurno isOpen={modalCambioAbierto} onClose={() => setModalCambioAbierto(false)} trabajador={trabajadorSeleccionado} turnos={turnos} mes={mesSeleccionado} anio={anioSeleccionado} responsable={responsable} onRegistrarCambio={registrarCambioTurno} onGuardarCelda={guardarCeldaConRegistro} />
      <ModalDescansoMedico isOpen={modalDescansoAbierto} onClose={() => setModalDescansoAbierto(false)} personal={personal} medicos={medicos} config={config} onGuardarDescanso={guardarDescansoMedico} onSuccess={mostrarToast} />
      <ModalRegistroVacaciones isOpen={modalVacacionesAbierto} onClose={() => setModalVacacionesAbierto(false)} personal={personal} config={config} onGuardarVacaciones={guardarVacaciones} onSuccess={mostrarToast} />
      <ModalHistorial isOpen={modalHistorialAbierto} onClose={() => setModalHistorialAbierto(false)} historialCambios={historialCambios} />
      
      <ModalSolicitudCambioTurno
        isOpen={modalSolicitudAbierto}
        onClose={() => setModalSolicitudAbierto(false)}
        config={config}
        hoja={nombreMesActual}
        mes={mesSeleccionado}
        anio={anioSeleccionado}
        area={esAdmin ? areaSeleccionadaAdmin : areaAsignada}
        userName={user?.nombre || responsable || 'ADMIN'}
      />
      
      <ImpresionRol isOpen={mostrarImpresion} onClose={() => setMostrarImpresion(false)} area={esAdmin ? areaSeleccionadaAdmin : areaAsignada} mes={mesSeleccionado} anio={anioSeleccionado} personal={personalFiltrado} turnos={turnos} responsable={responsable} totalDiasMes={totalDiasMes} />
      <PanelControlAdmin isOpen={mostrarPanelAdmin} onClose={() => setMostrarPanelAdmin(false)} areas={todasLasAreas} config={config} onActualizar={handleActualizarEstados} hojaSeleccionada={hojaSeleccionada} hojasDisponibles={hojasDisponibles} areaAdmin={areaAsignada} />
      <ModalVistaPrevia isOpen={mostrarVistaPrevia} onClose={() => setMostrarVistaPrevia(false)} onConfirmar={handleConfirmarVistaPrevia} area={esAdmin ? areaSeleccionadaAdmin : areaAsignada} responsable={responsable} mes={mesSeleccionado} anio={anioSeleccionado} personal={personalFiltrado} turnos={turnos} cambiosArea={cambiosArea} DIAS={DIAS} totalTurnos={totalTurnos} totalHoras={totalHorasRol} francosInvalidos={francosInvalidos} totalFrancosInvalidos={totalFrancosInvalidos} />

      <style>{`@media print{@page{size:landscape;margin:10mm}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.print\\:hidden{display:none!important}}@keyframes slideInRight{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}.animate-slideInRight{animation:slideInRight 0.3s ease-out}`}</style>

      {mostrarConfig && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={()=>setMostrarConfig(false)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e=>e.stopPropagation()}><div className="px-6 py-4 text-white flex items-center justify-between" style={{backgroundColor:COLOR_PRIMARIO}}><h3 className="text-lg font-bold">Configuracion</h3><button onClick={()=>setMostrarConfig(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5"/></button></div><div className="p-6 space-y-4"><div><label className="block text-sm font-semibold text-gray-700 mb-1">Sheet ID</label><input value={config.sheetId} onChange={e=>setConfig(prev=>({...prev,sheetId:e.target.value}))} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm"/></div><div><label className="block text-sm font-semibold text-gray-700 mb-1">Hoja</label><input value={config.sheetName} onChange={e=>setConfig(prev=>({...prev,sheetName:e.target.value}))} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm"/></div><div><label className="block text-sm font-semibold text-gray-700 mb-1">API Key</label><input value={config.apiKey} onChange={e=>setConfig(prev=>({...prev,apiKey:e.target.value}))} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono"/></div><div><label className="block text-sm font-semibold text-gray-700 mb-1">Apps Script URL</label><input value={config.appsScriptUrl} onChange={e=>setConfig(prev=>({...prev,appsScriptUrl:e.target.value}))} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-mono"/></div></div><div className="px-6 py-4 bg-gray-50 border-t"><button onClick={handleGuardarConfig} className="w-full py-3 text-white rounded-xl text-sm font-bold" style={{backgroundColor:COLOR_PRIMARIO}}>Aplicar Cambios</button></div></div></div>}

      {/* Modal Cambiar Contraseña */}
      <ModalCambiarPassword
        isOpen={mostrarCambiarPassword}
        onClose={() => setMostrarCambiarPassword(false)}
        onCambiarPassword={handleCambiarPassword}
        usuarioNombre={responsable}
      />

      {/* Modal Francos Invalidos */}
      <ModalFrancosInvalidos
        isOpen={mostrarModalFrancos}
        onClose={() => setMostrarModalFrancos(false)}
        francosInvalidos={francosInvalidos}
        personal={personal}
        onIrAFila={irAFilaEmpleado}
      />
    </div>
  );
};

export default PanelTrabajo;