// src/components/ocr/admin/ModalResetPasswordOCR.jsx
// Modal para resetear contraseña de usuario OCR

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

const ModalResetPasswordOCR = ({ isOpen, onClose, onGuardar, usuario }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const passwordRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setExito(false);
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const generarPasswordAutomatica = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
    setConfirmPassword(result);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setGuardando(true);

    try {
      await onGuardar(usuario.id, password);
      setExito(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Error al resetear contraseña');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen || !usuario) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="px-4 py-3 sm:px-5 sm:py-4 text-white flex items-center justify-between"
          style={{ backgroundColor: '#188C5D' }}
        >
          <div>
            <h3 className="font-bold text-sm sm:text-base">Resetear Contraseña</h3>
            <p className="text-[10px] sm:text-xs text-white/70">{usuario.nombre}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700">
              <strong>Usuario:</strong> {usuario.usuario}
            </p>
            <p className="text-sm text-amber-700">
              <strong>Rol:</strong> {usuario.rol}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Nueva Contraseña <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 pr-24 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono"
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

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Confirmar Contraseña <span className="text-red-400">*</span>
            </label>
            <input
              type={mostrarPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Confirma la contraseña"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 bg-white font-mono"
              disabled={guardando || exito}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {exito && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">Contraseña restablecida exitosamente</span>
            </div>
          )}

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
                <><Loader2 className="w-4 h-4 animate-spin" /> Restableciendo...</>
              ) : (
                <><Key className="w-4 h-4" /> Restablecer</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalResetPasswordOCR;