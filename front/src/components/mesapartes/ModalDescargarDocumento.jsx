// src/components/mesapartes/ModalDescargarDocumento.jsx
// Modal de resolución - Etapa 3
import React, { useState } from 'react';
import { X, FileCheck, Loader2, Calendar, FileText, Hash, User } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalDescargarDocumento = ({ documento, onClose, onActualizado }) => {
  const [form, setForm] = useState({ descargo: '', nDescargo: '' });
  const [guardando, setGuardando] = useState(false);

  const handleDescargar = async () => {
    setGuardando(true);
    try {
      await apiClient.put(API_ENDPOINTS.descargar(documento.id), {
        descargo: form.descargo,
        n_descargo: form.nDescargo,
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      console.error('Error:', e);
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              Registrar Descargo
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Registre la respuesta o devolución del área</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        {/* Resumen del documento */}
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
          {documento.area_entregada && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-blue-600">
              <User className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Entregado a: <span className="font-medium">{documento.area_entregada}</span></span>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Descargo</label>
            <textarea 
              value={form.descargo} 
              onChange={e => setForm(p => ({...p, descargo: e.target.value}))} 
              placeholder="Describa el descargo o respuesta recibida del área..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 resize-none"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">N° Descargo</label>
            <input 
              type="text" 
              value={form.nDescargo} 
              onChange={e => setForm(p => ({...p, nDescargo: e.target.value}))} 
              placeholder="Número de documento de descargo" 
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400" 
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              El documento pasará de <span className="font-medium">ENTREGADO</span> a <span className="font-medium">RESUELTO</span>
            </p>
          </div>

          <button 
            onClick={handleDescargar} 
            disabled={guardando}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><FileCheck className="w-4 h-4" /> Registrar Descargo</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDescargarDocumento;
