// src/components/mesapartes/MesaDePartes.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, Plus, Send, Calendar, User, Inbox,
  X, SlidersHorizontal, ChevronLeft, ChevronRight, FileText,
  CheckCircle, Clock, Mail, File, ArrowDownLeft, CheckSquare,
  Bell
} from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { COLOR_PRIMARIO, API_ENDPOINTS, ESTADOS, ESTADOS_DERIVACION, FUENTES } from './constantes';
import RegistroDocumento from './RegistroDocumento';
import ModalVerDocumento from './ModalVerDocumento';
import ModalDerivarDocumento from './ModalDerivarDocumento';
import ModalRecibirDocumento from './ModalRecibirDocumento';
import ModalDevolverDocumento from './ModalDevolverDocumento';
import ModalCerrarDocumento from './ModalCerrarDocumento';

const REGISTROS_POR_PAGINA = 20;
const norm = (t) => (t || '').toLowerCase().trim();

const MesaDePartes = ({ onSalir, esAdmin, esTramite, user }) => {
  const canManage = esAdmin || esTramite;
  const userAreas = user?.areas || [];

  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroAvanzado, setFiltroAvanzado] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [pagina, setPagina] = useState(1);
  const [stats, setStats] = useState({ total: 0, pendientes: 0, hoy: 0 });
  const [vistaActiva, setVistaActiva] = useState('general'); // 'general' o 'bandeja'
  const [areaBandeja, setAreaBandeja] = useState(userAreas[0] || '');

  // Modals
  const [docVer, setDocVer] = useState(null);
  const [docDerivar, setDocDerivar] = useState(null);
  const [docRecibir, setDocRecibir] = useState(null);
  const [docDevolver, setDocDevolver] = useState(null);
  const [docCerrar, setDocCerrar] = useState(null);

  // Notificaciones por area (derivaciones pendientes)
  const [notificaciones, setNotificaciones] = useState({});
  const totalNotificaciones = Object.values(notificaciones).reduce((sum, n) => sum + n, 0);

  // ============================================
  // CARGAR DOCUMENTOS
  // ============================================
  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      let result;
      if (vistaActiva === 'bandeja' && areaBandeja) {
        result = await apiClient.get(API_ENDPOINTS.bandeja(areaBandeja));
      } else {
        result = await apiClient.get(API_ENDPOINTS.documentos);
      }
      const docs = (result.documentos || []).sort((a, b) => {
        const idA = parseInt(a.id) || 0;
        const idB = parseInt(b.id) || 0;
        return idB - idA;
      });
      setDocumentos(docs);
    } catch (err) {
      setError(err.message || 'Error al cargar');
    } finally { setCargando(false); }
  }, [vistaActiva, areaBandeja]);

  useEffect(() => { cargarDocumentos(); }, [cargarDocumentos]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroFecha, filtroEstado, vistaActiva]);

  // Cargar notificaciones por area (derivaciones pendientes de recibir)
  const cargarNotificaciones = useCallback(async () => {
    if (userAreas.length === 0) return;
    const counts = {};
    try {
      const promises = userAreas.map(async (area) => {
        try {
          const result = await apiClient.get(API_ENDPOINTS.bandeja(area));
          const docs = result.documentos || [];
          // Contar derivaciones con estado DERIVADO (pendientes de recibir)
          let pendientes = 0;
          for (const doc of docs) {
            const derivs = doc.derivaciones || [];
            for (const d of derivs) {
              if (d.estado === 'DERIVADO' && d.area_destino && d.area_destino.toUpperCase() === area.toUpperCase()) {
                pendientes++;
              }
            }
          }
          counts[area] = pendientes;
        } catch {
          counts[area] = 0;
        }
      });
      await Promise.all(promises);
      setNotificaciones(counts);
    } catch {
      // silently ignore
    }
  }, [userAreas]);

  useEffect(() => { cargarNotificaciones(); }, [cargarNotificaciones]);
  // Refrescar notificaciones cada 60 segundos
  useEffect(() => {
    const interval = setInterval(cargarNotificaciones, 60000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  // Stats
  useEffect(() => {
    const hoy = new Date().toISOString().split('T')[0];
    setStats({
      total: documentos.length,
      pendientes: documentos.filter(d => d.estado === 'REGISTRADO').length,
      hoy: documentos.filter(d => d.fecha_registro && d.fecha_registro.startsWith(hoy)).length
    });
  }, [documentos]);

  const handleActualizado = useCallback(() => {
    cargarDocumentos();
    cargarNotificaciones();
  }, [cargarDocumentos, cargarNotificaciones]);

  // ============================================
  // FILTRADO
  // ============================================
  const docsFiltrados = useMemo(() => {
    return documentos.filter(d => {
      if (filtroEstado !== 'TODOS' && d.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const t = norm(busqueda);
        if (![d.asunto, d.contenido, d.tipo_doc, d.procedencia, d.numero, d.n_doc_origen, d.fecha_registro]
          .some(v => norm(v).includes(t))) return false;
      }
      if (filtroFecha && d.fecha_registro && !d.fecha_registro.startsWith(filtroFecha)) return false;
      return true;
    });
  }, [documentos, busqueda, filtroFecha, filtroEstado]);

  const totalPaginas = Math.ceil(docsFiltrados.length / REGISTROS_POR_PAGINA);
  const docsPaginados = docsFiltrados.slice((pagina - 1) * REGISTROS_POR_PAGINA, pagina * REGISTROS_POR_PAGINA);

  // ============================================
  // ACCIONES
  // ============================================
  const handleRecibir = useCallback((derivacion, documento) => {
    setDocVer(null);
    setDocRecibir({ derivacion, documento });
  }, []);

  const handleDevolver = useCallback((derivacion, documento) => {
    setDocVer(null);
    setDocDevolver({ derivacion, documento });
  }, []);

  const handleCerrar = useCallback((documento) => {
    setDocVer(null);
    setDocCerrar(documento);
  }, []);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA]">

      {/* Header */}
      <header className="flex-shrink-0 z-40 bg-[#F8F9FA]/90 backdrop-blur-sm border-b border-gray-200/60">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onSalir && (
              <button onClick={onSalir} className="p-2 -ml-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
              </button>
            )}
            <div className="relative">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {canManage ? 'MESA DE PARTES' : 'BANDEJA DE DOCUMENTOS'}
              </h1>
              <p className="text-xs text-gray-500">
                {canManage ? 'Gestion documental' : `Documentos derivados a: ${userAreas.join(', ')}`}
              </p>
              {!canManage && totalNotificaciones > 0 && (
                <span className="absolute -top-1 -right-6 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none animate-pulse">
                  {totalNotificaciones > 99 ? '99+' : totalNotificaciones}
                </span>
              )}
            </div>
          </div>
          {canManage && (
            <div className="flex items-center gap-2">
              {/* Notificaciones */}
              {userAreas.length > 0 && (
                <button
                  onClick={() => setVistaActiva('bandeja')}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Notificaciones"
                >
                  <Bell className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
                  {totalNotificaciones > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                      {totalNotificaciones > 99 ? '99+' : totalNotificaciones}
                    </span>
                  )}
                </button>
              )}
              {/* Selector General/Bandeja */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setVistaActiva('general')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    vistaActiva === 'general' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  General
                </button>
                {userAreas.length > 0 && (
                  <button
                    onClick={() => setVistaActiva('bandeja')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all relative ${
                      vistaActiva === 'bandeja' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Mi Bandeja
                    {totalNotificaciones > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-0.5 leading-none">
                        {totalNotificaciones > 99 ? '99+' : totalNotificaciones}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0 px-4">

          {/* Stats - solo en vista general para tramite/admin */}
          {canManage && vistaActiva === 'general' && (
            <div className="flex-shrink-0 grid grid-cols-3 gap-3 pt-4">
              <div className="bg-white rounded-lg p-3 border border-gray-200/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <Inbox className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                  <span className="text-[10px] text-gray-500 font-medium uppercase">Total</span>
                </div>
                <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                  <span className="text-[10px] text-gray-500 font-medium uppercase">Pendientes</span>
                </div>
                <p className="text-xl font-semibold text-gray-900">{stats.pendientes}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR_PRIMARIO }} />
                  <span className="text-[10px] text-gray-500 font-medium uppercase">Hoy</span>
                </div>
                <p className="text-xl font-semibold text-gray-900">{stats.hoy}</p>
              </div>
            </div>
          )}

          {/* Bandeja selector */}
          {vistaActiva === 'bandeja' && userAreas.length > 1 && (
            <div className="flex-shrink-0 pt-4">
              <div className="flex gap-1.5 flex-wrap">
                {userAreas.map(area => {
                  const pendientes = notificaciones[area] || 0;
                  return (
                    <button
                      key={area}
                      onClick={() => setAreaBandeja(area)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all relative ${
                        areaBandeja === area
                          ? 'bg-gray-900 text-white border border-gray-900'
                          : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {area}
                      {pendientes > 0 && (
                        <span className={`absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold rounded-full px-0.5 leading-none ${
                          areaBandeja === area ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                          {pendientes > 99 ? '99+' : pendientes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Search + Filters */}
          <div className="flex-shrink-0 space-y-2 pt-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full pl-9 pr-9 py-2 bg-white text-sm rounded-lg outline-none border border-gray-200/60 focus:border-gray-300"
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400">
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setFiltroAvanzado(!filtroAvanzado)}
                className={`p-2 rounded-lg border ${filtroAvanzado || filtroFecha ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200/60 text-gray-400'}`}
              >
                <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
              </button>
              {canManage && vistaActiva === 'general' && (
                <button
                  onClick={() => setDocVer('nuevo')}
                  className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Nuevo
                </button>
              )}
            </div>

            <div className="flex gap-1.5">
              {Object.entries(ESTADOS).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setFiltroEstado(key)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${
                    filtroEstado === key ? 'bg-gray-900 text-white border border-gray-900' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {filtroAvanzado && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200/60 p-2">
                <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)} className="flex-1 text-xs outline-none bg-transparent" />
                {filtroFecha && <button onClick={() => setFiltroFecha('')} className="text-xs text-gray-400 px-2 py-1">Limpiar</button>}
              </div>
            )}
          </div>

          {/* Document List */}
          <div className="flex-1 min-h-0 mt-3">
            <div className="h-full overflow-y-auto">
              {cargando ? (
                <div className="flex justify-center py-20">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="text-sm text-gray-400">{error}</p>
                  <button onClick={cargarDocumentos} className="mt-3 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">Reintentar</button>
                </div>
              ) : docsFiltrados.length === 0 ? (
                <div className="text-center py-20">
                  <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-gray-400">
                    {vistaActiva === 'bandeja' ? 'No hay documentos en su bandeja' : 'No hay documentos'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {docsPaginados.map((doc) => {
                    const style = ESTADOS[doc.estado] || ESTADOS.REGISTRADO;
                    const derivaciones = doc.derivaciones || [];
                    const movimientos = doc.movimientos || [];
                    const todasDevueltas = derivaciones.length > 0 && derivaciones.every(d => d.estado === 'DEVUELTO');
                    const algunaPendiente = derivaciones.some(d => d.estado === 'DERIVADO');

                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-lg px-4 py-3 border border-gray-200/60 hover:border-gray-300/80 cursor-pointer transition-colors"
                        onClick={() => setDocVer(doc)}
                      >
                        {/* Header: numero + estado */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: COLOR_PRIMARIO }}>{doc.numero}</span>
                          <span className="text-[11px] text-gray-500">{doc.fecha_registro?.split(' ')[0]}</span>
                          {doc.tipo_doc && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{doc.tipo_doc}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: doc.fuente === 'digital' ? '#EFF6FF' : '#FEF3C7', color: doc.fuente === 'digital' ? '#1D4ED8' : '#B45309' }}>
                            {doc.fuente === 'digital' ? <Mail className="w-3 h-3 inline" /> : <File className="w-3 h-3 inline" />}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto inline-flex items-center gap-1.5"
                            style={{ backgroundColor: style.bg, color: style.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                            {style.label}
                          </span>
                        </div>

                        {/* Asunto */}
                        <p className="text-sm font-medium text-gray-800 truncate mb-1.5">{doc.asunto || doc.contenido || 'Sin asunto'}</p>

                        {/* Creado por */}
                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                          {doc.creado_por && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />{doc.creado_por}
                            </span>
                          )}
                          {derivaciones.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Send className="w-3 h-3" strokeWidth={1.5} />
                              {derivaciones.length} area{derivaciones.length > 1 ? 's' : ''}
                              {todasDevueltas && <span className="text-emerald-500 ml-0.5"><CheckSquare className="w-3 h-3" /></span>}
                              {!todasDevueltas && algunaPendiente && <span className="text-blue-500 ml-0.5"><Clock className="w-3 h-3" /></span>}
                            </span>
                          )}
                        </div>

                        {/* Derivaciones inline */}
                        {derivaciones.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {derivaciones.map(d => {
                              const dStyle = ESTADOS_DERIVACION[d.estado] || ESTADOS_DERIVACION.DERIVADO;
                              return (
                                <div key={d.id} className="flex items-center gap-2 text-[11px] bg-gray-50 rounded-lg px-2.5 py-1.5" onClick={e => e.stopPropagation()}>
                                  <span className="font-medium text-gray-600 truncate flex-1">{d.area_destino}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ backgroundColor: dStyle.bg, color: dStyle.color }}>
                                    {dStyle.dot && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: dStyle.dot }} />}
                                    {dStyle.label}
                                  </span>
                                  {d.recibido_por && <span className="text-gray-400 text-[10px]">{d.recibido_por}</span>}
                                  {/* Acciones */}
                                  {d.estado === 'DERIVADO' && userAreas.includes(d.area_destino) && (
                                    <button onClick={() => handleRecibir(d, doc)} className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-white hover:bg-amber-600">Recibir</button>
                                  )}
                                  {d.estado === 'RECIBIDO' && userAreas.includes(d.area_destino) && (
                                    <button onClick={() => handleDevolver(d, doc)} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white hover:bg-emerald-600">Devolver</button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPaginas > 1 && (
            <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3 border-t border-gray-100">
              <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina <= 1} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-xs text-gray-500">{pagina} de {totalPaginas}</span>
              <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas} className="p-1.5 hover:bg-gray-100 rounded-lg disabled:opacity-30">
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ============================================
          MODALES
          ============================================ */}

      {/* Nuevo Documento */}
      {docVer === 'nuevo' && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={() => setDocVer(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  Nuevo Documento
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Registre el documento recibido</p>
              </div>
              <button onClick={() => setDocVer(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <RegistroDocumento onRegistrado={() => { setDocVer(null); handleActualizado(); }} />
            </div>
          </div>
        </div>
      )}

      {/* Ver Documento */}
      {docVer && docVer !== 'nuevo' && (
        <ModalVerDocumento
          documento={docVer}
          onClose={() => setDocVer(null)}
          onDerivar={(d) => { setDocVer(null); setDocDerivar(d); }}
          onRecibir={handleRecibir}
          onDevolver={handleDevolver}
          onCerrar={handleCerrar}
          userAreas={userAreas}
          canManage={canManage}
        />
      )}

      {/* Derivar */}
      {docDerivar && (
        <ModalDerivarDocumento
          documento={docDerivar}
          onClose={() => setDocDerivar(null)}
          onActualizado={() => { setDocDerivar(null); handleActualizado(); }}
        />
      )}

      {/* Recibir */}
      {docRecibir && (
        <ModalRecibirDocumento
          derivacion={docRecibir.derivacion}
          documento={docRecibir.documento}
          onClose={() => setDocRecibir(null)}
          onActualizado={() => { setDocRecibir(null); handleActualizado(); }}
        />
      )}

      {/* Devolver */}
      {docDevolver && (
        <ModalDevolverDocumento
          derivacion={docDevolver.derivacion}
          documento={docDevolver.documento}
          onClose={() => setDocDevolver(null)}
          onActualizado={() => { setDocDevolver(null); handleActualizado(); }}
        />
      )}

      {/* Cerrar */}
      {docCerrar && (
        <ModalCerrarDocumento
          documento={docCerrar}
          onClose={() => setDocCerrar(null)}
          onActualizado={() => { setDocCerrar(null); handleActualizado(); }}
        />
      )}
    </div>
  );
};

export default MesaDePartes;
