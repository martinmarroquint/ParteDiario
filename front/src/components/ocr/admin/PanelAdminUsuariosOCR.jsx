// src/components/ocr/admin/PanelAdminUsuariosOCR.jsx
// PANEL DE ADMINISTRACIÓN DE USUARIOS - VERSIÓN REAL
// Conecta con hoja PERSONAL y USUARIOS_OCR
// DISEÑO PROFESIONAL - MODAL FLOTANTE

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, Search, Loader2, UserPlus, RefreshCw, 
  Shield, User, CheckCircle2, XCircle, Edit, 
  Key, ChevronLeft, ChevronRight,
  AlertTriangle, Users, Building2, PlusCircle,
  Save, UserCog, Eye, EyeOff, GraduationCap, MapPin
} from 'lucide-react';
import { DEFAULT_GOOGLE_CONFIG, API_CONFIG, hojaDelMesActual } from '../constantes';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const HOJA_PERSONAL = hojaDelMesActual();
const HOJA_USUARIOS = 'USUARIOS_OCR';

const ROLES_DISPONIBLES = [
  { value: 'admin', label: 'Administrador', nivel: 4, color: 'bg-amber-100 text-amber-700' },
  { value: 'jefe_division', label: 'Jefe de División', nivel: 3, color: 'bg-purple-100 text-purple-700' },
  { value: 'jefe_departamento', label: 'Jefe de Departamento', nivel: 2, color: 'bg-blue-100 text-blue-700' },
  { value: 'jefe_area', label: 'Jefe de Área', nivel: 1, color: 'bg-emerald-100 text-emerald-700' },
  { value: 'usuario', label: 'Usuario Base', nivel: 0, color: 'bg-gray-100 text-gray-600' }
];
// ============================================================

