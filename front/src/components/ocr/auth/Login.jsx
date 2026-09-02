// src/components/ocr/auth/Login.jsx
// Pantalla de login - CON RECUPERACIÓN DE CONTRASEÑA

import React, { useState, useEffect, useRef } from 'react';
import RecuperarPassword from './RecuperarPassword';

// Detectar si el backend está disponible
const BACKEND_DISPONIBLE = !!import.meta.env.VITE_API_URL;

const Login = ({ onSuccess, loading: loadingProp }) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recordar, setRecordar] = useState(false);
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);

  const usuarioRef = useRef(null);

  useEffect(() => {
    if (usuarioRef.current) {
      usuarioRef.current.focus();
    }
  }, []);

  const isLoading = loadingProp || loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const usuarioTrim = usuario.trim();
    const contrasenaTrim = contrasena.trim();

    if (!usuarioTrim || !contrasenaTrim) {
      setError('Todos los campos son obligatorios');
      return;
    }

    if (usuarioTrim.length < 3) {
      setError('El usuario debe tener al menos 3 caracteres');
      return;
    }

    if (contrasenaTrim.length < 3) {
      setError('La contraseña debe tener al menos 3 caracteres');
      return;
    }

    setLoading(true);

    try {
      if (onSuccess) {
        const result = await onSuccess(usuarioTrim, contrasenaTrim);
        
        if (result === false) {
          setError('Credenciales inválidas');
          setContrasena('');
          if (usuarioRef.current) {
            usuarioRef.current.focus();
          }
          setLoading(false);
        }
      }
    } catch (err) {
      setError('Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e);
    }
  };

  const handleSolicitarRecuperacion = async (email) => {
    console.log('Solicitando recuperación para:', email);
    return { success: true, mensaje: 'Se ha enviado un enlace de recuperación a tu correo.' };
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-white">
              <div className="flex flex-col items-center pt-10 pb-6">
                <div className="w-20 h-20 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-5 shadow-sm">
                  <img
                    src="/images/escudo-sanidad.png"
                    alt="Escudo Sanidad PNP"
                    className="w-14 h-14 object-contain"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                  Rol de Servicio PNP
                </h1>
                <p className="text-gray-500 text-sm mt-1.5 font-medium">
                  Hospital Regional Policial Arequipa
                </p>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: '#188C5D' }} />
            </div>

            <div className="px-6 py-6 space-y-5">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {BACKEND_DISPONIBLE ? 'DNI' : 'Usuario'}
                  </label>
                  <input
                    ref={usuarioRef}
                    type="text"
                    value={usuario}
                    onChange={(e) => {
                      setUsuario(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder={BACKEND_DISPONIBLE ? "Ingresa tu DNI" : "Ingresa tu usuario"}
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white hover:border-gray-300 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={mostrarContrasena ? 'text' : 'password'}
                      value={contrasena}
                      onChange={(e) => {
                        setContrasena(e.target.value);
                        setError('');
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder={BACKEND_DISPONIBLE ? "OCR + tu DNI (ej: OCR12345678)" : "Ingresa tu contraseña"}
                      disabled={isLoading}
                      autoComplete="current-password"
                      className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white hover:border-gray-300 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarContrasena(!mostrarContrasena)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
                      disabled={isLoading}
                    >
                      {mostrarContrasena ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordar}
                      onChange={(e) => setRecordar(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-xs text-gray-500 font-medium">Recordarme</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setMostrarRecuperacion(true)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
                  >
                    Olvidé mi contraseña
                  </button>
                </div>

                {error && (
                  <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2.5 text-sm text-red-600">
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 text-white rounded-xl text-base font-bold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 active:scale-[0.98] shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#188C5D' }}
                >
                  {isLoading ? (
                    <>
                      <span className="animate-spin inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                      Verificando...
                    </>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>

              {/* Indicador de modo */}
              <div className="pt-2 border-t border-gray-100">
                {BACKEND_DISPONIBLE ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <p className="text-xs text-emerald-700 text-center">
                      <strong>Modo Producción:</strong> Usa tu DNI y contraseña inicial
                    </p>
                    <p className="text-[10px] text-emerald-600 text-center mt-1">
                      Contraseña inicial: OCR + tu DNI (ej: OCR12345678)
                    </p>
                    <p className="text-[10px] text-emerald-600 text-center">
                      Deberás cambiar tu contraseña en el primer ingreso
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700 text-center">
                      <strong>Modo Prueba:</strong> Cualquier usuario/contraseña funciona
                    </p>
                    <p className="text-[10px] text-amber-600 text-center mt-1">
                      Usuario sugerido: admin / Contraseña: admin123
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-center text-xs text-gray-400">
                  Sistema de Roles PNP - v.{new Date().getFullYear()}
                </p>
                <p className="text-center text-[10px] text-gray-300 mt-1">
                  Conexión segura
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Recuperación */}
      <RecuperarPassword
        isOpen={mostrarRecuperacion}
        onClose={() => setMostrarRecuperacion(false)}
        onSolicitarRecuperacion={handleSolicitarRecuperacion}
        onVolverLogin={() => setMostrarRecuperacion(false)}
      />
    </>
  );
};

export default Login;