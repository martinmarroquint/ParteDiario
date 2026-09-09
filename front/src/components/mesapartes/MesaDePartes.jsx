// src/components/mesapartes/MesaDePartes.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, Plus, Send, FileCheck, Calendar, User, Inbox,
  X, SlidersHorizontal, ChevronLeft, ChevronRight, FileText,
  ArrowUpRight, ArrowDownRight, CheckCircle, Clock, History
} from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { COLOR_PRIMARIO, API_ENDPOINTS, ESTADOS, ESTADOS_DERIVACION, FUENTES } from './constantes';
import RegistroDocumento from './RegistroDocumento';
import ModalVerDocumento from './ModalVerDocumento';
import ModalDerivarDocumento from './ModalDerivarDocumento';
import ModalRecibirDocumento from './ModalRecibirDocumento';
import ModalDevolverDocumento from './ModalDevolverDocumento';

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

  // Modals
  const [docVer, setDocVer] = useState(null);
  const [docDerivar, setDocDerivar] = useState(null);
  const [docRecibir, setDocRecibir] = useState(null); // { derivacion, documento }
  const [docDevolver, setDocDevolver] = useState(null); // { derivacion, documento }

  // ============================================
  // CARGAR DOCUMENTOS
  // ============================================
  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const result = await apiClient.get(API_ENDPOINTS.documentos);
      setDocumentos(result.documentos || []);
    } catch (err) {
      setError(err.message || 'Error al cargar');
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { cargarDocumentos(); }, [cargarDocumentos]);
  useEffect(() => { setPagina(1); }, [busqueda, filtroFecha, filtroEstado]);

  // Stats
  useEffect(() => {
    const filtrados = documentos.filter(d => {
      if (filtroFecha && d.fecha_registro && !d.fecha_registro.startsWith(filtroFecha)) return false;
      return true;
    });
    const hoy = new Date().toISOString().split('T')[0];
    setStats({
      total: filtrados.length,
      pendientes: filtrados.filter(d => d.estado === 'REGISTRADO').length,
      hoy: filtrados.filter(d => d.fecha_registro && d.fecha_registro.startsWith(hoy)).length
    });
  }, [documentos, filtroFecha]);

  const handleActualizado = useCallback(() => cargarDocumentos(), [cargarDocumentos]);

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
  // ACCIONES RÁPIDAS
  // ============================================
  const handleRecibir = useCallback((derivacion, documento) => {
    setDocVer(null);
    setDocRecibir({ derivacion, documento });
  }, []);

  const handleDevolver = useCallback((derivacion, documento) => {
    setDocVer(null);
    setDocDevolver({ derivacion, documento });
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
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                {canManage ? 'MESA DE PARTES' : 'BANDEJA DE DOCUMENTOS'}
              </h1>
              <p className="text-xs text-gray-500">
                {canManage ? 'Gestión documental' : `Documentos derivados a: ${(userAreas).join(', ')}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0 px-4">

          {/* Stats */}
          {canManage && (
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
              {canManage && (
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
                  <p className="text-sm text-gray-400">No hay documentos</p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {docsPaginados.map((doc) => {
                    const style = ESTADOS[doc.estado] || ESTADOS.REGISTRADO;
                    const derivaciones = doc.derivaciones || [];
                    const todasDevueltas = derivaciones.length > 0 && derivaciones.every(d => d.estado === 'DEVUELTO');
                    const algunaRecibida = derivaciones.some(d => d.estado === 'RECIBIDO' || d.estado === 'DEVUELTO');

                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-lg px-4 py-3 border border-gray-200/60 hover:border-gray-300/80 cursor-pointer transition-colors"
                        onClick={() => setDocVer(doc)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold" style={{ color: COLOR_PRIMARIO }}>{doc.numero}</span>
                          <span className="text-[11px] text-gray-500">{doc.fecha_registro?.split(' ')[0]}</span>
                          {doc.tipo_doc && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">{doc.tipo_doc}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: doc.fuente === 'digital' ? '#EFF6FF' : '#FEF3C7', color: doc.fuente === 'digital' ? '#1D4ED8' : '#B45309' }}>
                            {doc.fuente === 'digital' ? '📧' : '📄'}
                          </span>
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto inline-flex items-center gap-1.5"
                            style={{ backgroundColor: style.bg, color: style.color }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
                            {style.label}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-gray-800 truncate mb-1.5">{doc.asunto || doc.contenido || 'Sin asunto'}</p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                          {doc.procedencia && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} />{doc.procedencia}
                            </span>
                          )}
                          {derivaciones.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Send className="w-3 h-3" strokeWidth={1.5} />
                              {derivaciones.length} área{derivaciones.length > 1 ? 's' : ''}
                              {todasDevueltas && <span className="text-emerald-500">✓</span>}
                              {!todasDevueltas && algunaRecibida && <span className="text-amber-500">●</span>}
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
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: dStyle.bg, color: dStyle.color }}>{dStyle.label}</span>
                                  {d.pase_numero && <span className="text-gray-400">{d.pase_numero}</span>}
                                  
                                  {/* Acciones para el área */}
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
    </div>
  );
};

export default MesaDePartes;
