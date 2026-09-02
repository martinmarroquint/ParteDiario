// src/components/ocr/auth/ResetearPassword.jsx
// Formulario para establecer nueva contraseña con token de recuperación

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Key, Shield } from 'lucide-react';

const ResetearPassword = ({ 
  isOpen, 
  onClose, 
  onResetearPassword,
  token,
  email = ''
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [tokenValido, setTokenValido] = useState(null);
  const [verificando, setVerificando] = useState(true);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && token) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setExito(false);
      setCargando(false);
      setVerificando(true);
      setTokenValido(null);
      
      // Verificar token
      verificarToken();
    }
  }, [isOpen, token]);

  const verificarToken = async () => {
    try {
      // En producción, llamar al endpoint de verificación
      // const result = await authService.verificarTokenRecuperacion(token);
      // setTokenValido(result.valid);
      
      // Simulación para pruebas
      setTimeout(() => {
        setTokenValido(true);
        setVerificando(false);
        if (inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 100);
        }
      }, 800);
    } catch (error) {
      setTokenValido(false);
      setVerificando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setCargando(true);

    try {
      const result = await onResetearPassword(token, password);
      
      if (result.success) {
        setExito(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Error al restablecer la contraseña');
      }
    } catch (err) {
      setError(err.message || 'Error al restablecer la contraseña');
    } finally {
      setCargando(false);
    }
  };

  const generarPasswordAutomatica = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setConfirmPassword(result);
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
            <Shield className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Restablecer Contraseña</h3>
              <p className="text-[10px] sm:text-xs text-white/70">
                {email ? `Usuario: ${email}` : 'Ingresa tu nueva contraseña'}
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
          {verificando ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin mb-4" style={{ color: '#188C5D' }} />
              <p className="text-sm text-gray-500">Verificando enlace de recuperación...</p>
            </div>
          ) : tokenValido === false ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">Enlace Inválido</h4>
              <p className="text-sm text-gray-600">
                El enlace de recuperación ha expirado o no es válido.
              </p>
              <p className="text-xs text-gray-400 mt-2">Solicita un nuevo enlace de recuperación.</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 text-white rounded-xl text-sm font-bold"
                style={{ backgroundColor: '#188C5D' }}
              >
                Cerrar
              </button>
            </div>
          ) : exito ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">¡Contraseña Restablecida!</h4>
              <p className="text-sm text-gray-600">Tu contraseña ha sido actualizada exitosamente.</p>
              <p className="text-xs text-gray-400 mt-2">Ahora puedes iniciar sesión con tu nueva contraseña.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700">
                  Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
                </p>
              </div>

              {/* Nueva Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-3 py-2.5 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono"
                    disabled={cargando}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={generarPasswordAutomatica}
                      className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 text-xs font-medium"
                    >
                      Generar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarPassword(!mostrarPassword)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Confirmar Contraseña <span className="text-red-400">*</span>
                </label>
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirma la nueva contraseña"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono"
                  disabled={cargando}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> Restableciendo...</>
                  ) : (
                    <><Key className="w-4 h-4" /> Restablecer Contraseña</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetearPassword;