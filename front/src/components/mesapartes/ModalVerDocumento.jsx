// src/components/mesapartes/ModalVerDocumento.jsx
import React from 'react';
import { X, Calendar, FileText, Send, FileCheck } from 'lucide-react';
import { COLOR_PRIMARIO, ESTADOS } from './constantes';

const ModalVerDocumento = ({ documento, onClose, onEditar, onEntregar, onDescargar }) => {
  const estadoStyle = ESTADOS[documento.estado] || ESTADOS.PENDIENTE;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        
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
              {documento.numero && (
                <p className="text-[11px] text-gray-400 mt-0.5">#{documento.numero}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* ETAPA 1: RECEPCIÓN */}
          <div className="mb-5">
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-amber-400" />
              Recepción
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Fecha" value={documento.fecha} />
              <InfoField label="Tipo" value={documento.tipoDoc || documento.tipo_doc} />
              <InfoField label="N° Doc." value={documento.nDocOrigen || documento.n_doc_origen} mono />
              <InfoField label="Fecha Doc." value={documento.fechaDoc || documento.fecha_doc} />
            </div>
            {documento.procedencia && (
              <div className="mt-3">
                <InfoField label="Procedencia" value={documento.procedencia} />
              </div>
            )}
            <div className="mt-3 bg-gray-50 rounded-xl p-3.5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Contenido</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{documento.contenido || 'Sin contenido'}</p>
            </div>
          </div>

          {/* ETAPA 2: DERIVACIÓN */}
          {(documento.docTramite || documento.doc_tramite || documento.areaEntregada || documento.area_entregada) && (
            <div className="mb-5 pt-5 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-400" />
                Derivación
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Doc. Trámite" value={documento.docTramite || documento.doc_tramite} />
                <InfoField label="N° Tramitado" value={documento.nDocTramitado || documento.n_doc_tramitado} />
              </div>
              {(documento.areaEntregada || documento.area_entregada) && (
                <div className="mt-3 px-3 py-2.5 bg-blue-50/50 rounded-xl">
                  <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-0.5">Área destino</p>
                  <p className="text-sm font-medium text-blue-700">{documento.areaEntregada || documento.area_entregada}</p>
                </div>
              )}
            </div>
          )}

          {/* ETAPA 3: RESOLUCIÓN */}
          {(documento.descargo || documento.nDescargo || documento.n_descargo || documento.ht) && (
            <div className="pt-5 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                Resolución
              </h4>
              {documento.descargo && (
                <div className="bg-emerald-50/50 rounded-xl p-3.5 mb-3">
                  <p className="text-[10px] text-emerald-500 uppercase tracking-wider mb-1.5">Descargo</p>
                  <p className="text-sm text-emerald-800 whitespace-pre-wrap leading-relaxed">{documento.descargo}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="N° Descargo" value={documento.nDescargo || documento.n_descargo} />
                <InfoField label="HT" value={documento.ht} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex gap-2">
          {onEditar && documento.estado === 'PENDIENTE' && (
            <button onClick={() => onEditar(documento)} className="flex-1 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200/60 rounded-xl transition-colors">
              Editar
            </button>
          )}
          {documento.estado === 'PENDIENTE' && onEntregar && (
            <button onClick={() => onEntregar(documento)} className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Derivar
            </button>
          )}
          {documento.estado === 'ENTREGADO' && onDescargar && (
            <button onClick={() => onDescargar(documento)} className="flex-1 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center justify-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5" /> Resolver
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 hover:bg-gray-200/60 rounded-xl transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Sub-componente para campos de info
const InfoField = ({ label, value, mono = false }) => (
  <div>
    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
    <p className={`text-sm font-medium text-gray-800 ${mono ? 'font-mono text-[13px]' : ''}`}>
      {value || <span className="text-gray-300 font-normal">—</span>}
    </p>
  </div>
);

export default ModalVerDocumento;
