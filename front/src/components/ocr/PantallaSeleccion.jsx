// src/components/ocr/PantallaSeleccion.jsx
// VERSION FINAL - CON VACACIONES + DESCANSO MEDICO + CONSULTA TURNOS + PARTE DIARIO
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, Loader2, AlertTriangle, User,
  Shield, MapPin, X, Calendar, Clock, ChevronRight,
  LogIn, Eye, Key, CheckCircle2, FileText, Umbrella, ArrowRightLeft
} from 'lucide-react';
import { 
  COLOR_PRIMARIO, CLAVE_SECRETA, TURNO_MAP, MESES, 
  NOMBRE_A_CODIGO, DEFAULT_GOOGLE_CONFIG, mesDeHoja, resolverHojaActiva, soloHojasMes 
} from './constantes';

const PantallaSeleccion = ({ onIngresar, areas, responsables, cargando, onRegistrarDescanso, onRegistrarVacaciones, onAbrirParteDiario, onAbrirCambiosTurno }) => {
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [responsable, setResponsable] = useState('');
  const [error, setError] = useState('');
  
  const [busquedaResponsable, setBusquedaResponsable] = useState('');
  const [mostrarDropdownResponsable, setMostrarDropdownResponsable] = useState(false);
  const dropdownResponsableRef = useRef(null);
  
  const [busquedaArea, setBusquedaArea] = useState('');
  const [mostrarDropdownArea, setMostrarDropdownArea] = useState(false);
  const dropdownAreaRef = useRef(null);
  
  const [mostrarModalClave, setMostrarModalClave] = useState(false);
  const [claveAdmin, setClaveAdmin] = useState('');
  const [claveError, setClaveError] = useState('');
  const [claveMostrada, setClaveMostrada] = useState(false);
  const claveRef = useRef(null);

  const [mostrarConsulta, setMostrarConsulta] = useState(false);
  const [busquedaConsulta, setBusquedaConsulta] = useState('');
  const [personaConsulta, setPersonaConsulta] = useState(null);
  const [turnosConsulta, setTurnosConsulta] = useState({});
  const [personalConsulta, setPersonalConsulta] = useState([]);
  const [cargandoConsulta, setCargandoConsulta] = useState(false);
  const [errorConsulta, setErrorConsulta] = useState('');

  const [mesConsulta, setMesConsulta] = useState(() => new Date().getMonth() + 1);
  const [hojasConsulta, setHojasConsulta] = useState([]);
  const [hojaConsultaSeleccionada, setHojaConsultaSeleccionada] = useState('');
  const anioConsulta = new Date().getFullYear();
  const totalDiasMesConsulta = useMemo(() => new Date(anioConsulta, mesConsulta, 0).getDate(), [mesConsulta, anioConsulta]);
  const DIAS_CONSULTA = useMemo(() => Array.from({ length: totalDiasMesConsulta }, (_, i) => i + 1), [totalDiasMesConsulta]);

  const limpiarStorage = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ocr_')) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('ocr_')) sessionStorage.removeItem(key);
    });
  };

  useEffect(() => {
    try {
      const config = localStorage.getItem('ocr_google_config');
      if (config) {
        const parsed = JSON.parse(config);
        if (!parsed.sheetId || !parsed.apiKey || !parsed.appsScriptUrl) {
          console.warn('Configuracion incompleta, limpiando...');
          limpiarStorage();
        }
      }
      const estados = localStorage.getItem('ocr_estados_areas');
      if (estados) {
        JSON.parse(estados);
      }
    } catch { console.warn('Storage corrupto detectado, limpiando...'); limpiarStorage(); }
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (dropdownResponsableRef.current && !dropdownResponsableRef.current.contains(e.target)) setMostrarDropdownResponsable(false);
      if (dropdownAreaRef.current && !dropdownAreaRef.current.contains(e.target)) setMostrarDropdownArea(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('touchstart', h);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('touchstart', h); };
  }, []);

  useEffect(() => { if (mostrarModalClave && claveRef.current) setTimeout(() => claveRef.current?.focus(), 100); }, [mostrarModalClave]);

  const configConsultaRef = useRef(DEFAULT_GOOGLE_CONFIG);

  const cargarTurnosConsulta = useCallback((config, hoja) => {
    if (!config?.sheetId || !config?.apiKey) { setErrorConsulta('Falta configuracion'); setCargandoConsulta(false); return; }
    setCargandoConsulta(true);
    setErrorConsulta('');
    setPersonaConsulta(null);
    setBusquedaConsulta('');
    const mesR = mesDeHoja(hoja);
    setMesConsulta(mesR);
    setHojaConsultaSeleccionada(hoja);
    const totalDias = new Date(anioConsulta, mesR, 0).getDate();
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${encodeURIComponent(hoja)}!A:AJ?key=${config.apiKey}`)
      .then(r => { if (!r.ok) return r.json().then(err => { throw new Error(err.error?.message || 'Error'); }); return r.json(); })
      .then(d => {
        const rows = d.values || [];
        if (rows.length < 2) { setPersonalConsulta([]); setTurnosConsulta({}); setErrorConsulta(`Sin datos en la hoja ${hoja}`); return; }
        const todos = [], tObj = {};
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i]; if (!cols || cols.length < 3) continue;
          todos.push({ id: i, dni: (cols[0]||'').trim(), grado: (cols[1]||'').trim(), nombre: (cols[2]||'').trim(), area: (cols[3]||'').trim() });
          const te = {};
          for (let d = 0; d < totalDias; d++) te[d+1] = NOMBRE_A_CODIGO[(cols[5+d]||'').trim()] || '';
          tObj[i] = te;
        }
        setPersonalConsulta(todos); setTurnosConsulta(tObj);
      })
      .catch(err => setErrorConsulta(err.message))
      .finally(() => setCargandoConsulta(false));
  }, [anioConsulta]);

  useEffect(() => {
    if (!mostrarConsulta) return;
    Promise.resolve().then(() => {
      let config = DEFAULT_GOOGLE_CONFIG;
      try { config = JSON.parse(localStorage.getItem('ocr_google_config') || 'null') || DEFAULT_GOOGLE_CONFIG; } catch { /* storage corrupto: usar config por defecto */ }
      if (!localStorage.getItem('ocr_google_config')) localStorage.setItem('ocr_google_config', JSON.stringify(DEFAULT_GOOGLE_CONFIG));
      configConsultaRef.current = config;
      if (!config.sheetId || !config.apiKey) { setErrorConsulta('Falta configuracion'); setCargandoConsulta(false); return; }
      setCargandoConsulta(true);
      setErrorConsulta('');
      setHojasConsulta([]);
      fetch(`https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}?key=${config.apiKey}&fields=sheets.properties.title`)
        .then(r => r.json())
        .then(d => setHojasConsulta(soloHojasMes(d.sheets?.map(s => s.properties.title) || [])))
        .catch(() => { /* sin permisos de listado: igual se consulta la hoja activa */ });
      resolverHojaActiva(config, config.sheetName)
        .then(hoja => cargarTurnosConsulta(config, hoja))
        .catch(err => { setErrorConsulta(err.message); setCargandoConsulta(false); });
    });
  }, [mostrarConsulta, cargarTurnosConsulta]);

  const verificarClave = () => {
    if (claveAdmin === CLAVE_SECRETA) { 
      setMostrarModalClave(false); 
      setClaveAdmin(''); 
      setClaveError(''); 
      onIngresar('ADMIN', 'Administrador', true); 
    } else { 
      setClaveError('Clave incorrecta'); 
      setClaveAdmin(''); 
    }
  };

  const areasDisponibles = useMemo(() => areas.filter(a => a !== 'TODAS'), [areas]);
  const areasFiltradas = useMemo(() => {
    if (!busquedaArea.trim()) return areasDisponibles;
    return areasDisponibles.filter(a => a.toLowerCase().includes(busquedaArea.toLowerCase().trim()));
  }, [areasDisponibles, busquedaArea]);

  const responsablesFiltrados = useMemo(() => {
    let r = responsables;
    if (busquedaResponsable.trim()) { 
      const t = busquedaResponsable.toLowerCase(); 
      r = r.filter(r => r.nombre.toLowerCase().includes(t) || r.grado?.toLowerCase().includes(t)); 
    }
    return r.slice(0, 30);
  }, [responsables, busquedaResponsable]);

  const personalFiltradoConsulta = useMemo(() => {
    if (!busquedaConsulta.trim()) return personalConsulta.slice(0, 30);
    const t = busquedaConsulta.toLowerCase();
    return personalConsulta.filter(p => p.nombre?.toLowerCase().includes(t) || p.grado?.toLowerCase().includes(t) || p.dni?.includes(t)).slice(0, 30);
  }, [personalConsulta, busquedaConsulta]);

  const calcularHoras = (empId) => {
    let h = 0;
    for (let d = 1; d <= totalDiasMesConsulta; d++) { 
      const t = TURNO_MAP[turnosConsulta[empId]?.[d] || '']; 
      if (t?.horas) h += t.horas; 
    }
    return h;
  };

  const handleIngresar = () => {
    if (!areaSeleccionada) { setError('Seleccione un area'); return; }
    if (!responsable.trim()) { setError('Seleccione un responsable'); return; }
    onIngresar(areaSeleccionada, responsable.trim(), false);
  };

  const handleLimpiarCache = () => {
    limpiarStorage();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          
          <div className="bg-white">
            <div className="flex flex-col items-center pt-10 pb-6">
              <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                <img 
                  src="/images/escudo-sanidad.png" 
                  alt="Escudo Sanidad PNP" 
                  className="w-14 h-14 object-contain" 
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Rol de Servicio PNP</h1>
              <p className="text-gray-500 text-sm mt-1.5 font-medium">Hospital Regional Policial Arequipa</p>
            </div>
            <div className="h-1 w-full" style={{ backgroundColor: COLOR_PRIMARIO }} />
          </div>

          <div className="px-6 py-6 space-y-5">
            
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Area</label>
              <div className="relative" ref={dropdownAreaRef}>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={areaSeleccionada || busquedaArea}
                    onChange={(e) => { setBusquedaArea(e.target.value); setAreaSeleccionada(''); setMostrarDropdownArea(true); setError(''); }}
                    onFocus={() => { setMostrarDropdownArea(true); if (areaSeleccionada) setBusquedaArea(''); }}
                    placeholder="Buscar o seleccionar area..."
                    autoComplete="off"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white hover:border-gray-300" 
                  />
                  {(busquedaArea || areaSeleccionada) && (
                    <button 
                      onClick={() => { setAreaSeleccionada(''); setBusquedaArea(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {mostrarDropdownArea && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b text-xs font-medium text-gray-500">{areasFiltradas.length} areas</div>
                    <div className="overflow-y-auto max-h-44">
                      {areasFiltradas.length > 0 ? areasFiltradas.map(area => {
                        const sel = areaSeleccionada === area;
                        return (
                          <button 
                            key={area} 
                            onClick={() => { setAreaSeleccionada(area); setBusquedaArea(area); setMostrarDropdownArea(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0 ${sel ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sel ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <MapPin className="w-4 h-4" />
                            </div>
                            <span className={`text-sm truncate font-medium ${sel ? 'text-emerald-700' : 'text-gray-700'}`}>{area}</span>
                            {sel && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                          </button>
                        );
                      }) : <div className="p-6 text-center text-sm text-gray-400">Sin resultados</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Responsable</label>
              <div className="relative" ref={dropdownResponsableRef}>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    value={responsable || busquedaResponsable}
                    onChange={(e) => { setBusquedaResponsable(e.target.value); setResponsable(''); setMostrarDropdownResponsable(true); }}
                    onFocus={() => { setMostrarDropdownResponsable(true); if (responsable) setBusquedaResponsable(''); }}
                    placeholder="Buscar responsable..."
                    autoComplete="off"
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white hover:border-gray-300" 
                  />
                  {(busquedaResponsable || responsable) && (
                    <button 
                      onClick={() => { setResponsable(''); setBusquedaResponsable(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {mostrarDropdownResponsable && (
                  <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-56 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b text-xs font-medium text-gray-500">{responsablesFiltrados.length} resultados</div>
                    <div className="overflow-y-auto max-h-44">
                      {responsablesFiltrados.length > 0 ? responsablesFiltrados.map((r, i) => {
                        const sel = responsable === r.nombre;
                        return (
                          <button 
                            key={i} 
                            onClick={() => { setResponsable(r.nombre); setBusquedaResponsable(`${r.grado||''} ${r.nombre}`); setMostrarDropdownResponsable(false); }}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-b-0 ${sel ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${sel ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className={`text-sm font-medium ${sel ? 'text-emerald-700' : 'text-gray-700'}`}>{r.nombre}</p>
                              <p className="text-xs text-gray-400">{r.grado}{r.area ? ` - ${r.area}` : ''}</p>
                            </div>
                            {sel && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />}
                          </button>
                        );
                      }) : <div className="p-6 text-center text-sm text-gray-400">Sin resultados</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button 
              onClick={handleIngresar} 
              disabled={cargando}
              className="w-full py-3.5 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 active:scale-[0.98] shadow-md hover:shadow-lg"
              style={{ backgroundColor: COLOR_PRIMARIO }}
            >
              {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5" /> Ingresar al Sistema</>}
            </button>

            <div className="grid grid-cols-3 gap-3 pt-1">
              
              {onRegistrarDescanso && (
                <button 
                  onClick={onRegistrarDescanso}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left group shadow-sm hover:shadow-md"
                >
                  <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5 text-rose-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Descanso</p>
                  <p className="text-xs text-gray-400 mt-0.5">Medico</p>
                </button>
              )}

              {onRegistrarVacaciones && (
                <button 
                  onClick={onRegistrarVacaciones}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left group shadow-sm hover:shadow-md"
                >
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                    <Umbrella className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">Vacaciones</p>
                  <p className="text-xs text-gray-400 mt-0.5">Registrar</p>
                </button>
              )}

              <button 
                onClick={() => { setMostrarConsulta(true); setBusquedaConsulta(''); setPersonaConsulta(null); }}
                className="p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left group shadow-sm hover:shadow-md"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Consultar</p>
                <p className="text-xs text-gray-400 mt-0.5">Turnos</p>
              </button>
            </div>

            {onAbrirCambiosTurno && (
              <button 
                onClick={onAbrirCambiosTurno}
                className="w-full p-4 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 transition-all text-left group shadow-sm hover:shadow-md flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Cambio de Turno</p>
                  <p className="text-xs text-gray-400 mt-0.5">Solicitudes y bandeja de cambios</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
              </button>
            )}

            {onAbrirParteDiario && (
              <button 
                onClick={onAbrirParteDiario}
                className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left group shadow-sm hover:shadow-md flex items-center gap-4"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Parte Diario</p>
                  <p className="text-xs text-gray-400 mt-0.5">Reporte de servicio del dia</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
              </button>
            )}

            <button 
              onClick={() => setMostrarModalClave(true)}
              className="w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left group shadow-sm hover:shadow-md flex items-center gap-4"
            >
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Acceso Administrador</p>
                <p className="text-xs text-gray-400 mt-0.5">Requiere clave de seguridad</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto flex-shrink-0" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">Sistema de Roles PNP - v.{new Date().getFullYear()}</p>
        
        <button 
          onClick={handleLimpiarCache}
          className="w-full mt-3 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Problemas al ingresar? Limpiar cache y recargar
        </button>
      </div>

      {mostrarModalClave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setMostrarModalClave(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-6 text-white text-center" style={{ backgroundColor: COLOR_PRIMARIO }}>
              <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center mx-auto mb-3 backdrop-blur-sm">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold">Acceso Administrador</h3>
              <p className="text-white/60 text-sm mt-1">Ingrese la clave de seguridad</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <input 
                  ref={claveRef} 
                  type={claveMostrada ? 'text' : 'password'} 
                  value={claveAdmin}
                  onChange={(e) => { setClaveAdmin(e.target.value); setClaveError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') verificarClave(); if (e.key === 'Escape') setMostrarModalClave(false); }}
                  placeholder="Clave de acceso"
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" 
                />
                <button 
                  onClick={() => setClaveMostrada(!claveMostrada)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                >
                  <Eye className={`w-4 h-4 ${claveMostrada ? '' : 'opacity-50'}`} />
                </button>
              </div>
              {claveError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" /><span className="font-medium">{claveError}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setMostrarModalClave(false); setClaveAdmin(''); setClaveError(''); }}
                  className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">Cancelar</button>
                <button onClick={verificarClave} disabled={!claveAdmin}
                  className="flex-1 py-3 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all" style={{ backgroundColor: COLOR_PRIMARIO }}>Verificar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarConsulta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-2 sm:p-4" onClick={() => { setMostrarConsulta(false); setBusquedaConsulta(''); setPersonaConsulta(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            
            <div className="px-5 py-4 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-bold">Consulta de Turnos</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={hojaConsultaSeleccionada}
                      onChange={(e) => { const h = e.target.value; if (h) cargarTurnosConsulta(configConsultaRef.current, h); }}
                      disabled={cargandoConsulta}
                      className="px-2 py-1 rounded-lg bg-white/15 text-white text-xs font-medium border border-white/25 focus:outline-none focus:bg-white/25 disabled:opacity-60 max-w-[170px]"
                    >
                      {hojasConsulta.length === 0 && <option value="">Mes</option>}
                      {hojasConsulta.map(h => <option key={h} value={h} className="text-gray-800">{h}</option>)}
                    </select>
                    <span className="text-xs text-white/60 whitespace-nowrap">{MESES[mesConsulta-1]} {anioConsulta}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => { setMostrarConsulta(false); setBusquedaConsulta(''); setPersonaConsulta(null); }} className="p-2 hover:bg-white/15 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 border-b bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={busquedaConsulta} onChange={(e) => { setBusquedaConsulta(e.target.value); setPersonaConsulta(null); }}
                  placeholder="Buscar por nombre, grado o DNI..." autoFocus
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white" />
                {busquedaConsulta && <button onClick={() => { setBusquedaConsulta(''); setPersonaConsulta(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cargandoConsulta ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: COLOR_PRIMARIO }} />
                  <p className="text-sm text-gray-400">Cargando personal...</p>
                </div>
              ) : errorConsulta ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                  <p className="text-sm text-red-500">{errorConsulta}</p>
                </div>
              ) : !personaConsulta ? (
                <div className="space-y-1">
                  {personalFiltradoConsulta.length > 0 ? personalFiltradoConsulta.map(emp => (
                    <button key={emp.id} onClick={() => setPersonaConsulta(emp)}
                      className="w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                        <User className="w-5 h-5 text-gray-500 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{emp.grado} {emp.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{emp.area}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
                    </button>
                  )) : (
                    <div className="text-center py-12 text-gray-400">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">{busquedaConsulta ? 'Sin resultados' : 'Escriba para buscar personal'}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <button onClick={() => setPersonaConsulta(null)} className="text-sm font-medium mb-4 flex items-center gap-1 hover:underline" style={{ color: COLOR_PRIMARIO }}>
                    Volver a la lista
                  </button>
                  
                  <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <User className="w-7 h-7 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-800 truncate">{personaConsulta.grado} {personaConsulta.nombre}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{personaConsulta.area}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{calcularHoras(personaConsulta.id)}h</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{totalDiasMesConsulta} dias</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mb-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5">
                    <span className="text-sm font-bold text-gray-700">{MESES[mesConsulta-1]} {anioConsulta}</span>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['L','M','M','J','V','S','D'].map((d, i) => (
                        <div key={i} className="text-center text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const primerDia = new Date(anioConsulta, mesConsulta-1, 1).getDay();
                        const espacios = primerDia === 0 ? 6 : primerDia - 1;
                        return Array.from({ length: espacios }).map((_, i) => <div key={`e-${i}`} className="aspect-square" />);
                      })()}
                      {DIAS_CONSULTA.map(dia => {
                        const turno = turnosConsulta[personaConsulta.id]?.[dia] || '';
                        const t = TURNO_MAP[turno];
                        const fecha = new Date(anioConsulta, mesConsulta-1, dia);
                        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
                        const esHoy = fecha.toDateString() === new Date().toDateString();
                        return (
                          <div key={dia} className="aspect-square rounded-lg border flex flex-col items-center justify-center relative"
                            style={{ backgroundColor: t?.color || (esFinde ? '#F9FAFB' : '#FFFFFF'), borderColor: turno ? `${t?.texto}30` : '#E5E7EB' }}>
                            <span className="text-[10px] font-semibold leading-none" style={{ color: t?.texto || '#374151' }}>{dia}</span>
                            {turno ? <span className="text-[7px] font-medium truncate max-w-full px-0.5 leading-none mt-0.5" style={{ color: t?.texto, opacity: 0.85 }}>{turno}</span>
                              : <span className="text-[7px] leading-none mt-0.5 opacity-0">-</span>}
                            {esHoy && <div className="absolute inset-0 rounded-lg ring-2 ring-offset-1" style={{ ringColor: COLOR_PRIMARIO }} />}
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                        {Array.from(new Set(DIAS_CONSULTA.map(d => turnosConsulta[personaConsulta.id]?.[d] || '').filter(Boolean))).map(codigo => {
                          const t = TURNO_MAP[codigo];
                          return t ? (
                            <div key={codigo} className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                              <span className="text-gray-500 font-medium">{t.codigo} = {t.nombre}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PantallaSeleccion;