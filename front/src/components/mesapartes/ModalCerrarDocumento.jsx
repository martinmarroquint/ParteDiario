// src/components/mesapartes/ModalCerrarDocumento.jsx
import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalCerrarDocumento = ({ documento, onClose, onActualizado }) => {
  const [form, setForm] = useState({ contenido: '', estadoFinal: 'RESUELTO' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleCerrar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.cerrar, {
        documento_id: documento.id,
        contenido: form.contenido,
        estado_final: form.estadoFinal
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      setError(e.message || 'Error al cerrar');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              Cerrar Documento
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Registrar resolucion y cerrar</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-700 truncate">{documento?.asunto || documento?.contenido}</p>
          <p className="text-xs text-gray-400 mt-0.5">{documento?.numero}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Estado final */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Estado final</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(p => ({...p, estadoFinal: 'RESUELTO'}))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.estadoFinal === 'RESUELTO'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                Resuelto
              </button>
              <button
                type="button"
                onClick={() => setForm(p => ({...p, estadoFinal: 'NO_RESUELTO'}))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                  form.estadoFinal === 'NO_RESUELTO'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                No Resuelto
              </button>
            </div>
          </div>

          {/* Contenido de la resolucion */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Documento de resolucion
            </label>
            <textarea
              value={form.contenido}
              onChange={e => setForm(p => ({...p, contenido: e.target.value}))}
              placeholder="Describa con que documento o accion se resolvio..."
              rows={4}
              className="w-full px-3 py-2.5 border border-gray-200/60 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 outline-none transition-all bg-white focus:border-gray-400 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="text-xs text-emerald-700">
              Se creara un documento de resolucion con numeracion correlativa y el documento quedara <span className="font-medium">CERRADO</span>
            </p>
          </div>

          <button 
            onClick={handleCerrar} 
            disabled={guardando}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-emerald-600 hover:bg-emerald-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Cerrar Documento</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCerrarDocumento;
