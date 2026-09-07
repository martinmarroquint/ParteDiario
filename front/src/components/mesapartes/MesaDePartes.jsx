// src/components/mesapartes/MesaDePartes.jsx
// Mesa de Partes - Layout original restaurado + Backend FastAPI
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Search, Plus, Eye, Edit2,
  Send, FileCheck, Calendar, User, Inbox,
  X, SlidersHorizontal, ChevronLeft, ChevronRight
} from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { COLOR_PRIMARIO, API_ENDPOINTS } from './constantes';
import RegistroDocumento from './RegistroDocumento';
import ModalVerDocumento from './ModalVerDocumento';
import ModalEditarDocumento from './ModalEditarDocumento';
import ModalEntregarDocumento from './ModalEntregarDocumento';
import ModalDescargarDocumento from './ModalDescargarDocumento';

const REGISTROS_POR_PAGINA = 20;
const normalizarTexto = (t) => (t || '').toLowerCase().trim();

// Estados con colores sutiles
const ESTADOS = {
  TODOS: { label: 'Todos', color: '#6B7280', bg: '#F3F4F6' },
  PENDIENTE: { label: 'Pendiente', color: '#B45309', bg: '#FFFBEB' },
  ENTREGADO: { label: 'Derivado', color: '#1D4ED8', bg: '#EFF6FF' },
  RESUELTO: { label: 'Resuelto', color: '#047857', bg: '#ECFDF5' }
};

