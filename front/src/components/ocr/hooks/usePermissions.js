// src/components/ocr/hooks/usePermissions.js
// Hook para verificar permisos en OCR

import { useAuth } from '../auth/AuthContext';
import { PERMISOS_OCR, JERARQUIA_OCR, PUEDE_APROBAR, PUEDE_EDITAR } from '../permissions/roles';

export const usePermissions = () => {
  const { user, hasRole } = useAuth();

  const tienePermiso = (permiso) => {
    if (!user) return false;
    const permisos = PERMISOS_OCR[user.rol] || {};
    return permisos[permiso] || false;
  };

  const getNivel = () => {
    if (!user) return -1;
    return JERARQUIA_OCR[user.rol]?.nivel || -1;
  };

  const getSiguienteNivel = () => {
    if (!user) return null;
    return JERARQUIA_OCR[user.rol]?.siguiente || null;
  };

  const puedeAprobar = () => {
    return PUEDE_APROBAR(user?.rol);
  };

  const puedeEditar = () => {
    return PUEDE_EDITAR(user?.rol);
  };

  const puedeVerTodos = () => {
    return tienePermiso('puedeVerTodos');
  };

  const puedeGestionarUsuarios = () => {
    return tienePermiso('puedeGestionarUsuarios');
  };

  const puedeConfigurar = () => {
    return tienePermiso('puedeConfigurar');
  };

  const puedeVerAuditoria = () => {
    return tienePermiso('puedeVerAuditoria');
  };

  const esJefe = () => {
    if (!user) return false;
    return ['admin', 'jefe_division', 'jefe_departamento', 'jefe_area'].includes(user.rol);
  };

  const getRolData = () => {
    if (!user) return null;
    return JERARQUIA_OCR[user.rol] || null;
  };

  return {
    tienePermiso,
    getNivel,
    getSiguienteNivel,
    puedeAprobar,
    puedeEditar,
    puedeVerTodos,
    puedeGestionarUsuarios,
    puedeConfigurar,
    puedeVerAuditoria,
    esJefe,
    getRolData,
    isAdmin: hasRole('admin'),
    isJefeDivision: hasRole('jefe_division'),
    isJefeDepartamento: hasRole('jefe_departamento'),
    isJefeArea: hasRole('jefe_area')
  };
};