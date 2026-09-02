// src/pages/PanelOCR.jsx
// VERSION COMPLETA - FLUJO LOGIN → PANEL DE TRABAJO
// CON BACKEND FASTAPI Y MODO PRUEBA COMO FALLBACK
// SOPORTE COMPLETO PARA TODOS LOS ROLES (Admin, Jefe Área, Jefe Departamento, Jefe División, Usuario)

import React, { useState, useEffect, useRef } from 'react';
import Login from '../components/ocr/auth/Login';
import PanelTrabajo from '../components/ocr/PanelTrabajo';
import MobileRolView from '../components/ocr/MobileRolView';
import ModalDescansoMedico from '../components/ocr/ModalDescansoMedico';
import ModalRegistroVacaciones from '../components/ocr/ModalRegistroVacaciones';
import ParteDiario from '../components/ocr/ParteDiario';
import ModalSolicitudCambioTurno from '../components/ocr/ModalSolicitudCambioTurno';
import PanelAdminUsuariosOCR from '../components/ocr/admin/PanelAdminUsuariosOCR';
import { DEFAULT_GOOGLE_CONFIG, MESES, hojaDelMesActual, mesActual as mesActualFn, anioActual as anioActualFn } from '../components/ocr/constantes';
import { apiClient } from '../components/ocr/services/apiClient';
import { authService } from '../components/ocr/services/authService';
import { rolesService } from '../components/ocr/services/rolesService';
import { descansosService } from '../components/ocr/services/descansosService';
import { vacacionesService } from '../components/ocr/services/vacacionesService';

const STORAGE_SESION = 'ocr_sesion_activa';

// Detectar si el backend está disponible
const BACKEND_DISPONIBLE = !!import.meta.env.VITE_API_URL;

function columnaLetra(numero) {
  let letra = '';
  let n = numero;
  while (n >= 0) {
    letra = String.fromCharCode(65 + (n % 26)) + letra;
    n = Math.floor(n / 26) - 1;
  }
  return letra;
}

// ============================================================
// MODO PRUEBA - USUARIOS DE PRUEBA POR ROL (solo si backend no disponible)
// ============================================================
const MODO_PRUEBA = !BACKEND_DISPONIBLE;

const USUARIOS_PRUEBA = {
  admin: {
    id: 'USR001',
    nombre: 'Administrador del Sistema',
    usuario: 'admin',
    rol: 'admin',
    roles: [4],
    areas: ['ADMIN'],
    area: 'ADMIN',
    requiereCambio: false
  },
  jefe_area: {
    id: 'USR002',
    nombre: 'Jefe de Medicina',
    usuario: 'jefe_medicina',
    rol: 'jefe_area',
    roles: [1],
    areas: ['Medicina', 'Cirugía'],
    area: 'Medicina',
    requiereCambio: false
  },
  jefe_departamento: {
    id: 'USR003',
    nombre: 'Jefe de Departamento Médico',
    usuario: 'jefe_departamento',
    rol: 'jefe_departamento',
    roles: [2],
    areas: ['Departamento Médico', 'Departamento de Cirugía'],
    area: 'Departamento Médico',
    requiereCambio: false
  },
  jefe_division: {
    id: 'USR004',
    nombre: 'Jefe de División Médica',
    usuario: 'jefe_division',
    rol: 'jefe_division',
    roles: [3],
    areas: ['División Médica', 'División Quirúrgica'],
    area: 'División Médica',
    requiereCambio: false
  },
  usuario: {
    id: 'USR005',
    nombre: 'Juan Pérez García',
    usuario: 'jperez',
    rol: 'usuario',
    roles: [0],
    areas: ['Medicina'],
    area: 'Medicina',
    requiereCambio: false
  },
  usuario2: {
    id: 'USR006',
    nombre: 'María Rodríguez López',
    usuario: 'mrodriguez',
    rol: 'usuario',
    roles: [0],
    areas: ['Emergencia'],
    area: 'Emergencia',
    requiereCambio: false
  }
};

