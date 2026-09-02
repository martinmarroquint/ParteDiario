// src/components/ocr/ModalFrancosInvalidos.jsx
// Modal que muestra trabajadores con 3 o mas francos consecutivos
// Permite hacer clic para ir a la fila del trabajador

import React, { useMemo } from 'react';
import { X, AlertTriangle, ArrowRight, User } from 'lucide-react';

const ModalFrancosInvalidos = ({ isOpen, onClose, francosInvalidos, personal, onIrAFila }) => {
  const trabajadores = useMemo(() => {
    if (!francosInvalidos || !personal) return [];
    
    return Object.entries(francosInvalidos).map(([empId, infracciones]) => {
      const emp = personal.find(p => p.id === Number(empId));
      return {
        id: Number(empId),
        nombre: emp?.nombre || `ID: ${empId}`,
        grado: emp?.grado || '',
        area: emp?.area || '',
        infracciones: infracciones.map(inf => ({
          inicio: inf.inicio,
          fin: inf.fin,
          cantidad: inf.cantidad,
          dias: inf.dias || []
        }))
      };
    }).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [francosInvalidos, personal]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-red-50 border-b-2 border-red-200 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-800">
                Francos Consecutivos ({trabajadores.length} trabajadores)
              </h3>
              <p className="text-sm text-red-600">
                Maximo permitido: 2 francos consecutivos
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-red-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {trabajadores.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No hay trabajadores con francos consecutivos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trabajadores.map(trab => (
                <div 
                  key={trab.id}
                  className="border border-red-200 rounded-xl p-4 hover:bg-red-50 transition-colors cursor-pointer group"
                  onClick={() => onIrAFila(trab.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                        <User className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {trab.grado && <span className="text-gray-500 mr-2">{trab.grado}</span>}
                          {trab.nombre}
                        </p>
                        <p className="text-sm text-gray-500">{trab.area}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  
                  {/* Infracciones */}
                  <div className="mt-3 space-y-2">
                    {trab.infracciones.map((inf, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-mono text-xs font-bold">
                          {inf.cantidad} francos
                        </span>
                        <span className="text-gray-600">
                          Dia {inf.inicio} al {inf.fin}
                        </span>
                        {inf.dias && inf.dias.length > 0 && (
                          <span className="text-gray-400 text-xs">
                            (dias: {inf.dias.join(', ')})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Haz clic en un trabajador para ir a su fila en la tabla
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalFrancosInvalidos;