const PanelAdminUsuariosOCR = ({ isOpen, onClose }) => {
  // ============================================================
  // ESTADO
  // ============================================================
  const [personal, setPersonal] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroArea, setFiltroArea] = useState('');
  const [pagina, setPagina] = useState(1);
  const [itemsPorPagina] = useState(15);
  const [mensaje, setMensaje] = useState(null);
  const [mensajeError, setMensajeError] = useState(null);
  const [passwordResetResult, setPasswordResetResult] = useState(null);
  
  // Modal para crear/editar usuario
  const [modalUsuario, setModalUsuario] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    usuario: '',
    password: '',
    rol: 'usuario',
    area: '',
    areas: [],  // Areas que gestiona (para jefe_area/depto/division)
    activo: true
  });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [erroresForm, setErroresForm] = useState({});
  const [busquedaArea, setBusquedaArea] = useState('');

  const config = DEFAULT_GOOGLE_CONFIG;
  // ============================================================

  // ============================================================
  // CARGAR DATOS
  // ============================================================
  const cargarDatos = useCallback(async () => {
    if (!config.sheetId || !config.apiKey) {
      setError('Configuración de Google Sheets no disponible');
      return;
    }

    setCargando(true);
    setError('');
    setMensaje(null);

    try {
      const [personalRes, usuariosRes] = await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${HOJA_PERSONAL}!A:E?key=${config.apiKey}`),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${HOJA_USUARIOS}!A:N?key=${config.apiKey}`)
      ]);

      let personalList = [];
      let usuariosList = [];

      if (personalRes.ok) {
        const personalData = await personalRes.json();
        const personalRows = personalData.values || [];
        personalList = personalRows.slice(1).map((row, index) => ({
          id: `p-${index + 1}`,
          fila: index + 2,
          dni: (row[0] || '').trim(),
          grado: (row[1] || '').trim(),
          nombre: (row[2] || '').trim(),
          area: (row[3] || '').trim(),
          esMedico: row[4] === 'TRUE' || row[4] === true
        }));
      }

      if (usuariosRes.ok) {
        const usuariosData = await usuariosRes.json();
        const usuariosRows = usuariosData.values || [];
        usuariosList = usuariosRows.slice(1).map((row) => ({
          id: (row[0] || '').trim(),
          nombre: (row[1] || '').trim(),
          email: (row[2] || '').trim(),
          usuario: (row[3] || '').trim(),
          password_hash: (row[4] || '').trim(),
          salt: (row[5] || '').trim(),
          rol: (row[6] || 'usuario').trim(),
          area: (row[7] || '').trim(),
          fecha_creacion: (row[8] || '').trim(),
          ultimo_acceso: (row[9] || '').trim(),
          intentos_fallidos: parseInt(row[10]) || 0,
          bloqueado_hasta: (row[11] || '').trim(),
          activo: (row[12] || 'TRUE').toUpperCase() === 'TRUE',
          requiere_cambio: (row[13] || 'FALSE').toUpperCase() === 'TRUE'
        }));
      }

      setPersonal(personalList);
      setUsuarios(usuariosList);

    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setCargando(false);
    }
  }, [config]);

  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen, cargarDatos]);

  // ============================================================
  // COMBINAR DATOS (JOIN personal + usuarios)
  // ============================================================
  const personalConUsuario = useMemo(() => {
    return personal.map(emp => {
      const usuario = usuarios.find(u => u.nombre === emp.nombre);
      return {
        ...emp,
        usuario: usuario || null,
        tieneUsuario: !!usuario
      };
    });
  }, [personal, usuarios]);

  const itemsFiltrados = useMemo(() => {
    let resultado = personalConUsuario;

    if (busqueda.trim()) {
      const term = busqueda.toLowerCase().trim();
      resultado = resultado.filter(item =>
        item.nombre?.toLowerCase().includes(term) ||
        item.dni?.includes(term) ||
        item.grado?.toLowerCase().includes(term) ||
        item.area?.toLowerCase().includes(term) ||
        item.usuario?.usuario?.toLowerCase().includes(term)
      );
    }

    if (filtroRol) {
      resultado = resultado.filter(item =>
        item.usuario?.rol === filtroRol
      );
    }

    if (filtroArea) {
      resultado = resultado.filter(item =>
        item.area === filtroArea
      );
    }

    return resultado;
  }, [personalConUsuario, busqueda, filtroRol, filtroArea]);

  const itemsPaginados = useMemo(() => {
    const inicio = (pagina - 1) * itemsPorPagina;
    return itemsFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [itemsFiltrados, pagina, itemsPorPagina]);

  const estadisticas = useMemo(() => {
    const total = personal.length;
    const conUsuario = personal.filter(p => usuarios.some(u => u.nombre === p.nombre)).length;
    const sinUsuario = total - conUsuario;
    
    const porRol = {};
    ROLES_DISPONIBLES.forEach(r => {
      porRol[r.value] = usuarios.filter(u => u.rol === r.value).length;
    });
    
    const activos = usuarios.filter(u => u.activo).length;
    const inactivos = usuarios.filter(u => !u.activo).length;
    
    return { total, conUsuario, sinUsuario, porRol, activos, inactivos };
  }, [personal, usuarios]);

  const areasDisponibles = useMemo(() => {
    return [...new Set(personal.map(p => p.area).filter(Boolean))].sort();
  }, [personal]);

  // ============================================================
  // FUNCIONES DE GESTIÓN DE USUARIOS
  // ============================================================
  
  const generarUsuario = (nombre) => {
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0].toLowerCase() + partes[1].toLowerCase()).replace(/[^a-z]/g, '');
    }
    return nombre.toLowerCase().replace(/[^a-z]/g, '');
  };

  const generarPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 10; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const abrirCrearUsuario = (empleado) => {
    const usuarioBase = generarUsuario(empleado.nombre);
    setFormData({
      nombre: empleado.nombre,
      usuario: usuarioBase,
      password: generarPassword(),
      rol: 'usuario',
      area: empleado.area,
      areas: [empleado.area],  // Default: solo su area
      activo: true
    });
    setModalUsuario({ empleado, accion: 'crear' });
    setMostrarPassword(false);
    setErroresForm({});
    setBusquedaArea('');
  };

  const abrirEditarUsuario = (empleado) => {
    const user = empleado.usuario;
    // Parsear areas del JSON guardado
    let areasArr = [empleado.area];
    try {
      if (user.area && user.area.startsWith('[')) {
        areasArr = JSON.parse(user.area);
      } else if (user.area) {
        areasArr = [user.area];
      }
    } catch { areasArr = [empleado.area]; }
    
    setFormData({
      nombre: empleado.nombre,
      usuario: user.usuario,
      password: '',
      rol: user.rol,
      area: empleado.area,
      areas: areasArr,
      activo: user.activo
    });
    setModalUsuario({ empleado, accion: 'editar' });
    setMostrarPassword(false);
    setErroresForm({});
  };

  const validarForm = () => {
    const errors = {};
    if (!formData.usuario || formData.usuario.length < 3) {
      errors.usuario = 'El usuario debe tener al menos 3 caracteres';
    }
    if (modalUsuario.accion === 'crear' && (!formData.password || formData.password.length < 6)) {
      errors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!formData.rol) {
      errors.rol = 'Seleccione un rol';
    }
    // Validar areas para jefe_area/depto/division
    if (['jefe_area', 'jefe_departamento', 'jefe_division'].includes(formData.rol)) {
      if (!formData.areas || formData.areas.length === 0) {
        errors.areas = 'Selecciona al menos un area que gestione';
      }
    }
    setErroresForm(errors);
    return Object.keys(errors).length === 0;
  };

  const guardarUsuario = async () => {
    if (!validarForm()) return;

    setGuardando(true);
    setMensajeError(null);

    try {
      // Mapear rol string a numerico para el backend
      const ROL_MAP = { admin: 4, jefe_division: 3, jefe_departamento: 2, jefe_area: 1, usuario: 0 };
      const rolNumerico = ROL_MAP[formData.rol] || 0;
      const token = localStorage.getItem('ocr_auth_token') || '';
      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

      if (modalUsuario.accion === 'crear') {
        const payload = {
          nombre: formData.nombre,
          usuario: formData.usuario,
          password: formData.password,
          correo: '',
          grado: '',
          dni: formData.usuario,
          roles: [rolNumerico],
          areas: formData.areas || [],
        };

        const res = await fetch(`${API_CONFIG.baseUrl}/users`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al crear usuario');
      } else {
        const userId = parseInt(modalUsuario.empleado.usuario.id);
        const payload = {
          nombre: formData.nombre,
          correo: '',
          roles: [rolNumerico],
          areas: formData.areas || [],
          activo: formData.activo,
        };

        const res = await fetch(`${API_CONFIG.baseUrl}/users/${userId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Error al actualizar usuario');
      }

      setMensaje({
        tipo: 'success',
        texto: `Usuario ${modalUsuario.accion === 'crear' ? 'creado' : 'actualizado'} exitosamente`
      });

      setTimeout(() => setMensaje(null), 4000);
      
      setModalUsuario(null);
      cargarDatos();

    } catch (err) {
      setMensajeError(err.message || 'Error al guardar usuario');
    } finally {
      setGuardando(false);
    }
  };

  const resetearPassword = async (empleado) => {
    const userId = parseInt(empleado.usuario.id);
    if (!userId) {
      setMensajeError('No se pudo identificar el usuario');
      return;
    }

    if (!window.confirm(`¿Resetear contraseña para ${empleado.nombre}?\n\nSe generará una contraseña temporal que deberá comunicar al usuario.`)) {
      return;
    }

    setGuardando(true);

    try {
      const result = await fetch(`${API_CONFIG.baseUrl}/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ocr_auth_token') || ''}`
        }
      });

      const data = await result.json();

      if (!result.ok) {
        throw new Error(data.detail || 'Error al resetear contraseña');
      }

      // Mostrar contraseña en modal dedicado
      setPasswordResetResult({
        nombre: empleado.nombre,
        usuario: empleado.usuario.usuario,
        tempPassword: data.temp_password
      });
      setModalUsuario(null);

      cargarDatos();

    } catch (err) {
      setMensajeError(err.message || 'Error al resetear contraseña');
    } finally {
      setGuardando(false);
    }
  };

  const toggleActivo = async (empleado) => {
    const nuevoEstado = !empleado.usuario.activo;
    const userId = parseInt(empleado.usuario.id);
    
    if (!window.confirm(`¿${nuevoEstado ? 'Activar' : 'Desactivar'} usuario ${empleado.nombre}?`)) {
      return;
    }

    setGuardando(true);

    try {
      await fetch(`${API_CONFIG.baseUrl}/users/${userId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ocr_auth_token') || ''}`
        }
      });

      setMensaje({
        tipo: 'success',
        texto: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`
      });

      setTimeout(() => setMensaje(null), 4000);
      cargarDatos();

    } catch (err) {
      setMensajeError(err.message || 'Error al cambiar estado');
    } finally {
      setGuardando(false);
    }
  };

  const getRolLabel = (rol) => {
    const found = ROLES_DISPONIBLES.find(r => r.value === rol);
    return found?.label || rol;
  };

  const getRolColor = (rol) => {
    const found = ROLES_DISPONIBLES.find(r => r.value === rol);
    return found?.color || 'bg-gray-100 text-gray-600';
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  if (!isOpen) return null;

  return (
    <>
      {/* PANEL PRINCIPAL */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[400] p-2 sm:p-4"
        onClick={onClose}
      >
        <div 
          className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* ENCABEZADO */}
          <div 
            className="px-4 py-3 sm:px-6 sm:py-4 text-white flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: '#188C5D' }}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" />
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  Administración de Usuarios - OCR
                </h3>
                <p className="text-[10px] sm:text-xs text-white/70">
                  Gestionar usuarios y roles del sistema
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  Total: <span className="font-bold text-gray-900">{estadisticas.total}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-gray-700">
                  Con usuario: <span className="font-bold text-emerald-600">{estadisticas.conUsuario}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700">
                  Sin usuario: <span className="font-bold text-amber-600">{estadisticas.sinUsuario}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {ROLES_DISPONIBLES.map(rol => (
                  estadisticas.porRol[rol.value] > 0 && (
                    <span key={rol.value} className={`px-2 py-0.5 rounded-full ${rol.color}`}>
                      {rol.label}: {estadisticas.porRol[rol.value]}
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>

          {/* BARRA DE HERRAMIENTAS */}
          <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, DNI, grado o área..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                />
              </div>

              <div className="min-w-[140px]">
                <select
                  value={filtroRol}
                  onChange={e => setFiltroRol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                >
                  <option value="">Todos los roles</option>
                  {ROLES_DISPONIBLES.map(rol => (
                    <option key={rol.value} value={rol.value}>
                      {rol.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-[160px]">
                <select
                  value={filtroArea}
                  onChange={e => setFiltroArea(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                >
                  <option value="">Todas las áreas</option>
                  {areasDisponibles.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={cargarDatos}
                disabled={cargando}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* MENSAJES */}
          {mensaje && (
            <div className="px-4 sm:px-6 py-2 flex-shrink-0 bg-emerald-50 border-b border-emerald-200">
              <p className="text-sm font-medium text-emerald-700">{mensaje.texto}</p>
            </div>
          )}

          {mensajeError && (
            <div className="px-4 sm:px-6 py-2 flex-shrink-0 bg-red-50 border-b border-red-200">
              <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {mensajeError}
              </p>
            </div>
          )}

          {error && (
            <div className="px-4 sm:px-6 py-2 flex-shrink-0 bg-red-50 border-b border-red-200">
              <p className="text-sm font-medium text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            </div>
          )}

          {/* TABLA */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {cargando ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: '#188C5D' }} />
                  <p className="text-sm text-gray-500">Cargando datos...</p>
                </div>
              </div>
            ) : itemsPaginados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Users className="w-16 h-16 text-gray-200 mb-3" />
                <p className="text-sm font-medium text-gray-400">Sin resultados</p>
                <p className="text-xs text-gray-400 mt-1">
                  {busqueda || filtroRol || filtroArea ? 'No hay resultados con los filtros aplicados' : 'No hay personal registrado'}
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">DNI</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Grado</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Área</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemsPaginados.map((item, index) => {
                        const numero = (pagina - 1) * itemsPorPagina + index + 1;
                        const tieneUsuario = item.tieneUsuario;
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-400">{numero}</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.dni || '-'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-gray-500" />
                                </div>
                                <span className="text-sm font-medium text-gray-800">{item.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{item.grado || '-'}</td>
                            <td className="px-4 py-3">
                              {tieneUsuario && ['jefe_area', 'jefe_departamento', 'jefe_division'].includes(item.usuario.rol) ? (
                                <div className="flex flex-wrap gap-1">
                                  {(() => {
                                    try {
                                      const areasArr = item.usuario.area?.startsWith('[') ? JSON.parse(item.usuario.area) : [item.usuario.area];
                                      return areasArr.filter(Boolean).map(a => (
                                        <span key={a} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-medium">{a}</span>
                                      ));
                                    } catch { return <span className="text-sm text-gray-500">{item.area || '-'}</span>; }
                                  })()}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">{item.area || '-'}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {tieneUsuario ? (
                                <span className="text-sm font-mono text-emerald-600">{item.usuario.usuario}</span>
                              ) : (
                                <span className="text-sm text-gray-400">Sin usuario</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {tieneUsuario ? (
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${getRolColor(item.usuario.rol)}`}>
                                  {getRolLabel(item.usuario.rol)}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {tieneUsuario ? (
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                  item.usuario.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {item.usuario.activo ? 'Activo' : 'Inactivo'}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {tieneUsuario ? (
                                  <>
                                    <button
                                      onClick={() => abrirEditarUsuario(item)}
                                      className="p-1.5 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                      title="Editar usuario"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => resetearPassword(item)}
                                      className="p-1.5 text-amber-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition-colors"
                                      title="Resetear contraseña"
                                    >
                                      <Key className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => toggleActivo(item)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        item.usuario.activo 
                                          ? 'text-red-400 hover:text-red-600 hover:bg-red-50' 
                                          : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'
                                      }`}
                                      title={item.usuario.activo ? 'Desactivar usuario' : 'Activar usuario'}
                                    >
                                      {item.usuario.activo ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => abrirCrearUsuario(item)}
                                    className="px-3 py-1.5 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-medium hover:bg-emerald-100 transition-colors flex items-center gap-1"
                                  >
                                    <PlusCircle className="w-3 h-3" />
                                    Crear Usuario
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* PAGINACIÓN */}
          {itemsFiltrados.length > itemsPorPagina && (
            <div className="px-4 sm:px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-gray-400">
                Mostrando {((pagina - 1) * itemsPorPagina) + 1} - {Math.min(pagina * itemsPorPagina, itemsFiltrados.length)} de {itemsFiltrados.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPagina(p => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-gray-600 px-3">
                  {pagina} / {Math.ceil(itemsFiltrados.length / itemsPorPagina)}
                </span>
                <button
                  onClick={() => setPagina(p => Math.min(Math.ceil(itemsFiltrados.length / itemsPorPagina), p + 1))}
                  disabled={pagina === Math.ceil(itemsFiltrados.length / itemsPorPagina)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          MODAL CREAR/EDITAR USUARIO - FLOTANTE
          ============================================================ */}
      {modalUsuario && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-2 sm:p-4"
          onClick={() => setModalUsuario(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col animate-scaleIn"
            onClick={e => e.stopPropagation()}
          >
            {/* Encabezado del Modal */}
            <div 
              className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0"
              style={{ backgroundColor: '#188C5D' }}
            >
              <div className="flex items-center gap-3">
                <UserCog className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm sm:text-base">
                    {modalUsuario.accion === 'crear' ? 'Crear Usuario' : 'Editar Usuario'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/70 truncate max-w-[200px]">
                    {formData.nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalUsuario(null)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo del Modal */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Información del empleado */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{formData.nombre}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{formData.area}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Usuario */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Usuario <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.usuario}
                    onChange={e => setFormData({ ...formData, usuario: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    className={`w-full pl-9 pr-3 py-2.5 border ${erroresForm.usuario ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono`}
                    placeholder="ej: jperez"
                  />
                </div>
                {erroresForm.usuario && (
                  <p className="text-xs text-red-500 mt-1">{erroresForm.usuario}</p>
                )}
              </div>

              {/* Contraseña - solo para creación */}
              {modalUsuario.accion === 'crear' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Contraseña <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type={mostrarPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className={`w-full pl-9 pr-24 py-2.5 border ${erroresForm.password ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono`}
                      placeholder="Mínimo 6 caracteres"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, password: generarPassword() })}
                        className="px-2 py-1 text-[10px] font-medium text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                      >
                        Generar
                      </button>
                      <button
                        type="button"
                        onClick={() => setMostrarPassword(!mostrarPassword)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {erroresForm.password && (
                    <p className="text-xs text-red-500 mt-1">{erroresForm.password}</p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                </div>
              )}

              {/* Rol */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Rol <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <select
                    value={formData.rol}
                    onChange={e => {
                      const nuevoRol = e.target.value;
                      // Si cambia a usuario, mantener solo su area
                      if (nuevoRol === 'usuario') {
                        setFormData({ ...formData, rol: nuevoRol, areas: [formData.area] });
                      } else {
                        setFormData({ ...formData, rol: nuevoRol });
                      }
                    }}
                    className={`w-full pl-9 pr-3 py-2.5 border ${erroresForm.rol ? 'border-red-300' : 'border-gray-200'} rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white appearance-none`}
                  >
                    {ROLES_DISPONIBLES.map(rol => (
                      <option key={rol.value} value={rol.value}>
                        {rol.label} {rol.nivel > 0 ? `(Nivel ${rol.nivel})` : ''}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-[-90deg]" />
                </div>
                {erroresForm.rol && (
                  <p className="text-xs text-red-500 mt-1">{erroresForm.rol}</p>
                )}
              </div>

              {/* Selector de Areas que gestiona (solo para jefe_area/depto/division) */}
              {['jefe_area', 'jefe_departamento', 'jefe_division'].includes(formData.rol) && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Areas que gestiona <span className="text-red-400">*</span>
                    <span className="text-gray-400 normal-case ml-1 font-normal">(Selecciona una o mas areas)</span>
                  </label>
                  {/* Buscador de areas */}
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={busquedaArea}
                      onChange={e => setBusquedaArea(e.target.value)}
                      placeholder="Buscar area..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-gray-50"
                    />
                    {busquedaArea && (
                      <button
                        onClick={() => setBusquedaArea('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {/* Botones seleccionar/deseleccionar */}
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        const filtradas = busquedaArea
                          ? areasDisponibles.filter(a => a.toLowerCase().includes(busquedaArea.toLowerCase()))
                          : areasDisponibles;
                        const nuevas = [...new Set([...formData.areas, ...filtradas])];
                        setFormData({ ...formData, areas: nuevas });
                      }}
                      className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                    >
                      Seleccionar{busquedaArea ? ' filtradas' : ' todas'}
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (busquedaArea) {
                          const filtradas = areasDisponibles.filter(a => a.toLowerCase().includes(busquedaArea.toLowerCase()));
                          setFormData({ ...formData, areas: formData.areas.filter(a => !filtradas.includes(a)) });
                        } else {
                          setFormData({ ...formData, areas: [] });
                        }
                      }}
                      className="text-xs text-red-500 hover:text-red-600 font-medium"
                    >
                      Quitar{busquedaArea ? ' filtradas' : ' todas'}
                    </button>
                  </div>
                  {/* Lista de areas con filtro */}
                  <div className="border border-gray-200 rounded-xl p-3 bg-white max-h-48 overflow-y-auto">
                    {areasDisponibles.filter(a => !busquedaArea || a.toLowerCase().includes(busquedaArea.toLowerCase())).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-3">No se encontraron areas</p>
                    ) : (
                      areasDisponibles
                        .filter(a => !busquedaArea || a.toLowerCase().includes(busquedaArea.toLowerCase()))
                        .map(area => (
                          <label key={area} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={formData.areas.includes(area)}
                              onChange={e => {
                                let nuevasAreas;
                                if (e.target.checked) {
                                  nuevasAreas = [...formData.areas, area];
                                } else {
                                  nuevasAreas = formData.areas.filter(a => a !== area);
                                }
                                setFormData({ ...formData, areas: nuevasAreas });
                              }}
                              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <span className="text-sm text-gray-700 truncate">{area}</span>
                          </label>
                        ))
                    )}
                  </div>
                  {formData.areas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {formData.areas.map(area => (
                        <span key={area} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium flex items-center gap-1">
                          {area}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, areas: formData.areas.filter(a => a !== area) })}
                            className="text-emerald-500 hover:text-emerald-700"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {erroresForm.areas && (
                    <p className="text-xs text-red-500 mt-1">{erroresForm.areas}</p>
                  )}
                </div>
              )}

              {/* Activo */}
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={e => setFormData({ ...formData, activo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 transition-colors peer-focus:ring-2 peer-focus:ring-emerald-300">
                    <div className={`w-5 h-5 bg-white rounded-full transition-all absolute top-0.5 ${formData.activo ? 'left-6' : 'left-0.5'} shadow`} />
                  </div>
                </label>
                <span className="text-sm font-medium text-gray-700">
                  {formData.activo ? 'Usuario activo' : 'Usuario inactivo'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">
                  {formData.activo ? 'Puede iniciar sesión' : 'No puede iniciar sesión'}
                </span>
              </div>

              {/* Mensaje de error general */}
              {mensajeError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{mensajeError}</span>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalUsuario(null)}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardarUsuario}
                disabled={guardando}
                className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2"
                style={{ backgroundColor: '#188C5D' }}
              >
                {guardando ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="w-4 h-4" /> {modalUsuario.accion === 'crear' ? 'Crear Usuario' : 'Guardar Cambios'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CONTRASEÑA GENERADA
          ============================================================ */}
      {passwordResetResult && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-4" onClick={() => setPasswordResetResult(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                <Key className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Contraseña Restablecida</h3>
              <p className="text-sm text-gray-500 mb-4">
                Se generó una nueva contraseña temporal para <strong>{passwordResetResult.nombre}</strong>
              </p>
              <div className="bg-gray-50 border-2 border-dashed border-emerald-300 rounded-xl p-4 mb-2">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Usuario</p>
                <p className="text-sm font-mono text-gray-700">{passwordResetResult.usuario}</p>
              </div>
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-4">
                <p className="text-xs text-emerald-500 uppercase font-semibold mb-1">Nueva Contraseña</p>
                <p className="text-xl font-mono font-bold text-emerald-700 tracking-wider select-all">{passwordResetResult.tempPassword}</p>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
                Comunica esta contraseña al usuario. Deberá cambiarla al iniciar sesión.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(passwordResetResult.tempPassword);
                    setMensaje({ tipo: 'success', texto: 'Contraseña copiada al portapapeles' });
                    setTimeout(() => setMensaje(null), 3000);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                  Copiar
                </button>
                <button
                  onClick={() => setPasswordResetResult(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ANIMACIÓN PARA EL MODAL
          ============================================================ */}
      <style>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

export default PanelAdminUsuariosOCR;