// Lista de roles disponibles para el selector de prueba
const ROLES_PRUEBA = [
  { value: 'admin', label: 'Administrador', desc: 'Acceso total' },
  { value: 'jefe_area', label: 'Jefe de Área', desc: 'Gestiona su área' },
  { value: 'jefe_departamento', label: 'Jefe de Departamento', desc: 'Gestiona su departamento' },
  { value: 'jefe_division', label: 'Jefe de División', desc: 'Gestiona su división' },
  { value: 'usuario', label: 'Usuario Base', desc: 'Solo consulta' },
  { value: 'usuario2', label: 'Usuario Base 2', desc: 'Solo consulta' }
];
// ============================================================

// ============================================================
// LEER SESIÓN GUARDADA (sincrónico - para inicializar estado)
// ============================================================
const getStoredSession = () => {
  try {
    const token = localStorage.getItem('ocr_auth_token');
    const userData = localStorage.getItem('ocr_user_data');
    const session = sessionStorage.getItem(STORAGE_SESION);
    if (!token || !userData) return null;
    const user = JSON.parse(userData);
    if (!user || !user.nombre) return null;
    // Asegurar que el campo 'rol' exista
    if (!user.rol && user.roles) {
      const rolMap = { 0: 'usuario', 1: 'jefe_area', 2: 'jefe_departamento', 3: 'jefe_division', 4: 'admin' };
      user.rol = rolMap[Math.max(...user.roles)] || 'usuario';
      user.rol_principal = Math.max(...user.roles);
    }
    const sessionData = session ? JSON.parse(session) : null;
    return { user, sessionData };
  } catch {
    return null;
  }
};

