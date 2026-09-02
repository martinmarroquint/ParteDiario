// src/components/ocr/auth/AuthContext.jsx
// Contexto de autenticacion independiente para OCR

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const TOKEN_KEY = 'ocr_auth_token';
const USER_KEY = 'ocr_user_data';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);

  const clearAuthData = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
    setRequiresPasswordChange(false);
  }, []);

  const verifySession = useCallback(async (storedToken) => {
    try {
      const response = await authService.verifyToken(storedToken);

      if (response.success && response.usuario) {
        const userData = response.usuario;
        
        // Normalizar datos del usuario
        const normalizedUser = {
          ...userData,
          rol: userData.roles?.includes(4) ? 'admin' 
            : userData.roles?.includes(3) ? 'jefe_division'
            : userData.roles?.includes(2) ? 'jefe_departamento'
            : userData.roles?.includes(1) ? 'jefe_area'
            : 'usuario',
          rol_principal: userData.roles?.length ? Math.max(...userData.roles) : 0,
        };

        setUser(normalizedUser);
        setToken(storedToken);
        setRequiresPasswordChange(userData.requiere_cambio_password || false);

        localStorage.setItem(TOKEN_KEY, storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

        return true;
      } else {
        // Token invalido del backend - intentar recuperar de localStorage
        console.warn('Token rechazado por backend, intentando recuperar de localStorage');
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setToken(storedToken);
            setRequiresPasswordChange(userData.requiereCambio || userData.requiere_cambio_password || false);
            return true;
          } catch {}
        }
        clearAuthData();
        return false;
      }
    } catch (error) {
      // Error de conexion u otro error - mantener datos locales
      console.warn('Error verificando sesion, usando datos locales:', error.message);
      
      // Intentar recuperar datos del usuario del localStorage
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setToken(storedToken);
          setRequiresPasswordChange(userData.requiereCambio || userData.requiere_cambio_password || false);
          return true;
        } catch {}
      }
      
      clearAuthData();
      return false;
    }
  }, [clearAuthData]);

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      setError(null);

      const storedToken = localStorage.getItem(TOKEN_KEY);

      if (storedToken) {
        await verifySession(storedToken);
      }

      setLoading(false);
    };

    initAuth();
  }, [verifySession]);

  const login = async (usuario, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(usuario, password);

      if (response.success) {
        const { token, usuario: userData } = response;

        // Normalizar datos del usuario
        const normalizedUser = {
          ...userData,
          rol: userData.roles?.includes(4) ? 'admin' 
            : userData.roles?.includes(3) ? 'jefe_division'
            : userData.roles?.includes(2) ? 'jefe_departamento'
            : userData.roles?.includes(1) ? 'jefe_area'
            : 'usuario',
          rol_principal: userData.roles?.length ? Math.max(...userData.roles) : 0,
        };

        setUser(normalizedUser);
        setToken(token);
        setRequiresPasswordChange(userData.requiere_cambio_password || false);

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));

        return {
          success: true,
          requiresChange: userData.requiereCambio || false
        };
      } else {
        setError(response.error);
        return {
          success: false,
          error: response.error
        };
      }
    } catch (error) {
      const errorMsg = error.message || 'Error al iniciar sesion';
      setError(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      clearAuthData();
      setLoading(false);
    }
  }, [token, clearAuthData]);

  const changePassword = useCallback(async (passwordActual, passwordNueva) => {
    if (!token) {
      return { success: false, error: 'No hay sesion activa' };
    }

    try {
      const response = await authService.changePassword(token, passwordActual, passwordNueva);

      if (response.success) {
        setRequiresPasswordChange(false);

        if (user) {
          setUser({ ...user, requiereCambio: false });
          localStorage.setItem(USER_KEY, JSON.stringify({ ...user, requiereCambio: false }));
        }

        return { success: true };
      } else {
        return { success: false, error: response.error || 'Error al cambiar contraseña' };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Error al cambiar contraseña'
      };
    }
  }, [token, user]);

  const refreshSession = useCallback(async () => {
    if (token) {
      await verifySession(token);
    }
  }, [token, verifySession]);

  const hasRole = useCallback((rol) => {
    if (!user) return false;
    return user.rol === rol;
  }, [user]);

  const hasAnyRole = useCallback((roles) => {
    if (!user) return false;
    return roles.includes(user.rol);
  }, [user]);

  const isJefe = useCallback(() => {
    if (!user) return false;
    return ['admin', 'jefe_division', 'jefe_departamento', 'jefe_area'].includes(user.rol);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    error,
    requiresPasswordChange,
    login,
    logout,
    changePassword,
    refreshSession,
    isAuthenticated: !!user,
    isAdmin: hasRole('admin'),
    isJefeDivision: hasRole('jefe_division'),
    isJefeDepartamento: hasRole('jefe_departamento'),
    isJefeArea: hasRole('jefe_area'),
    isJefe: isJefe(),
    hasRole,
    hasAnyRole,
    getRol: () => user?.rol || null,
    getNombre: () => user?.nombre || '',
    getAreas: () => user?.areas || []
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};