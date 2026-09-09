// src/components/mesapartes/ModalDevolverDocumento.jsx
import React, { useState } from 'react';
import { X, ArrowLeft, Loader2 } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalDevolverDocumento = ({ derivacion, documento, onClose, onActualizado }) => {
  const [form, setForm] = useState({ descargo: '', nDescargo: '', ht: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleDevolver = async () => {
    if (!form.descargo.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.devolver, {
        derivacion_id: derivacion.id,
        descargo: form.descargo,
        n_descargo: form.nDescargo,
        ht: form.ht
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      setError(e.message || 'Error al devolver');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              Devolver a Mesa de Partes
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Registre la respuesta del área</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700 truncate">{documento?.asunto || documento?.contenido}</p>
          <p className="text-xs text-gray-400 mt-0.5">{documento?.numero} · Pase: {derivacion?.pase_numero}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              ✕ {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Respuesta / Descargo <span className="text-red-400">*</span>
            </label>
            <textarea 
              value={form.descargo} 
              onChange={e => setForm(p => ({...p, descargo: e.target.value}))} 
              placeholder="Describa la respuesta o acción realizada..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 resize-none"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">N° Descargo</label>
              <input 
                type="text" 
                value={form.nDescargo} 
                onChange={e => setForm(p => ({...p, nDescargo: e.target.value}))} 
                placeholder="Ej: DG-001/2026"
                className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400" 
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">HT</label>
              <input 
                type="text" 
                value={form.ht} 
                onChange={e => setForm(p => ({...p, ht: e.target.value}))} 
                placeholder="Trámite interno"
                className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400" 
              />
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              El documento volverá a <span className="font-medium">Mesa de Partes</span> para su trámite
            </p>
          </div>

          <button 
            onClick={handleDevolver} 
            disabled={guardando || !form.descargo.trim()}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><ArrowLeft className="w-4 h-4" /> Devolver a Mesa de Partes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalDevolverDocumento;