const MesaDePartes = ({ onSalir, esAdmin, esTramite, user }) => {
  const canRegister = esAdmin || esTramite;

  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroAvanzado, setFiltroAvanzado] = useState(false);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [pagina, setPagina] = useState(1);
  const [stats, setStats] = useState({ total: 0, hoy: 0, pendientes: 0 });

  const [docVer, setDocVer] = useState(null);
  const [docEditar, setDocEditar] = useState(null);
  const [docEntregar, setDocEntregar] = useState(null);
  const [docDescargar, setDocDescargar] = useState(null);

  // ============================================
  // CARGAR DOCUMENTOS
  // ============================================
  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const result = await apiClient.get(API_ENDPOINTS.documentos);
      const docs = result.documentos || [];
      setDocumentos(docs);

      const hoy = new Date().toISOString().split('T')[0];
      setStats({
        total: docs.length,
        hoy: docs.filter(d => d.fecha === hoy).length,
        pendientes: docs.filter(d => d.estado === 'PENDIENTE').length
      });
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDocumentos(); }, [cargarDocumentos]);

  useEffect(() => { setPagina(1); }, [busqueda, filtroFecha, filtroEstado]);

  const handleRegistrado = useCallback(() => {
    setTimeout(() => cargarDocumentos(), 800);
  }, [cargarDocumentos]);

  const handleActualizado = useCallback(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  // ============================================
  // FILTRADO
  // ============================================
  const docsFiltrados = useMemo(() => {
    return documentos.filter(d => {
      if (filtroEstado !== 'TODOS' && d.estado !== filtroEstado) return false;
      if (busqueda.trim()) {
        const t = normalizarTexto(busqueda);
        if (![d.contenido, d.procedencia, d.tipo_doc, d.n_doc_origen, d.numero, d.area_entregada, d.fecha]
          .some(v => normalizarTexto(v).includes(t))) return false;
      }
      if (filtroFecha && d.fecha !== filtroFecha && d.fecha_doc !== filtroFecha) return false;
      return true;
    });
  }, [documentos, busqueda, filtroFecha, filtroEstado]);

  const totalPaginas = Math.ceil(docsFiltrados.length / REGISTROS_POR_PAGINA);
  const docsPaginados = docsFiltrados.slice((pagina - 1) * REGISTROS_POR_PAGINA, pagina * REGISTROS_POR_PAGINA);

  // ============================================
  // VISTA REGISTRO
  // ============================================
  if (docVer === null && docEditar === null && docEntregar === null && docDescargar === null && documentos.length === 0 && !cargando && !error) {
    // Si no hay documentos y no estamos en ningún modal, mostramos la vista normal
  }

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
                {canRegister ? 'MESA DE PARTES' : 'BANDEJA DE DOCUMENTOS'}
              </h1>
              <p className="text-xs text-gray-500">
                {canRegister ? 'Recepción de Documentos' : 'Documentos derivados a su área'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0 px-4">

          {/* Stats + Filtros */}
          <div className="flex-shrink-0 space-y-4 pt-4">
            {/* Stats */}
            {canRegister && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 border border-gray-200/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Inbox className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                    <span className="text-[10px] text-gray-500 font-medium uppercase">Total</span>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200/60">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
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
            <div className="space-y-2">
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
                {canRegister && (
                  <button
                    onClick={() => setDocVer('nuevo')}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Nuevo
                  </button>
                )}
              </div>

              {/* Estado filters */}
              <div className="flex gap-1.5">
                {Object.entries(ESTADOS).map(([key, style]) => {
                  const activo = filtroEstado === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setFiltroEstado(key)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded-full transition-all ${
                        activo ? 'bg-gray-900 text-white border border-gray-900' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
                      }`}
                      style={!activo && key !== 'TODOS' ? { borderColor: style.color + '40' } : {}}
                    >
                      {style.label}
                    </button>
                  );
                })}
              </div>

              {/* Filtro avanzado fecha */}
              {filtroAvanzado && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200/60 p-2">
                  <Calendar className="w-4 h-4 text-gray-400" strokeWidth={1.5} />
                  <input
                    type="date"
                    value={filtroFecha}
                    onChange={e => setFiltroFecha(e.target.value)}
                    className="flex-1 text-xs outline-none bg-transparent"
                  />
                  {filtroFecha && (
                    <button onClick={() => setFiltroFecha('')} className="text-xs text-gray-400 px-2 py-1">Limpiar</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lista de documentos - SCROLL AQUÍ */}
          <div className="flex-1 min-h-0 mt-3">
            <div className="h-full overflow-y-auto">
              {cargando ? (
                <div className="flex justify-center py-20">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
                </div>
              ) : error ? (
                <div className="text-center py-20">
                  <p className="text-sm text-gray-400">{error}</p>
                  <button onClick={cargarDocumentos} className="mt-3 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
                    Reintentar
                  </button>
                </div>
              ) : docsFiltrados.length === 0 ? (
                <div className="text-center py-20">
                  <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" strokeWidth={1} />
                  <p className="text-sm text-gray-400">No hay documentos</p>
                  <p className="text-xs text-gray-300 mt-1">
                    {busqueda || filtroEstado !== 'TODOS' || filtroFecha ? 'Intente con otros filtros' : 'Registre su primer documento'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 pb-2">
                  {docsPaginados.map((doc) => {
                    const style = ESTADOS[doc.estado] || ESTADOS.PENDIENTE;
                    return (
                      <div
                        key={doc.id}
                        className="bg-white rounded-lg px-4 py-3 border border-gray-200/60 hover:border-gray-300/80 cursor-pointer"
                        onClick={() => setDocVer(doc)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {doc.numero && <span className="text-[11px] font-semibold" style={{ color: COLOR_PRIMARIO }}>#{doc.numero}</span>}
                          {doc.numero && <span className="text-gray-300">-</span>}
                          <span className="text-[11px] text-gray-500">
                            <Calendar className="w-3 h-3 inline mr-1" strokeWidth={1.5} />{doc.fecha}
                          </span>
                          {doc.tipo_doc && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {doc.tipo_doc.length > 18 ? doc.tipo_doc.substring(0, 18) + '…' : doc.tipo_doc}
                            </span>
                          )}

                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto inline-flex items-center gap-1.5"
                            style={{ backgroundColor: style.bg, color: style.color, border: `1.5px solid ${style.color}30` }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.color }} />
                            {style.label}
                          </span>

                          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setDocVer(doc)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Ver">
                              <Eye className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                            {canRegister && (
                              <button onClick={() => setDocEditar(doc)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg" title="Editar">
                                <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                            {doc.estado === 'PENDIENTE' && canRegister && (
                              <button onClick={() => setDocEntregar(doc)} className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Entregar">
                                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                            {doc.estado === 'ENTREGADO' && (
                              <button onClick={() => setDocDescargar(doc)} className="p-1.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Descargar">
                                <FileCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm font-medium text-gray-800 truncate mb-1.5">{doc.contenido || 'Sin contenido'}</p>

                        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
                          {doc.procedencia && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" strokeWidth={1.5} />{doc.procedencia}
                            </span>
                          )}
                          {doc.area_entregada && <span>→ {doc.area_entregada}</span>}
                          {doc.doc_tramite && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{doc.doc_tramite}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Paginación */}
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

      {/* Modal Nuevo Documento */}
      {docVer === 'nuevo' && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={() => setDocVer(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Nuevo Documento</h3>
              <button onClick={() => setDocVer(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <RegistroDocumento onRegistrado={() => { setDocVer(null); handleRegistrado(); }} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {docVer && docVer !== 'nuevo' && (
        <ModalVerDocumento
          documento={docVer}
          onClose={() => setDocVer(null)}
          onEditar={(d) => { setDocVer(null); setDocEditar(d); }}
          onEntregar={(d) => { setDocVer(null); setDocEntregar(d); }}
          onDescargar={(d) => { setDocVer(null); setDocDescargar(d); }}
        />
      )}

      {/* Modal Editar */}
      {docEditar && (
        <ModalEditarDocumento
          documento={docEditar}
          onClose={() => setDocEditar(null)}
          onActualizado={() => { setDocEditar(null); handleActualizado(); }}
        />
      )}

      {/* Modal Entregar */}
      {docEntregar && (
        <ModalEntregarDocumento
          documento={docEntregar}
          onClose={() => setDocEntregar(null)}
          onActualizado={() => { setDocEntregar(null); handleActualizado(); }}
        />
      )}

      {/* Modal Descargar */}
      {docDescargar && (
        <ModalDescargarDocumento
          documento={docDescargar}
          onClose={() => setDocDescargar(null)}
          onActualizado={() => { setDocDescargar(null); handleActualizado(); }}
        />
      )}
    </div>
  );
};

export default MesaDePartes;
