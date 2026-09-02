// src/components/ocr/auth/ModalCambiarPassword.jsx
// Modal para cambiar contraseña del usuario autenticado

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle, Key } from 'lucide-react';

const ModalCambiarPassword = ({ 
  isOpen, 
  onClose, 
  onCambiarPassword,
  usuarioNombre = '',
  loading = false
}) => {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmPassword('');
      setError('');
      setExito(false);
      setGuardando(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordActual || passwordActual.length < 3) {
      setError('La contraseña actual es obligatoria');
      return;
    }

    if (!passwordNueva || passwordNueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordNueva !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (passwordNueva === passwordActual) {
      setError('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setGuardando(true);

    try {
      const result = await onCambiarPassword(passwordActual, passwordNueva);
      
      if (result.success) {
        setExito(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setGuardando(false);
    }
  };

  const generarPasswordAutomatica = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPasswordNueva(result);
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
            <Key className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">Cambiar Contraseña</h3>
              <p className="text-[10px] sm:text-xs text-white/70 truncate">
                {usuarioNombre || 'Usuario'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            disabled={guardando}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Contraseña Actual <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={mostrarPassword ? 'text' : 'password'}
                value={passwordActual}
                onChange={e => setPasswordActual(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
                className="w-full px-3 py-2.5 pr-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white"
                disabled={guardando || exito}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                {mostrarPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nueva Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={passwordNueva}
                onChange={e => setPasswordNueva(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 pr-20 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono"
                disabled={guardando || exito}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={generarPasswordAutomatica}
                  className="p-1.5 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 text-xs font-medium"
                >
                  Generar
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
              disabled={guardando || exito}
            />
          </div>

          {/* Mensajes */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {exito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Contraseña actualizada exitosamente</span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || exito}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg flex items-center gap-2"
              style={{ backgroundColor: '#188C5D' }}
            >
              {guardando ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Actualizando...</>
              ) : (
                <><Key className="w-4 h-4" /> Cambiar Contraseña</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalCambiarPassword;