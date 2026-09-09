// src/components/mesapartes/ModalVerDocumento.jsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, Send, FileCheck, ArrowLeft, History, Clock, Loader2 } from 'lucide-react';
import { COLOR_PRIMARIO, ESTADOS, ESTADOS_DERIVACION } from './constantes';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalVerDocumento = ({ documento, onClose, onDerivar, onRecibir, onDevolver, userAreas, canManage }) => {
  const [historial, setHistorial] = useState([]);
  const [cargandoHist, setCargandoHist] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const [tramitando, setTramitando] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [estadoFinal, setEstadoFinal] = useState('RESUELTO');

  const estadoStyle = ESTADOS[documento.estado] || ESTADOS.REGISTRADO;
  const derivaciones = documento.derivaciones || [];
  const todasDevueltas = derivaciones.length > 0 && derivaciones.every(d => d.estado === 'DEVUELTO');
  const puedeDerivar = canManage && (documento.estado === 'REGISTRADO');
  const puedeTramitar = canManage && (documento.estado === 'DERIVADO') && todasDevueltas;
  const puedeCerrar = canManage && documento.estado === 'TRAMITADO';

  const cargarHistorial = async () => {
    if (showHist) { setShowHist(false); return; }
    setCargandoHist(true);
    try {
      const result = await apiClient.get(API_ENDPOINTS.historial(documento.id));
      setHistorial(result.historial || []);
      setShowHist(true);
    } catch(e) { console.error(e); }
    finally { setCargandoHist(false); }
  };

  const handleTramitar = async () => {
    setTramitando(true);
    try {
      await apiClient.post(API_ENDPOINTS.tramitar, { documento_id: documento.id });
      onClose();
      window.location.reload();
    } catch(e) { alert('Error: ' + e.message); }
    finally { setTramitando(false); }
  };

  const handleCerrar = async () => {
    setCerrando(true);
    try {
      await apiClient.post(API_ENDPOINTS.cerrar, { documento_id: documento.id, estado_final: estadoFinal });
      onClose();
      window.location.reload();
    } catch(e) { alert('Error: ' + e.message); }
    finally { setCerrando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${COLOR_PRIMARIO}12` }}>
              <FileText className="w-5 h-5" style={{ color: COLOR_PRIMARIO }} strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900">Detalle</h3>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: estadoStyle.bg, color: estadoStyle.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: estadoStyle.dot }} />
                  {estadoStyle.label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">{documento.numero}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          
          {/* Recepción */}
          <div>
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              Recepción
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Fecha registro" value={documento.fecha_registro} />
              <InfoField label="Tipo" value={documento.tipo_doc} />
              <InfoField label="N° Doc." value={documento.n_doc_origen} mono />
              <InfoField label="Fecha Doc." value={documento.fecha_doc} />
              <InfoField label="Fuente" value={documento.fuente === 'digital' ? '📧 Digital' : '📄 Físico'} />
              <InfoField label="Creado por" value={documento.creado_por} />
            </div>
            {documento.procedencia && <div className="mt-3"><InfoField label="Procedencia" value={documento.procedencia} /></div>}
            <div className="mt-3 bg-gray-50 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Asunto</p>
              <p className="text-sm font-medium text-gray-800">{documento.asunto || '—'}</p>
            </div>
            {documento.contenido && (
              <div className="mt-3 bg-gray-50 rounded-xl p-3.5">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Contenido</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{documento.contenido}</p>
              </div>
            )}
          </div>

          {/* Derivaciones */}
          {derivaciones.length > 0 && (
            <div className="pt-5 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-400" />
                Derivaciones ({derivaciones.length})
              </h4>
              <div className="space-y-2">
                {derivaciones.map(d => {
                  const ds = ESTADOS_DERIVACION[d.estado] || ESTADOS_DERIVACION.DERIVADO;
                  return (
                    <div key={d.id} className="bg-gray-50 rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-800">{d.area_destino}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: ds.bg, color: ds.color }}>{ds.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-400">Pase:</span> <span className="font-medium">{d.pase_numero}</span></div>
                        <div><span className="text-gray-400">Derivado:</span> <span className="font-medium">{d.fecha_derivacion?.split(' ')[1] || d.fecha_derivacion}</span></div>
                        {d.recibido_por && <div><span className="text-gray-400">Recibido por:</span> <span className="font-medium">{d.recibido_por}</span></div>}
                        {d.fecha_recepcion && <div><span className="text-gray-400">Recibido:</span> <span className="font-medium">{d.fecha_recepcion?.split(' ')[1]}</span></div>}
                      </div>
                      {d.estado === 'DEVUELTO' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Respuesta:</p>
                          <p className="text-sm text-gray-700">{d.descargo}</p>
                          {d.n_descargo && <p className="text-xs text-gray-400 mt-1">N° {d.n_descargo}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cierre */}
          {documento.estado_final && (
            <div className="pt-5 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Cierre
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Estado final" value={documento.estado_final} />
                <InfoField label="Fecha cierre" value={documento.fecha_cierre} />
              </div>
            </div>
          )}

          {/* Historial */}
          <div className="pt-5 border-t border-gray-100">
            <button onClick={cargarHistorial} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700">
              <History className="w-3.5 h-3.5" strokeWidth={1.5} />
              {cargandoHist ? 'Cargando...' : showHist ? 'Ocultar historial' : 'Ver historial completo'}
            </button>
            {showHist && historial.length > 0 && (
              <div className="mt-3 space-y-2">
                {historial.map(h => (
                  <div key={h.id} className="flex items-start gap-3 text-xs">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-gray-300 mt-1" />
                      <div className="w-px h-full bg-gray-200 min-h-[20px]" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-700">{h.accion}</span>
                        <span className="text-gray-400">→ {h.estado_nuevo}</span>
                      </div>
                      <p className="text-gray-400 mt-0.5">{h.realizado_por} · {h.fecha}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex flex-wrap gap-2">
          {puedeDerivar && (
            <button onClick={() => onDerivar?.(documento)} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Derivar
            </button>
          )}
          {puedeTramitar && (
            <button onClick={handleTramitar} disabled={tramitando} className="flex-1 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
              {tramitando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
              Tramitar
            </button>
          )}
          {puedeCerrar && (
            <div className="flex-1 flex gap-2">
              <select value={estadoFinal} onChange={e => setEstadoFinal(e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2">
                <option value="RESUELTO">Resuelto</option>
                <option value="NO_RESUELTO">No Resuelto</option>
              </select>
              <button onClick={handleCerrar} disabled={cerrando} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                {cerrando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Cerrar
              </button>
            </div>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-200/60 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const InfoField = ({ label, value, mono = false }) => (
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-medium text-gray-800 ${mono ? 'font-mono text-[13px]' : ''}`}>
      {value || <span className="text-gray-300 font-normal">—</span>}
    </p>
  </div>
);

export default ModalVerDocumento;
