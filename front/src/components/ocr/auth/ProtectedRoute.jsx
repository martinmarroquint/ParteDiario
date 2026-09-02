// src/components/ocr/auth/ProtectedRoute.jsx
// Componente para proteger rutas en OCR

import React from 'react';
import { useAuth } from './AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, loading, user, hasAnyRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <span className="inline-block w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="mt-4 text-sm text-gray-500 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (roles.length > 0 && !hasAnyRole(roles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-500">!</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acceso Denegado</h2>
          <p className="text-sm text-gray-500">
            No tienes los permisos necesarios para acceder a esta seccion.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Rol actual: {user?.rol || 'sin rol'}
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;