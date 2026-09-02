// src/components/ocr/PanelControlAdmin.jsx
// PANEL DE CONTROL ADMIN - ORDENADO: DESBLOQUEADOS PRIMERO
// El admin elige el mes de trabajo del panel (no impone el mes a los demas usuarios).
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Shield, Lock, Unlock, RefreshCw, Loader2, X, Search, CheckCircle2, CalendarDays } from 'lucide-react';
import { hojaDelMesActual } from './constantes';

const COLOR_PRIMARIO = '#188C5D';
const STORAGE_KEY = 'ocr_estados_areas';

const PanelControlAdmin = ({ isOpen, onClose, areas = [], config, onActualizar, hojaSeleccionada, hojasDisponibles = [], areaAdmin = '' }) => {
  const [mesTrabajoTmp, setMesTrabajoTmp] = useState(hojaSeleccionada || hojaDelMesActual());
  const [estadosAreas, setEstadosAreas] = useState({});
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloPendientes, setMostrarSoloPendientes] = useState(false);
  const prevIsOpen = useRef(false);

  // Al abrir el panel, trabajar sobre el mes que el admin tiene visible.
  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setMesTrabajoTmp(hojaSeleccionada || hojaDelMesActual());
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, hojaSeleccionada]);

  const opcionesMes = hojasDisponibles.length > 0 ? hojasDisponibles : [mesTrabajoTmp || hojaDelMesActual()];

  const cargarEstadosDesdeSheets = useCallback(async (mesTrabajo = mesTrabajoTmp) => {
    setCargando(true);
    
    const inicializados = {};
    areas.forEach(area => { inicializados[area] = false; });
    
    if (config?.sheetId && config?.apiKey) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/ESTADOS!A:C?key=${config.apiKey}`;
        const r = await fetch(url);
        if (r.ok) {
          const d = await r.json();
          (d.values || []).forEach(fila => {
            const mes = fila[0]?.trim();
            const nombreArea = fila[1]?.trim();
            const estado = fila[2]?.trim();
            if (nombreArea && mes === mesTrabajo) {
              inicializados[nombreArea] = (estado === 'FINALIZADO');
            }
          });
        }
      } catch (e) {
        console.error('Error al cargar desde Sheets:', e);
      }
    }
    
    localStorage.setItem(`${STORAGE_KEY}_${mesTrabajo}`, JSON.stringify(inicializados));
    // Solo notifica a PanelTrabajo si administra el MISMO mes que el panel tiene abierto;
    // para otros meses el modal trabaja de forma independiente.
    if (onActualizar && mesTrabajo === hojaSeleccionada) onActualizar(inicializados);
    setEstadosAreas(inicializados);
    setCargando(false);
  }, [config, areas, onActualizar, mesTrabajoTmp, hojaSeleccionada]);

  useEffect(() => {
    if (isOpen) { cargarEstadosDesdeSheets(); }
  }, [isOpen, config, areas, onActualizar, cargarEstadosDesdeSheets]);

  const aplicarLote = async (estado) => {
    if (!config?.appsScriptUrl) return;
    // Solo actuar sobre areas que NO ya estan en el estado deseado
    const areasCambiables = areas.filter(a => {
      const yaBloqueado = estadosAreas[a] === true;
      if (estado === 'FINALIZADO' && yaBloqueado) return false; // Ya bloqueada, omitir
      if (estado === 'DISPONIBLE' && !yaBloqueado) return false; // Ya desbloqueada, omitir
      return true;
    });
    if (areasCambiables.length === 0) {
      setMensaje({ tipo: 'success', texto: `Todas las areas ya estan ${estado === 'FINALIZADO' ? 'bloqueadas' : 'desbloqueadas'}` });
      setTimeout(() => setMensaje(null), 2500);
      return;
    }
    setGuardando(true);
    try {
      const accion = estado === 'FINALIZADO' ? 'marcarLoteFinalizado' : 'desmarcarLoteFinalizado';
      await fetch(config.appsScriptUrl, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ accion, mes: mesTrabajoTmp, areas: areasCambiables })
      });
      const nuevosEstados = { ...estadosAreas };
      areasCambiables.forEach(a => { nuevosEstados[a] = (estado === 'FINALIZADO'); });
      localStorage.setItem(`${STORAGE_KEY}_${mesTrabajoTmp}`, JSON.stringify(nuevosEstados));
      // Solo notifica a PanelTrabajo si administra el MISMO mes que el panel tiene abierto.
      const esMesDelPanel = mesTrabajoTmp === hojaSeleccionada;
      if (onActualizar && esMesDelPanel) onActualizar(nuevosEstados);
      setEstadosAreas(nuevosEstados);
      if (estado === 'DISPONIBLE' && esMesDelPanel) {
        areasCambiables.forEach(a => window.dispatchEvent(new CustomEvent('area-desbloqueada', { detail: { area: a } })));
      }
      setMensaje({ tipo: estado === 'DISPONIBLE' ? 'success' : 'warning', texto: `${areasCambiables.length} area(s) ${estado === 'DISPONIBLE' ? 'desbloqueada(s)' : 'bloqueada(s)'} de ${areas.length} total (${mesTrabajoTmp})` });
      setTimeout(() => setMensaje(null), 3500);
    } catch (e) {
      console.error('Error en lote:', e);
      setMensaje({ tipo: 'warning', texto: 'Error al aplicar el lote' });
      setTimeout(() => setMensaje(null), 3500);
    } finally {
      setGuardando(false);
    }
  };

  const toggleArea = async (area) => {
    const nuevoEstado = !estadosAreas[area];
    
    const nuevosEstados = { ...estadosAreas, [area]: nuevoEstado };
    setEstadosAreas(nuevosEstados);
    localStorage.setItem(`${STORAGE_KEY}_${mesTrabajoTmp}`, JSON.stringify(nuevosEstados));
    // Solo notifica a PanelTrabajo si administra el MISMO mes que el panel tiene abierto.
    const esMesDelPanel = mesTrabajoTmp === hojaSeleccionada;
    if (onActualizar && esMesDelPanel) onActualizar(nuevosEstados);
    
    setGuardando(true);
    
    if (config?.appsScriptUrl) {
      try {
        const accion = nuevoEstado ? 'marcarFinalizado' : 'desmarcarFinalizado';
        await fetch(config.appsScriptUrl, {
          method: 'POST', mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ accion, mes: mesTrabajoTmp, area })
        });
      } catch (e) {
        console.error('Error:', e);
      }
    }
    
    if (!nuevoEstado && esMesDelPanel) {
      window.dispatchEvent(new CustomEvent('area-desbloqueada', { detail: { area } }));
    }
    
    setMensaje({ 
      tipo: nuevoEstado ? 'warning' : 'success', 
      texto: `${area}: ${nuevoEstado ? 'Bloqueada' : 'Desbloqueada'}` 
    });
    setTimeout(() => setMensaje(null), 2500);
    setGuardando(false);
  };

  const recargarEstados = () => cargarEstadosDesdeSheets();

  const todasLasAreas = useMemo(() => {
    // Excluir el área del admin (siempre activo, nunca se bloquea)
    const filtradas = areaAdmin ? areas.filter(a => a !== areaAdmin) : areas;
    return Object.keys(
      filtradas.reduce((acc, a) => { acc[a] = true; return acc; }, {})
    ).sort((a, b) => {
      const bloqueoA = estadosAreas[a] === true ? 1 : 0;
      const bloqueoB = estadosAreas[b] === true ? 1 : 0;
      if (bloqueoA !== bloqueoB) return bloqueoA - bloqueoB;
      return a.localeCompare(b, 'es');
    });
  }, [areas, estadosAreas, areaAdmin]);

  const areasFiltradas = useMemo(() => {
    let resultado = todasLasAreas;
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase().trim();
      resultado = todasLasAreas.filter(a => a.toLowerCase().includes(term));
    }
    if (mostrarSoloPendientes) {
      resultado = resultado.filter(a => estadosAreas[a] !== true);
    }
    return resultado;
  }, [todasLasAreas, busqueda, estadosAreas, mostrarSoloPendientes]);

  const bloqueadas = Object.values(estadosAreas).filter(v => v === true).length;
  const desbloqueadas = Object.values(estadosAreas).filter(v => v === false).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[250] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        
        <div className="px-6 py-5 text-white flex items-center justify-between" style={{ backgroundColor: COLOR_PRIMARIO }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Panel de Control</h2>
              <p className="text-sm text-white/70">{mesTrabajoTmp || hojaDelMesActual()} · {todasLasAreas.length} areas</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={recargarEstados} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Recargar estados">
              <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 md:max-w-xs">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Mes de trabajo del panel
                  </p>
                  <select
                    value={mesTrabajoTmp}
                    onChange={(e) => setMesTrabajoTmp(e.target.value)}
                    className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  >
                    {opcionesMes.map(h => <option key={h} value={h} className="text-gray-800">{h}</option>)}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1.5">Administra este mes de forma independiente. No cambia el mes del panel de trabajo ni el de los demas usuarios.</p>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Unlock className="w-3.5 h-3.5" /> Acciones masivas ({mesTrabajoTmp || hojaDelMesActual()})
                  </p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => aplicarLote('DISPONIBLE')} disabled={guardando}
                      className="flex-1 h-9 px-3 text-xs font-medium rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200 disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5" /> Liberar todas
                    </button>
                    <button onClick={() => aplicarLote('FINALIZADO')} disabled={guardando}
                      className="flex-1 h-9 px-3 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Bloquear todas
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2">{areas.length} areas en este mes. Verifica antes de bloquear en lote.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-gray-600"><strong>{desbloqueadas}</strong> disponibles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600"><strong>{bloqueadas}</strong> bloqueadas</span>
            </div>
          </div>
          
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar area..."
              className="w-full h-9 pl-9 pr-9 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white transition-all" />
            {busqueda && (
              <button onClick={() => setBusqueda('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button onClick={() => setMostrarSoloPendientes(!mostrarSoloPendientes)}
            className={`mt-3 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              mostrarSoloPendientes ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}>
            {mostrarSoloPendientes ? 'Mostrando pendientes' : 'Ver solo pendientes'}
          </button>
        </div>

        {mensaje && (
          <div className={`px-6 py-2.5 text-center text-sm font-medium flex items-center justify-center gap-2 ${
            mensaje.tipo === 'success' ? 'bg-emerald-50 text-emerald-700 border-b border-emerald-200' : 
            'bg-amber-50 text-amber-700 border-b border-amber-200'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
            {mensaje.texto}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : areasFiltradas.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              {mostrarSoloPendientes ? 'Todas las areas han sido bloqueadas.' : 'No se encontraron areas.'}
            </div>
          ) : (
            <div className="space-y-2">
              {areasFiltradas.map(area => {
                const bloqueado = estadosAreas[area] === true;
                return (
                  <div key={area} className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                    bloqueado ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        bloqueado ? 'bg-gray-200' : 'bg-emerald-100'
                      }`}>
                        {bloqueado ? <Lock className="w-4 h-4 text-gray-500" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-700 text-sm truncate">{area}</p>
                        <p className={`text-xs ${bloqueado ? 'text-gray-400' : 'text-emerald-600'}`}>
                          {bloqueado ? 'Bloqueada' : 'Disponible'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => toggleArea(area)} disabled={guardando}
                      className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex-shrink-0 ml-3 disabled:opacity-50 ${
                        bloqueado 
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200' 
                          : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                      }`}>
                      {bloqueado ? 'Desbloquear' : 'Bloquear'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-gray-400">Sincronizado con Google Sheets</span>
          <button onClick={recargarEstados} disabled={cargando}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PanelControlAdmin;