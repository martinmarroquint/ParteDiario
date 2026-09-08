// src/components/mesapartes/ModalEntregarDocumento.jsx
// Modal de entrega - Usa Dropdown profesional
import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, FileText, Hash, Calendar } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';
import Dropdown from '../ui/Dropdown';

const ModalEntregarDocumento = ({ documento, onClose, onActualizado }) => {
  const [form, setForm] = useState({ docTramite: '', nDocTramitado: '', areaEntregada: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [opcionesBD, setOpcionesBD] = useState({ docsTramite: [], areas: [] });

  useEffect(() => {
    apiClient.get(API_ENDPOINTS.opciones)
      .then(d => {
        setOpcionesBD({
          docsTramite: d.docs_tramite || [],
          areas: d.areas || []
        });
      }).catch(() => {});
  }, []);

  const handleEntregar = async () => {
    if (!form.areaEntregada) return;
    setGuardando(true);
    setError(null);
    try {
      await apiClient.put(API_ENDPOINTS.entregar(documento.id), {
        doc_tramite: form.docTramite,
        n_doc_tramitado: form.nDocTramitado,
        area_entregada: form.areaEntregada,
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      setError(e.message || 'Error al entregar documento');
    } finally { setGuardando(false); }
  };

  const docTramiteOptions = (opcionesBD.docsTramite || []).map(t => ({ value: t, label: t }));
  const areaOptions = (opcionesBD.areas || []).map(t => ({ value: t, label: t }));

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
              Entregar Documento
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Seleccione tipo de trámite y área de destino</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Resumen */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Calendar className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
              <span>{documento.fecha}</span>
            </div>
            {documento.tipo_doc && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <FileText className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                <span>{documento.tipo_doc}</span>
              </div>
            )}
            {documento.n_doc_origen && (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Hash className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                <span>{documento.n_doc_origen}</span>
              </div>
            )}
          </div>
          {documento.contenido && (
            <p className="text-sm font-medium text-gray-700 mt-2 truncate">{documento.contenido}</p>
          )}
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600 flex items-center gap-2">
              <span className="text-red-400">✕</span> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Doc. de Trámite</label>
            <Dropdown
              options={docTramiteOptions}
              value={form.docTramite}
              onChange={v => setForm(p => ({...p, docTramite: v}))}
              placeholder="Seleccionar tipo de trámite"
              searchable
              clearable
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">N° Trámitado</label>
            <input
              type="text"
              value={form.nDocTramitado}
              onChange={e => setForm(p => ({...p, nDocTramitado: e.target.value}))}
              placeholder="Número de documento de trámite"
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Área Entregada <span className="text-red-400">*</span>
            </label>
            <Dropdown
              options={areaOptions}
              value={form.areaEntregada}
              onChange={v => setForm(p => ({...p, areaEntregada: v}))}
              placeholder="Seleccionar área de destino"
              searchable
              clearable
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              El documento pasará de <span className="font-medium">PENDIENTE</span> a <span className="font-medium">ENTREGADO</span>
            </p>
          </div>

          <button 
            onClick={handleEntregar} 
            disabled={guardando || !form.areaEntregada}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-blue-600 hover:bg-blue-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><Send className="w-4 h-4" /> Confirmar Entrega</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEntregarDocumento;