const PanelOCRContent = () => {
  // ============================================================
  // ESTADO DE AUTENTICACIÓN - Inicializado desde localStorage
  // ============================================================
  const initialSession = getStoredSession();
  const [user, setUser] = useState(initialSession?.user || null);
  const [isAuthenticated, setIsAuthenticated] = useState(!!initialSession);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(initialSession?.user?.rol === 'admin');
  const [isJefe, setIsJefe] = useState(['jefe_area', 'jefe_departamento', 'jefe_division'].includes(initialSession?.user?.rol));
  const [isUsuario, setIsUsuario] = useState(initialSession?.user?.rol === 'usuario');
  // ============================================================

  const [pantalla, setPantalla] = useState('panel');
  const [areaSeleccionada, setAreaSeleccionada] = useState(
    initialSession?.sessionData?.area || initialSession?.user?.areas?.[0] || initialSession?.user?.area || null
  );
  const [responsable, setResponsable] = useState(initialSession?.user?.nombre || '');
  const [esAdmin, setEsAdmin] = useState(initialSession?.user?.rol === 'admin');
  const [areas, setAreas] = useState([]);
  const [responsables, setResponsables] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [todoElPersonal, setTodoElPersonal] = useState([]);
  const [hojasDisponibles, setHojasDisponibles] = useState([]);
  const [mostrarDescansoMedico, setMostrarDescansoMedico] = useState(false);
  const [mostrarVacaciones, setMostrarVacaciones] = useState(false);
  const [mostrarParteDiario, setMostrarParteDiario] = useState(false);
  const [medicosSistema, setMedicosSistema] = useState([]);
  const guardandoDescanso = useRef(false);
  const guardandoVacaciones = useRef(false);
  const [mostrarCambiosTurno, setMostrarCambiosTurno] = useState(false);
  
  // ============================================================
  // IMPORTANTE: INICIAR EN false - Solo se abre con el botón
  // ============================================================
  const [mostrarAdminUsuarios, setMostrarAdminUsuarios] = useState(false);
  // ============================================================

  // ============================================================
  // MODO PRUEBA - Selector de rol (solo visible en modo prueba)
  // ============================================================
  const [modoPruebaSelector, setModoPruebaSelector] = useState(!BACKEND_DISPONIBLE);
  const [rolSeleccionado, setRolSeleccionado] = useState(initialSession?.user?.rol || 'admin');
  // ============================================================

  const config = DEFAULT_GOOGLE_CONFIG;
  const hojaActiva = hojaDelMesActual();
  const mesActivo = mesActualFn();
  const anioActivo = anioActualFn();

  const [isMobile, setIsMobile] = useState(false);

  // Mostrar modo al iniciar
  useEffect(() => {
    if (BACKEND_DISPONIBLE) {
      console.log('🚀 [OCR] Modo: BACKEND FASTAPI');
      console.log('🔗 [OCR] API URL:', import.meta.env.VITE_API_URL);
    } else {
      console.log('⚠️ [OCR] Modo: PRUEBA (sin backend)');
      console.log('💡 [OCR] Configura VITE_API_URL en .env para usar el backend real');
    }
  }, []);

  // ============================================================
  // VERIFICAR SESIÓN CON BACKEND (solo en background, no bloquea)
  // ============================================================
  useEffect(() => {
    const verificarToken = async () => {
      const storedToken = localStorage.getItem('ocr_auth_token');
      if (!storedToken || storedToken === 'modo_prueba_token') return;

      try {
        const result = await apiClient.get('/users/me', {}, { _skipAuthRedirect: true });
        if (result && result.roles) {
          const rolMap = { 0: 'usuario', 1: 'jefe_area', 2: 'jefe_departamento', 3: 'jefe_division', 4: 'admin' };
          const maxRol = Math.max(...result.roles);
          const freshUser = {
            ...result,
            rol: rolMap[maxRol] || 'usuario',
            rol_principal: maxRol,
            area: result.areas?.[0] || result.area || '',
            requiereCambio: result.requiere_cambio_password || false,
          };
          localStorage.setItem('ocr_user_data', JSON.stringify(freshUser));
          setUser(freshUser);
          setIsAdmin(maxRol === 4);
          setIsJefe([1, 2, 3].includes(maxRol));
          setIsUsuario(maxRol === 0);
          setRolSeleccionado(freshUser.rol);
        }
      } catch (e) {
        console.warn('Backend no disponible, usando datos locales:', e.message);
      }
    };

    verificarToken();
  }, []);

  // ============================================================
  // FUNCIÓN: Login (backend real o modo prueba)
  // ============================================================
  const handleLogin = async (usuario, password) => {
    setLoading(true);

    try {
      // Intentar login con el backend real
      if (BACKEND_DISPONIBLE) {
        const result = await authService.login(usuario, password);
        
        if (result.success) {
          const userData = result.usuario || result.user;
          
          // Mapear rol principal a string para compatibilidad
          const rolMap = {
            0: 'usuario',
            1: 'jefe_area',
            2: 'jefe_departamento',
            3: 'jefe_division',
            4: 'admin'
          };
          
          const rolString = rolMap[userData.rol_principal] || 'usuario';
          
          const normalizedUser = {
            ...userData,
            rol: rolString,
            area: userData.areas?.[0] || '',
            requiereCambio: false
          };
          
          setUser(normalizedUser);
          setIsAuthenticated(true);
          setIsAdmin(userData.rol_principal === 4);
          setIsJefe([1, 2, 3].includes(userData.rol_principal));
          setIsUsuario(userData.rol_principal === 0);
          setResponsable(userData.nombre);
          setEsAdmin(userData.rol_principal === 4);
          
          if (userData.areas && userData.areas.length > 0) {
            setAreaSeleccionada(userData.areas[0]);
          }
          
          setRolSeleccionado(rolString);
          
          // GUARDAR en localStorage para persistir recarga
          localStorage.setItem('ocr_auth_token', result.token);
          localStorage.setItem('ocr_user_data', JSON.stringify(normalizedUser));
          
          setLoading(false);
          return true;
        } else {
          // Login fallido en backend real
          setLoading(false);
          return false;
        }
      }
      
      // Modo prueba: cualquier credencial funciona
      const usuarioEncontrado = Object.values(USUARIOS_PRUEBA).find(
        u => u.usuario === usuario.trim()
      );

      await new Promise(resolve => setTimeout(resolve, 800));
      
      let userData;
      
      if (usuarioEncontrado) {
        userData = { ...usuarioEncontrado };
      } else {
        userData = { ...USUARIOS_PRUEBA.admin };
      }

      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.rol === 'admin');
      setIsJefe(['jefe_area', 'jefe_departamento', 'jefe_division'].includes(userData.rol));
      setIsUsuario(userData.rol === 'usuario');
      setResponsable(userData.nombre);
      setEsAdmin(userData.rol === 'admin');
      
      if (userData.areas && userData.areas.length > 0) {
        setAreaSeleccionada(userData.areas[0]);
      } else if (userData.area) {
        setAreaSeleccionada(userData.area);
      }
      
      setRolSeleccionado(userData.rol);
      
      // GUARDAR en localStorage para persistir recarga (modo prueba)
      localStorage.setItem('ocr_auth_token', 'modo_prueba_token');
      localStorage.setItem('ocr_user_data', JSON.stringify(userData));
      
      setLoading(false);
      return true;
    } catch (error) {
      console.error('Error en login:', error);
      setLoading(false);
      return false;
    }
  };
  // ============================================================

  // ============================================================
  // FUNCIÓN: Cambiar rol en modo prueba
  // ============================================================
  const cambiarRolPrueba = (rolKey) => {
    const userData = USUARIOS_PRUEBA[rolKey];
    if (!userData) return;

    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.rol === 'admin');
    setIsJefe(['jefe_area', 'jefe_departamento', 'jefe_division'].includes(userData.rol));
    setIsUsuario(userData.rol === 'usuario');
    setResponsable(userData.nombre);
    setEsAdmin(userData.rol === 'admin');
    
    if (userData.areas && userData.areas.length > 0) {
      setAreaSeleccionada(userData.areas[0]);
    } else if (userData.area) {
      setAreaSeleccionada(userData.area);
    }
    
    setRolSeleccionado(rolKey);
    setMostrarAdminUsuarios(false);
    
    // Actualizar localStorage para persistir en recarga
    localStorage.setItem('ocr_user_data', JSON.stringify(userData));
  };
  // ============================================================

  const handleLogout = async () => {
    // Cerrar sesión en el backend si está disponible
    if (BACKEND_DISPONIBLE) {
      try {
        await authService.logout();
      } catch (error) {
        console.error('Error al cerrar sesión en backend:', error);
      }
    }
    
    // SIEMPRE limpiar localStorage y sessionStorage
    localStorage.removeItem('ocr_auth_token');
    localStorage.removeItem('ocr_user_data');
    sessionStorage.removeItem(STORAGE_SESION);
    
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsJefe(false);
    setIsUsuario(false);
    setAreaSeleccionada(null);
    setResponsable('');
    setEsAdmin(false);
    setPantalla('seleccion');
    setMostrarAdminUsuarios(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent || '';
      const mobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(ua);
      const smallScreen = window.innerWidth < 768;
      setIsMobile(mobile || smallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (pantalla === 'panel' && areaSeleccionada) {
      sessionStorage.setItem(STORAGE_SESION, JSON.stringify({
        area: areaSeleccionada,
        responsable,
        esAdmin,
        timestamp: Date.now()
      }));
    }
  }, [pantalla, areaSeleccionada, responsable, esAdmin]);

  useEffect(() => {
    const cargar = async () => {
      if (!config.sheetId || !config.apiKey) return;
      setCargando(true);
      try {
        const [sheetsRes, personalRes] = await Promise.all([
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}?key=${config.apiKey}&fields=sheets.properties.title`),
          fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${hojaActiva}!A:E?key=${config.apiKey}`)
        ]);

        const sheetsData = await sheetsRes.json();
        setHojasDisponibles(sheetsData.sheets?.map(s => s.properties.title) || []);

        const data = await personalRes.json();
        const rows = data.values || [];

        setTodoElPersonal(rows.slice(1).map((r, i) => ({
          id: i + 1, fila: i + 2,
          dni: (r[0] || '').trim(), grado: (r[1] || '').trim(),
          nombre: (r[2] || '').trim(), area: (r[3] || '').trim()
        })));

        const medicos = rows.slice(1)
          .filter(r => r[4] === 'TRUE' || r[4] === true)
          .map((r, i) => ({
            id: 'med-' + i,
            medico_dni: (r[0] || '').trim(),
            medico_nombre: (r[2] || '').trim(),
            nombre: (r[2] || '').trim(),
            grado: (r[1] || '').trim(),
            especialidad: 'Medicina General',
            area: (r[3] || '').trim()
          }));

        setMedicosSistema(medicos);

        setAreas([...new Set(rows.slice(1).map(r => r[3]).filter(Boolean))].sort());
        setResponsables(rows.slice(1).filter(r => r[2]).map(r => ({
          nombre: r[2].trim(), area: r[3]?.trim() || '', grado: r[1]?.trim() || ''
        })));
      } catch (e) {
        console.error('Error cargando datos:', e);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const handleIngresar = (area, nombreResponsable, admin) => {
    setAreaSeleccionada(area);
    setResponsable(nombreResponsable);
    setEsAdmin(admin);
    setPantalla('panel');
    sessionStorage.setItem(STORAGE_SESION, JSON.stringify({
      area,
      responsable: nombreResponsable,
      esAdmin: admin,
      timestamp: Date.now()
    }));
  };

  const handleSalir = () => {
    handleLogout();
  };

  const handleGuardarDescanso = async (descanso) => {
    if (guardandoDescanso.current) return { success: false, error: 'Ya hay un registro en proceso' };
    guardandoDescanso.current = true;

    try {
      // Usar backend real si está disponible
      if (BACKEND_DISPONIBLE) {
        const result = await descansosService.registrarDescanso({
          usuario_id: descanso.personal_id || user?.id,
          fecha_inicio: descanso.fecha_inicio,
          fecha_fin: descanso.fecha_fin,
          codigo_cie10: descanso.codigo_cie10 || 'J06.9',
          diagnostico: descanso.diagnostico || 'Descanso médico',
          medico_tratante: descanso.medico_tratante || 'Médico tratante',
          registro: descanso.registro || 'N/A'
        });
        return result;
      }

      // Modo legacy: usar Google Sheets directamente
      const inicio = new Date(descanso.fecha_inicio + 'T00:00:00');
      const fin = new Date(descanso.fecha_fin + 'T00:00:00');
      const ultimoDia = fin > inicio ? new Date(fin) : new Date(inicio);
      if (fin > inicio) ultimoDia.setDate(ultimoDia.getDate() - 1);

      const diasPorMes = {};
      let d = new Date(inicio);
      while (d <= ultimoDia) {
        const key = `${d.getMonth()+1}-${d.getFullYear()}`;
        if (!diasPorMes[key]) diasPorMes[key] = { mes: d.getMonth()+1, anio: d.getFullYear(), dias: [] };
        diasPorMes[key].dias.push(d.getDate());
        d.setDate(d.getDate() + 1);
      }

      let total = 0;
      const hojasAfectadas = [];

      for (const grupo of Object.values(diasPorMes)) {
        const hoja = hojasDisponibles.find(h => h.toUpperCase().includes(MESES[grupo.mes - 1].toUpperCase()));
        if (!hoja) continue;

        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(hoja)}!A:A?key=${config.apiKey}`);
        const data = await res.json();
        const rows = data.values || [];

        let fila = null;
        for (let i = 1; i < rows.length; i++) {
          if ((rows[i][0] || '').trim() === descanso.personal_dni) { fila = i + 1; break; }
        }
        if (!fila) continue;

        const dias = grupo.dias.sort((a, b) => a - b);
        const colInicio = columnaLetra(5 + dias[0] - 1);
        const valores = dias.map(() => 'DESCANSO MEDICO');

        await fetch(config.appsScriptUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ accion: 'guardarIndividual', hoja, fila, colInicio, valores })
        });

        total += dias.length;
        hojasAfectadas.push(hoja);
      }

      if (total > 0) {
        await fetch(config.appsScriptUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            accion: 'registrarDescansoMedico',
            datos: { ...descanso, hojas_afectadas: hojasAfectadas.join(', '), total_dias_marcados: total, fecha_registro: new Date().toISOString() }
          })
        });
      }

      return { success: true, totalDiasMarcados: total, mensaje: `Descanso medico registrado. ${total} dia(s) en ${hojasAfectadas.join(', ')}.` };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setTimeout(() => { guardandoDescanso.current = false; }, 3000);
    }
  };

  const handleGuardarVacaciones = async (vacaciones) => {
    if (guardandoVacaciones.current) return;
    guardandoVacaciones.current = true;

    try {
      // Usar backend real si está disponible
      if (BACKEND_DISPONIBLE) {
        const result = await vacacionesService.registrarVacacion({
          usuario_id: vacaciones.personal_id || user?.id,
          fecha_inicio: vacaciones.fecha_inicio,
          fecha_fin: vacaciones.fecha_fin,
          tipo: vacaciones.tipo || 'V'
        });
        guardandoVacaciones.current = false;
        return result;
      }

      // Modo legacy: usar Google Sheets directamente
      const inicio = new Date(vacaciones.fecha_inicio + 'T00:00:00');
      const fin = new Date(vacaciones.fecha_fin + 'T00:00:00');
      const ultimoDia = fin > inicio ? new Date(fin) : new Date(inicio);
      if (fin > inicio) ultimoDia.setDate(ultimoDia.getDate() - 1);

      const diasPorMes = {};
      let d = new Date(inicio);
      while (d <= ultimoDia) {
        const key = `${d.getMonth()+1}-${d.getFullYear()}`;
        if (!diasPorMes[key]) diasPorMes[key] = { mes: d.getMonth()+1, anio: d.getFullYear(), dias: [] };
        diasPorMes[key].dias.push(d.getDate());
        d.setDate(d.getDate() + 1);
      }

      for (const grupo of Object.values(diasPorMes)) {
        const hoja = hojasDisponibles.find(h => h.toUpperCase().includes(MESES[grupo.mes - 1].toUpperCase()));
        if (!hoja) continue;

        const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(hoja)}!A:A?key=${config.apiKey}`);
        const data = await res.json();
        const rows = data.values || [];

        let fila = null;
        for (let i = 1; i < rows.length; i++) {
          if ((rows[i][0] || '').trim() === vacaciones.personal_dni) { fila = i + 1; break; }
        }
        if (!fila) continue;

        const dias = grupo.dias.sort((a, b) => a - b);
        const colInicio = columnaLetra(5 + dias[0] - 1);
        const valores = dias.map(() => 'VACACIONES');

        await fetch(config.appsScriptUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ accion: 'guardarIndividual', hoja, fila, colInicio, valores })
        });
      }

      await fetch(config.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          accion: 'registrarVacaciones',
          datos: { ...vacaciones, fecha_registro: new Date().toISOString() }
        })
      });

    } catch (error) {
      console.error('Error al guardar vacaciones:', error);
    } finally {
      setTimeout(() => { guardandoVacaciones.current = false; }, 3000);
    }
  };

  // ============================================================
  // RENDER: Login o Panel según estado de autenticación
  // ============================================================
  
  // Si está cargando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="inline-block w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-500 font-medium">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Si NO está autenticado, mostrar Login
  if (!isAuthenticated) {
    return <Login onSuccess={handleLogin} loading={loading} />;
  }

  // ============================================================
  // RENDER: Panel de Trabajo (Autenticado)
  // ============================================================
  return (
    <>
      {/* ============================================================
          SELECTOR DE ROL - MODO PRUEBA
          ============================================================ */}
      {MODO_PRUEBA && (
        <div className="fixed top-16 right-4 z-[200] bg-white rounded-xl shadow-xl border border-gray-200 p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">MODO PRUEBA</span>
            <span className="text-[10px] text-gray-400">Cambiar rol</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ROLES_PRUEBA.map(rol => {
              const activo = rolSeleccionado === rol.value;
              const userData = USUARIOS_PRUEBA[rol.value];
              return (
                <button
                  key={rol.value}
                  onClick={() => cambiarRolPrueba(rol.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    activo
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={rol.desc}
                >
                  {rol.label}
                </button>
              );
            })}
          </div>
          <div className="mt-1.5 text-[9px] text-gray-400 truncate">
            Usuario: {user?.usuario} | Rol: {user?.rol} | Áreas: {user?.areas?.join(', ') || user?.area || 'Ninguna'}
          </div>
        </div>
      )}

      {/* ============================================================
          PANEL PRINCIPAL
          ============================================================ */}
      {isMobile ? (
        <MobileRolView
          areaAsignada={areaSeleccionada}
          responsable={responsable}
          esAdmin={esAdmin}
          onSalir={handleSalir}
          onAbrirCambiosTurno={() => setMostrarCambiosTurno(true)}
          todasLasAreas={areas.filter(a => a !== 'TODAS')}
          onAbrirAdminUsuarios={isAdmin ? () => setMostrarAdminUsuarios(true) : null}
          esJefe={isJefe}
          esUsuario={isUsuario}
          user={user}
        />
      ) : (
        <PanelTrabajo
          areaAsignada={areaSeleccionada}
          responsable={responsable}
          esAdmin={esAdmin}
          onSalir={handleSalir}
          todasLasAreas={areas.filter(a => a !== 'TODAS')}
          medicos={medicosSistema}
          onAbrirCambiosTurno={() => setMostrarCambiosTurno(true)}
          onAbrirAdminUsuarios={isAdmin ? () => setMostrarAdminUsuarios(true) : null}
          esJefe={isJefe}
          esUsuario={isUsuario}
          user={user}
        />
      )}

      <ModalDescansoMedico
        isOpen={mostrarDescansoMedico}
        onClose={() => setMostrarDescansoMedico(false)}
        personal={todoElPersonal}
        medicos={medicosSistema}
        config={config}
        onGuardarDescanso={handleGuardarDescanso}
      />

      <ModalRegistroVacaciones
        isOpen={mostrarVacaciones}
        onClose={() => setMostrarVacaciones(false)}
        personal={todoElPersonal}
        config={config}
        onGuardarVacaciones={handleGuardarVacaciones}
      />

      <ParteDiario
        isOpen={mostrarParteDiario}
        onClose={() => setMostrarParteDiario(false)}
        areaAsignada={areaSeleccionada}
        todasLasAreas={areas.filter(a => a !== 'TODAS')}
      />

      <ModalSolicitudCambioTurno
        isOpen={mostrarCambiosTurno}
        onClose={() => setMostrarCambiosTurno(false)}
        config={config}
        hoja={hojaActiva}
        mes={mesActivo}
        anio={anioActivo}
        area={areaSeleccionada || 'SIN AREA'}
        userName={user?.nombre || 'ADMIN'}
      />

      {isAdmin && (
        <PanelAdminUsuariosOCR
          isOpen={mostrarAdminUsuarios}
          onClose={() => setMostrarAdminUsuarios(false)}
        />
      )}
    </>
  );
};

// ============================================================
// Componente principal
// ============================================================
const PanelOCR = () => {
  return <PanelOCRContent />;
};

export default PanelOCR;