// src/components/ocr/auth/RecuperarPassword.jsx
// Formulario para solicitar recuperación de contraseña

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle, Mail, ArrowLeft } from 'lucide-react';

const RecuperarPassword = ({ 
  isOpen, 
  onClose, 
  onSolicitarRecuperacion,
  onVolverLogin
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setError('');
      setExito(false);
      setCargando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setCargando(true);

    try {
      const result = await onSolicitarRecuperacion(email.trim());
      
      if (result.success) {
        setExito(true);
        setMensajeExito(result.mensaje || 'Se ha enviado un enlace de recuperación a tu correo electrónico.');
      } else {
        setError(result.error || 'Error al solicitar recuperación');
      }
    } catch (err) {
      setError(err.message || 'Error al solicitar recuperación');
    } finally {
      setCargando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div 
          className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between flex-shrink-0"
          style={{ backgroundColor: '#188C5D' }}
        >
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Recuperar Contraseña</h3>
              <p className="text-[10px] sm:text-xs text-white/70">
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            disabled={cargando}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {!exito ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace para restablecer tu contraseña.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Correo Electrónico <span className="text-red-400">*</span>
                </label>
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@hrpa.pe"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                  disabled={cargando}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#188C5D' }}
                >
                  {cargando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                  ) : (
                    <><Mail className="w-4 h-4" /> Enviar Enlace de Recuperación</>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onVolverLogin}
                  className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Volver al inicio de sesión
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">¡Correo Enviado!</h4>
              <p className="text-sm text-gray-600">{mensajeExito}</p>
              <p className="text-xs text-gray-400 mt-2">Revisa tu bandeja de entrada y sigue las instrucciones.</p>
              <button
                onClick={onVolverLogin}
                className="mt-4 px-6 py-2 text-white rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#188C5D' }}
              >
                Volver al inicio de sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecuperarPassword;