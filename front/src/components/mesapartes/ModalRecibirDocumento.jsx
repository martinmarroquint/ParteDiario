// src/components/mesapartes/ModalRecibirDocumento.jsx
import React, { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import apiClient from '../ocr/services/apiClient';
import { API_ENDPOINTS } from './constantes';

const ModalRecibirDocumento = ({ derivacion, documento, onClose, onActualizado }) => {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  const handleRecibir = async () => {
    setGuardando(true);
    setError(null);
    try {
      await apiClient.post(API_ENDPOINTS.recibir, {
        derivacion_id: derivacion.id
      });
      onActualizado?.();
      onClose();
    } catch(e) {
      setError(e.message || 'Error al recibir');
    } finally { setGuardando(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              Recibir Documento
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Confirme que recibió el documento</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
              ✕ {error}
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Documento:</span>
              <span className="font-medium text-gray-800">{documento?.numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Asunto:</span>
              <span className="font-medium text-gray-800 truncate ml-2">{documento?.asunto || documento?.contenido}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Pase:</span>
              <span className="font-medium text-gray-800">{derivacion?.pase_numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Derivado por:</span>
              <span className="font-medium text-gray-800">{derivacion?.derivado_por}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Al confirmar, se registrará la fecha y hora de recepción
            </p>
          </div>

          <button 
            onClick={handleRecibir} 
            disabled={guardando}
            className="w-full py-2.5 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 bg-amber-600 hover:bg-amber-700"
          >
            {guardando ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
            ) : (
              <><CheckCircle className="w-4 h-4" /> Confirmar Recepción</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalRecibirDocumento;
