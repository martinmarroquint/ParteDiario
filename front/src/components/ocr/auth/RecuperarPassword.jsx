// src/components/ocr/auth/RecuperarPassword.jsx
// Modal informativo: contactar al encargado para recuperar contraseña

import React, { useEffect, useRef } from 'react';
import { X, Shield, ArrowLeft, Phone, MessageSquare } from 'lucide-react';

const RecuperarPassword = ({ 
  isOpen, 
  onClose, 
  onVolverLogin 
}) => {
  const closedRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      closedRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div 
          className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between"
          style={{ backgroundColor: '#188C5D' }}
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Recuperar Contraseña</h3>
              <p className="text-[10px] sm:text-xs text-white/70">
                Contacta al administrador del sistema
              </p>
            </div>
          </div>
          <button
            ref={closedRef}
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 font-medium mb-2">
              Para recuperar tu contraseña, comunícate directamente con el encargado del sistema.
            </p>
            <p className="text-xs text-blue-600">
              El administrador podrá restablecer tu acceso de forma segura.
            </p>
          </div>

          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Encargado del Sistema
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">Administrador OCR</p>
                <p className="text-xs text-gray-500">Hospital Regional Policial Arequipa</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              ref={closedRef}
              onClick={onVolverLogin}
              className="w-full py-2.5 text-white rounded-xl text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: '#188C5D' }}
            >
              <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecuperarPassword;
