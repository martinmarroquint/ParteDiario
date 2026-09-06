// src/components/mesapartes/MesaDePartes.jsx
// Componente principal de Mesa de Partes con listado, filtros y gestión
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, RefreshCw, Plus, Eye, Edit3, Send, FileCheck,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronDown, X, Trash2
} from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { COLOR_PRIMARIO, ESTADOS, API_ENDPOINTS, abbreviateTipo } from './constantes';
import FormularioDocumento from './FormularioDocumento';
import RegistroDocumento from './RegistroDocumento';
import ModalVerDocumento from './ModalVerDocumento';
import ModalEditarDocumento from './ModalEditarDocumento';
import ModalEntregarDocumento from './ModalEntregarDocumento';
import ModalDescargarDocumento from './ModalDescargarDocumento';

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const MesaDePartes = ({ onSalir, esAdmin, esTramite, user }) => {
  // Permissions
  const canRegister = esAdmin || esTramite;
  const canDeliver = esAdmin || esTramite;
  
  // State
  const [documentos, setDocumentos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mensaje, setMensaje] = useState(null);
  
  // Modal states
  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [docVer, setDocVer] = useState(null);
  const [docEditar, setDocEditar] = useState(null);
  const [docEntregar, setDocEntregar] = useState(null);
  const [docDescargar, setDocDescargar] = useState(null);
  
  // Dropdown options
  const [opciones, setOpciones] = useState({ tipos_doc: [], areas: [], docs_tramite: [] });

  // ============================================
  // DATA LOADING
  // ============================================
  
  const cargarDocumentos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const params = {};
      if (filtroEstado) params.estado = filtroEstado;
      if (busqueda.trim()) params.busqueda = busqueda.trim();
      
      const result = await apiClient.get(API_ENDPOINTS.documentos, params);
      setDocumentos(result.documentos || []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
      setError(err.message || 'Error al cargar documentos');
    } finally {
      setCargando(false);
    }
  }, [filtroEstado, busqueda]);

  const cargarOpciones = useCallback(async () => {
    try {
      const result = await apiClient.get(API_ENDPOINTS.opciones);
      setOpciones(result);
    } catch (err) {
      console.error('Error cargando opciones:', err);
    }
  }, []);

  useEffect(() => {
    cargarDocumentos();
  }, [cargarDocumentos]);

  useEffect(() => {
    cargarOpciones();
  }, [cargarOpciones]);

  // ============================================
  // ACTIONS
  // ============================================
  
  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const handleRegistrado = () => {
    setMostrarRegistro(false);
    mostrarMensaje('success', 'Documento registrado correctamente');
    cargarDocumentos();
    cargarOpciones();
  };

  const handleActualizado = () => {
    mostrarMensaje('success', 'Documento actualizado correctamente');
    cargarDocumentos();
  };

  const handleEliminar = async (doc) => {
    if (!confirm(`¿Eliminar documento #${doc.numero}?`)) return;
    try {
      await apiClient.delete(API_ENDPOINTS.documento(doc.id));
      mostrarMensaje('success', 'Documento eliminado');
      cargarDocumentos();
    } catch (err) {
      mostrarMensaje('error', err.message || 'Error al eliminar');
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR_PRIMARIO}15` }}>
                <FileText className="w-5 h-5" style={{ color: COLOR_PRIMARIO }} strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {canRegister ? 'Mesa de Partes' : 'Bandeja de Documentos'}
                </h1>
                <p className="text-xs text-gray-400">
                  {canRegister 
                    ? 'Gestión y distribución de documentos' 
                    : 'Documentos derivados a su área'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={cargarDocumentos}
                disabled={cargando}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
              </button>
              {canRegister && (
                <button
                  onClick={() => setMostrarRegistro(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all active:scale-[0.98]"
                  style={{ backgroundColor: COLOR_PRIMARIO }}
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Nuevo Documento</span>
                </button>
              )}
              {onSalir && (
                <button
                  onClick={onSalir}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Volver"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        
        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex flex-col gap-3">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargarDocumentos()}
                placeholder="Buscar documento..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200/60 rounded-lg text-sm outline-none focus:border-gray-400 transition-colors"
              />
              {busqueda && (
                <button
                  onClick={() => { setBusqueda(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por estado */}
            <div className="flex gap-1.5 bg-gray-100/80 rounded-lg p-1 overflow-x-auto scrollbar-none">
              {[
                { key: '', label: 'Todos' },
                { key: 'PENDIENTE', label: 'Pendientes' },
                { key: 'ENTREGADO', label: 'Derivados' },
                { key: 'RESUELTO', label: 'Resueltos' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFiltroEstado(f.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    filtroEstado === f.key
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                  {f.key && documentos.filter(d => d.estado === f.key).length > 0 && (
                    <span className="ml-1 text-[10px] text-gray-400">
                      {documentos.filter(d => d.estado === f.key).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`p-3 rounded-lg mb-4 flex items-center gap-2 text-sm ${
            mensaje.tipo === 'success' 
              ? 'bg-gray-50 text-gray-700 border border-gray-200/60' 
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {mensaje.tipo === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {mensaje.texto}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={cargarDocumentos}
              className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading */}
        {cargando && documentos.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-12 text-center">
            <Loader2 className="w-8 h-8 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-400">Cargando documentos...</p>
          </div>
        )}

        {/* Lista de documentos */}
        {!cargando && documentos.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">No hay documentos</p>
            <p className="text-xs text-gray-400 mt-1">
              {busqueda || filtroEstado ? 'Intente con otros filtros' : 'Registre su primer documento'}
            </p>
          </div>
        )}

        {/* Cards de documentos */}
        <div className="grid gap-3">
          {documentos.map(doc => (
            <DocumentoCard
              key={doc.id}
              documento={doc}
              onVer={setDocVer}
          onEditar={canRegister ? setDocEditar : null}
          onEntregar={canDeliver ? setDocEntregar : null}
          onDescargar={setDocDescargar}
              onEliminar={esAdmin ? handleEliminar : null}
            />
          ))}
        </div>

        {/* Count */}
        {documentos.length > 0 && (
          <div className="text-center py-4">
            <p className="text-[11px] text-gray-400">
              {documentos.length} documento{documentos.length !== 1 ? 's' : ''}
              {filtroEstado && <span className="ml-1 text-gray-500">· {ESTADOS[filtroEstado]?.label || filtroEstado}</span>}
            </p>
          </div>
        )}
      </div>

      {/* ============================================
          MODALS
          ============================================ */}
      
      {/* Modal Registro */}
      {mostrarRegistro && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4" onClick={() => setMostrarRegistro(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Nuevo Documento</h3>
              <button onClick={() => setMostrarRegistro(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <RegistroDocumento onRegistrado={handleRegistrado} />
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {docVer && (
        <ModalVerDocumento
          documento={docVer}
          onClose={() => setDocVer(null)}
          onEditar={(d) => { setDocVer(null); if (canRegister) setDocEditar(d); }}
          onEntregar={(d) => { setDocVer(null); if (canDeliver) setDocEntregar(d); }}
          onDescargar={(d) => { setDocVer(null); setDocDescargar(d); }}
        />
      )}

      {/* Modal Editar */}
      {docEditar && (
        <ModalEditarDocumento
          documento={docEditar}
          onClose={() => setDocEditar(null)}
          onActualizado={handleActualizado}
        />
      )}

      {/* Modal Entregar */}
      {docEntregar && (
        <ModalEntregarDocumento
          documento={docEntregar}
          onClose={() => setDocEntregar(null)}
          onActualizado={handleActualizado}
        />
      )}

      {/* Modal Descargar */}
      {docDescargar && (
        <ModalDescargarDocumento
          documento={docDescargar}
          onClose={() => setDocDescargar(null)}
          onActualizado={handleActualizado}
        />
      )}
    </div>
  );
};


// ============================================
// CARD DE DOCUMENTO - Diseño moderno y mobile
// ============================================
const DocumentoCard = ({ documento, onVer, onEditar, onEntregar, onDescargar, onEliminar }) => {
  const estado = ESTADOS[documento.estado] || ESTADOS.PENDIENTE;
  const esMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200">
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Info principal */}
          <div className="flex-1 min-w-0">
            {/* Fila superior: badge estado + fecha */}
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full" style={{
                backgroundColor: estado.bg,
                color: estado.color
              }}>
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: estado.dot }} />
                {estado.label}
              </span>
              <span className="text-[10px] text-gray-400 font-medium">{documento.fecha}</span>
            </div>
            
            {/* Tipo doc + N° doc origen */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              {documento.tipo_doc && (
                <span className="text-xs font-semibold text-gray-700 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  {esMobile ? abbreviateTipo(documento.tipo_doc, 16) : abbreviateTipo(documento.tipo_doc, 25)}
                </span>
              )}
              {documento.n_doc_origen && (
                <span className="text-[11px] text-gray-400 font-mono">
                  {documento.n_doc_origen}
                </span>
              )}
            </div>
            
            {/* Contenido */}
            <p className="text-[13px] text-gray-600 line-clamp-2 leading-relaxed">
              {documento.contenido || 'Sin contenido'}
            </p>
            
            {/* Procedencia */}
            {documento.procedencia && (
              <p className="text-[11px] text-gray-400 mt-1.5 truncate">
                {documento.procedencia}
              </p>
            )}

            {/* Etapa 2: Derivación */}
            {documento.area_entregada && (
              <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1.5 bg-blue-50/60 rounded-lg w-fit">
                <Send className="w-3 h-3 text-blue-500 flex-shrink-0" />
                <span className="text-[11px] text-blue-600 truncate max-w-[200px] sm:max-w-none">
                  {documento.area_entregada}
                </span>
              </div>
            )}

            {/* Etapa 3: Resolución */}
            {documento.descargo && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2.5 py-1.5 bg-emerald-50/60 rounded-lg w-fit">
                <FileCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] text-emerald-600 font-medium">Resuelto</span>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <button
              onClick={() => onVer(documento)}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              title="Ver detalle"
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {documento.estado === 'PENDIENTE' && (
              <>
                <button
                  onClick={() => onEditar(documento)}
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Editar"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEntregar(documento)}
                  className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Derivar"
                >
                  <Send className="w-4 h-4" />
                </button>
              </>
            )}
            
            {documento.estado === 'ENTREGADO' && (
              <button
                onClick={() => onDescargar(documento)}
                className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Resolver"
              >
                <FileCheck className="w-4 h-4" />
              </button>
            )}

            {onEliminar && (
              <button
                onClick={() => onEliminar(documento)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default MesaDePartes;
