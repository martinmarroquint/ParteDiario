// src/components/mesapartes/ModalVerDocumento.jsx
import React from 'react';
import { X, Hash, Calendar, FileText, User, Clock, Send, ArrowUpRight } from 'lucide-react';
import { COLOR_PRIMARIO, ESTADOS } from './constantes';

const ModalVerDocumento = ({ documento, onClose, onEditar, onEntregar, onDescargar }) => {
  const estadoStyle = ESTADOS[documento.estado] || ESTADOS.PENDIENTE;

  return (
    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              Documento
              <span className="px-2 py-0.5 rounded-md text-sm font-semibold" style={{backgroundColor: `${COLOR_PRIMARIO}15`, color: COLOR_PRIMARIO}}>
                #{documento.numero}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{backgroundColor: estadoStyle.bg, color: estadoStyle.color}}>
                {estadoStyle.label}
              </span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Detalle del registro</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* ETAPA 1: RECEPCIÓN */}
          <div className="mb-4">
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Etapa 1: Recepción
            </h4>
            <div className="space-y-3">
              <div><p className="text-[10px] text-gray-400 uppercase">Fecha</p><p className="text-sm font-medium text-gray-800">{documento.fecha || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Tipo de Documento</p><p className="text-sm font-medium text-gray-800">{documento.tipoDoc || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">N° Doc. Origen</p><p className="text-sm font-medium text-gray-800">{documento.nDocOrigen || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Fecha Doc.</p><p className="text-sm font-medium text-gray-800">{documento.fechaDoc || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 uppercase">Procedencia</p><p className="text-sm font-medium text-gray-800">{documento.procedencia || '-'}</p></div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase mb-1">Contenido</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{documento.contenido || 'Sin contenido'}</p>
              </div>
            </div>
          </div>

          {/* ETAPA 2: DERIVACIÓN (si existe) */}
          {(documento.docTramite || documento.areaEntregada) && (
            <div className="mb-4 pt-4 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Etapa 2: Derivación
              </h4>
              <div className="space-y-3">
                {documento.docTramite && <div><p className="text-[10px] text-gray-400 uppercase">Doc. de Trámite</p><p className="text-sm font-medium text-gray-800">{documento.docTramite}</p></div>}
                {documento.nDocTramitado && <div><p className="text-[10px] text-gray-400 uppercase">N° Doc. Tramitado</p><p className="text-sm font-medium text-gray-800">{documento.nDocTramitado}</p></div>}
                {documento.areaEntregada && <div><p className="text-[10px] text-gray-400 uppercase">Area Entregada</p><p className="text-sm font-medium text-gray-800">{documento.areaEntregada}</p></div>}
              </div>
            </div>
          )}

          {/* ETAPA 3: RESOLUCIÓN (si existe) */}
          {(documento.descargo || documento.nDescargo || documento.ht) && (
            <div className="pt-4 border-t border-gray-100">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Etapa 3: Resolución
              </h4>
              <div className="space-y-3">
                {documento.descargo && <div className="bg-gray-50 rounded-lg p-3"><p className="text-[10px] text-gray-400 uppercase mb-1">Descargo</p><p className="text-sm text-gray-800 whitespace-pre-wrap">{documento.descargo}</p></div>}
                {documento.nDescargo && <div><p className="text-[10px] text-gray-400 uppercase">N° Descargo</p><p className="text-sm font-medium text-gray-800">{documento.nDescargo}</p></div>}
                {documento.ht && <div><p className="text-[10px] text-gray-400 uppercase">HT</p><p className="text-sm font-medium text-gray-800">{documento.ht}</p></div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex gap-2">
          {onEditar && documento.estado === 'PENDIENTE' && (
            <button onClick={() => onEditar(documento)} className="flex-1 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              Editar
            </button>
          )}
          {documento.estado === 'PENDIENTE' && onEntregar && (
            <button onClick={() => onEntregar(documento)} className="flex-1 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" /> Entregar
            </button>
          )}
          {documento.estado === 'ENTREGADO' && onDescargar && (
            <button onClick={() => onDescargar(documento)} className="flex-1 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Descargar
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalVerDocumento;