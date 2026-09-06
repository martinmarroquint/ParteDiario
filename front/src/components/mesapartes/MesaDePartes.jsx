// src/components/mesapartes/MesaDePartes.jsx
// Componente principal de Mesa de Partes con listado, filtros y gestión
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Search, Filter, RefreshCw, Plus, Eye, Edit3, Send, FileCheck,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronDown, X, Trash2
} from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { COLOR_PRIMARIO, ESTADOS, API_ENDPOINTS } from './constantes';
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
    <div className="min-h-screen bg-gray-50">
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
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargarDocumentos()}
                placeholder="Buscar por contenido, tipo, procedencia..."
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
            <div className="flex gap-2">
              {['', 'PENDIENTE', 'ENTREGADO', 'RESUELTO'].map(estado => (
                <button
                  key={estado}
                  onClick={() => setFiltroEstado(estado)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    filtroEstado === estado
                      ? 'text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={filtroEstado === estado ? {
                    backgroundColor: estado ? ESTADOS[estado]?.color : COLOR_PRIMARIO
                  } : {}}
                >
                  {estado || 'Todos'}
                  {estado && (
                    <span className="ml-1.5 text-[10px] opacity-80">
                      {documentos.filter(d => d.estado === estado).length || ''}
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
            <p className="text-xs text-gray-400">
              {documentos.length} documento{documentos.length !== 1 ? 's' : ''}
              {filtroEstado && ` · ${filtroEstado}`}
              {busqueda && ` · "${busqueda}"`}
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
// CARD DE DOCUMENTO
// ============================================
const DocumentoCard = ({ documento, onVer, onEditar, onEntregar, onDescargar, onEliminar }) => {
  const estado = ESTADOS[documento.estado] || ESTADOS.PENDIENTE;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md" style={{
              backgroundColor: `${COLOR_PRIMARIO}15`,
              color: COLOR_PRIMARIO
            }}>
              #{documento.numero || documento.id}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{
              backgroundColor: estado.bg,
              color: estado.color
            }}>
              {estado.label}
            </span>
            <span className="text-[10px] text-gray-400">{documento.fecha}</span>
          </div>
          
          <div className="flex items-center gap-2 mb-1">
            {documento.tipo_doc && (
              <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {documento.tipo_doc}
              </span>
            )}
            {documento.n_doc_origen && (
              <span className="text-xs text-gray-400">
                Doc: {documento.n_doc_origen}
              </span>
            )}
          </div>
          
          <p className="text-sm text-gray-700 line-clamp-2 mt-1">
            {documento.contenido || 'Sin contenido'}
          </p>
          
          {documento.procedencia && (
            <p className="text-xs text-gray-400 mt-1">De: {documento.procedencia}</p>
          )}

          {/* Etapa 2 info */}
          {documento.area_entregada && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
              <Send className="w-3 h-3" />
              <span>Entregado a: <span className="font-medium">{documento.area_entregada}</span></span>
            </div>
          )}

          {/* Etapa 3 info */}
          {documento.descargo && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600">
              <FileCheck className="w-3 h-3" />
              <span className="font-medium">Descargo registrado</span>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onVer(documento)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                className="p-2 text-white hover:opacity-90 rounded-lg transition-colors"
                style={{ backgroundColor: '#2563EB' }}
                title="Entregar"
              >
                <Send className="w-4 h-4" />
              </button>
            </>
          )}
          
          {documento.estado === 'ENTREGADO' && (
            <button
              onClick={() => onDescargar(documento)}
              className="p-2 text-white hover:opacity-90 rounded-lg transition-colors"
              style={{ backgroundColor: '#059669' }}
              title="Registrar descargo"
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
  );
};


export default MesaDePartes;
